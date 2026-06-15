/* ============================================================
   旬献立 — Express + PostgreSQL サーバ
   静的フロント(public/)の配信 + REST API
   ============================================================ */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const vm = require("vm");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require("./db/pool");
const { seedDishes } = require("./db/seed");

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------- DB マッピング ---------- */
const dishOut = (r) => ({
  id: r.id,
  name: r.name,
  season: r.seasons,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  kcal: r.kcal,
  cost: r.cost,
  mainProtein: r.main_protein,
  ingredients: r.ingredients,
  steps: r.steps || [],
  prepTime: r.prep_time || 15,
  mealType: r.meal_type || [],
  favorite: r.is_favorite,
});

const dishParams = (b) => [
  String(b.name || "").trim(),
  Array.isArray(b.season) ? b.season : [],
  Number(b.protein) || 0,
  Number(b.carbs) || 0,
  Number(b.fat) || 0,
  Number(b.kcal) || 0,
  Number(b.cost) || 0,
  String(b.mainProtein || "").trim(),
  Array.isArray(b.ingredients) ? b.ingredients.filter((x) => String(x).trim()) : [],
  Array.isArray(b.steps) ? b.steps.filter((x) => String(x).trim()) : [],
  Number(b.prepTime) || 15,
  Array.isArray(b.mealType) ? b.mealType : ["dinner"]
];

const planOut = (r) => ({
  id: r.id,
  title: r.title,
  season: r.season,
  servings: r.servings,
  budget: r.budget,
  minProtein: r.min_protein,
  dishIds: r.dish_ids,
  createdAt: r.created_at,
});

// async ルートの try/catch ラッパ
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`[api] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ error: "server_error", message: err.message });
  });

/* ============================================================
   料理カタログ (CRUD)
   ============================================================ */

app.post("/api/dishes/import-text", wrap(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "sk-or-v1-dummy";

  const systemPrompt = `あなたはプロの料理研究家兼データエンジニアです。
ユーザーから提供されるテキストは、レシピサイトのページ内容をコピーしたものです。不要な情報（広告、メニュー、フッターなど）が含まれています。
このテキストから料理レシピの情報を正確に抽出し、以下のJSONフォーマットのみを返してください。マークダウンのバッククォート(\`\`\`json)などは不要です。純粋なJSON文字列のみを出力してください。必ず日本語で出力してください。

{
  "name": "料理名",
  "prepTime": 調理時間（分、数値のみ。不明なら15）,
  "kcal": カロリー（数値のみ。不明なら0）,
  "mainProtein": "主菜となる食材名（例：鶏肉、豚肉など。不明なら'その他'）",
  "ingredients": ["材料名と分量（例：[A] しょうゆ 大さじ1、豚肉 200g）", ...],
  "steps": ["作り方の手順1", "作り方の手順2", ...],
  "cost": 推定費用（円、数値のみ。不明なら300）,
  "season": ["spring", "summer", "autumn", "winter"]のいずれか1つ以上の配列,
  "mealType": ["dinner", "lunch", "breakfast"]のいずれか1つ以上の配列
}

抽出の際の注意点：
- 「A」などの調味料グループがある場合、材料名に「[A]」をプレフィックスとして付けてください。
- steps（作り方）から、料理と無関係な「ボタンを押す」「探す」といったサイト特有の操作テキストは除外してください。`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let jsonStr = data.choices[0].message.content.trim();
    
    // Markdownブロックの除去をより堅牢に
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON string:", jsonStr);
      throw new Error("AIからの応答をJSONとして解析できませんでした: " + e.message);
    }

    // デフォルト値の補完
    const newDish = {
      name: parsed.name || '名称不明のレシピ',
      season: parsed.season || ['spring', 'summer', 'autumn', 'winter'],
      mainProtein: parsed.mainProtein || 'その他',
      prepTime: parsed.prepTime || 15,
      kcal: parsed.kcal || 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      cost: parsed.cost || 300,
      ingredients: parsed.ingredients || [],
      steps: parsed.steps || [],
      mealType: parsed.mealType || ['dinner', 'lunch']
    };

    // 3. save to DB
    const { rows } = await pool.query(
      `INSERT INTO dishes (name, seasons, protein, carbs, fat, kcal, cost, main_protein, ingredients, steps, prep_time, meal_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      dishParams(newDish)
    );

    res.status(201).json(dishOut(rows[0]));
  } catch (err) {
    console.error("AI Import error:", err);
    res.status(500).json({ error: "AIでの抽出に失敗しました: " + err.message });
  }
}));

app.get("/api/dishes", wrap(async (req, res) => {
  const { season } = req.query;
  let q = "SELECT * FROM dishes";
  const params = [];
  if (season) { q += " WHERE $1 = ANY(seasons)"; params.push(season); }
  q += " ORDER BY id";
  const { rows } = await pool.query(q, params);
  res.json(rows.map(dishOut));
}));

app.post("/api/dishes", wrap(async (req, res) => {
  if (!String(req.body.name || "").trim())
    return res.status(400).json({ error: "name_required" });
  const { rows } = await pool.query(
    `INSERT INTO dishes (name, seasons, protein, carbs, fat, kcal, cost, main_protein, ingredients, steps, prep_time, meal_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    dishParams(req.body)
  );
  res.status(201).json(dishOut(rows[0]));
}));

