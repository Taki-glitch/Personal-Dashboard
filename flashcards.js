/* =====================================
   VARIABLES GLOBALES
===================================== */
let flashcards = [];
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;

/* =====================================
   UTILITAIRES DATE
===================================== */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/* =====================================
   STOCKAGE LOCAL + LISTE GITHUB
===================================== */
async function loadFlashcards() {
  const localData = localStorage.getItem("flashcards");
  flashcards = localData ? JSON.parse(localData) : [];

  try {
    const response = await fetch("https://raw.githubusercontent.com/Taki-glitch/Personal-Dashboard/main/list.json");
    if (!response.ok) throw new Error("Impossible de charger la liste de base");
    const baseFlashcards = await response.json();

    const existingSet = new Set(flashcards.map(c => c.russe.toLowerCase() + "|" + c.francais.toLowerCase()));

    baseFlashcards.forEach(c => {
        const key = c.russe.toLowerCase() + "|" + c.francais.toLowerCase();
        if (!existingSet.has(key)) {
            const tags = c.tag ? [c.tag] : (c.tags || []);
            const newCard = createFlashcard(c.russe, c.francais, tags);
            newCard.id = Date.now() + Math.floor(Math.random() * 1000000);
            flashcards.push(newCard);
        }
    });
    saveFlashcards();
  } catch (err) {
    console.error("Erreur chargement GitHub :", err);
  }
}

function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

function createFlashcard(russe, francais, tags = []) {
  return {
    id: Date.now(),
    russe,
    francais,
    tags,
    repetitions: 0,
    erreurs: 0,
    interval: 1,
    ease: 2.5,
    nextReview: todayISO()
  };
}

/* =====================================
   LOGIQUE SRS (Spaced Repetition)
===================================== */
function applyGrade(card, grade) {
  const d = new Date();
  if (grade === 0) { // Échec
    card.erreurs++;
    card.repetitions = 0;
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
    d.setDate(d.getDate() + 1);
  } else if (grade === 1) { // Difficile
    card.repetitions++;
    card.interval = Math.max(1, Math.round(card.interval * 1.5));
    card.ease = Math.max(1.3, card.ease - 0.05);
    d.setDate(d.getDate() + card.interval);
  } else if (grade === 2) { // Connu
    card.repetitions++;
    card.interval = Math.round(card.interval * card.ease);
    card.ease += 0.1;
    d.setDate(d.getDate() + card.interval);
  }
  card.nextReview = d.toISOString().split("T")[0];
}

/* =====================================
   INTERFACE DE RÉVISION
===================================== */
function startReviewSession() {
    const tag = document.getElementById("tagFilter").value;
    const today = todayISO();
    
    // Filtrage par date et par tag
    reviewPack = flashcards.filter(c => c.nextReview <= today);
    if (tag !== "all") {
        reviewPack = reviewPack.filter(c => c.tags.includes(tag));
    }

    currentIndex = 0;

    if (reviewPack.length === 0) {
        document.getElementById("reviewCard").innerHTML = "🎉 <br> Aucune carte à réviser pour le moment !";
        document.getElementById("startReview").style.display = "inline-block";
        return;
    }

    // Gestion de l'affichage des boutons
    document.getElementById("startReview").style.display = "none";
    document.getElementById("showAnswer").style.display = "inline-block";
    showCard();
}

function showCard() {
    currentCard = reviewPack[currentIndex];
    const cardArea = document.getElementById("reviewCard");
    
    cardArea.innerHTML = `
        <small style="color: gray;">Card ${currentIndex + 1} / ${reviewPack.length}</small>
        <h1 style="font-size: 2.5rem; margin: 10px 0;">${currentCard.russe}</h1>
        <p style="font-style: italic; color: #007ACC;">${currentCard.tags.join(', ')}</p>
    `;

    // Cacher les boutons de réponse tant qu'on n'a pas cliqué sur "Voir"
    document.getElementById("know").style.display = "none";
    document.getElementById("dontKnow").style.display = "none";
    document.getElementById("hard").style.display = "none";
    document.getElementById("showAnswer").style.display = "inline-block";
}

function revealAnswer() {
    const cardArea = document.getElementById("reviewCard");
    cardArea.innerHTML += `<hr style="width:50%"><h2 style="color: #2ecc71;">${currentCard.francais}</h2>`;
    
    document.getElementById("showAnswer").style.display = "none";
    document.getElementById("know").style.display = "inline-block";
    document.getElementById("dontKnow").style.display = "inline-block";
    document.getElementById("hard").style.display = "inline-block";
}

