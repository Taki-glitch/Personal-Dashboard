/* ===============================
   FIREBASE IMPORTS
================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   FIREBASE CONFIG
================================ */
const firebaseConfig = {
  apiKey: "AIzaSyBNgBcya0G9Yc4t1uK1U4yzuR0R0gF-EpY",
  authDomain: "personal-dashboard-12eb6.firebaseapp.com",
  projectId: "personal-dashboard-12eb6",
  storageBucket: "personal-dashboard-12eb6.firebasestorage.app",
  messagingSenderId: "1072594247248",
  appId: "1:1072594247248:web:c417233e13860625967b55"
};

const app = initializeApp(firebaseConfig);

/* ===============================
   EXPORTS GLOBAUX
================================ */
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* ===============================
   ÉTAT UTILISATEUR GLOBAL
   (utilisé par budget.js, tasks, etc.)
================================ */
window.currentUser = null;

/* ===============================
   AUTHENTIFICATION
================================ */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    window.currentUser = result.user;

    await ensureUserDoc();
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur Google : " + e.message);
  }
}

export async function loginEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    window.currentUser = result.user;

    await ensureUserDoc();
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur connexion : " + e.message);
  }
}

export async function registerEmail(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    window.currentUser = result.user;

    await ensureUserDoc();
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur inscription : " + e.message);
  }
}

export async function logout() {
  try {
    await signOut(auth);
    window.currentUser = null;
    window.location.reload(); // retour mode local
  } catch (e) {
    alert("Erreur déconnexion : " + e.message);
  }
}

/* ===============================
   PERSISTENCE SESSION
   (refresh / retour sur le site)
================================ */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.currentUser = user;
    await ensureUserDoc();
  } else {
    window.currentUser = null;
  }
});

/* ===============================
   FIRESTORE INIT UTILISATEUR
================================ */
async function ensureUserDoc() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return;

  /* ===== DONNÉES LOCALES ===== */
  const localTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  const localRSS = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
  const localFlashcards = JSON.parse(localStorage.getItem("flashcards") || "[]");
  const localLog = JSON.parse(localStorage.getItem("revisionLog") || "{}");
  const localBudgets = JSON.parse(localStorage.getItem("budgetLimits") || '{"global":0,"categories":{}}');
  const localExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");

  const defaultRSS = [
    { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" }
  ];

  /* ===== CRÉATION DU DOCUMENT ===== */
  await setDoc(ref, {
    tasks: localTasks,
    rssFeeds: localRSS.length > 0 ? localRSS : defaultRSS,
    flashcards: localFlashcards,
    revisionLog: localLog,
    budgets: localBudgets,
    expenses: localExpenses,
    theme: localStorage.getItem("theme") || "light",
    createdAt: new Date()
  });

  console.log("Compte Firebase créé – données locales synchronisées");
}
