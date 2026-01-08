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
    // Pas besoin de ensureUserDoc ici si on part du principe 
    // que le compte existe déjà, mais le laisser ne fait pas de mal.
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


/* ========= FIRESTORE INIT ========= */

async function ensureUserDoc() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      tasks: [],
      rssFeeds: [],
      flashcards: [],
      revisionLog: {},
      theme: "light",
      createdAt: new Date()
    });
  }
}