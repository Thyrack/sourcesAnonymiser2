import {
    APP_VERSION,
    saveDictionary,
    getFullStorageData,
    validateAndImportData,
    clearDictionary
} from './storage.js';

describe('Storage Utility Tests', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('getFullStorageData should return null if no data exists', () => {
        expect(getFullStorageData()).toBeNull();
    });

    test('getFullStorageData should return the full object from localStorage', () => {
        const mapping = { 'VAR_1': 'test' };
        saveDictionary(mapping);

        const data = getFullStorageData();
        expect(data).toEqual({
            version: APP_VERSION,
            mapping: mapping
        });
    });

    test('validateAndImportData should return false for invalid data', () => {
        expect(validateAndImportData(null)).toBe(false);
        expect(validateAndImportData({})).toBe(false);
        expect(validateAndImportData({ version: 'wrong' })).toBe(false);
        expect(validateAndImportData({ version: APP_VERSION })).toBe(false); // missing mapping
    });

    test('validateAndImportData should return true and save for valid data', () => {
        const validData = {
            version: APP_VERSION,
            mapping: { 'STR_1': 'hello' }
        };

        const result = validateAndImportData(validData);
        expect(result).toBe(true);

        const storedData = getFullStorageData();
        expect(storedData).toEqual(validData);
    });

    test('clearDictionary should remove data from localStorage', () => {
        saveDictionary({ 'VAR_1': 'test' });
        expect(getFullStorageData()).not.toBeNull();

        clearDictionary();
        expect(getFullStorageData()).toBeNull();
    });
});
