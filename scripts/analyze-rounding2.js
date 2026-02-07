const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Strategy: Math.round((Math.floor(def) + Math.floor(off)) * cockpitMod)
let exactBefore = 0, exactAfter = 0;
let within1Before = 0, within1After = 0;
let improved = 0, worsened = 0, unchanged = 0;
const changes = [];

for (const u of r.allResults) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;

  const currentBV = u.calculatedBV;
  const mulBV = u.indexBV;

  // New strategy: floor each component
  const newBV = Math.round((Math.floor(def) + Math.floor(off)) * cockpitMod);

  const currentDiff = Math.abs(currentBV - mulBV);
  const newDiff = Math.abs(newBV - mulBV);

  if (currentDiff === 0) exactBefore++;
  if (newDiff === 0) exactAfter++;
  if (currentDiff <= mulBV * 0.01) within1Before++;
  if (newDiff <= mulBV * 0.01) within1After++;

  if (newDiff < currentDiff) improved++;
  else if (newDiff > currentDiff) worsened++;
  else unchanged++;

  if (newDiff !== currentDiff) {
    changes.push({
      name: `${u.chassis} ${u.model}`,
      oldDiff: currentBV - mulBV,
      newDiff: newBV - mulBV,
      oldBV: currentBV,
      newBV: newBV,
      mulBV: mulBV,
    });
  }
}

console.log('=== Floor def + floor off, round final ===');
console.log(`Exact: ${exactBefore} → ${exactAfter} (${exactAfter - exactBefore > 0 ? '+' : ''}${exactAfter - exactBefore})`);
console.log(`Within 1%: ${within1Before} → ${within1After} (${within1After - within1Before > 0 ? '+' : ''}${within1After - within1Before})`);
console.log(`Improved: ${improved}, Worsened: ${worsened}, Unchanged: ${unchanged}`);

console.log('\nSample changes (first 20):');
for (const c of changes.sort((a, b) => Math.abs(b.oldDiff) - Math.abs(a.oldDiff)).slice(0, 20)) {
  const dir1 = c.oldDiff > 0 ? '+' : '';
  const dir2 = c.newDiff > 0 ? '+' : '';
  console.log(`  ${c.name}: diff ${dir1}${c.oldDiff} → ${dir2}${c.newDiff} (${c.oldBV}→${c.newBV} vs MUL ${c.mulBV})`);
}

// Also try: Math.round((Math.round(def) + Math.round(off)) * cockpitMod)
let exactRoundRound = 0;
let within1RoundRound = 0;
for (const u of r.allResults) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  const newBV = Math.round((Math.round(def) + Math.round(off)) * cockpitMod);
  if (newBV === u.indexBV) exactRoundRound++;
  if (Math.abs(newBV - u.indexBV) <= u.indexBV * 0.01) within1RoundRound++;
}
console.log(`\n=== Round def + round off, round final ===`);
console.log(`Exact: ${exactBefore} → ${exactRoundRound}`);
console.log(`Within 1%: ${within1Before} → ${within1RoundRound}`);

// Try: (int)(def + off) where int is Java truncation, then round with cockpit
// This simulates Java integer arithmetic for the intermediate sum
let exactJavaInt = 0;
let within1JavaInt = 0;
for (const u of r.allResults) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  // Java: int baseBV = (int) defensiveBV + (int) offensiveBV;
  // Then: int totalBV = (int) Math.round(baseBV * cockpitMod);
  const baseBV = Math.trunc(def) + Math.trunc(off);
  const newBV = Math.round(baseBV * cockpitMod);
  if (newBV === u.indexBV) exactJavaInt++;
  if (Math.abs(newBV - u.indexBV) <= u.indexBV * 0.01) within1JavaInt++;
}
console.log(`\n=== Java int cast: trunc(def)+trunc(off), round final ===`);
console.log(`Exact: ${exactBefore} → ${exactJavaInt}`);
console.log(`Within 1%: ${within1Before} → ${within1JavaInt}`);

// Try: floor the speed factor multiplication specifically
// offBV = floor((weaponBV + ammoBV + weight) * speedFactor)
// defBV = floor((armor + struct + gyro + defEquip - explosive) * defFactor)
// We can't easily recalculate these without the sub-components
// But we can try: round((int)def + (int)off * cockpit) using int(x) = floor for positive
let exactIntPos = 0;
let within1IntPos = 0;
for (const u of r.allResults) {
  const b = u.breakdown || {};
  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpitMod = b.cockpitModifier || 1;
  // Floor both (same as trunc for positive values)
  const newBV = Math.round((Math.floor(def) + Math.floor(off)) * cockpitMod);
  if (newBV === u.indexBV) exactIntPos++;
  if (Math.abs(newBV - u.indexBV) <= u.indexBV * 0.01) within1IntPos++;
}
console.log(`\n=== Floor each (positive), round final ===`);
console.log(`Exact: ${exactBefore} → ${exactIntPos}`);
console.log(`Within 1%: ${within1Before} → ${within1IntPos}`);
