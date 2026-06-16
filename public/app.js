/* ============================================================
   旬献立 — Frontend Application v2.0
   ============================================================ */

const state = {
  dishes: [],
  servings: 2,
  shoppingDays: [new Date().getDay()],
  catalogFilter: 'all',
  templates: JSON.parse(localStorage.getItem('shunkondate_templates') || '[]'),
  weekMenu: Array.from({ length: 7 }, () => ({
    breakfast: null,
    lunch: null,
    dinner: null,
    completed: {}
  })),
  monthlyMenu: {},
  level: parseInt(localStorage.getItem('shunkondate_level') || '1'),
  exp: parseInt(localStorage.getItem('shunkondate_exp') || '0'),
  chatHistoryHimari: JSON.parse(localStorage.getItem('shunkondate_chat_himari') || '[]'),
  chatHistoryTakumi: JSON.parse(localStorage.getItem('shunkondate_chat_takumi') || '[]')
};

/* ============ Utility: Debounce ============ */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ============ Toast Notification System ============ */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const icons = {
    success: 'ph-check-circle',
    error: 'ph-warning-circle',
    info: 'ph-info'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

/* ============ Custom Confirm Dialog ============ */
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon"><i class="ph ph-warning"></i></div>
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline" id="confirm-cancel">キャンセル</button>
          <button class="btn btn-danger" id="confirm-ok">削除する</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

/* ============ Confetti Effect ============ */
function spawnConfetti(x, y) {
  const colors = ['#FF6B4A','#48BB78','#FBBF24','#3182CE','#E53E3E','#9F7AEA'];
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.transform = `translate(${(Math.random()-0.5)*200}px, ${-Math.random()*100}px) rotate(${Math.random()*360}deg)`;
    particle.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1500);
  }
}

/* ============ Theme Toggle ============ */
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('shunkondate_theme', newTheme);
  const icon = document.querySelector('#theme-toggle i');
  icon.className = newTheme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
}

function initTheme() {
  const saved = localStorage.getItem('shunkondate_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('#theme-toggle i');
  if (icon) icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
}

/* ============ Data Fetching with Cache ============ */
async function fetchDishes() {
  try {
    const r = await fetch("/api/dishes");
    state.dishes = await r.json();
    localStorage.setItem('shunkondate_dishes_cache', JSON.stringify(state.dishes));
  } catch(e) {
    // Fallback to cache
    const cached = localStorage.getItem('shunkondate_dishes_cache');
    if (cached) {
      state.dishes = JSON.parse(cached);
      showToast('オフラインキャッシュからデータを読み込みました', 'info');
    }
  }
}

async function fetchPlan() {
  try {
    const r = await fetch("/api/state");
    if (!r.ok) return;
    const stateData = await r.json();
    if (stateData.weekMenu && stateData.weekMenu.length === 7) {
      state.weekMenu = typeof stateData.weekMenu === 'string' ? JSON.parse(stateData.weekMenu) : stateData.weekMenu;
    }
    if (stateData.monthlyMenu) {
      state.monthlyMenu = typeof stateData.monthlyMenu === 'string' ? JSON.parse(stateData.monthlyMenu) : stateData.monthlyMenu;
    }
    localStorage.setItem('shunkondate_plan_cache', JSON.stringify(state.weekMenu));
    localStorage.setItem('shunkondate_monthly_cache', JSON.stringify(state.monthlyMenu));
  } catch(e) {
    const cached = localStorage.getItem('shunkondate_plan_cache');
    if (cached) {
      let parsed = JSON.parse(cached);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      state.weekMenu = parsed;
    }
    const monthlyCached = localStorage.getItem('shunkondate_monthly_cache');
    if (monthlyCached) {
      let parsed = JSON.parse(monthlyCached);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      state.monthlyMenu = parsed;
    }
  }
  syncPlanWithDishes();
}

function syncPlanWithDishes() {
  if (!state.monthlyMenu) return;
  let updated = false;
  for (const dateStr in state.monthlyMenu) {
    const dayMenu = state.monthlyMenu[dateStr];
    mealTypes.forEach(mt => {
      const dish = dayMenu[mt.key];
      if (dish && dish.id) {
        const latestDish = state.dishes.find(d => d.id === dish.id);
        if (latestDish) {
          dayMenu[mt.key] = latestDish;
          updated = true;
        }
      }
    });
  }
  if (updated) {
    localStorage.setItem('shunkondate_monthly_cache', JSON.stringify(state.monthlyMenu));
  }
}

async function savePlan() {
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekMenu: state.weekMenu, monthlyMenu: state.monthlyMenu })
    });
    localStorage.setItem('shunkondate_plan_cache', JSON.stringify(state.weekMenu));
    localStorage.setItem('shunkondate_monthly_cache', JSON.stringify(state.monthlyMenu));
  } catch(e) {
    showToast('保存に失敗しました。後でリトライしてください。', 'error');
  }
}

/* ============ Tab Navigation ============ */
function showTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-link").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${tabId}`).classList.add("active");
  
  const activeTabLink = document.querySelector(`.tab-link[onclick="showTab('${tabId}')"]`);
  if (activeTabLink) activeTabLink.classList.add("active");

  if (tabId === "today") renderToday();
  if (tabId === "week") renderWeek();
  if (tabId === "month") renderMonth();
  if (tabId === "catalog") renderCatalog();
  if (tabId === "shopping") renderShopping();
}

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
const mealTypes = [
  { key: "breakfast", label: "朝食", icon: "ph-coffee" },
  { key: "lunch", label: "昼食", icon: "ph-hamburger" },
  { key: "dinner", label: "夕食", icon: "ph-bowl-food" }
];

/* ============ Servings ============ */
function changeServings(val) {
  state.servings = parseInt(val, 10);
  const elWeek = document.getElementById("servings-input-week");
  const elShop = document.getElementById("servings-input-shopping");
  if (elWeek) elWeek.value = val;
  if (elShop) elShop.value = val;
  renderToday();
  renderWeek();
  renderShopping();
}

/* ============ Ingredient Scaling ============ */
function scaleIngredient(ingText, servings) {
  if (!/[0-9]/.test(ingText)) return ingText;
  return ingText.replace(/([0-9\.\\/]+)/g, (match) => {
    if (match.includes('/')) {
      const parts = match.split('/');
      const val = parseFloat(parts[0]) / parseFloat(parts[1]);
      return formatScaledVal(val * servings);
    }
    const val = parseFloat(match);
    if (!isNaN(val)) return formatScaledVal(val * servings);
    return match;
  });
}

function formatScaledVal(val) {
  if (val % 1 === 0) return val.toString();
  return val.toFixed(1).replace(/\.0$/, '');
}

/* ============ Shopping Day Toggles ============ */
function toggleShoppingDay(dayIdx) {
  const btn = document.getElementById(`day-btn-${dayIdx}`);
  if (!btn) return;
  const idx = state.shoppingDays.indexOf(dayIdx);
  if (idx > -1) {
    state.shoppingDays.splice(idx, 1);
    btn.classList.remove("active");
  } else {
    state.shoppingDays.push(dayIdx);
    btn.classList.add("active");
  }
  renderShopping();
}

function setShoppingPreset(preset) {
  if (preset === 'first3') state.shoppingDays = [0, 1, 2];
  else if (preset === 'last3') state.shoppingDays = [3, 4, 5];
  else state.shoppingDays = [0, 1, 2, 3, 4, 5, 6];

  for (let i = 0; i < 7; i++) {
    const btn = document.getElementById(`day-btn-${i}`);
    if (btn) {
      btn.classList.toggle("active", state.shoppingDays.includes(i));
    }
  }
  renderShopping();
}

function syncShoppingUI() {
  for (let i = 0; i < 7; i++) {
    const btn = document.getElementById(`day-btn-${i}`);
    if (btn) btn.classList.toggle("active", state.shoppingDays.includes(i));
  }
}

/* ============ Season Helpers ============ */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return { key: 'spring', label: '春', emoji: '🌸', desc: '新緑と春の恵みの季節です' };
  if (month >= 6 && month <= 8) return { key: 'summer', label: '夏', emoji: '🌻', desc: 'さっぱり料理が美味しい季節です' };
  if (month >= 9 && month <= 11) return { key: 'autumn', label: '秋', emoji: '🍂', desc: '食欲の秋、旬の食材が豊富です' };
  return { key: 'winter', label: '冬', emoji: '❄️', desc: '温かい鍋や煮物が恋しい季節です' };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '🌙 こんばんは';
  if (h < 11) return '☀️ おはようございます';
  if (h < 17) return '🍽 こんにちは';
  return '🌙 こんばんは';
}

function getDishIcon(dish) {
  if (!dish) return 'ph-question';
  const mt = dish.mealType || [];
  if (mt.includes('breakfast')) return '☀️';
  if (mt.includes('lunch')) return '🍱';
  return '🍽';
}

