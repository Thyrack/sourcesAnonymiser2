# Project Guide: Java Code Obfuscation Tool (java-vault)

## 📚 Project Overview
**Purpose:** This project is a cross-platform desktop application designed to obfuscate Java source code and provide tools for its deobfuscation. It uses advanced static analysis techniques (Abstract Syntax Tree traversal) to identify key components in the Java code, allowing for safe replacement of identifiers, strings, and comments with unique IDs while preserving functionality.

**Key Technologies:**
*   **Frontend/Client:** JavaScript / Vite (Implied React/SPA framework).
*   **Native Wrapper:** Tauri (Used to bundle the web application into a cross-platform desktop executable).
*   **Core Logic Dependency:** `java-parser` library (Used for parsing and traversing Java Abstract Syntax Trees).

**High-Level Architecture:**
The architecture is client-driven, leveraging modern web technologies packaged by Tauri. The core business logic resides in the obfuscation module, which operates on Java code strings.

```mermaid
graph TD
    A[Java Source Code] --> B(src/obfuscator.js: Obfuscate);
    B --> C{AST Parser (java-parser)};
    C --> D[Identify Variables, Classes, Methods];
    D --> E(Generate Mapping {Original -> ID});
    E --> F[Obfuscated Code Output];
    G[Deobfuscation Input] --> H(src/obfuscator.js: Deobfuscate);
    H --> I[Restored Java Source Code];

    subgraph Client Application (Vite + JS)
        A & G --> J[UI / State Management (src/main.js)];
        J --> B;
        B --> F;
        J --> H;
    end
```

## 🚀 Getting Started
### Prerequisites
*   Node.js and npm/pnpm package manager.
*   Tauri CLI (`@tauri-apps/cli`) installed for building the desktop application.
*   Java code to be processed.

### Installation Steps
1.  Install dependencies:
    ```bash
    npm install
    # or pnpm install (depending on project preference)
    ```
2.  Run the development server:
    ```bash
    pnpm dev # or npm run dev
    ```

### Testing
Basic usage can be tested by running the application and feeding it Java code through the UI interface. For unit testing, focus on `src/obfuscator.js`'s core logic against sample Java snippets.
*Note: Specific unit test commands are not defined in the visible files; they should be added to this guide.*

## 📁 Project Structure
-   `.continue/rules/`: Directory for agent rules (this file).
-   `src/`: Contains the client-side JavaScript logic.
    *   `main.js`: Main entry point. Orchestrates application flow and state.
    *   `storage.js`: Handles data persistence, likely storing generated mappings or user settings.
    *   `obfuscator.js`: **CORE MODULE.** Implements the AST parsing, obfuscation algorithm (`obfuscate`), and deobfuscation utility (`deobfuscate`).
-   `src-tauri/`: Contains the native backend logic (Likely Rust). This handles platform-specific operations necessary for the desktop wrapper.
-   `vite.config.js`: Configuration file for the Vite build tool, defining how the frontend assets are bundled.
-   `index.html`: The primary HTML template served by the application.

## ⚙️ Development Workflow
### Coding Standards
*   **Language:** JavaScript/TypeScript (implied). Adhere to modern ES module syntax and functional patterns where possible.
*   **Style:** Maintain consistency with existing codebase patterns; ensure clear separation between presentation logic, state management (`src/main.js`), and business logic (`src/obfuscator.js`).

### Testing Approach
The core obfuscation logic in `src/obfuscator.js` must be rigorously tested using unit tests (Jest/Vitest recommended) to ensure that replacement offsets are calculated correctly regardless of code structure changes (especially when handling comments/strings).

**Testing Commands:** *[Verification Needed: Add the actual test command here, e.g., `pnpm run test`]*.

### CI/CD
The build process involves two main steps defined in `package.json`:
1.  Frontend Build: `vite build` (Bundles JS assets).
2.  Desktop Assembly: `tauri` (Wraps the built web assets into a runnable native application for various OSs).

## ✨ Key Concepts & Domain Terminology
*   **AST (Abstract Syntax Tree):** The structured representation of the Java code, which allows the system to analyze and manipulate syntax programmatically rather than relying on simple string replacement.
*   **Obfuscation:** The process of transforming readable source code into an equivalent, highly complex form that is difficult for humans to understand or reverse engineer.
*   **Mapping (`newMapping`):** A critical data structure generated during obfuscation that links the original, readable identifier/string/comment (key) to its safe, randomized replacement ID (value). This map is required for deobfuscation and must be persisted using `src/storage.js`.

## 🛠️ Common Tasks
### Running a Full Build
To compile the frontend code and package it into a desktop application:
```bash
# Run this command to execute both front-end bundling and native wrapper setup
pnpm tauri build # Or use 'npm run tauri' if defined
```

### Obfuscating Code Manually (Development)
1.  Import the Java code string.
2.  Call `obfuscator.obfuscate(javaCodeString)` to get the obfuscated output and the necessary mapping object.
3.  Use the generated mapping for any required deobfuscation steps.

## 🐛 Troubleshooting
*   **Error: "Erreur de syntaxe Java..."**: This means the `java-parser` failed to understand the provided input code. Check that the source code is valid Java and does not contain exotic characters or unsupported language features.
*   **Mapping Errors:** If deobfuscation fails, ensure the original mapping generated by the obfuscator was correctly saved (via `storage.js`) and passed back into the deobfuscator function.

## 🔗 References
- **Dependency Details:** See `package.json` for library versions and usage instructions.
- **Java Parser Documentation:** Consult the official documentation for `java-parser` for advanced AST manipulation techniques.

---
*This documentation was automatically generated based on analyzing the project structure, files, and code logic.*