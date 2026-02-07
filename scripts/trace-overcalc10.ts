import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Get reliable overcalculated units (MUL exact match, 4-7% range)
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 3) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

console.log('=== COCKPIT TYPE ANALYSIS FOR OVERCALCULATED UNITS ===');
console.log('Total overcalculated MUL-exact units:', overCalc.length);
console.log('');

// Check cockpit types
const cockpitTypes: Record<string, number> = {};
const cockpitTypeDetails: Record<string, any[]> = {};

for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const cockpit = unit.cockpit || 'STANDARD';
    cockpitTypes[cockpit] = (cockpitTypes[cockpit] || 0) + 1;
    if (!cockpitTypeDetails[cockpit]) cockpitTypeDetails[cockpit] = [];
    cockpitTypeDetails[cockpit].push({
      id: d.unitId,
      cockpit,
      calc: d.calculatedBV,
      ref: d.indexBV,
      pct: d.percentDiff,
      ratio: (d.calculatedBV / d.indexBV).toFixed(4),
    });
  } catch { /* skip */ }
}

console.log('Cockpit types:');
for (const [type, count] of Object.entries(cockpitTypes).sort((a, b) => b[1] - a[1])) {
  const units = cockpitTypeDetails[type];
  const avgPct = units.reduce((s, u) => s + u.pct, 0) / units.length;
  const avgRatio = units.reduce((s, u) => s + parseFloat(u.ratio), 0) / units.length;
  console.log(`  ${type}: ${count} units, avg overcalc: ${avgPct.toFixed(1)}%, avg ratio: ${avgRatio.toFixed(4)}`);
}

// Key question: are any STANDARD cockpit units overcalculated by exactly ~5.26%?
// Because 1/0.95 = 1.0526... so if a 0.95 modifier is missing, the ratio would be ~1.0526
console.log('\n=== RATIO ANALYSIS ===');
const standardUnits = cockpitTypeDetails['STANDARD'] || [];
const ratios = standardUnits.map(u => parseFloat(u.ratio));
const nearFivePercent = ratios.filter(r => r >= 1.04 && r <= 1.06);
console.log('STANDARD cockpit units:', standardUnits.length);
console.log('  with ratio 1.04-1.06:', nearFivePercent.length);
console.log('  mean ratio:', ratios.length > 0 ? (ratios.reduce((s, r) => s + r, 0) / ratios.length).toFixed(4) : 'N/A');

// Now check if applying 0.95 to STANDARD cockpit units fixes them
console.log('\n=== APPLYING 0.95 TO ALL STANDARD COCKPIT UNITS ===');
let fixedCount = 0;
let totalStd = 0;
for (const u of standardUnits) {
  const adjusted = Math.round(u.calc * 0.95);
  const diff = adjusted - u.ref;
  const pct = Math.abs(diff / u.ref * 100);
  if (pct <= 1) fixedCount++;
  totalStd++;
}
console.log(`  Fixed (within 1%): ${fixedCount} of ${totalStd}`);

// Also check non-standard cockpit units
for (const [type, units] of Object.entries(cockpitTypeDetails)) {
  if (type === 'STANDARD') continue;
  let fixed = 0;
  for (const u of units) {
    const adjusted = Math.round(u.calc * 0.95);
    const diff = adjusted - u.ref;
    const pct = Math.abs(diff / u.ref * 100);
    if (pct <= 1) fixed++;
  }
  console.log(`  ${type}: ${fixed} of ${units.length} fixed by 0.95`);
}

// HYPOTHESIS: Check if the issue is in the DEFENSIVE BV calculation
// In MegaMek, the defensive factor includes a different formula.
// Let me check if our defensive factor calculation might be 5% too high.
console.log('\n=== DEFENSIVE FACTOR CHECK ===');
// MegaMek formula for defensive factor:
// 1. TMM = max(run TMM, jump TMM, UMU TMM)
// 2. defensiveFactor = 1 + TMM
// 3. If defensiveFactor > 1: defensiveFactor += min(1, tonnage/100) - but only for superheavy? No.
//
// Actually MegaMek's defensiveFactor formula:
// totalModifier = 1.0 + (tmmFactor * -1.0) -- NOTE the sign
// TMM for BV: max(runTMM, jumpTMM)
// where TMM values follow the standard TMM table
// But in BV context, the "defensive factor" is simply based on move modifiers.

// Let me look at the actual calculation in our code
// Our code: defensiveFactor = 1 + calculateTMM(runMP) + calculateTMM(jumpMP)
// MegaMek: dbv × (1 + targetModifier)
// where targetModifier = max(runTMM, jumpTMM, umuTMM)

// WAIT - we might be ADDING run TMM + jump TMM instead of taking MAX(run TMM, jump TMM)!
// That would overcalculate the defensive factor!

// Let me verify by checking a few units
for (const u of standardUnits.slice(0, 5)) {
  const iu = indexData.units.find((i: any) => i.id === u.id);
  if (!iu) continue;
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  console.log(`  ${u.id}: walk=${unit.movement.walk} jump=${unit.movement.jump || 0} calc=${u.calc} ref=${u.ref} ratio=${u.ratio}`);
}

// Now let me check: what's in the breakdown for defensive factor?
console.log('\n=== BREAKDOWN DETAILS ===');
for (const d of overCalc.slice(0, 10)) {
  console.log(`  ${d.unitId}: defBV=${d.breakdown.defensiveBV.toFixed(0)} offBV=${d.breakdown.offensiveBV.toFixed(0)} SF=${d.breakdown.speedFactor} weapBV=${d.breakdown.weaponBV} ammoBV=${d.breakdown.ammoBV}`);
  console.log(`    total=${d.calculatedBV} ref=${d.indexBV} pct=+${d.percentDiff.toFixed(1)}%`);
}

// Check: is the overcalculation proportional to total BV or to a specific component?
console.log('\n=== OVERCALCULATION PROPORTIONALITY ===');
for (const d of overCalc.slice(0, 20)) {
  const excess = d.calculatedBV - d.indexBV;
  const defPortion = d.breakdown.defensiveBV / d.calculatedBV;
  const offPortion = d.breakdown.offensiveBV / d.calculatedBV;
  // If overcalculation is proportional to TOTAL BV (i.e. a multiplier on the whole thing)
  // then excess/total should be roughly constant (~5%)
  console.log(`  ${d.unitId}: excess=${excess} total=${d.calculatedBV} excess/total=${(excess/d.calculatedBV*100).toFixed(1)}% def%=${(defPortion*100).toFixed(0)}% off%=${(offPortion*100).toFixed(0)}%`);
}
