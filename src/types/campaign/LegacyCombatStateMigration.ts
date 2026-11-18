/**
 * Legacy session-keyed combat-state migration (T1).
 *
 * Saves written before the launch manifest existed hold `unitCombatStates`
 * entries under session unit ids (`player-1-atlas-as7-d`). The migration
 * re-applies the retained deltas under the roster unit, keeps every
 * original in a quarantine record OUTSIDE the campaign payload, and flags
 * what it could not explain.
 */

import type { IUnitCombatDelta } from '../combat/CombatOutcome';
import type { IUnitCombatState } from './UnitCombatState';

/** Why a player session-keyed entry was left for the user instead of migrated. */
export type LegacyCombatStateFlagReason =
  /** Re-applying its retained deltas does not rebuild the stored entry. */
  | 'not-fully-explained'
  /** A delta matches more than one roster unit, or none. */
  | 'ambiguous-roster-unit'
  /** The only candidate unit's current pilot is not the pilot who fought. */
  | 'conflicting-pilot'
  /** The roster unit already holds combat state of its own. */
  | 'roster-unit-has-state'
  /** It shares a roster unit with another entry that could not migrate. */
  | 'shares-roster-unit-with-flagged-entry';

/**
 * The visible flag the campaign payload carries (small; the original
 * state lives in the quarantine store). Kept until the user dismisses it.
 */
export interface ILegacyCombatStateFlag {
  /**
   * `combat-state`: a stored session-keyed state the load migration could
   * not attribute. `unapplied-delta`: a battle's player delta the apply
   * could not attribute, so it was written to no unit.
   */
  readonly kind: 'combat-state' | 'unapplied-delta';
  readonly sessionUnitId: string;
  readonly reason: LegacyCombatStateFlagReason;
  /** Roster units the entry could belong to, when known. */
  readonly candidateRosterUnitIds: readonly string[];
  /** Applied battles whose retained deltas carry this session unit id. */
  readonly matchIds: readonly string[];
}

/** How one delta was matched to its roster unit. */
export type LegacyRosterEvidence = 'force' | 'pilot' | 'design';

export interface ILegacyCombatStateTarget {
  readonly matchId: string;
  readonly rosterUnitId: string;
  readonly evidence: LegacyRosterEvidence;
}

export type LegacyCombatStateResolution =
  | {
      readonly kind: 'migrated';
      readonly targets: readonly ILegacyCombatStateTarget[];
    }
  | {
      readonly kind: 'flagged';
      readonly flag: ILegacyCombatStateFlag;
    };

/** One original, stored outside the campaign payload. */
export type ILegacyCombatStateQuarantineRecord =
  | {
      /** A stored session-keyed combat state, migrated or flagged. */
      readonly source: 'combat-state';
      readonly campaignId: string;
      readonly sessionUnitId: string;
      readonly original: IUnitCombatState;
      readonly resolution: LegacyCombatStateResolution;
      /** Wall-clock instant the migration ran. */
      readonly migratedAt: string;
    }
  | {
      /** A battle's player delta that was written to no unit. */
      readonly source: 'unapplied-delta';
      readonly campaignId: string;
      readonly sessionUnitId: string;
      readonly matchId: string;
      readonly delta: IUnitCombatDelta;
      readonly flag: ILegacyCombatStateFlag;
    };

/** A quarantined session-keyed combat state (the load migration's record). */
export type ILegacyCombatStateRecord = Extract<
  ILegacyCombatStateQuarantineRecord,
  { readonly source: 'combat-state' }
>;

/** A player delta the apply wrote to no unit (the apply's record). */
export type IUnappliedDeltaQuarantineRecord = Extract<
  ILegacyCombatStateQuarantineRecord,
  { readonly source: 'unapplied-delta' }
>;

/** One pending record per battle and session unit. */
export function pendingQuarantineKey(
  record: IUnappliedDeltaQuarantineRecord,
): string {
  return `${record.matchId}|${record.sessionUnitId}`;
}

/** Flags are one per kind, session unit and battle set. */
export function legacyCombatStateFlagKey(flag: ILegacyCombatStateFlag): string {
  return [flag.kind, flag.sessionUnitId, ...flag.matchIds].join('|');
}
