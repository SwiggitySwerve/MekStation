/**
 * Refit Order Model — campaign equipment-swap / variant / chassis refit
 *
 * An `IRefitOrder` describes a target configuration for an owned campaign
 * unit, modelled on the repair-ticket pipeline: it carries an hour budget
 * (`estimatedHours`) consumed per day by the refit processor and a status
 * lifecycle (`proposed → in-progress → completed`, plus `cancelled`).
 *
 * Refit deliberately reuses — never reimplements — the existing
 * construction validation. A `proposed` order only advances to
 * `in-progress` once its `targetConfiguration` passes
 * `validateConstruction` (see `add-campaign-refit-and-prestige` design D4).
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module types/campaign/Refit
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

// =============================================================================
// Refit Class
// =============================================================================

/**
 * Difficulty / scope class of a refit, graded by how disruptive the change
 * is. The classifier (`classifyRefit`) returns the least-disruptive class
 * that covers the diff between the unit's current and target configuration.
 *
 * - `EquipmentSwap` — swap mounted items, same chassis/variant; cheap, fast
 * - `VariantUpgrade` — change armour / heat-sink loadout to a known variant
 *   of the same chassis; moderate cost and time
 * - `ChassisConversion` — structural change (engine, internal structure);
 *   expensive and slow
 */
export enum RefitClass {
  EquipmentSwap = 'equipment-swap',
  VariantUpgrade = 'variant-upgrade',
  ChassisConversion = 'chassis-conversion',
}

/**
 * Ordered list of refit classes, cheapest first. Used by `classifyRefit`
 * to express "the least-disruptive covering class".
 */
export const REFIT_CLASS_ORDER: readonly RefitClass[] = [
  RefitClass.EquipmentSwap,
  RefitClass.VariantUpgrade,
  RefitClass.ChassisConversion,
];

/**
 * Lifecycle status of a refit order.
 *
 * - `proposed` — created, not yet validated against construction rules
 * - `in-progress` — construction-validated, tech-hours being consumed
 * - `completed` — hour budget met, target configuration applied
 * - `cancelled` — abandoned by the player before completion
 */
export type RefitStatus =
  | 'proposed'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

// =============================================================================
// Refit Order
// =============================================================================

/**
 * A refit order for an owned campaign unit.
 *
 * The `targetConfiguration` is the full target unit build — produced by
 * the existing construction tooling, not by refit. `estimatedCost` and
 * `estimatedHours` are fixed when the order is committed (see design D3);
 * `hoursCompleted` advances each day until it reaches `estimatedHours`.
 */
export interface IRefitOrder {
  /** Unique identifier for this refit order. */
  readonly id: string;

  /** The owned campaign unit being refit. */
  readonly unitId: string;

  /**
   * The full target unit configuration the refit converts the unit to.
   * Stored as a `MechBuildConfig` so the construction-validation gate can
   * run against it directly.
   */
  readonly targetConfiguration: MechBuildConfig;

  /** Classified scope of the refit. */
  readonly refitClass: RefitClass;

  /** Estimated C-bill cost, fixed at commit time. */
  readonly estimatedCost: number;

  /** Estimated tech-hours, fixed at commit time. */
  readonly estimatedHours: number;

  /** Tech-hours consumed so far by the refit processor. */
  readonly hoursCompleted: number;

  /** Current lifecycle status. */
  readonly status: RefitStatus;

  /** Creation timestamp (ISO 8601). */
  readonly createdAt: string;

  /**
   * Construction-validation errors surfaced when a `proposed → in-progress`
   * advance was blocked by an invalid target (design D4). Absent on a
   * valid order.
   */
  readonly validationErrors?: readonly string[];
}
