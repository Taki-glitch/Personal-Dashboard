let flashcards = [];
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;

/* =========================
   Stockage
========================= */

function loadFlashcards() {
  const data = localStorage.getItem("flashcards");
  flashcards = data ? JSON.parse(data) : [];
}

function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

/* =========================
   Affichage liste
========================= */

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

/* =========================
   Ajout
========================= */

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
    dernierPassage: null
  });

  saveFlashcards();
  displayFlashcards();

  document.getElementById("russe").value = "";
  document.getElementById("francais").value = "";
});

/* =========================
   Paquets intelligents
========================= */

function generatePack(type) {
  switch (type) {
    case "new":
      return flashcards.filter(c => c.niveau === 0);
    case "review":
      return flashcards.filter(c => c.erreurs > 0 && c.niveau < 3);
    case "known":
      return flashcards.filter(c => c.niveau >= 3);
    default:
      return flashcards.filter(c => c.niveau < 2 || c.erreurs > 1);
  }
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
    document.getElementById("reviewFrancais").style.display = "none";
    document.getElementById("reviewActions").style.display = "none";
    return;
  }

  showCard();
}

/* =========================
   Boutons UI
========================= */

document.querySelectorAll(".review-filters button").forEach(btn => {
  btn.addEventListener("click", () => {
    startPack(btn.dataset.pack);
  });
});

document.getElementById("showAnswer").addEventListener("click", () => {
  if (!currentCard) return;
  document.getElementById("reviewFrancais").style.display = "block";
  document.getElementById("reviewActions").style.display = "block";
});

document.getElementById("know").addEventListener("click", () => {
  currentCard.repetitions++;
  currentCard.niveau++;
  currentCard.dernierPassage = new Date().toISOString();

  saveFlashcards();
  displayFlashcards();
  nextCard();
});

document.getElementById("dontKnow").addEventListener("click", () => {
  currentCard.repetitions++;
  currentCard.erreurs++;
  currentCard.niveau = Math.max(0, currentCard.niveau - 1);
  currentCard.dernierPassage = new Date().toISOString();

  saveFlashcards();
  displayFlashcards();
  nextCard();
});

/* =========================
   Initialisation
========================= */

loadFlashcards();
displayFlashcards();
