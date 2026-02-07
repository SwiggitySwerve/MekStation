const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// All diff=+1 units
const plus1 = r.allResults.filter(u => u.difference === 1);
console.log('Units with diff=+1:', plus1.length);

// Check cockpit modifier distribution
const cockpitDist = {};
for (const u of plus1) {
  const b = u.breakdown || {};
  const mod = b.cockpitModifier || 1;
  cockpitDist[mod] = (cockpitDist[mod] || 0) + 1;
}
console.log('Cockpit modifier distribution for diff=+1:');
for (const [mod, count] of Object.entries(cockpitDist)) {
  console.log(`  modifier=${mod}: ${count} units`);
}

// Check: of the 94 overcalculated by +1, how many have non-integer defensiveBV or offensiveBV?
let nonIntCount = 0;
let nonIntDetails = [];
for (const u of plus1) {
  const b = u.breakdown || {};
  const defFrac = (b.defensiveBV || 0) % 1;
  const offFrac = (b.offensiveBV || 0) % 1;
  if (defFrac !== 0 || offFrac !== 0) {
    nonIntCount++;
    if (nonIntDetails.length < 10) {
      nonIntDetails.push(`  ${u.chassis} ${u.model}: def=${b.defensiveBV} (frac=${defFrac.toFixed(4)}) off=${b.offensiveBV} (frac=${offFrac.toFixed(4)})`);
    }
  }
}
console.log('\nUnits with non-integer def/off BV:', nonIntCount, '/', plus1.length);
console.log('Sample:');
for (const d of nonIntDetails) console.log(d);

// Specific test: if we floor(def) + floor(off), would it match MUL?
let wouldFix = 0;
for (const u of plus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const ourBV = Math.round((def + off) * cockpitMod);
  const altBV = Math.round((Math.round(def) + Math.round(off)) * cockpitMod);
  if (altBV === u.indexBV) wouldFix++;
}
console.log('\nIf rounding def+off separately:', wouldFix, '/', plus1.length, 'would become exact');

// Check the diff=-1 units too
const minus1 = r.allResults.filter(u => u.difference === -1);
console.log('\nUnits with diff=-1:', minus1.length);
let wouldBreak = 0;
for (const u of minus1) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const ourBV = Math.round((def + off) * cockpitMod);
  const altBV = Math.round((Math.round(def) + Math.round(off)) * cockpitMod);
  if (altBV !== u.indexBV && ourBV === u.indexBV + 1) wouldBreak++;
  if (altBV === u.indexBV) console.log(`  WOULD FIX: ${u.chassis} ${u.model}`);
}
console.log('Would break (from -1 to -2):', wouldBreak);
