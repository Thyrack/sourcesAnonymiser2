# Bolt's Journal\n
## 2026-04-19 - O(N²) Loop Bottleneck in AST Processing
**Learning:** Found a common performance pitfall where an O(M) `Array.find()` over a dictionary was used inside an O(N) loop iterating over AST nodes, creating an O(N * M) bottleneck. This is exceptionally slow for large source files combined with a large stored mapping dictionary.
**Action:** When mapping AST node string values back to their obfuscated IDs, always pre-compute a reversed hash map (`O(M)` cost once) to allow for `O(1)` lookups during the node replacement phase.
