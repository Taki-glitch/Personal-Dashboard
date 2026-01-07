/* =====================================
   VARIABLES GLOBALES
===================================== */
let flashcards = [];
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;
let dailyGoal = 10;

/* =====================================
   UTILITAIRES DATE
===================================== */
function todayISO() {
  return new Date().toISOString().split("T")[0];
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
   CRÉATION FLASHCARD (SRS)
===================================== */
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
   SRS — CARTES À RÉVISER
===================================== */
function getCardsToReview(cards) {
  const today = todayISO();
  return cards.filter(card => card.nextReview <= today);
}

/* =====================================
   SRS — SUCCÈS / ÉCHEC
===================================== */
function markSuccess(card) {
  card.repetitions++;

  if (card.repetitions === 1) card.interval = 3;
  else if (card.repetitions === 2) card.interval = 7;
  else if (card.repetitions === 3) card.interval = 14;
  else card.interval = 30;

  const next = new Date();
  next.setDate(next.getDate() + card.interval);
  card.nextReview = next.toISOString().split("T")[0];
}

function markFailure(card) {
  card.erreurs++;
  card.repetitions = 0;
  card.interval = 1;

  const next = new Date();
  next.setDate(next.getDate() + 1);
  card.nextReview = next.toISOString().split("T")[0];
}

/* =====================================
   STATISTIQUES
===================================== */
function updateStats() {
  const total = flashcards.length;
  const today = todayISO();

  const nouveaux = flashcards.filter(c => c.repetitions === 0).length;
  const aRevoir = flashcards.filter(c => c.nextReview <= today).length;
  const maitrises = flashcards.filter(c => c.repetitions >= 4).length;

  let repetitions = 0;
  let erreurs = 0;
  flashcards.forEach(c => {
    repetitions += c.repetitions;
    erreurs += c.erreurs;
  });

  const succes = repetitions === 0
    ? 0
    : Math.round(((repetitions - erreurs) / repetitions) * 100);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-new").textContent = nouveaux;
  document.getElementById("stat-review").textContent = aRevoir;
  document.getElementById("stat-known").textContent = maitrises;
  document.getElementById("stat-success").textContent = succes + "%";
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

  document.getElementById("russe").value = "";
  document.getElementById("francais").value = "";
  document.getElementById("tags").value = "";
});

/* =====================================
   TAG FILTER
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
   PAQUETS DE RÉVISION
===================================== */
function generatePack() {
  let pack = getCardsToReview(flashcards);
  return filterByTag(pack);
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
    return;
  }
  showCard();
}

/* =====================================
   LOG & GRAPHIQUE
===================================== */
function logRevision(success) {
  let log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const today = todayISO();

  if (!log[today]) log[today] = { revisited: 0, success: 0, fail: 0 };
  log[today].revisited++;
  success ? log[today].success++ : log[today].fail++;

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
        { label: "Révisées", data: revisited },
        { label: "Réussites", data: success },
        { label: "Échecs", data: fail }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* =====================================
   BOUTONS
===================================== */
document.getElementById("showAnswer").addEventListener("click", () => {
  document.getElementById("reviewFrancais").textContent = currentCard.francais;
  document.getElementById("reviewFrancais").style.display = "block";
  document.getElementById("reviewActions").style.display = "block";
});

document.getElementById("know").addEventListener("click", () => {
  markSuccess(currentCard);
  saveFlashcards();
  logRevision(true);
  updateStats();
  updateChart();
  nextCard();
});

document.getElementById("dontKnow").addEventListener("click", () => {
  markFailure(currentCard);
  saveFlashcards();
  logRevision(false);
  updateStats();
  updateChart();
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