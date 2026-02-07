/**
 * Find all unresolved ammo in the validation and trace why they fail.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);

// Collect all unresolved ammo names with unit counts
const unresolvedAmmo: Record<string, { count: number; units: string[] }> = {};

for (const u of outside1) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (!lo.includes('ammo') || lo.includes('case') || lo.includes('ammo feed')) continue;
      const clean = s.replace(/\s*\(omnipod\)/gi, '').trim();
      const ar = resolveAmmoBV(clean);
      if (!ar.resolved || ar.battleValue === 0) {
        if (!unresolvedAmmo[clean]) unresolvedAmmo[clean] = { count: 0, units: [] };
        if (!unresolvedAmmo[clean].units.includes(u.unitId)) {
          unresolvedAmmo[clean].count++;
          unresolvedAmmo[clean].units.push(u.unitId);
        }
      }
    }
  }
}

console.log('=== UNRESOLVED AMMO (outside 1%) ===');
console.log(`Total unique ammo names: ${Object.keys(unresolvedAmmo).length}\n`);

const sorted = Object.entries(unresolvedAmmo).sort((a, b) => b[1].count - a[1].count);
for (const [name, info] of sorted) {
  const norm = normalizeEquipmentId(name);
  console.log(`"${name}" (${info.count} units) → normalized: "${norm}"`);
  if (info.count <= 5) console.log(`  units: ${info.units.join(', ')}`);
}
