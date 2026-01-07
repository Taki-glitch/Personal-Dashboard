/* =====================================
   VARIABLES GLOBALES
===================================== */
let flashcards = [];
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;
let dailyGoal = 10;

/* =====================================
   UTILITAIRE DATE
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
   FILTRE PAR TAG
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
   SRS – CARTES À RÉVISER
===================================== */
function getCardsToReview(cards) {
  const today = todayISO();
  return cards.filter(c => c.repetitions === 0 || c.nextReview <= today);
}

/* =====================================
   GÉNÉRATION DE PAQUET
===================================== */
function generatePack(type = "intelligent") {
  const today = todayISO();
  let pack;

  switch(type) {
    case "intelligent":
      pack = flashcards.filter(c => c.repetitions === 0 || c.nextReview <= today);
      break;
    case "new":
      pack = flashcards.filter(c => c.repetitions === 0);
      break;
    case "review":
      pack = flashcards.filter(c => c.repetitions > 0 && c.nextReview <= today && c.repetitions < 5);
      break;
    case "known":
      pack = flashcards.filter(c => c.repetitions >= 5);
      break;
    default:
      pack = flashcards.slice();
  }

  return filterByTag(pack);
}

/* =====================================
   DÉBUT DE SESSION
===================================== */
function startPack(type = "intelligent") {
  reviewPack = generatePack(type);
  currentIndex = 0;

  if (reviewPack.length === 0) {
    document.getElementById("reviewRusse").textContent = "🎉 Aucune carte à réviser pour ce paquet";
    document.getElementById("reviewFrancais").style.display = "none";
    document.getElementById("reviewActions").style.display = "none";
    return;
  }

  showCard();
}

/* =====================================
   AFFICHAGE CARTE
===================================== */
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
   SRS – NOTATION 0 / 1 / 2
===================================== */
function applyGrade(card, grade) {
  const d = new Date();

  if (grade === 0) {
    card.erreurs++;
    card.repetitions = 0;
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
    d.setDate(d.getDate() + 1);
  }

  if (grade === 1) {
    card.repetitions++;
    card.interval = Math.max(1, Math.round(card.interval * 1.5));
    card.ease = Math.max(1.3, card.ease - 0.05);
    d.setDate(d.getDate() + card.interval);
  }

  if (grade === 2) {
    card.repetitions++;
    card.interval = Math.round(card.interval * card.ease);
    card.ease += 0.1;
    d.setDate(d.getDate() + card.interval);
  }

  card.nextReview = d.toISOString().split("T")[0];
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

  let reps = 0;
  let errs = 0;
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
   AFFICHAGE LISTE FLASHCARDS
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
   LOG DE RÉVISION & GRAPHIQUE
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
   BOUTONS PAQUETS DE RÉVISION
===================================== */
document.querySelectorAll(".review-filters button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".review-filters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    startPack(btn.dataset.pack);
  });
});

/* =====================================
   FILTRE TAG
===================================== */
document.getElementById("tagFilter").addEventListener("change", () => {
  const activeBtn = document.querySelector(".review-filters button.active");
  startPack(activeBtn ? activeBtn.dataset.pack : "intelligent");
});

/* =====================================
   INITIALISATION
===================================== */
loadFlashcards();
displayFlashcards();
updateStats();
updateChart();
updateTagFilter();