import { useMemo } from 'react';

import type { MobileLoadoutStats } from '@/components/customizer/mobile';
import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import type { ArmorTypeEnum } from '@/types/construction/ArmorType';
import type { CockpitType } from '@/types/construction/CockpitType';
import type { EngineType } from '@/types/construction/EngineType';
import type { GyroType } from '@/types/construction/GyroType';
import type { HeatSinkType } from '@/types/construction/HeatSinkType';
import type { InternalStructureType } from '@/types/construction/InternalStructureType';
import type { IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { UnitStats } from '@/components/customizer/shared/UnitInfoBanner';
import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { calculationService } from '@/services/construction/CalculationService';
import {
  IEditableMech,
  IArmorAllocation as IEditableArmorAllocation,
} from '@/services/construction/MechBuilderService';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  TechBaseMode,
  isEffectivelyMixed,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import {
  calculateMaxRunMPWithModifiers,
  getMovementModifiersFromEquipment,
  type JumpJetType,
} from '@/utils/construction/movementCalculations';
import { logger } from '@/utils/logger';

interface UnitEditorStatsInput {
  unitName: string;
  chassis: string;
  model: string;
  tonnage: number;
  configuration: MechConfiguration;
  techBase: TechBase;
  techBaseMode: TechBaseMode;
  componentTechBases: IComponentTechBases;
  engineType: EngineType;
  engineRating: number;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  heatSinkCount: number;
  armorType: ArmorTypeEnum;
  armorTonnage: number;
  armorAllocation: IArmorAllocation;
  equipment: readonly IMountedEquipmentInstance[];
  jumpMP: number;
  jumpJetType: JumpJetType;
  validation: Pick<
    UnitValidationState,
    'status' | 'errorCount' | 'warningCount'
  >;
}

interface UnitEditorStatsResult {
  unitStats: UnitStats;
  mobileLoadoutStats: MobileLoadoutStats;
}

const EMPTY_ARMOR_ALLOCATION: IEditableArmorAllocation = {
  head: 0,
  centerTorso: 0,
  centerTorsoRear: 0,
  leftTorso: 0,
  leftTorsoRear: 0,
  rightTorso: 0,
  rightTorsoRear: 0,
  leftArm: 0,
  rightArm: 0,
  leftLeg: 0,
  rightLeg: 0,
};

function toEditableArmorAllocation(
  armorAllocation: IArmorAllocation,
): IEditableArmorAllocation {
  return {
    head: armorAllocation[MechLocation.HEAD],
    centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
    centerTorsoRear: armorAllocation.centerTorsoRear,
    leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
    leftTorsoRear: armorAllocation.leftTorsoRear,
    rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
    rightTorsoRear: armorAllocation.rightTorsoRear,
    leftArm: armorAllocation[MechLocation.LEFT_ARM],
    rightArm: armorAllocation[MechLocation.RIGHT_ARM],
    leftLeg: armorAllocation[MechLocation.LEFT_LEG],
    rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
  };
}

function toEditableEquipmentSlots(
  equipment: readonly IMountedEquipmentInstance[],
) {
  return equipment.map((eq) => ({
    equipmentId: eq.equipmentId,
    location: eq.location ?? '',
    slotIndex: eq.slots?.[0] ?? 0,
  }));
}

export function useUnitEditorRoutingStats(
  input: UnitEditorStatsInput,
): UnitEditorStatsResult {
  const {
    unitName,
    chassis,
    model,
    tonnage,
    configuration,
    techBase,
    techBaseMode,
    componentTechBases,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorType,
    armorTonnage,
    armorAllocation,
    equipment,
    jumpMP,
    jumpJetType,
    validation,
  } = input;

  const equipmentCalcs = useEquipmentCalculations(equipment);

  const allocatedArmorPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation, configuration),
    [armorAllocation, configuration],
  );

  const maxArmorPoints = useMemo(
    () => getMaxTotalArmor(tonnage, configuration),
    [tonnage, configuration],
  );

  const componentSelections = useMemo(
    () => ({
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
      jumpMP,
      jumpJetType,
    }),
    [
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
      jumpMP,
      jumpJetType,
    ],
  );

  const calculations = useUnitCalculations(
    tonnage,
    componentSelections,
    armorTonnage,
  );

  const battleValue = useMemo(() => {
    try {
      const editableMech: IEditableMech = {
        id: 'banner',
        chassis: chassis || unitName.split(' ')[0] || 'Unknown',
        variant: model || unitName.split(' ').slice(1).join(' ') || 'Custom',
        tonnage,
        techBase,
        engineType,
        engineRating,
        walkMP: calculations.walkMP,
        structureType: internalStructureType,
        gyroType,
        cockpitType,
        armorType,
        armorAllocation: toEditableArmorAllocation(armorAllocation),
        heatSinkType,
        heatSinkCount,
        equipment: toEditableEquipmentSlots(equipment),
        isDirty: false,
      };

      return calculationService.calculateBattleValue(editableMech);
    } catch (error) {
      logger.warn('Failed to calculate BV:', error);
      return 0;
    }
  }, [
    unitName,
    chassis,
    model,
    tonnage,
    techBase,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorType,
    armorAllocation,
    equipment,
    calculations.walkMP,
  ]);

  const heatProfile = useMemo(() => {
    try {
      const editableMech: IEditableMech = {
        id: 'heat-calc',
        chassis: chassis || 'Unknown',
        variant: model || 'Custom',
        tonnage,
        techBase,
        engineType,
        engineRating,
        walkMP: calculations.walkMP,
        structureType: internalStructureType,
        gyroType,
        cockpitType,
        armorType,
        armorAllocation: EMPTY_ARMOR_ALLOCATION,
        heatSinkType,
        heatSinkCount,
        equipment: toEditableEquipmentSlots(equipment),
        isDirty: false,
      };

      return calculationService.calculateHeatProfile(editableMech);
    } catch (error) {
      logger.warn('Failed to calculate heat profile:', error);
      return {
        heatGenerated: 0,
        heatDissipated: calculations.totalHeatDissipation,
        netHeat: -calculations.totalHeatDissipation,
        alphaStrikeHeat: 0,
      };
    }
  }, [
    chassis,
    model,
    tonnage,
    techBase,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorType,
    equipment,
    calculations.walkMP,
    calculations.totalHeatDissipation,
  ]);

  const maxRunMP = useMemo(() => {
    const equipmentNames = equipment.map((item) => item.name);
    const modifiers = getMovementModifiersFromEquipment(equipmentNames);
    return calculateMaxRunMPWithModifiers(calculations.walkMP, modifiers);
  }, [equipment, calculations.walkMP]);

  const effectiveTechBaseMode = useMemo(() => {
    if (techBaseMode === TechBaseMode.MIXED) {
      return TechBaseMode.MIXED;
    }
    if (isEffectivelyMixed(componentTechBases)) {
      return TechBaseMode.MIXED;
    }
    return techBaseMode;
  }, [techBaseMode, componentTechBases]);

  const totalWeight =
    calculations.totalStructuralWeight + equipmentCalcs.totalWeight;
  const totalSlotsUsed =
    calculations.totalSystemSlots + equipmentCalcs.totalSlots;

  const unitStats: UnitStats = useMemo(
    () => ({
      name: unitName,
      tonnage,
      techBaseMode: effectiveTechBaseMode,
      engineRating,
      walkMP: calculations.walkMP,
      runMP: calculations.runMP,
      jumpMP: calculations.jumpMP,
      maxRunMP,
      weightUsed: totalWeight,
      weightRemaining: tonnage - totalWeight,
      armorPoints: allocatedArmorPoints,
      maxArmorPoints,
      criticalSlotsUsed: totalSlotsUsed,
      criticalSlotsTotal: 78,
      heatGenerated: heatProfile.heatGenerated,
      heatDissipation: heatProfile.heatDissipated,
      battleValue,
      validationStatus: validation.status,
      errorCount: validation.errorCount,
      warningCount: validation.warningCount,
    }),
    [
      unitName,
      tonnage,
      engineRating,
      validation.status,
      validation.errorCount,
      validation.warningCount,
      effectiveTechBaseMode,
      calculations,
      maxRunMP,
      totalWeight,
      allocatedArmorPoints,
      maxArmorPoints,
      totalSlotsUsed,
      heatProfile,
      battleValue,
    ],
  );

  const mobileLoadoutStats: MobileLoadoutStats = useMemo(() => {
    const unassignedCount = equipment.filter((e) => !e.location).length;
    return {
      weightUsed: totalWeight,
      weightMax: tonnage,
      slotsUsed: totalSlotsUsed,
      slotsMax: 78,
      heatGenerated: heatProfile.heatGenerated,
      heatDissipation: heatProfile.heatDissipated,
      battleValue,
      equipmentCount: equipment.length,
      unassignedCount,
    };
  }, [
    equipment,
    tonnage,
    totalWeight,
    totalSlotsUsed,
    heatProfile,
    battleValue,
  ]);

  return {
    unitStats,
    mobileLoadoutStats,
  };
}
