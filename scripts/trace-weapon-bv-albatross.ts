/**
 * Trace weapon BV resolution for Albatross ALB-5U.
 * Check each weapon's resolved BV against MegaMek expected values.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

// Expected MegaMek BV values for these weapons (from MegaMek data files):
const megamekWeaponBV: Record<string, number> = {
  'ISRotaryAC2': 118,
  'ISLargeXPulseLaser': 178,
  'ISERMediumLaser': 62,
  'ISERSmallLaser': 17,
  'ISMML7': 71,
};

console.log("=== WEAPON BV RESOLUTION TRACE: ALBATROSS ALB-5U ===\n");

const weapons = [
  { id: 'ISRotaryAC2', count: 1 },
  { id: 'ISLargeXPulseLaser', count: 1 },
  { id: 'ISERMediumLaser', count: 2 },
  { id: 'ISERSmallLaser', count: 1 },
  { id: 'ISMML7', count: 1 },
];

let totalOurBV = 0;
let totalExpectedBV = 0;

for (const w of weapons) {
  const result = resolveEquipmentBV(w.id);
  const ourBV = result.battleValue;
  const expectedBV = megamekWeaponBV[w.id] ?? 0;
  const diff = ourBV - expectedBV;

  totalOurBV += ourBV * w.count;
  totalExpectedBV += expectedBV * w.count;

  console.log(`${w.id} (x${w.count}):`);
  console.log(`  Our BV: ${ourBV}, Expected: ${expectedBV}, Diff: ${diff > 0 ? '+' : ''}${diff}`);
  console.log(`  Resolved: ${result.resolved}, Source: ${result.equipmentId || 'UNRESOLVED'}`);
}

console.log(`\nTotal our weapon BV: ${totalOurBV}`);
console.log(`Total expected weapon BV: ${totalExpectedBV}`);
console.log(`Weapon BV gap: ${totalOurBV - totalExpectedBV}`);

// Also check ammo resolution
console.log("\n=== AMMO BV RESOLUTION ===\n");

const ammoItems = [
  'IS Ammo MML-7 SRM',
  'IS Ammo MML-7 LRM',
  'ISRotaryAC2 Ammo',
];

for (const ammo of ammoItems) {
  const result = resolveEquipmentBV(ammo);
  console.log(`${ammo}: BV=${result.battleValue}, resolved=${result.resolved}, id=${result.equipmentId || 'UNRESOLVED'}`);
}

// Weight bonus check
console.log("\n=== WEIGHT BONUS ===\n");
console.log("Tonnage: 95");
console.log("Expected weight bonus (tonnage/2 rounded down): " + Math.floor(95/2));
console.log("Formula: adjustedWeight = max(tonnage, unitBV/10)");
console.log("For BV ~1885, adjustedWeight = max(95, 188.5) = 188.5");
console.log("Weight bonus = tonnage/2 (standard formula) = " + Math.floor(95/2));

// Also try some alternate IDs for the weapons
console.log("\n=== ALTERNATE ID RESOLUTION ===\n");

const alternateIds = [
  'rotary-ac-2', 'is-rotary-ac-2', 'rotary-ac/2',
  'large-x-pulse-laser', 'is-large-x-pulse-laser',
  'er-medium-laser', 'is-er-medium-laser',
  'er-small-laser', 'is-er-small-laser',
  'mml-7', 'is-mml-7', 'mml7',
];

for (const id of alternateIds) {
  const result = resolveEquipmentBV(id);
  if (result.resolved) {
    console.log(`${id}: BV=${result.battleValue}, source=${result.equipmentId}`);
  } else {
    console.log(`${id}: UNRESOLVED`);
  }
}
