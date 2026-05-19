/**
 * Refit Pipeline — order creation, validation gate, and hour advancement
 *
 * Pure functions, no IO. The pipeline owns the `IRefitOrder` lifecycle:
 *
 *   - `createRefitOrder` — build a `proposed` order with a fixed estimate
 *   - `advanceRefitOrder` — gate `proposed → in-progress` on construction
 *     validation (design D4); an invalid target keeps the order `proposed`
 *     and surfaces the validation errors
 *   - `applyRefitHours` — advance an `in-progress` order by a day's
 *     tech-hours, completing it when the hour budget is met (design D5)
 *
 * The construction-validation gate reuses the existing
 * `validateConstruction` from `construction-rules-core` — refit never
 * reimplements construction.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/refit/refitPipeline
 */

import type { IRefitOrder } from '@/types/campaign/Refit';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { validateConstruction } from '@/utils/construction/constructionRules/validation';

import { estimateRefit } from './refitEstimator';

// =============================================================================
// Daily Tech-Hour Budget
// =============================================================================

/**
 * Default tech-hours a campaign's tech pool can dedicate to refit work in
 * one day.
 *
 * Per design D5 and the "tech-hour budget sharing" open question, refit
 * shares the campaign tech pool with repair work; the agreed default is
 * "repairs first, refits consume the remainder". This constant is the
 * per-day refit allowance — callers that have a live remainder pass it
 * explicitly to `applyRefitHours`.
 */
export const DEFAULT_DAILY_REFIT_HOURS = 8;

// =============================================================================
// Order Creation
// =============================================================================

/**
 * Parameters for creating a refit order.
 */
export interface ICreateRefitOrderParams {
  /** Stable order id (caller-supplied for determinism / testability). */
  readonly id: string;
  /** The owned campaign unit being refit. */
  readonly unitId: string;
  /** The unit's current configuration. */
  readonly currentConfiguration: MechBuildConfig;
  /** The desired target configuration. */
  readonly targetConfiguration: MechBuildConfig;
  /** Creation timestamp (ISO 8601). */
  readonly createdAt: string;
}

/**
 * Create a `proposed` refit order with a fixed estimate.
 *
 * The refit class, cost, and hours are computed from the diff between the
 * current and target configurations and fixed on the order — they do not
 * change after creation (design D3). The order starts at `proposed`; it
 * must pass `advanceRefitOrder` to begin consuming tech-hours.
 *
 * @param params - the order parameters
 * @returns a freshly created `proposed` refit order
 */
export function createRefitOrder(params: ICreateRefitOrderParams): IRefitOrder {
  const estimate = estimateRefit(
    params.currentConfiguration,
    params.targetConfiguration,
  );

  return {
    id: params.id,
    unitId: params.unitId,
    targetConfiguration: params.targetConfiguration,
    refitClass: estimate.refitClass,
    estimatedCost: estimate.estimatedCost,
    estimatedHours: estimate.estimatedHours,
    hoursCompleted: 0,
    status: 'proposed',
    createdAt: params.createdAt,
  };
}

// =============================================================================
// Construction Validation Gate
// =============================================================================

/**
 * Result of attempting to advance a refit order from `proposed`.
 */
export interface IRefitAdvanceResult {
  /** The order after the advance attempt. */
  readonly order: IRefitOrder;
  /** True when the target passed validation and the order advanced. */
  readonly advanced: boolean;
  /** Construction-validation errors when the advance was blocked. */
  readonly errors: readonly string[];
}

/**
 * Attempt to advance a `proposed` refit order to `in-progress`.
 *
 * The advance is gated on the order's `targetConfiguration` passing the
 * existing `construction-rules-core` validation (design D4):
 *
 *   - a valid target → status becomes `in-progress`, `validationErrors`
 *     cleared
 *   - an invalid target → status stays `proposed`, `validationErrors`
 *     carries the construction-validation errors
 *
 * Advancing an order that is not `proposed` is a no-op — the order is
 * returned unchanged with `advanced: false`.
 *
 * @param order - the order to advance
 * @returns the advance result
 */
export function advanceRefitOrder(order: IRefitOrder): IRefitAdvanceResult {
  if (order.status !== 'proposed') {
    return { order, advanced: false, errors: [] };
  }

  const result = validateConstruction(order.targetConfiguration);

  if (!result.isValid) {
    return {
      order: {
        ...order,
        status: 'proposed',
        validationErrors: result.errors,
      },
      advanced: false,
      errors: result.errors,
    };
  }

  // Valid target — advance and clear any stale validation errors.
  const { validationErrors: _cleared, ...rest } = order;
  void _cleared;
  return {
    order: {
      ...rest,
      status: 'in-progress',
    },
    advanced: true,
    errors: [],
  };
}

// =============================================================================
// Hour Advancement
// =============================================================================

/**
 * Result of applying a day's tech-hours to a refit order.
 */
export interface IRefitHourResult {
  /** The order after the hours were applied. */
  readonly order: IRefitOrder;
  /** True when this application completed the refit. */
  readonly completed: boolean;
  /** Tech-hours actually consumed (never more than the remaining budget). */
  readonly hoursConsumed: number;
}

/**
 * Advance an `in-progress` refit order by a day's available tech-hours.
 *
 * `hoursCompleted` increases by `availableHours`, capped at
 * `estimatedHours`. When `hoursCompleted` reaches `estimatedHours` the
 * order status flips to `completed`. An order that is not `in-progress`
 * is returned unchanged.
 *
 * @param order - the order to advance
 * @param availableHours - tech-hours available for refit work this day
 * @returns the hour-application result
 */
export function applyRefitHours(
  order: IRefitOrder,
  availableHours: number,
): IRefitHourResult {
  if (order.status !== 'in-progress') {
    return { order, completed: false, hoursConsumed: 0 };
  }

  const remaining = Math.max(0, order.estimatedHours - order.hoursCompleted);
  const hoursConsumed = Math.max(0, Math.min(availableHours, remaining));
  const nextHoursCompleted = order.hoursCompleted + hoursConsumed;
  const completed = nextHoursCompleted >= order.estimatedHours;

  return {
    order: {
      ...order,
      hoursCompleted: nextHoursCompleted,
      status: completed ? 'completed' : 'in-progress',
    },
    completed,
    hoursConsumed,
  };
}
