const r = JSON.parse(require('fs').readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Check units where jumpMP > runMP
let jumpHigher = 0;
let jumpHigherOutside1 = 0;
const jumpHigherUnits = [];

for (const u of r.allResults) {
  const b = u.breakdown || {};
  if (!b.runMP || !b.jumpMP) continue;
  if (b.jumpMP > b.runMP) {
    jumpHigher++;
    if (Math.abs(u.percentDiff) > 1) jumpHigherOutside1++;
    jumpHigherUnits.push(u);
  }
}

console.log(`Units with jumpMP > runMP: ${jumpHigher}`);
console.log(`Outside 1%: ${jumpHigherOutside1}`);

// For these units, what would the corrected speed factor be?
function calcSpeedFactor(runMP, jumpMP) {
  const mp = runMP + Math.round(jumpMP / 2.0);
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}

function calcSpeedFactorFixed(runMP, jumpMP) {
  const primary = Math.max(runMP, jumpMP);
  const secondary = Math.min(runMP, jumpMP);
  const mp = primary + Math.round(secondary / 2.0);
  return Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
}

console.log('\n=== Units where formula makes a difference ===');
let formulaDiff = 0;
for (const u of jumpHigherUnits) {
  const b = u.breakdown || {};
  const oldSF = calcSpeedFactor(b.runMP, b.jumpMP);
  const newSF = calcSpeedFactorFixed(b.runMP, b.jumpMP);
  if (oldSF !== newSF) {
    formulaDiff++;
    const dir = u.difference > 0 ? '+' : '';
    console.log(`  ${u.chassis} ${u.model}: run=${b.runMP} jump=${b.jumpMP} walk=${b.walkMP} sf=${oldSF}→${newSF} diff=${dir}${u.difference} (${dir}${u.percentDiff.toFixed(1)}%)`);
  }
}
console.log(`Total affected: ${formulaDiff}`);

// Simulate the impact: recalculate offensiveBV with new speed factor
console.log('\n=== Impact simulation ===');
let improvedCount = 0;
let worsenedCount = 0;
let newExact = 0;
for (const u of jumpHigherUnits) {
  const b = u.breakdown || {};
  const oldSF = calcSpeedFactor(b.runMP, b.jumpMP);
  const newSF = calcSpeedFactorFixed(b.runMP, b.jumpMP);
  if (oldSF === newSF) continue;

  // Recalculate offensiveBV with new speed factor
  const baseOffensive = (b.offensiveBV || 0) / oldSF;
  const newOffBV = baseOffensive * newSF;
  const cockpitMod = b.cockpitModifier || 1;
  const newTotalBV = Math.round(((b.defensiveBV || 0) + newOffBV) * cockpitMod);

  const oldDiff = Math.abs(u.calculatedBV - u.indexBV);
  const newDiff = Math.abs(newTotalBV - u.indexBV);

  if (newDiff < oldDiff) improvedCount++;
  if (newDiff > oldDiff) worsenedCount++;
  if (newDiff === 0) newExact++;

  const dir1 = (u.calculatedBV - u.indexBV) > 0 ? '+' : '';
  const dir2 = (newTotalBV - u.indexBV) > 0 ? '+' : '';
  console.log(`  ${u.chassis} ${u.model}: ${dir1}${u.calculatedBV - u.indexBV} → ${dir2}${newTotalBV - u.indexBV} (${u.calculatedBV}→${newTotalBV} vs MUL ${u.indexBV})`);
}
console.log(`Improved: ${improvedCount}, Worsened: ${worsenedCount}, New exact: ${newExact}`);