function getDishThumbGradient(dish) {
  if (!dish) return 'linear-gradient(135deg, #e2e8f0, #cbd5e0)';
  const mp = (dish.mainProtein || '').toLowerCase();
  if (mp.includes('鶏') || mp.includes('チキン')) return 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)';
  if (mp.includes('豚')) return 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)';
  if (mp.includes('牛')) return 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)';
  if (mp.includes('魚') || mp.includes('鮭') || mp.includes('サバ') || mp.includes('アジ') || mp.includes('ブリ') || mp.includes('サワラ') || mp.includes('たら') || mp.includes('さんま') || mp.includes('牡蠣')) return 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)';
  if (mp.includes('卵')) return 'linear-gradient(135deg, #FBBF24 0%, #EAB308 100%)';
  if (mp.includes('豆腐') || mp.includes('納豆') || mp.includes('厚揚げ')) return 'linear-gradient(135deg, #A3E635 0%, #65A30D 100%)';
  if (mp.includes('パスタ') || mp.includes('うどん') || mp.includes('そば') || mp.includes('そうめん')) return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
  if (mp.includes('乳') || mp.includes('チーズ')) return 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)';
  return 'linear-gradient(135deg, #FF8E53 0%, #FF6B4A 100%)';
}

function getDishEmoji(dish) {
  if (!dish) return '🍽';
  const mp = (dish.mainProtein || '').toLowerCase();
  if (mp.includes('鶏')) return '🐔';
  if (mp.includes('豚')) return '🐷';
  if (mp.includes('牛')) return '🐂';
  if (mp.includes('魚') || mp.includes('鮭') || mp.includes('サバ') || mp.includes('アジ') || mp.includes('ブリ') || mp.includes('たら') || mp.includes('さんま') || mp.includes('牡蠣') || mp.includes('サワラ') || mp.includes('アサリ')) return '🐟';
  if (mp.includes('卵')) return '🥚';
  if (mp.includes('豆腐') || mp.includes('納豆') || mp.includes('厚揚げ')) return '🫘';
  if (mp.includes('パスタ') || mp.includes('うどん') || mp.includes('そば') || mp.includes('そうめん')) return '🍜';
  return '🍳';
}

/* ============ Render: Today Tab ============ */
function renderToday() {
  const now = new Date();
  const dayIdx = now.getDay();

  // Hero
  document.getElementById("hero-greeting").textContent = getGreeting();
  document.getElementById("hero-date").textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 (${dayNames[dayIdx]}曜日)`;

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMenu = state.monthlyMenu[todayStr] || { breakfast: null, lunch: null, dinner: null, completed: {} };
  let totalKcal = 0, totalP = 0, totalF = 0, totalC = 0, totalCost = 0;
  let filledCount = 0;

  mealTypes.forEach(mt => {
    const dish = todayMenu[mt.key];
    if (dish) {
      totalKcal += dish.kcal || 0;
      totalP += dish.protein || 0;
      totalF += dish.fat || 0;
      totalC += dish.carbs || 0;
      totalCost += (dish.cost || 0) * state.servings;
      filledCount++;
    }
  });

  // Hero summary stats
  document.getElementById("hero-summary").innerHTML = `
    <div class="hero-stat"><i class="ph ph-fire"></i> ${totalKcal} kcal</div>
    <div class="hero-stat"><i class="ph ph-coin"></i> ${totalCost}円 (${state.servings}人分)</div>
    <div class="hero-stat"><i class="ph ph-check-circle"></i> ${filledCount}/3 食設定済</div>
    <div class="hero-stat" style="background:var(--primary-color); color:#fff; border:1px solid rgba(255,255,255,0.4);"><i class="ph ph-star"></i> 料理Lv.${state.level} (あと${state.level * 100 - state.exp}EXP)</div>
  `;

  // Season banner
  renderSeasonBanner();

  // Meals
  const container = document.getElementById("today-meals-container");
  container.innerHTML = "";

  mealTypes.forEach(mt => {
    const dish = todayMenu[mt.key];
    const isCompleted = todayMenu.completed ? todayMenu.completed[mt.key] : false;
    const slot = document.createElement("div");
    slot.className = `meal-slot-today ${isCompleted ? 'completed' : ''}`;
    slot.innerHTML = `
      <div class="meal-type-label">
        <i class="ph ${mt.icon}"></i>
        ${mt.label}
      </div>
      <div class="meal-image-placeholder" style="background: ${dish ? getDishThumbGradient(dish) : '#e2e8f0'}">
        ${dish ? getDishEmoji(dish) : '<i class="ph ph-question"></i>'}
      </div>
      <div class="meal-info">
        ${dish ? `
          <div class="meal-title">${dish.name}</div>
          <div class="meal-meta">
            <span><i class="ph ph-fire"></i> ${dish.kcal}kcal</span>
            <span><i class="ph ph-clock"></i> ${dish.prepTime}分</span>
            <span><i class="ph ph-coin"></i> ${dish.cost * state.servings}円</span>
          </div>
        ` : `<div class="meal-title" style="color:var(--text-light)">未設定</div>
             <div class="meal-meta" style="font-size:0.8rem;">献立プランナーで設定しましょう</div>`}
      </div>
      <div class="meal-actions">
        ${dish ? `
          <button class="btn btn-outline" style="padding:0.3rem 0.5rem; margin-right:0.5rem;" onclick="showRecipe(${dish.id})">
            <i class="ph ph-book-open"></i> レシピ
          </button>
          <button class="btn ${isCompleted ? 'btn-outline' : 'btn-primary'}" onclick="toggleComplete('${todayStr}', '${mt.key}', event)">
            ${isCompleted ? '<i class="ph ph-arrow-u-down-left"></i> 戻す' : '<i class="ph ph-check"></i> 食べた'}
          </button>
        ` : ''}
      </div>
    `;
    container.appendChild(slot);
  });

  // Daily Progress
  const targetKcal = 2000;
  const targetP = 100, targetF = 60, targetC = 250;
  const pctKcal = Math.min(100, Math.round((totalKcal / targetKcal) * 100));
  
  document.getElementById("daily-progress").innerHTML = `
    <div class="progress-title">
      <span>1日の総カロリー</span>
      <span>${totalKcal} / ${targetKcal} kcal (${pctKcal}%)</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: ${pctKcal}%; background-color: ${pctKcal > 100 ? '#E53E3E' : 'var(--primary-color)'}"></div>
    </div>
    <div class="pfc-stats">
      <div class="pfc-item"><span>${totalP}g</span><span>タンパク質(目標${targetP}g)</span></div>
      <div class="pfc-item"><span>${totalF}g</span><span>脂質(目標${targetF}g)</span></div>
      <div class="pfc-item"><span>${totalC}g</span><span>炭水化物(目標${targetC}g)</span></div>
    </div>
  `;

  // Himari advisor
  const speechEl = document.getElementById("today-advisor-speech");
  if (speechEl) {
    if (!todayMenu.breakfast && !todayMenu.lunch && !todayMenu.dinner) {
      speechEl.innerHTML = "今日の献立がまだ設定されていないみたいです。献立プランナーで<b>「保存レシピから自動作成」</b>をクリックするか、自分でレシピを割り当ててみてね！";
    } else {
      let advice = "";
      if (totalKcal < 1500) advice += "今日の予定カロリーは少し低めですね。活動量に合わせて軽食やおやつでエネルギーを補ってください。";
      else if (totalKcal > 2300) advice += "今日のカロリーは目標をオーバーしそうです。次の食事で油控えめな和食にするなど調整してみましょう。";
      else advice += "カロリー目標はバッチリです！素晴らしいですね！ ";

      if (totalP < 60) advice += "タンパク質（P）がやや不足気味です。卵、豆腐、または魚介類をあと一品プラスすることをおすすめします。";
      else if (totalF > 75) advice += "脂質（F）が少し多めかもしれません。調理に使う油を控えたり、蒸し料理を取り入れるとヘルシーになりますよ。";
      else advice += "PFCバランスも整っています。この調子で美味しく健康的な食事を楽しみましょう！";
      speechEl.innerHTML = advice;
    }
  }
}

function renderSeasonBanner() {
  const season = getCurrentSeason();
  const seasonDishes = state.dishes.filter(d => (d.season || []).includes(season.key)).slice(0, 4);
  const banner = document.getElementById("season-banner");
  if (!banner) return;
  
  if (seasonDishes.length === 0) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div class="season-banner-icon">${season.emoji}</div>
    <div class="season-banner-text">
      <strong>${season.label}のおすすめ料理</strong>
      <span>${season.desc}</span>
    </div>
    <div class="season-banner-dishes">
      ${seasonDishes.map(d => `<span class="chip" onclick="showRecipe(${d.id})">${d.name}</span>`).join('')}
    </div>
  `;
}

function toggleComplete(dateStr, mealKey, event) {
  if (!state.monthlyMenu[dateStr]) state.monthlyMenu[dateStr] = { breakfast: null, lunch: null, dinner: null, completed: {} };
  if (!state.monthlyMenu[dateStr].completed) state.monthlyMenu[dateStr].completed = {};
  const wasCompleted = state.monthlyMenu[dateStr].completed[mealKey];
  state.monthlyMenu[dateStr].completed[mealKey] = !wasCompleted;
  savePlan();

  if (!wasCompleted && event) {
    // Fire confetti!
    const rect = event.target.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top);
    
    // Gain EXP
    state.exp += 50;
    const requiredExp = state.level * 100;
    let msg = `🎉 食べた！ (+50 EXP)`;
    if (state.exp >= requiredExp) {
      state.level += 1;
      state.exp -= requiredExp;
      msg = `🌟 レベルアップ！ Lv.${state.level}になりました！`;
      // レベルアップの特別演出
      setTimeout(() => spawnConfetti(window.innerWidth/2, window.innerHeight/2), 500);
      setTimeout(() => spawnConfetti(window.innerWidth/2, window.innerHeight/2), 800);
    }
    localStorage.setItem('shunkondate_level', state.level);
    localStorage.setItem('shunkondate_exp', state.exp);
    showToast(msg, 'success');
  }
  renderToday();
  renderWeek();
  if (document.getElementById('tab-month').classList.contains('active')) renderMonth();
}

