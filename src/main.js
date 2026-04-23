import {
    APP_VERSION,
    loadDictionary,
    mergeDictionary,
    clearDictionary,
    getDictionaryCount,
    getTheme,
    saveTheme
} from './storage.js';
import { obfuscate, deobfuscate } from './obfuscator.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const versionDisplay = document.getElementById('version-display');
    const entryCountDisplay = document.getElementById('entry-count');
    const btnReset = document.getElementById('btn-reset');
    const btnThemeToggle = document.getElementById('btn-theme-toggle');

    const inputJava = document.getElementById('input-java');
    const btnObfuscate = document.getElementById('btn-obfuscate');
    const outputObfuscated = document.getElementById('output-obfuscated');
    const obfuscateError = document.getElementById('obfuscate-error');
    const btnCopyObfuscated = document.getElementById('btn-copy-obfuscated');

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
    btnCopyObfuscated.disabled = outputObfuscated.value.trim().length === 0;
    btnCopyRestored.disabled = outputRestored.value.trim().length === 0;

    function updateCounter() {
        const count = getDictionaryCount();
        entryCountDisplay.textContent = count;
        btnReset.disabled = count === 0;
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

    inputAi.addEventListener('input', () => {
        btnRestore.disabled = inputAi.value.trim().length === 0;
    });

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
            btnCopyObfuscated.disabled = false;
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
        btnCopyRestored.disabled = false;
    });

    // Copy Actions
    async function handleCopy(button, textElement) {
        const text = textElement.value.trim();
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copié !';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Erreur lors de la copie', err);
        }
    }

    btnCopyObfuscated.addEventListener('click', () => handleCopy(btnCopyObfuscated, outputObfuscated));
    btnCopyRestored.addEventListener('click', () => handleCopy(btnCopyRestored, outputRestored));

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

            // Reset button states
            btnObfuscate.disabled = true;
            btnRestore.disabled = true;
            btnCopyObfuscated.disabled = true;
            btnCopyRestored.disabled = true;
        }
    });
});
