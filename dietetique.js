import { auth, db } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let fastingInterval = null;
let abstinenceInterval = null;
let weightChart = null;
let eventsInitialized = false;

const DEFAULT_FASTING = { isActive: false, startTime: null, targetHours: 16, history: [] };
const FASTING_STAGES = [
  { label: "Digestion", min: 0, max: 4 },
  { label: "Stabilisation glycémie", min: 4, max: 8 },
  { label: "Utilisation des graisses", min: 8, max: 12 },
  { label: "Augmentation cétones", min: 12, max: 16 },
  { label: "Autophagie possible", min: 16, max: 24 }
];
const DEFAULT_ABSTINENCE = {
  chocolat: { label: "Chocolat", since: null },
  vin: { label: "Vin", since: null },
  sucre: { label: "Sucre", since: null },
  biere: { label: "Bière", since: null }
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  if (currentUser) {
    await loadDietFromCloud();
  }
  initPage();
});

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getFastingState() {
  return JSON.parse(localStorage.getItem("dietFastingState") || "null") || { ...DEFAULT_FASTING };
}

function getWeightEntries() {
  return JSON.parse(localStorage.getItem("dietWeightEntries") || "[]");
}

function getHydrationState() {
  return JSON.parse(localStorage.getItem("dietHydrationState") || "null") || {
    date: getTodayKey(),
    count: 0,
    target: 8,
    glassSize: 250,
    history: {}
  };
}

function getAbstinenceState() {
  const raw = JSON.parse(localStorage.getItem("dietAbstinenceState") || "null") || {};
  return Object.entries(DEFAULT_ABSTINENCE).reduce((acc, [key, defaults]) => {
    acc[key] = {
      label: raw[key]?.label || defaults.label,
      since: raw[key]?.since || null
    };
    return acc;
  }, {});
}

async function loadDietFromCloud() {
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.dietFastingState) localStorage.setItem("dietFastingState", JSON.stringify(data.dietFastingState));
    if (Array.isArray(data.dietWeightEntries)) localStorage.setItem("dietWeightEntries", JSON.stringify(data.dietWeightEntries));
    if (data.dietHydrationState) localStorage.setItem("dietHydrationState", JSON.stringify(data.dietHydrationState));
    if (data.dietAbstinenceState) localStorage.setItem("dietAbstinenceState", JSON.stringify(data.dietAbstinenceState));
  } catch (error) {
    console.error("Erreur chargement diététique cloud :", error);
  }
}

async function saveDietField(field, value) {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { [field]: value });
  } catch (error) {
    console.error("Erreur sauvegarde diététique cloud :", error);
  }
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function getFastingPhase(hours) {
  return FASTING_STAGES.find((stage) => hours >= stage.min && hours < stage.max)?.label || "Autophagie possible";
}

function getCurrentFastingHours() {
  const state = getFastingState();
  if (!state.isActive || !state.startTime) return 0;
  return Math.max(0, (Date.now() - state.startTime) / 3600000);
}

function getFastingStageIndex(hours) {
  const found = FASTING_STAGES.findIndex((stage) => hours >= stage.min && hours < stage.max);
  return found === -1 ? FASTING_STAGES.length - 1 : found;
}

function buildFastingWheelGradient(activeIndex) {
  const step = 100 / FASTING_STAGES.length;
  const segments = FASTING_STAGES.map((_, index) => {
    const from = (index * step).toFixed(2);
    const to = ((index + 1) * step).toFixed(2);
    const color = index === activeIndex ? "#2ecc71" : "#c7d7e8";
    return `${color} ${from}% ${to}%`;
  });
  return `conic-gradient(${segments.join(",")})`;
}

