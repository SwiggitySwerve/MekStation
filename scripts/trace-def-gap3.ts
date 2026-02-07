#!/usr/bin/env npx tsx
/**
 * Count units affected by the front/rear weapon misassignment bug.
 * Bug: When a unit has both front and rear instances of the same weapon type
 * in the same location body area (e.g., CENTER_TORSO vs CENTER_TORSO_(R)),
 * the crit-slot-based rear detection can mark the FRONT weapon as rear,
 * because it processes equipment entries in order and the front entry
 * steals the rear count.
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function isRearLoc(l: string): boolean {
  const lo = l.toLowerCase();
  return lo.includes('rear') || lo.includes('(r)');
}

function normalizeEquipId(s: string): string {
  return s.replace(/^\d+-/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

let affected = 0;
let totalExtraPenalty = 0;
const affectedUnits: { id: string; weapons: string; penalty: number }[] = [];

for (const iu of index.units) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

    // Find weapons that appear in both front and rear at the same base location
    const weaponsByLoc = new Map<string, { front: string[]; rear: string[] }>();

    for (const eq of unit.equipment) {
      const lo = eq.id.toLowerCase();
      if (lo.includes('ammo')) continue;

      const rawLoc = eq.location.split(',')[0].toUpperCase().replace(/[_\s]*\(R\)/, '');
      const isRear = isRearLoc(eq.location);
      const eqNorm = normalizeEquipId(eq.id);

      if (!weaponsByLoc.has(rawLoc)) weaponsByLoc.set(rawLoc, { front: [], rear: [] });
      const entry = weaponsByLoc.get(rawLoc)!;
      if (isRear) entry.rear.push(eqNorm);
      else entry.front.push(eqNorm);
    }

    // Check for overlap: same normalized weapon in both front and rear at same location
    let hasOverlap = false;
    const overlappingWeapons: string[] = [];
    for (const [loc, entry] of weaponsByLoc) {
      for (const frontWeapon of entry.front) {
        // Check if any rear weapon matches via the same fuzzy logic as the validator
        for (const rearWeapon of entry.rear) {
          if (frontWeapon === rearWeapon || frontWeapon.includes(rearWeapon) || rearWeapon.includes(frontWeapon)) {
            hasOverlap = true;
            overlappingWeapons.push(`${frontWeapon}@${loc}`);
          }
        }
      }
    }

    if (hasOverlap) {
      affected++;
      // Estimate BV impact - look up this unit in the report
      const r = report.allResults.find((x: any) => x.unitId === iu.id);
      const penalty = r ? (r.indexBV - r.calculatedBV) : 0;
      totalExtraPenalty += Math.max(0, penalty);
      affectedUnits.push({ id: iu.id, weapons: overlappingWeapons.join(', '), penalty });
    }
  } catch {}
}

console.log(`Units with front/rear weapon overlap at same location: ${affected}`);
console.log(`Total estimated BV penalty: ${totalExtraPenalty}`);
console.log(`\nAffected units (first 50):`);
console.log('Unit'.padEnd(40) + 'Penalty'.padStart(8) + '  Weapons');
for (const u of affectedUnits.sort((a, b) => b.penalty - a.penalty).slice(0, 50)) {
  console.log(u.id.padEnd(40).slice(0, 40) + String(u.penalty).padStart(8) + '  ' + u.weapons);
}

// How many of the 262 undercalculated units are affected?
const undercalcIds = new Set(
  report.allResults
    .filter((r: any) => Math.abs(r.percentDiff) > 1 && Math.abs(r.percentDiff) <= 5 && r.difference < 0)
    .map((r: any) => r.unitId)
);
const overlapInUndercalc = affectedUnits.filter(u => undercalcIds.has(u.id));
console.log(`\nOf these, ${overlapInUndercalc.length} are in the undercalculated minor-disc set (${undercalcIds.size} total)`);
