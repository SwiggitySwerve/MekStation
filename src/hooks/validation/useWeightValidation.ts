/**
 * Weight Validation Hook
 *
 * Focused hook for weight-related validation data.
 * Calculates structural weight and equipment weight for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import { getTotalEquipmentWeight } from '@/stores/unitState';
import { useUnitStore } from '@/stores/useUnitStore';
import { calculateStructuralWeight } from '@/utils/validation/weightValidationUtils';

/**
 * Weight validation data
 */
export interface WeightValidationData {
  /** Total weight allocated by all components and equipment */
  allocatedWeight: number;
  /** Maximum weight allowed (tonnage) */
  maxWeight: number;
  /** Structural weight (engine, gyro, structure, cockpit, heat sinks, armor) */
  structuralWeight: number;
  /** Equipment weight */
  equipmentWeight: number;
  /** Remaining weight capacity */
  remainingWeight: number;
  /** Whether weight is within limits */
  isValid: boolean;
}

/**
 * Hook for weight validation data
 *
 * Dependencies: tonnage, engineType, engineRating, gyroType, internalStructureType,
 * cockpitType, heatSinkType, heatSinkCount, armorTonnage, equipment (9 total)
 */
export function useWeightValidation(): WeightValidationData {
  const tonnage = useUnitStore((s) => s.tonnage);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const equipment = useUnitStore((s) => s.equipment);

  return useMemo(() => {
    const effectiveTonnage = tonnage || 20;

    // Calculate structural weight
    const structuralWeight = calculateStructuralWeight({
      tonnage: effectiveTonnage,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorTonnage,
    });

    // Calculate equipment weight
    const equipmentWeight = getTotalEquipmentWeight(equipment);

    // Total allocated weight
    const allocatedWeight = structuralWeight + equipmentWeight;

    // Remaining capacity
    const remainingWeight = effectiveTonnage - allocatedWeight;

    return {
      allocatedWeight,
      maxWeight: effectiveTonnage,
      structuralWeight,
      equipmentWeight,
      remainingWeight,
      isValid: allocatedWeight <= effectiveTonnage,
    };
  }, [
    tonnage,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorTonnage,
    equipment,
  ]);
}
