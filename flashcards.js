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

/* =====================================raw.githubusercontent.com/Taki-glitch/Personal-Dashboard/main/list.json
   STOCKAGE LOCAL + LISTE GITHUB
===================================== */
async function loadFlashcards() {
  // 1️⃣ Charger les flashcards locales
  const localData = localStorage.getItem("flashcards");
  flashcards = localData ? JSON.parse(localData) : [];

  // 2️⃣ Charger la liste de base depuis GitHub
  try {
    const response = await fetch("https://taki-glitch.github.io/Personal-Dashboard/list.json");
    if (!response.ok) throw new Error("Impossible de charger la liste de base");
    const baseFlashcards = await response.json();

    // 3️⃣ Fusionner avec les flashcards locales en évitant les doublons
    const existingSet = new Set(flashcards.map(c => c.russe + "|" + c.francais));
    baseFlashcards.forEach(c => {
      const key = c.russe + "|" + c.francais;
      if (!existingSet.has(key)) {
        // Générer un ID unique pour chaque carte importée
        c.id = Date.now() + Math.floor(Math.random() * 100000);
        flashcards.push(c);
      }
    });

    saveFlashcards(); // Sauvegarde après fusion
  } catch (err) {
    console.error("Erreur lors du chargement des flashcards de base :", err);
  }
}

/* =====================================
   SAUVEGARDE LOCALSTORAGE
===================================== */
function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

/* =====================================
   CRÉATION FLASHCARD
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
   RÉVISION SRS – CARTES DUES
===================================== */
function getCardsToReview(cards) {
  const today = todayISO();
  return cards.filter(c => c.nextReview <= today);
}

/* =====================================
   RÉVISION SRS – GRADE 0 / 1 / 2
===================================== */
function applyGrade(card, grade) {
  const d = new Date();
  if (grade === 0) {
    card.erreurs++;
    card.repetitions = 0;
    card.interval = 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
    d.setDate(d.getDate() + 1);
  } else if (grade === 1) {
    card.repetitions++;
    card.interval = Math.max(1, Math.round(card.interval * 1.5));
    card.ease = Math.max(1.3, card.ease - 0.05);
    d.setDate(d.getDate() + card.interval);
  } else if (grade === 2) {
    card.repetitions++;
    card.interval = Math.round(card.interval * card.ease);
    card.ease += 0.1;
    d.setDate(d.getDate() + card.interval);
  }
  card.nextReview = d.toISOString().split("T")[0];
}

/* =====================================
   STATISTIQUES GLOBALES
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

  updatePerformanceDashboard();
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

    // Bouton supprimer individuellement
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌";
    delBtn.style.marginLeft = "10px";
    delBtn.addEventListener("click", () => {
      if (confirm("Supprimer cette flashcard ?")) {
        flashcards = flashcards.filter(c => c.id !== card.id);
        saveFlashcards();
        displayFlashcards();
        updateStats();
        updateChart();
        updateTagFilter();
        updatePerformanceDashboard();
      }
    });
    li.appendChild(delBtn);

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
   TAGS
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
   GÉNÉRATION DE PAQUET DE RÉVISION
===================================== */
function generatePack(type = "intelligent") {
  let pack = [];
  const today = todayISO();

  switch(type) {
    case "new": pack = flashcards.filter(c => c.repetitions === 0); break;
    case "review": pack = flashcards.filter(c => c.nextReview <= today && c.repetitions > 0); break;
    case "known": pack = flashcards.filter(c => c.repetitions >= 5); break;
    default:
      pack = getCardsToReview(flashcards);
      break;
  }
  return filterByTag(pack);
}

