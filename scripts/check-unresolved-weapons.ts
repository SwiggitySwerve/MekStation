#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId, getCatalogSize } from '../src/utils/construction/equipmentBVResolver';

const basePath = './public/data/units/battlemechs';
const data = JSON.parse(fs.readFileSync('./validation-output/bv-validation-report.json', 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf8'));

console.log('Catalog size:', getCatalogSize(), 'entries\n');

// Check unresolved weapons across ALL validated units
const unresolvedCounts: Record<string, { count: number, units: string[] }> = {};
let totalUnresolved = 0;
let totalWeapons = 0;

// Focus on undercalculating "within5" units
const undercalcUnits = data.allResults.filter((r: any) =>
  r.status === 'within5' && r.percentDiff < -1
);

console.log(`Checking ${undercalcUnits.length} undercalculating within5 units...\n`);

for (const result of undercalcUnits) {
  const entry = index.units.find((u: any) => u.id === result.unitId);
  if (!entry) continue;
  const unitPath = path.join(basePath, entry.path);
  if (!fs.existsSync(unitPath)) continue;

  const unitData = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const equipment = unitData.equipment || [];

  for (const eq of equipment) {
    const lo = eq.id.toLowerCase();
    // Skip non-weapon equipment
    if (lo.includes('ammo') || lo.includes('heat-sink') || lo.includes('heatsink') ||
        lo.includes('jump-jet') || lo.includes('case') || lo.includes('ecm') ||
        lo.includes('bap') || lo.includes('active-probe') || lo.includes('tsm') ||
        lo.includes('masc') || lo.includes('supercharger') || lo.includes('targeting-computer') ||
        lo.includes('endo') || lo.includes('ferro') || lo.includes('stealth') ||
        lo.includes('myomer') || lo.includes('shield') || lo.includes('coolant') ||
        lo.includes('null-sig') || lo.includes('void-sig') || lo.includes('chameleon') ||
        lo.includes('partial-wing') || lo.includes('actuator') || lo.includes('triple-strength')) continue;

    totalWeapons++;
    const resolved = resolveEquipmentBV(eq.id);
    if (!resolved.resolved || resolved.battleValue === 0) {
      totalUnresolved++;
      const normalized = normalizeEquipmentId(eq.id);
      const key = `${eq.id} -> ${normalized}`;
      if (!unresolvedCounts[key]) unresolvedCounts[key] = { count: 0, units: [] };
      unresolvedCounts[key].count++;
      if (unresolvedCounts[key].units.length < 3) {
        unresolvedCounts[key].units.push(result.unitId);
      }
    }
  }
}

console.log(`Total weapons checked: ${totalWeapons}`);
console.log(`Total unresolved: ${totalUnresolved} (${(totalUnresolved / totalWeapons * 100).toFixed(1)}%)\n`);

// Sort by frequency
const sorted = Object.entries(unresolvedCounts)
  .sort((a, b) => b[1].count - a[1].count);

console.log('=== UNRESOLVED WEAPONS (sorted by frequency) ===');
for (const [key, data2] of sorted.slice(0, 30)) {
  console.log(`  ${key}: ${data2.count}x (e.g., ${data2.units.join(', ')})`);
}

// Now check ALL units (not just undercalc) for unresolved weapons
console.log('\n\n=== CHECKING ALL VALIDATED UNITS ===');
const allUnresolved: Record<string, { count: number, units: string[] }> = {};
let allTotalUnresolved = 0;
let allTotalWeapons = 0;

for (const result of data.allResults) {
  const entry = index.units.find((u: any) => u.id === result.unitId);
  if (!entry) continue;
  const unitPath = path.join(basePath, entry.path);
  if (!fs.existsSync(unitPath)) continue;

  const unitData = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const equipment = unitData.equipment || [];

  for (const eq of equipment) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heat-sink') || lo.includes('heatsink') ||
        lo.includes('jump-jet') || lo.includes('case') || lo.includes('ecm') ||
        lo.includes('bap') || lo.includes('active-probe') || lo.includes('tsm') ||
        lo.includes('masc') || lo.includes('supercharger') || lo.includes('targeting-computer') ||
        lo.includes('endo') || lo.includes('ferro') || lo.includes('stealth') ||
        lo.includes('myomer') || lo.includes('shield') || lo.includes('coolant') ||
        lo.includes('null-sig') || lo.includes('void-sig') || lo.includes('chameleon') ||
        lo.includes('partial-wing') || lo.includes('actuator') || lo.includes('triple-strength') ||
        lo.includes('c3') || lo.includes('tag')) continue;

    allTotalWeapons++;
    const resolved = resolveEquipmentBV(eq.id);
    if (!resolved.resolved || resolved.battleValue === 0) {
      allTotalUnresolved++;
      const normalized = normalizeEquipmentId(eq.id);
      const key = `${eq.id} -> ${normalized}`;
      if (!allUnresolved[key]) allUnresolved[key] = { count: 0, units: [] };
      allUnresolved[key].count++;
      if (allUnresolved[key].units.length < 3) {
        allUnresolved[key].units.push(result.unitId);
      }
    }
  }
}

console.log(`Total weapons checked: ${allTotalWeapons}`);
console.log(`Total unresolved: ${allTotalUnresolved} (${(allTotalUnresolved / allTotalWeapons * 100).toFixed(1)}%)\n`);

const allSorted = Object.entries(allUnresolved)
  .sort((a, b) => b[1].count - a[1].count);

console.log('Top 40 unresolved weapons across ALL units:');
for (const [key, data2] of allSorted.slice(0, 40)) {
  console.log(`  ${key}: ${data2.count}x (e.g., ${data2.units.join(', ')})`);
}
