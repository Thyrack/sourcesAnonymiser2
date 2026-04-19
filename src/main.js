import {
    APP_VERSION,
    loadDictionary,
    mergeDictionary,
    clearDictionary,
    getDictionaryCount
} from './storage.js';
import { obfuscate, deobfuscate } from './obfuscator.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const versionDisplay = document.getElementById('version-display');
    const entryCountDisplay = document.getElementById('entry-count');
    const btnReset = document.getElementById('btn-reset');

    const inputJava = document.getElementById('input-java');
    const btnObfuscate = document.getElementById('btn-obfuscate');
    const outputObfuscated = document.getElementById('output-obfuscated');
    const obfuscateError = document.getElementById('obfuscate-error');

    const inputAi = document.getElementById('input-ai');
    const btnRestore = document.getElementById('btn-restore');
    const outputRestored = document.getElementById('output-restored');

    // Initialize
    versionDisplay.textContent = `v${APP_VERSION}`;
    updateCounter();

    function updateCounter() {
        entryCountDisplay.textContent = getDictionaryCount();
    }

    function showError(msg) {
        obfuscateError.textContent = msg;
        obfuscateError.style.display = 'block';
    }

    function hideError() {
        obfuscateError.style.display = 'none';
        obfuscateError.textContent = '';
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

            outputObfuscated.value = obfuscatedCode;
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
        }
    });
});
