/**
 * verify-v2-foundation.ts
 * Simple verification script to prove we can construct a Wasp WSP-1A programmatically.
 * Run with: npx ts-node src-v2/verify-v2-foundation.ts
 */

import { TechBase, RulesLevel } from './types/TechBase';
import { ComponentType } from './types/ComponentType';
import { EngineType, GyroType, CockpitType, StructureType, ArmorType, HeatSinkType } from './types/SystemComponents';
import { StructureMechanics } from './mechanics/Structure';
import { EngineMechanics } from './mechanics/Engine';
import { GyroMechanics } from './mechanics/Gyro';
import { ArmorMechanics } from './mechanics/Armor';

console.log('=== Verifying v2 Mech Creator Foundation ===');

// Target: Wasp WSP-1A
// Tonnage: 20
// Engine: 120 Standard (Walk 6)
// Structure: Standard
// Gyro: Standard
// Cockpit: Standard
// Heat Sinks: 10 Single
// Armor: 3.0 tons Standard

const config = {
  name: 'Wasp',
  model: 'WSP-1A',
  tonnage: 20,
  techBase: TechBase.INNER_SPHERE,
  walkingMP: 6,
};

console.log(`Building ${config.name} ${config.model} (${config.tonnage} tons)`);

// 1. Internal Structure
const structureWeight = StructureMechanics.calculateWeight(config.tonnage, StructureType.STANDARD);
const structurePoints = StructureMechanics.getPoints(config.tonnage);
console.log(`Structure: ${structureWeight} tons (${JSON.stringify(structurePoints)})`);

if (structureWeight !== 2.0) {
  console.error(`❌ Structure Weight Mismatch: Expected 2.0, got ${structureWeight}`);
} else {
  console.log('✅ Structure Weight Correct');
}

// 2. Engine
const engineRating = EngineMechanics.calculateRating(config.tonnage, config.walkingMP);
const engineWeight = EngineMechanics.calculateWeight(engineRating, EngineType.STANDARD);
console.log(`Engine: Rating ${engineRating}, Weight ${engineWeight} tons`);

if (engineRating !== 120) {
  console.error(`❌ Engine Rating Mismatch: Expected 120, got ${engineRating}`);
} else {
  console.log('✅ Engine Rating Correct');
}

if (engineWeight !== 4.0) {
  console.error(`❌ Engine Weight Mismatch: Expected 4.0, got ${engineWeight}`);
} else {
  console.log('✅ Engine Weight Correct');
}

// 3. Gyro
const gyroWeight = GyroMechanics.calculateWeight(engineRating, GyroType.STANDARD);
console.log(`Gyro: ${gyroWeight} tons`);

if (gyroWeight !== 2.0) {
  console.error(`❌ Gyro Weight Mismatch: Expected 2.0, got ${gyroWeight}`);
} else {
  console.log('✅ Gyro Weight Correct');
}

// 4. Cockpit
// Mechanics not fully implemented for Cockpit yet, assuming standard 3.0
const cockpitWeight = 3.0; 
console.log(`Cockpit: ${cockpitWeight} tons`);

// 5. Heat Sinks
const internalHS = EngineMechanics.calculateInternalHeatSinks(engineRating);
console.log(`Internal Heat Sinks: ${internalHS}`);
// Wasp needs 10 total. 
// 120 engine fits 4. 6 must be external.
// Rule: First 10 HS are free weight.
// So HS weight = 0.
// But do we have a mechanic for "Free Heat Sinks"?
// Not yet, but let's verify the count.
if (internalHS !== 4) {
  console.error(`❌ Internal HS Mismatch: Expected 4, got ${internalHS}`);
} else {
  console.log('✅ Internal HS Correct');
}

// 6. Armor
const maxArmor = ArmorMechanics.calculateMaxPoints(config.tonnage);
console.log(`Max Armor: ${maxArmor} points`);
// Wasp has 3 tons = 48 points?
const armorWeight = 3.0;
const armorPoints = armorWeight * 16;
console.log(`Armor: ${armorWeight} tons (${armorPoints} points)`);

// 7. Jump Jets
// 6 Jump Jets. 20 tons -> 0.5 ton each.
const jjWeight = 6 * 0.5;
console.log(`Jump Jets: ${jjWeight} tons`);

// 8. Total Weight Check
const totalWeight = structureWeight + engineWeight + gyroWeight + cockpitWeight + jjWeight + armorWeight + 3.0; // +3 for Weapons/Ammo
console.log(`Total Weight: ${totalWeight} tons`);

if (totalWeight === 20.0) {
  console.log('✅ Total Weight Matches Tonnage (20.0)');
} else {
  console.error(`❌ Total Weight Mismatch: Expected 20.0, got ${totalWeight}`);
}

console.log('=== Verification Complete ===');