function getGradient(id) {
  const hues = [0, 30, 60, 120, 200, 280, 320];
  const hue = hues[(id || 0) % hues.length];
  return `linear-gradient(135deg, hsl(${hue}, 70%, 80%) 0%, hsl(${hue}, 50%, 60%) 100%)`;
}

/* ============ Render: Month Grid ============ */
let currentMonthDate = new Date();

function changeMonth(delta) {
  currentMonthDate.setMonth(currentMonthDate.getMonth() + delta);
  renderMonth();
}

function renderMonth() {
  const grid = document.getElementById("month-calendar-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  
  document.getElementById("month-calendar-title").innerText = `${year}年${month + 1}月`;

  // Headers (Sun - Sat)
  const daysHeader = ["日", "月", "火", "水", "木", "金", "土"];
  daysHeader.forEach(d => {
    const el = document.createElement("div");
    el.style.textAlign = "center";
    el.style.fontWeight = "bold";
    el.style.color = "var(--text-light)";
    el.style.fontSize = "0.8rem";
    el.innerText = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  
  const today = new Date();
  
  // Create cells
  const totalCells = Math.ceil((lastDay.getDate() + startOffset) / 7) * 7;
  
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(year, month, i - startOffset + 1);
    const cellStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
    const dayMenu = state.monthlyMenu[cellStr] || { breakfast: null, lunch: null, dinner: null, completed: {} };
    
    const cell = document.createElement("div");
    cell.className = "month-day-cell";
    if (cellDate.getMonth() !== month) cell.classList.add("other-month");
    if (cellDate.toDateString() === today.toDateString()) cell.classList.add("is-today");
    
    let html = `<div class="month-day-header">${cellDate.getDate()}</div><div class="month-meal-list">`;
    
    let hasMeals = false;
    mealTypes.forEach(mt => {
      const dish = dayMenu[mt.key];
      if (dish) {
        hasMeals = true;
        const isEaten = dayMenu.completed && dayMenu.completed[mt.key];
        const emoji = getDishEmoji(dish);
        html += `<div class="month-meal-item ${isEaten ? 'completed' : ''}" onclick="showRecipe(${dish.id})">
          ${emoji} ${dish.name}
        </div>`;
      }
    });
    
    if (!hasMeals) {
      html += `<div class="month-meal-empty" onclick="openMonthAddModal('${cellStr}')">追加</div>`;
    }
    
    html += `</div>`;
    cell.innerHTML = html;
    
    // Drag & Drop
    cell.ondragover = (e) => { e.preventDefault(); cell.style.background = 'rgba(234,88,12,0.1)'; };
    cell.ondragleave = () => { cell.style.background = ''; };
    cell.ondrop = (e) => {
      e.preventDefault();
      cell.style.background = '';
      if (draggedDish) {
        openMonthAddModal(cellStr, draggedDish);
      }
    };
    
    grid.appendChild(cell);
  }
}

let monthAddTargetDate = null;
function openMonthAddModal(dateStr, presetDish = null) {
  monthAddTargetDate = dateStr;
  // Use quick swap modal UI but override logic for monthly mode
  currentSwapDay = 'month'; // special flag
  document.getElementById("quick-swap-modal-title").innerText = `${dateStr} の献立を追加`;
  
  const listEl = document.getElementById("quick-swap-list");
  
  if (presetDish) {
    // Directly add
    confirmMonthlyAdd(presetDish.id, 'dinner'); // default to dinner
    return;
  }
  
  const matchedDishes = [...state.dishes].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return a.name.localeCompare(b.name);
  });
  
  listEl.innerHTML = matchedDishes.map(d => {
    return `
      <div class="quick-swap-item" onclick="confirmMonthlyAdd(${d.id})">
        <div>
          <div class="quick-swap-name">${d.favorite ? '<i class="ph-fill ph-star" style="color:#D69E2E;"></i>' : ''} ${d.name}</div>
          <div class="quick-swap-meta">${d.kcal}kcal / ${d.prepTime}分</div>
        </div>
      </div>
    `;
  }).join("");
  
  document.getElementById("quick-swap-modal").style.display = "block";
}

function confirmMonthlyAdd(dishId, mealTypeOverride = null) {
  if (!monthAddTargetDate) return;
  const d = state.dishes.find(x => x.id === dishId);
  if (!d) return;
  
  if (!state.monthlyMenu[monthAddTargetDate]) {
    state.monthlyMenu[monthAddTargetDate] = { breakfast: null, lunch: null, dinner: null, completed: {} };
  }
  
  // Decide meal type: try to match, or default
  let mt = mealTypeOverride;
  if (!mt) {
    if ((d.mealType || []).includes('dinner')) mt = 'dinner';
    else if ((d.mealType || []).includes('lunch')) mt = 'lunch';
    else if ((d.mealType || []).includes('breakfast')) mt = 'breakfast';
    else mt = 'dinner';
  }
  
  state.monthlyMenu[monthAddTargetDate][mt] = d;
  savePlan();
  renderMonth();
  if (document.getElementById('tab-week').classList.contains('active')) renderWeek();
  if (document.getElementById('tab-today').classList.contains('active')) renderToday();
  closeQuickSwapModal();
  showToast(`${monthAddTargetDate} に ${d.name} を追加しました`, 'success');
}

/* ============ Render: Week Grid (Drag & Drop + Quick Swap) ============ */
let draggedDish = null;
let sourceDateStr = null;
let sourceMealKey = null;

let currentWeekDate = new Date();

function changeWeek(delta) {
  currentWeekDate.setDate(currentWeekDate.getDate() + delta * 7);
  renderWeek();
}

function renderWeek() {
  const grid = document.getElementById("week-grid");
  grid.innerHTML = "";

  let totalFilledSlots = 0;
  let weekTotalKcal = 0, weekTotalCost = 0, weekTotalP = 0, weekTotalF = 0, weekTotalC = 0;

  // Calculate start of week (Sunday)
  const d = new Date(currentWeekDate);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const startOfWeek = new Date(d.setDate(diff));

  for (let i = 0; i < 7; i++) {
    const colDate = new Date(startOfWeek);
    colDate.setDate(startOfWeek.getDate() + i);
    const dateStr = `${colDate.getFullYear()}-${String(colDate.getMonth() + 1).padStart(2, '0')}-${String(colDate.getDate()).padStart(2, '0')}`;
    
    let dayMenu = state.monthlyMenu[dateStr];
    if (!dayMenu) dayMenu = { breakfast: null, lunch: null, dinner: null, completed: {} };

    const col = document.createElement("div");
    col.className = "day-column";
    
    let kcalDay = 0, costDay = 0;
    mealTypes.forEach(mt => {
      if (dayMenu[mt.key]) {
        kcalDay += dayMenu[mt.key].kcal || 0;
        costDay += dayMenu[mt.key].cost || 0;
        weekTotalP += dayMenu[mt.key].protein || 0;
        weekTotalF += dayMenu[mt.key].fat || 0;
        weekTotalC += dayMenu[mt.key].carbs || 0;
        totalFilledSlots++;
      }
    });
    weekTotalKcal += kcalDay;
    weekTotalCost += costDay;
    
    const scaledCost = costDay * state.servings;

    const isToday = (colDate.toDateString() === new Date().toDateString());

    col.innerHTML = `
      <div class="day-header" style="${isToday ? 'color:var(--primary-color); font-weight:bold;' : ''}">
        ${colDate.getMonth()+1}/${colDate.getDate()} (${dayNames[i]})
        <div style="font-size:0.75rem; color:var(--text-light); font-weight:normal; margin-top:0.2rem">
          計 ${kcalDay}kcal / ${scaledCost}円
        </div>
      </div>
    `;

    mealTypes.forEach(mt => {
      const dropzone = document.createElement("div");
      dropzone.className = "meal-dropzone";
      dropzone.innerHTML = `<div class="meal-dropzone-title"><i class="ph ${mt.icon}"></i> ${mt.label}</div>`;
      
      const dish = dayMenu[mt.key];
      if (dish) {
        const item = document.createElement("div");
        item.className = "draggable-dish";
        item.draggable = true;
        item.ondragstart = (e) => {
          draggedDish = dish;
          sourceDateStr = dateStr;
          sourceMealKey = mt.key;
        };
        const isEaten = dayMenu.completed && dayMenu.completed[mt.key];
        item.style.opacity = isEaten ? "0.6" : "1";
        item.innerHTML = `
          <strong onclick="event.stopPropagation(); showRecipe(${dish.id})" title="レシピを見る" style="${isEaten ? 'text-decoration:line-through;' : ''}">${dish.name}</strong>
          <div style="font-size:0.75rem; color:var(--text-light); margin-top:0.3rem; margin-bottom:0.4rem;">
            ${dish.kcal}kcal / ${dish.prepTime}分
          </div>
          <div class="planner-dish-actions" style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem; padding-top:0.4rem; border-top:1px dashed var(--border-color);">
             <button class="btn ${isEaten ? 'btn-primary' : 'btn-outline'} btn-xs" onclick="event.stopPropagation(); toggleComplete('${dateStr}', '${mt.key}', event)" title="食べた" style="border-radius:20px;"><i class="ph ph-check-circle"></i>${isEaten ? '済' : '食べた'}</button>
             <div style="display:flex; gap:0.2rem;">
               <button class="btn btn-xs icon-only" onclick="event.stopPropagation(); openQuickSwapModal('${dateStr}', '${mt.key}')" title="変更"><i class="ph ph-arrows-left-right" style="font-size:1.1rem;"></i></button>
               <button class="btn btn-xs icon-only" onclick="event.stopPropagation(); clearSlot('${dateStr}', '${mt.key}')" title="消去" onmouseover="this.style.color='#E53E3E'" onmouseout="this.style.color=''"><i class="ph ph-trash" style="font-size:1.1rem;"></i></button>
             </div>
          </div>
        `;
        dropzone.appendChild(item);
      }

      dropzone.onclick = (e) => {
        if (!dayMenu[mt.key]) openQuickSwapModal(dateStr, mt.key);
      };

      dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); };
      dropzone.ondragleave = () => dropzone.classList.remove("drag-over");
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        if (draggedDish !== null) {
          if (!state.monthlyMenu[dateStr]) state.monthlyMenu[dateStr] = { breakfast: null, lunch: null, dinner: null, completed: {} };
          if (sourceDateStr !== null && sourceMealKey !== null && state.monthlyMenu[sourceDateStr]) {
             state.monthlyMenu[sourceDateStr][sourceMealKey] = state.monthlyMenu[dateStr][mt.key];
          }
          state.monthlyMenu[dateStr][mt.key] = draggedDish;
          draggedDish = null; sourceDateStr = null; sourceMealKey = null;
          savePlan();
          renderWeek();
          if (document.getElementById('tab-month').classList.contains('active')) renderMonth();
        }
      };
      col.appendChild(dropzone);
    });
    grid.appendChild(col);
  }

  // Status bar
  const pct = Math.round((totalFilledSlots / 21) * 100);
  const fill = document.getElementById("planner-status-fill");
  const count = document.getElementById("planner-status-count");
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = `${totalFilledSlots}/21`;

  // Weekly Summary
  renderWeekSummary(weekTotalKcal, weekTotalCost, totalFilledSlots, weekTotalP, weekTotalF, weekTotalC);
  renderMiniCatalog();
}

