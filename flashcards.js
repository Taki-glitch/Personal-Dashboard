import { auth, db } from "./auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================
    VARIABLES GLOBALES
===================================== */
let flashcards = [];
let revisionLog = {}; 
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

async function saveFlashcards() {
    localStorage.setItem("flashcards", JSON.stringify(flashcards));
    localStorage.setItem("revisionLog", JSON.stringify(revisionLog));

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
    let rawCards = localData ? JSON.parse(localData) : [];

    // MIGRATION & NETTOYAGE (Important pour ne rien perdre)
    flashcards = rawCards.map(c => ({
        ...c,
        front: c.front || c.russe || "", 
        back: c.back || c.francais || "",
        language: c.language || "Russe",
        erreurs: c.erreurs || 0,
        ease: c.ease || 2.5,
        repetitions: c.repetitions || 0,
        interval: c.interval || 1,
        nextReview: c.nextReview || todayISO()
    }));

    const localLog = localStorage.getItem("revisionLog");
    revisionLog = localLog ? JSON.parse(localLog) : {}; 

    try {
        const response = await fetch("https://raw.githubusercontent.com/Taki-glitch/Personal-Dashboard/main/list.json");
        if (response.ok) {
            const baseFlashcards = await response.json();
            const existingSet = new Set(flashcards.map(c => c.front.toLowerCase()));

            baseFlashcards.forEach(c => {
                if (!existingSet.has(c.russe.toLowerCase())) {
                    const tags = c.tag ? [c.tag] : (c.tags || []);
                    flashcards.push(createFlashcard(c.russe, c.francais, tags, "Russe"));
                }
            });
            await saveFlashcards();
        }
    } catch (err) {
        console.error("⚠️ Info : Liste GitHub ignorée", err);
    }
}

function createFlashcard(front, back, tags = [], lang = "Général") {
    return {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        front: front,
        back: back,
        tags: tags,
        language: lang,
        level: 0,
        nextReview: todayISO(),
        repetitions: 0,
        erreurs: 0,
        interval: 1,
        ease: 2.5
    };
}

/* =====================================
    LOGIQUE SRS (Spaced Repetition)
===================================== */

function applyGrade(card, grade) {
  const d = new Date();
  if (grade === 0) { // Échec
    card.erreurs = (card.erreurs || 0) + 1;
    card.repetitions = 0;
    card.interval = 1;
    card.ease = Math.max(1.3, (card.ease || 2.5) - 0.2);
    d.setDate(d.getDate() + 1);
  } else if (grade === 1) { // Difficile
    card.repetitions++;
    card.interval = Math.max(1, Math.round(card.interval * 1.5));
    card.ease = Math.max(1.3, (card.ease || 2.5) - 0.05);
    d.setDate(d.getDate() + card.interval);
  } else if (grade === 2) { // Connu
    card.repetitions++;
    card.interval = Math.round(card.interval * (card.ease || 2.5));
    card.ease = (card.ease || 2.5) + 0.1;
    d.setDate(d.getDate() + card.interval);
  }
  card.nextReview = d.toISOString().split("T")[0];
}

