/* =====================================
   VARIABLES GLOBALES
===================================== */
// Liste complète des flashcards
let flashcards = [];
// Paquet de révision actif
let reviewPack = [];
// Index de la carte courante
let currentIndex = 0;
// Carte actuellement affichée
let currentCard = null;
// Objectif quotidien (nombre de cartes à réviser)
let dailyGoal = 10;

/* =====================================
   UTILITAIRES DE DATE
===================================== */
// Renvoie la date d'aujourd'hui au format ISO (YYYY-MM-DD)
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// Renvoie la date d'aujourd'hui + X jours au format ISO
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/* =====================================
   STOCKAGE LOCAL
===================================== */
// Charger les flashcards depuis localStorage
function loadFlashcards() {
  const data = localStorage.getItem("flashcards");
  flashcards = data ? JSON.parse(data) : [];
}

// Sauvegarder les flashcards dans localStorage
function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

/* =====================================
   CRÉATION D'UNE FLASHCARD (SRS)
===================================== */
// Création d'une nouvelle flashcard avec les champs nécessaires pour SRS
function createFlashcard(russe, francais, tags = []) {
  return {
    id: Date.now(),
    russe,
    francais,
    tags,
    repetitions: 0,       // nombre de répétitions réussies
    erreurs: 0,           // nombre d'erreurs
    interval: 1,          // intervalle avant la prochaine révision
    ease: 2.5,            // facteur de facilité pour SRS
    nextReview: todayISO(),// date de la prochaine révision
    stats: {
      history: []          // historique des notes pour cette carte
    }
  };
}

/* =====================================
   SRS – CARTES À RÉVISER
===================================== */
// Renvoie les cartes dont la date de révision est <= aujourd'hui
function getCardsToReview(cards) {
  const today = todayISO();
  return cards.filter(c => c.nextReview <= today);
}

/* =====================================
   SRS – APPLICATION DU GRADE (0 = difficile, 1 = moyen, 2 = facile)
===================================== */
function applyGrade(card, grade) {
  if (!card) return;

  const prevInterval = card.interval; // sauvegarde pour stats

  if (grade === 0) { // difficile / je ne sais pas
    card.erreurs++;
    card.repetitions = 0;
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
  } else if (grade === 1) { // moyen / dur
    card.repetitions++;
    card.interval = Math.max(1, Math.round(card.interval * 1.5));
    card.ease = Math.max(1.3, card.ease - 0.05);
  } else if (grade === 2) { // facile / je sais
    card.repetitions++;
    card.interval = Math.round(card.interval * card.ease);
    card.ease += 0.1;
  }

  // Mise à jour de la prochaine révision
  card.nextReview = daysFromNow(card.interval);

  // Historique pour stats détaillées
  card.stats.history.push({
    date: todayISO(),
    grade,
    prevInterval
  });
}

/* =====================================
   STATISTIQUES GÉNÉRALES
===================================== */
function updateStats() {
  const total = flashcards.length;
  const today = todayISO();

  const nouveaux = flashcards.filter(c => c.repetitions === 0).length;
  const aRevoir = flashcards.filter(c => c.nextReview <= today).length;
  const maitrises = flashcards.filter(c => c.repetitions >= 5).length;

  let reps = 0, errs = 0;
  flashcards.forEach(c => {
    reps += c.repetitions;
    errs += c.erreurs;
  });

  const success = reps === 0 ? 0 : Math.round(((reps - errs) / reps) * 100);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-new").textContent = nouveaux;
  document.getElementById("stat-review").textContent = aRevoir;
  document.getElementById("stat-known").textContent = maitrises;
  document.getElementById("stat-success").textContent = success + "%";
}

