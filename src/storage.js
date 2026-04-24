export const APP_VERSION = "1.0.0";
const STORAGE_KEY = "java_vault_mapping";
const THEME_KEY = "java_vault_theme";

// Performance optimization: In-memory cache to avoid redundant and expensive
// localStorage reads and JSON.parse() calls on large dictionaries.
let memoryCache = null;

/**
 * Charge le dictionnaire depuis le localStorage
 * @returns {Object} Le dictionnaire contenant la version et le mapping
 */
export function loadDictionary() {
  if (memoryCache !== null) {
    return memoryCache;
  }

  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version === APP_VERSION && parsed.mapping) {
        memoryCache = parsed.mapping;
        return memoryCache;
      }
    } catch (e) {
      console.error("Erreur lors de la lecture du dictionnaire dans le localStorage", e);
    }
  }
  memoryCache = {};
  return memoryCache;
}

/**
 * Sauvegarde le dictionnaire complet (remplace l'existant)
 * @param {Object} mapping
 */
export function saveDictionary(mapping) {
  memoryCache = mapping;
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
  memoryCache = null;
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
