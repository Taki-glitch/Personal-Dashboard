document.addEventListener("DOMContentLoaded", () => {

  /********************************************************
   * ✅ TO‑DO LIST (stockée en local)
   ********************************************************/
  const taskList = document.getElementById("task-list");
  const newTask = document.getElementById("new-task");
  const addTaskBtn = document.getElementById("add-task");

  function getTasks() {
    return JSON.parse(localStorage.getItem("tasks") || "[]");
  }

  function saveTasks(tasks) {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function renderTasks() {
    taskList.innerHTML = "";
    getTasks().forEach((task, index) => {
      const li = document.createElement("li");
      li.textContent = task;
      li.title = "Cliquer pour supprimer";
      li.addEventListener("click", () => {
        const tasks = getTasks();
        tasks.splice(index, 1);
        saveTasks(tasks);
        renderTasks();
      });
      taskList.appendChild(li);
    });
  }

  addTaskBtn.addEventListener("click", () => {
    if (newTask.value.trim()) {
      const tasks = getTasks();
      tasks.push(newTask.value.trim());
      saveTasks(tasks);
      newTask.value = "";
      renderTasks();
    }
  });

  renderTasks();

  /********************************************************
   * 🌤️ MÉTÉO (OpenWeatherMap)
   ********************************************************/
  const weatherTemp = document.getElementById("weather-temp");

  const WEATHER_API_KEY = "da91d5662517021a00fcf43c95937071";
  const CITY = "Paris";
  const COUNTRY = "FR";

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${CITY},${COUNTRY}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`)
    .then(response => response.json())
    .then(data => {
      if (data.main) {
        weatherTemp.textContent = Math.round(data.main.temp);
      } else {
        weatherTemp.textContent = "N/A";
      }
    })
    .catch(error => {
      console.error("Erreur météo :", error);
      weatherTemp.textContent = "Erreur";
    });

  /********************************************************
   * 📰 FLUX RSS
   ********************************************************/
  const rssList = document.getElementById("rss-list");

  const RSS_FEEDS = [
    "https://www.lemonde.fr/rss/une.xml",
    "https://www.francetvinfo.fr/titres.rss"
  ];

  RSS_FEEDS.forEach(feed => {
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`)
      .then(response => response.json())
      .then(data => {
        data.items.slice(0, 5).forEach(item => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${item.link}" target="_blank">${item.title}</a>`;
          rssList.appendChild(li);
        });
      })
      .catch(error => console.error("Erreur RSS :", error));
  });

});