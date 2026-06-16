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
 * The mapping is deterministic and total — every code maps to exactly
 * one of `'movement' | 'damage' | 'heat' | 'recovery'`. Implemented as
 * an exhaustive switch so adding a new `PSRTrigger` member fails the
 * typechecker until it's categorised.
 *
 * @spec openspec/specs/piloting-skill-rolls/spec.md
 *   Requirement: PSR Reason Category Bucket Helper
 */
export function getPSRReasonCategory(code: PSRTrigger): PSRReasonCategory {
  switch (code) {
    // Damage bucket
    case PSRTrigger.PhaseDamage20Plus:
    case PSRTrigger.LegDamage:
    case PSRTrigger.HipActuatorDestroyed:
    case PSRTrigger.GyroHit:
    case PSRTrigger.EngineHit:
    case PSRTrigger.UpperLegActuatorHit:
    case PSRTrigger.LowerLegActuatorHit:
    case PSRTrigger.FootActuatorHit:
      return 'damage';

    // Movement bucket — physical attack target/miss + terrain + system
    case PSRTrigger.Kicked:
    case PSRTrigger.Charged:
    case PSRTrigger.DFATarget:
    case PSRTrigger.Pushed:
    case PSRTrigger.DominoEffect:
    case PSRTrigger.KickMiss:
    case PSRTrigger.ChargeMiss:
    case PSRTrigger.DFAMiss:
    case PSRTrigger.EnteringRubble:
    case PSRTrigger.RunningRoughTerrain:
    case PSRTrigger.MovingOnIce:
    case PSRTrigger.EnteringWater:
    case PSRTrigger.ExitingWater:
    case PSRTrigger.Skidding:
    case PSRTrigger.SwampBogDown:
    case PSRTrigger.AirMekLanding:
    case PSRTrigger.RunningDamagedHip:
    case PSRTrigger.RunningDamagedGyro:
    case PSRTrigger.ControlledSideslip:
    case PSRTrigger.FlankingAndTurning:
    case PSRTrigger.OutOfControl:
    case PSRTrigger.BuildingCollapse:
    case PSRTrigger.MASCFailure:
    case PSRTrigger.SuperchargerFailure:
      return 'movement';

    // Heat bucket
    case PSRTrigger.Shutdown:
      return 'heat';

    // Recovery bucket
    case PSRTrigger.StandingUp:
      return 'recovery';

    default: {
      // Exhaustiveness check — a new PSRTrigger member that lacks a
      // category mapping fails the typechecker on this line.
      const exhaustive: never = code;
      throw new Error(
        `getPSRReasonCategory: unhandled PSRTrigger value ${String(exhaustive)}`,
      );
    }
  }
}
