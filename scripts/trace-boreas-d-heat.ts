#!/usr/bin/env npx tsx
/**
 * Trace heat efficiency calculation for Boreas D specifically.
 * Boreas D has: 2x Clan Heavy Large Laser (heat=18 each), 14 Laser HS
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  resolveEquipmentBV,
} from '../src/utils/construction/equipmentBVResolver';

// Boreas D: 60t, Fusion 240, 14 Laser HS, 2x Clan Heavy Large Laser
// Movement: walk 4, run 6

// Check weapon heat values
const hll = resolveEquipmentBV('heavy-large-laser');
console.log('Heavy Large Laser:', JSON.stringify(hll));

const clhll = resolveEquipmentBV('clan-heavy-large-laser');
console.log('Clan Heavy Large Laser:', JSON.stringify(clhll));

const clheavylargelaser = resolveEquipmentBV('clheavylargelaser');
console.log('CLHeavyLargeLaser:', JSON.stringify(clheavylargelaser));

// MegaMek Clan Heavy Large Laser:
// BV = 244, Heat = 18
console.log('\nMegaMek reference: Clan Heavy Large Laser BV=244, heat=18');

// Heat Efficiency calculation:
// heatCapacity = 14 * 2 = 28 (14 Laser HS, each = 2 dissipation)
// moveHeat = running heat = 2
// heatEfficiency = 6 + 28 - 2 = 32
console.log('\nHeat Efficiency:');
console.log('  14 Laser HS * 2 = 28 heat dissipation');
console.log('  Running heat (run 6) = 2');
console.log('  Heat efficiency = 6 + 28 - 2 = 32');

// Weapon BV with heat tracking:
// Sort by BV: both identical (244, heat 18)
// First: cumHeat = 18, 18 < 32, full BV = 244
// Second: cumHeat = 36, 36 > 32, half BV = 122
// Total weaponBV = 244 + 122 = 366
console.log('\nWeapon BV with heat tracking:');
console.log('  1st Heavy Large Laser: cumHeat=18, <32, full BV=244');
console.log('  2nd Heavy Large Laser: cumHeat=36, >32, half BV=122');
console.log('  Expected weaponBV = 366');

// But our validation says weaponBV=488 (= 244*2)
// This means heat tracking is NOT being applied!
console.log('\nOur validation says weaponBV=488 (= 244*2)');
console.log('MISMATCH: heat tracking should give 366');
console.log('Difference: 488 - 366 = 122 (= exactly the second weapon at half BV)');

// Check what happens with the full formula:
// Pre-SF with correct heat: 366 + 0 + 60 = 426
// Offensive: 426 * 1.12 = 477.12
// Total: 766.2 + 477.12 = 1243.3 -> round 1243
// vs index 1394 -> that would INCREASE the gap!
console.log('\nWait, if heat tracking reduced weaponBV:');
console.log('  Pre-SF: 366 + 0 + 60 = 426');
console.log('  Offensive: 426 * 1.12 = 477.12');
console.log('  Total: 766.2 + 477.12 = 1243.3');
console.log('  vs index 1394 -> gap would be 151!');
console.log('  So actually we would be MORE off...');
console.log('');
console.log('Unless our heatEfficiency calc is wrong and MegaMek gets 32+ efficiency');
console.log('Let me check: maybe heat capacity for Boreas D includes engine HS');

// Actually, the Boreas D has 14 Laser HS but the Fusion 240 engine includes
// 10 integral HS. So the EXTRA HS = 14 - 10 = 4 external HS.
// But all 14 count for heat capacity.
// Actually: heatCapacity in MegaMek = entity.getHeatCapacity()
// For 14 DHS: heatCapacity = 14 * 2 = 28
// Then heatEfficiency = 6 + 28 - 2 = 32
//
// Two Clan Heavy Large Lasers: 18 heat each = 36 total
// 36 > 32, so second weapon is halved
// Unless... the extra HS in crits give more capacity?
// No, that doesn't apply - 14 DHS = 28 capacity, period.

// Wait - let me reconsider. Maybe the weapon BV of 488 IS correct and
// the validation report just doesn't track heat-halved weapons in weaponBV.
// Let me check how our code reports weaponBV...

// Actually, looking at the code, calculateOffensiveBVWithHeatTracking
// returns weaponBV which IS the post-heat-tracking value.
// So if it says 488, that means heat tracking passed all weapons at full BV.

// Let me check if there's an issue with our heat efficiency calculation.
console.log('\n=== Checking our heat efficiency calculation ===');
console.log('Engine type: Fusion 240');
console.log('Engine heat: For standard fusion, running heat = 2 (6 hexes run)');
console.log('But wait: moveHeat should be max(runHeat, jumpHeat)');
console.log('run 6 hexes = 2 heat, jump 0 = 0 heat');
console.log('moveHeat = 2');
console.log('');
console.log('Actually, let me check if our validate-bv.ts computes the right heatDissipation');
console.log('for Laser HS...');
