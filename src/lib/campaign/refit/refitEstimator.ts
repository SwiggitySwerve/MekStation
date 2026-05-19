/**
 * Refit Estimator — cost and tech-hours for a refit
 *
 * Pure functions, no IO. `estimateRefit` computes a refit's C-bill cost
 * and tech-hours from the configuration diff and a per-`RefitClass`
 * multiplier, mirroring `repairQueueBuilder`'s hour-table approach
 * (design D3). The estimate is deterministic for a given diff so it can
 * be fixed when the order is committed.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/refit/refitEstimator
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { RefitClass } from '@/types/campaign/Refit';

import { classifyRefit, diffConfigurations } from './refitClassifier';

// =============================================================================
// Estimation Constants
// =============================================================================

/**
 * Base tech-hours charged per refit, before per-class multiplication and
 * per-changed-field hours. A floor so even a trivial swap takes real time.
 */
const BASE_REFIT_HOURS = 8;

/** Tech-hours added per changed configuration field. */
const HOURS_PER_CHANGED_FIELD = 12;

/**
 * Base C-bill cost charged per refit, before per-class multiplication and
 * per-changed-field cost.
 */
const BASE_REFIT_COST = 25_000;

/** C-bill cost added per changed configuration field. */
const COST_PER_CHANGED_FIELD = 60_000;

/**
 * Per-`RefitClass` multipliers applied to both hours and cost. A heavier
 * class always multiplies higher so a chassis conversion always exceeds an
 * equipment swap on comparable units (spec: "A heavier refit class costs
 * more").
 */
const CLASS_MULTIPLIER: Readonly<Record<RefitClass, number>> = {
  [RefitClass.EquipmentSwap]: 1,
  [RefitClass.VariantUpgrade]: 3,
  [RefitClass.ChassisConversion]: 8,
};

// =============================================================================
// Estimate Result
// =============================================================================

/**
 * The result of estimating a refit — a classified class plus its fixed
 * cost and hour budget.
 */
export interface IRefitEstimate {
  /** The classified refit class. */
  readonly refitClass: RefitClass;
  /** Estimated C-bill cost. */
  readonly estimatedCost: number;
  /** Estimated tech-hours. */
  readonly estimatedHours: number;
  /** Count of configuration fields that changed (drives the estimate). */
  readonly changedFieldCount: number;
}

// =============================================================================
// Estimation
// =============================================================================

/**
 * Count how many configuration fields changed between two builds. Drives
 * the per-field component of the estimate.
 */
function countChangedFields(
  current: MechBuildConfig,
  target: MechBuildConfig,
): number {
  const diff = diffConfigurations(current, target);
  let count = 0;
  if (diff.engineChanged) count += 1;
  if (diff.structureChanged) count += 1;
  if (diff.tonnageChanged) count += 1;
  if (diff.armorChanged) count += 1;
  if (diff.heatSinkChanged) count += 1;
  if (diff.jumpChanged) count += 1;
  if (diff.equipmentChanged) count += 1;
  return count;
}

/**
 * Estimate a refit's cost and tech-hours from the diff between the unit's
 * current configuration and the target.
 *
 * The estimate is `(base + perField × changedFields) × classMultiplier`
 * for both hours and cost, rounded to whole units. It is a pure function
 * of the two configurations — calling it twice with the same inputs
 * yields identical output (spec: "Estimation is deterministic").
 *
 * @param current - the unit's current configuration
 * @param target - the desired target configuration
 * @returns the classified refit class plus its fixed cost and hour budget
 */
export function estimateRefit(
  current: MechBuildConfig,
  target: MechBuildConfig,
): IRefitEstimate {
  const refitClass = classifyRefit(current, target);
  const changedFieldCount = countChangedFields(current, target);
  const multiplier = CLASS_MULTIPLIER[refitClass];

  const estimatedHours = Math.round(
    (BASE_REFIT_HOURS + HOURS_PER_CHANGED_FIELD * changedFieldCount) *
      multiplier,
  );
  const estimatedCost = Math.round(
    (BASE_REFIT_COST + COST_PER_CHANGED_FIELD * changedFieldCount) * multiplier,
  );

  return {
    refitClass,
    estimatedCost,
    estimatedHours,
    changedFieldCount,
  };
}