function renderWeekSummary(kcal, cost, filled, p, f, c) {
  const el = document.getElementById("week-summary-card");
  if (!el) return;
  const filledDays = filled > 0 ? Math.ceil(filled / 3) : 0;
  const avgKcal = filledDays > 0 ? Math.round(kcal / filledDays) : 0;
  
  el.innerHTML = `
    <div class="summary-stat">
      <div class="stat-icon"><i class="ph ph-coin"></i></div>
      <span class="stat-value">${(cost * state.servings).toLocaleString()}円</span>
      <span class="stat-label">1週間の合計費用 (${state.servings}人分)</span>
    </div>
    <div class="summary-stat">
      <div class="stat-icon"><i class="ph ph-fire"></i></div>
      <span class="stat-value">${avgKcal} kcal</span>
      <span class="stat-label">1日の平均カロリー</span>
    </div>
    <div class="summary-stat">
      <div class="stat-icon"><i class="ph ph-check-square"></i></div>
      <span class="stat-value">${filled}/21</span>
      <span class="stat-label">設定済み食数</span>
    </div>
    <div class="summary-stat">
      <div class="stat-icon"><i class="ph ph-chart-bar"></i></div>
      <span class="stat-value">P${Math.round(p/7)} F${Math.round(f/7)} C${Math.round(c/7)}</span>
      <span class="stat-label">1日平均PFC (g)</span>
    </div>
  `;
}

function clearSlot(dateStr, mealKey) {
  if (state.monthlyMenu[dateStr]) {
    state.monthlyMenu[dateStr][mealKey] = null;
    if (state.monthlyMenu[dateStr].completed) state.monthlyMenu[dateStr].completed[mealKey] = false;
  }
  savePlan();
  renderWeek();
  renderToday();
  if (document.getElementById('tab-month').classList.contains('active')) renderMonth();
  showToast('スロットをクリアしました', 'info');
}

/* ============ Quick Swap Logic ============ */
let currentSwapDate = null;
let currentSwapMeal = null;

function openQuickSwapModal(dateStr, mealKey) {
  currentSwapDate = dateStr;
  currentSwapMeal = mealKey;
  
  const mealLabel = mealTypes.find(x => x.key === mealKey).label;
  document.getElementById("quick-swap-modal-title").innerText = `${dateStr} - ${mealLabel}に設定する料理を選んでください`;
  
  const listEl = document.getElementById("quick-swap-list");
  listEl.innerHTML = "";
  
  const matchedDishes = [...state.dishes].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    const aMatch = (a.mealType || []).includes(mealKey);
    const bMatch = (b.mealType || []).includes(mealKey);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return a.name.localeCompare(b.name);
  });
  
  listEl.innerHTML = matchedDishes.map(d => {
    const isMatched = (d.mealType || []).includes(mealKey);
    return `
      <div class="quick-swap-item" onclick="confirmQuickSwap(${d.id})">
        <div>
          <div class="quick-swap-name">
            ${d.favorite ? '<i class="ph-fill ph-star" style="color:#D69E2E; margin-right:0.2rem;"></i>' : ''}
            ${d.name}
          </div>
          <div class="quick-swap-meta">
            ${d.kcal}kcal / ${d.prepTime}分 ${isMatched ? '<span class="tag tag-meal" style="padding:0.1rem 0.3rem; font-size:0.7rem; margin-left:0.5rem;">おすすめ</span>' : ''}
          </div>
        </div>
        <i class="ph ph-caret-right" style="color:var(--text-light)"></i>
      </div>
    `;
  }).join("");
  
  document.getElementById("quick-swap-modal").style.display = "block";
}

function closeQuickSwapModal() {
  document.getElementById("quick-swap-modal").style.display = "none";
}

function confirmQuickSwap(dishId) {
  if (currentSwapDate === null || currentSwapMeal === null) return;
  if (currentSwapDate === 'month') return;
  const d = state.dishes.find(x => x.id === dishId);
  if (d) {
    if (!state.monthlyMenu[currentSwapDate]) state.monthlyMenu[currentSwapDate] = { breakfast: null, lunch: null, dinner: null, completed: {} };
    state.monthlyMenu[currentSwapDate][currentSwapMeal] = d;
    savePlan();
    renderWeek();
    renderToday();
    if (document.getElementById('tab-month').classList.contains('active')) renderMonth();
    closeQuickSwapModal();
    showToast(`${d.name} を設定しました`, 'success');
  }
}

/* ============ Auto Generate from Saved Dishes ============ */
async function generateFromSavedDishes() {
  if (state.dishes.length === 0) {
    showToast('カタログに料理がありません。まずは料理を登録してください。', 'error');
    return;
  }

  const categories = {
    breakfast: { fav: [], normal: [] },
    lunch: { fav: [], normal: [] },
    dinner: { fav: [], normal: [] }
  };

  state.dishes.forEach(d => {
    const mTypes = d.mealType || [];
    mTypes.forEach(mt => {
      if (categories[mt]) {
        if (d.favorite) categories[mt].fav.push(d);
        else categories[mt].normal.push(d);
      }
    });
  });

  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  const d = new Date(currentWeekDate);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const startOfWeek = new Date(d.setDate(diff));

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const colDate = new Date(startOfWeek);
    colDate.setDate(startOfWeek.getDate() + i);
    weekDates.push(`${colDate.getFullYear()}-${String(colDate.getMonth() + 1).padStart(2, '0')}-${String(colDate.getDate()).padStart(2, '0')}`);
  }

  ["breakfast", "lunch", "dinner"].forEach(mt => {
    const favs = shuffle(categories[mt].fav);
    const normals = shuffle(categories[mt].normal);
    let pool = [...favs, ...normals];
    if (pool.length === 0) pool = shuffle(state.dishes);
    for (let i = 0; i < 7; i++) {
      if (pool.length > 0) {
        const dateStr = weekDates[i];
        if (!state.monthlyMenu[dateStr]) state.monthlyMenu[dateStr] = { breakfast: null, lunch: null, dinner: null, completed: {} };
        state.monthlyMenu[dateStr][mt] = pool[i % pool.length];
      }
    }
  });
  await savePlan();
  renderWeek();
  renderToday();

  showTab("today");
  const todaySpeech = document.getElementById("today-advisor-speech");
  if (todaySpeech) {
    todaySpeech.innerHTML = "🎉 <b>保存レシピ（お気に入り優先）から1週間分の献立を自動作成しました！</b> 気に入らない部分があれば、各スロットの「変更」ボタンから個別に変更できます！";
  }
  showToast('1週間分の献立を自動作成しました！', 'success');
}

