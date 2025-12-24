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

  /********** MÉTÉO HORAIRE – NANTES **********/
	const WEATHER_API_KEY = "da91d5662517021a00fcf43c95937071";
	const CITY = "Nantes";
	const COUNTRY = "FR";
	const weatherContainer = document.getElementById("weather-hours");

	fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CITY},${COUNTRY}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`)
  		.then(res => res.json())
  		.then(data => {

    		const today = new Date().toISOString().split("T")[0];

    		// Heures souhaitées
    		const targetHours = ["06", "09", "12", "15", "18", "21"];

    		weatherContainer.innerHTML = "";

    		data.list.forEach(item => {
      		const [date, time] = item.dt_txt.split(" ");
      		const hour = time.slice(0, 2);

      		// Aujourd’hui + heures ciblées
      		if (date === today && targetHours.includes(hour)) {

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

        		weatherContainer.appendChild(div);
      		}
    		});

    // Sécurité : si aucune donnée (ex : tôt le matin)
    if (!weatherContainer.children.length) {
      weatherContainer.innerHTML = "<p>Météo du jour indisponible</p>";
    }

  })
  .catch(err => {
    console.error("Erreur météo :", err);
    weatherContainer.innerHTML = "<p>Météo indisponible</p>";
  });

  /********** FLUX RSS **********/
  const rssList = document.getElementById("rss-list");
  const RSS_FEEDS = [
    "https://www.lemonde.fr/rss/une.xml",
    "https://www.francetvinfo.fr/titres.rss"
  ];

  RSS_FEEDS.forEach(feed => {
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`)
      .then(res => res.json())
      .then(data => {
        data.items.slice(0, 5).forEach(item => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${item.link}" target="_blank">${item.title}</a>`;
          rssList.appendChild(li);
        });
      })
      .catch(err => console.error("Erreur RSS :", err));
  });

});
