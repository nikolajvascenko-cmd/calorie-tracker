const STORAGE_KEY = "calorieTrack.v1";
const todayKey = () => new Date().toISOString().slice(0, 10);
const currencyFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const defaultState = {
  settings: {
    age: "",
    sex: "male",
    height: "",
    weightUnit: "kg",
    activity: "1.55",
    goal: "maintain",
    customTarget: ""
  },
  entries: [],
  savedFoods: [
    { id: crypto.randomUUID(), name: "4 eggs", calories: 280, protein: 24, carbs: 2, fat: 20, meal: "Breakfast" },
    { id: crypto.randomUUID(), name: "250g beef steak", calories: 625, protein: 65, carbs: 0, fat: 38, meal: "Dinner" },
    { id: crypto.randomUUID(), name: "200g cooked rice", calories: 260, protein: 5, carbs: 56, fat: 1, meal: "Lunch" },
    { id: crypto.randomUUID(), name: "Coffee with milk", calories: 60, protein: 3, carbs: 5, fat: 3, meal: "Snack" }
  ],
  weights: []
};

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      settings: { ...defaultState.settings, ...(saved.settings || {}) },
      entries: saved.entries || [],
      savedFoods: saved.savedFoods || defaultState.savedFoods,
      weights: saved.weights || []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function kgFromStoredWeight(weight) {
  if (!weight) return 0;
  return state.settings.weightUnit === "lb" ? weight * 0.45359237 : weight;
}

