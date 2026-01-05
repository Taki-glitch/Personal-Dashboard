document.addEventListener("DOMContentLoaded", () => {

  /* ===== THÈME ===== */
  const toggleThemeBtn = document.getElementById("toggle-theme");

  function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    toggleThemeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  toggleThemeBtn.addEventListener("click", () => {
    const theme = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  });

  /* ===== TODO ===== */
  const taskList = document.getElementById("task-list");
  const newTask = document.getElementById("new-task");

  function renderTasks() {
    taskList.innerHTML = "";
    (JSON.parse(localStorage.getItem("tasks") || "[]")).forEach((task, i) => {
      const li = document.createElement("li");
      li.textContent = task;
      li.onclick = () => {
        const tasks = JSON.parse(localStorage.getItem("tasks"));
        tasks.splice(i, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks();
      };
      taskList.appendChild(li);
    });
  }

  document.getElementById("add-task").onclick = () => {
    if (!newTask.value.trim()) return;
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    tasks.push(newTask.value.trim());
    localStorage.setItem("tasks", JSON.stringify(tasks));
    newTask.value = "";
    renderTasks();
  };

  renderTasks();

  /* ===== MÉTÉO ===== */
  fetch("https://api.openweathermap.org/data/2.5/forecast?q=Nantes,FR&units=metric&lang=fr&appid=da91d5662517021a00fcf43c95937071")
    .then(r => r.json())
    .then(data => {
      const now = new Date();
      ["weather-today", "weather-tomorrow"].forEach((id, d) => {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const target = date.toISOString().split("T")[0];
        document.getElementById(id).innerHTML = data.list
          .filter(i => i.dt_txt.startsWith(target))
          .slice(0, 6)
          .map(i => `
            <div class="weather-hour">
              <div>${i.dt_txt.slice(11,16)}</div>
              <img src="https://openweathermap.org/img/wn/${i.weather[0].icon}@2x.png">
              <div>${Math.round(i.main.temp)}°C</div>
            </div>`).join("");
      });
    });

  /* ===== RSS ===== */
  const rssList = document.getElementById("rss-list");
  const read = JSON.parse(localStorage.getItem("readArticles") || "[]");

  function loadRSS() {
    rssList.innerHTML = "";
    [
      { url: "https://www.lemonde.fr/rss/une.xml", name: "Le Monde", icon: "https://www.lemonde.fr/favicon.ico" },
      { url: "https://www.francetvinfo.fr/titres.rss", name: "France Info", icon: "https://www.francetvinfo.fr/favicon.ico" }
    ].forEach(feed => {
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
        .then(r => r.json())
        .then(data => data.items.slice(0,5).forEach(item => {
          const li = document.createElement("li");
          li.className = "rss-item" + (read.includes(item.link) ? " read" : "");
          li.innerHTML = `
            <a href="${item.link}" target="_blank">
              <img class="rss-icon" src="${feed.icon}">
              <div>
                <div class="rss-title">${item.title}</div>
                <div class="rss-meta">${feed.name}</div>
              </div>
            </a>`;
          li.onclick = () => {
            if (!read.includes(item.link)) {
              read.push(item.link);
              localStorage.setItem("readArticles", JSON.stringify(read));
              li.classList.add("read");
            }
          };
          rssList.appendChild(li);
        }));
    });
  }

  document.getElementById("refresh-rss").onclick = loadRSS;
  loadRSS();

});