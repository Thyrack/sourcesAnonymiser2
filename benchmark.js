// Generate large string
const N = 100000;
let code = 'a'.repeat(N);
const reps = [];
for (let i = 0; i < 5000; i++) {
    const start = i * 20;
    reps.push({
        startOffset: start,
        endOffset: start + 5,
        newText: 'REPLACED'
    });
}
// Sort descending by startOffset
reps.sort((a, b) => b.startOffset - a.startOffset);

function oldApproach(code, resolvedReplacements) {
  let obfuscatedCode = code;
  for (const rep of resolvedReplacements) {
      obfuscatedCode = obfuscatedCode.substring(0, rep.startOffset) + rep.newText + obfuscatedCode.substring(rep.endOffset + 1);
  }
  return obfuscatedCode;
}

function newApproach(code, resolvedReplacements) {
  const chunks = [];
  let currentIndex = 0;
  // Note: reps is sorted descending by startOffset, but let's assume we iterate in reverse to process left to right
  for (let i = resolvedReplacements.length - 1; i >= 0; i--) {
      const rep = resolvedReplacements[i];
      if (rep.startOffset > currentIndex) {
          chunks.push(code.substring(currentIndex, rep.startOffset));
      }
      chunks.push(rep.newText);
      currentIndex = rep.endOffset + 1;
  }
  if (currentIndex < code.length) {
      chunks.push(code.substring(currentIndex));
  }
  return chunks.join('');
}



console.time('old');
const res1 = oldApproach(code, reps);
console.timeEnd('old');

console.time('new');
const res2 = newApproach(code, reps);
console.timeEnd('new');

console.log('Equal?', res1 === res2);
