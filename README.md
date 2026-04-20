# Java Vault - Application d'Offuscation de Code Java

## 1. Contexte et Objectif
**Java Vault** est une application web côté client (Single Page Application) conçue pour sécuriser le partage de code source Java avec des Intelligences Artificielles (LLM). Elle permet d'offusquer le code sensible avant de le soumettre à une IA, puis de réaliser l'opération inverse (désoffuscation) sur le code généré en retour.

L'application est entièrement portable, fonctionnant dans un **fichier HTML unique** sans dépendance à un serveur, et peut être utilisée hors-ligne.

## 2. Fonctionnalités Principales

### 🔒 Offuscation (Moteur AST)
L'offuscation n'utilise pas de simples expressions régulières, mais s'appuie sur une analyse syntaxique réelle via `java-parser` (AST - Abstract Syntax Tree).
- **Remplacement intelligent :** Les chaînes de caractères (`STR_X`) et les noms de variables (`VAR_X`) sont systématiquement remplacés.
- **Mode Haute Sécurité :** Activé automatiquement si le package Java commence par `pf.gov`. Dans ce mode, les noms de classes (`CLASS_X`) et de méthodes (`METHOD_X`) sont également offusqués.
- **Suppression des commentaires :** Tous les commentaires (ligne et bloc) sont supprimés pour éviter toute fuite d'information.

### 🔓 Désoffuscation (Retour IA)
Permet de restaurer les noms originaux dans le texte généré par l'IA en utilisant le dictionnaire de mapping stocké localement.

### 💾 Persistance et Session
- **Dictionnaire local :** Les correspondances entre les noms originaux et les identifiants offusqués sont sauvegardées dans le `localStorage` du navigateur.
- **Cumulatif :** Le dictionnaire s'enrichit à chaque session d'offuscation, permettant de désoffusquer des réponses d'IA basées sur plusieurs fichiers différents.
- **Reset de session :** Possibilité de vider manuellement le dictionnaire.

## 3. Stack Technique
- **Frontend :** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Analyse Syntaxique :** `java-parser` pour la génération de l'AST.
- **Outil de Build :** Vite + `vite-plugin-singlefile` pour une portabilité totale.
- **Gestionnaire de paquets :** `pnpm`.

## 4. Installation et Utilisation

### Prérequis
- Node.js (v18+)
- pnpm

### Installation
```bash
pnpm install
```

### Développement
Pour lancer le serveur de développement avec rechargement à chaud :
```bash
pnpm dev
```

### Construction (Build)
Pour générer le fichier HTML unique portable dans le dossier `dist/` :
```bash
pnpm build
```

## 5. Architecture du Projet
- `index.html` : Interface utilisateur et structure.
- `src/main.js` : Gestion des événements UI et orchestration.
- `src/obfuscator.js` : Logique d'analyse AST, offuscation et désoffuscation.
- `src/storage.js` : Gestion de la persistance locale et versionning.
- `vite.config.js` : Configuration du build single-file.

---
*Version 1.0.0*
