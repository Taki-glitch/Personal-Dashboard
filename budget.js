/* =====================================================
   FIREBASE (API MODULAIRE v10)
===================================================== */
import { db } from "./auth.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================================
   CONFIG & ÉTAT GLOBAL
===================================================== */
const STORAGE_KEY = "expenses";
const BUDGET_KEY = "budgetLimits";

/* Mois sélectionné (YYYY-MM) */
let selectedMonth = new Date().toISOString().slice(0, 7);

/* =====================================================
   UTIL
===================================================== */
function isUserLogged() {
  return window.currentUser && window.currentUser.uid;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
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
   FIREBASE – LOAD
===================================================== */
async function loadFromCloud() {
  if (!isUserLogged()) return;

  /* Dépenses */
  const expRef = collection(db, "users", window.currentUser.uid, "expenses");
  const expSnap = await getDocs(expRef);
  saveExpenses(expSnap.docs.map(d => d.data()));

  /* Budgets */
  const userSnap = await getDoc(doc(db, "users", window.currentUser.uid));
  if (userSnap.exists() && userSnap.data().budgets) {
    saveBudgets(userSnap.data().budgets);
  }
}

/* =====================================================
   FIREBASE – SYNC
===================================================== */
async function syncExpensesToCloud() {
  if (!isUserLogged()) return;

  const uid = window.currentUser.uid;
  const expenses = getExpenses();

  for (const e of expenses) {
    await setDoc(
      doc(db, "users", uid, "expenses", String(e.id)),
      e
    );
  }
}

async function syncBudgetsToCloud() {
  if (!isUserLogged()) return;

  await setDoc(
    doc(db, "users", window.currentUser.uid),
    { budgets: getBudgets() },
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

function getCategoryMonthTotal(cat) {
  return getMonthExpenses()
    .filter(e => e.category === cat)
    .reduce((s, e) => s + e.amount, 0);
}

/* =====================================================
   ALERTES
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

  getMonthExpenses().slice().reverse().forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${e.amount.toFixed(2)} €</strong> – ${e.category}
      <br><small>${e.date}${e.note ? " · " + e.note : ""}</small>
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

  const today = todayISO();
  const expenses = getExpenses();

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
  const total = getMonthTotal();

  const bar = document.getElementById("global-budget-bar");
  const text = document.getElementById("global-budget-text");

  if (bar && text && budgets.global > 0) {
    const pct = Math.min(100, (total / budgets.global) * 100);
    bar.style.width = pct + "%";
    text.textContent = `${total.toFixed(2)} € / ${budgets.global} €`;
  }

  const container = document.getElementById("category-budgets");
  if (!container) return;
  container.innerHTML = "";

  Object.entries(budgets.categories).forEach(([cat, limit]) => {
    const spent = getCategoryMonthTotal(cat);
    if (limit === 0 && spent === 0) return;

    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

    const div = document.createElement("div");
    div.className = "budget-block";
    div.innerHTML = `
      <strong>${cat}</strong>
      <div class="budget-bar"><div style="width:${pct}%"></div></div>
      <small>${spent.toFixed(2)} € ${limit ? "/ " + limit + " €" : ""}</small>
    `;
    container.appendChild(div);
  });
}

/* =====================================================
   GRAPHIQUES
===================================================== */
let monthChart = null;
let catChart = null;

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const monthCanvas = document.getElementById("chart-month");
  const catCanvas = document.getElementById("chart-categories");
  if (!monthCanvas || !catCanvas) return;

  const map = {};
  getMonthExpenses().forEach(e => {
    map[e.date] = (map[e.date] || 0) + e.amount;
  });

  if (monthChart) monthChart.destroy();
  monthChart = new Chart(monthCanvas, {
    type: "line",
    data: {
      labels: Object.keys(map).map(d => d.slice(8)),
      datasets: [{ data: Object.values(map), fill: true, tension: 0.3 }]
    },
    options: { plugins: { legend: { display: false } } }
  });

  const catMap = {};
  getMonthExpenses().forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  if (catChart) catChart.destroy();
  catChart = new Chart(catCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(catMap),
      datasets: [{ data: Object.values(catMap) }]
    }
  });
}

/* =====================================================
   ACTIONS
===================================================== */
async function addExpense() {
  const amount = parseFloat(document.getElementById("amount")?.value);
  if (!amount || amount <= 0) return;

  const expense = {
    id: Date.now(),
    amount,
    category: document.getElementById("category")?.value || "Autre",
    note: document.getElementById("note")?.value || "",
    date: todayISO()
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  await syncExpensesToCloud();
  refreshUI();
}

async function saveGlobalBudget() {
  const val = parseFloat(document.getElementById("budget-global")?.value) || 0;
  const budgets = getBudgets();
  budgets.global = val;
  saveBudgets(budgets);
  await syncBudgetsToCloud();
  renderBudgetsUI();
}

async function saveCategoryBudget() {
  const cat = document.getElementById("budget-category")?.value;
  const val = parseFloat(document.getElementById("budget-category-amount")?.value) || 0;
  if (!cat) return;

  const budgets = getBudgets();
  budgets.categories[cat] = val;
  saveBudgets(budgets);
  await syncBudgetsToCloud();
  renderBudgetsUI();
}

/* =====================================================
   INIT
===================================================== */
function refreshUI() {
  renderExpenses();
  updateWidget();
  renderBudgetsUI();
  renderCharts();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (isUserLogged()) await loadFromCloud();
  refreshUI();

  document.getElementById("add-expense")?.addEventListener("click", addExpense);
  document.getElementById("save-budget-global")?.addEventListener("click", saveGlobalBudget);
  document.getElementById("save-budget-category")?.addEventListener("click", saveCategoryBudget);
});
