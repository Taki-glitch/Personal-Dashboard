/* ==== 1. IMPORTS & CONFIGURATION ==== */
import { auth, db, logout } from "./auth.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;

/* ==== 2. AUTHENTIFICATION & SYNCHRONISATION ==== */
onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    updateUserUI(user);

    if (user) {
        console.log("Utilisateur connecté :", user.uid);
        await loadFromCloud();
        
        // --- AJOUT ICI ---
        updateBudgetWidget(); // Met à jour le widget budget après chargement cloud
        updateFlashcardWidget(); 
        // ------------------
        
    } else {
        console.log("Mode Local actif");
        renderAll();
        updateBudgetWidget(); // Fonctionne aussi en mode local
    }
});

/* ==== FONCTION AJOUTÉE POUR LE BUDGET ==== */
function updateBudgetWidget() {
    // Récupère les dépenses et les budgets (avec les mêmes clés que budget.js)
    const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
    const budgets = JSON.parse(localStorage.getItem("budgetLimits") || '{"global":0,"categories":{}}');
    
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);

    // Calcul du total du jour
    const todayTotal = expenses
        .filter(e => e.date === today)
        .reduce((s, e) => s + e.amount, 0);

    // Calcul du total du mois
    const monthTotal = expenses
        .filter(e => e.date.startsWith(thisMonth))
        .reduce((s, e) => s + e.amount, 0);

    const todayEl = document.getElementById("budget-today-total");
    const monthEl = document.getElementById("budget-month-total");

    if (todayEl) todayEl.textContent = todayTotal.toFixed(2) + " €";
    if (monthEl) {
        monthEl.textContent = monthTotal.toFixed(2) + " €";
        
        // Alerte couleur si le budget global est dépassé
        if (budgets.global > 0 && monthTotal >= budgets.global) {
            monthEl.style.color = "#e74c3c"; // Rouge
        } else if (budgets.global > 0 && monthTotal >= budgets.global * 0.8) {
            monthEl.style.color = "#f39c12"; // Orange (80%)
        } else {
            monthEl.style.color = ""; // Couleur normale
        }
    }
}

/* ==== 3. FONCTIONS DE RENDU (EXISTANTES) ==== */
function renderAll() {
    // Tes fonctions existantes (loadTasks, loadRSS, etc.)
    if (typeof loadTasks === "function") loadTasks();
    if (typeof loadRSS === "function") loadRSS();
    // On ajoute l'appel ici aussi pour la cohérence
    updateBudgetWidget();
}

/* ==== 4. MODULES DE L'APPLICATION ==== */

// --- AJOUT : FONCTION MOT DU JOUR ---
async function displayWordOfTheDay() {
    try {
        const response = await fetch("./list.json");
        const words = await response.json();
        
        // Choisir un mot basé sur la date du jour
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const word = words[dayOfYear % words.length];

        const russeEl = document.getElementById("word-russe");
        const tradEl = document.getElementById("word-trad");
        
        if (russeEl) russeEl.textContent = word.russe;
        if (tradEl) tradEl.textContent = word.francais;
    } catch (e) {
        console.error("Erreur mot du jour :", e);
    }
}

