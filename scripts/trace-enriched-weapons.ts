/**
 * Trace weapon BV resolution for weapon types enriched in undercalculated units:
 * iATM, HAG, ultra-AC, improved heavy lasers, ER large lasers
 * Also check Barghest series (no-ammo, large gap)
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Check weapon resolution for key weapon IDs
console.log('=== WEAPON RESOLUTION CHECK ===');
const weaponIds = [
  // iATM variants
  'iatm-3', 'iatm-6', 'iatm-9', 'iatm-12',
  'clan-iatm-3', 'clan-iatm-6', 'clan-iatm-9', 'clan-iatm-12',
  // HAG variants
  'hag-20', 'hag-30', 'hag-40',
  'clan-hag-20', 'clan-hag-30', 'clan-hag-40',
  // Ultra AC variants (IS and Clan)
  'ultra-ac-2', 'ultra-ac-5', 'ultra-ac-10', 'ultra-ac-20',
  'clan-ultra-ac-2', 'clan-ultra-ac-5', 'clan-ultra-ac-10', 'clan-ultra-ac-20',
  // Improved heavy lasers
  'improved-heavy-medium-laser', 'improved-heavy-large-laser', 'improved-heavy-small-laser',
  'clan-improved-heavy-medium-laser', 'clan-improved-heavy-large-laser', 'clan-improved-heavy-small-laser',
  // ER Large Laser (IS vs Clan — different BV!)
  'er-large-laser', 'clan-er-large-laser',
  'is-er-large-laser',
  // Light TAG
  'light-tag', 'clan-light-tag', 'is-light-tag',
  // Barghest weapons
  'heavy-gauss-rifle', 'er-large-laser',
];

for (const wid of weaponIds) {
  const res = resolveEquipmentBV(wid);
  console.log(`  ${wid.padEnd(45)} → bv=${res.battleValue.toString().padStart(4)} heat=${res.heat.toString().padStart(2)} ${res.resolved ? 'OK' : '*** UNRESOLVED ***'}`);
}

// MegaMek reference BV values for verification
console.log('\n=== MEGAMEK REFERENCE VALUES (from TechManual/TRO) ===');
const megamekRef: Record<string, { bv: number; heat: number }> = {
  // iATM (Clan-only weapon, improved ATM)
  'iatm-3': { bv: 66, heat: 3 },
  'iatm-6': { bv: 132, heat: 4 },
  'iatm-9': { bv: 198, heat: 6 },
  'iatm-12': { bv: 252, heat: 8 },
  // HAG (Clan-only weapon)
  'hag-20': { bv: 267, heat: 4 },
  'hag-30': { bv: 401, heat: 6 },
  'hag-40': { bv: 535, heat: 8 },
  // Ultra AC (IS values)
  'is-ultra-ac-2': { bv: 56, heat: 1 },
  'is-ultra-ac-5': { bv: 112, heat: 1 },
  'is-ultra-ac-10': { bv: 210, heat: 4 },
  'is-ultra-ac-20': { bv: 281, heat: 8 },
  // Ultra AC (Clan values — higher!)
  'clan-ultra-ac-2': { bv: 62, heat: 1 },
  'clan-ultra-ac-5': { bv: 122, heat: 1 },
  'clan-ultra-ac-10': { bv: 234, heat: 3 },
  'clan-ultra-ac-20': { bv: 335, heat: 7 },
  // ER Large Laser
  'is-er-large-laser': { bv: 163, heat: 12 },
  'clan-er-large-laser': { bv: 248, heat: 12 },
  // Improved Heavy Lasers (IS only)
  'improved-heavy-small-laser': { bv: 15, heat: 3 },
  'improved-heavy-medium-laser': { bv: 76, heat: 7 },
  'improved-heavy-large-laser': { bv: 296, heat: 18 },
};
for (const [wid, ref] of Object.entries(megamekRef)) {
  const res = resolveEquipmentBV(wid);
  const bvMatch = res.battleValue === ref.bv ? 'OK' : `MISMATCH (got ${res.battleValue})`;
  const heatMatch = res.heat === ref.heat ? 'OK' : `MISMATCH (got ${res.heat})`;
  console.log(`  ${wid.padEnd(35)} ref bv=${ref.bv} ${bvMatch}, ref heat=${ref.heat} ${heatMatch}`);
}

// Deep trace specific undercalculated units
console.log('\n=== BARGHEST BGS-1T DETAILED TRACE ===');
const bgs1t = loadUnit('barghest-bgs-1t');
if (bgs1t) {
  console.log(`  TechBase: ${bgs1t.techBase}, Tonnage: ${bgs1t.tonnage}`);
  console.log('  Equipment:');
  for (const eq of bgs1t.equipment) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`    ${eq.id.padEnd(40)} @${eq.location.padEnd(5)} → bv=${res.battleValue} heat=${res.heat} ${res.resolved ? '' : 'UNRESOLVED'}`);
  }
  console.log('\n  CritSlots:');
  for (const [loc, slots] of Object.entries(bgs1t.criticalSlots || {})) {
    const items = (slots as any[]).filter(s => s && typeof s === 'string');
    if (items.length > 0) console.log(`    ${loc}: ${items.join(', ')}`);
  }
}

console.log('\n=== ENFIELD END-6J-EC DETAILED TRACE ===');
const enfield = loadUnit('enfield-end-6j-ec');
if (enfield) {
  console.log(`  TechBase: ${enfield.techBase}, Tonnage: ${enfield.tonnage}`);
  console.log('  Equipment:');
  for (const eq of enfield.equipment) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`    ${eq.id.padEnd(40)} @${eq.location.padEnd(5)} → bv=${res.battleValue} heat=${res.heat} ${res.resolved ? '' : 'UNRESOLVED'}`);
  }
}

// Check a specific Cephalus variant (MIXED tech, common undercalc pattern)
console.log('\n=== CEPHALUS-D DETAILED TRACE ===');
const cephD = loadUnit('cephalus-d');
if (cephD) {
  console.log(`  TechBase: ${cephD.techBase}, Tonnage: ${cephD.tonnage}`);
  console.log('  Equipment:');
  for (const eq of cephD.equipment) {
    const res = resolveEquipmentBV(eq.id);
    // Also try clan prefix
    const clanRes = resolveEquipmentBV('clan-' + eq.id.replace(/^\d+-/, '').toLowerCase());
    console.log(`    ${eq.id.padEnd(40)} @${eq.location.padEnd(5)} → bv=${res.battleValue} heat=${res.heat} ${res.resolved ? '' : 'UNRESOLVED'}  (clan: bv=${clanRes.battleValue})`);
  }
  console.log('\n  CritSlots:');
  for (const [loc, slots] of Object.entries(cephD.criticalSlots || {})) {
    const items = (slots as any[]).filter(s => s && typeof s === 'string');
    if (items.length > 0) console.log(`    ${loc}: ${items.join(', ')}`);
  }
}

// Also check the Beowulf BEO-X-7A (no ammo, 68 BV gap, 31.2% of weapon BV)
console.log('\n=== BEOWULF BEO-X-7A DETAILED TRACE ===');
const beo = loadUnit('beowulf-beo-x-7a');
if (beo) {
  console.log(`  TechBase: ${beo.techBase}, Tonnage: ${beo.tonnage}`);
  console.log('  Equipment:');
  for (const eq of beo.equipment) {
    const res = resolveEquipmentBV(eq.id);
    const clanRes = resolveEquipmentBV('clan-' + eq.id.replace(/^\d+-/, '').toLowerCase());
    console.log(`    ${eq.id.padEnd(40)} @${eq.location.padEnd(5)} → bv=${res.battleValue} heat=${res.heat} ${res.resolved ? '' : 'UNRESOLVED'}  (clan: bv=${clanRes.battleValue})`);
  }
  console.log('\n  CritSlots:');
  for (const [loc, slots] of Object.entries(beo.criticalSlots || {})) {
    const items = (slots as any[]).filter(s => s && typeof s === 'string');
    if (items.length > 0) console.log(`    ${loc}: ${items.join(', ')}`);
  }
}
