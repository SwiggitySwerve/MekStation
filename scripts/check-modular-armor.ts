/**
 * Count units with Modular Armor and check impact.
 */
import * as bvAnalysis from './bv-analysis-helpers';

const report = bvAnalysis.loadBvValidationReport();
const idx = bvAnalysis.loadBattleMechIndex();
const loadUnit = bvAnalysis.createBattleMechUnitLoader(idx);

const valid = report.allResults.filter(
  (x: any) => x.status !== 'error' && x.percentDiff !== null,
);

let totalWithModArmor = 0;
let underWithModArmor = 0;
let exactWithModArmor = 0;
const modArmorUnits: Array<{
  id: string;
  count: number;
  status: string;
  pctDiff: number;
}> = [];

for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  let modCount = 0;
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      if (
        s.toLowerCase().includes('modulararmor') ||
        s.toLowerCase().includes('modular armor')
      ) {
        modCount++;
      }
    }
  }
  if (modCount > 0) {
    totalWithModArmor++;
    if (u.status === 'exact') exactWithModArmor++;
    if (u.percentDiff < -1) underWithModArmor++;
    modArmorUnits.push({
      id: u.unitId,
      count: modCount,
      status: u.status,
      pctDiff: u.percentDiff || 0,
    });
  }
}

console.log(`=== MODULAR ARMOR UNITS ===`);
console.log(`Total: ${totalWithModArmor}`);
console.log(`Exact: ${exactWithModArmor}`);
console.log(`Undercalculated >1%: ${underWithModArmor}`);
console.log('');

for (const u of modArmorUnits.sort((a, b) => a.pctDiff - b.pctDiff)) {
  console.log(
    `  ${u.id.padEnd(40)} slots=${u.count} pct=${u.pctDiff.toFixed(1)}% status=${u.status}`,
  );
}
