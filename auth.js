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

/* ========= AUTH ========= */

export async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
    await ensureUserDoc();
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
    await ensureUserDoc();
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur inscription : " + e.message);
  }
}

// AJOUT DE LA FONCTION LOGOUT MANQUANTE
export async function logout() {
  try {
    await signOut(auth);
    window.location.reload(); // Recharge la page pour basculer en mode local
  } catch (e) {
    alert("Erreur déconnexion : " + e.message);
  }
}


/* ========= FIRESTORE INIT ========= */

async function ensureUserDoc() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // RÉCUPÉRATION DES DONNÉES LOCALES ACTUELLES
    // (Pour ne pas perdre ce que tu as fait avant de te connecter)
    const localTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const localRSS = JSON.parse(localStorage.getItem("rssFeeds") || "[]");
    const localFlashcards = JSON.parse(localStorage.getItem("flashcards") || "[]");
    const localLog = JSON.parse(localStorage.getItem("revisionLog") || "{}");

    // CRÉATION DU DOCUMENT AVEC LES DONNÉES LOCALES
    await setDoc(ref, {
      tasks: localTasks,
      rssFeeds: localRSS.length > 0 ? localRSS : [{ name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" }],
      flashcards: localFlashcards,
      revisionLog: localLog,
      theme: localStorage.getItem("theme") || "light",
      createdAt: new Date()
    });
    console.log("Premier compte créé : Données locales synchronisées vers le Cloud !");
  }
}
