/**
 * validate-v2-logic.ts
 * Validates the logic of the v2 Mech Lab state management and mechanics.
 * This simulates user actions in the UI to ensure the backend logic holds up.
 * 
 * Run with: npx tsx src-v2/validate-v2-logic.ts
 */

import { TechBase, RulesLevel } from './types/TechBase';
import { StructureType, EngineType, GyroType, CockpitType, ArmorType } from './types/SystemComponents';
import { StructureMechanics } from './mechanics/Structure';
import { EngineMechanics } from './mechanics/Engine';
import { CriticalSlotMechanics, MechLocation } from './mechanics/CriticalSlots';
import { MechValidator } from './mechanics/Validation';
import { WEAPONS_DB } from './data/weapons';
import { IMechLabState, DEFAULT_MECH_STATE } from './features/mech-lab/store/MechLabState';

console.log('=== Validating v2 Mech Lab Logic ===');

// 1. Initial State
let state: IMechLabState = {
  ...DEFAULT_MECH_STATE,
  tonnage: 55, // Medium Mech (Griffin/Shadow Hawk size)
  walkingMP: 5,
  techBase: TechBase.INNER_SPHERE,
};

console.log(`Unit: ${state.tonnage} Ton IS Mech`);

// 2. Calculate Core Systems
const engineRating = EngineMechanics.calculateRating(state.tonnage, state.walkingMP); // 55 * 5 = 275
const engineWeight = EngineMechanics.calculateWeight(engineRating, EngineType.STANDARD);
const structureWeight = StructureMechanics.calculateWeight(state.tonnage, StructureType.STANDARD);
const gyroWeight = 3.0; // Standard Gyro for 275 engine (300/100 rounded up = 3)
const cockpitWeight = 3.0;

console.log(`Engine Rating: ${engineRating} (Expected 275)`);
console.log(`Engine Weight: ${engineWeight} (Expected 15.5)`); // 275 is between 270 (14.5) and 280 (16.0). Interpolated or lookup? 
// Our table has 270->14.5, 280->16.0.
// 275 is exactly half way. Usually 15.5? 
// Let's see what our table says.

const currentWeight = structureWeight + engineWeight + gyroWeight + cockpitWeight;
console.log(`Base Weight: ${currentWeight} tons`);

// 3. Add Equipment (Simulate Store Action)
const mediumLaser = WEAPONS_DB.find(w => w.name === 'Medium Laser');
const lrm10 = WEAPONS_DB.find(w => w.name === 'LRM 10');

if (!mediumLaser || !lrm10) throw new Error("Weapons not found in DB");

state.equipment = [
  { id: 'ml_1', equipmentId: mediumLaser.id, location: 'unallocated', slotIndex: -1, count: 1 },
  { id: 'lrm_1', equipmentId: lrm10.id, location: 'unallocated', slotIndex: -1, count: 1 }
];

const equipmentWeight = mediumLaser.weight + lrm10.weight;
console.log(`Equipment Weight: ${equipmentWeight} tons (1.0 + 5.0 = 6.0)`);

// 4. Critical Slot Placement Logic
console.log('\nTesting Critical Slot Placement...');

// Generate Layout
const layout = CriticalSlotMechanics.generateBaseLayout(
  state.techBase,
  state.engineType,
  state.gyroType,
  state.cockpitType
);

// Try to place LRM 10 in Right Torso (needs 2 slots)
// RT has 12 slots. 1-12 free? No, usually empty.
// Check standard layout.
const rt = layout[MechLocation.RIGHT_TORSO];
const canPlaceLRM = CriticalSlotMechanics.canPlaceEquipment(layout, MechLocation.RIGHT_TORSO, 1, lrm10.id);

if (canPlaceLRM) {
  console.log('✅ Can place LRM 10 in RT Slot 1');
} else {
  console.error('❌ Failed to validate LRM placement');
}

// Try to place in Head (only 1 free slot usually? No, Head has 6 slots, 1,2,3,4,5 taken. Slot 6 free.)
// LRM 10 needs 2 slots. Should fail.
const canPlaceLRMHead = CriticalSlotMechanics.canPlaceEquipment(layout, MechLocation.HEAD, 6, lrm10.id);
if (!canPlaceLRMHead) {
  console.log('✅ Correctly rejected LRM 10 in Head (insufficient slots)');
} else {
  console.error('❌ Incorrectly allowed LRM 10 in Head');
}

// Try to place Medium Laser in Head (1 slot). Should pass.
const canPlaceMLHead = CriticalSlotMechanics.canPlaceEquipment(layout, MechLocation.HEAD, 6, mediumLaser.id);
if (canPlaceMLHead) {
  console.log('✅ Can place Medium Laser in Head Slot 6');
} else {
  console.error('❌ Failed to validate ML placement in Head');
}

// 5. Validation Logic
console.log('\nTesting Validation...');
const totalWeight = currentWeight + equipmentWeight;
const validation = MechValidator.validate(state, totalWeight);

if (validation.isValid) {
  console.log(`✅ Unit Valid (Weight: ${totalWeight}/${state.tonnage})`);
} else {
  console.log(`⚠️ Unit Invalid: ${validation.errors.join(', ')}`);
}

// Test Overweight
const heavyWeight = totalWeight + 50;
const overValidation = MechValidator.validate(state, heavyWeight);
if (!overValidation.isValid && overValidation.errors[0].includes('overweight')) {
  console.log('✅ Correctly detected overweight condition');
} else {
  console.error('❌ Failed to detect overweight');
}

console.log('\n=== Validation Complete ===');