function latestWeightEntry() {
  return [...state.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
}

function calculateBmr() {
  const latest = latestWeightEntry();
  const weightKg = kgFromStoredWeight(numberValue(latest?.weight));
  const height = numberValue(state.settings.height);
  const age = numberValue(state.settings.age);
  if (!weightKg || !height || !age) return 0;
  const base = 10 * weightKg + 6.25 * height - 5 * age;
  return Math.round(state.settings.sex === "female" ? base - 161 : base + 5);
}

function calculateTdee() {
  return Math.round(calculateBmr() * numberValue(state.settings.activity));
}

function calculateTarget() {
  const tdee = calculateTdee();
  if (state.settings.goal === "custom") return Math.round(numberValue(state.settings.customTarget));
  const adjustments = { maintain: 0, cut250: -250, cut500: -500, bulk250: 250, bulk500: 500 };
  return Math.max(0, tdee + (adjustments[state.settings.goal] || 0));
}

function entriesForToday() {
  const key = todayKey();
  return state.entries.filter(entry => entry.date === key);
}

function summarizeEntries(entries) {
  return entries.reduce((sum, entry) => {
    sum.calories += numberValue(entry.calories);
    sum.protein += numberValue(entry.protein);
    sum.carbs += numberValue(entry.carbs);
    sum.fat += numberValue(entry.fat);
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function renderToday() {
  const todayEntries = entriesForToday();
  const totals = summarizeEntries(todayEntries);
  const target = calculateTarget();
  const remaining = target - totals.calories;
  const percent = target ? Math.min(150, Math.round((totals.calories / target) * 100)) : 0;
  const dashLength = 326.73;
  const dashOffset = dashLength - Math.min(percent, 100) / 100 * dashLength;

  document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("todayCalories").textContent = currencyFormatter.format(totals.calories);
  document.getElementById("targetCalories").textContent = currencyFormatter.format(target);
  document.getElementById("remainingCalories").textContent = `${remaining >= 0 ? "" : "+"}${currencyFormatter.format(Math.abs(remaining))} kcal ${remaining >= 0 ? "left" : "over"}`;
  document.getElementById("todayProtein").textContent = decimalFormatter.format(totals.protein);
  document.getElementById("todayCarbs").textContent = decimalFormatter.format(totals.carbs);
  document.getElementById("todayFat").textContent = decimalFormatter.format(totals.fat);
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressCircle").style.strokeDashoffset = dashOffset;

  const list = document.getElementById("todayEntries");
  if (!todayEntries.length) {
    list.className = "entry-list empty-state";
    list.textContent = "No food added yet.";
    return;
  }
  list.className = "entry-list";
  list.innerHTML = "";
  todayEntries
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(entry => {
      const item = document.createElement("div");
      item.className = "entry-item";
      item.innerHTML = `
        <div class="entry-main">
          <div class="entry-title"></div>
          <div class="entry-meta"></div>
        </div>
        <div class="entry-actions">
          <div class="entry-calories"></div>
          <button class="delete-button" aria-label="Delete food">×</button>
        </div>`;
      item.querySelector(".entry-title").textContent = entry.name;
      item.querySelector(".entry-meta").textContent = `${entry.meal} • P ${decimalFormatter.format(entry.protein)}g • C ${decimalFormatter.format(entry.carbs)}g • F ${decimalFormatter.format(entry.fat)}g`;
      item.querySelector(".entry-calories").textContent = `${currencyFormatter.format(entry.calories)} kcal`;
      item.querySelector("button").addEventListener("click", () => {
        state.entries = state.entries.filter(e => e.id !== entry.id);
        saveState();
        renderAll();
        showToast("Food removed");
      });
      list.appendChild(item);
    });
}

function renderSavedFoods() {
  const list = document.getElementById("savedFoods");
  if (!state.savedFoods.length) {
    list.className = "entry-list empty-state";
    list.textContent = "No saved foods yet.";
    return;
  }
  list.className = "entry-list";
  list.innerHTML = "";
  state.savedFoods.forEach(food => {
    const item = document.createElement("div");
    item.className = "entry-item";
    item.innerHTML = `
      <div class="entry-main">
        <div class="entry-title"></div>
        <div class="entry-meta"></div>
      </div>
      <div class="entry-actions">
        <div class="entry-calories"></div>
        <button class="delete-button" aria-label="Delete saved food">×</button>
      </div>`;
    item.querySelector(".entry-title").textContent = food.name;
    item.querySelector(".entry-meta").textContent = `${food.meal} • P ${decimalFormatter.format(food.protein)}g • C ${decimalFormatter.format(food.carbs)}g • F ${decimalFormatter.format(food.fat)}g`;
    item.querySelector(".entry-calories").textContent = `${currencyFormatter.format(food.calories)} kcal`;
    item.addEventListener("click", (event) => {
      if (event.target.tagName === "BUTTON") return;
      addFoodEntry(food);
      showToast(`${food.name} added`);
    });
    item.querySelector("button").addEventListener("click", () => {
      state.savedFoods = state.savedFoods.filter(f => f.id !== food.id);
      saveState();
      renderAll();
      showToast("Saved food removed");
    });
    list.appendChild(item);
  });
}

function renderWeight() {
  const latest = latestWeightEntry();
  const bmr = calculateBmr();
  const tdee = calculateTdee();
  const target = calculateTarget();
  document.getElementById("latestWeight").textContent = latest ? decimalFormatter.format(latest.weight) : "—";
  document.getElementById("weightUnitHero").textContent = ` ${state.settings.weightUnit}`;
  document.getElementById("bmrValue").textContent = currencyFormatter.format(bmr);
  document.getElementById("tdeeValue").textContent = currencyFormatter.format(tdee);
  document.getElementById("goalTargetWeight").textContent = currencyFormatter.format(target);
  document.getElementById("weightTrend").textContent = calculateWeightTrend();

  const list = document.getElementById("weightEntries");
  if (!state.weights.length) {
    list.className = "entry-list empty-state";
    list.textContent = "No weight entries yet.";
    return;
  }
  list.className = "entry-list";
  list.innerHTML = "";
  [...state.weights].sort((a, b) => b.date.localeCompare(a.date)).forEach(entry => {
    const item = document.createElement("div");
    item.className = "entry-item";
    item.innerHTML = `
      <div class="entry-main">
        <div class="entry-title"></div>
        <div class="entry-meta"></div>
      </div>
      <div class="entry-actions">
        <button class="delete-button" aria-label="Delete weight">×</button>
      </div>`;
    item.querySelector(".entry-title").textContent = `${decimalFormatter.format(entry.weight)} ${state.settings.weightUnit}`;
    item.querySelector(".entry-meta").textContent = new Date(entry.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    item.querySelector("button").addEventListener("click", () => {
      state.weights = state.weights.filter(w => w.id !== entry.id);
      saveState();
      renderAll();
      showToast("Weight removed");
    });
    list.appendChild(item);
  });
}

function calculateWeightTrend() {
  if (state.weights.length < 2) return "—";
  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date + "T00:00:00");
  const weekAgo = new Date(latestDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  let baseline = sorted[0];
  for (const entry of sorted) {
    if (new Date(entry.date + "T00:00:00") <= weekAgo) baseline = entry;
  }
  const diff = numberValue(latest.weight) - numberValue(baseline.weight);
  const sign = diff > 0 ? "+" : "";
  return `${sign}${decimalFormatter.format(diff)} ${state.settings.weightUnit}`;
}

function renderSettings() {
  for (const [key, value] of Object.entries(state.settings)) {
    const input = document.getElementById(key);
    if (input) input.value = value;
  }
  document.getElementById("customTargetWrap").style.display = state.settings.goal === "custom" ? "grid" : "none";
}

function renderAll() {
  renderToday();
  renderSavedFoods();
  renderWeight();
  renderSettings();
}

function addFoodEntry(food) {
  state.entries.push({
    id: crypto.randomUUID(),
    date: todayKey(),
    createdAt: new Date().toISOString(),
    name: food.name,
    calories: numberValue(food.calories),
    protein: numberValue(food.protein),
    carbs: numberValue(food.carbs),
    fat: numberValue(food.fat),
    meal: food.meal || "Snack"
  });
  saveState();
  renderAll();
}

function addSavedFood(food) {
  const duplicate = state.savedFoods.some(saved => saved.name.trim().toLowerCase() === food.name.trim().toLowerCase());
  if (!duplicate) state.savedFoods.push({ id: crypto.randomUUID(), ...food });
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
      document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`screen-${button.dataset.screen}`).classList.add("active");
    });
  });
}

