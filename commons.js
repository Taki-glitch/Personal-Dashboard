/* =====================================================
   common.js - GESTION COMMUNE (Menu, Thème, Auth UI)
===================================================== */
import { auth, logout } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. GESTION DU THÈME & MENU
document.addEventListener("DOMContentLoaded", () => {
    // --- Dark Mode ---
    const themeBtn = document.getElementById("toggle-theme");
    const body = document.body;
    
    // Charger la préférence
    if (localStorage.getItem("theme") === "dark") {
        body.classList.add("dark");
    }

    if (themeBtn) {
        themeBtn.onclick = () => {
            body.classList.toggle("dark");
            localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
        };
    }

    // --- Menu Mobile ---
    const menuBtn = document.getElementById("menu-btn");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay"); // S'assurer que cet élément existe dans le HTML
    const closeMenu = document.getElementById("close-menu");

    function toggleMenu() {
        if (sideMenu) sideMenu.classList.toggle("open");
        if (overlay) overlay.classList.toggle("show");
    }

    if (menuBtn) menuBtn.onclick = toggleMenu;
    if (closeMenu) closeMenu.onclick = toggleMenu;
    if (overlay) overlay.onclick = toggleMenu;
});

// 2. GESTION UTILISATEUR (HEADER DU MENU)
function updateUserUI(user) {
    const status = document.getElementById("user-status");
    const info = document.getElementById("user-info");
    const guest = document.getElementById("user-guest");
    const name = document.getElementById("user-name");
    const logoutBtn = document.getElementById("btn-logout");

    // Si les éléments n'existent pas sur la page, on arrête
    if (!status) return;

    if (user) {
        status.style.display = "none";
        if (guest) guest.style.display = "none";
        if (info) info.style.display = "block";
        if (name) name.textContent = user.displayName || user.email;
        
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await logout();
                window.location.reload();
            };
        }
    } else {
        status.style.display = "none";
        if (info) info.style.display = "none";
        if (guest) guest.style.display = "block";
    }
}

// Écouteur global d'authentification pour mettre à jour l'UI
onAuthStateChanged(auth, (user) => {
    updateUserUI(user);
});
