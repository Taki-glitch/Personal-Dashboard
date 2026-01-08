/* ==== IMPORTS ==== */
import { auth, logout } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ==== LOGIQUE D'AUTHENTIFICATION ==== */
onAuthStateChanged(auth, (user) => {
    const userStatus = document.getElementById("user-status");
    const userInfo = document.getElementById("user-info");
    const userGuest = document.getElementById("user-guest");
    const userName = document.getElementById("user-name");
    const logoutBtn = document.getElementById("btn-logout");

    if (!userStatus || !userInfo || !userGuest) return;
    	
    if (user) {
        userStatus.style.display = "none";
        userGuest.style.display = "none";
        userInfo.style.display = "block";
        userName.textContent = user.displayName || user.email;
        
        // On configure le clic seulement si le bouton est là
        if (logoutBtn) logoutBtn.onclick = () => logout();
        
        console.log("Connecté :", user.uid);
    } else {
        userStatus.textContent = "Mode Local";
        userStatus.style.display = "block";
        userGuest.style.display = "block";
        userInfo.style.display = "none";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    /* --- THÈME --- */
    const toggleThemeBtn = document.getElementById("toggle-theme");
    const applyTheme = (theme) => {
        document.body.classList.toggle("dark", theme === "dark");
        if(toggleThemeBtn) toggleThemeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    };

    let currentTheme = localStorage.getItem("theme") || "light";
    applyTheme(currentTheme);

    if(toggleThemeBtn) {
        toggleThemeBtn.onclick = () => {
            currentTheme = currentTheme === "light" ? "dark" : "light";
            localStorage.setItem("theme", currentTheme);
            applyTheme(currentTheme);
        };
    }

    /* --- TODO LIST --- */
    const taskList = document.getElementById("task-list");
    const newTaskInput = document.getElementById("new-task");
    const addTaskBtn = document.getElementById("add-task");

    const renderTasks = () => {
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        if(taskList) {
            taskList.innerHTML = tasks.map((t, i) => `
                <li>
                    <span>${t}</span>
                    <button onclick="removeTask(${i})" style="background:none; color:red; width:auto;">✕</button>
                </li>
            `).join("");
        }
    };

    // On attache la fonction à window pour qu'elle soit visible depuis le HTML (onclick)
    window.removeTask = (index) => {
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks();
    };

    if(addTaskBtn) {
        addTaskBtn.onclick = () => {
            const text = newTaskInput.value.trim();
            if (!text) return;
            const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
            tasks.push(text);
            localStorage.setItem("tasks", JSON.stringify(tasks));
            newTaskInput.value = "";
            renderTasks();
        };
    }

    /* --- MÉTÉO --- */
    const fetchWeather = () => {
        const url = "https://api.openweathermap.org/data/2.5/forecast?q=Nantes,FR&units=metric&lang=fr&appid=da91d5662517021a00fcf43c95937071";
        fetch(url)
            .then(r => r.json())
            .then(data => {
                const now = new Date().toISOString().split("T")[0];
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

                const buildHtml = (dateStr) => data.list
                    .filter(i => i.dt_txt.startsWith(dateStr))
                    .slice(0, 5)
                    .map(i => `
                        <div class="weather-hour">
                            <div>${i.dt_txt.slice(11,16)}</div>
                            <img src="https://openweathermap.org/img/wn/${i.weather[0].icon}.png">
                            <strong>${Math.round(i.main.temp)}°C</strong>
                        </div>`).join("");

                const todayEl = document.getElementById("weather-today");
                const tomorrowEl = document.getElementById("weather-tomorrow");
                if(todayEl) todayEl.innerHTML = buildHtml(now);
                if(tomorrowEl) tomorrowEl.innerHTML = buildHtml(tomorrow);
            }).catch(() => console.log("Erreur Météo"));
    };

    /* --- RSS DYNAMIQUE --- */
    const rssList = document.getElementById("rss-list");
    const rssPills = document.getElementById("rss-sources-pills");
    const addRssBtn = document.getElementById("add-rss");

    let myFeeds = JSON.parse(localStorage.getItem("rssFeeds")) || [
        { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
        { name: "France Info", url: "https://www.francetvinfo.fr/titres.rss" }
    ];

    const loadRSS = () => {
        if(!rssList) return;
        rssList.innerHTML = "<p>Chargement...</p>";
        if(rssPills) {
            rssPills.innerHTML = myFeeds.map((f, i) => `
                <span class="pill">${f.name} <button onclick="removeFeed(${i})">✕</button></span>
            `).join("");
        }

        const readArticles = JSON.parse(localStorage.getItem("readArticles") || "[]");
        rssList.innerHTML = "";

        myFeeds.forEach(feed => {
            fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'ok') {
                        data.items.slice(0, 3).forEach(item => {
                            const li = document.createElement("li");
                            li.className = "rss-item" + (readArticles.includes(item.link) ? " read" : "");
                            li.innerHTML = `
                                <a href="${item.link}" target="_blank">
                                    <div><strong>${item.title}</strong></div>
                                    <div class="rss-meta">${feed.name}</div>
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
                });
        });
    };

    window.removeFeed = (index) => {
        myFeeds.splice(index, 1);
        localStorage.setItem("rssFeeds", JSON.stringify(myFeeds));
        loadRSS();
    };

    if(addRssBtn) {
        addRssBtn.onclick = () => {
            const name = document.getElementById("rss-name").value.trim();
            const url = document.getElementById("rss-url").value.trim();
            if (name && url) {
                myFeeds.push({ name, url });
                localStorage.setItem("rssFeeds", JSON.stringify(myFeeds));
                loadRSS();
            }
        };
    }

    /* --- FLASHCARD WIDGET --- */
    const updateFlashcardWidget = () => {
        const localData = localStorage.getItem("flashcards");
        const logData = localStorage.getItem("revisionLog");
        const widget = document.getElementById("flashcard-widget");
        const widgetCount = document.getElementById("widget-count");
        
        if (!widgetCount) return;

        const today = new Date().toISOString().split("T")[0];
        const now = new Date();

        let countToReview = 0;
        let flashcards = [];
        if (localData) {
            flashcards = JSON.parse(localData);
            countToReview = flashcards.filter(c => c.nextReview <= today).length;
        }

        let doneToday = 0;
        let timeSpent = 0;
        const dailyGoal = 10; 

        if (logData) {
            const log = JSON.parse(logData);
            if (log[today]) {
                doneToday = (log[today].success || 0) + (log[today].fail || 0);
                timeSpent = log[today].timeSeconds || 0; 
            }
        }

        // Mise à jour visuelle (Chrono, Barre de progrès...)
        const timerDisplay = document.getElementById("sprint-timer");
        if (timerDisplay) {
            const mins = Math.floor(timeSpent / 60).toString().padStart(2, '0');
            const secs = (timeSpent % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `⏱️ ${mins}:${secs}`;
        }

        if (widget && now.getHours() >= 18 && doneToday < dailyGoal) {
            widget.classList.add("sprint-alert");
        } else if(widget) {
            widget.classList.remove("sprint-alert");
        }

        widgetCount.textContent = countToReview === 0 ? "✅ Tout est à jour !" : `${countToReview} carte${countToReview > 1 ? 's' : ''} à réviser`;
        
        const progressBar = document.getElementById("widget-progress-bar");
        if (progressBar) {
            const progressPercent = Math.min(100, Math.round((doneToday / dailyGoal) * 100));
            progressBar.style.width = `${progressPercent}%`;
            progressBar.style.backgroundColor = progressPercent >= 100 ? "#2ecc71" : "#007ACC";
        }
    };

    /* ==== INITIALISATION ==== */
    renderTasks();
    fetchWeather();
    loadRSS();
    updateFlashcardWidget();
    
    const refreshRss = document.getElementById("refresh-rss");
    if(refreshRss) refreshRss.onclick = loadRSS;
    
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const closeMenu = document.getElementById("close-menu");
    const overlay = document.getElementById("overlay");

    if(menuBtn) {
        menuBtn.addEventListener("click", () => {
            sideMenu.classList.add("open");
            overlay.classList.add("show");
        });
    }

    const closeMenuFn = () => {
        sideMenu.classList.remove("open");
        overlay.classList.remove("show");
    };

    if(closeMenu) closeMenu.addEventListener("click", closeMenuFn);
    if(overlay) overlay.addEventListener("click", closeMenuFn);
});
