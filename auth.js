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

/* =====================================================
   FIREBASE CONFIG
===================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBNgBcya0G9Yc4t1uK1U4yzuR0R0gF-EpY",
  authDomain: "personal-dashboard-12eb6.firebaseapp.com",
  projectId: "personal-dashboard-12eb6",
  storageBucket: "personal-dashboard-12eb6.firebasestorage.app",
  messagingSenderId: "1072594247248",
  appId: "1:1072594247248:web:c417233e13860625967b55"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* =====================================================
   ÉTAT UTILISATEUR GLOBAL (IMPORTANT)
===================================================== */
window.currentUser = null;

/* =====================================================
   AUTH LISTENER (CLÉ DU FIX)
===================================================== */
onAuthStateChanged(auth, async user => {
  window.currentUser = user || null;

  if (user) {
    await ensureUserDoc();
  }

  /* 🔥 SIGNAL GLOBAL : utilisateur prêt */
  window.dispatchEvent(new Event("user-ready"));
});

/* =====================================================
   AUTH ACTIONS
===================================================== */
export async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur Google : " + e.message);
  }
}

export async function loginEmail(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur connexion : " + e.message);
  }
}

export async function registerEmail(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur inscription : " + e.message);
  }
}

export async function logout() {
  try {
    await signOut(auth);
    window.currentUser = null;
    window.location.reload();
  } catch (e) {
    alert("Erreur déconnexion : " + e.message);
  }
}

/* =====================================================
   FIRESTORE INIT UTILISATEUR
===================================================== */
async function ensureUserDoc() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const localTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const localRSS = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
    const localFlashcards = JSON.parse(localStorage.getItem("flashcards") || "[]");
    const localLog = JSON.parse(localStorage.getItem("revisionLog") || "{}");

    await setDoc(ref, {
      tasks: localTasks,
      rssFeeds: localRSS.length
        ? localRSS
        : [{ name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" }],
      flashcards: localFlashcards,
      revisionLog: localLog,
      theme: localStorage.getItem("theme") || "light",
      createdAt: new Date()
    });
  }
}
