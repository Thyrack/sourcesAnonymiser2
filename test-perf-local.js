const iterations = 100000;
let data = null;

console.time('localStorage stringify/parse');
for(let i=0; i<100; i++) {
   const dummyData = {};
   for(let j=0; j<10000; j++) dummyData['k'+j] = 'v'+j;
   const str = JSON.stringify(dummyData);
   const parsed = JSON.parse(str);
}
console.timeEnd('localStorage stringify/parse');
