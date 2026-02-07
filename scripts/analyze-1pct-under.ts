/**
 * Deep analysis of 1-2% undercalculated units to find common fixable patterns.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under1to2 = valid.filter((x: any) => x.percentDiff >= -2 && x.percentDiff < -1 && x.breakdown);

console.log(`=== 1-2% UNDERCALCULATED: ${under1to2.length} units ===\n`);

// For each unit, compute what the gap is in base offensive terms
const gaps: Array<{
  unitId: string;
  techBase: string;
  tonnage: number;
  diff: number;
  pct: number;
  baseGap: number;
  weaponBV: number;
  ammoBV: number;
  weightBonus: number;
  speedFactor: number;
  heatEfficiency: number;
  defensiveFactor: number;
  defBV: number;
  cockpit: number;
  issues: string[];
}> = [];

for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const neededOff = refBase - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const baseGap = neededBase - currentBase;

  gaps.push({
    unitId: u.unitId,
    techBase: unit.techBase,
    tonnage: unit.tonnage,
    diff: u.difference,
    pct: u.percentDiff,
    baseGap,
    weaponBV: b.weaponBV,
    ammoBV: b.ammoBV,
    weightBonus: b.weightBonus,
    speedFactor: b.speedFactor,
    heatEfficiency: b.heatEfficiency,
    defensiveFactor: b.defensiveFactor,
    defBV: b.defensiveBV,
    cockpit,
    issues: u.issues || [],
  });
}

// Sort by base gap
gaps.sort((a, b) => b.baseGap - a.baseGap);

// Show all
for (const g of gaps) {
  console.log(`  ${g.unitId.padEnd(40)} diff=${g.diff} (${g.pct.toFixed(1)}%) baseGap=${g.baseGap.toFixed(0)} tech=${g.techBase} SF=${g.speedFactor} HE=${g.heatEfficiency} DF=${g.defensiveFactor.toFixed(2)} cockpit=${g.cockpit}`);
}

// Check: how many have the gap in defensive vs offensive
console.log('\n=== GAP SOURCE ANALYSIS ===');
let defGapCount = 0;
let offGapCount = 0;
for (const g of gaps) {
  if (g.baseGap > 0) offGapCount++;
  else defGapCount++;
}
console.log(`  Offensive gap (baseGap > 0): ${offGapCount}`);
console.log(`  Defensive gap (baseGap <= 0): ${defGapCount}`);

// Average base gap
const avgBaseGap = gaps.reduce((s, g) => s + g.baseGap, 0) / gaps.length;
console.log(`  Average base offensive gap: ${avgBaseGap.toFixed(1)}`);

// Check: would increasing heat efficiency by 1 fix any?
console.log('\n=== HEAT EFFICIENCY SENSITIVITY ===');
// If HE is off by 1, the last weapon before threshold might get full BV instead of half
// This would add ~half of one weapon's BV to the total
// Average weapon BV is roughly weaponBV / numWeapons ≈ 200-600 / 5-10 ≈ 40-60 BV
// Half of that is 20-30 BV, which matches our average gap of ~23 BV!

// Check distribution of heat efficiency values
const heDistrib: Record<number, number> = {};
for (const g of gaps) {
  const he = g.heatEfficiency;
  heDistrib[he] = (heDistrib[he] || 0) + 1;
}
console.log('  HE distribution:');
const sortedHE = Object.entries(heDistrib).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
for (const [he, count] of sortedHE) {
  console.log(`    HE=${he}: ${count} units`);
}

// Check specific equipment patterns
console.log('\n=== EQUIPMENT PATTERNS ===');
const equipCounts: Record<string, number> = {};
for (const g of gaps) {
  const unit = loadUnit(g.unitId);
  if (!unit?.equipment) continue;
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('ammo')) continue;
    equipCounts[lo] = (equipCounts[lo] || 0) + 1;
  }
}
const sortedEquip = Object.entries(equipCounts).sort((a, b) => b[1] - a[1]);
console.log('  Top equipment:');
for (const [eq, count] of sortedEquip.slice(0, 15)) {
  console.log(`    ${eq.padEnd(30)} ${count}`);
}

// Check cockpit distribution
console.log('\n=== COCKPIT MODIFIER ===');
const cockpitCounts: Record<number, number> = {};
for (const g of gaps) {
  cockpitCounts[g.cockpit] = (cockpitCounts[g.cockpit] || 0) + 1;
}
for (const [mod, count] of Object.entries(cockpitCounts)) {
  console.log(`  cockpit=${mod}: ${count} units`);
}

// Check how many would be fixed if defensive BV was lower by various amounts
console.log('\n=== IF DEFENSIVE BV REDUCED BY X ===');
for (const reduction of [5, 10, 15, 20]) {
  let fixed = 0;
  for (const u of under1to2) {
    const b = u.breakdown;
    const cockpit = b.cockpitModifier ?? 1;
    const newCalc = Math.round((b.defensiveBV - reduction + b.offensiveBV) * cockpit);
    // We want to fix undercalculation: our BV is too LOW. Reducing def BV makes it worse!
    // Actually, the question is: is our defensive BV too HIGH or too LOW?
    // If undercalculated, our total is too low. So either defensive or offensive is too low.
    // Reducing defensive further makes it worse. Let me flip this.
  }
  // Actually let me check: if def was HIGHER by X, would it fix?
  for (const increase of [5, 10, 15, 20, 25]) {
    let fixed = 0;
    for (const u of under1to2) {
      const b = u.breakdown;
      const cockpit = b.cockpitModifier ?? 1;
      const newCalc = Math.round((b.defensiveBV + increase + b.offensiveBV) * cockpit);
      const newPct = ((newCalc - u.indexBV) / u.indexBV) * 100;
      if (Math.abs(newPct) <= 1) fixed++;
    }
    console.log(`  DefBV + ${increase}: ${fixed}/${under1to2.length} fixed`);
  }
}
