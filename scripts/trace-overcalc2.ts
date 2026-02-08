import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId, resolveAmmoBV } from '../src/utils/construction/equipmentBVResolver';
import { calculateOffensiveSpeedFactor, calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, getCockpitModifier } from '../src/utils/construction/battleValueCalculations';
import { EngineType } from '../src/types/construction/EngineType';

// === Trace Man O' War E ===
console.log('=== Man O\' War E: Detailed BV Trace ===');
console.log('Reference BV: 1537, Our calc: 2257, Diff: +720 (46.8%)');
console.log('');

// Equipment: heavy-medium-laser x4, atm-12, streak-srm-6, er-micro-laser x2
// Plus: Targeting Computer (from crits)
const weapons = [
  { id: 'heavy-medium-laser', name: 'Clan Heavy Medium Laser' },
  { id: 'heavy-medium-laser', name: 'Clan Heavy Medium Laser' },
  { id: 'heavy-medium-laser', name: 'Clan Heavy Medium Laser' },
  { id: 'heavy-medium-laser', name: 'Clan Heavy Medium Laser' },
  { id: 'atm-12', name: 'ATM 12' },
  { id: 'streak-srm-6', name: 'Streak SRM 6' },
  { id: 'er-micro-laser', name: 'ER Micro Laser' },
  { id: 'er-micro-laser', name: 'ER Micro Laser' },
];

console.log('Weapon BV resolution:');
let totalWeaponBV = 0;
for (const w of weapons) {
  const res = resolveEquipmentBV(w.id);
  // Also try with clan- prefix
  const clanRes = resolveEquipmentBV('clan-' + w.id);
  const best = (clanRes.resolved && clanRes.battleValue > res.battleValue) ? clanRes : res;
  console.log(`  ${w.id}: BV=${best.battleValue} heat=${best.heat} (resolved: ${best.resolved})`);
  totalWeaponBV += best.battleValue;
}
console.log('Total weapon BV (before modifiers):', totalWeaponBV);
console.log('');

// Speed factor: walk=5, run=ceil(5*1.5)=8, jump=0
// runMP + round(jumpMP/2) = 8 + 0 = 8
const speedFactor = calculateOffensiveSpeedFactor(8, 0);
console.log('Speed factor (walk=5, run=8, jump=0):', speedFactor);

// Now trace Gladiator A
console.log('');
console.log('=== Gladiator A: Detailed BV Trace ===');
console.log('Reference BV: 2194, Our calc: 3108, Diff: +914 (41.7%)');
console.log('Has MASC: true (walk=4, MASC run = 4*2 = 8)');
console.log('Jump: 4');
console.log('');

const gladWeapons = [
  { id: 'large-pulse-laser', name: 'Clan LPL' },
  { id: 'large-pulse-laser', name: 'Clan LPL' },
  { id: 'large-pulse-laser', name: 'Clan LPL' },
  { id: 'er-medium-laser', name: 'Clan ERML' },
  { id: 'er-medium-laser', name: 'Clan ERML' },
  { id: 'er-medium-laser', name: 'Clan ERML' },
  { id: 'er-medium-laser', name: 'Clan ERML' },
  { id: 'machine-gun', name: 'Clan MG' },
  { id: 'machine-gun', name: 'Clan MG' },
];

console.log('Gladiator A Weapon BV resolution:');
let gladTotalWeaponBV = 0;
for (const w of gladWeapons) {
  const res = resolveEquipmentBV(w.id);
  const clanRes = resolveEquipmentBV('clan-' + w.id);
  const best = (clanRes.resolved && clanRes.battleValue > res.battleValue) ? clanRes : res;
  console.log(`  ${w.id}: BV=${best.battleValue} heat=${best.heat}`);
  gladTotalWeaponBV += best.battleValue;
}
console.log('Total weapon BV (before modifiers):', gladTotalWeaponBV);

// Gladiator A speed: walk=4, MASC run=8, jump=4
// mp = runMP + round(jumpMP/2) = 8 + round(4/2) = 8 + 2 = 10
const gladSpeedFactor = calculateOffensiveSpeedFactor(8, 4);
console.log('Speed factor (run=8, jump=4):', gladSpeedFactor);
console.log('');

