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
    } else {
        console.log("Mode Local actif");
        renderAll();
    }
});

function updateUserUI(user) {
    const status = document.getElementById("user-status");
    const info = document.getElementById("user-info");
    const guest = document.getElementById("user-guest");
    const name = document.getElementById("user-name");
    const logoutBtn = document.getElementById("btn-logout");

    if (!status) return;

    if (user) {
        status.style.display = "none";
        guest.style.display = "none";
        info.style.display = "block";
        if (name) name.textContent = user.displayName || user.email;
        if (logoutBtn) logoutBtn.onclick = () => logout();
    } else {
        status.textContent = "Mode Local";
        status.style.display = "block";
        guest.style.display = "block";
        info.style.display = "none";
    }
}

async function loadFromCloud() {
    try {
        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const data = snap.data();
            if (data.tasks) localStorage.setItem("tasks", JSON.stringify(data.tasks));
            if (data.rssFeeds) localStorage.setItem("rssFeeds", JSON.stringify(data.rssFeeds));
            if (data.flashcards) localStorage.setItem("flashcards", JSON.stringify(data.flashcards));
            if (data.revisionLog) localStorage.setItem("revisionLog", JSON.stringify(data.revisionLog));
            if (data.theme) localStorage.setItem("theme", data.theme);
            
            renderAll();
        }
    } catch (error) {
        console.error("Erreur de chargement Cloud :", error);
    }
}

async function saveToCloud(field, value) {
    if (!currentUser) return; 
    try {
        const ref = doc(db, "users", currentUser.uid);
        await updateDoc(ref, { [field]: value });
    } catch (error) {
        console.error("Erreur de sauvegarde Cloud :", error);
    }
}

/* ==== 3. FONCTIONS DE RENDU GLOBAL ==== */
function renderAll() {
    renderTasks();
    loadRSS();
    updateFlashcardWidget();
    displayWordOfTheDay(); // Ajouté : Affiche le mot russe
    const theme = localStorage.getItem("theme") || "light";
    applyTheme(theme);
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

    let feeds = JSON.parse(localStorage.getItem("rssFeeds")) || [
        { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" }
    ];

    if (rssPills) {
        rssPills.innerHTML = feeds.map((f, i) => `
            <span class="pill">${f.name} <button onclick="removeFeed(${i})">✕</button></span>
        `).join("");
    }

    const readArticles = JSON.parse(localStorage.getItem("readArticles") || "[]");
    rssList.innerHTML = "";

    feeds.forEach(feed => {
        fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
            .then(r => r.json())
            .then(data => {
                if (data.status === 'ok') {
                    data.items.slice(0, 3).forEach(item => {
                        const li = document.createElement("li");
                        li.className = "rss-item" + (readArticles.includes(item.link) ? " read" : "");
                        li.innerHTML = `<a href="${item.link}" target="_blank"><strong>${item.title}</strong><br><small>${feed.name}</small></a>`;
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
            });
    });
}

window.removeFeed = async (index) => {
    let feeds = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
    feeds.splice(index, 1);
    localStorage.setItem("rssFeeds", JSON.stringify(feeds));
    loadRSS();
    await saveToCloud("rssFeeds", feeds);
};

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
    
    const progressPercent = Math.min(100, Math.round((doneToday / 10) * 100));
    const progressBar = document.getElementById("widget-progress-bar");
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
