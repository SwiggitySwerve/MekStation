import type { IEditableMech } from '@/services/construction/MechBuilderService';
import type { IUnitConfig } from '@/services/printing/recordsheet/types';

import { getCalculationService } from '@/services/construction/CalculationService';
import { calculateRatedWalkMP } from '@/utils/construction/engineCalculations';
import { logger } from '@/utils/logger';

import {
  buildCriticalSlotsFromEquipment,
  buildEditableArmorAllocation,
  buildEditableMech,
  buildPreviewUnitConfig,
  buildPreviewMechNameParts,
  type PreviewUnitState,
} from '../tabs/PreviewTab.builders';

export {
  buildCriticalSlotsFromEquipment,
  buildEditableArmorAllocation,
  buildEditableMech,
  buildPreviewUnitConfig,
  buildPreviewMechNameParts,
};
export type { PreviewUnitState };

export interface BattleMechPreviewProjection {
  readonly editableMech: IEditableMech;
  readonly unitConfig: IUnitConfig;
  readonly walkMP: number;
  readonly runMP: number;
  readonly battleValue: number;
  readonly cost: number;
}

export function getMovementProfile(
  engineRating: number,
  tonnage: number,
  cockpitType = '',
): { walkMP: number; runMP: number } {
  const walkMP =
    engineRating > 0 && tonnage > 0
      ? calculateRatedWalkMP(engineRating, tonnage, cockpitType)
      : 0;
  return {
    walkMP,
    runMP: Math.ceil(walkMP * 1.5),
  };
}

function calculateBattleValueAndCost(editableMech: IEditableMech): {
  battleValue: number;
  cost: number;
} {
  try {
    const calculationService = getCalculationService();
    return {
      battleValue: calculationService.calculateBattleValue(editableMech),
      cost: calculationService.calculateCost(editableMech),
    };
  } catch (error) {
    logger.warn('Failed to calculate BV/cost:', error);
    return { battleValue: 0, cost: 0 };
  }
}

/**
 * Project the current BattleMech editor state once for every record-sheet
 * consumer. Canvas rendering, PDF export, and printing must all use the
 * returned unitConfig so their armor, critical slots, BV, and cost cannot drift.
 */
export function buildBattleMechPreviewProjection(
  state: PreviewUnitState,
  _equipmentDefinitionsReady = true,
): BattleMechPreviewProjection {
  // Readiness is an explicit projection input because the singleton calculation
  // service's equipment-definition results change when its registry hydrates.
  const { walkMP, runMP } = getMovementProfile(
    state.engineRating,
    state.tonnage,
    state.cockpitType,
  );
  const editableMech = buildEditableMech(state, walkMP);
  const { battleValue, cost } = calculateBattleValueAndCost(editableMech);
  const unitConfig = buildPreviewUnitConfig(
    state,
    walkMP,
    runMP,
    battleValue,
    cost,
  );

  return {
    editableMech,
    unitConfig,
    walkMP,
    runMP,
    battleValue,
    cost,
  };
}
