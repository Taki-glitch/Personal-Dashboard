document.addEventListener("DOMContentLoaded", () => {

    /* --- THÈME --- */
    const toggleThemeBtn = document.getElementById("toggle-theme");
    const applyTheme = (theme) => {
        document.body.classList.toggle("dark", theme === "dark");
        toggleThemeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    };

    let currentTheme = localStorage.getItem("theme") || "light";
    applyTheme(currentTheme);

    toggleThemeBtn.onclick = () => {
        currentTheme = currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("theme", currentTheme);
        applyTheme(currentTheme);
    };

    /* --- TODO LIST --- */
    const taskList = document.getElementById("task-list");
    const newTaskInput = document.getElementById("new-task");
    const addTaskBtn = document.getElementById("add-task");

    const renderTasks = () => {
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        taskList.innerHTML = tasks.map((t, i) => `
            <li>
                <span>${t}</span>
                <button onclick="removeTask(${i})" style="background:none; color:red; width:auto;">✕</button>
            </li>
        `).join("");
    };

    window.removeTask = (index) => {
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks();
    };

    addTaskBtn.onclick = () => {
        const text = newTaskInput.value.trim();
        if (!text) return;
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        tasks.push(text);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        newTaskInput.value = "";
        renderTasks();
    };

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

                document.getElementById("weather-today").innerHTML = buildHtml(now);
                document.getElementById("weather-tomorrow").innerHTML = buildHtml(tomorrow);
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
        rssList.innerHTML = "<p>Chargement...</p>";
        rssPills.innerHTML = myFeeds.map((f, i) => `
            <span class="pill">${f.name} <button onclick="removeFeed(${i})">✕</button></span>
        `).join("");

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

    addRssBtn.onclick = () => {
        const name = document.getElementById("rss-name").value.trim();
        const url = document.getElementById("rss-url").value.trim();
        if (name && url) {
            myFeeds.push({ name, url });
            localStorage.setItem("rssFeeds", JSON.stringify(myFeeds));
            loadRSS();
        }
    };

    /* ==== BOUTON MENU ==== */
    renderTasks();
    fetchWeather();
    loadRSS();
    document.getElementById("refresh-rss").onclick = loadRSS;
    
    const menuBtn = document.getElementById("menu-btn");
	const sideMenu = document.getElementById("side-menu");
	const closeMenu = document.getElementById("close-menu");
	const overlay = document.getElementById("overlay");

	menuBtn.addEventListener("click", () => {
  		sideMenu.classList.add("open");
  		overlay.classList.add("show");
	});

	closeMenu.addEventListener("click", closeMenuFn);
	overlay.addEventListener("click", closeMenuFn);

	function closeMenuFn() {
  		sideMenu.classList.remove("open");
  		overlay.classList.remove("show");
	}
});
