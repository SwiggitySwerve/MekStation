/**
 * Trace TC (Targeting Computer) units that are outside 1% to find
 * why TC BV isn't being applied correctly.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);

// Find TC units that are undercalculated
const tcUnder: any[] = [];
for (const u of valid) {
  if (u.percentDiff >= -1) continue;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasTC = (unit.equipment || []).some((eq: any) => {
    const id = eq.id.toLowerCase();
    return id.includes('targeting-computer') || id === 'istc' || id === 'cltc';
  }) || (unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      s.toLowerCase().includes('targeting computer'))
  ));
  if (hasTC) tcUnder.push({ ...u, unit });
}

console.log(`=== TC UNDERCALCULATED UNITS: ${tcUnder.length} ===\n`);
const sorted = [...tcUnder].sort((a: any, b: any) => a.difference - b.difference);

for (const u of sorted.slice(0, 15)) {
  const unit = u.unit;
  const b = u.breakdown;
  console.log(`${'='.repeat(70)}`);
  console.log(`${u.unitId} (${unit.techBase}, ${unit.tonnage}t) ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  offBV=${b?.offensiveBV?.toFixed(0)} defBV=${b?.defensiveBV?.toFixed(0)} SF=${b?.speedFactor} cockpit=${b?.cockpitModifier}`);
  console.log(`  weapBV=${b?.weaponBV?.toFixed(0)} ammoBV=${b?.ammoBV} physBV=${b?.physicalWeaponBV?.toFixed(0)} offEquip=${b?.offEquipBV}`);
  console.log(`  hasTC in breakdown: ${b?.hasTargetingComputer}`);

  // List weapons
  console.log(`  EQUIPMENT:`);
  for (const eq of unit.equipment || []) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`    ${eq.id.padEnd(40)} @${eq.location.padEnd(12)} bv=${res.battleValue} heat=${res.heat} type=${res.type}`);
  }

  // Check TC in crits
  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === 'string' && (s as string).toLowerCase().includes('targeting computer')) {
          console.log(`  TC in crits: [${loc}] ${s}`);
        }
      }
    }
  }

  // Compute what we'd need
  const cockpit = b?.cockpitModifier ?? 1;
  const neededTotal = u.indexBV / cockpit;
  const neededOff = neededTotal - (b?.defensiveBV ?? 0);
  const offGap = neededOff - (b?.offensiveBV ?? 0);
  console.log(`  Needed offBV: ${neededOff.toFixed(0)}, gap: ${offGap.toFixed(0)}`);
  console.log('');
}

// Check overcalculated TC units too
console.log('\n=== TC OVERCALCULATED UNITS ===');
const tcOver: any[] = [];
for (const u of valid) {
  if (u.percentDiff <= 1) continue;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasTC = (unit.equipment || []).some((eq: any) => {
    const id = eq.id.toLowerCase();
    return id.includes('targeting-computer') || id === 'istc' || id === 'cltc';
  }) || (unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      s.toLowerCase().includes('targeting computer'))
  ));
  if (hasTC) tcOver.push({ ...u, unit });
}

const sortedOver = [...tcOver].sort((a: any, b: any) => b.difference - a.difference);
for (const u of sortedOver.slice(0, 10)) {
  const b = u.breakdown;
  console.log(`  ${u.unitId.padEnd(40)} diff=+${u.difference} (+${u.percentDiff.toFixed(1)}%) hasTC=${b?.hasTargetingComputer}`);
}
