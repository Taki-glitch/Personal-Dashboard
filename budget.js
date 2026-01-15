/* ===============================
   CONFIG & STOCKAGE
================================ */
const STORAGE_KEY = "expenses";
const BUDGET_KEY = "budgetLimits";

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
   TOTAUX
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

function getCategoryTotals() {
  const totals = {};
  getExpenses()
    .filter(e => e.date.startsWith(currentMonth()))
    .forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
  return totals;
}

/* ===============================
   ALERTES TEXTE (WIDGET)
================================ */
function applyBudgetAlerts() {
  const budgets = getBudgets();
  const monthTotal = getMonthTotal();
  const el = document.getElementById("budget-month-total");

  if (!el || budgets.global <= 0) return;

  const ratio = monthTotal / budgets.global;

  el.style.color =
    ratio >= 1 ? "#e74c3c" :
    ratio >= 0.8 ? "#f39c12" :
    "";

  el.title = `Budget global : ${budgets.global} €`;
}

/* ===============================
   LISTE DÉPENSES
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
   WIDGET DASHBOARD
================================ */
function updateWidget() {
  const expenses = getExpenses();
  const today = todayISO();
  const month = currentMonth();

  const todayTotal = expenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + e.amount, 0);

  const monthTotal = expenses
    .filter(e => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);

  const t = document.getElementById("budget-today-total");
  const m = document.getElementById("budget-month-total");

  if (t) t.textContent = todayTotal.toFixed(2) + " €";
  if (m) m.textContent = monthTotal.toFixed(2) + " €";

  applyBudgetAlerts();
}

/* ===============================
   GRAPHIQUE
================================ */
let categoryChart = null;

function renderCategoryChart() {
  const canvas = document.getElementById("categoryChart");
  if (!canvas) return;

  const data = getCategoryTotals();
  const labels = Object.keys(data);
  const values = Object.values(data);

  if (categoryChart) categoryChart.destroy();
  if (labels.length === 0) return;

  categoryChart = new Chart(canvas.getContext("2d"), {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: values }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

/* ===============================
   AJOUT DÉPENSE
================================ */
function addExpense() {
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

  renderExpenses();
  updateWidget();
  renderCategoryChart();
  renderBudgetsUI();
}

/* ===============================
   BUDGET UI (BARRES)
================================ */
function renderBudgetsUI() {
  const budgets = getBudgets();
  const monthTotal = getMonthTotal();

  /* GLOBAL */
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

  /* PAR CATÉGORIE */
  const container = document.getElementById("category-budgets");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(budgets.categories).forEach(([cat, limit]) => {
    const total = getCategoryMonthTotal(cat);
    const pct = Math.min(100, (total / limit) * 100);

    const block = document.createElement("div");
    block.className = "budget-block";
    block.innerHTML = `
      <strong>${cat}</strong>
      <div class="budget-bar">
        <div style="width:${pct}%"></div>
      </div>
      <small>${total.toFixed(2)} € / ${limit} €</small>
    `;

    const bar = block.querySelector(".budget-bar > div");
    if (pct >= 90) bar.classList.add("budget-danger", "sprint-alert");
    else if (pct >= 70) bar.classList.add("budget-warning");

    container.appendChild(block);
  });
}

/* ===============================
   SAUVEGARDE BUDGETS
================================ */
function saveGlobalBudget() {
  const budgets = getBudgets();
  budgets.global = parseFloat(document.getElementById("budget-global").value) || 0;
  saveBudgets(budgets);
  renderBudgetsUI();
  applyBudgetAlerts();
}

function saveCategoryBudget() {
  const budgets = getBudgets();
  const cat = document.getElementById("budget-category").value;
  const val = parseFloat(document.getElementById("budget-category-amount").value) || 0;

  budgets.categories[cat] = val;
  saveBudgets(budgets);
  renderBudgetsUI();
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-expense")?.addEventListener("click", addExpense);
  document.getElementById("save-budget-global")?.addEventListener("click", saveGlobalBudget);
  document.getElementById("save-budget-category")?.addEventListener("click", saveCategoryBudget);

  renderExpenses();
  updateWidget();
  renderCategoryChart();
  renderBudgetsUI();
});