/* =====================================
   AFFICHAGE LISTE DE FLASHCARDS
===================================== */
function displayFlashcards() {
  const list = document.getElementById("flashcardsList");
  list.innerHTML = "";

  if (flashcards.length === 0) {
    list.innerHTML = "<li>Aucune flashcard</li>";
    return;
  }

  flashcards.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.russe} → ${card.francais} [${card.tags.join(", ")}]`;
    list.appendChild(li);
  });
}

/* =====================================
   AJOUT D'UNE FLASHCARD
===================================== */
document.getElementById("addFlashcard").addEventListener("click", () => {
  const russe = document.getElementById("russe").value.trim();
  const francais = document.getElementById("francais").value.trim();
  const tagsInput = document.getElementById("tags").value.trim();
  const tags = tagsInput ? tagsInput.split(",").map(t => t.trim().toLowerCase()) : [];

  if (!russe || !francais) return;

  flashcards.push(createFlashcard(russe, francais, tags));
  saveFlashcards();

  displayFlashcards();
  updateStats();
  updateChart();
  updateTagFilter();

  document.getElementById("russe").value = "";
  document.getElementById("francais").value = "";
  document.getElementById("tags").value = "";
});

/* =====================================
   TAGS & FILTRAGE
===================================== */
function updateTagFilter() {
  const select = document.getElementById("tagFilter");
  const tagsSet = new Set();

  flashcards.forEach(c => c.tags.forEach(t => tagsSet.add(t)));

  const selected = select.value;
  select.innerHTML = '<option value="">Tous</option>';

  [...tagsSet].sort().forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    select.appendChild(opt);
  });

  select.value = selected;
}

function filterByTag(cards) {
  const tag = document.getElementById("tagFilter").value;
  return tag ? cards.filter(c => c.tags.includes(tag)) : cards;
}

/* =====================================
   PAQUETS INTELLIGENTS
===================================== */
function generatePack(type = "review") {
  let pack = [];

  switch (type) {
    case "new":
      pack = flashcards.filter(c => c.repetitions === 0);
      break;
    case "review":
      pack = flashcards.filter(c => c.repetitions > 0 && c.nextReview <= todayISO());
      break;
    case "known":
      pack = flashcards.filter(c => c.repetitions >= 5);
      break;
    default:
      pack = flashcards.filter(c => c.nextReview <= todayISO());
      break;
  }

  // Filtre par tag
  pack = filterByTag(pack);

  // Tri par difficulté (plus d'erreurs → priorité)
  pack.sort((a, b) => {
    const scoreA = a.erreurs / (a.repetitions || 1);
    const scoreB = b.erreurs / (b.repetitions || 1);
    return scoreB - scoreA;
  });

  return pack;
}

/* =====================================
   SUGGESTIONS QUOTIDIENNES – ÉTAPE 5
===================================== */
function getDailyPack(goal = dailyGoal) {
  const today = todayISO();
  let reviewCards = flashcards.filter(c => c.nextReview <= today && c.repetitions > 0);
  reviewCards.sort((a, b) => (b.erreurs / (b.repetitions || 1)) - (a.erreurs / (a.repetitions || 1)));

  let newCards = flashcards.filter(c => c.repetitions === 0);

  let pack = [];
  let remaining = goal;

  pack = reviewCards.slice(0, remaining);
  remaining -= pack.length;

  if (remaining > 0) {
    pack = pack.concat(newCards.slice(0, remaining));
  }

  return pack;
}

function showDailySummary() {
  const today = todayISO();
  const reviewCards = flashcards.filter(c => c.nextReview <= today && c.repetitions > 0);
  const newCards = flashcards.filter(c => c.repetitions === 0);

  const summaryEl = document.getElementById("dailySummary");
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <p>📝 Cartes à revoir aujourd'hui : ${reviewCards.length}</p>
    <p>🌱 Nouvelles cartes : ${newCards.length}</p>
    <p>🎯 Objectif du jour : ${dailyGoal} cartes</p>
  `;
}

function updateDailyProgress() {
  const today = todayISO();
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const revisitedToday = log[today] ? log[today].revisited : 0;

  const progressEl = document.getElementById("dailyProgress");
  if (!progressEl) return;

  progressEl.textContent = `Progrès aujourd'hui : ${revisitedToday} / ${dailyGoal}`;
}

