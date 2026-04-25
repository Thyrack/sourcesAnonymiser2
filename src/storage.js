export const APP_VERSION = "1.0.0";
const STORAGE_KEY = "java_vault_mapping";
const THEME_KEY = "java_vault_theme";

// In-memory cache to prevent redundant main-thread-blocking localStorage reads and JSON.parse() calls
let dictionaryCache = null;

/**
 * Charge le dictionnaire depuis le localStorage ou le cache mémoire
 * @returns {Object} Le dictionnaire contenant la version et le mapping
 */
export function loadDictionary() {
  if (dictionaryCache !== null) {
    return dictionaryCache;
  }

  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version === APP_VERSION && parsed.mapping) {
        dictionaryCache = parsed.mapping;
        return dictionaryCache;
      }
    } catch (e) {
      console.error("Erreur lors de la lecture du dictionnaire dans le localStorage", e);
    }
  }

  dictionaryCache = {};
  return dictionaryCache;
}

/**
 * Sauvegarde le dictionnaire complet (remplace l'existant) et met à jour le cache
 * @param {Object} mapping
 */
export function saveDictionary(mapping) {
  dictionaryCache = mapping; // Mettre à jour le cache
  const data = {
    version: APP_VERSION,
    mapping: mapping
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Fusionne de nouvelles entrées avec le dictionnaire existant
 * @param {Object} newEntries
 */
export function mergeDictionary(newEntries) {
  const currentMapping = loadDictionary();
  const mergedMapping = { ...currentMapping, ...newEntries };
  saveDictionary(mergedMapping);
  return mergedMapping;
}

/**
 * Vide le dictionnaire
 */
export function clearDictionary() {
  dictionaryCache = null;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Récupère le nombre d'entrées
 */
export function getDictionaryCount() {
  const mapping = loadDictionary();
  return Object.keys(mapping).length;
}

/**
 * Génère un identifiant unique basé sur le préfixe
 * @param {string} prefix ('VAR', 'STR', 'CLASS', 'METHOD')
 * @returns {string} Le nouvel identifiant (ex: 'VAR_5')
 */
export function generateUniqueId(prefix) {
  const mapping = loadDictionary();
  let maxId = 0;

  const prefixPattern = new RegExp(`^${prefix}_(\\d+)$`);

  for (const key of Object.keys(mapping)) {
    const match = key.match(prefixPattern);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id > maxId) {
        maxId = id;
      }
    }
  }

  return `${prefix}_${maxId + 1}`;
}

/**
 * Récupère le thème sauvegardé
 * @returns {string} 'dark' ou 'light'
 */
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

/**
 * Sauvegarde le thème
 * @param {string} theme 'dark' ou 'light'
 */
export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