app.put("/api/dishes/:id", wrap(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE dishes SET name=$1, seasons=$2, protein=$3, carbs=$4, fat=$5,
       kcal=$6, cost=$7, main_protein=$8, ingredients=$9, steps=$10, prep_time=$11, meal_type=$12
     WHERE id=$13 RETURNING *`,
    [...dishParams(req.body), req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "not_found" });
  res.json(dishOut(rows[0]));
}));

app.patch("/api/dishes/:id/favorite", wrap(async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE dishes SET is_favorite=$1 WHERE id=$2 RETURNING *",
    [!!req.body.favorite, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "not_found" });
  res.json(dishOut(rows[0]));
}));

app.delete("/api/dishes/:id", wrap(async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM dishes WHERE id=$1", [req.params.id]);
  res.json({ ok: rowCount > 0 });
}));

/* ============================================================
   AI機能 (Gemini API)
   ============================================================ */
// 1. AI献立提案 (既存の料理リストから最適な7つを選ぶ)
app.post("/api/generate-ai", wrap(async (req, res) => {
  const { query, season, budget, minProtein } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "no_api_key", message: "環境変数 GEMINI_API_KEY が設定されていません。" });
  }

  const { rows } = await pool.query("SELECT id, name, main_protein, kcal, cost, seasons, meal_type FROM dishes");
  if (rows.length < 21) return res.status(400).json({ error: "not_enough_dishes", message: "料理の数が足りません（21種類以上必要です）" });

  const prompt = `あなたは優秀な献立プランナーです。以下の料理リストから、ユーザーの要望に最適な「1週間分（7日間）の朝食・昼食・夕食」を選んでください。なるべく同じ料理を繰り返さないようにしてください。
【ユーザーの要望】: ${query || "おまかせ"} (季節: ${season})
【料理リスト】:
${rows.map(r => `ID:${r.id} | ${r.name} (種類:${r.meal_type.join(',')}, ${r.kcal}kcal, ${r.cost}円)`).join('\n')}

出力形式は必ず以下のようなJSONのみにしてください。マークダウンや説明は不要です。
{
  "message": "要望に合わせた献立のアピールポイント（1文）",
  "days": [
    { "breakfast": ID, "lunch": ID, "dinner": ID },
    { "breakfast": ID, "lunch": ID, "dinner": ID },
    ... (7日分)
  ]
}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  let parsed;
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(text);
    if (!parsed.days || parsed.days.length !== 7) throw new Error("Invalid AI response");
  } catch (err) {
    console.error("AI API Error, falling back to mock:", err.message);
    // API制限時はモックデータを返す
    const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);
    const breakfasts = shuffle(rows.filter(r => r.meal_type.includes("breakfast")));
    const lunches = shuffle(rows.filter(r => r.meal_type.includes("lunch")));
    const dinners = shuffle(rows.filter(r => r.meal_type.includes("dinner")));
    
    // 足りない場合は全体から補填
    const getDish = (arr, i) => arr.length > 0 ? arr[i % arr.length].id : rows[i % rows.length].id;
    
    parsed = {
      message: "【制限モード】APIの利用制限に達したため、おまかせの特売モック献立を作成しました！",
      days: Array.from({ length: 7 }, (_, i) => ({
        breakfast: getDish(breakfasts, i),
        lunch: getDish(lunches, i),
        dinner: getDish(dinners, i)
      }))
    };
  }

  const extractId = (val) => {
    if (!val) return null;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const allIds = parsed.days.flatMap(d => [extractId(d.breakfast), extractId(d.lunch), extractId(d.dinner)]).filter(Boolean);
  
  let selectedRows = { rows: [] };
  if (allIds.length > 0) {
    selectedRows = await pool.query(`SELECT * FROM dishes WHERE id IN (${allIds.join(",")})`);
  }
  
  const dishMap = {};
  selectedRows.rows.forEach(r => { dishMap[r.id] = dishOut(r); });

  const weekMenu = parsed.days.map(d => ({
    breakfast: dishMap[extractId(d.breakfast)] || null,
    lunch: dishMap[extractId(d.lunch)] || null,
    dinner: dishMap[extractId(d.dinner)] || null,
    completed: d.completed || {}
  }));

  res.json({ message: parsed.message, weekMenu });
}));

