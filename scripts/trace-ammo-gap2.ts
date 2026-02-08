#!/usr/bin/env npx tsx
/**
 * Analyze ammo BV from the validation report:
 * 1. How many undercalculated units have ammoBV=0?
 * 2. How many units with ammo crit slots have ammoBV=0?
 * 3. Is the gap correlated with ammo?
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Find units with ammo in crit slots
function hasAmmoCritSlots(unitId: string): { has: boolean; count: number; names: string[] } {
  const iu = index.units.find((u: any) => u.id === unitId);
  if (!iu) return { has: false, count: 0, names: [] };
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    if (!unit.criticalSlots) return { has: false, count: 0, names: [] };
    let count = 0;
    const names: string[] = [];
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).toLowerCase();
        if (lo.includes('ammo') && !lo.includes('ammo feed')) {
          count++;
          const clean = (s as string).replace(/\s*\(omnipod\)/gi, '').trim();
          if (!names.includes(clean)) names.push(clean);
        }
      }
    }
    return { has: count > 0, count, names };
  } catch {
    return { has: false, count: 0, names: [] };
  }
}

// Categorize all results
const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});

const overcalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference > 0;
});

const accurate = report.allResults.filter((r: any) => Math.abs(r.percentDiff) <= 1);

console.log('=== Ammo BV Analysis from Validation Report ===\n');

// Check undercalculated units
let ucAmmo0WithCrits = 0;
let ucAmmo0NoCrits = 0;
let ucAmmoPositive = 0;
let ucAmmo0WithCritsList: { id: string; gap: number; ammoSlots: number; ammoNames: string[] }[] = [];

for (const r of undercalc) {
  const ammoBV = r.breakdown?.ammoBV ?? 0;
  const ammo = hasAmmoCritSlots(r.unitId);
  if (ammoBV === 0 && ammo.has) {
    ucAmmo0WithCrits++;
    ucAmmo0WithCritsList.push({ id: r.unitId, gap: r.indexBV - r.calculatedBV, ammoSlots: ammo.count, ammoNames: ammo.names });
  } else if (ammoBV === 0 && !ammo.has) {
    ucAmmo0NoCrits++;
  } else {
    ucAmmoPositive++;
  }
}

console.log(`Undercalculated units (1-5% under, ${undercalc.length} total):`);
console.log(`  ammoBV>0 (ammo resolved):    ${ucAmmoPositive}`);
console.log(`  ammoBV=0, has ammo crits:    ${ucAmmo0WithCrits}  <-- POTENTIAL BUG`);
console.log(`  ammoBV=0, no ammo crits:     ${ucAmmo0NoCrits}  (energy-only units, expected)`);

if (ucAmmo0WithCritsList.length > 0) {
  console.log(`\n  Units with ammoBV=0 but ammo in crits (top 30 by gap):`);
  ucAmmo0WithCritsList.sort((a, b) => b.gap - a.gap);
  for (const u of ucAmmo0WithCritsList.slice(0, 30)) {
    console.log(`    ${u.id.padEnd(40).slice(0, 40)} gap=${String(u.gap).padStart(5)} slots=${u.ammoSlots} [${u.ammoNames.slice(0, 3).join(', ')}]`);
  }
}

// Check accurate units for comparison
let accAmmo0WithCrits = 0;
for (const r of accurate) {
  const ammoBV = r.breakdown?.ammoBV ?? 0;
  const ammo = hasAmmoCritSlots(r.unitId);
  if (ammoBV === 0 && ammo.has) accAmmo0WithCrits++;
}
console.log(`\nAccurate units (within 1%, ${accurate.length} total):`);
console.log(`  ammoBV=0 but has ammo crits: ${accAmmo0WithCrits}`);

// Distribution of ammoBV across undercalculated units
const ammoDistribution: { withAmmo: number[]; withoutAmmo: number[] } = { withAmmo: [], withoutAmmo: [] };
for (const r of undercalc) {
  const ammoBV = r.breakdown?.ammoBV ?? 0;
  const gap = r.indexBV - r.calculatedBV;
  if (ammoBV > 0) ammoDistribution.withAmmo.push(gap);
  else ammoDistribution.withoutAmmo.push(gap);
}

console.log(`\nAverage gap for undercalculated units:`);
console.log(`  WITH resolved ammoBV:  avg=${(ammoDistribution.withAmmo.reduce((s, v) => s + v, 0) / ammoDistribution.withAmmo.length).toFixed(1)} (n=${ammoDistribution.withAmmo.length})`);
console.log(`  WITHOUT ammoBV (all):  avg=${(ammoDistribution.withoutAmmo.reduce((s, v) => s + v, 0) / ammoDistribution.withoutAmmo.length).toFixed(1)} (n=${ammoDistribution.withoutAmmo.length})`);

// Check: for units where ammoBV=0 but have crits, what % of the BV gap would adding ammo explain?
console.log(`\n=== Estimated Ammo BV Impact ===`);
let totalEstimatedMissing = 0;
let totalGapForThose = 0;
for (const u of ucAmmo0WithCritsList) {
  // Rough estimate: average ammo BV per slot is about 10-15
  const estimatedAmmoBV = u.ammoSlots * 12;
  totalEstimatedMissing += estimatedAmmoBV;
  totalGapForThose += u.gap;
}
if (ucAmmo0WithCritsList.length > 0) {
  console.log(`Units with missing ammo: ${ucAmmo0WithCritsList.length}`);
  console.log(`Total gap for those units: ${totalGapForThose}`);
  console.log(`Estimated missing ammo BV (rough): ${totalEstimatedMissing}`);
  console.log(`Estimated % of gap explained: ${(totalEstimatedMissing / totalGapForThose * 100).toFixed(1)}%`);
}

// How many units total in report have ammo crits but ammoBV=0?
let totalAmmo0WithCrits = 0;
for (const r of report.allResults) {
  const ammoBV = r.breakdown?.ammoBV ?? 0;
  const ammo = hasAmmoCritSlots(r.unitId);
  if (ammoBV === 0 && ammo.has) totalAmmo0WithCrits++;
}
console.log(`\nAcross ALL ${report.allResults.length} units: ${totalAmmo0WithCrits} have ammoBV=0 but ammo in crits`);
