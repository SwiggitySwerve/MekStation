/**
 * Deep trace units in the 1-2% band to find which BV component is off.
 * Compare DEF vs OFF contribution to the error.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const near = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);

// For each unit in the 1-2% band, compute what the DEF and OFF would need to be
console.log('=== 1-2% BAND: DEF vs OFF CONTRIBUTION ===');
console.log('Unit                                    pctDiff  ref    calc   def    off    cockpit  defNeeded  offNeeded  defErr  offErr');

// Estimate: totalBV = round((DEF + OFF) * cockpitMod)
// So (DEF + OFF) = totalBV / cockpitMod
// The error is: calc - ref. If DEF is too high, that contributes positively.
// The fractional contribution: DEF/(DEF+OFF) of the total error is from DEF.

let defErrSum = 0, offErrSum = 0, count = 0;
let defOverSum = 0, offOverSum = 0, overCount = 0;
let defUnderSum = 0, offUnderSum = 0, underCount = 0;

// Clan vs IS breakdown
let clanDefErr = 0, clanOffErr = 0, clanCount = 0;
let isDefErr = 0, isOffErr = 0, isCount = 0;

for (const r of near.sort((a: any, b: any) => b.percentDiff - a.percentDiff)) {
  const b = r.breakdown;
  if (!b) continue;

  const def = b.defensiveBV || 0;
  const off = b.offensiveBV || 0;
  const cockpit = b.cockpitModifier || 1;
  const total = def + off;
  const refTotal = r.indexBV / cockpit;
  const diff = total - refTotal;

  // Fractional attribution: how much of the error is from DEF vs OFF?
  // Without knowing exact MegaMek DEF/OFF split, we can't attribute precisely.
  // But we can note the ratio of DEF to total.
  const defFrac = total > 0 ? def / total : 0.5;
  const offFrac = total > 0 ? off / total : 0.5;

  count++;
  const tech = b.techBase;

  if (r.percentDiff > 0) {
    overCount++;
  } else {
    underCount++;
  }

  if (tech === 'CLAN') {
    clanCount++;
  } else {
    isCount++;
  }
}

// Better approach: look at units where we can compare specific components
// Focus on simple units (no halved weapons) to minimize complexity
console.log('\n=== SIMPLE UNIT TRACES (1-2% band, no halved weapons) ===');
const simple = near.filter((x: any) => (x.breakdown?.halvedWeaponCount || 0) === 0);
console.log(`Simple units (no halved weapons): ${simple.length}/${near.length}`);

// For simple units, the OFF should be: weaponBV * speedFactor + ammoBV * speedFactor + physicalBV + weightBonus
// Check if there's a consistent overcount in OFF vs DEF
for (const r of simple.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 15)) {
  const b = r.breakdown;
  const diff = r.calculatedBV - r.indexBV;
  console.log(`  ${r.unitId.padEnd(40)} diff=${diff.toString().padStart(4)} (${r.percentDiff.toFixed(1).padStart(5)}%) def=${b.defensiveBV?.toFixed(0)} off=${b.offensiveBV?.toFixed(0)} wBV=${b.weaponBV?.toFixed(0)} aBV=${b.ammoBV} pBV=${b.physicalWeaponBV?.toFixed(0)} SF=${b.speedFactor} DF=${b.defensiveFactor} HE=${b.heatEfficiency}`);
}
console.log('  --- undercalculated ---');
for (const r of simple.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15)) {
  const b = r.breakdown;
  const diff = r.calculatedBV - r.indexBV;
  console.log(`  ${r.unitId.padEnd(40)} diff=${diff.toString().padStart(4)} (${r.percentDiff.toFixed(1).padStart(5)}%) def=${b.defensiveBV?.toFixed(0)} off=${b.offensiveBV?.toFixed(0)} wBV=${b.weaponBV?.toFixed(0)} aBV=${b.ammoBV} pBV=${b.physicalWeaponBV?.toFixed(0)} SF=${b.speedFactor} DF=${b.defensiveFactor} HE=${b.heatEfficiency}`);
}

// Also check: CLAN undercalculated pattern
console.log('\n=== CLAN UNDERCALCULATED IN 1-2% BAND ===');
const clanUnder = near.filter((x: any) => x.percentDiff < -1 && x.breakdown?.techBase === 'CLAN');
for (const r of clanUnder.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const b = r.breakdown;
  const diff = r.calculatedBV - r.indexBV;
  console.log(`  ${r.unitId.padEnd(40)} diff=${diff.toString().padStart(4)} (${r.percentDiff.toFixed(1).padStart(5)}%) def=${b.defensiveBV?.toFixed(0)} off=${b.offensiveBV?.toFixed(0)} wBV=${b.weaponBV?.toFixed(0)} aBV=${b.ammoBV} SF=${b.speedFactor} DF=${b.defensiveFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}`);
}