// 2. AIレシピ考案 (全く新しいレシピを生成)
app.post("/api/generate-recipe", wrap(async (req, res) => {
  const { query } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "no_api_key", message: "GEMINI_API_KEY を設定してください" });
  }

  const prompt = `あなたはプロの料理研究家です。ユーザーの要望に合わせて新しい実用的なレシピを1つ考案し、JSONで返してください。
【ユーザーの要望】: ${query}

出力形式は以下のJSONのみにしてください。マークダウンや説明は不要です。
{
  "name": "料理名",
  "season": ["spring", "summer", "autumn", "winter"] の中から合うものを1〜複数,
  "mainProtein": "主なタンパク源となる食材名（例：鶏もも肉）",
  "prepTime": 調理時間(分, 数値),
  "protein": タンパク質(g, 数値),
  "carbs": 炭水化物(g, 数値),
  "fat": 脂質(g, 数値),
  "kcal": カロリー(数値),
  "cost": 1人分の材料費(円, 数値),
  "ingredients": ["材料1 分量", "材料2 分量"],
  "steps": ["手順1", "手順2"],
  "mealType": ["breakfast", "lunch", "dinner"] のうち合うものを1〜複数
}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  let recipe;
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    recipe = JSON.parse(text);
  } catch (err) {
    console.error("AI API Error, falling back to mock:", err.message);
    recipe = {
      name: "【モック】特製AIチャーハン",
      season: ["spring", "summer", "autumn", "winter"],
      mainProtein: "卵と豚肉",
      prepTime: 10,
      protein: 20,
      carbs: 50,
      fat: 15,
      kcal: 550,
      cost: 200,
      ingredients: ["ご飯 200g", "卵 1個", "豚こま肉 50g", "ネギ 1/4本", "醤油 大さじ1", "塩こしょう 少々", "ごま油 大さじ1"],
      steps: ["豚肉とネギを細かく切る", "フライパンにごま油を熱し、豚肉を炒める", "溶き卵とご飯を加えてパラパラになるまで炒める", "ネギを加え、醤油と塩こしょうで味を調える"],
      mealType: ["lunch", "dinner"]
    };
  }
  
  res.json(recipe);
}));

// 3. AI買い物アドバイス
app.post("/api/shopping-advice", wrap(async (req, res) => {
  const { items } = req.body; // ["豚肉 300g", "白菜 1/2玉", ...]
  if (!process.env.GEMINI_API_KEY) return res.json({ advice: "APIキーがないためアドバイスを省略しました。" });

  const prompt = `あなたは親しみやすく優秀なAI管理栄養士「ひまり」です。
