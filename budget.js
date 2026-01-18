/* =====================================================
   CONFIG & ÉTAT GLOBAL
===================================================== */
const STORAGE_KEY = "expenses";
const BUDGET_KEY = "budgetLimits";

/* mois sélectionné (YYYY-MM) */
let selectedMonth = new Date().toISOString().slice(0, 7);

/* auth.js fournit window.currentUser */
function isUserLogged() {
  return window.currentUser && window.currentUser.uid;
}

/* =====================================================
   LOCAL STORAGE
===================================================== */
function getExpenses() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function getBudgets() {
  return JSON.parse(
    localStorage.getItem(BUDGET_KEY) || '{"global":0,"categories":{}}'
  );
}

function saveBudgets(budgets) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

/* =====================================================
   DATES
===================================================== */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/* =====================================================
   FIREBASE – CHARGEMENT
===================================================== */
async function loadFromCloud() {
  if (!isUserLogged() || typeof firebase === "undefined") return;

  const db = firebase.firestore();
  const uid = window.currentUser.uid;

  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return;

  const data = snap.data();
  if (Array.isArray(data.expenses)) saveExpenses(data.expenses);
  if (data.budgets) saveBudgets(data.budgets);
}

async function syncToCloud() {
  if (!isUserLogged() || typeof firebase === "undefined") return;

  const db = firebase.firestore();
  const uid = window.currentUser.uid;

  await db.collection("users").doc(uid).set(
    {
      expenses: getExpenses(),
      budgets: getBudgets()
    },
    { merge: true }
  );
}

/* =====================================================
   CALCULS
===================================================== */
function getMonthExpenses() {
  return getExpenses().filter(e => e.date.startsWith(selectedMonth));
}

function getMonthTotal() {
  return getMonthExpenses().reduce((s, e) => s + e.amount, 0);
}

function getCategoryMonthTotal(category) {
  return getMonthExpenses()
    .filter(e => e.category === category)
    .reduce((s, e) => s + e.amount, 0);
}

/* =====================================================
   ALERTES BUDGET
===================================================== */
function applyBudgetAlerts() {
  const budgets = getBudgets();
  const el = document.getElementById("budget-month-total");
  if (!el || budgets.global <= 0) return;

  const ratio = getMonthTotal() / budgets.global;

  el.style.color =
    ratio >= 1 ? "#e74c3c" :
    ratio >= 0.8 ? "#f39c12" :
    "";
}

