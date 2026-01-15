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
  return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{"global":0,"categories":{}}');
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
   ALERTES VISUELLES
================================ */
function applyBudgetAlerts() {
  const budgets = getBudgets();
  const monthTotal = getMonthTotal();

  const monthEl = document.getElementById("budget-month-total");
  if (budgets.global > 0 && monthEl) {
    const ratio = monthTotal / budgets.global;

    monthEl.style.color =
      ratio >= 1 ? "#e74c3c" :
      ratio >= 0.8 ? "#f39c12" :
      "";

    monthEl.title = `Budget global : ${budgets.global} €`;
  }
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
  if (m) t && (m.textContent = monthTotal.toFixed(2) + " €");

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
      plugins: { legend: { position: "bottom" } },
      responsive: true
    }
  });
}

/* ===============================
   AJOUT DÉPENSE
================================ */
function addExpense() {
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || amount <= 0) return;

  const expense = {
    id: Date.now(),
    amount,
    category: document.getElementById("category").value,
    note: document.getElementById("note").value.trim(),
    date: todayISO()
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  renderExpenses();
  updateWidget();
  renderCategoryChart();
}

/* ===============================
   SAUVEGARDE BUDGETS
================================ */
function saveGlobalBudget() {
  const budgets = getBudgets();
  budgets.global = parseFloat(document.getElementById("budget-global").value) || 0;
  saveBudgets(budgets);
  applyBudgetAlerts();
}

function saveCategoryBudget() {
  const budgets = getBudgets();
  const cat = document.getElementById("budget-category").value;
  const val = parseFloat(document.getElementById("budget-category-amount").value) || 0;

  budgets.categories[cat] = val;
  saveBudgets(budgets);
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
});