function refreshFastingWheelUI() {
  const hours = getCurrentFastingHours();
  const stageIndex = getFastingStageIndex(hours);
  const stage = FASTING_STAGES[stageIndex];
  const wheel = document.getElementById("fasting-wheel");
  const hoursLabel = document.getElementById("fasting-wheel-hours");
  const phaseLabel = document.getElementById("fasting-wheel-phase");
  const stageList = document.getElementById("fasting-stage-list");
  if (!wheel || !hoursLabel || !phaseLabel || !stageList) return;

  wheel.style.background = buildFastingWheelGradient(stageIndex);
  hoursLabel.textContent = `${hours.toFixed(1)}h`;
  phaseLabel.textContent = stage.label;
  stageList.innerHTML = FASTING_STAGES.map((item, index) => `
    <li class="${index === stageIndex ? "active" : ""}">
      <span>${item.label}</span>
      <small>${item.min}h-${item.max}h</small>
    </li>
  `).join("");
}

function refreshFastingUI() {
  const state = getFastingState();
  const status = document.getElementById("fasting-status");
  const time = document.getElementById("fasting-time");
  const goal = document.getElementById("fasting-goal");
  const phase = document.getElementById("fasting-phase");
  const progress = document.getElementById("fasting-progress");
  const targetMs = (state.targetHours || 16) * 3600000;

  if (!state.isActive || !state.startTime) {
    status.textContent = "Aucun jeûne en cours";
    time.textContent = "00h 00m 00s";
    goal.textContent = `Objectif : ${state.targetHours || 16}h`;
    phase.textContent = "Phase : digestion";
    progress.style.width = "0%";
    progress.style.backgroundColor = "#007ACC";
    refreshFastingWheelUI();
    return;
  }

  const elapsed = Date.now() - state.startTime;
  const hours = elapsed / 3600000;
  const percent = Math.min(100, Math.round((elapsed / targetMs) * 100));

  status.textContent = percent >= 100 ? "🔥 Objectif atteint !" : "Jeûne en cours";
  time.textContent = formatDuration(elapsed);
  goal.textContent = `Objectif : ${state.targetHours || 16}h • Progression ${percent}%`;
  phase.textContent = `Phase : ${getFastingPhase(hours)}`;
  progress.style.width = `${percent}%`;
  progress.style.backgroundColor = percent >= 100 ? "#2ecc71" : "#007ACC";
  refreshFastingWheelUI();
}

function refreshAbstinenceUI() {
  const wrapper = document.getElementById("abstinence-list");
  if (!wrapper) return;
  const state = getAbstinenceState();
  wrapper.innerHTML = Object.entries(state).map(([key, item]) => {
    const elapsed = item.since ? formatDuration(Date.now() - item.since) : "Pas de suivi démarré";
    return `
      <div class="abstinence-item" data-key="${key}">
        <div>
          <strong>${item.label}</strong>
          <p class="diet-phase">Sans ${item.label.toLowerCase()} : <span class="abstinence-duration">${elapsed}</span></p>
        </div>
        <div class="diet-actions">
          <button class="btn-primary abstinence-start" data-key="${key}">Démarrer</button>
          <button class="btn-secondary abstinence-reset" data-key="${key}">Rechute</button>
        </div>
      </div>
    `;
  }).join("");
}

function refreshWeightUI() {
  const entries = getWeightEntries().sort((a, b) => a.date.localeCompare(b.date));
  const current = entries[entries.length - 1];
  document.getElementById("current-weight").textContent = current
    ? `Poids actuel : ${current.weight.toFixed(1)} kg`
    : "Poids actuel : —";

  const calcDelta = (days) => {
    if (entries.length < 2) return null;
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    const start = entries.find((e) => new Date(e.date) >= from) || entries[0];
    const end = entries[entries.length - 1];
    return end.weight - start.weight;
  };

  const d7 = calcDelta(7);
  const d30 = calcDelta(30);
  document.getElementById("weight-stats").textContent = `Variation 7 jours : ${d7 === null ? "—" : `${d7 >= 0 ? "+" : ""}${d7.toFixed(1)} kg`} | Variation 30 jours : ${d30 === null ? "—" : `${d30 >= 0 ? "+" : ""}${d30.toFixed(1)} kg`}`;

  const canvas = document.getElementById("weight-chart");
  if (!canvas || typeof Chart === "undefined") return;
  if (weightChart) weightChart.destroy();
  weightChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: entries.map((e) => e.date.slice(5)),
      datasets: [{
        label: "Poids (kg)",
        data: entries.map((e) => e.weight),
        borderColor: "#007ACC",
        backgroundColor: "rgba(0,122,204,0.15)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: false } }
    }
  });
}