/* ============ Recipe Modal ============ */
function showRecipe(id) {
  const d = state.dishes.find(x => x.id === id);
  if (!d) return;
  
  document.getElementById("recipe-modal-title").innerText = `${d.name} (${state.servings}人分)`;
  
  const ings = (d.ingredients || []).map(i => `<li>${scaleIngredient(i, state.servings)}</li>`).join("");
  const steps = (d.steps || []).map((s, idx) => `<li><strong>${idx+1}.</strong> ${s}</li>`).join("");

  document.getElementById("recipe-modal-body").innerHTML = `
    <div style="display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
      <span class="tag"><i class="ph ph-fire"></i> ${d.kcal}kcal</span>
      <span class="tag"><i class="ph ph-coin"></i> ${d.cost * state.servings}円 (${state.servings}人分)</span>
      <span class="tag"><i class="ph ph-clock"></i> ${d.prepTime}分</span>
    </div>
    <h4 style="color:var(--primary-color); border-bottom:1px solid var(--border-color); padding-bottom:0.2rem;">材料</h4>
    <ul>${ings || '<li>情報なし</li>'}</ul>
    <h4 style="color:var(--primary-color); border-bottom:1px solid var(--border-color); padding-bottom:0.2rem; margin-top:1rem;">作り方</h4>
    <ul style="list-style:none; padding:0;">${steps || '<li>情報なし</li>'}</ul>
  `;
  document.getElementById("recipe-modal").style.display = "block";
}

function closeRecipeModal() {
  document.getElementById("recipe-modal").style.display = "none";
}

function closeAiRecipeModal() {
  document.getElementById("ai-recipe-modal").style.display = "none";
  const speechEl = document.getElementById("ai-recipe-speech");
  if (speechEl) {
    speechEl.innerHTML = "こんにちは！冷蔵庫の余り物や、今食べたい気分の食材を入力してね。僕が新しいオリジナルレシピを考案するよ！";
  }
}

/* ============ Mini Catalog ============ */
function renderMiniCatalog() {
  const q = (document.getElementById("mini-catalog-search") || {value:""}).value.toLowerCase();
  const filtered = state.dishes.filter(d => 
    !q || d.name.toLowerCase().includes(q) || (d.ingredients||[]).some(i => i.toLowerCase().includes(q))
  );
  
  const list = document.getElementById("mini-catalog-list");
  if (!list) return;
  list.innerHTML = filtered.map(d => `
    <div class="mini-catalog-item" draggable="true" ondragstart="dragCatalogItem(event, ${d.id})">
      <div style="font-weight:bold; margin-bottom:0.3rem; font-size:0.9rem;">${d.name}</div>
      <div style="font-size:0.75rem; color:var(--text-light)">
        <i class="ph ph-fire"></i> ${d.kcal}kcal &nbsp; <i class="ph ph-clock"></i> ${d.prepTime}分
      </div>
    </div>
  `).join("");
}

const debouncedRenderMiniCatalog = debounce(renderMiniCatalog, 300);

/* ============ Catalog Tab Filtering ============ */
function setCatalogFilter(filter) {
  state.catalogFilter = filter;
  document.querySelectorAll('.catalog-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === filter);
  });
  renderCatalog();
}

function renderCatalog() {
  const q = document.getElementById("catalog-search").value.toLowerCase();
  const season = document.getElementById("catalog-season").value;
  
  const filtered = state.dishes.filter(d => {
    if (q && !d.name.toLowerCase().includes(q) && !(d.ingredients||[]).some(i => i.toLowerCase().includes(q))) return false;
    if (season && !(d.season || []).includes(season)) return false;
    
    // Category tab filter
    if (state.catalogFilter === 'favorite' && !d.favorite) return false;
    if (state.catalogFilter === 'breakfast' && !(d.mealType || []).includes('breakfast')) return false;
    if (state.catalogFilter === 'lunch' && !(d.mealType || []).includes('lunch')) return false;
    if (state.catalogFilter === 'dinner' && !(d.mealType || []).includes('dinner')) return false;
    return true;
  });

  // Count display
  const countEl = document.getElementById("catalog-count");
  if (countEl) countEl.textContent = `${filtered.length}件の料理`;

  const grid = document.getElementById("dish-grid");
  grid.innerHTML = filtered.map(d => `
    <div class="dish-card" draggable="true" ondragstart="dragCatalogItem(event, ${d.id})">
      <!-- Thumbnail -->
      <div class="dish-card-thumb" style="background: ${getDishThumbGradient(d)}">
        ${getDishEmoji(d)}
      </div>

      <!-- お気に入りスター -->
      <button class="favorite-star-btn" onclick="toggleFavorite(${d.id})" title="お気に入り">
        <i class="${d.favorite ? 'ph-fill' : 'ph'} ph-star"></i>
      </button>

      <div class="dish-card-body">
        <h3>${d.name}</h3>
        <div class="dish-tags">
          <span class="tag"><i class="ph ph-fire"></i> ${d.kcal}kcal</span>
          <span class="tag"><i class="ph ph-coin"></i> ${d.cost}円</span>
          <span class="tag"><i class="ph ph-clock"></i> ${d.prepTime}分</span>
        </div>
        <div class="dish-tags">
          ${(d.mealType||[]).map(m => {
            const l = mealTypes.find(x=>x.key===m);
            return l ? `<span class="tag tag-meal"><i class="ph ${l.icon}"></i> ${l.label}</span>` : '';
          }).join('')}
        </div>
        <p style="font-size:0.85rem; color:var(--text-light); margin-top:0.5rem; margin-bottom:1rem;">
          P:${d.protein}g F:${d.fat}g C:${d.carbs}g
        </p>

        <div class="dish-card-actions">
          <button class="btn btn-primary btn-sm" onclick="openAddToPlanModal(${d.id}, '${d.name.replace(/'/g, "\\'")}')">
            <i class="ph ph-calendar-plus"></i>献立追加
          </button>
          <button class="btn btn-outline btn-sm" onclick="showRecipe(${d.id})">
            <i class="ph ph-book-open"></i>レシピ
          </button>
        </div>

        <div class="dish-card-admin">
          <button class="btn-text" onclick="editDish(${d.id})">
            <i class="ph ph-pencil-simple"></i>編集
          </button>
          <button class="btn-text btn-delete" onclick="deleteDish(${d.id})">
            <i class="ph ph-trash"></i>削除
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

const debouncedRenderCatalog = debounce(renderCatalog, 300);

/* ============ Favorite & Delete ============ */
async function toggleFavorite(id) {
  const d = state.dishes.find(x => x.id === id);
  if (!d) return;
  try {
    await fetch(`/api/dishes/${id}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !d.favorite })
    });
    await fetchDishes();
    renderCatalog();
    showToast(d.favorite ? 'お気に入りを解除しました' : '⭐ お気に入りに追加しました', 'success');
  } catch(e) {
    showToast('操作に失敗しました', 'error');
  }
}

async function deleteDish(id) {
  const confirmed = await showConfirm('料理を削除', 'この料理をカタログから完全に削除しますか？この操作は取り消せません。');
  if (!confirmed) return;
  try {
    await fetch(`/api/dishes/${id}`, { method: "DELETE" });
    await fetchDishes();
    renderCatalog();
    showToast('料理を削除しました', 'info');
  } catch(e) {
    showToast('削除に失敗しました', 'error');
  }
}

/* ============ Add to Plan Modal ============ */
let addToPlanDishId = null;
function openAddToPlanModal(id, name) {
  addToPlanDishId = id;
  document.getElementById("add-to-plan-dish-name").innerText = name;
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  document.getElementById("add-to-plan-day").value = dateStr;
  document.getElementById("add-to-plan-modal").style.display = "block";
}
function closeAddToPlanModal() { document.getElementById("add-to-plan-modal").style.display = "none"; }

function confirmAddToPlan() {
  if (addToPlanDishId === null) return;
  const dateStr = document.getElementById("add-to-plan-day").value;
  if (!dateStr) return;
  const mealKey = document.getElementById("add-to-plan-meal").value;
  const d = state.dishes.find(x => x.id === addToPlanDishId);
  
  if (d) {
    if (!state.monthlyMenu[dateStr]) state.monthlyMenu[dateStr] = { breakfast: null, lunch: null, dinner: null, completed: {} };
    state.monthlyMenu[dateStr][mealKey] = d;
    savePlan();
    showToast(`${dateStr} に ${d.name} を追加しました`, 'success');
  }
  closeAddToPlanModal();
  renderWeek();
  renderToday();
  if (document.getElementById('tab-month').classList.contains('active')) renderMonth();
}

function dragCatalogItem(e, id) {
  draggedDish = state.dishes.find(d => d.id === id);
  sourceDayIdx = null;
  sourceMealKey = null;
}

