import { auth, db } from "./auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================
    VARIABLES GLOBALES
===================================== */
let flashcards = [];
let revisionLog = {}; // Initialisé pour éviter l'erreur "undefined"
let reviewPack = [];
let currentIndex = 0;
let currentCard = null;
let startTime = Date.now();

/* =====================================
    UTILITAIRES
===================================== */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// FUSION DES DEUX FONCTIONS SAVE : Une seule fonction robuste
async function saveFlashcards() {
    // 1. Sauvegarde locale systématique
    localStorage.setItem("flashcards", JSON.stringify(flashcards));
    localStorage.setItem("revisionLog", JSON.stringify(revisionLog));

    // 2. Sauvegarde Cloud (seulement si connecté)
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, {
                flashcards: flashcards,
                revisionLog: revisionLog
            });
            console.log("☁️ Synchro Cloud réussie !");
        } catch (e) {
            console.error("❌ Erreur synchro Cloud :", e);
        }
    }
}

/* =====================================
    STOCKAGE & CHARGEMENT
===================================== */
async function loadFlashcards() {
    const localData = localStorage.getItem("flashcards");
    flashcards = localData ? JSON.parse(localData) : [];

    const localLog = localStorage.getItem("revisionLog");
    revisionLog = localLog ? JSON.parse(localLog) : {}; 

    try {
        const response = await fetch("https://raw.githubusercontent.com/Taki-glitch/Personal-Dashboard/main/list.json");
        if (!response.ok) throw new Error("Impossible de charger la liste GitHub");
        
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

        await saveFlashcards(); // Sauvegarde la fusion
        
    } catch (err) {
        console.error("⚠️ Info : Chargement liste GitHub ignoré (utilisation local uniquement)", err);
    }
}

function createFlashcard(russe, francais, tags = []) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    russe,
    francais,
    tags: Array.isArray(tags) ? tags : [tags],
    repetitions: 0,
    erreurs: 0,
    interval: 1,
    ease: 2.5,
    nextReview: todayISO()
  };
}

