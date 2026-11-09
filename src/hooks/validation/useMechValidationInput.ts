/** Shared editor-state projection consumed by live validation and corpus capture. */
import { useMemo } from 'react';

import type { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';

import { useArmorValidation } from './useArmorValidation';
import { useEquipmentValidation } from './useEquipmentValidation';
import { useStructureValidation } from './useStructureValidation';
import { useUnitMetadata } from './useUnitMetadata';
import { useWeightValidation } from './useWeightValidation';

export function useMechValidationInput(): IValidatableUnit {
  const metadata = useUnitMetadata();
  const weightData = useWeightValidation();
  const armorData = useArmorValidation();
  const equipmentData = useEquipmentValidation();
  const structureData = useStructureValidation();

  return useMemo(
    () => ({
      id: metadata.id,
      name: metadata.name,
      unitType: metadata.unitType,
      techBase: metadata.techBase,
      rulesLevel: metadata.rulesLevel,
      era: metadata.era,
      introductionYear: metadata.year,
      extinctionYear: metadata.extinctionYear,
      weight: weightData.maxWeight,
      cost: metadata.cost,
      battleValue: metadata.battleValue,
      engineType: structureData.engineType,
      gyroType: structureData.gyroType,
      cockpitType: structureData.cockpitType,
      internalStructureType: structureData.internalStructureType,
      armorType: structureData.armorType,
      techBaseMode: structureData.techBaseMode,
      heatSinkCount: structureData.heatSinkCount,
      heatSinkType: structureData.heatSinkType,
      totalArmorPoints: armorData.totalArmorPoints,
      maxArmorPoints: armorData.maxArmorPoints,
      armorByLocation: armorData.armorByLocation,
      allocatedWeight: weightData.allocatedWeight,
      maxWeight: weightData.maxWeight,
      slotsByLocation: equipmentData.slotsByLocation,
      equipmentSlotIssues: equipmentData.equipmentSlotIssues,
      mountedEquipment: equipmentData.mountedEquipment,
      equipmentCatalog: equipmentData.equipmentCatalog,
    }),
    [metadata, weightData, armorData, equipmentData, structureData],
  );
}
