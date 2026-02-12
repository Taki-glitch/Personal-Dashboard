/* menu.js */
import { auth, logout } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function initMenu() {
    // 1. Structure HTML du menu
    const menuHTML = `
    <button id="toggle-theme" aria-label="Changer le thème">🌙</button>
    <button id="menu-btn" aria-label="Ouvrir le menu">☰</button>
    <div id="overlay"></div>
    <nav id="side-menu">
        <button id="close-menu" aria-label="Fermer le menu">✕</button>
        <div id="user-profile-menu" style="padding: 20px; border-bottom: 1px solid #eee; text-align: center;">
            <p id="user-status-nav" style="font-size: 0.9rem; color: gray;">Chargement...</p>
            <div id="user-info-nav" style="display: none;">
                <strong id="user-name-nav" style="display: block; margin-bottom: 10px; color: #333;">Utilisateur</strong>
                <button id="btn-logout-nav" style="background:none; border:1px solid #e74c3c; color:#e74c3c; padding:5px 10px; border-radius:5px; cursor:pointer;">Déconnexion</button>
            </div>
            <div id="user-guest-nav" style="display: none;">
                <a href="login.html" style="text-decoration:none; color:#007ACC; font-weight:bold;">Se connecter</a>
            </div>
        </div>
        <ul>
            <li><a href="index.html">📊 Dashboard</a></li>
            <li><a href="flashcards.html">🧠 Flashcards</a></li>
            <li><a href="budget.html">💰 Budget</a></li>
            <li><a href="dietetique.html">🥗 Diététique</a></li>
        </ul>
    </nav>`;

    // Insertion
    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    // 2. Gestion Ouverture/Fermeture
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    const closeMenu = document.getElementById("close-menu");

    const toggleMenu = (show) => {
        sideMenu.classList.toggle("open", show);
        overlay.classList.toggle("show", show);
    };

    menuBtn.onclick = () => toggleMenu(true);
    closeMenu.onclick = () => toggleMenu(false);
    overlay.onclick = () => toggleMenu(false);

    // 3. Gestion Thème
    const themeBtn = document.getElementById("toggle-theme");
    if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
    themeBtn.onclick = () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    };

    // 4. Gestion Auth dans le menu
    onAuthStateChanged(auth, (user) => {
        const status = document.getElementById("user-status-nav");
        const info = document.getElementById("user-info-nav");
        const guest = document.getElementById("user-guest-nav");
        const name = document.getElementById("user-name-nav");
        const logoutBtn = document.getElementById("btn-logout-nav");

        if (user) {
            status.style.display = "none";
            guest.style.display = "none";
            info.style.display = "block";
            name.textContent = user.displayName || user.email;
            logoutBtn.onclick = () => logout();
        } else {
            status.style.display = "none";
            info.style.display = "none";
            guest.style.display = "block";
        }
    });
}
