# 🚀 Personal Dashboard

Un tableau de bord personnel tout-en-un conçu pour centraliser l'organisation quotidienne, l'apprentissage de langues et la gestion financière. 

## ✨ Fonctionnalités

### 🏠 Dashboard Central
- **Météo en direct** : Intégration avec l'API OpenWeather.
- **Gestion de tâches** : Liste de choses à faire simple et efficace.
- **Lecteur RSS** : Ajoutez vos sources préférées pour rester informé.
- **Horloge Dynamique** : Affichage de l'heure en temps réel.

### 🧠 Apprentissage (Flashcards)
- **Système SRS** : Algorithme de répétition espacée pour optimiser la mémorisation.
- **Statistiques de progression** : Visualisation de votre apprentissage via des graphiques.
- **Import/Export JSON** : Sauvegardez ou partagez vos listes de vocabulaire facilement.

### 💰 Gestion de Budget
- **Suivi des dépenses** : Enregistrez vos transactions par catégorie.
- **Limites budgétaires** : Définissez des objectifs mensuels et suivez vos dépassements.
- **Historique** : Naviguez entre les mois pour analyser vos habitudes de consommation.

### 🔐 Authentification & Synchro
- **Firebase Auth** : Connexion via Google ou Email.
- **Mode Hybride** : Utilisation locale (LocalStorage) ou synchronisée sur le Cloud (Firestore).
- **Thème Personnalisable** : Support complet du Mode Sombre (Dark Mode).

## 🛠️ Technologies utilisées

- **Frontend** : HTML5, CSS3 (Variables, Flexbox, Grid), JavaScript (ES6+).
- **Backend/Base de données** : Firebase Auth & Firestore.
- **Visualisation** : Chart.js / Canvas API pour les graphiques.
- **API** : OpenWeatherMap.

## ⚙️ Configuration et Installation

1. **Cloner le dépôt** :
   ```bash
   git clone [https://github.com/votre-utilisateur/personal-dashboard.git](https://github.com/votre-utilisateur/personal-dashboard.git)
Configuration Firebase :

Créez un projet sur Firebase Console.

Activez Authentication (Google & Email) et Firestore Database.

Créez un fichier auth.js (si non présent) et ajoutez votre configuration Firebase :

JavaScript

const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJET.firebaseapp.com",
  projectId: "VOTRE_PROJET",
  // ... le reste de vos identifiants
};
Clé API Météo :

Obtenez une clé sur OpenWeatherMap.

Modifiez la clé dans le fichier config.js.

Lancement :

Ouvrez simplement index.html avec une extension type "Live Server" sur VS Code.

📂 Structure du projet
index.html : Page d'accueil et widgets principaux.

flashcards.html / flashcards.js : Système d'apprentissage.

budget.html / budget.js : Interface de gestion financière.

style.css : Design global et gestion du mode sombre.

auth.js : Logique de connexion et synchronisation Firebase.

📝 Note : Ce projet est en constante évolution. N'hésitez pas à proposer des Pull Requests !