以下の買い物リストを分析して、節約テクニック、食材の長期保存方法、栄養バランスを高める組み合わせなど、実用的なアドバイスを3つ、優しくアドバイスする口調（「〜ですよ」「〜しましょうね！」など）で、箇条書きで教えてください。
【買い物リスト】
${items.join('\n')}

出力形式（各項目の先頭は「・」にしてください）：
・アドバイス1
・アドバイス2
・アドバイス3`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  try {
    const result = await model.generateContent(prompt);
    res.json({ advice: result.response.text() });
  } catch (err) {
    console.error("AI API Error, falling back to mock:", err.message);
    const mockAdvice = "・【制限モード】現在AI APIが制限に達していますが、お肉は小分けにして冷凍保存すると便利ですよ！\n・野菜は水分をよく拭き取ってから保存すると長持ちします。\n・この食材なら、週末にまとめて作り置きをするのがおすすめです！";
    res.json({ advice: mockAdvice });
  }
}));

/* ============================================================
   スーパーマーケット検索 (Overpass API)
   ============================================================ */
app.get("/api/supermarkets", wrap(async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "missing_location" });

  const query = `[out:json][timeout:10];
node["shop"="supermarket"](around:2000,${lat},${lon});
out center;`;

  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const r = await fetch(overpassUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "CondateApp/1.0",
      "Accept": "application/json"
    },
    body: "data=" + encodeURIComponent(query)
  });
  if(!r.ok) {
    const txt = await r.text();
    console.error("Overpass API Error:", r.status, txt);
    return res.status(500).json({ error: "api_error", message: "スーパー検索APIがエラーを返しました" });
  }
  const data = await r.json();

  function deg2rad(deg) { return deg * (Math.PI/180); }
  function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2-lat1);
    const dLon = deg2rad(lon2-lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const shops = data.elements.filter(e => e.tags && e.tags.name).map(e => {
    const dist = getDist(lat, lon, e.lat, e.lon);
    return {
      name: e.tags.name,
      type: e.tags.brand ? "チェーンスーパー" : "地域スーパー",
      hours: e.tags.opening_hours || "営業時間の情報なし",
      distance: dist.toFixed(1),
      priceLevel: "★★★", // Overpass に価格情報はないため固定
      note: ""
    };
  }).sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance)).slice(0, 10);

  res.json(shops);
}));

/* ============================================================
   特売・チラシ情報 (Mock API + ベルクスクレイピング)
   ============================================================ */
app.get("/api/deals/belc", wrap(async (req, res) => {
  const url = "https://chirashi.delishkitchen.tv/shops/a266ef18-1a86-4725-bb3c-6d3148146106/widget?zoomIndex=0";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch flyer: ${response.status}`);
  }
  const html = await response.text();
  
  const nuxtMatch = html.match(/window\.__NUXT__=(.*?);?<\/script>/s);
  if (!nuxtMatch) return res.json([]);
  
  const sandbox = { window: {}, document: { querySelector: () => null } };
  vm.createContext(sandbox);
  const result = vm.runInContext(nuxtMatch[1], sandbox);
  
  const pinia = result.pinia || (result.data && result.data[0] && result.data[0].pinia);
  const shopData = pinia?.chirashi?.chirashi;
  
  if (!shopData || !shopData.ocr_sales_items) return res.json([]);
  
  const formattedFlyers = (shopData.flyers || []).map(f => ({
    id: f.id,
    title: f.title,
    image: f.large_image_url || f.small_image_url
  }));

  // フロントエンドのデータ構造に合わせて整形
  const formattedDeals = (shopData.ocr_sales_items || []).map(item => {
    let price = null;
    const priceMatch = item.original_name.match(/(\d+)円/);
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10);
    }
    
    // アイコンやカテゴリの推測（簡易的）
    let icon = "🛒";
    let type = "other";
    if (item.original_name.includes("肉") || item.original_name.includes("ハム") || item.original_name.includes("ソーセージ") || item.original_name.includes("ベーコン")) {
      icon = "🥩"; type = "meat";
    } else if (item.original_name.includes("魚") || item.original_name.includes("鮭") || item.original_name.includes("たこ") || item.original_name.includes("かつお") || item.original_name.includes("うなぎ") || item.original_name.includes("いか") || item.original_name.includes("ほたて")) {
      icon = "🐟"; type = "fish";
    } else if (item.original_name.includes("野菜") || item.original_name.match(/アスパラ|ピーマン|きゅうり|ズッキーニ|オクラ|トマト|にんじん|みょうが|だいこん|長いも|にら|とうもろこし|ごぼう|かぼちゃ|白菜/)) {
      icon = "🥬"; type = "veg";
    }

    return {
      name: item.original_name.replace(/\(\d+円\)/, "").trim(),
      price: price,
      unit: "",
      icon: icon,
      store: "ベルク 山口店",
      type: type,
      image: item.image_url,
      flyer_id: item.flyer_id
    };
  });

  res.json({ flyers: formattedFlyers, items: formattedDeals });
}));

