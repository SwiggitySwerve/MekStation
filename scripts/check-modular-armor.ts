/**
 * Count units with Modular Armor and check impact.
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

let totalWithModArmor = 0;
let underWithModArmor = 0;
let exactWithModArmor = 0;
const modArmorUnits: Array<{ id: string; count: number; status: string; pctDiff: number }> = [];

for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  let modCount = 0;
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      if (s.toLowerCase().includes('modulararmor') || s.toLowerCase().includes('modular armor')) {
        modCount++;
      }
    }
  }
  if (modCount > 0) {
    totalWithModArmor++;
    if (u.status === 'exact') exactWithModArmor++;
    if (u.percentDiff < -1) underWithModArmor++;
    modArmorUnits.push({ id: u.unitId, count: modCount, status: u.status, pctDiff: u.percentDiff || 0 });
  }
}

console.log(`=== MODULAR ARMOR UNITS ===`);
console.log(`Total: ${totalWithModArmor}`);
console.log(`Exact: ${exactWithModArmor}`);
console.log(`Undercalculated >1%: ${underWithModArmor}`);
console.log('');

for (const u of modArmorUnits.sort((a, b) => a.pctDiff - b.pctDiff)) {
  console.log(`  ${u.id.padEnd(40)} slots=${u.count} pct=${u.pctDiff.toFixed(1)}% status=${u.status}`);
}