/* =====================================
   SESSION DE RÉVISION
===================================== */
function startPack(type) {
  // Mettre bouton actif
  document.querySelectorAll(".review-filters button").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.review-filters button[data-pack="${type}"]`)?.classList.add("active");

  reviewPack = generatePack(type);
  currentIndex = 0;

  if (reviewPack.length === 0) {
    document.getElementById("reviewRusse").textContent = "🎉 Aucune carte à réviser";
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
   LOG, DASHBOARD ET CHART
===================================== */
function logRevision(grade) {
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const today = todayISO();
  if (!log[today]) log[today] = { revisited: 0, success: 0, fail: 0 };
  log[today].revisited++;
  grade === 2 ? log[today].success++ : log[today].fail++;
  localStorage.setItem("revisionLog", JSON.stringify(log));

  updatePerformanceDashboard();
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
        { label: "Révisées", data: revisited, backgroundColor: '#3498db' },
        { label: "Réussites", data: success, backgroundColor: '#2ecc71' },
        { label: "Échecs", data: fail, backgroundColor: '#e74c3c' }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function updatePerformanceDashboard() {
  const log = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const today = todayISO();
  const revisitedToday = log[today]?.revisited || 0;
  const successToday = log[today]?.success || 0;
  const failToday = log[today]?.fail || 0;

  document.getElementById("todayRevised").textContent = `Cartes révisées aujourd'hui : ${revisitedToday}`;
  document.getElementById("todaySuccess").textContent = `Réussites : ${successToday} / Échecs : ${failToday}`;

  // Cartes prioritaires demain
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];
  const priority = flashcards.filter(c => c.nextReview === tomorrowISO);
  const list = document.getElementById("priorityList");
  list.innerHTML = "";
  priority.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.russe} → ${c.francais} [${c.tags.join(", ")}]`;
    list.appendChild(li);
  });

  // Progrès par tag
  const tagMap = {};
  flashcards.forEach(c => {
    c.tags.forEach(t => {
      if (!tagMap[t]) tagMap[t] = { total:0, success:0 };
      tagMap[t].total++;
      if (c.repetitions > 0 && c.erreurs === 0) tagMap[t].success++;
    });
  });
  const tagList = document.getElementById("tagList");
  tagList.innerHTML = "";
  for (const [tag, val] of Object.entries(tagMap)) {
    const li = document.createElement("li");
    li.textContent = `${tag} : ${val.success} / ${val.total} réussites`;
    tagList.appendChild(li);
  }
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
  if (!currentCard) return;
  applyGrade(currentCard, 0);
  saveFlashcards();
  logRevision(0);
  updateStats();
  updateChart();
  nextCard();
});

document.getElementById("hard").addEventListener("click", () => {
  if (!currentCard) return;
  applyGrade(currentCard, 1);
  saveFlashcards();
  logRevision(1);
  updateStats();
  updateChart();
  nextCard();
});

document.getElementById("know").addEventListener("click", () => {
  if (!currentCard) return;
  applyGrade(currentCard, 2);
  saveFlashcards();
  logRevision(2);
  updateStats();
  updateChart();
  nextCard();
});

document.querySelectorAll(".review-filters button").forEach(btn => {
  btn.addEventListener("click", () => startPack(btn.dataset.pack));
});

document.getElementById("tagFilter").addEventListener("change", () => {
  const activeBtn = document.querySelector(".review-filters button.active");
  startPack(activeBtn?.dataset.pack || "intelligent");
});

/* =====================================
   IMPORT / EXPORT / CLEAR FLASHCARDS
===================================== */
document.getElementById("exportFlashcards").addEventListener("click", () => {
  const dataStr = JSON.stringify(flashcards, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flashcards_${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("btnImportFlashcards").addEventListener("click", () => {
  document.getElementById("importFlashcards").click();
});

document.getElementById("importFlashcards").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) throw "Format invalide";
      flashcards = flashcards.concat(imported);
      saveFlashcards();
      displayFlashcards();
      updateStats();
      updateChart();
      updateTagFilter();
      alert("Importation réussie !");
    } catch(err) {
      alert("Erreur à l'importation : " + err);
    }
  };
  reader.readAsText(file);
});

document.getElementById("clearFlashcards").addEventListener("click", () => {
  if (confirm("Supprimer toutes les flashcards ?")) {
    flashcards = [];
    saveFlashcards();
    displayFlashcards();
    updateStats();
    updateChart();
    updateTagFilter();
    updatePerformanceDashboard();
  }
});

/* =====================================
   INITIALISATION
===================================== */
loadFlashcards().then(() => {
  displayFlashcards();
  updateStats();
  updateChart();
  updateTagFilter();
});
