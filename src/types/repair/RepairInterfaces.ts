/**
 * Repair System Interfaces
 * Type definitions for post-battle repairs and damage restoration.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */

import {
  type PartQuality,
  getQualityRepairCostMultiplier,
  QUALITY_TN_MODIFIER,
  DEFAULT_UNIT_QUALITY,
} from '@/types/campaign/quality';

// =============================================================================
// Enums
// =============================================================================

/**
 * Types of repairs that can be performed.
 */
export enum RepairType {
  /** Restore armor points */
  Armor = 'armor',
  /** Restore internal structure */
  Structure = 'structure',
  /** Repair damaged (but not destroyed) component */
  ComponentRepair = 'component_repair',
  /** Replace destroyed component */
  ComponentReplace = 'component_replace',
}

/**
 * Repair job status.
 */
export enum RepairJobStatus {
  /** Waiting in queue */
  Pending = 'pending',
  /** Currently being repaired */
  InProgress = 'in_progress',
  /** Repair completed */
  Completed = 'completed',
  /** Repair cancelled */
  Cancelled = 'cancelled',
  /** Blocked (insufficient resources) */
  Blocked = 'blocked',
}

/**
 * Unit locations for damage tracking.
 */
export enum UnitLocation {
  Head = 'head',
  CenterTorso = 'center_torso',
  CenterTorsoRear = 'center_torso_rear',
  LeftTorso = 'left_torso',
  LeftTorsoRear = 'left_torso_rear',
  RightTorso = 'right_torso',
  RightTorsoRear = 'right_torso_rear',
  LeftArm = 'left_arm',
  RightArm = 'right_arm',
  LeftLeg = 'left_leg',
  RightLeg = 'right_leg',
}

// =============================================================================
// Cost Constants
// =============================================================================

/**
 * Base repair costs per point/unit.
 */
export const REPAIR_COSTS = {
  /** C-Bills per armor point */
  ARMOR_PER_POINT: 100,
  /** C-Bills per structure point */
  STRUCTURE_PER_POINT: 500,
  /** Multiplier for critical damage (>50% location damage) */
  CRITICAL_DAMAGE_MULTIPLIER: 1.5,
  /** Base repair time in hours per 10 armor points */
  ARMOR_TIME_PER_10: 1,
  /** Base repair time in hours per structure point */
  STRUCTURE_TIME_PER_POINT: 2,
  /** Component repair is 50% of replacement cost */
  COMPONENT_REPAIR_RATIO: 0.5,
  /** Field repair restores up to 25% of armor */
  FIELD_REPAIR_ARMOR_PERCENT: 0.25,
  /** Field repair uses supplies instead of C-Bills */
  FIELD_REPAIR_SUPPLIES_PER_POINT: 0.5,
} as const;

/**
 * Armor type cost modifiers.
 */
export const ARMOR_COST_MODIFIERS: Record<string, number> = {
  standard: 1.0,
  'ferro-fibrous': 1.5,
  'light-ferro-fibrous': 1.25,
  'heavy-ferro-fibrous': 2.0,
  stealth: 3.0,
  hardened: 2.5,
  reactive: 2.0,
  reflective: 2.0,
};

/**
 * Structure type cost modifiers.
 */
export const STRUCTURE_COST_MODIFIERS: Record<string, number> = {
  standard: 1.0,
  'endo-steel': 1.5,
  'composite': 1.75,
  reinforced: 2.0,
};

// =============================================================================
// Damage Assessment Types
// =============================================================================

/**
 * Damage to a single location.
 */
export interface ILocationDamage {
  /** Location identifier */
  readonly location: UnitLocation;
  /** Armor points lost */
  readonly armorDamage: number;
  /** Maximum armor at this location */
  readonly armorMax: number;
  /** Internal structure points lost */
  readonly structureDamage: number;
  /** Maximum structure at this location */
  readonly structureMax: number;
  /** Destroyed components at this location */
  readonly destroyedComponents: readonly string[];
  /** Damaged (but functional) components */
  readonly damagedComponents: readonly string[];
}

/**
 * Complete damage assessment for a unit.
 */
export interface IDamageAssessment {
  /** Unit ID */
  readonly unitId: string;
  /** Unit name (cached) */
  readonly unitName: string;
  /** Damage by location */
  readonly locationDamage: readonly ILocationDamage[];
  /** Total armor damage across all locations */
  readonly totalArmorDamage: number;
  /** Total armor points (max) */
  readonly totalArmorMax: number;
  /** Total structure damage across all locations */
  readonly totalStructureDamage: number;
  /** Total structure points (max) */
  readonly totalStructureMax: number;
  /** All destroyed components */
  readonly allDestroyedComponents: readonly string[];
  /** All damaged components */
  readonly allDamagedComponents: readonly string[];
  /** Percent operational (0-100) */
  readonly operationalPercent: number;
  /** Is unit destroyed? */
  readonly isDestroyed: boolean;
}

