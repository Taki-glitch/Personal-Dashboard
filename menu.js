/* menu.js */
import { auth, logout } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function initMenu() {
    const menuHTML = `
    <button id="toggle-theme" aria-label="Changer le thème">🌙</button>
    <button id="menu-btn" aria-label="Ouvrir le menu">☰</button>

    <div id="overlay"></div>

    <nav id="side-menu">
        <button id="close-menu" aria-label="Fermer le menu">✕</button>
        
        <div id="user-profile" style="padding: 20px; border-bottom: 1px solid #eee; text-align: center;">
            <p id="user-status-menu" style="font-size: 0.9rem; color: gray; margin-bottom: 10px;">Chargement...</p>
            <div id="user-info-menu" style="display: none;">
                <strong id="user-name-menu" style="display: block; margin-bottom: 10px; font-size: 1rem; color: #333;">Utilisateur</strong>
                <button id="btn-logout-menu" style="background: none; border: 1px solid #e74c3c; color: #e74c3c; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Déconnexion</button>
            </div>
            <div id="user-guest-menu" style="display: none;">
                <a href="login.html" style="text-decoration: none; color: #007ACC; font-weight: bold;">Se connecter</a>
            </div>
        </div>

        <ul>
            <li><a href="index.html">📊 Dashboard</a></li>
            <li><a href="flashcards.html">🧠 Flashcards</a></li>
            <li><a href="budget.html">💰 Budget</a></li>
        </ul>
    </nav>
    `;

    // Insertion au début du body
    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    // --- LOGIQUE DU MENU (OUVERTURE/FERMETURE) ---
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    const closeMenu = document.getElementById("close-menu");

    if (menuBtn && sideMenu && overlay) {
        menuBtn.onclick = () => { 
            sideMenu.classList.add("open"); 
            overlay.classList.add("show"); 
        };
        const closeFn = () => { 
            sideMenu.classList.remove("open"); 
            overlay.classList.remove("show"); 
        };
        if (closeMenu) closeMenu.onclick = closeFn;
        overlay.onclick = closeFn;
    }

    // --- LOGIQUE DU THÈME ---
    const themeBtn = document.getElementById("toggle-theme");
    if (themeBtn) {
        if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
        themeBtn.onclick = () => {
            document.body.classList.toggle("dark");
            localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
        };
    }

    // --- LOGIQUE AUTHENTIFICATION ---
    onAuthStateChanged(auth, (user) => {
        const status = document.getElementById("user-status-menu");
        const info = document.getElementById("user-info-menu");
        const guest = document.getElementById("user-guest-menu");
        const name = document.getElementById("user-name-menu");
        const logoutBtn = document.getElementById("btn-logout-menu");

        if (user) {
            if (status) status.style.display = "none";
            if (guest) guest.style.display = "none";
            if (info) info.style.display = "block";
            if (name) name.textContent = user.displayName || user.email;
            if (logoutBtn) logoutBtn.onclick = () => logout();
        } else {
            if (status) status.style.display = "none";
            if (info) info.style.display = "none";
            if (guest) guest.style.display = "block";
        }
    });
}