function refreshHydrationUI() {
  const state = getHydrationState();
  if (state.date !== getTodayKey()) {
    state.date = getTodayKey();
    state.count = 0;
    localStorage.setItem("dietHydrationState", JSON.stringify(state));
    saveDietField("dietHydrationState", state);
  }

  const liters = (state.count * state.glassSize) / 1000;
  const percent = Math.min(100, Math.round((state.count / Math.max(1, state.target)) * 100));

  document.getElementById("hydration-count").textContent = `${state.count} / ${state.target} verres`;
  document.getElementById("hydration-liters").textContent = `${liters.toFixed(2)} L bus aujourd'hui`;
  document.getElementById("hydration-target").value = state.target;
  document.getElementById("glass-size").value = String(state.glassSize);

  const bar = document.getElementById("hydration-progress");
  bar.style.width = `${percent}%`;
  bar.style.backgroundColor = percent >= 100 ? "#2ecc71" : "#007ACC";
}

function refreshStatsUI() {
  const fasting = getFastingState();
  const weights = getWeightEntries();
  const hydration = getHydrationState();
  const abstinence = getAbstinenceState();

  const fastingHistory = fasting.history || [];
  const recentFasting = fastingHistory.slice(-7);
  const avgFasting = recentFasting.length
    ? recentFasting.reduce((sum, item) => sum + item.durationHours, 0) / recentFasting.length
    : 0;

  const hydrationHistory = hydration.history || {};
  const recentHydration = Object.entries(hydrationHistory).slice(-7);
  const avgHydration = recentHydration.length
    ? recentHydration.reduce((sum, [, value]) => sum + value, 0) / recentHydration.length
    : hydration.count;

  const consecutive = (() => {
    let streak = 0;
    const target = hydration.target || 8;
    for (let i = 0; i < 30; i += 1) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().split("T")[0];
      if ((hydrationHistory[key] || 0) >= target) streak += 1;
      else break;
    }
    return streak;
  })();

  const w30 = weights.slice(-30);
  const weightDelta = w30.length > 1 ? w30[w30.length - 1].weight - w30[0].weight : 0;
  const abstinenceBest = Object.values(abstinence)
    .filter((item) => item.since)
    .map((item) => ({ ...item, hours: (Date.now() - item.since) / 3600000 }))
    .sort((a, b) => b.hours - a.hours)[0];

  document.getElementById("diet-stats").innerHTML = `
    <li>🔥 Moyenne durée de jeûne (7 derniers jeûnes) : <strong>${avgFasting.toFixed(1)}h</strong></li>
    <li>⚖️ Évolution poids (30 dernières entrées) : <strong>${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg</strong></li>
    <li>💧 Moyenne hydratation (7 jours) : <strong>${avgHydration.toFixed(1)} verres</strong></li>
    <li>📅 Jours consécutifs objectif hydratation : <strong>${consecutive}</strong></li>
    <li>🚫 Meilleure série sèche : <strong>${abstinenceBest ? `${abstinenceBest.label} (${abstinenceBest.hours.toFixed(1)}h)` : "—"}</strong></li>
  `;
}

