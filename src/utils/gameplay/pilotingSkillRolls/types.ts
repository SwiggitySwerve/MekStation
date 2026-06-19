/**
 * Piloting Skill Rolls (PSR) - Shared Types
 * Type definitions for PSR results, modifiers, and triggers.
 */

import type { IPendingPSR } from '@/types/gameplay/GameSessionInterfaces';

// PR E (`structure-psr-reason-as-discriminated-code`): the `PSRTrigger`
// enum was moved to `src/types/gameplay/PSRTriggerCodes.ts` so
// `GameSessionInterfaces.ts` can reference it for the new
// `IPSRTriggeredPayload.reasonCode` / `IPSRResolvedPayload.reasonCode` /
// `IUnitFellPayload.reasonCode` fields without forming a cycle. Re-exported
// here for backward-compat with existing callers (factories,
// `resolution.ts`, tests) that import from `./types`.
import { PSRTrigger } from '@/types/gameplay/PSRTriggerCodes';

export { PSRTrigger };

/**
 * Result of a single PSR resolution.
 */
export interface IPSRResult {
  /** The pending PSR that was resolved */
  readonly psr: IPendingPSR;
  /** Target number (piloting skill + all modifiers) */
  readonly targetNumber: number;
  /** The 2d6 roll result */
  readonly roll: number;
  /** Individual dice */
  readonly dice: readonly number[];
  /** Whether the PSR passed (roll >= targetNumber) */
  readonly passed: boolean;
  /** Breakdown of all modifiers applied */
  readonly modifiers: readonly IPSRModifier[];
}

/**
 * A single modifier applied to a PSR.
 */
export interface IPSRModifier {
  readonly name: string;
  readonly value: number;
  readonly source: string;
}

/**
 * Result of resolving all pending PSRs for a unit.
 */
export interface IPSRBatchResult {
  /** Individual PSR results (only those actually rolled) */
  readonly results: readonly IPSRResult[];
  /** Whether any PSR failed (unit falls) */
  readonly unitFell: boolean;
  /** Whether any PSR failed by making the unit stuck instead of fallen */
  readonly unitStuck?: boolean;
  /** First failed PSR result, when a failure stopped the batch */
  readonly failedResult?: IPSRResult;
  /** PSRs that were cleared without rolling (due to first-failure-clears rule) */
  readonly clearedPSRs: readonly IPendingPSR[];
}

/**
 * Per `structure-psr-reason-as-discriminated-code` (PR E): the four
 * coarse buckets that partition the 27-code `PSRTrigger` taxonomy.
 * Consumers (the readable formatter, metrics aggregators) bucket PSRs
 * by category instead of enumerating all 27 codes.
 *
 * @spec openspec/specs/piloting-skill-rolls/spec.md
 *   Requirement: PSR Reason Category Bucket Helper
 */
export type PSRReasonCategory = 'movement' | 'damage' | 'heat' | 'recovery';

/**
 * Map a `PSRTrigger` value to its `PSRReasonCategory` bucket.
 *
 * The mapping is deterministic and total; every code maps to exactly
 * one of `'movement' | 'damage' | 'heat' | 'recovery'`. The lookup table
 * satisfies `Record<PSRTrigger, PSRReasonCategory>` so adding a new
 * `PSRTrigger` member fails the typechecker until it's categorised.
 *
 * @spec openspec/specs/piloting-skill-rolls/spec.md
 *   Requirement: PSR Reason Category Bucket Helper
 */
const PSR_REASON_CATEGORY_BY_TRIGGER = {
  [PSRTrigger.PhaseDamage20Plus]: 'damage',
  [PSRTrigger.LegDamage]: 'damage',
  [PSRTrigger.HipActuatorDestroyed]: 'damage',
  [PSRTrigger.GyroHit]: 'damage',
  [PSRTrigger.EngineHit]: 'damage',
  [PSRTrigger.UpperLegActuatorHit]: 'damage',
  [PSRTrigger.LowerLegActuatorHit]: 'damage',
  [PSRTrigger.FootActuatorHit]: 'damage',

  [PSRTrigger.Kicked]: 'movement',
  [PSRTrigger.Charged]: 'movement',
  [PSRTrigger.DFATarget]: 'movement',
  [PSRTrigger.Pushed]: 'movement',
  [PSRTrigger.DominoEffect]: 'movement',
  [PSRTrigger.KickMiss]: 'movement',
  [PSRTrigger.ChargeMiss]: 'movement',
  [PSRTrigger.DFAMiss]: 'movement',
  [PSRTrigger.EnteringRubble]: 'movement',
  [PSRTrigger.RunningRoughTerrain]: 'movement',
  [PSRTrigger.MovingOnIce]: 'movement',
  [PSRTrigger.EnteringWater]: 'movement',
  [PSRTrigger.ExitingWater]: 'movement',
  [PSRTrigger.Skidding]: 'movement',
  [PSRTrigger.SwampBogDown]: 'movement',
  [PSRTrigger.AirMekLanding]: 'movement',
  [PSRTrigger.RunningDamagedHip]: 'movement',
  [PSRTrigger.RunningDamagedGyro]: 'movement',
  [PSRTrigger.ControlledSideslip]: 'movement',
  [PSRTrigger.FlankingAndTurning]: 'movement',
  [PSRTrigger.OutOfControl]: 'movement',
  [PSRTrigger.BuildingCollapse]: 'movement',
  [PSRTrigger.MASCFailure]: 'movement',
  [PSRTrigger.SuperchargerFailure]: 'movement',

  [PSRTrigger.Shutdown]: 'heat',
  [PSRTrigger.StandingUp]: 'recovery',
} as const satisfies Readonly<Record<PSRTrigger, PSRReasonCategory>>;

export function getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory {
  return PSR_REASON_CATEGORY_BY_TRIGGER[code];
}