/* =====================================
    INTERFACE DE RÉVISION
===================================== */
function startReviewSession() {
    const tag = document.getElementById("tagFilter").value;
    const lang = document.getElementById("langFilter")?.value || "all";
    const today = todayISO();
    startTime = Date.now();
    
    reviewPack = flashcards.filter(c => c.nextReview <= today);
    if (tag !== "all") reviewPack = reviewPack.filter(c => c.tags.includes(tag));
    if (lang !== "all") reviewPack = reviewPack.filter(c => c.language === lang);

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
        <small style="color: gray;">[${currentCard.language}] - ${currentIndex + 1} / ${reviewPack.length}</small>
        <h1 style="font-size: 2.5rem; margin: 10px 0;">${currentCard.front}</h1>
        <p style="font-style: italic; color: #007ACC;">${currentCard.tags.join(', ')}</p>
    `;
    ["know", "dontKnow", "hard"].forEach(id => document.getElementById(id).style.display = "none");
    document.getElementById("showAnswer").style.display = "inline-block";
}

function revealAnswer() {
    const cardArea = document.getElementById("reviewCard");
    cardArea.innerHTML += `<hr style="width:50%"><h2 style="color: #2ecc71;">${currentCard.back}</h2>`;
    document.getElementById("showAnswer").style.display = "none";
    ["know", "dontKnow", "hard"].forEach(id => document.getElementById(id).style.display = "inline-block");
}

async function handleGrade(grade) {
    applyGrade(currentCard, grade);
    logRevision(grade);
    await saveFlashcards();
    
    currentIndex++;
    if (currentIndex < reviewPack.length) {
        showCard();
    } else {
        document.getElementById("reviewCard").innerHTML = "✅ Session terminée !";
        ["know", "dontKnow", "hard"].forEach(id => document.getElementById(id).style.display = "none");
        document.getElementById("startReview").style.display = "inline-block";
        updateStats();
        updateChart();
    }
}

function logRevision(grade) {
    const today = todayISO();
    if (!revisionLog[today]) revisionLog[today] = { success: 0, fail: 0, timeSeconds: 0 };
    grade >= 1 ? revisionLog[today].success++ : revisionLog[today].fail++;
    const sessionTime = Math.round((Date.now() - startTime) / 1000);
    revisionLog[today].timeSeconds += (sessionTime || 0);
    startTime = Date.now();
}

/* =====================================
    GESTION DE L'AFFICHAGE & LISTE
===================================== */
function displayFlashcards() {
    const list = document.getElementById("flashcardsList");
    const activeTag = document.getElementById("tagFilter").value;
    const activeLang = document.getElementById("langFilter")?.value || "all";
    list.innerHTML = "";

    let filtered = flashcards.filter(c => 
        (activeTag === "all" || c.tags.includes(activeTag)) &&
        (activeLang === "all" || c.language === activeLang)
    );

    [...filtered].reverse().forEach(card => {
        const li = document.createElement("li");
        li.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;";
        li.innerHTML = `
            <div>
                <span class="badge-lang" style="background:#007ACC; color:white; padding:2px 5px; border-radius:4px; font-size:10px; margin-right:5px;">${card.language}</span>
                <strong>${card.front}</strong> - ${card.back}
                <br><small style="color: #007ACC;">${card.tags.join(', ')}</small>
            </div>
            <button class="delete-btn" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>
        `;
        li.querySelector(".delete-btn").onclick = async () => {
            if(confirm("Supprimer cette carte ?")) {
                flashcards = flashcards.filter(c => c.id !== card.id);
                await saveFlashcards(); displayFlashcards(); updateStats(); updateFilters();
            }
        };
        list.appendChild(li);
    });
}

function updateFilters() {
    const tagSelect = document.getElementById("tagFilter");
    const langSelect = document.getElementById("langFilter");
    
    const tagsSet = new Set();
    const langsSet = new Set();
    flashcards.forEach(c => {
        c.tags.forEach(t => tagsSet.add(t));
        if(c.language) langsSet.add(c.language);
    });

    const currentTag = tagSelect.value;
    tagSelect.innerHTML = '<option value="all">Tous les tags</option>';
    [...tagsSet].sort().forEach(t => tagSelect.add(new Option(t, t)));
    tagSelect.value = currentTag;

    if (langSelect) {
        const currentLang = langSelect.value;
        langSelect.innerHTML = '<option value="all">Toutes les langues</option>';
        [...langsSet].sort().forEach(l => langSelect.add(new Option(l, l)));
        langSelect.value = currentLang;
    }
}

/* =====================================
    STATISTIQUES & DASHBOARD
===================================== */
function updateStats() {
    const today = todayISO();
    document.getElementById("stat-total").textContent = flashcards.length;
    document.getElementById("stat-new").textContent = flashcards.filter(c => c.repetitions === 0).length;
    document.getElementById("stat-review").textContent = flashcards.filter(c => c.nextReview <= today).length;
    document.getElementById("stat-known").textContent = flashcards.filter(c => c.repetitions >= 5).length;
    
    let reps = 0, errs = 0;
    flashcards.forEach(c => { reps += c.repetitions; errs += (c.erreurs || 0); });
    const success = reps === 0 ? 0 : Math.round(((reps - errs) / reps) * 100);
    document.getElementById("stat-success").textContent = success + "%";
    updatePerformanceDashboard();
}

function updatePerformanceDashboard() {
    const today = todayISO();
    const data = revisionLog[today] || { success: 0, fail: 0 };
    
    if (document.getElementById("todayRevised")) 
        document.getElementById("todayRevised").textContent = `Cartes révisées aujourd'hui : ${data.success + data.fail}`;
    if (document.getElementById("todaySuccess")) 
        document.getElementById("todaySuccess").textContent = `Réussites : ${data.success} / Échecs : ${data.fail}`;

    const priorityList = document.getElementById("priorityList");
    if (priorityList) {
        priorityList.innerHTML = "";
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomStr = tomorrow.toISOString().split("T")[0];
        const tomorrowCards = flashcards.filter(c => c.nextReview === tomStr);

        if (tomorrowCards.length === 0) {
            priorityList.innerHTML = "<li>Aucune carte prévue pour demain.</li>";
        } else {
            tomorrowCards.forEach(c => {
                const li = document.createElement("li");
                li.innerHTML = `<strong>${c.front}</strong> <small>(${c.language})</small>`;
                priorityList.appendChild(li);
            });
        }
    }

    // Progrès par catégorie
    const tagList = document.getElementById("tagList");
    if (tagList) {
        tagList.innerHTML = "";
        const tagMap = {};
        flashcards.forEach(c => {
            const tags = c.tags.length > 0 ? c.tags : ["Divers"];
            tags.forEach(t => {
                if (!tagMap[t]) tagMap[t] = { total: 0, progress: 0 };
                tagMap[t].total++;
                tagMap[t].progress += Math.min(100, (c.repetitions / 5) * 100);
            });
        });
        Object.entries(tagMap).forEach(([tag, val]) => {
            const avg = Math.round(val.progress / val.total);
            const li = document.createElement("li");
            li.innerHTML = `<div style="margin-bottom:8px;"><strong>${tag}</strong>: ${avg}% <div style="background:#eee; height:5px; border-radius:3px;"><div style="background:#007ACC; width:${avg}%; height:100%;"></div></div></div>`;
            tagList.appendChild(li);
        });
    }
}

