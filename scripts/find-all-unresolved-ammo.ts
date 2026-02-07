/**
 * Find ALL unresolved ammo crit entries across all units.
 * Shows what ammo names fail to resolve in resolveAmmoByPattern.
 */
import * as fs from 'fs';
import * as path from 'path';

// Import the resolve function from validate-bv by copying its logic inline
import { normalizeEquipmentId, resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Build result map for quick lookup
const resultMap = new Map<string, any>();
for (const r of report.allResults) resultMap.set(r.unitId, r);

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Track unresolved ammo names and which units they appear in
const unresolvedAmmo = new Map<string, { count: number; units: string[]; pctDiffs: number[] }>();
let totalAmmoEntries = 0;
let resolvedAmmoEntries = 0;

for (const ie of idx.units) {
  const unit = loadUnit(ie.id);
  if (!unit?.criticalSlots) continue;
  const result = resultMap.get(ie.id);
  const pctDiff = result?.percentDiff ?? null;

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots as string[]) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
      const lo = clean.toLowerCase();
      if (!lo.includes('ammo') || lo.includes('ammo feed')) continue;

      totalAmmoEntries++;

      // Try resolveEquipmentBV (which uses normalizeEquipmentId)
      const res = resolveEquipmentBV(clean);
      if (res.resolved && res.battleValue > 0) {
        resolvedAmmoEntries++;
        continue;
      }

      // Try direct normalizeEquipmentId to see if it maps to a catalog entry
      const norm = normalizeEquipmentId(clean);
      // Check if norm resolves
      const normRes = resolveEquipmentBV(norm);
      if (normRes.resolved && normRes.battleValue > 0) {
        resolvedAmmoEntries++;
        continue;
      }

      // Unresolved
      const key = clean;
      let entry = unresolvedAmmo.get(key);
      if (!entry) { entry = { count: 0, units: [], pctDiffs: [] }; unresolvedAmmo.set(key, entry); }
      entry.count++;
      if (entry.units.length < 3) entry.units.push(ie.id);
      if (pctDiff !== null) entry.pctDiffs.push(pctDiff);
    }
  }
}

console.log(`Total ammo crit entries: ${totalAmmoEntries}`);
console.log(`Resolved via resolveEquipmentBV: ${resolvedAmmoEntries}`);
console.log(`Unresolved: ${totalAmmoEntries - resolvedAmmoEntries}`);
console.log(`\n=== UNRESOLVED AMMO (by frequency) ===\n`);

const sorted = [...unresolvedAmmo.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [name, info] of sorted) {
  const avgDiff = info.pctDiffs.length > 0 ? (info.pctDiffs.reduce((a, b) => a + b, 0) / info.pctDiffs.length).toFixed(1) : '?';
  console.log(`  ${String(info.count).padStart(4)}x  ${name.padEnd(55)} avgDiff=${avgDiff}%  [${info.units.join(', ')}]`);
}
