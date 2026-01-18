/* =====================================================
    FIREBASE & AUTH
===================================================== */
import { db, auth, logout } from "./auth.js";
import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =====================================================
    CONFIG & ÉTAT GLOBAL
===================================================== */
const STORAGE_KEY = "expenses";
const BUDGET_KEY = "budgetLimits";

// On utilise un objet Date pour naviguer facilement entre les mois
let selectedDate = new Date(); 

/* =====================================================
    UTILITAIRES
===================================================== */
function isUserLogged() {
  return window.currentUser && window.currentUser.uid;
}

function getMonthKey(date) {
  // Retourne "YYYY-MM"
  return date.toISOString().slice(0, 7);
}

/* =====================================================
    LOCAL STORAGE (AVEC BUDGETS PAR DÉFAUT)
===================================================== */
function getExpenses() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function getBudgets() {
  const saved = localStorage.getItem(BUDGET_KEY);
  if (saved) {
    return JSON.parse(saved);
  } else {
    // VALEURS PAR DÉFAUT SI VIDE
    return {
      global: 0,
      categories: {
        "Vêtements": 100,
        "Autre": 100
      }
    };
  }
}

function saveBudgets(budgets) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

/* =====================================================
    FIREBASE – CHARGEMENT & SYNCHRO
===================================================== */
async function loadFromCloud() {
  if (!isUserLogged()) return;
  const uid = window.currentUser.uid;

  /* Dépenses */
  const expRef = collection(db, "users", uid, "expenses");
  const expSnap = await getDocs(expRef);
  const cloudData = expSnap.docs.map(d => d.data());
  if (cloudData.length > 0) saveExpenses(cloudData);

  /* Budgets */
  const userSnap = await getDoc(doc(db, "users", uid));
  if (userSnap.exists() && userSnap.data().budgets) {
    saveBudgets(userSnap.data().budgets);
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
    NAVIGATION MOIS
===================================================== */
function updateMonthUI() {
  const label = document.getElementById("current-month-label");
  if (label) {
    const options = { month: 'long', year: 'numeric' };
    label.textContent = selectedDate.toLocaleDateString('fr-FR', options);
  }
  refreshUI();
}

/* =====================================================
    ACTIONS (AJOUT, SUPPRESSION)
===================================================== */
async function addExpense() {
  const amount = parseFloat(document.getElementById("amount")?.value);
  const customDate = document.getElementById("expense-date")?.value; // Nouvelle date
  if (!amount || amount <= 0) return;

  const expense = {
    id: String(Date.now()),
    amount,
    category: document.getElementById("category")?.value || "Autre",
    note: document.getElementById("note")?.value || "",
    date: customDate || new Date().toISOString().split("T")[0]
  };

  const expenses = getExpenses();
  expenses.push(expense);
  saveExpenses(expenses);

  if (isUserLogged()) {
    await setDoc(doc(db, "users", window.currentUser.uid, "expenses", expense.id), expense);
  }
  
  // Reset formulaire
  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";
  
  refreshUI();
}

async function deleteExpense(id) {
  if (!confirm("Supprimer cette dépense ?")) return;

  let expenses = getExpenses();
  expenses = expenses.filter(e => e.id !== String(id));
  saveExpenses(expenses);

  if (isUserLogged()) {
    await deleteDoc(doc(db, "users", window.currentUser.uid, "expenses", String(id)));
  }
  refreshUI();
}

/* =====================================================
    RENDU UI (LISTE, WIDGET, BARRES)
===================================================== */
function refreshUI() {
  const currentMonthStr = getMonthKey(selectedDate);
  const allExpenses = getExpenses();
  const monthExpenses = allExpenses.filter(e => e.date.startsWith(currentMonthStr));
  const budgets = getBudgets();

  // 1. Liste des dépenses (avec bouton supprimer)
  const list = document.getElementById("expense-list");
  if (list) {
    list.innerHTML = "";
    monthExpenses.slice().reverse().forEach(e => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div>
            <strong>${e.amount.toFixed(2)} €</strong> – ${e.category}
            <br><small>${e.date}${e.note ? " · " + e.note : ""}</small>
          </div>
          <button class="delete-btn" data-id="${e.id}" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;">&times;</button>
        </div>
      `;
      list.appendChild(li);
    });

    // Event listeners suppression
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.onclick = () => deleteExpense(btn.dataset.id);
    });
  }

  // 2. Widget Dashboard (Totaux)
  const todayTotal = allExpenses
    .filter(e => e.date === new Date().toISOString().split("T")[0])
    .reduce((s, e) => s + e.amount, 0);
  
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const todayEl = document.getElementById("budget-today-total");
  const monthEl = document.getElementById("budget-month-total");
  if (todayEl) todayEl.textContent = todayTotal.toFixed(2) + " €";
  if (monthEl) {
    monthEl.textContent = monthTotal.toFixed(2) + " €";
    // Alertes couleurs
    if (budgets.global > 0) {
      const ratio = monthTotal / budgets.global;
      monthEl.style.color = ratio >= 1 ? "#e74c3c" : ratio >= 0.8 ? "#f39c12" : "";
    }
  }

  // 3. Barres de Budget
  const bar = document.getElementById("global-budget-bar");
  const text = document.getElementById("global-budget-text");
  if (bar && text && budgets.global > 0) {
    const pct = Math.min(100, (monthTotal / budgets.global) * 100);
    bar.style.width = pct + "%";
    text.textContent = `${monthTotal.toFixed(2)} € / ${budgets.global} €`;
  }

  renderCategoryBudgets(monthExpenses, budgets);
  renderCharts(monthExpenses);
}

function renderCategoryBudgets(monthExpenses, budgets) {
  const container = document.getElementById("category-budgets");
  if (!container) return;
  container.innerHTML = "";

  Object.entries(budgets.categories).forEach(([cat, limit]) => {
    const spent = monthExpenses
      .filter(e => e.category === cat)
      .reduce((s, e) => s + e.amount, 0);
    
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
    GRAPHIQUES (CHART.JS)
===================================================== */
let monthChart = null;
let catChart = null;

function renderCharts(monthExpenses) {
  if (typeof Chart === "undefined") return;

  const monthCanvas = document.getElementById("chart-month");
  const catCanvas = document.getElementById("chart-categories");
  if (!monthCanvas || !catCanvas) return;

  // Données par jour
  const map = {};
  monthExpenses.forEach(e => {
    map[e.date] = (map[e.date] || 0) + e.amount;
  });
  const sortedDates = Object.keys(map).sort();

  if (monthChart) monthChart.destroy();
  monthChart = new Chart(monthCanvas, {
    type: "line",
    data: {
      labels: sortedDates.map(d => d.slice(8)),
      datasets: [{ 
        label: 'Dépenses',
        data: sortedDates.map(d => map[d]), 
        borderColor: '#007ACC',
        fill: true, 
        tension: 0.3 
      }]
    },
    options: { plugins: { legend: { display: false } } }
  });

  // Données par catégorie
  const catMap = {};
  monthExpenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  if (catChart) catChart.destroy();
  catChart = new Chart(catCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(catMap),
      datasets: [{ 
        data: Object.values(catMap),
        backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e']
      }]
    }
  });
}

/* =====================================================
    LOGIQUE MENU & PROFIL (HARMONISÉE)
===================================================== */
function updateAuthUI(user) {
  const info = document.getElementById("user-info");
  const guest = document.getElementById("user-guest");
  const status = document.getElementById("user-status");
  const name = document.getElementById("user-name");

  if (user) {
    if (status) status.style.display = "none";
    if (guest) guest.style.display = "none";
    if (info) info.style.display = "block";
    if (name) name.textContent = user.displayName || user.email;
  } else {
    if (status) status.textContent = "Mode Local";
    if (guest) guest.style.display = "block";
    if (info) info.style.display = "none";
  }
}

/* =====================================================
    INIT
===================================================== */
onAuthStateChanged(auth, async user => {
  window.currentUser = user;
  updateAuthUI(user);
  if (user) await loadFromCloud();
  updateMonthUI(); // Lance le premier refresh
});

document.addEventListener("DOMContentLoaded", () => {
  // Navigation mois
  document.getElementById("prev-month")?.addEventListener("click", () => {
    selectedDate.setMonth(selectedDate.getMonth() - 1);
    updateMonthUI();
  });
  document.getElementById("next-month")?.addEventListener("click", () => {
    selectedDate.setMonth(selectedDate.getMonth() + 1);
    updateMonthUI();
  });

  // Actions
  document.getElementById("add-expense")?.addEventListener("click", addExpense);
  document.getElementById("btn-logout")?.addEventListener("click", logout);

  document.getElementById("save-budget-global")?.addEventListener("click", async () => {
    const val = parseFloat(document.getElementById("budget-global")?.value) || 0;
    const budgets = getBudgets();
    budgets.global = val;
    saveBudgets(budgets);
    await syncBudgetsToCloud();
    refreshUI();
  });

  document.getElementById("save-budget-category")?.addEventListener("click", async () => {
    const cat = document.getElementById("budget-category")?.value;
    const val = parseFloat(document.getElementById("budget-category-amount")?.value) || 0;
    if (!cat) return;
    const budgets = getBudgets();
    budgets.categories[cat] = val;
    saveBudgets(budgets);
    await syncBudgetsToCloud();
    refreshUI();
  });
});