// =============================================================================
// Repair Item Types
// =============================================================================

/**
 * A single repair item (one type of repair for one location).
 */
export interface IRepairItem {
  /** Unique item ID */
  readonly id: string;
  /** Type of repair */
  readonly type: RepairType;
  /** Location being repaired */
  readonly location: UnitLocation;
  /** For armor/structure: points to restore */
  readonly pointsToRestore?: number;
  /** For components: component name */
  readonly componentName?: string;
  /** C-Bills cost for this repair */
  readonly cost: number;
  /** Repair time in hours */
  readonly timeHours: number;
  /** Is this repair selected for the job? */
  readonly selected: boolean;
}

/**
 * A complete repair job for a unit.
 */
export interface IRepairJob {
  /** Unique job ID */
  readonly id: string;
  /** Unit being repaired */
  readonly unitId: string;
  /** Unit name (cached) */
  readonly unitName: string;
  /** Campaign ID this job belongs to */
  readonly campaignId: string;
  /** Job status */
  readonly status: RepairJobStatus;
  /** Individual repair items */
  readonly items: readonly IRepairItem[];
  /** Total C-Bills cost */
  readonly totalCost: number;
  /** Total time in hours */
  readonly totalTimeHours: number;
  /** Time remaining in hours */
  readonly timeRemainingHours: number;
  /** Priority in queue (lower = higher priority) */
  readonly priority: number;
  /** Created timestamp */
  readonly createdAt: string;
  /** Started timestamp */
  readonly startedAt?: string;
  /** Completed timestamp */
  readonly completedAt?: string;
  /** Assigned tech personnel ID (for quality-aware repairs) */
  readonly assignedTechId?: string;
  /** Unit quality grade at time of repair (affects cost and TN) */
  readonly unitQuality?: PartQuality;
}

// =============================================================================
// Repair Bay Types
// =============================================================================

/**
 * Repair bay configuration.
 */
export interface IRepairBay {
  /** Maximum simultaneous repair jobs */
  readonly capacity: number;
  /** Efficiency modifier (1.0 = normal, 0.5 = half speed) */
  readonly efficiency: number;
  /** Jobs currently being worked on */
  readonly activeJobs: readonly string[];
  /** Queued jobs (IDs) */
  readonly queuedJobs: readonly string[];
}

/**
 * Default repair bay for campaigns.
 */
export const DEFAULT_REPAIR_BAY: IRepairBay = {
  capacity: 2,
  efficiency: 1.0,
  activeJobs: [],
  queuedJobs: [],
};

// =============================================================================
// Field Repair Types
// =============================================================================

/**
 * Field repair result.
 */
export interface IFieldRepairResult {
  /** Unit ID */
  readonly unitId: string;
  /** Armor points restored by location */
  readonly armorRestored: Record<string, number>;
  /** Total armor restored */
  readonly totalArmorRestored: number;
  /** Supplies consumed */
  readonly suppliesUsed: number;
  /** Was repair limited by available supplies? */
  readonly wasLimited: boolean;
}

// =============================================================================
// Salvage Types
// =============================================================================

/**
 * A salvaged part.
 */
export interface ISalvagedPart {
  /** Part ID */
  readonly id: string;
  /** Component name */
  readonly componentName: string;
  /** Original unit it came from */
  readonly sourceUnitName: string;
  /** Mission where salvaged */
  readonly missionId: string;
  /** Condition (1.0 = perfect, 0.5 = worn) */
  readonly condition: number;
  /** Estimated value in C-Bills */
  readonly estimatedValue: number;
  /** Quality grade of salvaged part (defaults to C / below average) */
  readonly quality?: PartQuality;
}

/**
 * Campaign salvage inventory.
 */
export interface ISalvageInventory {
  /** Available salvaged parts */
  readonly parts: readonly ISalvagedPart[];
  /** Total estimated value */
  readonly totalValue: number;
}

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate repair cost for armor damage.
 */
export function calculateArmorRepairCost(
  pointsToRestore: number,
  armorType: string = 'standard'
): number {
  const modifier = ARMOR_COST_MODIFIERS[armorType] ?? 1.0;
  return Math.ceil(pointsToRestore * REPAIR_COSTS.ARMOR_PER_POINT * modifier);
}

