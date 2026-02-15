import type {
  IDamageAssessment,
  ILocationDamage,
  IRepairItem,
  IRepairJob,
  IRepairJobValidationResult,
  ISalvagedPart,
  ISalvageInventory,
} from './repairTypes';

import {
  calculateArmorRepairCost,
  calculateArmorRepairTime,
  calculateStructureRepairCost,
  calculateStructureRepairTime,
} from './repairCalculations';
import { RepairJobStatus, RepairType, UnitLocation } from './repairTypes';

export function createDamageAssessment(
  unitId: string,
  unitName: string,
  armorDamage: Record<string, number>,
  structureDamage: Record<string, number>,
  destroyedComponents: string[],
  armorMax: Record<string, number>,
  structureMax: Record<string, number>,
): IDamageAssessment {
  const locationDamage: ILocationDamage[] = [];
  let totalArmorDamage = 0;
  let totalArmorMax = 0;
  let totalStructureDamage = 0;
  let totalStructureMax = 0;

  for (const location of Object.values(UnitLocation)) {
    const locArmorDamage = armorDamage[location] ?? 0;
    const locStructureDamage = structureDamage[location] ?? 0;
    const locArmorMax = armorMax[location] ?? 0;
    const locStructureMax = structureMax[location] ?? 0;

    if (locArmorMax > 0 || locStructureMax > 0) {
      const locDestroyedComponents = destroyedComponents.filter((c) =>
        c.toLowerCase().includes(location.replace('_', ' ')),
      );

      locationDamage.push({
        location,
        armorDamage: locArmorDamage,
        armorMax: locArmorMax,
        structureDamage: locStructureDamage,
        structureMax: locStructureMax,
        destroyedComponents: locDestroyedComponents,
        damagedComponents: [],
      });

      totalArmorDamage += locArmorDamage;
      totalArmorMax += locArmorMax;
      totalStructureDamage += locStructureDamage;
      totalStructureMax += locStructureMax;
    }
  }

  const ctDamage = locationDamage.find(
    (l) => l.location === UnitLocation.CenterTorso,
  );
  const isDestroyed =
    ctDamage !== undefined &&
    ctDamage.structureMax > 0 &&
    ctDamage.structureDamage >= ctDamage.structureMax;

  const operationalPercent = isDestroyed
    ? 0
    : Math.round(
        ((totalArmorMax -
          totalArmorDamage +
          (totalStructureMax - totalStructureDamage)) /
          (totalArmorMax + totalStructureMax)) *
          100,
      );

  return {
    unitId,
    unitName,
    locationDamage,
    totalArmorDamage,
    totalArmorMax,
    totalStructureDamage,
    totalStructureMax,
    allDestroyedComponents: destroyedComponents,
    allDamagedComponents: [],
    operationalPercent,
    isDestroyed,
  };
}

export function generateRepairItems(
  assessment: IDamageAssessment,
  armorType: string = 'standard',
  structureType: string = 'standard',
): IRepairItem[] {
  const items: IRepairItem[] = [];
  let itemId = 0;

  for (const locDamage of assessment.locationDamage) {
    if (locDamage.armorDamage > 0) {
      items.push({
        id: `repair-${itemId++}`,
        type: RepairType.Armor,
        location: locDamage.location,
        pointsToRestore: locDamage.armorDamage,
        cost: calculateArmorRepairCost(locDamage.armorDamage, armorType),
        timeHours: calculateArmorRepairTime(locDamage.armorDamage),
        selected: true,
      });
    }

    if (locDamage.structureDamage > 0) {
      const isCritical =
        locDamage.structureDamage > locDamage.structureMax * 0.5;
      items.push({
        id: `repair-${itemId++}`,
        type: RepairType.Structure,
        location: locDamage.location,
        pointsToRestore: locDamage.structureDamage,
        cost: calculateStructureRepairCost(
          locDamage.structureDamage,
          structureType,
          isCritical,
        ),
        timeHours: calculateStructureRepairTime(locDamage.structureDamage),
        selected: true,
      });
    }

    for (const component of locDamage.destroyedComponents) {
      const estimatedValue = 10000;
      items.push({
        id: `repair-${itemId++}`,
        type: RepairType.ComponentReplace,
        location: locDamage.location,
        componentName: component,
        cost: estimatedValue,
        timeHours: 4,
        selected: true,
      });
    }
  }

  return items;
}

export function validateRepairJob(
  job: IRepairJob,
  availableCBills: number,
  _availableSupplies: number,
): IRepairJobValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (job.items.length === 0) {
    errors.push('Repair job has no items');
  }

  const selectedItems = job.items.filter((item) => item.selected);
  if (selectedItems.length === 0) {
    errors.push('No repair items are selected');
  }

  const canAfford = job.totalCost <= availableCBills;
  const shortfall = canAfford ? 0 : job.totalCost - availableCBills;

  if (!canAfford) {
    errors.push(
      `Insufficient C-Bills: need ${job.totalCost}, have ${availableCBills}`,
    );
  }

  if (job.totalCost > availableCBills * 0.5) {
    warnings.push('This repair will consume over 50% of available C-Bills');
  }

  if (job.totalTimeHours > 48) {
    warnings.push(
      'Repair time exceeds 48 hours - unit will be unavailable for next mission',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canAfford,
    shortfall,
  };
}

export function isRepairJob(obj: unknown): obj is IRepairJob {
  if (typeof obj !== 'object' || obj === null) return false;
  const job = obj as IRepairJob;
  return (
    typeof job.id === 'string' &&
    typeof job.unitId === 'string' &&
    typeof job.status === 'string' &&
    Array.isArray(job.items) &&
    typeof job.totalCost === 'number'
  );
}

export function isDamageAssessment(obj: unknown): obj is IDamageAssessment {
  if (typeof obj !== 'object' || obj === null) return false;
  const assessment = obj as IDamageAssessment;
  return (
    typeof assessment.unitId === 'string' &&
    typeof assessment.unitName === 'string' &&
    Array.isArray(assessment.locationDamage) &&
    typeof assessment.operationalPercent === 'number'
  );
}

export function getJobsNeedingAttention(
  jobs: readonly IRepairJob[],
): readonly IRepairJob[] {
  return jobs.filter(
    (job) =>
      job.status === RepairJobStatus.Blocked ||
      (job.status === RepairJobStatus.Pending && job.priority > 5),
  );
}

export function findMatchingSalvage(
  item: IRepairItem,
  inventory: ISalvageInventory,
): ISalvagedPart | undefined {
  if (item.type !== RepairType.ComponentReplace || !item.componentName) {
    return undefined;
  }

  return inventory.parts.find(
    (part) =>
      part.componentName.toLowerCase() === item.componentName?.toLowerCase() &&
      part.condition >= 0.5,
  );
}

export function sortJobsByPriority(jobs: readonly IRepairJob[]): IRepairJob[] {
  return [...jobs].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
