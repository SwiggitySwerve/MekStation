/**
 * Full weapon BV trace for Albatross ALB-5U using the actual validation pipeline.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  calculateOffensiveBVWithHeatTracking,
  calculateOffensiveSpeedFactor,
  calculateAmmoBVWithExcessiveCap,
} from '../src/utils/construction/battleValueCalculations';

// Load the unit
const unitsDir = 'E:/Projects/MekStation/public/data/units/battlemechs';
const idx = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const u = idx.units.find((x: any) => x.id === 'albatross-alb-5u');
if (!u) { console.log('Unit not found'); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.join(unitsDir, u.path), 'utf-8'));

console.log(`=== Albatross ALB-5U (${unit.tonnage}t, ${unit.techBase}) ===\n`);

// Weapons as the validation script would build them:
const weapons = [
  { id: 'ISRotaryAC2', name: 'Rotary AC/2', heat: 1, bv: 118, rear: false, isDirectFire: true },
  { id: 'ISLargeXPulseLaser', name: 'Large X-Pulse Laser', heat: 14, bv: 178, rear: false, isDirectFire: true },
  { id: 'ISERMediumLaser', name: 'ER Medium Laser', heat: 5, bv: 62, rear: false, isDirectFire: true },
  { id: 'ISERMediumLaser', name: 'ER Medium Laser', heat: 5, bv: 62, rear: false, isDirectFire: true },
  { id: 'ISERSmallLaser', name: 'ER Small Laser', heat: 2, bv: 17, rear: false, isDirectFire: true },
  { id: 'ISMML7', name: 'MML-7', heat: 4, bv: 67, rear: false, isDirectFire: false },
];

const ammo = [
  { id: 'IS Ammo MML-7 SRM', bv: 9, weaponType: 'mml7' },
  { id: 'IS Ammo MML-7 LRM', bv: 6, weaponType: 'mml7' },
  { id: 'ISRotaryAC2 Ammo', bv: 16, weaponType: 'rotaryac2' },
];

// Heat sinks: 13 DHS = 26 heat diss
const heatDiss = 26;
const walkMP = 4;
const runMP = Math.ceil(walkMP * 1.5); // 6
const jumpMP = 0;

console.log("Weapons:");
for (const w of weapons) {
  console.log(`  ${w.name}: BV=${w.bv}, Heat=${w.heat}`);
}
console.log(`\nAmmo:`);
for (const a of ammo) {
  console.log(`  ${a.id}: BV=${a.bv}, type=${a.weaponType}`);
}

console.log(`\nHeat dissipation: ${heatDiss}`);
console.log(`Walk=${walkMP}, Run=${runMP}, Jump=${jumpMP}`);

// Call the actual offensive BV function
const result = calculateOffensiveBVWithHeatTracking({
  weapons,
  ammo,
  tonnage: unit.tonnage,
  walkMP,
  runMP,
  jumpMP,
  umuMP: 0,
  heatDissipation: heatDiss,
  hasTargetingComputer: false,
  hasTSM: false,
  hasStealthArmor: false,
  hasNullSig: false,
  hasVoidSig: false,
  hasChameleonShield: false,
  physicalWeaponBV: 0,
  offensiveEquipmentBV: 0,
});

console.log(`\n=== RESULT ===`);
console.log(`WeaponBV (after heat): ${result.weaponBV.toFixed(2)}`);
console.log(`AmmoBV: ${result.ammoBV.toFixed(2)}`);
console.log(`WeightBonus: ${result.weightBonus.toFixed(2)}`);
console.log(`SpeedFactor: ${result.speedFactor.toFixed(4)}`);
console.log(`Total OffBV: ${result.totalOffensiveBV.toFixed(2)}`);
console.log(`BaseOff (before speed): ${(result.weaponBV + result.ammoBV + result.weightBonus).toFixed(2)}`);

// Check what the MML-7 BV should be according to MegaMek
console.log(`\n=== MML-7 BV INVESTIGATION ===`);
console.log(`Our MML-7 BV: 67`);
console.log(`MegaMek MML-7 BV: 71 (from MegaMek equipment files)`);
console.log(`MML-7 fires: LRM-7 (at long range) or SRM-7 (at short range)`);
console.log(`BV convention: uses the higher of LRM and SRM BV modes`);

// Check: what would happen if MML-7 was 71?
const weapons71 = weapons.map(w => w.id === 'ISMML7' ? { ...w, bv: 71 } : w);
const result71 = calculateOffensiveBVWithHeatTracking({
  weapons: weapons71,
  ammo,
  tonnage: unit.tonnage,
  walkMP,
  runMP,
  jumpMP,
  umuMP: 0,
  heatDissipation: heatDiss,
  hasTargetingComputer: false,
  hasTSM: false,
  hasStealthArmor: false,
  hasNullSig: false,
  hasVoidSig: false,
  hasChameleonShield: false,
  physicalWeaponBV: 0,
  offensiveEquipmentBV: 0,
});

console.log(`\nWith MML-7=71: WeaponBV=${result71.weaponBV.toFixed(2)}, TotalOff=${result71.totalOffensiveBV.toFixed(2)}`);
console.log(`Diff from index: Index=1885, Calc=${Math.round(1131.75 + result71.totalOffensiveBV)}, Gap=${1885 - Math.round(1131.75 + result71.totalOffensiveBV)}`);

// Check Rotary AC/2 heat - MegaMek uses heat 1 per shot, 6 shots = 6 heat
console.log(`\n=== ROTARY AC/2 HEAT CHECK ===`);
console.log(`Our heat: 1 (per shot? or per volley?)`);
console.log(`MegaMek: Rotary AC/2 heat = 1 (per weapon in BV calc)`);
console.log(`But in actual gameplay, it fires 1-6 shots generating 1 heat per shot`);
console.log(`For BV: MegaMek uses the WEAPON heat value, which is 1 for RAC/2`);