/**
 * Calculate repair cost for structure damage.
 */
export function calculateStructureRepairCost(
  pointsToRestore: number,
  structureType: string = 'standard',
  isCritical: boolean = false
): number {
  const typeModifier = STRUCTURE_COST_MODIFIERS[structureType] ?? 1.0;
  const critModifier = isCritical ? REPAIR_COSTS.CRITICAL_DAMAGE_MULTIPLIER : 1.0;
  return Math.ceil(
    pointsToRestore * REPAIR_COSTS.STRUCTURE_PER_POINT * typeModifier * critModifier
  );
}

/**
 * Calculate repair time for armor.
 */
export function calculateArmorRepairTime(pointsToRestore: number): number {
  return Math.ceil(pointsToRestore / 10) * REPAIR_COSTS.ARMOR_TIME_PER_10;
}

/**
 * Calculate repair time for structure.
 */
export function calculateStructureRepairTime(pointsToRestore: number): number {
  return pointsToRestore * REPAIR_COSTS.STRUCTURE_TIME_PER_POINT;
}

/**
 * Calculate total repair job cost.
 */
export function calculateTotalRepairCost(items: readonly IRepairItem[]): number {
  return items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.cost, 0);
}

/**
 * Calculate total repair job time.
 */
export function calculateTotalRepairTime(items: readonly IRepairItem[]): number {
  return items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.timeHours, 0);
}

/**
 * Calculate field repair result.
 */
