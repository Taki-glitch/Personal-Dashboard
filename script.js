/* =====================================================
    script.js - LOGIQUE DASHBOARD (Index)
===================================================== */
import { auth, db } from "./auth.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
    updateDate();
    loadWeather();
    loadTasks();
    loadRSS();
    // Ces fonctions recalculent les données locales pour les widgets
    updateBudgetWidget(); 
    updateFlashcardWidget();
});

// --- 2. AUTHENTIFICATION (Données spécifiques dashboard) ---
onAuthStateChanged(auth, async (user) => {
    const headerName = document.getElementById("header-name");
    if (user) {
        if(headerName) headerName.textContent = user.displayName || user.email.split('@')[0];
        await loadFromCloud(); // Charge RSS, Tasks, etc.
        updateBudgetWidget(); // Recalcul après chargement Cloud
        updateFlashcardWidget();
    } else {
        if(headerName) headerName.textContent = "Invité";
        renderAll();
    }
});

// --- 3. WIDGET BUDGET (Correction : Calcul + Graphique) ---
function updateBudgetWidget() {
    // 1. Lire les dépenses locales
    const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
    
    // 2. Filtrer pour le mois en cours
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7); // "2023-10"
    
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonthKey));
    const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Afficher le total
    const totalEl = document.getElementById("budget-month-total");
    if (totalEl) totalEl.textContent = total.toFixed(2) + " €";

    // 4. Dessiner le graphique (Si Chart.js est chargé)
    const ctx = document.getElementById("chart-month");
    if (ctx && typeof Chart !== 'undefined') {
        // Grouper par catégorie
        const categories = {};
        monthlyExpenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });

        // Détruire l'ancien graphique s'il existe pour éviter les bugs d'affichage
        if (window.myBudgetChart) window.myBudgetChart.destroy();

        window.myBudgetChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// --- 4. WIDGET FLASHCARDS ---
function updateFlashcardWidget() {
    const flashcards = JSON.parse(localStorage.getItem("flashcards") || "[]");
    const today = new Date().toISOString().split("T")[0];
    
    // Compter les cartes à réviser (nextReview <= aujourd'hui ou pas de date)
    const dueCount = flashcards.filter(card => !card.nextReview || card.nextReview <= today).length;
    
    const countEl = document.getElementById("fc-due-count");
    if (countEl) countEl.textContent = dueCount;
}

// --- 5. DATE & MÉTÉO ---
function updateDate() {
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    document.getElementById("date-display").textContent = new Date().toLocaleDateString('fr-FR', options);
}

async function loadWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            const { latitude, longitude } = position.coords;
            // Assure-toi que CONFIG est bien chargé via config.js
            if(typeof CONFIG === 'undefined') return; 
            
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric&lang=fr`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                document.getElementById("weather-content").innerHTML = `
                    <div style="font-size:2rem;">${Math.round(data.main.temp)}°C</div>
                    <div>${data.weather[0].description}</div>
                    <small>${data.name}</small>
                `;
            } catch (error) {
                console.error("Météo erreur:", error);
            }
        });
    }
}

// --- 6. GESTION TÂCHES & RSS (Fonctions existantes simplifiées) ---
// (Je garde la logique existante pour saveToCloud, loadFromCloud, renderTasks, etc.)

let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
let rssFeeds = JSON.parse(localStorage.getItem("rssFeeds") || "[]");

function renderAll() {
    renderTasks();
    loadRSS();
}

function renderTasks() {
    const list = document.getElementById("task-list");
    if(!list) return;
    list.innerHTML = "";
    tasks.forEach((t, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span style="${t.done ? 'text-decoration:line-through;color:gray' : ''}">${t.text}</span>
            <button onclick="toggleTask(${index})">✅</button>
            <button onclick="deleteTask(${index})">🗑️</button>
        `;
        list.appendChild(li);
    });
}

window.toggleTask = async (index) => {
    tasks[index].done = !tasks[index].done;
    await saveTasks();
};

window.deleteTask = async (index) => {
    tasks.splice(index, 1);
    await saveTasks();
};

async function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();
    await saveToCloud("tasks", tasks);
}

async function saveToCloud(key, data) {
    if (auth.currentUser) {
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { [key]: data });
        } catch (e) { console.error("Save error:", e); }
    }
}

async function loadFromCloud() {
    if (!auth.currentUser) return;
    try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) {
            const data = snap.data();
            if(data.tasks) { tasks = data.tasks; localStorage.setItem("tasks", JSON.stringify(tasks)); }
            if(data.rssFeeds) { rssFeeds = data.rssFeeds; localStorage.setItem("rssFeeds", JSON.stringify(rssFeeds)); }
            if(data.expenses) localStorage.setItem("expenses", JSON.stringify(data.expenses));
            if(data.flashcards) localStorage.setItem("flashcards", JSON.stringify(data.flashcards));
            renderAll();
        }
    } catch (e) { console.error("Load error:", e); }
}

// RSS Logic
const rssBtn = document.getElementById("add-rss");
if(rssBtn) {
    rssBtn.onclick = async () => {
        const name = document.getElementById("rss-name").value;
        const url = document.getElementById("rss-url").value;
        if(name && url) {
            rssFeeds.push({ name, url });
            localStorage.setItem("rssFeeds", JSON.stringify(rssFeeds));
            loadRSS();
            await saveToCloud("rssFeeds", rssFeeds);
        }
    };
}

function loadRSS() {
    const feedContainer = document.getElementById("rss-feed");
    if(!feedContainer) return;
    feedContainer.innerHTML = "";
    rssFeeds.forEach(feed => {
        const div = document.createElement("div");
        div.innerHTML = `<strong>${feed.name}</strong>: <a href="${feed.url}" target="_blank">Lien</a>`;
        feedContainer.appendChild(div);
    });
}

// Initialisation des tâches
document.getElementById("add-task")?.addEventListener("click", () => {
    const input = document.getElementById("new-task");
    if(input.value) {
        tasks.push({ text: input.value, done: false });
        input.value = "";
        saveTasks();
    }
});
