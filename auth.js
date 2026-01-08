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
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNgBcya0G9Yc4t1uK1U4yzuR0R0gF-EpY",
  authDomain: "personal-dashboard-12eb6.firebaseapp.com",
  projectId: "personal-dashboard-12eb6",
  storageBucket: "personal-dashboard-12eb6.firebasestorage.app",
  messagingSenderId: "1072594247248",
  appId: "1:1072594247248:web:c417233e13860625967b55"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- FONCTION GOOGLE ---
export async function loginWithGoogle() {
    try {
        await signInWithPopup(auth, provider);
        window.location.href = 'index.html'; 
    } catch (error) {
        alert("Erreur Google : " + error.message);
    }
}

// --- FONCTIONS EMAIL / MOT DE PASSE ---
export async function registerEmail(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        window.location.href = 'index.html';
    } catch (error) {
        alert("Erreur d'inscription : " + error.message);
    }
}

export async function loginEmail(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'index.html';
    } catch (error) {
        alert("Identifiants incorrects : " + error.message);
    }
}

export function logout() {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    });
}

export { auth, db };
