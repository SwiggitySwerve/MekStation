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
import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { getCalculationService } from '@/services/construction/CalculationService';
import { projectEditableMech } from '@/services/construction/editableMechProjection';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import {
  getLocationsForConfig,
  getLocationSlotCount,
} from '@/types/construction/MechConfigurationSystem';
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
import {
  getSlotPlacementSummary,
  hasAssignedCriticalSlots,
} from '@/utils/construction/slotOperations/placement';
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

  const { isReady: registryReady } = useEquipmentRegistry();
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
    configuration,
  );

  const editableMech = useMemo(
    () =>
      projectEditableMech(
        {
          name: unitName,
          chassis,
          model,
          tonnage,
          configuration,
          techBase,
          engineType,
          engineRating,
          internalStructureType,
          gyroType,
          cockpitType,
          armorType,
          armorAllocation,
          heatSinkType,
          heatSinkCount,
          equipment,
        },
        calculations.walkMP,
        'editor',
      ),
    [
      unitName,
      chassis,
      model,
      tonnage,
      configuration,
      techBase,
      engineType,
      engineRating,
      internalStructureType,
      gyroType,
      cockpitType,
      armorType,
      armorAllocation,
      heatSinkType,
      heatSinkCount,
      equipment,
      calculations.walkMP,
    ],
  );

  const battleValue = useMemo(() => {
    try {
      return registryReady
        ? getCalculationService().calculateBattleValue(editableMech)
        : 0;
    } catch (error) {
      logger.warn('Failed to calculate BV:', error);
      return 0;
    }
  }, [registryReady, editableMech]);

  const heatProfile = useMemo(() => {
    const unavailable = {
      heatGenerated: 0,
      heatDissipated: calculations.totalHeatDissipation,
      netHeat: -calculations.totalHeatDissipation,
      alphaStrikeHeat: 0,
    };
    try {
      return registryReady
        ? getCalculationService().calculateHeatProfile(editableMech)
        : unavailable;
    } catch (error) {
      logger.warn('Failed to calculate heat profile:', error);
      return unavailable;
    }
  }, [registryReady, editableMech, calculations.totalHeatDissipation]);

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
  const totalSlots = getLocationsForConfig(configuration).reduce(
    (sum, location) => sum + getLocationSlotCount(location, configuration),
    0,
  );
  const totalSlotsUsed =
    calculations.totalSystemSlots + equipmentCalcs.totalSlots;
  const slotPlacement = useMemo(
    () => getSlotPlacementSummary(equipment),
    [equipment],
  );

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
      criticalSlotsTotal: totalSlots,
      criticalSlotsPlaced: totalSlotsUsed - slotPlacement.pendingSlots,
      criticalSlotsPending: slotPlacement.pendingSlots,
      unplacedItemCount: slotPlacement.unplacedItems,
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
      totalSlots,
      slotPlacement,
      heatProfile,
      battleValue,
    ],
  );

  const mobileLoadoutStats: MobileLoadoutStats = useMemo(() => {
    const unassignedCount = equipment.filter(
      (e) => !hasAssignedCriticalSlots(e),
    ).length;
    return {
      weightUsed: totalWeight,
      weightMax: tonnage,
      slotsUsed: totalSlotsUsed,
      slotsMax: totalSlots,
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
    totalSlots,
    heatProfile,
    battleValue,
  ]);

  return {
    unitStats,
    mobileLoadoutStats,
  };
}
