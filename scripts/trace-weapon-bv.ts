#!/usr/bin/env npx tsx
/**
 * Trace weapon BV resolution for specific units to find systematic gap.
 * Reads unit JSON + runs resolution, comparing to expected values.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId, resetCatalogCache } from '../src/utils/construction/equipmentBVResolver';

// Load a unit file
function loadUnit(unitPath: string) {
  const fullPath = path.resolve(process.cwd(), 'public/data/units/battlemechs', unitPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

// Load index
const indexPath = path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Load validation report
const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Find units with minor discrepancy (1-5% undercalculation)
const minorUnder = report.allResults.filter((r: any) =>
  r.percentDiff !== null && r.percentDiff < -1 && r.percentDiff > -5 && r.rootCause === 'minor-discrepancy'
);

console.log(`Found ${minorUnder.length} units with 1-5% undercalculation`);

// For each, load the unit and trace weapon resolution
let totalMissing = 0;
let unitCount = 0;
const gapDistribution: Record<string, number> = {};

for (const result of minorUnder.slice(0, 50)) {
  const indexUnit = index.units.find((u: any) => u.id === result.unitId);
  if (!indexUnit) continue;

  resetCatalogCache();
  const unit = loadUnit(indexUnit.path);

  // Check each weapon
  let weaponTotal = 0;
  let unresolvedCount = 0;
  const unresolvedWeapons: string[] = [];

  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase();
    // Skip non-weapon equipment
    if (lo.includes('ammo') || lo.includes('heatsink') || lo.includes('heat-sink') ||
        lo.includes('case') || lo.includes('artemis') || lo.includes('targeting') ||
        lo.includes('ecm') || lo.includes('probe') || lo.includes('c3') ||
        lo.includes('masc') || lo.includes('tsm') || lo.includes('jump') ||
        lo.includes('shield') || lo.includes('sword') || lo.includes('hatchet') ||
        lo.includes('tag') || lo.includes('mga') || lo.includes('machine-gun-array') ||
        lo.includes('partial-wing') || lo.includes('supercharger') || lo.includes('ams') ||
        lo.includes('anti-missile')) continue;

    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved || res.battleValue === 0) {
      unresolvedWeapons.push(eq.id);
      unresolvedCount++;
    } else {
      weaponTotal += res.battleValue;
    }
  }

  if (unresolvedWeapons.length > 0) {
    console.log(`\n${result.unitId} (${result.percentDiff.toFixed(1)}% diff, gap=${result.difference}):`);
    console.log(`  Unresolved: ${unresolvedWeapons.join(', ')}`);
    totalMissing++;
  }

  // Track gap pattern
  const absGap = Math.abs(result.difference);
  const bucket = absGap < 20 ? '<20' : absGap < 50 ? '20-50' : absGap < 100 ? '50-100' : '100+';
  gapDistribution[bucket] = (gapDistribution[bucket] || 0) + 1;
  unitCount++;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Checked: ${unitCount} units`);
console.log(`Units with unresolved weapons: ${totalMissing}`);
console.log(`Gap distribution:`, gapDistribution);

// Now check: what are the most common weapons across these units?
const weaponFreq: Record<string, { count: number; bv: number }> = {};
for (const result of minorUnder.slice(0, 100)) {
  const indexUnit = index.units.find((u: any) => u.id === result.unitId);
  if (!indexUnit) continue;
  resetCatalogCache();
  const unit = loadUnit(indexUnit.path);
  for (const eq of unit.equipment) {
    const res = resolveEquipmentBV(eq.id);
    if (res.resolved && res.battleValue > 0) {
      const norm = normalizeEquipmentId(eq.id);
      if (!weaponFreq[norm]) weaponFreq[norm] = { count: 0, bv: res.battleValue };
      weaponFreq[norm].count++;
    }
  }
}

const sorted = Object.entries(weaponFreq).sort((a, b) => b[1].count - a[1].count).slice(0, 20);
console.log(`\nTop 20 weapons in undercalculating units:`);
for (const [id, { count, bv }] of sorted) {
  console.log(`  ${id}: count=${count}, catalogBV=${bv}`);
}