/* =====================================
   SESSION
===================================== */
function startPack(type = "review") {
  if(type === "daily") {
    reviewPack = getDailyPack(dailyGoal);
  } else {
    reviewPack = generatePack(type);
  }

  currentIndex = 0;

  if (reviewPack.length === 0) {
    document.getElementById("reviewRusse").textContent =
      "🎉 Aucune carte à réviser aujourd’hui";
    document.getElementById("reviewFrancais").style.display = "none";
    document.getElementById("reviewActions").style.display = "none";
    return;
  }

  showDailySummary();
  updateDailyProgress();
  showCard();
}

function showCard() {
  currentCard = reviewPack[currentIndex];
  if (!currentCard) return;

  document.getElementById("reviewRusse").textContent = currentCard.russe;
  document.getElementById("reviewFrancais").style.display = "none";
  document.getElementById("reviewActions").style.display = "none";
}

function nextCard() {
  currentIndex++;
  if (currentIndex >= reviewPack.length) {
    document.getElementById("reviewRusse").textContent = "🎉 Révision terminée !";
    document.getElementById("reviewActions").style.display = "none";
    updateDailyProgress();
    return;
  }
  showCard();
}

/* =====================================
   LOG & GRAPHIQUE
===================================== */
function logRevision(grade) {
  let log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const today = todayISO();

  if (!log[today]) log[today] = { revisited: 0, success: 0, fail: 0 };
  log[today].revisited++;
  grade === 2 ? log[today].success++ : log[today].fail++;

  localStorage.setItem("revisionLog", JSON.stringify(log));
  updateDailyProgress();
}

function updateChart() {
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const labels = Object.keys(log).sort();

  const revisited = labels.map(d => log[d].revisited);
  const success = labels.map(d => log[d].success);
  const fail = labels.map(d => log[d].fail);

  if (window.progressChart) window.progressChart.destroy();

  const ctx = document.getElementById("progressChart").getContext("2d");
  window.progressChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Révisées", data: revisited, backgroundColor: "#3498db" },
        { label: "Réussites", data: success, backgroundColor: "#2ecc71" },
        { label: "Échecs", data: fail, backgroundColor: "#e74c3c" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

/* =====================================
   BOUTONS RÉVISION
===================================== */
document.getElementById("showAnswer").addEventListener("click", () => {
  if (!currentCard) return;
  document.getElementById("reviewFrancais").textContent = currentCard.francais;
  document.getElementById("reviewFrancais").style.display = "block";
  document.getElementById("reviewActions").style.display = "block";
});

document.getElementById("dontKnow").addEventListener("click", () => {
  applyGrade(currentCard, 0);
  saveFlashcards();
  logRevision(0);
  updateStats();
  updateChart();
  nextCard();
});

document.getElementById("hard").addEventListener("click", () => {
  applyGrade(currentCard, 1);
  saveFlashcards();
  logRevision(1);
  updateStats();
  updateChart();
  nextCard();
});

document.getElementById("know").addEventListener("click", () => {
  applyGrade(currentCard, 2);
  saveFlashcards();
  logRevision(2);
  updateStats();
  updateChart();
  nextCard();
});

/* =====================================
   BOUTONS PAQUETS
===================================== */
document.querySelectorAll(".review-filters button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".review-filters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    startPack(btn.dataset.pack);
  });
});

/* =====================================
   FILTRE TAG CHANGE
===================================== */
document.getElementById("tagFilter").addEventListener("change", () => {
  const activeBtn = document.querySelector(".review-filters button.active");
  startPack(activeBtn ? activeBtn.dataset.pack : "review");
});

/* =====================================
   INITIALISATION
===================================== */
loadFlashcards();
displayFlashcards();
updateStats();
updateChart();
updateTagFilter();
showDailySummary();
updateDailyProgress();