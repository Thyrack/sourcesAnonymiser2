## 2024-04-20 - [O(1) Pass Multiple String Replacement]
**Learning:** Using `String.prototype.replaceAll` inside a loop over dictionary keys for deobfuscation is a performance anti-pattern in JavaScript. It creates O(N * L) complexity (where N is the dictionary size and L is text length) and allocates a new string on each iteration. It's also prone to unintended "cascading replacements" where a replaced value might contain a key that gets incorrectly replaced in a subsequent iteration.
**Action:** Replace `replaceAll` loops with a single dynamically compiled `RegExp` (`new RegExp(escapedKeys.join('|'), 'g')`) and a replacer function to process the text in a single O(L) pass, which is ~18x faster and prevents cascading replacements.

## 2026-04-23 - [O(1) Map Lookup for Reverse Mapping]
**Learning:** Using `Object.keys().find()` inside a loop over AST nodes creates an O(N * M) complexity (where N is the number of nodes and M is the size of the mapping dictionary). In `obfuscator.js`, this caused severe performance degradation (O(N^2) behavior) when dealing with large files and large existing mappings.
**Action:** Pre-compute a reverse mapping using a `Map` before the loop, enabling O(1) lookups for existing keys. This reduces the time complexity to O(N + M) and dramatically improves performance (~10x faster for 5000 variables).

## 2026-04-23 - [O(N) Iterative String Reconstruction]
**Learning:** Using `substring()` and string concatenation (`+`) inside a loop for iterative string replacements creates O(K*N) time complexity and excessive memory allocation (where K is string length and N is number of replacements). This creates severe performance issues with many replacements (e.g., 12 seconds vs 11 milliseconds for 50,000 replacements).
**Action:** Use an array chunking approach: collect string segments and replacements in an array (`chunks.push(...)`) and use a single `chunks.join('')` at the end for an O(N) single-pass string reconstruction.

## 2026-04-25 - Prevent Redundant Main-Thread Blocking on large Dictionaries
**Learning:** Frequent `localStorage.getItem()` and subsequent `JSON.parse()` for large mapping dictionaries causes significant main-thread blocking, particularly when doing sequential operations like `mergeDictionary` followed by `getDictionaryCount` in loops or rapid user actions. `localStorage` reads are synchronous and comparatively slow.
**Action:** Implement an in-memory variable to cache the parsed dictionary. Ensure all write operations (save, merge, clear) accurately update or invalidate this cache to maintain consistency and prevent redundant synchronous storage lookups.