function handleGrade(grade) {
    applyGrade(currentCard, grade);
    saveFlashcards();
    logRevision(grade);
    
    currentIndex++;
    if (currentIndex < reviewPack.length) {
        showCard();
    } else {
        document.getElementById("reviewCard").innerHTML = "✅ Session terminée ! Bravo.";
        document.getElementById("know").style.display = "none";
        document.getElementById("dontKnow").style.display = "none";
        document.getElementById("hard").style.display = "none";
        document.getElementById("startReview").style.display = "inline-block";
        updateStats();
        updateChart();
    }
}

/* =====================================
   STATISTIQUES & GRAPHIQUES
===================================== */
function updateStats() {
  const today = todayISO();
  document.getElementById("stat-total").textContent = flashcards.length;
  document.getElementById("stat-new").textContent = flashcards.filter(c => c.repetitions === 0).length;
  document.getElementById("stat-review").textContent = flashcards.filter(c => c.nextReview <= today).length;
  document.getElementById("stat-known").textContent = flashcards.filter(c => c.repetitions >= 5).length;
  
  let reps = 0, errs = 0;
  flashcards.forEach(c => { reps += c.repetitions; errs += c.erreurs; });
  const success = reps === 0 ? 0 : Math.round(((reps - errs) / reps) * 100);
  document.getElementById("stat-success").textContent = success + "%";
  
  updatePerformanceDashboard();
}

function logRevision(grade) {
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const today = todayISO();
  if (!log[today]) log[today] = { revisited: 0, success: 0, fail: 0 };
  log[today].revisited++;
  grade === 2 ? log[today].success++ : log[today].fail++;
  localStorage.setItem("revisionLog", JSON.stringify(log));
}

function updateChart() {
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const labels = Object.keys(log).sort().slice(-7); // On prend les 7 derniers jours
  
  const ctx = document.getElementById("progressChart");
  if (!ctx) return; // Sécurité si le canvas n'existe pas

  const chartCtx = ctx.getContext("2d");
  
  // Détruire l'ancien graphique s'il existe pour éviter les superpositions au survol
  if (window.progressChart instanceof Chart) {
    window.progressChart.destroy();
  }
  
  // Si pas de données, on affiche un message ou un graphique vide propre
  const successData = labels.map(d => log[d].success || 0);
  const failData = labels.map(d => log[d].fail || 0);

  window.progressChart = new Chart(chartCtx, {
    type: "bar",
    data: {
      labels: labels.length > 0 ? labels : [todayISO()],
      datasets: [
        { 
          label: "✅ Réussites", 
          data: successData.length > 0 ? successData : [0], 
          backgroundColor: '#2ecc71' 
        },
        { 
          label: "❌ Échecs", 
          data: failData.length > 0 ? failData : [0], 
          backgroundColor: '#e74c3c' 
        }
      ]
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false, // Permet au CSS de contrôler la hauteur
      scales: { 
        y: { 
          beginAtZero: true, 
          ticks: { stepSize: 1, precision: 0 } 
        } 
      }
    }
  });
}

