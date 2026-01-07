let flashcards = [];
let currentCard = null;

/* ==========================
   Chargement / Sauvegarde
========================== */

function loadFlashcards() {
  const data = localStorage.getItem("flashcards");
  flashcards = data ? JSON.parse(data) : [];
}

function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

/* ==========================
   Affichage liste
========================== */

function displayFlashcards() {
  const list = document.getElementById("flashcardsList");
  list.innerHTML = "";

  if (flashcards.length === 0) {
    list.innerHTML = "<li>Aucune flashcard pour le moment</li>";
    return;
  }

  flashcards.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.russe} → ${card.francais}`;
    list.appendChild(li);
  });
}

/* ==========================
   Ajout de flashcard
========================== */

document.getElementById("addFlashcard").addEventListener("click", () => {
  const russe = document.getElementById("russe").value.trim();
  const francais = document.getElementById("francais").value.trim();

  if (!russe || !francais) return;

  const newCard = {
    id: Date.now(),
    russe,
    francais,
    repetitions: 0,
    erreurs: 0,
    niveau: 0,
    dernierPassage: null
  };

  flashcards.push(newCard);
  saveFlashcards();
  displayFlashcards();

  document.getElementById("russe").value = "";
  document.getElementById("francais").value = "";
});

/* ==========================
   Révision
========================== */

function getRandomCard() {
  if (flashcards.length === 0) return null;
  return flashcards[Math.floor(Math.random() * flashcards.length)];
}

function showNewCard() {
  currentCard = getRandomCard();
  if (!currentCard) return;

  document.getElementById("reviewRusse").textContent = currentCard.russe;
  document.getElementById("reviewFrancais").textContent = currentCard.francais;
  document.getElementById("reviewFrancais").style.display = "none";
  document.getElementById("reviewActions").style.display = "none";
}

/* Lancer la révision */
document.getElementById("startReview").addEventListener("click", () => {
  showNewCard();
});

/* Voir la traduction */
document.getElementById("showAnswer").addEventListener("click", () => {
  if (!currentCard) return;

  document.getElementById("reviewFrancais").style.display = "block";
  document.getElementById("reviewActions").style.display = "block";
});

/* Je savais */
document.getElementById("know").addEventListener("click", () => {
  if (!currentCard) return;

  currentCard.repetitions++;
  currentCard.niveau++;
  currentCard.dernierPassage = new Date().toISOString();

  saveFlashcards();
  displayFlashcards();
  showNewCard();
});

/* Je ne savais pas */
document.getElementById("dontKnow").addEventListener("click", () => {
  if (!currentCard) return;

  currentCard.repetitions++;
  currentCard.erreurs++;
  currentCard.niveau = Math.max(0, currentCard.niveau - 1);
  currentCard.dernierPassage = new Date().toISOString();

  saveFlashcards();
  displayFlashcards();
  showNewCard();
});

/* ==========================
   Initialisation
========================== */

loadFlashcards();
displayFlashcards();