function updateChart() {
    const labels = Object.keys(revisionLog).sort().slice(-7);
    const ctx = document.getElementById("progressChart");
    if (!ctx || !window.Chart) return;
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: "✅", data: labels.map(l => revisionLog[l].success), backgroundColor: '#2ecc71' },
                { label: "❌", data: labels.map(l => revisionLog[l].fail), backgroundColor: '#e74c3c' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

/* =====================================
    INIT DOM & EVENTS
===================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Menu & Thème (Fonctions de base)
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    if(menuBtn) menuBtn.onclick = () => { sideMenu.classList.add("open"); overlay.classList.add("show"); };
    if(overlay) overlay.onclick = () => { sideMenu.classList.remove("open"); overlay.classList.remove("show"); };

    const toggleThemeBtn = document.getElementById("toggle-theme");
    if(toggleThemeBtn) {
        toggleThemeBtn.onclick = () => {
            const isDark = document.body.classList.toggle("dark");
            localStorage.setItem("theme", isDark ? "dark" : "light");
            toggleThemeBtn.textContent = isDark ? "☀️" : "🌙";
        };
    }

    // Actions révision
    document.getElementById("startReview").onclick = startReviewSession;
    document.getElementById("showAnswer").onclick = revealAnswer;
    document.getElementById("know").onclick = () => handleGrade(2);
    document.getElementById("hard").onclick = () => handleGrade(1);
    document.getElementById("dontKnow").onclick = () => handleGrade(0);
    document.getElementById("tagFilter").onchange = displayFlashcards;
    if(document.getElementById("langFilter")) document.getElementById("langFilter").onchange = displayFlashcards;

    // Ajout manuel
    document.getElementById("addFlashcard").onclick = async () => {
        const lang = document.getElementById("cardLang")?.value.trim() || "Général";
        const front = document.getElementById("frontSide")?.value.trim();
        const back = document.getElementById("backSide")?.value.trim();
        const tag = document.getElementById("tag")?.value.trim();

        if(front && back) {
            const tagsArray = tag ? tag.split(',').map(t => t.trim()) : [];
            flashcards.push(createFlashcard(front, back, tagsArray, lang));
            await saveFlashcards();
            displayFlashcards(); updateStats(); updateFilters();
            document.getElementById("frontSide").value = "";
            document.getElementById("backSide").value = "";
            document.getElementById("tag").value = "";
        }
    };

    // Export / Import (Les 100 lignes récupérées ici !)
    document.getElementById("exportFlashcards").onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flashcards));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "flashcards_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const importInput = document.getElementById("importFlashcards");
    document.getElementById("btnImportFlashcards").onclick = () => importInput.click();
    importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                flashcards = [...flashcards, ...imported];
                await saveFlashcards();
                location.reload();
            } catch (err) { alert("Fichier JSON invalide"); }
        };
        reader.readAsText(file);
    };

    document.getElementById("clearFlashcards").onclick = async () => {
        if(confirm("Tout effacer ? Cette action est irréversible.")) {
            flashcards = [];
            await saveFlashcards();
            location.reload();
        }
    };

    loadFlashcards().then(() => {
        displayFlashcards(); updateStats(); updateFilters(); updateChart();
    });
});
