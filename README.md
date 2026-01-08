Personal Dashboard

Mon Dashboard Personnel est une application web personnalisée qui centralise vos outils et informations utiles au quotidien : météo, flux RSS, ToDo list, flashcards pour l’apprentissage, mot du jour, et plus encore. L’application fonctionne en mode local et se synchronise avec Firebase pour un stockage cloud sécurisé.

🔹 Fonctionnalités
1. Authentification
Connexion avec Google ou email/mot de passe.
Gestion du mode local pour les utilisateurs non connectés.
Synchronisation automatique des données vers le cloud Firebase.

2. Thème
Mode clair et mode sombre.
Changement de thème instantané avec persistance dans le cloud.

3. ToDo List
Ajouter, supprimer et gérer vos tâches.
Synchronisation cloud si connecté.

4. Météo
Prévisions horaires pour aujourd’hui et demain.
Basé sur l’API OpenWeatherMap.

5. Flux RSS
Ajouter et gérer vos sources RSS personnalisées.
Lecture des 3 derniers articles de chaque flux.
Marquage des articles lus.

6. Flashcards & Révisions (SRS)
Création et gestion de flashcards pour l’apprentissage.
Système de répétition espacée (Spaced Repetition System).
Statistiques détaillées et graphique des performances.
Widget sur la page d’accueil pour les révisions rapides.
Filtrage par tags.

7. Mot du jour
Affiche un mot russe quotidien avec sa traduction.
Sélection basée sur le jour de l’année.

8. Interface
Menu latéral avec navigation entre le Dashboard et les Flashcards.
UI responsive et agréable avec effets interactifs.

🔹 Technologies utilisées
HTML5, CSS3, JavaScript (ES6 modules)
Firebase Authentication & Firestore pour la gestion des utilisateurs et la synchronisation cloud.
OpenWeatherMap API pour la météo.
RSS2JSON pour la récupération des flux RSS.
Chart.js pour les graphiques de révision.

🔹 Installation
1. Cloner le projet :
git clone https://github.com/ton-utilisateur/personal-dashboard.git

2. Installer un serveur local (optionnel pour tests) :
# Avec Python 3
python -m http.server 8000

3. Ouvrir index.html dans un navigateur moderne.

4.Pour utiliser Firebase, créer un projet et remplacer les clés dans auth.js :
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

🔹 Usage
- Connexion / Déconnexion : Boutons dans le menu latéral.
- Changer le thème : Bouton 🌙/☀️ en haut à droite.
- Ajouter une tâche : Section ToDo List.
- Ajouter un flux RSS : Section Flux RSS avec nom et URL.
- Réviser des flashcards : Section Flashcards → sélectionner un tag → démarrer la session.
- Voir le mot du jour : Widget sur la page d’accueil.

🔹 Structure des fichiers
📂 personal-dashboard/
├─ index.html          # Page principale (Dashboard)
├─ flashcards.html     # Gestion des flashcards
├─ style.css           # Styles globaux et composants
├─ script.js           # Logique du Dashboard
├─ auth.js             # Authentification et synchronisation Firebase
├─ flashcards.js       # Gestion des flashcards et SRS
├─ list.json           # Liste de mots russes pour le mot du jour
└─ README.md           # Documentation

🔹 Contribution
Toutes les contributions sont les bienvenues !
Fork le projet
Créer une branche (git checkout -b feature/ma-fonctionnalité)
Commit tes changements (git commit -m 'Ajout fonctionnalité X')
Push ta branche (git push origin feature/ma-fonctionnalité)
Ouvrir un Pull Request

🔹 Licence
MIT License — voir le fichier LICENSE pour plus de détails.
