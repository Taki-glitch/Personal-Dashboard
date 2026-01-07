/* =====================================
   Variables globales
===================================== */
let flashcards = [];
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;

/* =====================================
   Stockage local
===================================== */
function loadFlashcards() {
  const data = localStorage.getItem("flashcards");
  flashcards = data ? JSON.parse(data) : [];
}

function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

/* =====================================
   Statistiques
===================================== */
function updateStats() {
  const total = flashcards.length;
  const nouveaux = flashcards.filter(c => c.niveau === 0).length;
  const aRevoir = flashcards.filter(c => c.erreurs > 0 && c.niveau < 3).length;
  const maitrises = flashcards.filter(c => c.niveau >= 3).length;

  let repetitions = 0;
  let erreurs = 0;
  flashcards.forEach(c => {
    repetitions += c.repetitions;
    erreurs += c.erreurs;
  });

  const succes = repetitions === 0 ? 0 : Math.round(((repetitions - erreurs) / repetitions) * 100);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-new").textContent = nouveaux;
  document.getElementById("stat-review").textContent = aRevoir;
  document.getElementById("stat-known").textContent = maitrises;
  document.getElementById("stat-success").textContent = succes + "%";
}

/* =====================================
   Affichage de la liste
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
    li.textContent = `${card.russe} → ${card.francais}`;
    list.appendChild(li);
  });
}

/* =====================================
   Ajout d'une flashcard
===================================== */
document.getElementById("addFlashcard").addEventListener("click", () => {
  const russe = document.getElementById("russe").value.trim();
  const francais = document.getElementById("francais").value.trim();
  if (!russe || !francais) return;

  flashcards.push({
    id: Date.now(),
    russe,
    francais,
    repetitions: 0,
    erreurs: 0,
    niveau: 0,
    interval: 1,           // intervalle en jours pour SRS
    dernierPassage: null
  });

  saveFlashcards();
  displayFlashcards();
  updateStats();

  document.getElementById("russe").value = "";
  document.getElementById("francais").value = "";
});

/* =====================================
   Répétition espacée – SRS
===================================== */
// Retourne les cartes à revoir aujourd'hui
function getDueCards(cards) {
  const today = new Date();
  return cards.filter(card => {
    if (!card.dernierPassage) return true; // jamais révisée
    const last = new Date(card.dernierPassage);
    const diffDays = (today - last) / (1000 * 60 * 60 * 24);
    return diffDays >= card.interval;
  });
}

/* =====================================
   Paquets intelligents
===================================== */
function generatePack(type) {
  let pack;
  switch (type) {
    case "new":
      pack = flashcards.filter(c => c.niveau === 0);
      break;
    case "review":
      pack = flashcards.filter(c => c.erreurs > 0 && c.niveau < 3);
      break;
    case "known":
      pack = flashcards.filter(c => c.niveau >= 3);
      break;
    default:
      pack = flashcards.filter(c => c.niveau < 2 || c.erreurs > 1);
      break;
  }
  return getDueCards(pack);
}

function startPack(type) {
  reviewPack = generatePack(type);
  currentIndex = 0;

  if (reviewPack.length === 0) {
    document.getElementById("reviewRusse").textContent = "Aucune carte dans ce paquet";
    document.getElementById("reviewFrancais").style.display = "none";
    document.getElementById("reviewActions").style.display = "none";
    return;
  }

  showCard();
}

function showCard() {
  currentCard = reviewPack[currentIndex];
  document.getElementById("reviewRusse").textContent = currentCard.russe;
  document.getElementById("reviewFrancais").textContent = currentCard.francais;
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
   Boutons
===================================== */
document.querySelectorAll(".review-filters button").forEach(btn => {
  btn.addEventListener("click", () => startPack(btn.dataset.pack));
});

document.getElementById("showAnswer").addEventListener("click", () => {
  if (!currentCard) return;
  document.getElementById("reviewFrancais").style.display = "block";
  document.getElementById("reviewActions").style.display = "block";
});

document.getElementById("know").addEventListener("click", () => {
  currentCard.repetitions++;
  currentCard.niveau++;
  currentCard.interval *= 2; // double l'intervalle
  currentCard.dernierPassage = new Date().toISOString();

  saveFlashcards();
  displayFlashcards();
  updateStats();
  nextCard();
});

document.getElementById("dontKnow").addEventListener("click", () => {
  currentCard.repetitions++;
  currentCard.erreurs++;
  currentCard.niveau = Math.max(0, currentCard.niveau - 1);
  currentCard.interval = 1; // revoir très vite
  currentCard.dernierPassage = new Date().toISOString();

  saveFlashcards();
  displayFlashcards();
  updateStats();
  nextCard();
});

/* =====================================
   Initialisation
===================================== */
loadFlashcards();
displayFlashcards();
updateStats();
