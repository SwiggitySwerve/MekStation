/**
 * Unit Structure Store Helpers
 *
 * Pure helper functions for engine, gyro, structure, armor, enhancement,
 * and jump jet logic.
 */

import type { ArmorTypeEnum } from '@/types/construction/ArmorType';
import type { EngineType } from '@/types/construction/EngineType';
import type { GyroType } from '@/types/construction/GyroType';
import type { HeatSinkType } from '@/types/construction/HeatSinkType';
import type { InternalStructureType } from '@/types/construction/InternalStructureType';
import type { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import type { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import type { TechBase } from '@/types/enums/TechBase';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { JumpJetType } from '@/utils/construction/movementCalculations';

import { getArmorDefinition } from '@/types/construction/ArmorType';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import {
  getEquipmentDisplacedByEngineChange,
  getEquipmentDisplacedByGyroChange,
  applyDisplacement,
} from '@/utils/construction/displacementUtils';
import {
  calculateIntegralHeatSinks,
  calculateEngineWeight,
} from '@/utils/construction/engineCalculations';
import { getMaxJumpMP } from '@/utils/construction/movementCalculations';
import {
  createJumpJetEquipmentList,
  filterOutJumpJets,
  createInternalStructureEquipmentList,
  filterOutInternalStructure,
  createArmorEquipmentList,
  filterOutArmorSlots,
  createHeatSinkEquipmentList,
  filterOutHeatSinks,
  createEnhancementEquipmentList,
  filterOutEnhancementEquipment,
} from '@/utils/equipment/equipmentListUtils';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

// =============================================================================
// Engine Logic
// =============================================================================

export function applyEngineTypeChange(
  equipment: readonly IMountedEquipmentInstance[],
  oldEngineType: EngineType,
  newEngineType: EngineType,
  gyroType: GyroType,
  engineRating: number,
  heatSinkType: HeatSinkType,
  heatSinkCount: number,
  enhancement: MovementEnhancementType | null,
  tonnage: number,
  techBase: TechBase,
): readonly IMountedEquipmentInstance[] {
  // Equipment displacement from engine slot changes
  const displaced = getEquipmentDisplacedByEngineChange(
    equipment,
    oldEngineType,
    newEngineType,
    gyroType,
  );
  let updatedEquipment = applyDisplacement(
    equipment,
    displaced.displacedEquipmentIds,
  );

  // Re-sync heat sinks (integral capacity may change)
  const integralHeatSinks = calculateIntegralHeatSinks(
    engineRating,
    newEngineType,
  );
  const externalHeatSinks = Math.max(0, heatSinkCount - integralHeatSinks);
  const nonHeatSinkEquipment = filterOutHeatSinks(updatedEquipment);
  const heatSinkEquipment = createHeatSinkEquipmentList(
    heatSinkType,
    externalHeatSinks,
  );
  updatedEquipment = [...nonHeatSinkEquipment, ...heatSinkEquipment];

  // Re-sync enhancement equipment (Supercharger depends on engine weight)
  const engineWeight = calculateEngineWeight(engineRating, newEngineType);
  const nonEnhancementEquipment =
    filterOutEnhancementEquipment(updatedEquipment);
  const enhancementEquipment = createEnhancementEquipmentList(
    enhancement,
    tonnage,
    techBase,
    engineWeight,
  );
  updatedEquipment = [...nonEnhancementEquipment, ...enhancementEquipment];

  return updatedEquipment;
}

export function applyEngineRatingChange(
  equipment: readonly IMountedEquipmentInstance[],
  engineRating: number,
  engineType: EngineType,
  heatSinkType: HeatSinkType,
  heatSinkCount: number,
  enhancement: MovementEnhancementType | null,
  tonnage: number,
  techBase: TechBase,
): readonly IMountedEquipmentInstance[] {
  // Re-sync heat sinks
  const integralHeatSinks = calculateIntegralHeatSinks(
    engineRating,
    engineType,
  );
  const externalHeatSinks = Math.max(0, heatSinkCount - integralHeatSinks);
  const nonHeatSinkEquipment = filterOutHeatSinks(equipment);
  const heatSinkEquipment = createHeatSinkEquipmentList(
    heatSinkType,
    externalHeatSinks,
  );

  // Re-sync enhancement equipment
  const engineWeight = calculateEngineWeight(engineRating, engineType);
  const nonEnhancementEquipment = filterOutEnhancementEquipment([
    ...nonHeatSinkEquipment,
    ...heatSinkEquipment,
  ]);
  const enhancementEquipment = createEnhancementEquipmentList(
    enhancement,
    tonnage,
    techBase,
    engineWeight,
  );

  return [...nonEnhancementEquipment, ...enhancementEquipment];
}

// =============================================================================
// Gyro Logic
// =============================================================================

export function applyGyroTypeChange(
  equipment: readonly IMountedEquipmentInstance[],
  engineType: EngineType,
  oldGyroType: GyroType,
  newGyroType: GyroType,
): readonly IMountedEquipmentInstance[] {
  const displaced = getEquipmentDisplacedByGyroChange(
    equipment,
    engineType,
    oldGyroType,
    newGyroType,
  );
  return applyDisplacement(equipment, displaced.displacedEquipmentIds);
}

// =============================================================================
// Internal Structure Logic
// =============================================================================

export function applyInternalStructureTypeChange(
  equipment: readonly IMountedEquipmentInstance[],
  type: InternalStructureType,
): readonly IMountedEquipmentInstance[] {
  const nonStructureEquipment = filterOutInternalStructure(equipment);
  const structureEquipment = createInternalStructureEquipmentList(type);
  return [...nonStructureEquipment, ...structureEquipment];
}

// =============================================================================
// Heat Sink Logic
// =============================================================================

export function applyHeatSinkTypeChange(
  equipment: readonly IMountedEquipmentInstance[],
  engineRating: number,
  engineType: EngineType,
  newHeatSinkType: HeatSinkType,
  heatSinkCount: number,
): readonly IMountedEquipmentInstance[] {
  const integralHeatSinks = calculateIntegralHeatSinks(
    engineRating,
    engineType,
  );
  const externalHeatSinks = Math.max(0, heatSinkCount - integralHeatSinks);

  const nonHeatSinkEquipment = filterOutHeatSinks(equipment);
  const heatSinkEquipment = createHeatSinkEquipmentList(
    newHeatSinkType,
    externalHeatSinks,
  );

  return [...nonHeatSinkEquipment, ...heatSinkEquipment];
}

export function applyHeatSinkCountChange(
  equipment: readonly IMountedEquipmentInstance[],
  engineRating: number,
  engineType: EngineType,
  heatSinkType: HeatSinkType,
  newHeatSinkCount: number,
): readonly IMountedEquipmentInstance[] {
  const integralHeatSinks = calculateIntegralHeatSinks(
    engineRating,
    engineType,
  );
  const externalHeatSinks = Math.max(0, newHeatSinkCount - integralHeatSinks);

  const nonHeatSinkEquipment = filterOutHeatSinks(equipment);
  const heatSinkEquipment = createHeatSinkEquipmentList(
    heatSinkType,
    externalHeatSinks,
  );

  return [...nonHeatSinkEquipment, ...heatSinkEquipment];
}

// =============================================================================
// Armor Logic
// =============================================================================

export function applyArmorTypeChange(
  equipment: readonly IMountedEquipmentInstance[],
  tonnage: number,
  configuration: MechConfiguration,
  currentArmorTonnage: number,
  newArmorType: ArmorTypeEnum,
): { equipment: readonly IMountedEquipmentInstance[]; armorTonnage: number } {
  const nonArmorEquipment = filterOutArmorSlots(equipment);
  const armorEquipment = createArmorEquipmentList(newArmorType);

  const maxTotalArmor = getMaxTotalArmor(tonnage, configuration);
  const newPointsPerTon = getArmorDefinition(newArmorType)?.pointsPerTon ?? 16;
  const maxUsefulTonnage = ceilToHalfTon(maxTotalArmor / newPointsPerTon);
  const cappedTonnage = Math.min(currentArmorTonnage, maxUsefulTonnage);

  return {
    equipment: [...nonArmorEquipment, ...armorEquipment],
    armorTonnage: cappedTonnage,
  };
}

// =============================================================================
// Enhancement Logic
// =============================================================================

export function applyEnhancementChange(
  equipment: readonly IMountedEquipmentInstance[],
  enhancement: MovementEnhancementType | null,
  tonnage: number,
  techBase: TechBase,
  engineRating: number,
  engineType: EngineType,
): readonly IMountedEquipmentInstance[] {
  const nonEnhancementEquipment = filterOutEnhancementEquipment(equipment);
  const engineWeight = calculateEngineWeight(engineRating, engineType);
  const enhancementEquipment = createEnhancementEquipmentList(
    enhancement,
    tonnage,
    techBase,
    engineWeight,
  );

  return [...nonEnhancementEquipment, ...enhancementEquipment];
}

// =============================================================================
// Jump Jet Logic
// =============================================================================

export function applyJumpMPChange(
  equipment: readonly IMountedEquipmentInstance[],
  tonnage: number,
  engineRating: number,
  jumpJetType: JumpJetType,
  newJumpMP: number,
): { equipment: readonly IMountedEquipmentInstance[]; jumpMP: number } {
  const walkMP = Math.floor(engineRating / tonnage);
  const maxJump = getMaxJumpMP(walkMP, jumpJetType);
  const clampedJumpMP = Math.max(0, Math.min(newJumpMP, maxJump));

  const nonJumpEquipment = filterOutJumpJets(equipment);
  const jumpJetEquipment = createJumpJetEquipmentList(
    tonnage,
    clampedJumpMP,
    jumpJetType,
  );

  return {
    equipment: [...nonJumpEquipment, ...jumpJetEquipment],
    jumpMP: clampedJumpMP,
  };
}

export function applyJumpJetTypeChange(
  equipment: readonly IMountedEquipmentInstance[],
  tonnage: number,
  engineRating: number,
  currentJumpMP: number,
  newJumpJetType: JumpJetType,
): { equipment: readonly IMountedEquipmentInstance[]; jumpMP: number } {
  const walkMP = Math.floor(engineRating / tonnage);
  const maxJump = getMaxJumpMP(walkMP, newJumpJetType);
  const clampedJumpMP = Math.min(currentJumpMP, maxJump);

  const nonJumpEquipment = filterOutJumpJets(equipment);
  const jumpJetEquipment = createJumpJetEquipmentList(
    tonnage,
    clampedJumpMP,
    newJumpJetType,
  );

  return {
    equipment: [...nonJumpEquipment, ...jumpJetEquipment],
    jumpMP: clampedJumpMP,
  };
}

// =============================================================================
// Tonnage Logic
// =============================================================================

export function applyTonnageChange(
  equipment: readonly IMountedEquipmentInstance[],
  oldTonnage: number,
  newTonnage: number,
  engineRating: number,
  engineType: EngineType,
  enhancement: MovementEnhancementType | null,
  techBase: TechBase,
  jumpMP: number,
  jumpJetType: JumpJetType,
): {
  equipment: readonly IMountedEquipmentInstance[];
  engineRating: number;
} {
  const walkMP = Math.floor(engineRating / oldTonnage);
  const newEngineRating = newTonnage * walkMP;
  const clampedRating = Math.max(10, Math.min(400, newEngineRating));

  // Re-sync enhancement equipment since MASC depends on tonnage
  const engineWeight = calculateEngineWeight(clampedRating, engineType);

  let updatedEquipment = filterOutEnhancementEquipment(equipment);
  updatedEquipment = filterOutJumpJets(updatedEquipment);

  const enhancementEquipment = createEnhancementEquipmentList(
    enhancement,
    newTonnage,
    techBase,
    engineWeight,
  );

  // Recreate jump jet equipment (weight varies by tonnage class)
  const jumpJetEquipment = createJumpJetEquipmentList(
    newTonnage,
    jumpMP,
    jumpJetType,
  );

  return {
    equipment: [
      ...updatedEquipment,
      ...enhancementEquipment,
      ...jumpJetEquipment,
    ],
    engineRating: clampedRating,
  };
}