// === Trace Jenner JR7-D (Webster) ===
console.log('=== Jenner JR7-D Webster: Detailed BV Trace ===');
console.log('Reference BV: 930, Our calc: 1085, Diff: +155 (16.7%)');
console.log('6x Medium Laser, walk=7, jump=7, no TC/MASC');
console.log('');

const jennerWeapons = [
  { id: 'medium-laser', name: 'Medium Laser' },
  { id: 'medium-laser', name: 'Medium Laser' },
  { id: 'medium-laser', name: 'Medium Laser' },
  { id: 'medium-laser', name: 'Medium Laser' },
  { id: 'medium-laser', name: 'Medium Laser' },
  { id: 'medium-laser', name: 'Medium Laser' },
];

let jennerWeaponBV = 0;
for (const w of jennerWeapons) {
  const res = resolveEquipmentBV(w.id);
  console.log(`  ${w.id}: BV=${res.battleValue} heat=${res.heat}`);
  jennerWeaponBV += res.battleValue;
}
console.log('Total weapon BV:', jennerWeaponBV);

// Jenner: walk=7, run=ceil(7*1.5)=11, jump=7
// Speed factor: mp = 11 + round(7/2) = 11 + 4 = 15
const jennerSpeedFactor = calculateOffensiveSpeedFactor(11, 7);
console.log('Speed factor (run=11, jump=7):', jennerSpeedFactor);
console.log('');

// === Hatamoto-Chi ===
console.log('=== Hatamoto-Chi HTM-27T Lowenbrau ===');
console.log('Reference BV: 1584, Our calc: 1865, Diff: +281 (17.7%)');
console.log('Has MASC: YES, walk=4, run=4*2=8 (MASC), jump=0');
console.log('2x PPC, 2x SRM-6');
console.log('');

const hatWeapons = [
  { id: 'ppc', name: 'PPC' },
  { id: 'ppc', name: 'PPC' },
  { id: 'srm-6', name: 'SRM 6' },
  { id: 'srm-6', name: 'SRM 6' },
];

let hatWeaponBV = 0;
for (const w of hatWeapons) {
  const res = resolveEquipmentBV(w.id);
  console.log(`  ${w.id}: BV=${res.battleValue} heat=${res.heat}`);
  hatWeaponBV += res.battleValue;
}
console.log('Total weapon BV:', hatWeaponBV);

// Hatamoto: walk=4, MASC run=8, jump=0
// Speed: mp = 8 + 0 = 8
const hatSpeedFactor = calculateOffensiveSpeedFactor(8, 0);
console.log('Speed factor (run=8, jump=0):', hatSpeedFactor);
console.log('');

// === Battle Cobra BTL-C-2OC ===
console.log('=== Battle Cobra BTL-C-2OC ===');
console.log('Reference BV: 726, Our calc: 823, Diff: +97 (13.4%)');
console.log('2x iNarc, walk=5, run=8, no TC/MASC');
console.log('');

const bcWeapons = [
  { id: 'inarc', name: 'iNarc' },
  { id: 'inarc', name: 'iNarc' },
];

for (const w of bcWeapons) {
  const res = resolveEquipmentBV(w.id);
  const clanRes = resolveEquipmentBV('clan-' + w.id);
  console.log(`  ${w.id}: IS BV=${res.battleValue} Clan BV=${clanRes.battleValue}`);
}

console.log('');
console.log('=== ANALYSIS SUMMARY ===');
console.log('');
console.log('Looking at weapon BV totals vs reported breakdown...');
console.log('Man O\' War E: weapons add up to', totalWeaponBV, 'breakdown shows weaponBV=727.5');
console.log('Gladiator A: weapons add up to', gladTotalWeaponBV, 'breakdown shows weaponBV=1129');
console.log('Jenner JR7-D: weapons add up to', jennerWeaponBV, 'breakdown shows weaponBV=276');
console.log('Hatamoto: weapons add up to', hatWeaponBV, 'breakdown shows weaponBV=470');