function setupModals() {
  document.querySelectorAll("[data-open-modal]").forEach(button => {
    button.addEventListener("click", () => document.getElementById(button.dataset.openModal).showModal());
  });
  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => document.getElementById(button.dataset.closeModal).close());
  });
}

function setupForms() {
  document.getElementById("foodForm").addEventListener("submit", event => {
    event.preventDefault();
    const food = {
      name: document.getElementById("foodName").value.trim(),
      calories: numberValue(document.getElementById("foodCalories").value),
      protein: numberValue(document.getElementById("foodProtein").value),
      carbs: numberValue(document.getElementById("foodCarbs").value),
      fat: numberValue(document.getElementById("foodFat").value),
      meal: document.getElementById("mealType").value
    };
    if (!food.name) return;
    addFoodEntry(food);
    if (document.getElementById("saveFoodToo").checked) addSavedFood(food);
    saveState();
    event.target.reset();
    document.getElementById("foodProtein").value = 0;
    document.getElementById("foodCarbs").value = 0;
    document.getElementById("foodFat").value = 0;
    document.getElementById("foodModal").close();
    renderAll();
    showToast("Food added");
  });

  document.getElementById("savedFoodForm").addEventListener("submit", event => {
    event.preventDefault();
    const food = {
      name: document.getElementById("savedFoodName").value.trim(),
      calories: numberValue(document.getElementById("savedFoodCalories").value),
      protein: numberValue(document.getElementById("savedFoodProtein").value),
      carbs: numberValue(document.getElementById("savedFoodCarbs").value),
      fat: numberValue(document.getElementById("savedFoodFat").value),
      meal: document.getElementById("savedFoodMeal").value
    };
    if (!food.name) return;
    addSavedFood(food);
    saveState();
    event.target.reset();
    document.getElementById("savedFoodProtein").value = 0;
    document.getElementById("savedFoodCarbs").value = 0;
    document.getElementById("savedFoodFat").value = 0;
    document.getElementById("savedFoodModal").close();
    renderAll();
    showToast("Saved food added");
  });

  document.getElementById("weightForm").addEventListener("submit", event => {
    event.preventDefault();
    const weight = numberValue(document.getElementById("weightValue").value);
    const date = document.getElementById("weightDate").value || todayKey();
    if (!weight) return;
    const existing = state.weights.find(entry => entry.date === date);
    if (existing) existing.weight = weight;
    else state.weights.push({ id: crypto.randomUUID(), weight, date });
    saveState();
    event.target.reset();
    document.getElementById("weightDate").value = todayKey();
    document.getElementById("weightModal").close();
    renderAll();
    showToast("Weight saved");
  });

  document.getElementById("settingsForm").addEventListener("submit", event => {
    event.preventDefault();
    state.settings = {
      age: document.getElementById("age").value,
      sex: document.getElementById("sex").value,
      height: document.getElementById("height").value,
      weightUnit: document.getElementById("weightUnit").value,
      activity: document.getElementById("activity").value,
      goal: document.getElementById("goal").value,
      customTarget: document.getElementById("customTarget").value
    };
    saveState();
    renderAll();
    showToast("Settings saved");
  });

  document.getElementById("goal").addEventListener("change", event => {
    document.getElementById("customTargetWrap").style.display = event.target.value === "custom" ? "grid" : "none";
  });
}

function setupDataTools() {
  document.getElementById("backupButton").addEventListener("click", exportBackup);
  document.getElementById("importButton").addEventListener("click", () => document.getElementById("importInput").click());
  document.getElementById("importInput").addEventListener("change", importBackup);

  document.getElementById("resetButton").addEventListener("click", () => {
    if (!confirm("Reset all app data?")) return;
    state = structuredClone(defaultState);
    saveState();
    renderAll();
    showToast("Data reset");
  });

  document.getElementById("clearTodayButton").addEventListener("click", () => {
    if (!entriesForToday().length || !confirm("Clear today's food entries?")) return;
    const key = todayKey();
    state.entries = state.entries.filter(entry => entry.date !== key);
    saveState();
    renderAll();
    showToast("Today cleared");
  });

  document.getElementById("clearWeightsButton").addEventListener("click", () => {
    if (!state.weights.length || !confirm("Clear all weight entries?")) return;
    state.weights = [];
    saveState();
    renderAll();
    showToast("Weights cleared");
  });
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `calorie-track-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Backup exported");
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== "object") throw new Error("Invalid backup");
      state = {
        ...structuredClone(defaultState),
        ...imported,
        settings: { ...defaultState.settings, ...(imported.settings || {}) },
        entries: imported.entries || [],
        savedFoods: imported.savedFoods || [],
        weights: imported.weights || []
      };
      saveState();
      renderAll();
      showToast("Backup imported");
    } catch {
      alert("This backup file could not be imported.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function setDefaults() {
  document.getElementById("weightDate").value = todayKey();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

setupNavigation();
setupModals();
setupForms();
setupDataTools();
setDefaults();
renderAll();
