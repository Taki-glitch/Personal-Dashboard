/* =====================================
   VARIABLES GLOBALES
===================================== */
let flashcards = [];      // Toutes les flashcards
let reviewPack = [];      // Paquet de révision courant
let currentIndex = 0;     // Index de la carte actuelle
let currentCard = null;   // Carte en cours
let dailyGoal = 10;       // Objectif journalier

/* =====================================
   UTILITAIRES DATE
===================================== */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

/* =====================================
   STOCKAGE LOCAL
===================================== */
function loadFlashcards() {
  const data = localStorage.getItem("flashcards");
  flashcards = data ? JSON.parse(data) : [];
}

function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

/* =====================================
   CRÉATION D'UNE FLASHCARD
===================================== */
function createFlashcard(russe, francais, tags = []) {
  return {
    id: Date.now(),
    russe,
    francais,
    tags,
    repetitions: 0,
    erreurs: 0,
    interval: 1,    // Intervalle en jours pour SRS
    ease: 2.5,      // Facteur d'espacement
    nextReview: todayISO()
  };
}

/* =====================================
   SRS – CARTES À RÉVISER
===================================== */
function getCardsToReview(cards) {
  const today = todayISO();
  return cards.filter(c => c.nextReview <= today);
}

/* =====================================
   SRS – NOTATION 0 / 1 / 2
   0 = Je ne connais pas
   1 = Difficile
   2 = Je connais
===================================== */
function applyGrade(card, grade) {
  const d = new Date();

  if (grade === 0) { // Erreur
    card.erreurs++;
    card.repetitions = 0;
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
    d.setDate(d.getDate() + 1);
    card.nextReview = d.toISOString().split("T")[0];
  }

  if (grade === 1) { // Difficile
    card.repetitions++;
    card.interval = Math.max(1, Math.round(card.interval * 1.5));
    card.ease = Math.max(1.3, card.ease - 0.05);
    d.setDate(d.getDate() + card.interval);
    card.nextReview = d.toISOString().split("T")[0];
  }

  if (grade === 2) { // Connu
    card.repetitions++;
    card.interval = Math.round(card.interval * card.ease);
    card.ease += 0.1;
    d.setDate(d.getDate() + card.interval);
    card.nextReview = d.toISOString().split("T")[0];
  }
}

/* =====================================
   STATISTIQUES
===================================== */
function updateStats() {
  const total = flashcards.length;
  const today = todayISO();

  const nouveaux = flashcards.filter(c => c.repetitions === 0).length;
  const aRevoir = flashcards.filter(c => c.nextReview <= today).length;
  const maitrises = flashcards.filter(c => c.repetitions >= 5).length;

  let reps = 0, errs = 0;
  flashcards.forEach(c => { reps += c.repetitions; errs += c.erreurs; });

  const success = reps === 0 ? 0 : Math.round(((reps - errs) / reps) * 100);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-new").textContent = nouveaux;
  document.getElementById("stat-review").textContent = aRevoir;
  document.getElementById("stat-known").textContent = maitrises;
  document.getElementById("stat-success").textContent = success + "%";
}

/* =====================================
   AFFICHAGE LISTE
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
   AJOUT FLASHCARD
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
  updateDashboard();

  document.getElementById("russe").value = "";
  document.getElementById("francais").value = "";
  document.getElementById("tags").value = "";
});

/* =====================================
   FILTRAGE PAR TAG
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
   PAQUET DE RÉVISION
===================================== */
function generatePack() {
  return filterByTag(getCardsToReview(flashcards));
}

/* =====================================
   SESSION DE RÉVISION
===================================== */
function startPack() {
  reviewPack = generatePack();
  currentIndex = 0;

  if (reviewPack.length === 0) {
    document.getElementById("reviewRusse").textContent = "🎉 Aucune carte à réviser aujourd’hui";
    document.getElementById("reviewFrancais").style.display = "none";
    document.getElementById("reviewActions").style.display = "none";
    return;
  }

  showCard();
}

function showCard() {
  currentCard = reviewPack[currentIndex];
  document.getElementById("reviewRusse").textContent = currentCard.russe;
  document.getElementById("reviewFrancais").style.display = "none";
  document.getElementById("reviewActions").style.display = "none";
}

function nextCard() {
  currentIndex++;
  if (currentIndex >= reviewPack.length) {
    document.getElementById("reviewRusse").textContent = "🎉 Révision terminée !";
    document.getElementById("reviewActions").style.display = "none";
    updateDashboard();
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
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* =====================================
   DASHBOARD PERFORMANCE & SUGGESTIONS
===================================== */
function updateDashboard() {
  const today = todayISO();
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");

  // Statistiques d'aujourd'hui
  const revisited = log[today] ? log[today].revisited : 0;
  const success = log[today] ? log[today].success : 0;
  const fail = log[today] ? log[today].fail : 0;

  document.getElementById("todayRevised").textContent = `Cartes révisées aujourd'hui : ${revisited}`;
  document.getElementById("todaySuccess").textContent = `Réussites : ${success} / Échecs : ${fail}`;

  // Cartes prioritaires demain
  const tomorrow = daysFromNow(1);
  const priority = flashcards
    .filter(c => c.nextReview <= tomorrow)
    .sort((a,b) => (b.erreurs/(b.repetitions||1)) - (a.erreurs/(a.repetitions||1)))
    .slice(0, 10);

  const priorityList = document.getElementById("priorityList");
  priorityList.innerHTML = "";
  priority.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.russe} → ${c.francais} [${c.tags.join(', ')}]`;
    priorityList.appendChild(li);
  });

  // Progrès par tag
  const tagMap = {};
  flashcards.forEach(c => c.tags.forEach(tag => {
    if (!tagMap[tag]) tagMap[tag] = { total:0, done:0 };
    tagMap[tag].total++;
    if (c.repetitions > 0) tagMap[tag].done++;
  }));

  const tagList = document.getElementById("tagList");
  tagList.innerHTML = "";
  Object.keys(tagMap).sort().forEach(tag => {
    const { total, done } = tagMap[tag];
    const li = document.createElement("li");
    li.textContent = `${tag}: ${done} / ${total}`;
    tagList.appendChild(li);
  });
}

/* =====================================
   BOUTONS RÉVISION
===================================== */
document.getElementById("showAnswer").addEventListener("click", () => {
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
  updateDashboard();
  nextCard();
});

document.getElementById("hard").addEventListener("click", () => {
  applyGrade(currentCard, 1);
  saveFlashcards();
  logRevision(1);
  updateStats();
  updateChart();
  updateDashboard();
  nextCard();
});

document.getElementById("know").addEventListener("click", () => {
  applyGrade(currentCard, 2);
  saveFlashcards();
  logRevision(2);
  updateStats();
  updateChart();
  updateDashboard();
  nextCard();
});

document.getElementById("tagFilter").addEventListener("change", startPack);

/* =====================================
   INIT
===================================== */
loadFlashcards();
displayFlashcards();
updateStats();
updateChart();
updateTagFilter();
updateDashboard();