/* ============ Shopping ============ */
function renderShopping() {
  const list = document.getElementById("shopping-list");
  const agg = {};
  
  const d = new Date(currentWeekDate);
  const dayIndex = d.getDay();
  const diff = d.getDate() - dayIndex;
  const startOfWeek = new Date(d.setDate(diff));

  for (let i = 0; i < 7; i++) {
    if (!state.shoppingDays.includes(i)) continue;
    
    const colDate = new Date(startOfWeek);
    colDate.setDate(startOfWeek.getDate() + i);
    const dateStr = `${colDate.getFullYear()}-${String(colDate.getMonth() + 1).padStart(2, '0')}-${String(colDate.getDate()).padStart(2, '0')}`;
    
    const day = state.monthlyMenu[dateStr];
    if (!day) continue;

    mealTypes.forEach(mt => {
      const dish = day[mt.key];
      if (dish && dish.ingredients) {
        dish.ingredients.forEach(ing => {
          const scaledIng = scaleIngredient(ing, state.servings);
          const m = scaledIng.match(/^(.+?)\s+(.+)$/);
          let name = scaledIng, amt = "";
          if (m) { name = m[1].trim(); amt = m[2].trim(); }
          
          let cat = "その他";
          if (name.includes("肉") || name.includes("魚") || name.includes("鮭") || name.includes("サバ")) cat = "🥩 肉・魚";
          else if (name.includes("野菜") || name.includes("菜") || name.includes("ねぎ") || name.includes("トマト") || name.includes("玉ねぎ") || name.includes("キャベツ") || name.includes("大根") || name.includes("にんじん") || name.includes("じゃがいも") || name.includes("ピーマン") || name.includes("きゅうり") || name.includes("レタス") || name.includes("ゴーヤ") || name.includes("白菜")) cat = "🥬 野菜";
          else if (name.includes("醤油") || name.includes("みりん") || name.includes("塩") || name.includes("味噌") || name.includes("酢") || name.includes("砂糖") || name.includes("ケチャップ") || name.includes("ポン酢") || name.includes("だし") || name.includes("コンソメ")) cat = "🧂 調味料";
          else if (name.includes("卵") || name.includes("豆腐") || name.includes("納豆") || name.includes("牛乳") || name.includes("チーズ") || name.includes("バター") || name.includes("生クリーム")) cat = "🥛 卵・乳・豆製品";
          
          if(!agg[cat]) agg[cat] = {};
          if(!agg[cat][name]) agg[cat][name] = [];
          if(amt) agg[cat][name].push(amt);
        });
      }
    });
  }

  if (Object.keys(agg).length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="ph ph-shopping-cart"></i></div>
        <div class="empty-state-title">買い物リストがありません</div>
        <p>選択された曜日の献立が未設定か、集計曜日がオンになっていません。</p>
        <div class="empty-state-steps">
          <div class="step"><span class="step-num">1</span> 献立タブで料理を設定</div>
          <div class="step"><span class="step-num">2</span> 上の曜日トグルをオンに</div>
          <div class="step"><span class="step-num">3</span> 自動で食材が集計されます</div>
        </div>
      </div>`;
    return;
  }

  let totalItems = 0;
  let html = `<div class="shopping-progress" id="shopping-progress">
    <span id="shopping-checked-count">0</span>
    <div class="progress-bar-bg"><div class="progress-bar-fill" id="shopping-progress-fill" style="width:0%"></div></div>
    <span id="shopping-total-count">0</span>
  </div>`;
  
  for (const [cat, items] of Object.entries(agg)) {
    html += `<div class="category-block"><h3>${cat}</h3>`;
    for (const [name, amts] of Object.entries(items)) {
      totalItems++;
      const amtStr = amts.length > 0 ? `<span style="color:var(--primary-color); font-size:0.9em; margin-left:0.5rem">${amts.join(' + ')}</span>` : "";
      const uid = `ing-${name.replace(/[^a-zA-Z0-9ぁ-んァ-ヶ亜-熙]/g, '')}`;
      html += `<div class="ingredient-item" id="item-${uid}">
        <input type="checkbox" id="${uid}" onchange="toggleShoppingCheck(this, '${uid}')" />
        <label for="${uid}">${name} ${amtStr}</label>
      </div>`;
    }
    html += `</div>`;
  }
  
  html += `<div style="margin-top:1rem; text-align:right;">
    <button class="btn btn-outline btn-xs" onclick="uncheckAllShopping()"><i class="ph ph-arrow-counter-clockwise"></i> すべてチェック解除</button>
  </div>`;
  
  list.innerHTML = html;
  
  // Update totals
  const totalEl = document.getElementById("shopping-total-count");
  if (totalEl) totalEl.textContent = `${totalItems}品目`;
  const checkedEl = document.getElementById("shopping-checked-count");
  if (checkedEl) checkedEl.textContent = `0 /`;
}

function toggleShoppingCheck(checkbox, uid) {
  const item = document.getElementById(`item-${uid}`);
  if (item) {
    item.classList.toggle('checked', checkbox.checked);
  }
  updateShoppingProgress();
}

function updateShoppingProgress() {
  const all = document.querySelectorAll('.ingredient-item input[type="checkbox"]');
  const checked = document.querySelectorAll('.ingredient-item input[type="checkbox"]:checked');
  const total = all.length;
  const done = checked.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  const fill = document.getElementById("shopping-progress-fill");
  const countEl = document.getElementById("shopping-checked-count");
  if (fill) fill.style.width = pct + '%';
  if (countEl) countEl.textContent = `${done} /`;
}

function uncheckAllShopping() {
  document.querySelectorAll('.ingredient-item input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    const item = cb.closest('.ingredient-item');
    if (item) item.classList.remove('checked');
  });
  updateShoppingProgress();
  showToast('チェックをすべて解除しました', 'info');
}

function handleShoppingChatKey(e) {
  if (e.key === "Enter") sendShoppingChat();
}

function renderShoppingChat() {
  const container = document.getElementById("shopping-chat-messages");
  if (!container) return;
  const intro = `<div class="chat-message ai"><div class="chat-bubble" style="background: var(--primary-light); color: var(--text-main); padding: 0.75rem 1rem; border-radius: 16px; border-bottom-left-radius: 4px; font-size: 0.9rem; max-width: 85%; border: 1px solid rgba(255,107,74,0.2);">献立を作成したら「買い物アドバイス」ボタンを押してね。食材の賢い保存法や節約術を教えるよ！何でも聞いてね！</div></div>`;
  
  let html = intro;
  state.chatHistoryHimari.forEach(msg => {
    if (msg.role === "user") {
      html += `<div class="chat-message user"><div class="chat-bubble">${msg.content}</div></div>`;
    } else {
      const text = msg.content.replace(/\n/g, "<br>");
      html += `<div class="chat-message ai"><div class="chat-bubble" style="background: var(--primary-light); color: var(--text-main); padding: 0.75rem 1rem; border-radius: 16px; border-bottom-left-radius: 4px; font-size: 0.9rem; max-width: 85%; border: 1px solid rgba(255,107,74,0.2);">${text}</div></div>`;
    }
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// 既存のボタンからのアドバイス呼び出しにも対応するため
async function getShoppingAdvice() {
  const items = Array.from(document.querySelectorAll('.ingredient-item label')).map(l => l.innerText);
  if (items.length === 0) return showToast("買い物リストが空です", "info");
  const msg = "この買い物リストに対するアドバイスを教えて！\\n" + items.join(", ");
  await doSendShoppingChat(msg);
}

async function sendShoppingChat() {
  const input = document.getElementById("shopping-chat-input");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  await doSendShoppingChat(msg);
}

async function doSendShoppingChat(msg) {
  const items = Array.from(document.querySelectorAll('.ingredient-item label')).map(l => l.innerText);
  
  state.chatHistoryHimari.push({ role: "user", content: msg });
  localStorage.setItem('shunkondate_chat_himari', JSON.stringify(state.chatHistoryHimari));
  renderShoppingChat();

  const container = document.getElementById("shopping-chat-messages");
  container.innerHTML += `<div class="chat-message ai" id="himari-typing"><div class="chat-bubble" style="background: var(--primary-light);"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
  container.scrollTop = container.scrollHeight;

  try {
    const res = await fetch("/api/chat/himari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.chatHistoryHimari, items })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);

    state.chatHistoryHimari.push({ role: "assistant", content: data.reply });
    localStorage.setItem('shunkondate_chat_himari', JSON.stringify(state.chatHistoryHimari));
  } catch (e) {
    showToast('エラーが発生しました', 'error');
    state.chatHistoryHimari.push({ role: "assistant", content: "ごめんね、エラーが発生しちゃったみたい。もう一度送ってみてね！" });
  }
  renderShoppingChat();
}

async function findSupermarkets() {
  const list = document.getElementById("supermarkets-list");
  list.innerHTML = `<i class="ph ph-spinner ph-spin"></i> GPSを取得中...`;

  if (!navigator.geolocation) {
    list.innerHTML = "ブラウザがGPSをサポートしていません。";
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    list.innerHTML = `<i class="ph ph-spinner ph-spin"></i> 実店舗を検索中...`;
    try {
      const res = await fetch(`/api/supermarkets?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      const data = await res.json();
      if(data.error) throw new Error(data.message);
      if(data.length === 0) {
        list.innerHTML = "2km圏内にスーパーが見つかりませんでした。";
        return;
      }
      state.supermarkets = data;
      list.innerHTML = data.map(s => `
        <div class="dish-card" style="margin-bottom:0.5rem; padding:1rem;">
          <div class="dish-card-body" style="padding:0;">
            <h4 style="margin:0; color:var(--primary-color)"><i class="ph ph-storefront"></i> ${s.name}</h4>
            <p style="margin:0.2rem 0 0 0; font-size:0.85rem; color:var(--text-light)">
              ここから直線約 ${Math.round(s.distance)}m
            </p>
          </div>
        </div>
      `).join("");
    } catch(e) {
      list.innerHTML = `検索に失敗しました: ${e.message}`;
    }
  }, err => {
    list.innerHTML = "位置情報の取得を許可してください。";
  });
}

function copyShoppingList() {
  const text = Array.from(document.querySelectorAll('.category-block')).map(cb => {
    return cb.querySelector('h3').innerText + "\n" + Array.from(cb.querySelectorAll('label')).map(l => "・" + l.innerText).join("\n");
  }).join("\n\n");
  navigator.clipboard.writeText(text).then(() => showToast('買い物リストをコピーしました', 'success'));
}

/* ============ AI Generation (Gemini) ============ */
function openGenerateAiModal() { document.getElementById("ai-modal").style.display = "block"; }
function closeAiModal() { document.getElementById("ai-modal").style.display = "none"; }

async function generateAiMenu() {
  const query = document.getElementById("ai-query").value;
  const btn = document.getElementById("ai-btn");
  const loading = document.getElementById("ai-loading");

  btn.disabled = true;
  loading.classList.remove("hidden");

  try {
    const r = await fetch("/api/generate-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, season: getCurrentSeason().key })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.message);

    state.weekMenu = data.weekMenu;
    await savePlan();
    showToast('AIが1週間分の献立を作成しました！', 'success');
    closeAiModal();
    renderWeek();
    showTab("week");
  } catch (e) {
    showToast("エラー: " + e.message, 'error');
  } finally {
    btn.disabled = false;
    loading.classList.add("hidden");
  }
}

function openGenerateRecipeModal() { document.getElementById("ai-recipe-modal").style.display = "block"; }

function handleTakumiChatKey(e) {
  if (e.key === "Enter") sendTakumiChat();
}

function renderTakumiChat() {
  const container = document.getElementById("takumi-chat-messages");
  if (!container) return;
  const intro = `<div class="chat-message ai"><div class="chat-bubble takumi-bubble" style="background: #FEF3C7; color: var(--text-main); padding: 0.75rem 1rem; border-radius: 16px; border-bottom-left-radius: 4px; font-size: 0.9rem; max-width: 85%; border: 1px solid rgba(251, 191, 36, 0.3);">こんにちは！冷蔵庫の余り物や、今食べたい気分の食材を教えてね。僕が新しいオリジナルレシピを考案するよ！</div></div>`;
  
  let html = intro;
  state.chatHistoryTakumi.forEach((msg, idx) => {
    if (msg.role === "user") {
      html += `<div class="chat-message user"><div class="chat-bubble" style="background:#D97706;">${msg.content}</div></div>`;
    } else {
      let contentHtml = msg.content;
      // Recipe JSONブロックが存在するか判定
      if (msg.recipeObj) {
        contentHtml += `
          <div class="chat-recipe-card">
            <h4>${msg.recipeObj.name}</h4>
            <div class="recipe-meta">
              <span><i class="ph ph-fire"></i> ${msg.recipeObj.kcal}kcal</span>
              <span><i class="ph ph-clock"></i> ${msg.recipeObj.prepTime}分</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="saveTakumiRecipe(${idx})" style="width:100%; justify-content:center; margin-top:0.5rem; background:linear-gradient(135deg, #F59E0B, #D97706);"><i class="ph ph-book-bookmark"></i> カタログに保存</button>
          </div>
        `;
      }
      contentHtml = contentHtml.replace(/\n/g, "<br>");
      html += `<div class="chat-message ai"><div class="chat-bubble takumi-bubble" style="background: #FEF3C7; color: var(--text-main); padding: 0.75rem 1rem; border-radius: 16px; border-bottom-left-radius: 4px; font-size: 0.9rem; max-width: 85%; border: 1px solid rgba(251, 191, 36, 0.3);">${contentHtml}</div></div>`;
    }
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

async function sendTakumiChat() {
  const input = document.getElementById("ai-recipe-query");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  
  state.chatHistoryTakumi.push({ role: "user", content: msg });
  localStorage.setItem('shunkondate_chat_takumi', JSON.stringify(state.chatHistoryTakumi));
  renderTakumiChat();

  const container = document.getElementById("takumi-chat-messages");
  container.innerHTML += `<div class="chat-message ai" id="takumi-typing"><div class="chat-bubble takumi-bubble" style="background: #FEF3C7;"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
  container.scrollTop = container.scrollHeight;

  try {
    const res = await fetch("/api/chat/takumi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.chatHistoryTakumi })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);

    // テキスト部分とレシピJSONを分離して保存する
    state.chatHistoryTakumi.push({ role: "assistant", content: data.replyText, recipeObj: data.recipeObj });
    localStorage.setItem('shunkondate_chat_takumi', JSON.stringify(state.chatHistoryTakumi));
  } catch (e) {
    showToast('エラーが発生しました', 'error');
    state.chatHistoryTakumi.push({ role: "assistant", content: "ごめんね、うまくレシピを考えられなかったよ。もう一度試してみて！" });
  }
  renderTakumiChat();
}

async function saveTakumiRecipe(msgIdx) {
  const msg = state.chatHistoryTakumi[msgIdx];
  if (!msg || !msg.recipeObj) return;
  try {
    const saveRes = await fetch("/api/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.recipeObj)
    });
    if (!saveRes.ok) throw new Error("レシピの保存に失敗しました");

    await fetchDishes();
    showToast(`新レシピ「${msg.recipeObj.name}」を登録しました！`, 'success');
    msg.content += "\\n\\n**(このレシピはカタログに保存されました)**";
    msg.recipeObj = null; // ボタンを消す
    localStorage.setItem('shunkondate_chat_takumi', JSON.stringify(state.chatHistoryTakumi));
    renderTakumiChat();
    renderCatalog();
  } catch(e) {
    showToast("エラー: " + e.message, 'error');
  }
}

/* ============ Template Management ============ */
function openTemplateModal() {
  document.getElementById("template-modal").style.display = "block";
  renderTemplateList();
}

function closeTemplateModal() {
  document.getElementById("template-modal").style.display = "none";
}

function saveTemplate() {
  const nameInput = document.getElementById("template-name");
  const name = nameInput.value.trim();
  if (!name) {
    showToast('テンプレート名を入力してください', 'error');
    return;
  }
  
  // Count filled slots
  let filled = 0;
  state.weekMenu.forEach(day => {
    mealTypes.forEach(mt => { if (day[mt.key]) filled++; });
  });
  
  if (filled === 0) {
    showToast('献立が空です。先に献立を設定してください。', 'error');
    return;
  }

  const template = {
    id: Date.now(),
    name: name,
    createdAt: new Date().toLocaleDateString('ja-JP'),
    filledSlots: filled,
    weekMenu: JSON.parse(JSON.stringify(state.weekMenu))
  };
  
  state.templates.push(template);
  localStorage.setItem('shunkondate_templates', JSON.stringify(state.templates));
  nameInput.value = '';
  renderTemplateList();
  showToast(`テンプレート「${name}」を保存しました`, 'success');
}

function renderTemplateList() {
  const el = document.getElementById("template-list");
  if (!el) return;
  
  if (state.templates.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem;"><p>保存済みのテンプレートはありません。</p></div>`;
    return;
  }

  el.innerHTML = state.templates.map(t => `
    <div class="template-item">
      <div class="template-item-info">
        <h4>${t.name}</h4>
        <span>${t.createdAt} · ${t.filledSlots}/21食</span>
      </div>
      <div class="template-item-actions">
        <button class="btn btn-primary btn-sm" onclick="loadTemplate(${t.id})">
          <i class="ph ph-arrow-clockwise"></i> 復元
        </button>
        <button class="btn btn-outline btn-sm" style="color:#E53E3E; border-color:rgba(229,62,62,0.3)" onclick="deleteTemplate(${t.id})">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </div>
  `).join("");
}

async function loadTemplate(id) {
  const t = state.templates.find(x => x.id === id);
  if (!t) return;
  
  const confirmed = await showConfirm('テンプレートを復元', `「${t.name}」で現在の献立を上書きしますか？`);
  if (!confirmed) return;
  
  state.weekMenu = JSON.parse(JSON.stringify(t.weekMenu));
  await savePlan();
  renderWeek();
  renderToday();
  closeTemplateModal();
  showToast(`テンプレート「${t.name}」を復元しました`, 'success');
}

async function deleteTemplate(id) {
  const confirmed = await showConfirm('テンプレートを削除', 'このテンプレートを削除しますか？');
  if (!confirmed) return;
  state.templates = state.templates.filter(x => x.id !== id);
  localStorage.setItem('shunkondate_templates', JSON.stringify(state.templates));
  renderTemplateList();
  showToast('テンプレートを削除しました', 'info');
}

/* ============================================================
/* ============================================================
   AIテキストインポート
   ============================================================ */
function openImportTextModal() {
  document.getElementById("import-text-input").value = "";
  document.getElementById("import-text-modal").style.display = "block";
}
function closeImportTextModal() {
  document.getElementById("import-text-modal").style.display = "none";
}
async function importRecipeFromText() {
  const text = document.getElementById("import-text-input").value.trim();
  if (!text) return alert("テキストを貼り付けてください。");

  const btn = document.getElementById("btn-import-text");
  btn.disabled = true;
  btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> 解析中...`;

  try {
    const res = await fetch("/api/dishes/import-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "インポートに失敗しました");

    showToast("テキストからレシピをインポートしました！", "success");
    closeImportTextModal();
    fetchDishes();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="ph ph-magic-wand"></i> AIで抽出する`;
  }
}

/* ============ Manual Dish Registration ============ */
function openDishModal() {
  document.getElementById("dish-form").reset();
  document.getElementById("dish-id").value = "";
  document.getElementById("dish-modal-title").innerText = "料理を登録";
  document.getElementById("dish-modal").style.display = "block";
}
function closeDishModal() { document.getElementById("dish-modal").style.display = "none"; }

function editDish(id) {
  const d = state.dishes.find(x => x.id === id);
  if (!d) return;
  document.getElementById("dish-id").value = d.id;
  document.getElementById("dish-name").value = d.name;
  document.getElementById("dish-main-protein").value = d.mainProtein;
  document.getElementById("dish-prep-time").value = d.prepTime;
  document.getElementById("dish-kcal").value = d.kcal;
  document.getElementById("dish-cost").value = d.cost;
  document.getElementById("dish-protein").value = d.protein;
  document.getElementById("dish-fat").value = d.fat;
  document.getElementById("dish-carbs").value = d.carbs;
  document.getElementById("dish-ingredients").value = (d.ingredients || []).join(", ");
  document.getElementById("dish-steps").value = (d.steps || []).join(", ");
  
  document.querySelectorAll('input[name="dish-season"]').forEach(cb => cb.checked = (d.season || []).includes(cb.value));
  document.querySelectorAll('input[name="dish-mealtype"]').forEach(cb => cb.checked = (d.mealType || []).includes(cb.value));

  document.getElementById("dish-modal-title").innerText = "料理を編集";
  document.getElementById("dish-modal").style.display = "block";
}

async function saveDish(e) {
  e.preventDefault();
  const id = document.getElementById("dish-id").value;
  const body = {
    name: document.getElementById("dish-name").value,
    mainProtein: document.getElementById("dish-main-protein").value,
    prepTime: Number(document.getElementById("dish-prep-time").value),
    kcal: Number(document.getElementById("dish-kcal").value),
    cost: Number(document.getElementById("dish-cost").value),
    protein: Number(document.getElementById("dish-protein").value),
    fat: Number(document.getElementById("dish-fat").value),
    carbs: Number(document.getElementById("dish-carbs").value),
    ingredients: document.getElementById("dish-ingredients").value.split(",").map(x=>x.trim()).filter(Boolean),
    steps: document.getElementById("dish-steps").value.split(",").map(x=>x.trim()).filter(Boolean),
    season: Array.from(document.querySelectorAll('input[name="dish-season"]:checked')).map(cb => cb.value),
    mealType: Array.from(document.querySelectorAll('input[name="dish-mealtype"]:checked')).map(cb => cb.value)
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `/api/dishes/${id}` : "/api/dishes";
  
  try {
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    closeDishModal();
    await fetchDishes();
    syncPlanWithDishes();
    renderCatalog();
    if (document.getElementById('tab-month').classList.contains('active')) renderMonth();
    if (document.getElementById('tab-week').classList.contains('active')) renderWeek();
    if (document.getElementById('tab-today').classList.contains('active')) renderToday();
    showToast(id ? '料理を更新しました' : '新しい料理を登録しました', 'success');
  } catch(e) {
    showToast('保存に失敗しました', 'error');
  }
}

/* ============ Modal Click-outside Close ============ */
window.onclick = function(event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
    if (event.target.id === "ai-recipe-modal") closeAiRecipeModal();
    if (event.target.id === "quick-swap-modal") closeQuickSwapModal();
  }
};

/* ============ Deals & Flyers (特売・チラシ) ============ */
let currentDeals = [];

async function fetchDeals() {
  const list = document.getElementById("deals-list");
  if (!list) return;
  list.innerHTML = `<div class="character-typing-loader"><span></span><span></span><span></span></div>`;
  list.style.flexDirection = "row"; // reset just in case
  
  try {
    const url = "/api/deals/belc";
    const res = await fetch(url);
    const data = await res.json();
    
    let flyers = [];
    if (Array.isArray(data)) {
      currentDeals = data;
    } else {
      flyers = data.flyers || [];
      currentDeals = data.items || [];
    }
    
    if (currentDeals.length === 0) {
      list.innerHTML = `<div style="color:var(--text-light); font-size:0.85rem;">今日の特売情報はありません。</div>`;
      return;
    }
    
    if (flyers.length > 0) {
      list.style.flexDirection = "column";
      list.innerHTML = flyers.map(f => {
        const fItems = currentDeals.filter(d => d.flyer_id === f.id);
        if (fItems.length === 0) return "";
        return `
          <div style="background:var(--card-bg); border-radius:12px; padding:1rem; border:1px solid var(--border-color); margin-bottom: 0.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
              <h4 style="margin:0; font-size:1.1rem; color:var(--primary-color);"><i class="ph ph-newspaper"></i> ${f.title}</h4>
              <button class="btn btn-outline btn-sm" onclick="openFlyerImageModal('${f.image}')" style="border-radius:20px; font-size:0.8rem; padding:0.2rem 0.6rem;">
                <i class="ph ph-magnifying-glass-plus"></i> チラシ画像を見る
              </button>
            </div>
            <div style="display:flex; gap:0.6rem; overflow-x:auto; padding-bottom:0.5rem;">
              ${fItems.map(deal => `
                <div style="background:var(--bg-color); padding:0.6rem 0.8rem; border-radius:12px; min-width:140px; max-width:160px; display:flex; flex-direction:column; gap:0.3rem; border:1px solid rgba(255,107,74,0.1); box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                  ${deal.image ? `<img src="${deal.image}" alt="${deal.name}" style="width:100%; height:80px; border-radius:8px; object-fit:contain; background:#fff; margin-bottom:0.2rem;">` : `<div style="font-size:1.2rem;">${deal.icon}</div>`}
                  <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${deal.name}</div>
                  ${deal.price ? `<div style="color:var(--danger-color); font-weight:700; margin-top:auto;">${deal.price}円</div>` : `<div style="color:var(--danger-color); font-weight:700; margin-top:auto;">特売！</div>`}
                  <div style="font-size:0.7rem; color:var(--text-light);"><i class="ph ph-storefront"></i> ${deal.store}</div>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }).join("");
    } else {
      list.style.flexDirection = "row";
      list.innerHTML = currentDeals.map(deal => `
        <div style="background:var(--card-bg); padding:0.6rem 0.8rem; border-radius:12px; min-width:140px; max-width:160px; display:flex; flex-direction:column; gap:0.3rem; border:1px solid rgba(255,107,74,0.2); box-shadow:0 2px 4px rgba(0,0,0,0.05); position: relative;">
          ${deal.flyerTitle ? `<div style="position:absolute; top:-6px; right:-6px; background:var(--primary-color); color:white; font-size:0.7rem; padding:0.1rem 0.4rem; border-radius:12px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">${deal.flyerTitle}</div>` : ''}
          ${deal.image ? `<img src="${deal.image}" alt="${deal.name}" style="width:100%; height:80px; border-radius:8px; object-fit:contain; background:#fff; margin-bottom:0.2rem;">` : `<div style="font-size:1.2rem;">${deal.icon}</div>`}
          <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${deal.name}</div>
          ${deal.price ? `<div style="color:var(--danger-color); font-weight:700; margin-top:auto;">${deal.price}円</div>` : `<div style="color:var(--danger-color); font-weight:700; margin-top:auto;">特売！</div>`}
          <div style="font-size:0.7rem; color:var(--text-light);"><i class="ph ph-storefront"></i> ${deal.store}</div>
        </div>
      `).join("");
    }
  } catch(e) {
    list.innerHTML = `<div style="color:var(--danger-color); font-size:0.85rem;">取得に失敗しました。</div>`;
  }
}

function openDealsAiMenuModal() {
  if (currentDeals.length === 0) {
    showToast('特売情報がありません。先に「更新」ボタンを押してください。', 'error');
    return;
  }
  
  // AIが混乱しないよう、特売品の中からランダムに5〜6個程度を抽出する
  const shuffled = [...currentDeals].sort(() => 0.5 - Math.random());
  const selectedDeals = shuffled.slice(0, 5);
  const dealItems = selectedDeals.map(d => d.name).join('、');
  
  // 献立タブに切り替えてAIモーダルを開き、クエリを自動入力
  showTab("week");
  const modal = document.getElementById("ai-modal");
  const queryInput = document.getElementById("ai-query");
  if (modal && queryInput) {
    modal.style.display = "block";
    queryInput.value = `今日の特売品（${dealItems}）をたっぷり使った節約献立`;
  }
}

// チラシ画像拡大モーダル
function openFlyerImageModal(url) {
  console.log("Opening flyer URL:", url);
  const modal = document.getElementById("flyer-image-modal");
  const img = document.getElementById("flyer-image-modal-img");
  
  if (!modal) {
    alert("モーダルの要素が見つかりません。スーパーリロード(Ctrl+F5)をお試しください。");
    return;
  }
  
  if (img) {
    img.src = url;
  }
  modal.style.display = "flex";
}

function closeFlyerImageModal() {
  const modal = document.getElementById("flyer-image-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

/* ============ Init ============ */
(async () => {
  initTheme();
  syncShoppingUI();
  await fetchDishes();
  await fetchPlan();
  syncPlanWithDishes();
  renderShoppingChat();
  renderTakumiChat();
  showTab("today");
})();

/* ============ Global Modal Observer ============ */
const observer = new MutationObserver((mutations) => {
  let isAnyModalOpen = false;
  document.querySelectorAll('.modal').forEach(m => {
    if (m.style.display === 'block' || m.style.display === 'flex') isAnyModalOpen = true;
  });
  if (isAnyModalOpen) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
});
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal').forEach(m => {
    observer.observe(m, { attributes: true, attributeFilter: ['style'] });
  });
});
