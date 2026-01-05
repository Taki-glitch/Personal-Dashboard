document.addEventListener("DOMContentLoaded", () => {

  /********** TO-DO LIST **********/
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
    getTasks().forEach((task, i) => {
      const li = document.createElement("li");
      li.textContent = task;
      li.addEventListener("click", () => {
        const tasks = getTasks();
        tasks.splice(i, 1);
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

  /********** MÉTÉO – AUJOURD’HUI & DEMAIN (PRÉVISIONS) **********/
	const WEATHER_API_KEY = "da91d5662517021a00fcf43c95937071";
	const CITY = "Nantes";
	const COUNTRY = "FR";

	const todayContainer = document.getElementById("weather-today");
	const tomorrowContainer = document.getElementById("weather-tomorrow");

	fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CITY},${COUNTRY}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`)
  		.then(res => res.json())
  		.then(data => {

    		const now = new Date();
    		const today = now.toISOString().split("T")[0];

    		const tomorrowDate = new Date(now);
    		tomorrowDate.setDate(now.getDate() + 1);
    		const tomorrow = tomorrowDate.toISOString().split("T")[0];

    		const targetHours = ["06", "09", "12", "15", "18", "21"];

    		function renderForecast(container, date, onlyFuture = false) {
      		container.innerHTML = "";

      		data.list.forEach(item => {
        		const [itemDate, itemTime] = item.dt_txt.split(" ");
        		const hour = itemTime.slice(0, 2);

        		if (
          		itemDate === date &&
          		targetHours.includes(hour) &&
          		(!onlyFuture || new Date(item.dt_txt) > now)
        		) {
          		const temp = Math.round(item.main.temp);
          		const icon = item.weather[0].icon;
          		const desc = item.weather[0].description;

          		const div = document.createElement("div");
          		div.className = "weather-hour";
          		div.innerHTML = `
            		<div class="hour">${hour}:00</div>
            		<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">
            		<div class="temp">${temp}°C</div>
          		`;

          		container.appendChild(div);
        		}
      		});
    		}

    		// Aujourd’hui → seulement les heures futures
    		renderForecast(todayContainer, today, true);

    		// Demain → journée complète
    		renderForecast(tomorrowContainer, tomorrow, false);
  		})
  		.catch(err => {
    		console.error("Erreur météo :", err);
  		});

  /********** FLUX RSS **********/
const rssList = document.getElementById("rss-list");

const RSS_FEEDS = [
  { url: "https://www.lemonde.fr/rss/une.xml", source: "Le Monde" },
  { url: "https://www.francetvinfo.fr/titres.rss", source: "France Info" }
];

RSS_FEEDS.forEach(feed => {
  fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
    .then(res => res.json())
    .then(data => {
      data.items.slice(0, 5).forEach(item => {
        const li = document.createElement("li");
        li.className = "rss-item";

        const date = new Date(item.pubDate).toLocaleDateString("fr-FR");

        li.innerHTML = `
          <a href="${item.link}" target="_blank">
            <div class="rss-title">${item.title}</div>
            <div class="rss-meta">
              <span>${feed.source}</span> • <span>${date}</span>
            </div>
          </a>
        `;

        rssList.appendChild(li);
      });
    })
    .catch(err => console.error("Erreur RSS :", err));
});


});
