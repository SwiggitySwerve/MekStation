#!/usr/bin/env npx tsx
/**
 * Analyze whether the speed factor formula is causing systematic undercalculation.
 * Compare our speed factor against expected values.
 * Also check if weapon BV totals are different.
 */
import * as fs from 'fs';
import * as path from 'path';
import { calculateOffensiveSpeedFactor } from '../src/utils/construction/battleValueCalculations';

const results: any[] = JSON.parse(fs.readFileSync('./validation-output/bv-all-results.json', 'utf-8'));

// For undercalculated units: compare what speed factor we use vs what would close the gap
const under = results.filter(r => r.pct < -1 && r.pct >= -5);

// Check speed factor distribution
const sfCounts: Record<string, number> = {};
for (const r of under) {
  const sf = r.sf?.toFixed(2) || 'unknown';
  sfCounts[sf] = (sfCounts[sf] || 0) + 1;
}

console.log('Speed factor distribution for 1-5% undercalculated:');
const sorted = Object.entries(sfCounts).sort((a, b) => b[1] - a[1]);
for (const [sf, count] of sorted.slice(0, 15)) {
  console.log(`  SF=${sf}: ${count} units`);
}

// Check if adjusting defBV or offBV would fix the gap
let defOnlyFix = 0;
let offOnlyFix = 0;
let bothFix = 0;
for (const r of under) {
  if (!r.defBV || !r.offBV) continue;
  const gap = r.ref - r.calc;
  // Would a 5% increase in defBV close the gap?
  if (r.defBV * 0.05 >= gap) defOnlyFix++;
  // Would a 5% increase in offBV close the gap?
  if (r.offBV * 0.05 >= gap) offOnlyFix++;
  if (r.defBV * 0.05 >= gap || r.offBV * 0.05 >= gap) bothFix++;
}

console.log(`\n${under.length} units 1-5% under:`);
console.log(`  5% defBV increase would fix: ${defOnlyFix}`);
console.log(`  5% offBV increase would fix: ${offOnlyFix}`);
console.log(`  Either would fix: ${bothFix}`);

// Look at the specific gap composition
// For each unit, what fraction of the gap is in defensive vs offensive?
console.log('\nChecking if the gap correlates with specific BV components:');

// Read detailed results from the report
const report = JSON.parse(fs.readFileSync('./validation-output/bv-validation-report.json', 'utf-8'));

// Count patterns in breakdown fields
let weapBVMissing = 0;
let ammoBVMissing = 0;
let avgWeapBV = 0;
let avgAmmoBV = 0;
let avgDefEquipBV = 0;
let avgExplosivePenalty = 0;
let count = 0;

for (const r of report.topDiscrepancies || []) {
  if (r.percentDiff < -1 && r.percentDiff >= -5 && r.breakdown) {
    count++;
    avgWeapBV += r.breakdown.weaponBV || 0;
    avgAmmoBV += r.breakdown.ammoBV || 0;
    avgDefEquipBV += r.breakdown.defensiveEquipBV || 0;
    avgExplosivePenalty += r.breakdown.explosivePenalty || 0;
  }
}

if (count > 0) {
  console.log(`  Sample of ${count} units from top discrepancies:`);
  console.log(`    Avg weapon BV: ${(avgWeapBV/count).toFixed(0)}`);
  console.log(`    Avg ammo BV: ${(avgAmmoBV/count).toFixed(0)}`);
  console.log(`    Avg def equip BV: ${(avgDefEquipBV/count).toFixed(0)}`);
  console.log(`    Avg explosive penalty: ${(avgExplosivePenalty/count).toFixed(0)}`);
}

// Check: how many units have 0 ammoBV but are undercalculated
const noAmmoUnder = under.filter(r => (r.ammoBV || 0) === 0);
const hasAmmoUnder = under.filter(r => (r.ammoBV || 0) > 0);
console.log(`\n  No ammo BV: ${noAmmoUnder.length} units (avg gap: ${noAmmoUnder.reduce((s, r) => s + (r.ref - r.calc), 0) / noAmmoUnder.length | 0} BV)`);
console.log(`  Has ammo BV: ${hasAmmoUnder.length} units (avg gap: ${hasAmmoUnder.reduce((s, r) => s + (r.ref - r.calc), 0) / hasAmmoUnder.length | 0} BV)`);

// Check what fraction of the gap is consistent with "missing one weapon's BV"
let gapMatchesOneWeapon = 0;
for (const r of under) {
  const gap = r.ref - r.calc;
  // Common weapon BV values: 12, 17, 31, 48, 62, 89, 108, 119, 163, 181, 210, 248, 265, 320
  const commonWeaponBVs = [5, 6, 7, 8, 9, 10, 11, 12, 17, 24, 31, 37, 41, 42, 45, 48, 56, 59, 62, 65, 79, 84, 88, 89, 95, 108, 111, 119, 123, 148, 150, 163, 176, 180, 181, 200, 210, 220, 230, 237, 248, 265, 271, 290, 316, 320, 329, 344];
  for (const bv of commonWeaponBVs) {
    // Account for speed factor multiplication
    if (r.sf) {
      const scaledBV = bv * r.sf;
      if (Math.abs(gap - scaledBV) < gap * 0.1) {
        gapMatchesOneWeapon++;
        break;
      }
    }
  }
}
console.log(`\n  Gap matches one common weapon BV * SF: ${gapMatchesOneWeapon} / ${under.length}`);