// --- THÈME ---
function applyTheme(theme) {
    const toggleThemeBtn = document.getElementById("toggle-theme");
    document.body.classList.toggle("dark", theme === "dark");
    if (toggleThemeBtn) toggleThemeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

// --- TODO LIST ---
function renderTasks() {
    const taskList = document.getElementById("task-list");
    if (!taskList) return;
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    taskList.innerHTML = tasks.map((t, i) => `
        <li>
            <span>${t}</span>
            <button onclick="removeTask(${i})" style="background:none; color:red; width:auto; border:none; cursor:pointer;">✕</button>
        </li>
    `).join("");
}

window.removeTask = async (index) => {
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    tasks.splice(index, 1);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();
    await saveToCloud("tasks", tasks);
};

// --- MÉTÉO ---
const fetchWeather = () => {
    const url = "https://api.openweathermap.org/data/2.5/forecast?q=Nantes,FR&units=metric&lang=fr&appid=da91d5662517021a00fcf43c95937071";
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (!data.list) return;
            const now = new Date().toISOString().split("T")[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
            const buildHtml = (dateStr) => data.list
                .filter(i => i.dt_txt.startsWith(dateStr)).slice(0, 5)
                .map(i => `
                    <div class="weather-hour">
                        <div>${i.dt_txt.slice(11,16)}</div>
                        <img src="https://openweathermap.org/img/wn/${i.weather[0].icon}.png">
                        <strong>${Math.round(i.main.temp)}°C</strong>
                    </div>`).join("");
            
            const todayEl = document.getElementById("weather-today");
            const tomorrowEl = document.getElementById("weather-tomorrow");
            if (todayEl) todayEl.innerHTML = buildHtml(now);
            if (tomorrowEl) tomorrowEl.innerHTML = buildHtml(tomorrow);
        }).catch(() => console.log("Erreur Météo"));
};

// --- RSS ---
function loadRSS() {
    const rssList = document.getElementById("rss-list");
    const rssPills = document.getElementById("rss-sources-pills");
    if (!rssList) return;

    // On récupère les flux. Si vide ET qu'on n'est pas sur le cloud, on met Le Monde
    let feeds = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
    
    if (feeds.length === 0) {
        // Optionnel : ne mettre Le Monde par défaut que si l'utilisateur n'a jamais rien configuré
        feeds = [{ name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" }];
        localStorage.setItem("rssFeeds", JSON.stringify(feeds));
    }

    // Affichage des badges (pills)
    if (rssPills) {
        rssPills.innerHTML = feeds.map((f, i) => `
            <span class="pill">${f.name} <button onclick="removeFeed(${i})">✕</button></span>
        `).join("");
    }

    const readArticles = JSON.parse(localStorage.getItem("readArticles") || "[]");
    rssList.innerHTML = ""; // On vide avant de remplir

    feeds.forEach(feed => {
        // Utilisation de l'API rss2json pour contourner les problèmes de CORS
        fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
            .then(r => r.json())
            .then(data => {
                if (data.status === 'ok') {
                    data.items.slice(0, 3).forEach(item => {
                        const li = document.createElement("li");
                        li.className = "rss-item" + (readArticles.includes(item.link) ? " read" : "");
                        li.innerHTML = `
                            <a href="${item.link}" target="_blank">
                                <strong>${item.title}</strong><br>
                                <small>${feed.name} — ${new Date(item.pubDate).toLocaleDateString()}</small>
                            </a>`;
                        
                        li.onclick = () => {
                            if(!readArticles.includes(item.link)) {
                                readArticles.push(item.link);
                                localStorage.setItem("readArticles", JSON.stringify(readArticles));
                                li.classList.add("read");
                            }
                        };
                        rssList.appendChild(li);
                    });
                }
            })
            .catch(err => console.error("Erreur flux " + feed.name, err));
    });
}

window.removeFeed = async (index) => {
    let feeds = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
    feeds.splice(index, 1);
    localStorage.setItem("rssFeeds", JSON.stringify(feeds));
    loadRSS();
    await saveToCloud("rssFeeds", feeds);
};

// Fonction d'animation de célébration
function launchCelebration() {
    // On vérifie si la bibliothèque confetti est bien chargée dans le HTML
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#007ACC', '#2ecc71', '#ffcc00'],
            zIndex: 9999 // Pour être sûr que ça passe au-dessus de tout
        });
    } else {
        console.warn("La bibliothèque confetti n'est pas chargée.");
    }
}