app.get("/api/deals", wrap(async (req, res) => {
  const storeParam = req.query.stores;
  let stores = ["ご近所スーパーA", "ディスカウントB", "八百屋C"];
  if (storeParam) {
    stores = storeParam.split(",").map(s => s.trim()).filter(Boolean);
    if (stores.length === 0) stores = ["ご近所スーパーA", "ディスカウントB", "八百屋C"];
  }

  // 本来は外部APIやスクレイピング結果を返すが、ここではダミーデータを生成
  const dummyDeals = [
    { name: "国産 豚こま切れ肉", price: 98, unit: "100g", icon: "🥩", store: stores[0 % stores.length], type: "meat" },
    { name: "白菜", price: 158, unit: "1/4カット", icon: "🥬", store: stores[1 % stores.length], type: "veg" },
    { name: "鶏もも肉", price: 88, unit: "100g", icon: "🍗", store: stores[2 % stores.length], type: "meat" },
    { name: "大根", price: 98, unit: "1本", icon: "🌿", store: stores[0 % stores.length], type: "veg" },
    { name: "たまご", price: 198, unit: "10個入", icon: "🥚", store: stores[1 % stores.length], type: "other" },
  ];
  // ランダムに並び替えて3件ほど返す
  const shuffled = dummyDeals.sort(() => 0.5 - Math.random()).slice(0, 3);
  res.json(shuffled);
}));

/* ============================================================
   アプリ状態（設定・現在の献立・買い物チェック）
   ============================================================ */
app.get("/api/state", wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM app_state WHERE id=1");
  if (rows.length === 0) return res.json({ settings: {}, currentDishIds: [], checkedItems: [], weekMenu: [], monthlyMenu: {} });
  res.json({
    settings: rows[0].settings || {},
    currentDishIds: rows[0].current_dish_ids || [],
    checkedItems: rows[0].checked_items || [],
    weekMenu: rows[0].week_menu || [],
    monthlyMenu: rows[0].monthly_menu || {}
  });
}));

app.put("/api/state", wrap(async (req, res) => {
  const b = req.body;
  await pool.query(
    "UPDATE app_state SET settings=$1, current_dish_ids=$2, checked_items=$3, week_menu=$4, monthly_menu=$5 WHERE id=1",
    [
      JSON.stringify(b.settings || {}),
      b.currentDishIds || [],
      b.checkedItems || [],
      JSON.stringify(b.weekMenu || []),
      JSON.stringify(b.monthlyMenu || {})
    ]
  );
  res.json({ ok: true });
}));

/* ============================================================
   週間献立プラン（保存・履歴）
   ============================================================ */
app.get("/api/plans", wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM meal_plans ORDER BY created_at DESC");
  res.json(rows.map(planOut));
}));

