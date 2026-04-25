import { loadDictionary, saveDictionary, getDictionaryCount, mergeDictionary } from './src/storage.js';

// Mock localStorage
global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, val) { this.data[key] = val; },
    removeItem(key) { delete this.data[key]; }
};

// Create a large dictionary
const largeMapping = {};
for (let i = 0; i < 50000; i++) {
    largeMapping['VAR_' + i] = 'myVariableThatIsLong_' + i;
}
saveDictionary(largeMapping);

console.time('No Cache - merge & count');
for(let i = 0; i < 10; i++) {
    mergeDictionary({ ['NEW_' + i]: 'val' });
    getDictionaryCount();
}
console.timeEnd('No Cache - merge & count');
