/* =====================================
    VARIABLES GLOBALES
===================================== */
let flashcards = [];
let revisionLog = {};
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;
let startTime = Date.now(); // Démarrage du chrono pour le mode Sprint

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

async function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
  localStorage.setItem("revisionLog", JSON.stringify(revisionLog));
  
  // Si tu as accès à auth et db dans ce fichier :
  if (typeof auth !== 'undefined' && auth.currentUser) {
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      const ref = doc(db, "users", auth.currentUser.uid);
      await updateDoc(ref, { 
          flashcards: flashcards,
          revisionLog: revisionLog 
      });
  }
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
    startTime = Date.now(); // Reset du chrono au début de la session
    
    reviewPack = flashcards.filter(c => c.nextReview <= today);
    if (tag !== "all") {
        reviewPack = reviewPack.filter(c => c.tags.includes(tag));
    }

    currentIndex = 0;

    if (reviewPack.length === 0) {
        document.getElementById("reviewCard").innerHTML = "🎉 <br> Aucune carte à réviser !";
        document.getElementById("startReview").style.display = "inline-block";
        return;
    }

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
function logRevision(grade) {
    const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
    const today = todayISO();
    
    if (!log[today]) log[today] = { success: 0, fail: 0, timeSeconds: 0 };
    
    if (grade === 2 || grade === 1) {
        log[today].success++;
    } else {
        log[today].fail++;
    }

    // Calcul du temps pour le mode Sprint
    const sessionTime = Math.round((Date.now() - startTime) / 1000);
    log[today].timeSeconds += sessionTime;
    startTime = Date.now(); // On relance le chrono pour la carte suivante

    localStorage.setItem("revisionLog", JSON.stringify(log));
}

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

function updateChart() {
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const labels = Object.keys(log).sort().slice(-7);
  const ctx = document.getElementById("progressChart");
  if (!ctx) return;
  const chartCtx = ctx.getContext("2d");
  if (window.progressChart instanceof Chart) window.progressChart.destroy();
  
  window.progressChart = new Chart(chartCtx, {
    type: "bar",
    data: {
      labels: labels.length > 0 ? labels : [todayISO()],
      datasets: [
        { label: "✅ Réussites", data: labels.map(d => log[d].success || 0), backgroundColor: '#2ecc71' },
        { label: "❌ Échecs", data: labels.map(d => log[d].fail || 0), backgroundColor: '#e74c3c' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

function updatePerformanceDashboard() {
    const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
    const today = todayISO();
    const data = log[today] || { success: 0, fail: 0, timeSeconds: 0 };
    
    document.getElementById("todayRevised").textContent = `Cartes révisées aujourd'hui : ${data.success + data.fail}`;
    document.getElementById("todaySuccess").textContent = `Réussites : ${data.success} / Échecs : ${data.fail}`;

    // Progrès par catégorie
    const tagMap = {};
    flashcards.forEach(c => {
        const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ["Divers"]);
        tags.forEach(t => {
            if (!tagMap[t]) tagMap[t] = { total: 0, totalProgress: 0 };
            tagMap[t].total++;
            const cardProgress = Math.min(100, (c.repetitions / 4) * 100);
            tagMap[t].totalProgress += cardProgress;
        });
    });

    const tagList = document.getElementById("tagList");
    if (tagList) {
        tagList.innerHTML = "";
        Object.entries(tagMap).forEach(([tag, val]) => {
            const avgPercent = Math.round(val.totalProgress / val.total);
            const li = document.createElement("li");
            li.innerHTML = `
                <div style="width:100%; margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <strong>${tag}</strong><span>${avgPercent}%</span>
                    </div>
                    <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                        <div style="background:#007ACC; width:${avgPercent}%; height:100%; border-radius:4px; transition: width 0.5s ease;"></div>
                    </div>
                </div>`;
            tagList.appendChild(li);
        });
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
  const activeTag = document.getElementById("tagFilter").value;
  list.innerHTML = "";
  let filtered = activeTag === "all" ? flashcards : flashcards.filter(c => c.tags.includes(activeTag));

  [...filtered].reverse().forEach(card => {
    const li = document.createElement("li");
    li.style.display = "flex"; li.style.justifyContent = "space-between";
    li.style.padding = "8px"; li.style.borderBottom = "1px solid #eee";
    li.innerHTML = `<span><strong>${card.russe}</strong> - ${card.francais}<br><small style="color: #007ACC;">${card.tags.join(', ')}</small></span>`;
    
    const btn = document.createElement("button");
    btn.textContent = "🗑️"; btn.style.background = "none"; btn.style.border = "none";
    btn.onclick = () => {
      if(confirm("Supprimer ?")) {
        flashcards = flashcards.filter(c => c.id !== card.id);
        saveFlashcards(); displayFlashcards(); updateStats(); updateTagFilter();
      }
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

/* =====================================
    INITIALISATION
===================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Menu et Thème
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const closeMenu = document.getElementById("close-menu");
    const overlay = document.getElementById("overlay");
    const toggleThemeBtn = document.getElementById("toggle-theme");

    const closeFn = () => { sideMenu.classList.remove("open"); overlay.classList.remove("show"); };
    menuBtn.onclick = () => { sideMenu.classList.add("open"); overlay.classList.add("show"); };
    closeMenu.onclick = closeFn; overlay.onclick = closeFn;

    const theme = localStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark", theme === "dark");
    toggleThemeBtn.onclick = () => {
      const newT = document.body.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem("theme", newT);
      document.body.classList.toggle("dark");
      toggleThemeBtn.textContent = newT === "dark" ? "☀️" : "🌙";
    };

    // Events boutons
    document.getElementById("startReview").onclick = startReviewSession;
    document.getElementById("showAnswer").onclick = revealAnswer;
    document.getElementById("know").onclick = () => handleGrade(2);
    document.getElementById("hard").onclick = () => handleGrade(1);
    document.getElementById("dontKnow").onclick = () => handleGrade(0);
    document.getElementById("tagFilter").onchange = displayFlashcards;

    document.getElementById("addFlashcard").onclick = () => {
        const r = document.getElementById("russe").value;
        const f = document.getElementById("francais").value;
        const t = document.getElementById("tag").value;
        if(r && f) {
            flashcards.push(createFlashcard(r, f, t ? [t] : []));
            saveFlashcards(); displayFlashcards(); updateStats(); updateTagFilter();
            document.getElementById("russe").value = ""; document.getElementById("francais").value = "";
        }
    };

    loadFlashcards().then(() => {
        updateStats(); displayFlashcards(); updateTagFilter(); updatePerformanceDashboard();
        setTimeout(updateChart, 500);
    });
});
