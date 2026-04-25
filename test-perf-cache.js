import { loadDictionary, saveDictionary, getDictionaryCount, mergeDictionary } from './src/storage.js';

// Mock localStorage
global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, val) { this.data[key] = val; },
    removeItem(key) { delete this.data[key]; }
};

// Override with cache logic
let dictionaryCache = null;
function loadDictionaryCached() {
  if (dictionaryCache) return dictionaryCache;
  const data = localStorage.getItem("java_vault_mapping");
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version === "1.0.0" && parsed.mapping) {
        dictionaryCache = parsed.mapping;
        return dictionaryCache;
      }
    } catch (e) {}
  }
  dictionaryCache = {};
  return dictionaryCache;
}
function saveDictionaryCached(mapping) {
  dictionaryCache = mapping;
  localStorage.setItem("java_vault_mapping", JSON.stringify({version: "1.0.0", mapping}));
}
function mergeDictionaryCached(newEntries) {
  const currentMapping = loadDictionaryCached();
  const mergedMapping = { ...currentMapping, ...newEntries };
  saveDictionaryCached(mergedMapping);
  return mergedMapping;
}
function getDictionaryCountCached() {
  return Object.keys(loadDictionaryCached()).length;
}

// Create a large dictionary
const largeMapping = {};
for (let i = 0; i < 50000; i++) {
    largeMapping['VAR_' + i] = 'myVariableThatIsLong_' + i;
}
saveDictionaryCached(largeMapping);

console.time('With Cache - merge & count');
for(let i = 0; i < 10; i++) {
    mergeDictionaryCached({ ['NEW_' + i]: 'val' });
    getDictionaryCountCached();
}
console.timeEnd('With Cache - merge & count');