/* =====================================================
   LISTE DÉPENSES
===================================================== */
function renderExpenses() {
  const list = document.getElementById("expense-list");
  if (!list) return;

  list.innerHTML = "";

  getMonthExpenses()
    .slice()
    .reverse()
    .forEach(e => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>
          <strong>${e.amount.toFixed(2)} €</strong> – ${e.category}
          <br><small>${e.date}${e.note ? " · " + e.note : ""}</small>
        </span>
      `;
      list.appendChild(li);
    });
}

/* =====================================================
   WIDGET DASHBOARD
===================================================== */
function updateWidget() {
  const todayEl = document.getElementById("budget-today-total");
  const monthEl = document.getElementById("budget-month-total");
  if (!todayEl || !monthEl) return;

  const expenses = getExpenses();
  const today = todayISO();

  const todayTotal = expenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + e.amount, 0);

  todayEl.textContent = todayTotal.toFixed(2) + " €";
  monthEl.textContent = getMonthTotal().toFixed(2) + " €";

  applyBudgetAlerts();
}

/* =====================================================
   BARRES DE BUDGET
===================================================== */
function renderBudgetsUI() {
  const budgets = getBudgets();
  const monthTotal = getMonthTotal();

  const globalBar = document.getElementById("global-budget-bar");
  const globalText = document.getElementById("global-budget-text");

  if (globalBar && globalText && budgets.global > 0) {
    const pct = Math.min(100, (monthTotal / budgets.global) * 100);
    globalBar.style.width = pct + "%";
    globalText.textContent = `${monthTotal.toFixed(2)} € / ${budgets.global} €`;

    globalBar.className = "";
    if (pct >= 90) globalBar.classList.add("budget-danger", "sprint-alert");
    else if (pct >= 70) globalBar.classList.add("budget-warning");
  }

  const container = document.getElementById("category-budgets");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(budgets.categories).forEach(([cat, limit]) => {
    if (limit <= 0) return;

    const total = getCategoryMonthTotal(cat);
    const pct = Math.min(100, (total / limit) * 100);

    const div = document.createElement("div");
    div.className = "budget-block";
    div.innerHTML = `
      <strong>${cat}</strong>
      <div class="budget-bar">
        <div style="width:${pct}%"></div>
      </div>
      <small>${total.toFixed(2)} € / ${limit} €</small>
    `;

    const bar = div.querySelector(".budget-bar > div");
    if (pct >= 90) bar.classList.add("budget-danger", "sprint-alert");
    else if (pct >= 70) bar.classList.add("budget-warning");

    container.appendChild(div);
  });
}

/* =====================================================
   GRAPHIQUES
===================================================== */
let monthChart = null;
let categoryChart = null;

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const monthCanvas = document.getElementById("chart-month");
  const catCanvas = document.getElementById("chart-categories");
  if (!monthCanvas || !catCanvas) return;

  const dailyMap = {};
  getMonthExpenses().forEach(e => {
    dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount;
  });

  const days = Object.keys(dailyMap).sort();

  if (monthChart) monthChart.destroy();
  monthChart = new Chart(monthCanvas, {
    type: "line",
    data: {
      labels: days.map(d => d.slice(8)),
      datasets: [{ data: days.map(d => dailyMap[d]), fill: true, tension: 0.3 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const catMap = {};
  getMonthExpenses().forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(catCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(catMap),
      datasets: [{ data: Object.values(catMap) }]
    },
    options: { responsive: true }
  });
}

/* =====================================================
   ACTIONS UTILISATEUR
===================================================== */
async function addExpense() {
  const amountInput = document.getElementById("amount");
  if (!amountInput) return;

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) return;

  const expense = {
    id: Date.now(),
    amount,
    category: document.getElementById("category")?.value || "Autre",
    note: document.getElementById("note")?.value.trim() || "",
    date: todayISO()
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  amountInput.value = "";
  if (document.getElementById("note")) document.getElementById("note").value = "";

  await syncToCloud();

  renderExpenses();
  updateWidget();
  renderBudgetsUI();
  renderCharts();
}

async function saveGlobalBudget() {
  const input = document.getElementById("budget-global");
  if (!input) return;

  const budgets = getBudgets();
  budgets.global = parseFloat(input.value) || 0;
  saveBudgets(budgets);

  await syncToCloud();
  renderBudgetsUI();
}

async function saveCategoryBudget() {
  const catInput = document.getElementById("budget-category");
  const valInput = document.getElementById("budget-category-amount");
  if (!catInput || !valInput) return;

  const budgets = getBudgets();
  budgets.categories[catInput.value] = parseFloat(valInput.value) || 0;
  saveBudgets(budgets);

  await syncToCloud();
  renderBudgetsUI();
}

/* =====================================================
   INIT SÉCURISÉ
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  if (isUserLogged()) {
    loadFromCloud().then(refreshUI);
  } else {
    refreshUI();
  }
});

window.addEventListener("user-ready", async () => {
  await loadFromCloud();
  refreshUI();
});

function refreshUI() {
  renderExpenses();
  updateWidget();
  renderBudgetsUI();
  renderCharts();

  document.getElementById("add-expense")?.addEventListener("click", addExpense);
  document.getElementById("save-budget-global")?.addEventListener("click", saveGlobalBudget);
  document.getElementById("save-budget-category")?.addEventListener("click", saveCategoryBudget);
}
