let flashcards = [];

// Chargement depuis le stockage
function loadFlashcards() {
  const data = localStorage.getItem("flashcards");
  flashcards = data ? JSON.parse(data) : [];
}

// Sauvegarde
function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

// Affichage
function displayFlashcards() {
  const list = document.getElementById("flashcardsList");
  list.innerHTML = "";

  flashcards.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.russe} → ${card.francais}`;
    list.appendChild(li);
  });
}

// Ajout
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

// Initialisation
loadFlashcards();
displayFlashcards();
