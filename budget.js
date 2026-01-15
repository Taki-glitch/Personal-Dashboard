const STORAGE_KEY = "expenses";

function getExpenses() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function renderExpenses() {
  const list = document.getElementById("expense-list");
  if (!list) return;

  const expenses = getExpenses().slice().reverse();
  list.innerHTML = "";

  expenses.forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <strong>${e.amount} €</strong> – ${e.category}
        <br><small>${e.date}</small>
      </span>
    `;
    list.appendChild(li);
  });
}

function updateWidget() {
  const expenses = getExpenses();
  const today = new Date().toISOString().split("T")[0];
  const month = today.slice(0, 7);

  const todayTotal = expenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + e.amount, 0);

  const monthTotal = expenses
    .filter(e => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);

  const t = document.getElementById("budget-today-total");
  const m = document.getElementById("budget-month-total");
  if (t) t.textContent = todayTotal + " €";
  if (m) m.textContent = monthTotal + " €";
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("add-expense");
  if (btn) {
    btn.onclick = () => {
      const amount = parseFloat(document.getElementById("amount").value);
      if (!amount) return;

      const expense = {
        id: Date.now(),
        amount,
        category: document.getElementById("category").value,
        note: document.getElementById("note").value,
        date: new Date().toISOString().split("T")[0]
      };

      const expenses = getExpenses();
      expenses.push(expense);
      saveExpenses(expenses);
      renderExpenses();
      updateWidget();
    };
  }

  renderExpenses();
  updateWidget();
});
