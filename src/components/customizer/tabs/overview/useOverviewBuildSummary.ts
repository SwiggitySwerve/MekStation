/**
 * Overview build summary data
 *
 * Gathers the numbers the Overview tab presents from their existing owners:
 * the banner stats (`useUnitEditorRoutingStats`), the component weights
 * (`useUnitCalculations`), mounted payload (`useEquipmentCalculations`) and
 * the rule results (`useUnitValidation`). It adds no rules of its own.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import { useMemo } from 'react';

import type { UnitStats } from '@/components/customizer/shared/UnitInfoBanner';

import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import {
  useUnitCalculations,
  type UnitCalculations,
} from '@/hooks/useUnitCalculations';
import {
  useUnitValidation,
  type UnitValidationState,
} from '@/hooks/useUnitValidation';
import { useUnitStore } from '@/stores/useUnitStore';
import { hasAssignedCriticalSlots } from '@/utils/construction/slotOperations/placement';

import { useUnitEditorRoutingStats } from '../../UnitEditorWithRoutingStats';

export interface OverviewBuildSummaryData {
  readonly stats: UnitStats;
  readonly calculations: UnitCalculations;
  /** Payload weight of mounted equipment, as charged in the weight total. */
  readonly equipmentWeight: number;
  readonly equipmentCount: number;
  /** Instance ids of mounted equipment without assigned critical slots. */
  readonly unplacedInstanceIds: readonly string[];
  /** Display names of the same unplaced items, in mount order. */
  readonly unplacedItemNames: readonly string[];
  readonly validation: UnitValidationState;
}

export function useOverviewBuildSummary(): OverviewBuildSummaryData {
  const unitName = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const techBase = useUnitStore((s) => s.techBase);
  const techBaseMode = useUnitStore((s) => s.techBaseMode);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorType = useUnitStore((s) => s.armorType);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const equipment = useUnitStore((s) => s.equipment);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const jumpJetType = useUnitStore((s) => s.jumpJetType);

  const validation = useUnitValidation();

  const { unitStats } = useUnitEditorRoutingStats({
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
  });

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
  const equipmentCalcs = useEquipmentCalculations(equipment);
  const unplaced = useMemo(
    () => equipment.filter((item) => !hasAssignedCriticalSlots(item)),
    [equipment],
  );
  const unplacedInstanceIds = useMemo(
    () => unplaced.map((item) => item.instanceId),
    [unplaced],
  );
  const unplacedItemNames = useMemo(
    () => unplaced.map((item) => item.name),
    [unplaced],
  );

  return {
    stats: unitStats,
    calculations,
    equipmentWeight: equipmentCalcs.totalWeight,
    equipmentCount: equipment.length,
    unplacedInstanceIds,
    unplacedItemNames,
    validation,
  };
}