/* =====================================
    LOGIQUE SRS & RÉVISIONS
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

function startReviewSession() {
    const tag = document.getElementById("tagFilter").value;
    const today = todayISO();
    startTime = Date.now();
    
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
    showCard();
}

function showCard() {
    currentCard = reviewPack[currentIndex];
    const cardArea = document.getElementById("reviewCard");
    
    cardArea.innerHTML = `
        <small style="color: gray;">Carte ${currentIndex + 1} / ${reviewPack.length}</small>
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

async function handleGrade(grade) {
    applyGrade(currentCard, grade);
    logRevision(grade); // Met à jour le revisionLog localement
    await saveFlashcards(); // Envoie tout au cloud et localStorage
    
    currentIndex++;
    if (currentIndex < reviewPack.length) {
        showCard();
    } else {
        document.getElementById("reviewCard").innerHTML = "✅ Session terminée !";
        document.getElementById("know").style.display = "none";
        document.getElementById("dontKnow").style.display = "none";
        document.getElementById("hard").style.display = "none";
        document.getElementById("startReview").style.display = "inline-block";
        updateStats();
        updateChart();
    }
}

function logRevision(grade) {
    const today = todayISO();
    if (!revisionLog[today]) revisionLog[today] = { success: 0, fail: 0, timeSeconds: 0 };
    
    if (grade >= 1) {
        revisionLog[today].success++;
    } else {
        revisionLog[today].fail++;
    }

    const sessionTime = Math.round((Date.now() - startTime) / 1000);
    revisionLog[today].timeSeconds += sessionTime;
    startTime = Date.now();
}

/* =====================================
    UI & GRAPHIQUES
===================================== */
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
  const labels = Object.keys(revisionLog).sort().slice(-7);
  const ctx = document.getElementById("progressChart");
  if (!ctx) return;
  
  if (window.progressChart instanceof Chart) window.progressChart.destroy();
  
  window.progressChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels.length > 0 ? labels : [todayISO()],
      datasets: [
        { label: "✅ Réussites", data: labels.map(d => revisionLog[d].success || 0), backgroundColor: '#2ecc71' },
        { label: "❌ Échecs", data: labels.map(d => revisionLog[d].fail || 0), backgroundColor: '#e74c3c' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updatePerformanceDashboard() {
    const today = todayISO();
    const data = revisionLog[today] || { success: 0, fail: 0, timeSeconds: 0 };
    
    document.getElementById("todayRevised").textContent = `Cartes révisées aujourd'hui : ${data.success + data.fail}`;
    document.getElementById("todaySuccess").textContent = `Réussites : ${data.success} / Échecs : ${data.fail}`;

    const tagMap = {};
    flashcards.forEach(c => {
        const tags = c.tags || ["Divers"];
        tags.forEach(t => {
            if (!tagMap[t]) tagMap[t] = { total: 0, totalProgress: 0 };
            tagMap[t].total++;
            const cardProgress = Math.min(100, (c.repetitions / 5) * 100);
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
                        <div style="background:#007ACC; width:${avgPercent}%; height:100%;"></div>
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
    li.style = "display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;";
    li.innerHTML = `<span><strong>${card.russe}</strong> - ${card.francais}<br><small style="color: #007ACC;">${card.tags.join(', ')}</small></span>`;
    
    const btn = document.createElement("button");
    btn.textContent = "🗑️"; btn.style = "background: none; border: none; cursor: pointer;";
    btn.onclick = async () => {
      if(confirm("Supprimer ?")) {
        flashcards = flashcards.filter(c => c.id !== card.id);
        await saveFlashcards(); displayFlashcards(); updateStats(); updateTagFilter();
      }
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

/* =====================================
    INIT DOM
===================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Menu
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const closeMenu = document.getElementById("close-menu");
    const overlay = document.getElementById("overlay");
    const closeFn = () => { sideMenu.classList.remove("open"); overlay.classList.remove("show"); };
    menuBtn.onclick = () => { sideMenu.classList.add("open"); overlay.classList.add("show"); };
    closeMenu.onclick = closeFn; overlay.onclick = closeFn;

    // Thème
    const toggleThemeBtn = document.getElementById("toggle-theme");
    const theme = localStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark", theme === "dark");
    toggleThemeBtn.onclick = () => {
      const isDark = document.body.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      toggleThemeBtn.textContent = isDark ? "☀️" : "🌙";
    };

    // Boutons révision
    document.getElementById("startReview").onclick = startReviewSession;
    document.getElementById("showAnswer").onclick = revealAnswer;
    document.getElementById("know").onclick = () => handleGrade(2);
    document.getElementById("hard").onclick = () => handleGrade(1);
    document.getElementById("dontKnow").onclick = () => handleGrade(0);
    document.getElementById("tagFilter").onchange = displayFlashcards;

    // Ajout manuel
    document.getElementById("addFlashcard").onclick = async () => {
    const r = document.getElementById("russe").value;
    const f = document.getElementById("francais").value;
    const t = document.getElementById("tag").value;
    if(r && f) {
        // .trim() permet d'éviter d'avoir des tags comme " nom" avec un espace
        const tagsArray = t ? t.split(',').map(tag => tag.trim()) : []; 
        
        flashcards.push(createFlashcard(r, f, tagsArray));
        await saveFlashcards(); 
        displayFlashcards(); 
        updateStats(); 
        updateTagFilter();
        
        document.getElementById("russe").value = ""; 
        document.getElementById("francais").value = "";
        document.getElementById("tag").value = ""; // On vide aussi le champ tag
        }
    };

    // Lancement
    loadFlashcards().then(() => {
        updateStats(); displayFlashcards(); updateTagFilter(); updatePerformanceDashboard();
        setTimeout(updateChart, 500);
    });
});
