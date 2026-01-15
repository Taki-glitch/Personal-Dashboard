/* ===============================
   CONFIG & STOCKAGE
================================ */
const STORAGE_KEY = "expenses";

function getExpenses() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

/* ===============================
   UTILITAIRES DATE
================================ */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function currentMonth() {
  return todayISO().slice(0, 7); // YYYY-MM
}

/* ===============================
   RENDU LISTE DÉPENSES
================================ */
function renderExpenses() {
  const list = document.getElementById("expense-list");
  if (!list) return;

  const expenses = getExpenses().slice().reverse();
  list.innerHTML = "";

  expenses.forEach(e => {
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
   WIDGET DASHBOARD (JOUR / MOIS)
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
}

/* ===============================
   DONNÉES GRAPHIQUE
================================ */
function getCategoryTotals() {
  const expenses = getExpenses();
  const month = currentMonth();
  const totals = {};

  expenses
    .filter(e => e.date.startsWith(month))
    .forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

  return totals;
}

/* ===============================
   GRAPHIQUE PAR CATÉGORIE
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
      datasets: [{
        data: values
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

/* ===============================
   AJOUT DÉPENSE
================================ */
function addExpense() {
  const amountInput = document.getElementById("amount");
  const categoryInput = document.getElementById("category");
  const noteInput = document.getElementById("note");

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) return;

  const expense = {
    id: Date.now(),
    amount,
    category: categoryInput.value,
    note: noteInput.value.trim(),
    date: todayISO()
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  // Reset formulaire
  amountInput.value = "";
  noteInput.value = "";

  // Mise à jour UI
  renderExpenses();
  updateWidget();
  renderCategoryChart();
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("add-expense");
  if (btn) btn.onclick = addExpense;

  renderExpenses();
  updateWidget();
  renderCategoryChart();
});
