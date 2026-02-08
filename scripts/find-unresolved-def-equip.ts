/**
 * Find all unresolved defensive equipment across undercalculated units.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

// Defensive equipment detection (same as validate-bv.ts)
function isDefEquip(id: string): boolean {
  const lo = id.toLowerCase();
  return lo.includes('anti-missile') || lo.includes('antimissile') || lo.includes('ams') ||
    lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') ||
    lo.includes('watchdog') || lo.includes('novacews') || lo.includes('nova cews') ||
    lo.includes('beagle') || lo.includes('bloodhound') || lo.includes('active') && lo.includes('probe') ||
    lo.includes('electronic') || lo.includes('ewequipment') ||
    lo.includes('bap') || lo.includes('light active probe') ||
    lo.includes('c3') || lo.includes('tag') || lo.includes('narc') ||
    lo.includes('inarc') || lo.includes('artemis');
}

// Count unresolved def equip across ALL units
const unresolvedDefEquip = new Map<string, { count: number; unitCount: number; units: string[] }>();

for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;

  const seenInUnit = new Set<string>();

  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(armored\)/gi, '').trim();
      const lo = clean.toLowerCase();

      if (isDefEquip(lo)) {
        const res = resolveEquipmentBV(clean);
        if (!res.resolved || res.battleValue === 0) {
          const key = clean;
          if (!unresolvedDefEquip.has(key)) {
            unresolvedDefEquip.set(key, { count: 0, unitCount: 0, units: [] });
          }
          const entry = unresolvedDefEquip.get(key)!;
          entry.count++;
          if (!seenInUnit.has(key)) {
            entry.unitCount++;
            if (entry.units.length < 5) entry.units.push(u.unitId);
            seenInUnit.add(key);
          }
        }
      }
    }
  }
}

console.log('=== UNRESOLVED DEFENSIVE EQUIPMENT (sorted by unit count) ===');
const sorted = [...unresolvedDefEquip.entries()].sort((a, b) => b[1].unitCount - a[1].unitCount);
for (const [name, info] of sorted) {
  console.log(`  ${name.padEnd(50)} slots=${String(info.count).padStart(4)} units=${String(info.unitCount).padStart(4)} ex: ${info.units.slice(0, 3).join(', ')}`);
}

// Also check: unresolved OFFENSIVE equipment (weapons in equipment array that don't resolve)
console.log('\n=== UNRESOLVED WEAPONS IN EQUIPMENT ARRAY ===');
const unresolvedWeapons = new Map<string, { count: number; units: string[] }>();

for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  for (const eq of (unit.equipment || [])) {
    if (isDefEquip(eq.id)) continue;
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) {
      const key = eq.id;
      if (!unresolvedWeapons.has(key)) {
        unresolvedWeapons.set(key, { count: 0, units: [] });
      }
      const entry = unresolvedWeapons.get(key)!;
      entry.count++;
      if (entry.units.length < 3) entry.units.push(u.unitId);
    }
  }
}

const sortedWeap = [...unresolvedWeapons.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [name, info] of sortedWeap) {
  console.log(`  ${name.padEnd(50)} count=${String(info.count).padStart(4)} ex: ${info.units.slice(0, 3).join(', ')}`);
}

// Check what validate-bv.ts classifies as def equip from crits
console.log('\n=== ALL CRIT SLOT DEF EQUIP NAMES (resolved + unresolved) ===');
const allDefEquip = new Map<string, { count: number; resolved: boolean; bv: number }>();
for (const u of valid.slice(0, 200)) { // sample first 200
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (!s || typeof s !== 'string') continue;
      const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(armored\)/gi, '').trim();
      const lo = clean.toLowerCase();
      if (isDefEquip(lo)) {
        if (!allDefEquip.has(clean)) {
          const res = resolveEquipmentBV(clean);
          allDefEquip.set(clean, { count: 0, resolved: res.resolved, bv: res.battleValue });
        }
        allDefEquip.get(clean)!.count++;
      }
    }
  }
}
const sortedAll = [...allDefEquip.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [name, info] of sortedAll.slice(0, 40)) {
  const status = info.resolved ? `bv=${info.bv}` : 'UNRESOLVED';
  console.log(`  ${name.padEnd(50)} count=${String(info.count).padStart(4)} ${status}`);
}