function initEvents() {
  if (eventsInitialized) return;
  eventsInitialized = true;
  document.getElementById("start-fasting").addEventListener("click", async () => {
    const state = getFastingState();
    state.isActive = true;
    state.startTime = Date.now();
    state.targetHours = Number(document.getElementById("fasting-target").value) || 16;
    localStorage.setItem("dietFastingState", JSON.stringify(state));
    await saveDietField("dietFastingState", state);
    refreshFastingUI();
  });

  document.getElementById("stop-fasting").addEventListener("click", async () => {
    const state = getFastingState();
    if (state.isActive && state.startTime) {
      const durationHours = (Date.now() - state.startTime) / 3600000;
      state.history = state.history || [];
      state.history.push({ date: getTodayKey(), durationHours: Number(durationHours.toFixed(2)) });
    }
    state.isActive = false;
    state.startTime = null;
    localStorage.setItem("dietFastingState", JSON.stringify(state));
    await saveDietField("dietFastingState", state);
    refreshFastingUI();
    refreshStatsUI();
  });

  document.getElementById("fasting-target").addEventListener("change", async (event) => {
    const state = getFastingState();
    state.targetHours = Number(event.target.value) || 16;
    localStorage.setItem("dietFastingState", JSON.stringify(state));
    await saveDietField("dietFastingState", state);
    refreshFastingUI();
  });

  document.getElementById("add-weight").addEventListener("click", async () => {
    const input = document.getElementById("weight-input");
    const weight = Number(input.value);
    if (!weight) return;
    const entries = getWeightEntries();
    entries.push({ date: getTodayKey(), weight });
    localStorage.setItem("dietWeightEntries", JSON.stringify(entries));
    input.value = "";
    await saveDietField("dietWeightEntries", entries);
    refreshWeightUI();
    refreshStatsUI();
  });

  document.getElementById("water-plus").addEventListener("click", async () => {
    const state = getHydrationState();
    state.count += 1;
    state.history = state.history || {};
    state.history[getTodayKey()] = state.count;
    localStorage.setItem("dietHydrationState", JSON.stringify(state));
    await saveDietField("dietHydrationState", state);
    refreshHydrationUI();
    refreshStatsUI();
  });

  document.getElementById("water-minus").addEventListener("click", async () => {
    const state = getHydrationState();
    state.count = Math.max(0, state.count - 1);
    state.history = state.history || {};
    state.history[getTodayKey()] = state.count;
    localStorage.setItem("dietHydrationState", JSON.stringify(state));
    await saveDietField("dietHydrationState", state);
    refreshHydrationUI();
    refreshStatsUI();
  });

  document.getElementById("hydration-target").addEventListener("change", async (event) => {
    const state = getHydrationState();
    state.target = Math.max(1, Number(event.target.value) || 8);
    localStorage.setItem("dietHydrationState", JSON.stringify(state));
    await saveDietField("dietHydrationState", state);
    refreshHydrationUI();
    refreshStatsUI();
  });

  document.getElementById("glass-size").addEventListener("change", async (event) => {
    const state = getHydrationState();
    state.glassSize = Number(event.target.value) || 250;
    localStorage.setItem("dietHydrationState", JSON.stringify(state));
    await saveDietField("dietHydrationState", state);
    refreshHydrationUI();
  });

  document.getElementById("abstinence-list").addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const key = target.dataset.key;
    if (!key) return;

    const state = getAbstinenceState();
    if (!state[key]) return;

    if (target.classList.contains("abstinence-start")) {
      state[key].since = Date.now();
    }
    if (target.classList.contains("abstinence-reset")) {
      state[key].since = null;
    }

    localStorage.setItem("dietAbstinenceState", JSON.stringify(state));
    await saveDietField("dietAbstinenceState", state);
    refreshAbstinenceUI();
    refreshStatsUI();
  });
}

function initPage() {
  const fasting = getFastingState();
  document.getElementById("fasting-target").value = String(fasting.targetHours || 16);

  if (fastingInterval) clearInterval(fastingInterval);
  fastingInterval = setInterval(refreshFastingUI, 1000);

  if (abstinenceInterval) clearInterval(abstinenceInterval);
  abstinenceInterval = setInterval(() => {
    refreshFastingWheelUI();
    refreshAbstinenceUI();
  }, 1000);

  initEvents();
  refreshFastingUI();
  refreshFastingWheelUI();
  refreshWeightUI();
  refreshHydrationUI();
  refreshAbstinenceUI();
  refreshStatsUI();
}

window.addEventListener("beforeunload", () => {
  if (fastingInterval) clearInterval(fastingInterval);
  if (abstinenceInterval) clearInterval(abstinenceInterval);
});
