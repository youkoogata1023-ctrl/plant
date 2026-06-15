const fs = require("fs");
const path = require("path");

const SEED_DISHES = [
  // --- 朝食 (Breakfast) ---
  { name:"トーストと目玉焼き", seasons:["spring","summer","autumn","winter"], protein:14, carbs:30, fat:12, kcal:280, cost:100, mainProtein:"卵", ingredients:["食パン 1枚","卵 1個","バター","塩こしょう"], steps:["食パンをトースターで焼く","フライパンにバターを熱し、目玉焼きを作る","トーストにバターを塗り、目玉焼きを乗せる"], prepTime: 5, mealType:["breakfast"] },
  { name:"納豆ごはんと味噌汁", seasons:["spring","summer","autumn","winter"], protein:12, carbs:60, fat:5, kcal:330, cost:80, mainProtein:"納豆", ingredients:["ご飯 1膳","納豆 1パック","豆腐","わかめ","味噌"], steps:["鍋にだし汁を沸かし、豆腐とわかめを入れる","火を止めて味噌を溶く","納豆をかき混ぜ、ご飯に乗せる"], prepTime: 10, mealType:["breakfast"] },
  { name:"オートミールとバナナ", seasons:["spring","summer","autumn","winter"], protein:10, carbs:45, fat:8, kcal:290, cost:150, mainProtein:"乳製品", ingredients:["オートミール 40g","牛乳 150ml","バナナ 1本","はちみつ"], steps:["オートミールと牛乳を耐熱皿に入れ、レンジで2分加熱","バナナをスライスする","オートミールにバナナを乗せ、はちみつをかける"], prepTime: 5, mealType:["breakfast"] },
  { name:"鮭の塩焼き定食", seasons:["spring","summer","autumn","winter"], protein:25, carbs:60, fat:8, kcal:410, cost:200, mainProtein:"鮭", ingredients:["生鮭 1切れ","ご飯 1膳","大根おろし"], steps:["鮭の両面に塩を振り、グリルで焼く","大根をおろす","ご飯と一緒に盛り付ける"], prepTime: 15, mealType:["breakfast"] },
  { name:"フレンチトースト", seasons:["spring","summer","autumn","winter"], protein:10, carbs:40, fat:15, kcal:350, cost:120, mainProtein:"卵・牛乳", ingredients:["食パン 1枚","卵 1個","牛乳 50ml","砂糖","バター"], steps:["卵、牛乳、砂糖を混ぜて卵液を作る","食パンを卵液に10分浸す","フライパンにバターを熱し、両面をこんがり焼く"], prepTime: 15, mealType:["breakfast"] },
  { name:"スムージーとゆで卵", seasons:["spring","summer","autumn","winter"], protein:10, carbs:30, fat:8, kcal:230, cost:250, mainProtein:"卵", ingredients:["小松菜","バナナ 1本","豆乳 150ml","卵 1個"], steps:["ゆで卵を作る","小松菜、バナナ、豆乳をミキサーにかける","グラスに注ぐ"], prepTime: 10, mealType:["breakfast"] },
  { name:"パンケーキ", seasons:["spring","summer","autumn","winter"], protein:8, carbs:55, fat:12, kcal:350, cost:150, mainProtein:"卵・乳製品", ingredients:["ホットケーキミックス 100g","卵 1個","牛乳 70ml","メープルシロップ"], steps:["ボウルで材料を混ぜ合わせる","フライパンで両面を焼く","シロップをかける"], prepTime: 15, mealType:["breakfast"] },

  // --- 昼食 (Lunch) ---
  { name:"チャーハン", seasons:["spring","summer","autumn","winter"], protein:15, carbs:65, fat:18, kcal:480, cost:150, mainProtein:"卵・豚肉", ingredients:["ご飯 1膳","卵 1個","豚肉 50g","ネギ","中華だし"], steps:["豚肉とネギを細かく切る","フライパンで卵を炒め、ご飯を加えてパラパラにする","豚肉とネギを加え、中華だしと醤油で味を整える"], prepTime: 10, mealType:["lunch"] },
  { name:"きつねうどん", seasons:["spring","summer","autumn","winter"], protein:12, carbs:60, fat:8, kcal:350, cost:180, mainProtein:"油揚げ", ingredients:["うどん 1玉","味付き油揚げ 1枚","ネギ","めんつゆ"], steps:["鍋でめんつゆを表示通りに薄めて沸かす","うどんを入れて煮込む","器に盛り、油揚げとネギを乗せる"], prepTime: 10, mealType:["lunch"] },
  { name:"ナポリタン", seasons:["spring","summer","autumn","winter"], protein:14, carbs:70, fat:16, kcal:480, cost:200, mainProtein:"ウインナー", ingredients:["パスタ 100g","ウインナー 2本","玉ねぎ","ピーマン","ケチャップ"], steps:["パスタを表示より1分長く茹でる","野菜とウインナーをスライスして炒める","ケチャップを加えて炒め、パスタを絡める"], prepTime: 15, mealType:["lunch"] },
  { name:"オムライス", seasons:["spring","summer","autumn","winter"], protein:18, carbs:65, fat:20, kcal:520, cost:220, mainProtein:"卵・鶏肉", ingredients:["ご飯 1膳","卵 2個","鶏もも肉 50g","玉ねぎ","ケチャップ"], steps:["鶏肉と玉ねぎを細かく切り、ご飯とケチャップで炒めてチキンライスを作る","別のフライパンで薄焼き卵を作る","チキンライスを卵で包む"], prepTime: 20, mealType:["lunch"] },
  { name:"ざるそば", seasons:["summer"], protein:10, carbs:55, fat:2, kcal:280, cost:150, mainProtein:"そば", ingredients:["そば 1束","めんつゆ","ネギ","わさび"], steps:["そばをたっぷりのお湯で茹でる","冷水でしっかり洗い、水気を切る","めんつゆと薬味を用意して完成"], prepTime: 10, mealType:["lunch"] },
  { name:"ツナマヨおにぎりと豚汁", seasons:["spring","summer","autumn","winter"], protein:18, carbs:75, fat:12, kcal:480, cost:250, mainProtein:"豚肉・ツナ", ingredients:["ご飯 1膳","ツナ缶 1/2缶","マヨネーズ","豚肉 50g","大根・にんじん"], steps:["ツナとマヨネーズを混ぜ、おにぎりを作る","野菜と豚肉を炒め、だし汁で煮る","味噌を溶き入れて豚汁を作る"], prepTime: 20, mealType:["lunch"] },
  { name:"カルボナーラ", seasons:["spring","summer","autumn","winter"], protein:18, carbs:65, fat:25, kcal:550, cost:280, mainProtein:"ベーコン・卵", ingredients:["パスタ 100g","ベーコン 50g","卵黄 1個","生クリーム 50ml","粉チーズ"], steps:["パスタを茹でる","フライパンでベーコンを炒め、生クリームを温める","火を止め、茹で上がったパスタと卵黄、チーズを素早く絡める"], prepTime: 15, mealType:["lunch"] },
  { name:"牛丼", seasons:["spring","summer","autumn","winter"], protein:22, carbs:70, fat:20, kcal:560, cost:350, mainProtein:"牛肉", ingredients:["ご飯 1膳","牛バラ肉 100g","玉ねぎ 1/2個","醤油","みりん"], steps:["玉ねぎをスライスする","鍋に水、醤油、みりん、砂糖を沸かし、玉ねぎと牛肉を煮る","ご飯の上にかける"], prepTime: 15, mealType:["lunch"] },

  // --- 夕食 (Dinner) ---
  // 春
  { name:"鶏むね肉の照り焼き", seasons:["spring","summer","autumn","winter"], protein:38, carbs:12, fat:9, kcal:290, cost:220, mainProtein:"鶏むね肉", ingredients:["鶏むね肉 200g","醤油","みりん","砂糖","新玉ねぎ"], steps:["玉ねぎをスライスする","鶏肉を一口大に切り、小麦粉をまぶす","フライパンで鶏肉を焼き、玉ねぎを炒め合わせる","調味料を加え、照りが出るまで煮絡める"], prepTime: 15, mealType:["dinner"] },
  { name:"新じゃがと鶏肉の煮物", seasons:["spring"], protein:26, carbs:30, fat:11, kcal:340, cost:280, mainProtein:"鶏もも肉", ingredients:["鶏もも肉 150g","新じゃがいも 3個","にんじん","醤油","だし"], steps:["じゃがいもをよく洗い、皮ごと半分に切る","鶏肉、にんじんを一口大に切る","鍋で鶏肉を炒め、野菜を加える","だし汁と調味料を加え、落とし蓋をして15分煮る"], prepTime: 25, mealType:["dinner"] },
  { name:"春キャベツと豚肉の蒸し", seasons:["spring"], protein:24, carbs:14, fat:18, kcal:320, cost:260, mainProtein:"豚バラ肉", ingredients:["豚バラ肉 150g","春キャベツ 1/4玉","ポン酢","ごま油"], steps:["キャベツをざく切りにする","フライパンにキャベツを敷き、豚肉を上に乗せる","酒を少量振り、蓋をして弱火で10分蒸す","ポン酢とごま油をかけて完成"], prepTime: 12, mealType:["dinner"] },
  { name:"アサリの酒蒸し", seasons:["spring"], protein:18, carbs:6, fat:3, kcal:130, cost:300, mainProtein:"アサリ", ingredients:["アサリ 200g","酒","にんにく","ねぎ"], steps:["アサリの砂抜きをする","にんにくをスライスする","フライパンにアサリ、にんにく、酒を入れ、蓋をする","殻が開くまで蒸し焼きにし、ネギを散らす"], prepTime: 10, mealType:["dinner"] },
  { name:"サワラの西京焼き", seasons:["spring"], protein:25, carbs:10, fat:14, kcal:260, cost:350, mainProtein:"サワラ", ingredients:["サワラ 2切れ","西京味噌","酒","みりん"], steps:["味噌、酒、みりんを合わせる","サワラを味噌床に半日〜1日漬け込む","味噌を軽く拭き取り、グリルまたはオーブンで焼く"], prepTime: 15, mealType:["dinner"] },
  
  // 夏
  { name:"豚しゃぶサラダ", seasons:["summer"], protein:28, carbs:8, fat:16, kcal:300, cost:280, mainProtein:"豚ロース肉", ingredients:["豚ロース薄切り 150g","トマト 1個","きゅうり","レタス","ごまだれ"], steps:["鍋にお湯を沸かし、豚肉をさっと茹でて冷水にとる","野菜を一口大やスライスに切る","器に野菜を敷き、豚肉を乗せてごまだれをかける"], prepTime: 15, mealType:["lunch", "dinner"] },
  { name:"ゴーヤチャンプルー", seasons:["summer"], protein:24, carbs:12, fat:18, kcal:320, cost:240, mainProtein:"豚肉・卵・豆腐", ingredients:["ゴーヤ 1本","木綿豆腐 1/2丁","豚こま 100g","卵 1個"], steps:["ゴーヤを縦半分に切り、ワタを取ってスライスし塩もみする","豆腐は水切りして手でちぎる","フライパンで豚肉、ゴーヤ、豆腐を炒め、醤油やだしで味付けする","最後に溶き卵を回し入れて炒め合わせる"], prepTime: 20, mealType:["dinner"] },
  { name:"冷やし豆腐そうめん", seasons:["summer"], protein:18, carbs:50, fat:6, kcal:360, cost:200, mainProtein:"豆腐", ingredients:["そうめん 2束","絹豆腐 1丁","めんつゆ","ねぎ","みょうが"], steps:["そうめんを茹でて氷水で締める","豆腐を手で崩す","そうめんの上に豆腐、薬味を乗せ、めんつゆをかける"], prepTime: 10, mealType:["lunch", "dinner"] },
  { name:"鶏むねの梅しそ焼き", seasons:["summer"], protein:36, carbs:6, fat:7, kcal:250, cost:200, mainProtein:"鶏むね肉", ingredients:["鶏むね肉 200g","梅干し","大葉","片栗粉"], steps:["梅干しの種を取り叩いてペースト状にする","鶏肉をそぎ切りにし、梅と大葉を挟み込む","片栗粉を薄くまぶし、フライパンで両面を焼く"], prepTime: 15, mealType:["dinner"] },
  { name:"アジの南蛮漬け", seasons:["summer"], protein:26, carbs:18, fat:14, kcal:300, cost:350, mainProtein:"アジ", ingredients:["アジ 2尾","玉ねぎ","ピーマン","にんじん","酢","醤油","砂糖"], steps:["野菜を千切りにする","アジに片栗粉をまぶして揚げる","熱いうちに、酢・醤油・砂糖を合わせたタレに野菜と一緒に漬け込む"], prepTime: 30, mealType:["dinner"] },

  // 秋
  { name:"サバの味噌煮", seasons:["summer","autumn"], protein:30, carbs:14, fat:20, kcal:380, cost:260, mainProtein:"サバ", ingredients:["サバ 2切れ","味噌","しょうが","砂糖","酒"], steps:["サバに熱湯をかけて霜降りする","鍋に水、酒、砂糖、薄切りしょうがを入れて煮立てる","サバを入れ、落とし蓋をして10分煮る","味噌を溶き入れ、とろみがつくまで煮詰める"], prepTime: 20, mealType:["dinner"] },
  { name:"鮭ときのこのホイル焼き", seasons:["autumn"], protein:30, carbs:8, fat:12, kcal:280, cost:280, mainProtein:"鮭", ingredients:["生鮭 2切れ","しめじ","えのき","バター","醤油"], steps:["アルミホイルに玉ねぎのスライスを敷く","上に鮭、きのこを乗せ、塩こしょうする","バターを乗せて包み、フライパンで蒸し焼きにする","食べる直前に醤油を垂らす"], prepTime: 15, mealType:["dinner"] },
  { name:"さんまの塩焼き", seasons:["autumn"], protein:25, carbs:2, fat:24, kcal:310, cost:200, mainProtein:"さんま", ingredients:["さんま 2尾","塩","大根おろし","すだち"], steps:["さんまの両面に塩を振り、15分ほど置く","グリルで両面をこんがりと焼く","大根おろしとすだちを添える"], prepTime: 20, mealType:["dinner"] },
  { name:"豚肉ときのこの生姜炒め", seasons:["autumn","winter"], protein:26, carbs:12, fat:17, kcal:320, cost:250, mainProtein:"豚こま肉", ingredients:["豚こま 150g","まいたけ","しめじ","しょうが","醤油"], steps:["きのこ類をほぐす","フライパンで豚肉を炒める","きのこを加え、すりおろししょうが、醤油、みりんで味付けする"], prepTime: 10, mealType:["dinner"] },
  { name:"鶏もものきのこソテー", seasons:["autumn"], protein:32, carbs:10, fat:20, kcal:360, cost:240, mainProtein:"鶏もも肉", ingredients:["鶏もも肉 200g","エリンギ","しめじ","にんにく","バター"], steps:["鶏肉に塩こしょうを振る","フライパンで皮目からパリッと焼く","きのこを加え一緒に炒め、最後にバターと醤油を絡める"], prepTime: 15, mealType:["dinner"] },

  // 冬
  { name:"ブリの照り焼き", seasons:["winter"], protein:32, carbs:10, fat:22, kcal:380, cost:300, mainProtein:"ブリ", ingredients:["ブリ 2切れ","醤油","みりん","酒","砂糖"], steps:["ブリに軽く塩を振り、水気を拭き取る","フライパンで両面を香ばしく焼く","余分な脂を拭き取り、調味料を加えて照りが出るまで絡める"], prepTime: 15, mealType:["dinner"] },
  { name:"鶏団子と白菜の鍋", seasons:["winter"], protein:30, carbs:14, fat:16, kcal:340, cost:280, mainProtein:"鶏ひき肉", ingredients:["鶏ひき肉 200g","白菜 1/4玉","長ねぎ","豆腐","ポン酢"], steps:["鶏ひき肉、ネギのみじん切り、しょうが、片栗粉を混ぜて団子にする","土鍋でだし汁を沸かし、団子を入れる","白菜や豆腐を加え、火が通ったらポン酢で食べる"], prepTime: 25, mealType:["dinner"] },
  { name:"豚バラ大根", seasons:["winter"], protein:22, carbs:12, fat:24, kcal:360, cost:250, mainProtein:"豚バラ肉", ingredients:["豚バラ 150g","大根 1/3本","醤油","みりん","だし"], steps:["大根をいちょう切りにする","豚肉を炒め、脂が出たら大根を加える","だし汁と調味料を加え、大根が柔らかく味が染みるまで煮込む"], prepTime: 30, mealType:["dinner"] },
  { name:"牡蠣の土手鍋風", seasons:["winter"], protein:20, carbs:14, fat:10, kcal:250, cost:320, mainProtein:"牡蠣", ingredients:["牡蠣 200g","白菜 1/4玉","春菊","味噌","豆腐"], steps:["牡蠣を片栗粉と塩で優しく洗う","鍋のふちに味噌を塗る","だし汁を注ぎ、白菜や豆腐を煮て、最後に牡蠣と春菊を加える"], prepTime: 20, mealType:["dinner"] },
  { name:"たらと白菜のクリーム煮", seasons:["winter"], protein:25, carbs:16, fat:14, kcal:290, cost:280, mainProtein:"たら", ingredients:["生だら 2切れ","白菜 1/8玉","牛乳 150ml","バター","コンソメ"], steps:["たらに塩こしょうをして小麦粉をまぶし、バターで両面を焼く","白菜のざく切りを加えて炒める","牛乳とコンソメを加え、とろみがつくまで煮込む"], prepTime: 20, mealType:["dinner"] },

  // 通年（定番）
  { name:"麻婆豆腐", seasons:["spring","summer","autumn","winter"], protein:26, carbs:14, fat:22, kcal:360, cost:220, mainProtein:"豚ひき肉・豆腐", ingredients:["豚ひき肉 100g","木綿豆腐 1丁","長ねぎ","豆板醤","にんにく"], steps:["豆腐をさいの目切りにする","にんにくと豆板醤を香りが立つまで炒める","ひき肉を炒め、火が通ったらスープと豆腐を加える","水溶き片栗粉でとろみをつけ、ネギを散らす"], prepTime: 15, mealType:["dinner"] },
  { name:"豚キムチ", seasons:["spring","summer","autumn","winter"], protein:24, carbs:12, fat:20, kcal:330, cost:230, mainProtein:"豚こま肉", ingredients:["豚こま 150g","白菜キムチ","にら","ごま油"], steps:["にらを5cm幅に切る","ごま油で豚肉を炒める","豚肉の色が変わったらキムチを加えてさらに炒める","最後ににらを加え、さっと火を通す"], prepTime: 10, mealType:["dinner"] },
  { name:"厚揚げと卵の甘辛炒め", seasons:["spring","summer","autumn","winter"], protein:22, carbs:14, fat:18, kcal:300, cost:170, mainProtein:"厚揚げ・卵", ingredients:["厚揚げ 1枚","卵 2個","醤油","みりん","小ねぎ"], steps:["厚揚げを一口大に切る","フライパンで厚揚げを香ばしく焼く","醤油とみりんを絡める","溶き卵を流し入れ、半熟状になるまで炒め合わせる"], prepTime: 10, mealType:["lunch", "dinner"] },
  { name:"鶏むねのチキン南蛮", seasons:["spring","summer","autumn","winter"], protein:34, carbs:18, fat:22, kcal:420, cost:240, mainProtein:"鶏むね肉", ingredients:["鶏むね肉 200g","卵 1個","タルタル","酢","砂糖"], steps:["鶏肉に小麦粉と溶き卵をつけて揚げる","熱いうちに酢・醤油・砂糖を合わせた南蛮酢にくぐらせる","タルタルソースをたっぷりかける"], prepTime: 30, mealType:["dinner"] },
  { name:"ピーマンの肉詰め", seasons:["spring","summer","autumn","winter"], protein:26, carbs:12, fat:18, kcal:320, cost:250, mainProtein:"合い挽き肉", ingredients:["ピーマン 4個","合い挽き肉 150g","玉ねぎ 1/4個","パン粉","ケチャップ"], steps:["ピーマンを縦半分に切り、種を取って内側に小麦粉を振る","ひき肉、みじん切り玉ねぎ、パン粉を混ぜてタネを作る","ピーマンにタネを詰め、肉の面から焼く","ケチャップとソースを合わせたタレを絡める"], prepTime: 25, mealType:["dinner"] },
  { name:"カレーライス", seasons:["spring","summer","autumn","winter"], protein:18, carbs:70, fat:14, kcal:480, cost:200, mainProtein:"豚肉", ingredients:["豚肉 150g","じゃがいも 2個","にんじん 1本","玉ねぎ 1個","カレールー"], steps:["肉と野菜を一口大に切る","鍋で具材を炒め、水を加えて煮込む","具材が柔らかくなったら火を止め、ルーを溶かす","とろみがつくまで弱火で煮る"], prepTime: 40, mealType:["lunch", "dinner"] },
  { name:"肉じゃが", seasons:["spring","summer","autumn","winter"], protein:20, carbs:35, fat:18, kcal:380, cost:250, mainProtein:"豚肉・牛肉", ingredients:["豚肉または牛肉 150g","じゃがいも 3個","玉ねぎ 1個","しらたき","醤油","みりん"], steps:["肉と野菜を適当な大きさに切る","鍋で肉を炒め、野菜としらたきを加える","だし汁と調味料を加え、落とし蓋をして煮込む"], prepTime: 30, mealType:["dinner"] },
  { name:"チーズインハンバーグ", seasons:["spring","summer","autumn","winter"], protein:28, carbs:15, fat:25, kcal:450, cost:280, mainProtein:"合い挽き肉", ingredients:["合い挽き肉 200g","玉ねぎ 1/2個","スライスチーズ 2枚","パン粉","ケチャップ"], steps:["玉ねぎをみじん切りにして炒め、冷ます","ひき肉、玉ねぎ、パン粉を混ぜてタネを作り、中心にチーズを包む","フライパンで両面を焼き、蓋をして中まで火を通す"], prepTime: 30, mealType:["dinner"] }
];

async function seedDishes(pool) {
  for (const d of SEED_DISHES) {
    await pool.query(
      `INSERT INTO dishes (name, seasons, protein, carbs, fat, kcal, cost, main_protein, ingredients, steps, prep_time, meal_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [d.name, d.seasons, d.protein, d.carbs, d.fat, d.kcal, d.cost, d.mainProtein, d.ingredients, d.steps, d.prepTime, d.mealType]
    );
  }
  return SEED_DISHES.length;
}

module.exports = { SEED_DISHES, seedDishes };

if (require.main === module) {
  const pool = require("./pool");
  (async () => {
    try {
      const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
      await pool.query(sql);
      const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM dishes");
      if (rows[0].n === 0) {
        const n = await seedDishes(pool);
        console.log(`seeded ${n} dishes`);
      } else {
        console.log(`dishes already has ${rows[0].n} rows — skip`);
      }
      await pool.query("INSERT INTO app_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
      console.log("done");
    } catch (e) {
      console.error("seed failed:", e.message);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}
