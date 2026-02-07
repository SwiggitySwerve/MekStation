#!/usr/bin/env npx tsx
/**
 * For the Boreas A, trace the complete offensive BV calculation.
 * Especially check ammo BV resolution.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  resolveEquipmentBV,
  resolveAmmoBV,
  normalizeEquipmentId,
} from '../src/utils/construction/equipmentBVResolver';

// Boreas A equipment from unit data:
// Equipment: hag-20 @ RIGHT_TORSO
// Crits: CLHAG20 x6, HAG/20 Ammo x2

// Check weapon resolution
const hag20 = resolveEquipmentBV('hag-20');
console.log('HAG-20 resolution:', JSON.stringify(hag20));

const clanHag20 = resolveEquipmentBV('clan-hag-20');
console.log('Clan HAG-20 resolution:', JSON.stringify(clanHag20));

const clhag20 = resolveEquipmentBV('clhag20');
console.log('CLHAG20 resolution:', JSON.stringify(clhag20));

// Check ammo resolution
const hagAmmo = resolveAmmoBV('hag-20-ammo');
console.log('\nHAG-20 Ammo resolution:', JSON.stringify(hagAmmo));

const hagAmmo2 = resolveAmmoBV('clan-hag-20-ammo');
console.log('Clan HAG-20 Ammo resolution:', JSON.stringify(hagAmmo2));

const hagAmmo3 = resolveAmmoBV('hag/20-ammo');
console.log('HAG/20 Ammo resolution:', JSON.stringify(hagAmmo3));

// Now check the validation report for Boreas A specifically
const reportPath = path.resolve('validation-output/bv-validation-report.json');
let report: any;
try { report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')); } catch { process.exit(1); }

const boreas = report.allResults.filter((r: any) => r.chassis === 'Boreas');
for (const r of boreas) {
  console.log(`\n--- ${r.chassis} ${r.model} ---`);
  console.log(`  Index BV: ${r.indexBV}, Calculated BV: ${r.calculatedBV}, Diff: ${r.difference}`);
  if (r.breakdown) {
    console.log(`  Defensive BV: ${r.breakdown.defensiveBV.toFixed(1)}`);
    console.log(`  Offensive BV: ${r.breakdown.offensiveBV.toFixed(1)}`);
    console.log(`  Weapon BV: ${r.breakdown.weaponBV.toFixed(1)}`);
    console.log(`  Ammo BV: ${r.breakdown.ammoBV.toFixed(1)}`);
    console.log(`  Speed Factor: ${r.breakdown.speedFactor}`);
    console.log(`  Explosive Penalty: ${r.breakdown.explosivePenalty}`);
    console.log(`  Def Equip BV: ${r.breakdown.defensiveEquipBV}`);
  }
  if (r.issues?.length > 0) {
    console.log(`  Issues: ${r.issues.join('; ')}`);
  }
}

// Also check some other units
const checkNames = ['Atlas AS8-KE', 'Goliath C', 'Hauptmann HA1-OT', 'Ostsol OTL-9R'];
for (const name of checkNames) {
  const r = report.allResults.find((r: any) => `${r.chassis} ${r.model}` === name);
  if (r) {
    console.log(`\n--- ${r.chassis} ${r.model} ---`);
    console.log(`  Index BV: ${r.indexBV}, Calculated BV: ${r.calculatedBV}, Diff: ${r.difference}`);
    if (r.breakdown) {
      console.log(`  Defensive BV: ${r.breakdown.defensiveBV.toFixed(1)}`);
      console.log(`  Offensive BV: ${r.breakdown.offensiveBV.toFixed(1)}`);
      console.log(`  Weapon BV: ${r.breakdown.weaponBV.toFixed(1)}`);
      console.log(`  Ammo BV: ${r.breakdown.ammoBV.toFixed(1)}`);
      console.log(`  Speed Factor: ${r.breakdown.speedFactor}`);
    }
    if (r.issues?.length > 0) {
      console.log(`  Issues: ${r.issues.join('; ')}`);
    }
  }
}

// Also verify: for Boreas A, what should MegaMek BV be?
// HAG-20 Clan: BV = 267 (from catalog)
// HAG/20 Ammo: BV = 33 per ton (2 tons = 66)
// BUT: ammo cap: ammoBV capped at weaponBV = 267
// So ammoBV = min(66, 267) = 66
// Weight bonus: 60 tons = 60
// Total offensive pre-SF: 267 + 66 + 60 = 393
// SF: MP = ceil(4*1.5) + round(0/2) = 6 + 0 = 6
// SF = round(pow(1 + (6-5)/10, 1.2) * 100) / 100 = round(pow(1.1, 1.2) * 100) / 100
// = round(1.1207 * 100) / 100 = round(112.07) / 100 = 1.12
// Offensive BV = 393 * 1.12 = 440.16
console.log('\n\n=== Manual BV calc for Boreas A ===');
console.log('HAG-20 (Clan): BV=267, heat=7 (from catalog)');
console.log('HAG/20 Ammo x2: BV=33 per ton -> 66 total');
console.log('Ammo cap: min(66, 267) = 66');
console.log('Weight: 60');
console.log('Pre-SF offensive: 267 + 66 + 60 = 393');
console.log('SF: pow(1 + (6-5)/10, 1.2) = 1.12');
console.log('Offensive BV: 393 * 1.12 = 440.16');
console.log('Defensive BV: (460 + 148.5 + 30) * 1.2 = 766.2');
console.log('Total: 766.2 + 440.16 = 1206.4 -> round = 1206');
console.log('Expected (index): 1221');
console.log('Gap: 1221 - 1206 = 15');
console.log('');
console.log('But wait - heat efficiency!');
console.log('Heat capacity: 10 laser HS * 2 = 20 + 6 base = 26');
console.log('Wait, heat efficiency = 6 + heatCapacity - moveHeat');
console.log('heatCapacity = 20 (10 laser HS * 2)');
console.log('moveHeat = running heat = 2 (for run 6)');
console.log('heatEff = 6 + 20 - 2 = 24');
console.log('HAG-20 heat = 7, well under 24, no overheat');
console.log('So heat doesnt affect weapon BV');
console.log('');
console.log('The 15 BV gap divided by SF (1.12) = 13.4 pre-SF BV');
console.log('The only pre-SF offensive BV source we could be missing:');
console.log('  - Ammo BV: 33 per ton, 2 tons');
console.log('  - Could we be getting ammo BV wrong?');
