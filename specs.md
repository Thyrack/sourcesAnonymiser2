# Spécifications Techniques : Application d'Offuscation de Code Java (Java Vault)

## 1. Contexte et Objectif
L'objectif est de développer une application web côté client (Single Page Application) permettant d'offusquer du code source Java sensible avant de le soumettre à une Intelligence Artificielle (LLM), et de réaliser l'opération inverse (désoffuscation) sur le code généré par l'IA. 
L'application finale doit être **un fichier HTML unique et 100% portable**, fonctionnant hors-ligne sans serveur.

## 2. Stack Technique
* **Frontend** : HTML5, CSS3, Vanilla JavaScript (ES6+).
* **Analyse Syntaxique** : `java-parser` (NPM package) pour générer l'AST (Abstract Syntax Tree).
* **Outil de Build** : Vite + `vite-plugin-singlefile` pour compiler l'application en un seul fichier `index.html`.
* **Persistance** : `localStorage` du navigateur.

## 3. Architecture du Projet (Fichiers à générer)
L'agent IA devra générer le code source pour les fichiers suivants :
1. `package.json` : Définition des dépendances et scripts.
2. `vite.config.js` : Configuration de Vite pour le single-file build.
3. `index.html` : L'interface utilisateur.
4. `src/main.js` : Point d'entrée logique, gestion de l'UI et des événements.
5. `src/obfuscator.js` : Moteur d'analyse AST et logique d'offuscation.
6. `src/storage.js` : Gestion de la persistance (`localStorage`) et du versionning.

## 4. Spécifications Logiques : Fonctionnalités Principales

### 4.1. Le Moteur d'Offuscation (AST)
* **Principe :** Le code Java en entrée doit être parsé par `java-parser`.
* **Règle Contextuelle (`pf.gov`) :** * Le script doit rechercher le nœud `PackageDeclaration`.
  * Si la valeur du package commence par `pf.gov`, le flag `isHighSecurity` est activé.
* **Extraction des Nœuds (Visiteur AST) :** Le script doit parcourir l'AST et stocker les positions (index de début et de fin) des éléments suivants :
  1. `StringLiteral` (Contenu des chaînes de caractères) -> À offusquer en `STR_X`.
  2. `VariableDeclaratorId` (Noms de variables) -> À offusquer en `VAR_X`.
  3. **Uniquement si `isHighSecurity === true` :**
     * `ClassDeclaration` & `InterfaceDeclaration` (Noms) -> À offusquer en `CLASS_X`.
     * `MethodDeclaration` (Noms des méthodes) -> À offusquer en `METHOD_X`.
* **Suppression des Commentaires :** Les commentaires (ligne et bloc) identifiés par l'AST doivent être marqués pour suppression (remplacés par une chaîne vide).
* **Mécanique de Remplacement (CRITIQUE) :** * Le remplacement ne doit pas être fait via Regex, mais en découpant la chaîne de caractères d'origine à l'aide des index de l'AST.
  * **Règle d'or :** Le tableau des remplacements doit être **trié par index de départ décroissant** (de la fin du fichier vers le début) avant l'exécution, afin de ne pas fausser les offsets lors des remplacements.

### 4.2. Le Moteur de Désoffuscation (Retour IA)
* L'entrée est du texte libre (markdown contenant du code Java) et non du code compilable. **L'AST ne doit pas être utilisé ici.**
* **Mécanique :** Itérer sur le dictionnaire de persistance (Mapping).
* **Règle d'or :** Trier les clés du dictionnaire par **longueur décroissante** (ex: remplacer `VAR_10` avant `VAR_1`) pour éviter les conflits partiels.
* Utiliser un `replaceAll()` ou une Regex globale pour restaurer les valeurs originales.

### 4.3. Persistance et Dictionnaire (Mapping)
* **Structure du Dictionnaire :** `{ "VAR_1": "nomOriginal", "STR_1": "texte_secret", ... }`
* **Versionning :** L'application inclut une constante `const APP_VERSION = "1.0.0"`. Cette version doit être stockée dans le `localStorage` avec les données.
* **Sauvegarde :** À chaque offuscation, les nouvelles paires (Clé/Valeur) doivent être fusionnées (merged) avec le dictionnaire existant dans le `localStorage`.
* **Clé LocalStorage :** `java_vault_mapping`.

## 5. Spécifications de l'Interface Utilisateur (UI)

* **Design :** Propre, moderne, typographie monospace pour le code. Utiliser du CSS natif.
* **Header :** Titre de l'application et affichage de la version (`v1.0.0`).
* **Disposition :** Deux colonnes ou deux sections distinctes :
  * **Section 1 : "Préparation (Aller)"**
    * Textarea (Input) : "Collez le code Java original ici".
    * Bouton d'action : "🔒 Offusquer".
    * Textarea (Output - ReadOnly) : "Code offusqué à copier pour l'IA".
  * **Section 2 : "Restauration (Retour)"**
    * Textarea (Input) : "Collez la réponse de l'IA ici".
    * Bouton d'action : "🔓 Restaurer le code".
    * Textarea (Output - ReadOnly) : "Réponse restaurée".
* **Panneau de contrôle additionnel :**
  * Un bouton "Vider le dictionnaire (Reset de session)" avec confirmation utilisateur.
  * Un encart affichant le nombre d'entrées actuellement mémorisées dans le dictionnaire local.

## 6. Instructions pour l'Agent IA (Directives de Code)

1. **Initialisation :** Génère un `package.json` contenant au minimum `"java-parser": "^2.3.0"`, `"vite": "^5.0.0"`, et `"vite-plugin-singlefile": "^2.0.0"`. Le script de build doit être `"build": "vite build"`.
2. **Configuration Vite :** Génère le `vite.config.js` utilisant le plugin singlefile pour garantir qu'aucun asset externe ne soit généré dans le dossier `dist`.
3. **Robustesse AST :** Dans `obfuscator.js`, assure-toi d'envelopper l'appel à `java-parser` dans un bloc `try/catch` pour capturer les erreurs de syntaxe Java et les afficher proprement à l'utilisateur dans l'interface sans faire crasher l'application.
4. **Génération des IDs :** Implémente des compteurs persistants pour générer des IDs uniques qui s'incrémentent au fur et à mesure des sessions (ex: si `VAR_5` existe, la prochaine variable sera `VAR_6`).
