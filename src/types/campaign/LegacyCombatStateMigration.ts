/**
 * Legacy session-keyed combat-state migration (T1).
 *
 * Saves written before the launch manifest existed hold `unitCombatStates`
 * entries under session unit ids (`player-1-atlas-as7-d`). Legacy damage is
 * never attributed to a roster unit (owner ruling PARITY-PLAN §186.4): the
 * migration removes each player entry from the payload, keeps the original
 * in a quarantine record OUTSIDE the campaign payload, and flags it.
 */

import type { IUnitCombatDelta } from '../combat/CombatOutcome';
import type { IUnitCombatState } from './UnitCombatState';

/** Why damage was written to no roster unit. */
export type LegacyCombatStateFlagReason =
  /**
   * Legacy damage: an older save's session-keyed entry, or a battle delta
   * with no launch-manifest entry. Never attributed (§186.4).
   */
  | 'legacy-not-attributed'
  /** The launch could not tell which roster unit fought (unresolved entry). */
  | 'ambiguous-roster-unit';

/**
 * The visible flag the campaign payload carries (small; the original
 * state lives in the quarantine store). Kept until the user dismisses it.
 */
export interface ILegacyCombatStateFlag {
  /**
   * `combat-state`: a stored session-keyed state the load migration removed
   * and never attributed. `unapplied-delta`: a battle's player delta the
   * apply wrote to no unit.
   */
  readonly kind: 'combat-state' | 'unapplied-delta';
  /**
   * The device (`getDeviceId()`) holding the CONFIRMED quarantine copy.
   * Absent while the copy is pending, and on flags recorded before it.
   */
  readonly quarantinedOnDeviceId?: string;
  readonly sessionUnitId: string;
  readonly reason: LegacyCombatStateFlagReason;
  /** Roster units the entry could belong to, when known. */
  readonly candidateRosterUnitIds: readonly string[];
  /** Applied battles whose retained deltas carry this session unit id. */
  readonly matchIds: readonly string[];
}

export const LEGACY_NOT_ATTRIBUTED_NOTE =
  'not attributed: legacy, owner ruling PARITY-PLAN §186.4';

/** What the migration did with a quarantined entry: never attributed it. */
export interface ILegacyCombatStateResolution {
  readonly kind: 'not-attributed';
  readonly note: typeof LEGACY_NOT_ATTRIBUTED_NOTE;
  readonly flag: ILegacyCombatStateFlag;
}

/** One original, stored outside the campaign payload. */
export type ILegacyCombatStateQuarantineRecord =
  | {
      /** A stored session-keyed combat state, removed and flagged. */
      readonly source: 'combat-state';
      readonly campaignId: string;
      readonly sessionUnitId: string;
      readonly original: IUnitCombatState;
      readonly resolution: ILegacyCombatStateResolution;
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