export function calculateFieldRepair(
  assessment: IDamageAssessment,
  availableSupplies: number
): IFieldRepairResult {
  const armorRestored: Record<string, number> = {};
  let totalArmorRestored = 0;
  let suppliesUsed = 0;

  for (const locDamage of assessment.locationDamage) {
    if (locDamage.armorDamage <= 0) continue;

    // Field repair can restore up to 25% of max armor
    const maxFieldRepair = Math.ceil(locDamage.armorMax * REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT);
    const restoreAmount = Math.min(locDamage.armorDamage, maxFieldRepair);
    const suppliesCost = restoreAmount * REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT;

    if (suppliesUsed + suppliesCost > availableSupplies) {
      // Limited by supplies
      const affordablePoints = Math.floor(
        (availableSupplies - suppliesUsed) / REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT
      );
      if (affordablePoints > 0) {
        armorRestored[locDamage.location] = affordablePoints;
        totalArmorRestored += affordablePoints;
        suppliesUsed += affordablePoints * REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT;
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

// =============================================================================
// Assessment Functions
// =============================================================================

/**
 * Create a damage assessment from unit damage state.
 */
export function createDamageAssessment(
  unitId: string,
  unitName: string,
  armorDamage: Record<string, number>,
  structureDamage: Record<string, number>,
  destroyedComponents: string[],
  armorMax: Record<string, number>,
  structureMax: Record<string, number>
): IDamageAssessment {
  const locationDamage: ILocationDamage[] = [];
  let totalArmorDamage = 0;
  let totalArmorMax = 0;
  let totalStructureDamage = 0;
  let totalStructureMax = 0;

  // Process each location
  for (const location of Object.values(UnitLocation)) {
    const locArmorDamage = armorDamage[location] ?? 0;
    const locStructureDamage = structureDamage[location] ?? 0;
    const locArmorMax = armorMax[location] ?? 0;
    const locStructureMax = structureMax[location] ?? 0;

    if (locArmorMax > 0 || locStructureMax > 0) {
      // Filter destroyed components for this location
      // In a real implementation, this would need component-location mapping
      const locDestroyedComponents = destroyedComponents.filter((c) =>
        c.toLowerCase().includes(location.replace('_', ' '))
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

  // Check if unit is destroyed (CT structure = 0)
  const ctDamage = locationDamage.find((l) => l.location === UnitLocation.CenterTorso);
  const isDestroyed =
    ctDamage !== undefined &&
    ctDamage.structureMax > 0 &&
    ctDamage.structureDamage >= ctDamage.structureMax;

  // Calculate operational percentage
  const operationalPercent = isDestroyed
    ? 0
    : Math.round(
        ((totalArmorMax - totalArmorDamage + (totalStructureMax - totalStructureDamage)) /
          (totalArmorMax + totalStructureMax)) *
          100
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

/**
 * Generate repair items from a damage assessment.
 */
export function generateRepairItems(
  assessment: IDamageAssessment,
  armorType: string = 'standard',
  structureType: string = 'standard'
): IRepairItem[] {
  const items: IRepairItem[] = [];
  let itemId = 0;

  for (const locDamage of assessment.locationDamage) {
    // Armor repair items
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

    // Structure repair items
    if (locDamage.structureDamage > 0) {
      const isCritical = locDamage.structureDamage > locDamage.structureMax * 0.5;
      items.push({
        id: `repair-${itemId++}`,
        type: RepairType.Structure,
        location: locDamage.location,
        pointsToRestore: locDamage.structureDamage,
        cost: calculateStructureRepairCost(locDamage.structureDamage, structureType, isCritical),
        timeHours: calculateStructureRepairTime(locDamage.structureDamage),
        selected: true,
      });
    }

    // Component replacement items
    for (const component of locDamage.destroyedComponents) {
      // Component value would come from equipment database
      // Using a placeholder estimate
      const estimatedValue = 10000;
      items.push({
        id: `repair-${itemId++}`,
        type: RepairType.ComponentReplace,
        location: locDamage.location,
        componentName: component,
        cost: estimatedValue,
        timeHours: 4, // 4 hours per component replacement
        selected: true,
      });
    }
  }

  return items;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Repair job validation result.
 */
export interface IRepairJobValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly canAfford: boolean;
  readonly shortfall: number;
}

/**
 * Validate a repair job against available resources.
 */
export function validateRepairJob(
  job: IRepairJob,
  availableCBills: number,
  _availableSupplies: number
): IRepairJobValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if job has items
  if (job.items.length === 0) {
    errors.push('Repair job has no items');
  }

  const selectedItems = job.items.filter((item) => item.selected);
  if (selectedItems.length === 0) {
    errors.push('No repair items are selected');
  }

  // Check cost
  const canAfford = job.totalCost <= availableCBills;
  const shortfall = canAfford ? 0 : job.totalCost - availableCBills;

  if (!canAfford) {
    errors.push(`Insufficient C-Bills: need ${job.totalCost}, have ${availableCBills}`);
  }

  // Warnings
  if (job.totalCost > availableCBills * 0.5) {
    warnings.push('This repair will consume over 50% of available C-Bills');
  }

  if (job.totalTimeHours > 48) {
    warnings.push('Repair time exceeds 48 hours - unit will be unavailable for next mission');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canAfford,
    shortfall,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for IRepairJob.
 */
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

/**
 * Type guard for IDamageAssessment.
 */
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

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get repair jobs that need attention (blocked or pending too long).
 */
export function getJobsNeedingAttention(jobs: readonly IRepairJob[]): readonly IRepairJob[] {
  return jobs.filter(
    (job) =>
      job.status === RepairJobStatus.Blocked ||
      (job.status === RepairJobStatus.Pending && job.priority > 5)
  );
}

/**
 * Calculate total repair costs for multiple jobs.
 */
export function calculateBatchRepairCost(jobs: readonly IRepairJob[]): number {
  return jobs.reduce((sum, job) => sum + job.totalCost, 0);
}

/**
 * Check if salvage can be used for a repair item.
 */
export function findMatchingSalvage(
  item: IRepairItem,
  inventory: ISalvageInventory
): ISalvagedPart | undefined {
  if (item.type !== RepairType.ComponentReplace || !item.componentName) {
    return undefined;
  }

  return inventory.parts.find(
    (part) =>
      part.componentName.toLowerCase() === item.componentName?.toLowerCase() &&
      part.condition >= 0.5 // Must be at least 50% condition
  );
}

/**
 * Sort repair jobs by priority.
 */
export function sortJobsByPriority(jobs: readonly IRepairJob[]): IRepairJob[] {
  return [...jobs].sort((a, b) => {
    // First by priority (lower = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Then by created date (older first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

// =============================================================================
// Quality-Aware Repair Functions
// =============================================================================

export function calculateQualityAdjustedRepairCost(
  baseCost: number,
  quality?: PartQuality
): number {
  const multiplier = getQualityRepairCostMultiplier(quality ?? DEFAULT_UNIT_QUALITY);
  return Math.ceil(baseCost * multiplier);
}

/**
 * Calculate the target number for a repair check.
 *
 * repairTN = techSkillValue + qualityTNModifier + otherModifiers
 *
 * Lower TN is easier. Quality A adds +3 (harder), F adds -2 (easier).
 * Without a tech skill value, uses the base TN of 8 (average difficulty).
 */
export function calculateRepairTargetNumber(
  techSkillValue: number,
  quality?: PartQuality,
  additionalModifiers: number = 0
): number {
  const qualityMod = QUALITY_TN_MODIFIER[quality ?? DEFAULT_UNIT_QUALITY];
  return techSkillValue + qualityMod + additionalModifiers;
}