// --- FLASHCARD WIDGET (CORRIGÉ) ---
function updateFlashcardWidget() {
    const widgetCount = document.getElementById("widget-count");
    if (!widgetCount) return;

    // Recharge les données pour être à jour avec les autres pages
    const flashcards = JSON.parse(localStorage.getItem("flashcards") || "[]");
    const logData = JSON.parse(localStorage.getItem("revisionLog") || "{}");
    const today = new Date().toISOString().split("T")[0];

    // Calcul dynamique des cartes à réviser
    const countToReview = flashcards.filter(c => {
        if (!c.nextReview) return true;
        return c.nextReview <= today;
    }).length;

    widgetCount.textContent = countToReview === 0 ? "✅ Tout est à jour !" : `${countToReview} carte${countToReview > 1 ? 's' : ''} à réviser`;

    let doneToday = 0;
    if (logData[today]) {
        doneToday = (logData[today].success || 0) + (logData[today].fail || 0);
    }

    // 🔥 AJOUT : Mise à jour du texte Objectif (ex: 3/10)
    const goalText = document.getElementById("widget-goal-text");
    if (goalText) {
        goalText.textContent = `Objectif : ${doneToday}/10`;
    }

    const objectif = 10;
    const progressPercent = Math.min(100, Math.round((doneToday / 10) * 100));
    const progressBar = document.getElementById("widget-progress-bar");
    
    if (goalText) {
        // --- LOGIQUE DE FÉLICITATIONS ---
        if (doneToday >= objectif) {
            goalText.innerHTML = "🎉 <strong>Objectif atteint ! Bravo !</strong>";
            goalText.style.color = "#2ecc71";
            
            // On lance l'animation si c'est pile le moment (ou via un flag pour ne pas spammer)
            if (!sessionStorage.getItem('goalCelebrated')) {
                launchCelebration();
                sessionStorage.setItem('goalCelebrated', 'true');
            }
        } else {
            goalText.textContent = `Objectif : ${doneToday}/${objectif}`;
            goalText.style.color = "gray";
        }
    }
    
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
        progressBar.style.backgroundColor = progressPercent === 100 ? "#2ecc71" : "#007ACC";
    }
}

/* ==== 5. INITIALISATION DES ÉVÉNEMENTS (DOM) ==== */
document.addEventListener("DOMContentLoaded", () => {
    // Initialisation
    renderAll();
    fetchWeather();
    
    // 🔥 Forcer recalcul widget après chargement
    updateFlashcardWidget();

    // Gestion du Thème
    const themeBtn = document.getElementById("toggle-theme");
    if (themeBtn) {
        themeBtn.onclick = async () => {
            let theme = localStorage.getItem("theme") === "light" ? "dark" : "light";
            localStorage.setItem("theme", theme);
            applyTheme(theme);
            await saveToCloud("theme", theme);
        };
    }

    // Ajout Tâche
    const addTaskBtn = document.getElementById("add-task");
    if (addTaskBtn) {
        addTaskBtn.onclick = async () => {
            const input = document.getElementById("new-task");
            const text = input.value.trim();
            if (!text) return;
            const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
            tasks.push(text);
            localStorage.setItem("tasks", JSON.stringify(tasks));
            input.value = "";
            renderTasks();
            await saveToCloud("tasks", tasks);
        };
    }

    // Ajout RSS
    const addRssBtn = document.getElementById("add-rss");
    if (addRssBtn) {
        addRssBtn.addEventListener("click", async () => {
            const nameEl = document.getElementById("rss-name");
            const urlEl = document.getElementById("rss-url");
            if (!nameEl || !urlEl) return;
            
            const name = nameEl.value.trim();
            const url = urlEl.value.trim();
            if (!name || !url) return;
            
            let feeds = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
            feeds.push({ name, url });
            localStorage.setItem("rssFeeds", JSON.stringify(feeds));
            nameEl.value = "";
            urlEl.value = "";
            loadRSS();
            await saveToCloud("rssFeeds", feeds);
        });
    }

    // Menu & Overlay
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    const closeMenu = document.getElementById("close-menu");

    if (menuBtn && sideMenu && overlay) {
        menuBtn.onclick = () => { 
            sideMenu.classList.add("open"); 
            overlay.classList.add("show"); 
        };
        const closeFn = () => { 
            sideMenu.classList.remove("open"); 
            overlay.classList.remove("show"); 
        };
        if (closeMenu) closeMenu.onclick = closeFn;
        overlay.onclick = closeFn;
    }
});