app.post("/api/plans", wrap(async (req, res) => {
  const b = req.body;
  if (!Array.isArray(b.dishIds) || b.dishIds.length === 0)
    return res.status(400).json({ error: "dishIds_required" });
  const { rows } = await pool.query(
    `INSERT INTO meal_plans (title, season, servings, budget, min_protein, dish_ids)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      String(b.title || "").trim() || new Date().toLocaleDateString("ja-JP"),
      String(b.season || ""),
      Number(b.servings) || 2,
      b.budget != null ? Number(b.budget) : null,
      b.minProtein != null ? Number(b.minProtein) : null,
      b.dishIds.map(Number),
    ]
  );
  res.status(201).json(planOut(rows[0]));
}));

app.delete("/api/plans/:id", wrap(async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM meal_plans WHERE id=$1", [req.params.id]);
  res.json({ ok: rowCount > 0 });
}));

/* ============================================================
   予定 + 記録（カレンダー）
   ============================================================ */
const scheduleOut = (r) => ({
  date: r.date, dishId: r.dish_id, note: r.note, eaten: r.eaten, rating: r.rating,
});

app.get("/api/schedule", wrap(async (req, res) => {
  const { from, to } = req.query;
  let q = "SELECT * FROM schedule";
  const params = [];
  if (from && to) { q += " WHERE date BETWEEN $1 AND $2"; params.push(from, to); }
  q += " ORDER BY date";
  const { rows } = await pool.query(q, params);
  res.json(rows.map(scheduleOut));
}));

app.put("/api/schedule/:date", wrap(async (req, res) => {
  const b = req.body;
  const { rows } = await pool.query(
    `INSERT INTO schedule (date, dish_id, note, eaten, rating)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (date) DO UPDATE
       SET dish_id=$2, note=$3, eaten=$4, rating=$5
     RETURNING *`,
    [
      req.params.date,
      b.dishId != null ? Number(b.dishId) : null,
      String(b.note || ""),
      !!b.eaten,
      Number(b.rating) || 0,
    ]
  );
  res.json(scheduleOut(rows[0]));
}));

app.delete("/api/schedule/:date", wrap(async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM schedule WHERE date=$1", [req.params.date]);
  res.json({ ok: rowCount > 0 });
}));

/* ヘルスチェック（Render 用） */
app.get("/api/health", wrap(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

// SPA フォールバック（/api 以外は index.html）
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------- 起動 ---------- */
async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
  // コメント行を除去し、文ごとに分割して順に実行（pg-mem 互換のため）
  const clean = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  for (const stmt of clean.split(";").map((s) => s.trim()).filter(Boolean)) {
    await pool.query(stmt);
  }
  // マイグレーション
  try { await pool.query("ALTER TABLE dishes ADD COLUMN steps TEXT[] NOT NULL DEFAULT '{}'"); } catch(e){}
  try { await pool.query("ALTER TABLE dishes ADD COLUMN prep_time INT NOT NULL DEFAULT 15"); } catch(e){}
  try { await pool.query("ALTER TABLE dishes ADD COLUMN meal_type TEXT[] NOT NULL DEFAULT '{dinner}'"); } catch(e){}
  try { await pool.query("ALTER TABLE app_state ADD COLUMN week_menu JSONB NOT NULL DEFAULT '[]'"); } catch(e){}
  try { await pool.query("ALTER TABLE app_state ADD COLUMN monthly_menu JSONB NOT NULL DEFAULT '{}'"); } catch(e){}
  
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM dishes");
  if (rows[0].n === 0) {
    const n = await seedDishes(pool);
    console.log(`[init] seeded ${n} dishes`);
  }
  await pool.query("INSERT INTO app_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
  console.log("[init] database ready");
}

initDb().catch((e) => {
  // DB が無くても静的配信は続行（API は 500 を返す）
  console.error("[init] DB init failed — static will still serve:", e.message);
});

app.listen(PORT, () => console.log(`旬献立 running on http://localhost:${PORT}`));
