# Java Vault - Application d'Offuscation de Code Java

## 1. Contexte et Objectif
**Java Vault** est une application conçue pour sécuriser le partage de code source Java avec des Intelligences Artificielles (LLM). Elle permet d'offusquer le code sensible avant de le soumettre à une IA, puis de réaliser l'opération inverse (désoffuscation) sur le code généré en retour.

L'application est disponible en deux formats :
- **Web (SPA) :** Un fichier HTML unique portable et autonome.
- **Desktop (Tauri) :** Une application de bureau pour Windows, macOS et Linux.

## 2. Fonctionnalités Principales

### 🔒 Offuscation (Moteur AST)
L'offuscation s'appuie sur une analyse syntaxique réelle via `java-parser` (AST - Abstract Syntax Tree).
- **Remplacement intelligent :** Les chaînes de caractères (`STR_X`) et les noms de variables (`VAR_X`) sont systématiquement remplacés.
- **Mode Haute Sécurité :** Activé si le package commence par `pf.gov` (offuscation des classes et méthodes).
- **Suppression des commentaires :** Nettoyage complet pour éviter les fuites d'informations.

### 🔓 Désoffuscation (Retour IA)
Restaure les noms originaux dans le texte généré par l'IA en utilisant le dictionnaire de mapping stocké localement.

### 📂 Gestion de Fichiers et Batch
- **Chargement multiple :** Support du glisser-déposer ou de la sélection de plusieurs fichiers `.java`.
- **Traitement par lot :** Offuscation cohérente sur l'ensemble des fichiers chargés.

### 💾 Persistance et Partage
- **Dictionnaire local :** Les correspondances sont sauvegardées dans le `localStorage` avec mise en cache mémoire pour la performance.
- **Import/Export :** Possibilité d'exporter le dictionnaire au format JSON pour le sauvegarder ou le partager entre différents postes.

### 🎨 Expérience Utilisateur (UX)
- **Mode Sombre/Clair :** Thème adaptatif avec mémorisation de la préférence utilisateur.
- **Raccourcis Clavier :** `Ctrl+Enter` pour lancer l'offuscation/désoffuscation rapidement.
- **Feedback visuel :** Boutons de copie avec confirmation et gestion d'état.

## 3. Stack Technique
- **Frontend :** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Analyse Syntaxique :** `java-parser`.
- **Desktop :** [Tauri v2](https://tauri.app/).
- **Outil de Build :** Vite + `vite-plugin-singlefile`.
- **Gestionnaire de paquets :** `pnpm`.

## 4. Installation et Développement

### Prérequis
- **Node.js** (v18+)
- **pnpm** (`npm install -g pnpm`)
- **Rust** (pour la version desktop) : [Installer Rust](https://www.rust-lang.org/tools/install)

### Installation des dépendances
```bash
pnpm install
```

### Développement
- **Version Web :** `pnpm dev` (ouvre `http://localhost:5173`)
- **Version Desktop :** `pnpm tauri dev`

## 5. Construction (Build)

### Générer le fichier HTML unique (Web)
Le fichier sera généré dans le dossier `dist/index.html`. Ce fichier est entièrement autonome : vous pouvez le déplacer et l'utiliser en double-cliquant dessus pour l'ouvrir dans n'importe quel navigateur moderne, sans avoir besoin d'un serveur.

```bash
pnpm build
```

### Générer l'application de bureau (Tauri)
Pour compiler l'exécutable pour votre plateforme :

**Prérequis spécifiques par OS :**
- **Windows :** [C++ Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- **Linux :** Dépendances système (ex: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`)
- **macOS :** Xcode Command Line Tools (`xcode-select --install`)

**Commande de build :**
```bash
pnpm tauri build
```
Les installateurs seront disponibles dans `src-tauri/target/release/bundle/`.

## 6. Architecture du Projet
- `index.html` : Interface utilisateur.
- `src/` : Logique frontend (main, obfuscator, storage).
- `src-tauri/` : Configuration et code natif Tauri (Rust).
- `vite.config.js` : Configuration du build single-file.

---
*Version 1.1.0*