function updatePerformanceDashboard() {
    const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
    const today = todayISO();
    const data = log[today] || { revisited: 0, success: 0, fail: 0 };
    
    // 1. Mise à jour des textes simples
    document.getElementById("todayRevised").textContent = `Cartes révisées aujourd'hui : ${data.revisited}`;
    document.getElementById("todaySuccess").textContent = `Réussites : ${data.success} / Échecs : ${data.fail}`;

    // 2. Calcul et affichage des cartes pour DEMAIN
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split("T")[0];
    
    // On cherche les cartes dont la date de révision est exactement demain
    const priority = flashcards.filter(c => c.nextReview === tomorrowISO);
    const priorityList = document.getElementById("priorityList");
    
    if (priorityList) {
        priorityList.innerHTML = ""; // On vide la liste
        if (priority.length === 0) {
            priorityList.innerHTML = "<li>Aucune carte prévue pour demain.</li>";
        } else {
            priority.forEach(c => {
                const li = document.createElement("li");
                li.innerHTML = `<strong>${c.russe}</strong> <span style="color:gray;">(${c.francais})</span>`;
                priorityList.appendChild(li);
            });
        }
    }

    // 3. Calcul et affichage du progrès par CATÉGORIE (Tags)
    const tagMap = {};
    flashcards.forEach(c => {
        const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ["Divers"]);
        tags.forEach(t => {
            if (!tagMap[t]) tagMap[t] = { total: 0, mastered: 0 };
            tagMap[t].total++;
            // On considère une carte maîtrisée si elle a plus de 4 répétitions réussies
            if (c.repetitions >= 4) tagMap[t].mastered++;
        });
    });

    const tagList = document.getElementById("tagList");
    if (tagList) {
        tagList.innerHTML = "";
        const entries = Object.entries(tagMap);
        
        if (entries.length === 0) {
            tagList.innerHTML = "<li>Aucune catégorie détectée.</li>";
        } else {
            entries.forEach(([tag, val]) => {
                const li = document.createElement("li");
                const percent = Math.round((val.mastered / val.total) * 100);
                li.innerHTML = `
                    <div style="width:100%">
                        <strong>${tag}</strong> : ${val.mastered}/${val.total} maîtrisés (${percent}%)
                        <div style="background:#eee; height:5px; border-radius:3px; margin-top:5px;">
                            <div style="background:#007ACC; width:${percent}%; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>`;
                tagList.appendChild(li);
            });
        }
    }
}

function updateTagFilter() {
  const select = document.getElementById("tagFilter");
  const tagsSet = new Set();
  flashcards.forEach(c => c.tags.forEach(t => tagsSet.add(t)));
  
  const current = select.value;
  select.innerHTML = '<option value="all">Tous les tags</option>';
  [...tagsSet].sort().forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag; opt.textContent = tag;
    select.appendChild(opt);
  });
  select.value = current;
}

function displayFlashcards() {
  const list = document.getElementById("flashcardsList");
  list.innerHTML = "";
  flashcards.slice(-10).reverse().forEach(card => { // 10 dernières
    const li = document.createElement("li");
    li.innerHTML = `<span>${card.russe} - ${card.francais}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "🗑️";
    btn.onclick = () => { flashcards = flashcards.filter(c => c.id !== card.id); saveFlashcards(); displayFlashcards(); updateStats(); };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

/* =====================================
   INITIALISATION & ÉVÉNEMENTS
===================================== */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Menu et Thème
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const closeMenu = document.getElementById("close-menu");
    const overlay = document.getElementById("overlay");
    const toggleThemeBtn = document.getElementById("toggle-theme");

    const closeMenuFn = () => { sideMenu.classList.remove("open"); overlay.classList.remove("show"); };
    menuBtn.onclick = () => { sideMenu.classList.add("open"); overlay.classList.add("show"); };
    closeMenu.onclick = closeMenuFn;
    overlay.onclick = closeMenuFn;

    const applyTheme = (t) => {
        document.body.classList.toggle("dark", t === "dark");
        toggleThemeBtn.textContent = t === "dark" ? "☀️" : "🌙";
    };
    let theme = localStorage.getItem("theme") || "light";
    applyTheme(theme);
    toggleThemeBtn.onclick = () => { theme = theme === "light" ? "dark" : "light"; localStorage.setItem("theme", theme); applyTheme(theme); };

    // 2. Boutons de Révision
    document.getElementById("startReview").onclick = startReviewSession;
    document.getElementById("showAnswer").onclick = revealAnswer;
    document.getElementById("know").onclick = () => handleGrade(2);
    document.getElementById("hard").onclick = () => handleGrade(1);
    document.getElementById("dontKnow").onclick = () => handleGrade(0);

    // 3. Ajout de carte
    document.getElementById("addFlashcard").onclick = () => {
        const r = document.getElementById("russe").value;
        const f = document.getElementById("francais").value;
        const t = document.getElementById("tag").value;
        if(r && f) {
            flashcards.push(createFlashcard(r, f, t ? [t] : []));
            saveFlashcards();
            displayFlashcards();
            updateStats();
            document.getElementById("russe").value = "";
            document.getElementById("francais").value = "";
        }
    };

    // 4. Charger les données
    loadFlashcards().then(() => {
        updateStats();
        displayFlashcards();
        updateTagFilter();
        updatePerformanceDashboard();
        setTimeout(updateChart, 500);
    });
});
