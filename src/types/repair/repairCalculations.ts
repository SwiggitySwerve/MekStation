import type { PartQuality } from '@/types/campaign/quality';

import {
  getQualityRepairCostMultiplier,
  QUALITY_TN_MODIFIER,
  DEFAULT_UNIT_QUALITY,
} from '@/types/campaign/quality';

import type {
  IDamageAssessment,
  IFieldRepairResult,
  IRepairItem,
} from './repairTypes';

import {
  ARMOR_COST_MODIFIERS,
  REPAIR_COSTS,
  STRUCTURE_COST_MODIFIERS,
} from './repairTypes';

export function calculateArmorRepairCost(
  pointsToRestore: number,
  armorType: string = 'standard',
): number {
  const modifier = ARMOR_COST_MODIFIERS[armorType] ?? 1.0;
  return Math.ceil(pointsToRestore * REPAIR_COSTS.ARMOR_PER_POINT * modifier);
}

export function calculateStructureRepairCost(
  pointsToRestore: number,
  structureType: string = 'standard',
  isCritical: boolean = false,
): number {
  const typeModifier = STRUCTURE_COST_MODIFIERS[structureType] ?? 1.0;
  const critModifier = isCritical
    ? REPAIR_COSTS.CRITICAL_DAMAGE_MULTIPLIER
    : 1.0;
  return Math.ceil(
    pointsToRestore *
      REPAIR_COSTS.STRUCTURE_PER_POINT *
      typeModifier *
      critModifier,
  );
}

export function calculateArmorRepairTime(pointsToRestore: number): number {
  return Math.ceil(pointsToRestore / 10) * REPAIR_COSTS.ARMOR_TIME_PER_10;
}

export function calculateStructureRepairTime(pointsToRestore: number): number {
  return pointsToRestore * REPAIR_COSTS.STRUCTURE_TIME_PER_POINT;
}

export function calculateTotalRepairCost(
  items: readonly IRepairItem[],
): number {
  return items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.cost, 0);
}

export function calculateTotalRepairTime(
  items: readonly IRepairItem[],
): number {
  return items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.timeHours, 0);
}

export function calculateFieldRepair(
  assessment: IDamageAssessment,
  availableSupplies: number,
): IFieldRepairResult {
  const armorRestored: Record<string, number> = {};
  let totalArmorRestored = 0;
  let suppliesUsed = 0;

  for (const locDamage of assessment.locationDamage) {
    if (locDamage.armorDamage <= 0) continue;

    const maxFieldRepair = Math.ceil(
      locDamage.armorMax * REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT,
    );
    const restoreAmount = Math.min(locDamage.armorDamage, maxFieldRepair);
    const suppliesCost =
      restoreAmount * REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT;

    if (suppliesUsed + suppliesCost > availableSupplies) {
      const affordablePoints = Math.floor(
        (availableSupplies - suppliesUsed) /
          REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT,
      );
      if (affordablePoints > 0) {
        armorRestored[locDamage.location] = affordablePoints;
        totalArmorRestored += affordablePoints;
        suppliesUsed +=
          affordablePoints * REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT;
      }
      break;
    }

    armorRestored[locDamage.location] = restoreAmount;
    totalArmorRestored += restoreAmount;
    suppliesUsed += suppliesCost;
  }

  return {
    unitId: assessment.unitId,
    armorRestored,
    totalArmorRestored,
    suppliesUsed: Math.ceil(suppliesUsed),
    wasLimited: suppliesUsed >= availableSupplies,
  };
}

export function calculateQualityAdjustedRepairCost(
  baseCost: number,
  quality?: PartQuality,
): number {
  const multiplier = getQualityRepairCostMultiplier(
    quality ?? DEFAULT_UNIT_QUALITY,
  );
  return Math.ceil(baseCost * multiplier);
}

export function calculateRepairTargetNumber(
  techSkillValue: number,
  quality?: PartQuality,
  additionalModifiers: number = 0,
): number {
  const qualityMod = QUALITY_TN_MODIFIER[quality ?? DEFAULT_UNIT_QUALITY];
  return techSkillValue + qualityMod + additionalModifiers;
}

export function calculateBatchRepairCost(
  jobs: readonly { totalCost: number }[],
): number {
  return jobs.reduce((sum, job) => sum + job.totalCost, 0);
}
