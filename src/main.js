import {
    APP_VERSION,
    loadDictionary,
    mergeDictionary,
    clearDictionary,
    getDictionaryCount,
    getTheme,
    saveTheme,
    getFullStorageData,
    validateAndImportData
} from './storage.js';
import { obfuscate, deobfuscate } from './obfuscator.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const versionDisplay = document.getElementById('version-display');
    const entryCountDisplay = document.getElementById('entry-count');
    const btnLoadFiles = document.getElementById('btn-load-files');
    const inputLoadFiles = document.getElementById('input-load-files');
    const btnViewDictionary = document.getElementById('btn-view-dictionary');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const inputImportFile = document.getElementById('input-import-file');
    const btnReset = document.getElementById('btn-reset');
    const btnThemeToggle = document.getElementById('btn-theme-toggle');

    const dictionarySection = document.getElementById('dictionary-section');
    const dictionaryTableBody = document.querySelector('#dictionary-table tbody');
    const btnCloseDictionary = document.getElementById('btn-close-dictionary');

    const inputJava = document.getElementById('input-java');
    const btnObfuscate = document.getElementById('btn-obfuscate');
    const outputObfuscated = document.getElementById('output-obfuscated');
    const btnCopyObfuscated = document.getElementById('btn-copy-obfuscated');
    const obfuscateError = document.getElementById('obfuscate-error');

    const inputAi = document.getElementById('input-ai');
    const btnRestore = document.getElementById('btn-restore');
    const outputRestored = document.getElementById('output-restored');
    const btnCopyRestored = document.getElementById('btn-copy-restored');

    // Initialize
    versionDisplay.textContent = `v${APP_VERSION}`;
    updateCounter();
    initTheme();

    // Initialize button states based on potential browser auto-fill
    btnObfuscate.disabled = inputJava.value.trim().length === 0;
    btnRestore.disabled = inputAi.value.trim().length === 0;
    updateCopyButtonStates();

    function updateCounter() {
        const count = getDictionaryCount();
        entryCountDisplay.textContent = count;
        btnReset.disabled = count === 0;
        btnViewDictionary.disabled = count === 0;
        btnExport.disabled = count === 0;
        if (count === 0) {
            dictionarySection.style.display = 'none';
        }
    }

    function showError(msg) {
        obfuscateError.textContent = msg;
        obfuscateError.style.display = 'block';
    }

    function hideError() {
        obfuscateError.style.display = 'none';
        obfuscateError.textContent = '';
    }

    // Input Events
    inputJava.addEventListener('input', () => {
        btnObfuscate.disabled = inputJava.value.trim().length === 0;
    });

    inputJava.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!btnObfuscate.disabled) {
                btnObfuscate.click();
            }
        }
    });

    inputAi.addEventListener('input', () => {
        btnRestore.disabled = inputAi.value.trim().length === 0;
    });

    inputAi.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!btnRestore.disabled) {
                btnRestore.click();
            }
        }
    });

    // Drag and Drop
    inputJava.addEventListener('dragover', (e) => {
        e.preventDefault();
        inputJava.style.borderColor = 'var(--primary-color)';
    });

    inputJava.addEventListener('dragleave', () => {
        inputJava.style.borderColor = '';
    });

    inputJava.addEventListener('drop', (e) => {
        e.preventDefault();
        inputJava.style.borderColor = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    async function handleFiles(files) {
        let combinedCode = inputJava.value;
        if (combinedCode && !combinedCode.endsWith('\n')) {
            combinedCode += '\n';
        }

        const fileArray = Array.from(files);
        const supportedExtensions = ['.java', '.sql', '.js', '.ts'];
        for (const file of fileArray) {
            const fileNameLower = file.name.toLowerCase();
            if (supportedExtensions.some(ext => fileNameLower.endsWith(ext))) {
                const text = await file.text();
                combinedCode += `\n// --- FILE: ${file.name} ---\n${text}\n`;
            }
        }
        inputJava.value = combinedCode;
        btnObfuscate.disabled = inputJava.value.trim().length === 0;
    }

    btnLoadFiles.addEventListener('click', () => {
        inputLoadFiles.click();
    });

    inputLoadFiles.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
        inputLoadFiles.value = '';
    });

    function renderDictionary() {
        const mapping = loadDictionary();
        dictionaryTableBody.innerHTML = '';

        const keys = Object.keys(mapping).sort();
        for (const key of keys) {
            const row = document.createElement('tr');
            const idCell = document.createElement('td');
            idCell.innerHTML = `<code>${key}</code>`;
            const valueCell = document.createElement('td');
            valueCell.textContent = mapping[key];
            row.appendChild(idCell);
            row.appendChild(valueCell);
            dictionaryTableBody.appendChild(row);
        }
    }

    function updateCopyButtonStates() {
        btnCopyObfuscated.disabled = outputObfuscated.value.trim().length === 0;
        btnCopyRestored.disabled = outputRestored.value.trim().length === 0;
    }

    async function handleCopy(textarea, button) {
        const text = textarea.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = '✅ Copié !';
            button.classList.add('success');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('success');
            }, 2000);
        } catch (err) {
            console.error('Erreur lors de la copie :', err);
        }
    }

    // Obfuscate Action
    btnObfuscate.addEventListener('click', () => {
        hideError();
        const code = inputJava.value.trim();
        if (!code) return;

        try {
            const currentMapping = loadDictionary();
            const { obfuscatedCode, newMapping } = obfuscate(code, currentMapping);

            // Mettre à jour le dictionnaire
            mergeDictionary(newMapping);
            updateCounter();
            if (dictionarySection.style.display === 'block') {
                renderDictionary();
            }

            outputObfuscated.value = obfuscatedCode;
            updateCopyButtonStates();

            // Move focus to copy button for quick access
            btnCopyObfuscated.focus();
        } catch (err) {
            showError(err.message);
        }
    });

    // Restore Action
    btnRestore.addEventListener('click', () => {
        const aiText = inputAi.value.trim();
        if (!aiText) return;

        const currentMapping = loadDictionary();
        const restoredText = deobfuscate(aiText, currentMapping);

        outputRestored.value = restoredText;
        updateCopyButtonStates();

        // Move focus to copy button for quick access
        btnCopyRestored.focus();
    });

    // Dictionary Display Actions
    btnViewDictionary.addEventListener('click', () => {
        renderDictionary();
        dictionarySection.style.display = 'block';
        dictionarySection.scrollIntoView({ behavior: 'smooth' });
    });

    btnCloseDictionary.addEventListener('click', () => {
        dictionarySection.style.display = 'none';
    });

    // Copy Actions
    btnCopyObfuscated.addEventListener('click', () => handleCopy(outputObfuscated, btnCopyObfuscated));
    btnCopyRestored.addEventListener('click', () => handleCopy(outputRestored, btnCopyRestored));

    // Theme Toggle
    btnThemeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        saveTheme(isLight ? 'light' : 'dark');
    });

    function initTheme() {
        const theme = getTheme();
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    // Export Action
    btnExport.addEventListener('click', () => {
        const data = getFullStorageData();
        if (!data) return;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'java-vault-dictionary.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Import Action
    btnImport.addEventListener('click', () => {
        inputImportFile.click();
    });

    inputImportFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (validateAndImportData(data)) {
                    updateCounter();
                    updateCopyButtonStates();
                    if (dictionarySection.style.display === 'block') {
                        renderDictionary();
                    }
                    alert("Dictionnaire importé avec succès !");
                } else {
                    alert("Fichier de dictionnaire invalide ou version incompatible.");
                }
            } catch (err) {
                console.error("Erreur lors de l'import :", err);
                alert("Erreur lors de la lecture du fichier JSON.");
            }
            // Reset input to allow re-importing the same file
            inputImportFile.value = '';
        };
        reader.readAsText(file);
    });

    // Reset Action
    btnReset.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir vider le dictionnaire ? Cette action est irréversible et empêchera la désoffuscation des anciens codes.")) {
            clearDictionary();
            updateCounter();
            inputJava.value = '';
            outputObfuscated.value = '';
            inputAi.value = '';
            outputRestored.value = '';
            hideError();
            updateCopyButtonStates();

            // Reset button states
            btnObfuscate.disabled = true;
            btnRestore.disabled = true;
        }
    });
});
