/* ===============================
   CONFIG & ÉTAT UTILISATEUR
================================ */
const STORAGE_KEY = "expenses";
const BUDGET_KEY = "budgetLimits";

/* auth.js mettra window.currentUser */
function isUserLogged() {
  return window.currentUser && window.currentUser.uid;
}

/* ===============================
   LOCAL STORAGE
================================ */
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

/* ===============================
   UTILITAIRES DATE
================================ */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

/* ===============================
   FIREBASE – DÉPENSES
================================ */
async function loadExpensesFromCloud() {
  if (!isUserLogged()) return;

  const db = firebase.firestore();
  const uid = window.currentUser.uid;

  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("expenses")
    .get();

  const expenses = snap.docs.map(d => d.data());
  saveExpenses(expenses);
}

async function syncExpensesToCloud() {
  if (!isUserLogged()) return;

  const db = firebase.firestore();
  const uid = window.currentUser.uid;
  const expenses = getExpenses();

  const batch = db.batch();

  expenses.forEach(e => {
    const ref = db
      .collection("users")
      .doc(uid)
      .collection("expenses")
      .doc(String(e.id));
    batch.set(ref, e);
  });

  await batch.commit();
}

/* ===============================
   FIREBASE – BUDGETS
================================ */
async function loadBudgetsFromCloud() {
  if (!isUserLogged()) return;

  const db = firebase.firestore();
  const uid = window.currentUser.uid;

  const doc = await db.collection("users").doc(uid).get();
  if (doc.exists && doc.data().budgets) {
    saveBudgets(doc.data().budgets);
  }
}

async function syncBudgetsToCloud() {
  if (!isUserLogged()) return;

  const db = firebase.firestore();
  const uid = window.currentUser.uid;

  await db.collection("users").doc(uid).set({
    budgets: getBudgets()
  }, { merge: true });
}

/* ===============================
   CALCULS
================================ */
function getMonthTotal() {
  return getExpenses()
    .filter(e => e.date.startsWith(currentMonth()))
    .reduce((s, e) => s + e.amount, 0);
}

function getCategoryMonthTotal(category) {
  return getExpenses()
    .filter(e => e.date.startsWith(currentMonth()) && e.category === category)
    .reduce((s, e) => s + e.amount, 0);
}

/* ===============================
   UI – ALERTES
================================ */
function applyBudgetAlerts() {
  const budgets = getBudgets();
  const total = getMonthTotal();
  const el = document.getElementById("budget-month-total");

  if (!el || budgets.global <= 0) return;

  const ratio = total / budgets.global;

  el.style.color =
    ratio >= 1 ? "#e74c3c" :
    ratio >= 0.8 ? "#f39c12" :
    "";
}

/* ===============================
   UI – LISTE DÉPENSES
================================ */
function renderExpenses() {
  const list = document.getElementById("expense-list");
  if (!list) return;

  list.innerHTML = "";
  getExpenses().slice().reverse().forEach(e => {
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

/* ===============================
   UI – WIDGET
================================ */
function updateWidget() {
  const todayEl = document.getElementById("budget-today-total");
  const monthEl = document.getElementById("budget-month-total");

  // 👉 Si le widget n’est pas présent sur la page, on sort
  if (!todayEl || !monthEl) return;

  const expenses = getExpenses();
  const today = todayISO();
  const month = currentMonth();

  const todayTotal = expenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + e.amount, 0);

  const monthTotal = expenses
    .filter(e => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);

  todayEl.textContent = todayTotal.toFixed(2) + " €";
  monthEl.textContent = monthTotal.toFixed(2) + " €";

  applyBudgetAlerts();
}

/* ===============================
   UI – BARRES DE BUDGET
================================ */
function renderBudgetsUI() {
  const budgets = getBudgets();
  const monthTotal = getMonthTotal();

  const globalBar = document.getElementById("global-budget-bar");
  const globalText = document.getElementById("global-budget-text");

  if (globalBar && budgets.global > 0) {
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

/* ===============================
   ACTIONS UTILISATEUR
================================ */
async function addExpense() {
  const amountInput = document.getElementById("amount");
  const noteInput = document.getElementById("note");

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) return;

  const expense = {
    id: Date.now(),
    amount,
    category: document.getElementById("category").value,
    note: noteInput.value.trim(),
    date: todayISO()
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  amountInput.value = "";
  noteInput.value = "";

  await syncExpensesToCloud();

  renderExpenses();
  updateWidget();
  renderBudgetsUI();
}

async function saveGlobalBudget() {
  const budgets = getBudgets();
  budgets.global = parseFloat(document.getElementById("budget-global").value) || 0;
  saveBudgets(budgets);
  await syncBudgetsToCloud();
  renderBudgetsUI();
}

async function saveCategoryBudget() {
  const budgets = getBudgets();
  const cat = document.getElementById("budget-category").value;
  const val = parseFloat(document.getElementById("budget-category-amount").value) || 0;

  budgets.categories[cat] = val;
  saveBudgets(budgets);
  await syncBudgetsToCloud();
  renderBudgetsUI();
}

let monthChart = null;
let categoryChart = null;

/* ===============================
   DONNÉES POUR GRAPHIQUES
================================ */
function getMonthDailyTotals() {
  const map = {};
  const month = currentMonth();

  getExpenses()
    .filter(e => e.date.startsWith(month))
    .forEach(e => {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });

  const days = Object.keys(map).sort();
  return {
    labels: days.map(d => d.slice(8)),
    values: days.map(d => map[d])
  };
}

function getCategoryTotals() {
  const map = {};

  getExpenses()
    .filter(e => e.date.startsWith(currentMonth()))
    .forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

  return {
    labels: Object.keys(map),
    values: Object.values(map)
  };
}

/* ===============================
   RENDER CHARTS
================================ */
function renderCharts() {
  const monthCanvas = document.getElementById("chart-month");
  const catCanvas = document.getElementById("chart-categories");

  if (!monthCanvas || !catCanvas || typeof Chart === "undefined") return;

  /* ----- Graphique mensuel ----- */
  const monthData = getMonthDailyTotals();

  if (monthChart) monthChart.destroy();
  monthChart = new Chart(monthCanvas, {
    type: "line",
    data: {
      labels: monthData.labels,
      datasets: [{
        label: "€ / jour",
        data: monthData.values,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  /* ----- Graphique catégories ----- */
  const catData = getCategoryTotals();

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(catCanvas, {
    type: "doughnut",
    data: {
      labels: catData.labels,
      datasets: [{
        data: catData.values
      }]
    },
    options: {
      responsive: true
    }
  });
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", async () => {
  if (isUserLogged()) {
    await loadExpensesFromCloud();
    await loadBudgetsFromCloud();
  }

  document.getElementById("add-expense")?.addEventListener("click", addExpense);
  document.getElementById("save-budget-global")?.addEventListener("click", saveGlobalBudget);
  document.getElementById("save-budget-category")?.addEventListener("click", saveCategoryBudget);

  renderExpenses();
  updateWidget();
  renderBudgetsUI();
});
