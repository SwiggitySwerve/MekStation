/**
 * Combat Outcome Model
 *
 * Canonical, campaign-consumable hand-off shape produced when a tactical
 * `IGameSession` completes. `ICombatOutcome` supersedes `IPostBattleReport`
 * as the persisted result of a finished match: it carries every fact the
 * campaign layer (XP awards, repair pipeline, contract resolution, pilot
 * roster updates) needs to advance state without re-deriving from the raw
 * event log.
 *
 * The shape composes the existing `IPostBattleReport` (Phase 1) under
 * `report` rather than duplicating its fields, so the UI's after-action
 * screen keeps working unchanged. New campaign-specific data lives on
 * the outer outcome and on the per-unit `IUnitCombatDelta` array.
 *
 * @spec openspec/changes/add-combat-outcome-model/specs/after-combat-report/spec.md
 */

import type { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

/**
 * Schema version literal — bump on any breaking change to `ICombatOutcome`
 * or its child interfaces. Stored consumers compare this against
 * `COMBAT_OUTCOME_VERSION` to detect incompatible payloads (see
 * `assertCombatOutcomeCurrent`).
 */
export type CombatOutcomeVersion = 1;

/** Current schema version stamped on every freshly derived outcome. */
export const COMBAT_OUTCOME_VERSION: CombatOutcomeVersion = 1;

/**
 * Reason a tactical session ended. Mirrors the union used on
 * `IGameEndedPayload.reason` plus an explicit `WITHDRAWAL` value so
 * Phase 3 retreat resolution maps cleanly onto the campaign layer.
 */
export enum CombatEndReason {
  Destruction = 'destruction',
  Concede = 'concede',
  TurnLimit = 'turn_limit',
  ObjectiveMet = 'objective',
  Withdrawal = 'withdrawal',
}

/**
 * High-level damage classification for a unit at end of combat. Drives
 * salvage / repair routing in the campaign processors.
 */
export enum UnitFinalStatus {
  Intact = 'intact',
  Damaged = 'damaged',
  Crippled = 'crippled',
  Destroyed = 'destroyed',
  Ejected = 'ejected',
}

/**
 * Final pilot disposition. Drives roster updates, medical queue,
 * capture / MIA handling.
 */
export enum PilotFinalStatus {
  Active = 'active',
  Wounded = 'wounded',
  Unconscious = 'unconscious',
  KIA = 'kia',
  MIA = 'mia',
  Captured = 'captured',
}

/**
 * Per-unit combat-state delta the campaign layer consumes to update
 * persisted unit state, allocate repair work, and credit damage.
 *
 * All map fields are keyed by location string ('LT', 'CT', etc.) and
 * carry the *remaining* value at the moment the session closed. A
 * caller that wants "lost armor" computes
 * `initialArmor[loc] - armorRemaining[loc]`.
 */
export interface IUnitCombatDelta {
  /** Stable unit identifier from `IGameUnit.id`. */
  readonly unitId: string;
  /** Side the unit fought on. */
  readonly side: GameSide;
  /** True if the unit was destroyed during the session. */
  readonly destroyed: boolean;
  /** Coarse status used by salvage / repair routing. */
  readonly finalStatus: UnitFinalStatus;
  /** Armor remaining per location at end of combat. */
  readonly armorRemaining: Readonly<Record<string, number>>;
  /** Internal structure remaining per location at end of combat. */
  readonly internalsRemaining: Readonly<Record<string, number>>;
  /** Locations whose internals reached zero. */
  readonly destroyedLocations: readonly string[];
  /** Component IDs / names destroyed by criticals (engine, gyro, weapons, ...). */
  readonly destroyedComponents: readonly string[];
  /** Heat reading at session end (post heat phase). */
  readonly heatEnd: number;
  /** Ammo bin remaining-rounds, keyed by binId. */
  readonly ammoRemaining: Readonly<Record<string, number>>;
  /**
   * Pilot state snapshot used by the campaign roster pipeline.
   *
   * @remarks
   * **Wave 4 limitation — `PilotFinalStatus.KIA` is currently unreachable.**
   *
   * The KIA derivation lives at `src/lib/combat/outcome/combatOutcome.ts:128-133`
   * (`computePilotFinalStatus` returns KIA only when `state.destroyed &&
   * !state.pilotConscious`). However, no engine event in Wave 4 flips
   * `pilotConscious=false` — the consciousness-roll path was never wired
   * end-to-end into the session reducer. Consequence: a destroyed unit will
   * surface `finalStatus: 'INJURED'` (or similar) rather than `'KIA'`, even
   * when narratively the pilot should be killed.
   *
   * Downstream consumers (post-battle-review-ui, repair-queue-integration,
   * roster processors) MUST plan around this limitation rather than rely on
   * KIA-driven branching until Wave-5 pilot-event wiring lands.
   *
   * **Unblock dependency:** the Wave-5 pilot-event wiring change (folded
   * into `wire-interactive-psr-integration` if pilot consciousness events
   * are routed through the PSR queue, otherwise authored as a standalone
   * `wire-pilot-consciousness-events` change). When that lands, this
   * `@remarks` block should be removed and the KIA path documented as
   * fully reachable.
   *
   * @see openspec/changes/tier5-audit-cleanup/specs/combat-resolution/spec.md
   */
  readonly pilotState: {
    readonly conscious: boolean;
    readonly wounds: number;
    readonly killed: boolean;
    readonly finalStatus: PilotFinalStatus;
  };
}

/**
 * Top-level combat outcome. Composes the existing Phase 1
 * `IPostBattleReport` under `report` and adds the per-unit deltas plus
 * scenario / contract linkage that Phase 3 wiring (Wave 5) populates.
 */
export interface ICombatOutcome {
  /** Stamped to `COMBAT_OUTCOME_VERSION` at derivation time. */
  readonly version: CombatOutcomeVersion;
  /** Match / session ID — same string as `IGameSession.id`. */
  readonly matchId: string;
  /**
   * Campaign contract this match resolved, when available. Null when
   * the session was a one-off skirmish or before Wave 5 wiring populates
   * it.
   */
  readonly contractId: string | null;
  /**
   * Scenario instance this match represents, when available. Null until
   * Wave 5 wiring populates it.
   */
  readonly scenarioId: string | null;
  /** End reason normalized to the `CombatEndReason` enum. */
  readonly endReason: CombatEndReason;
  /** Composed Phase 1 after-action report (UI-compatible). */
  readonly report: IPostBattleReport;
  /** Per-unit campaign-facing deltas. */
  readonly unitDeltas: readonly IUnitCombatDelta[];
  /** ISO-8601 timestamp captured when the outcome was derived. */
  readonly capturedAt: string;
}

/**
 * Thrown by `assertCombatOutcomeCurrent` when a stored outcome's
 * `version` does not match `COMBAT_OUTCOME_VERSION`. Consumers SHOULD
 * route the original payload through a migration before retrying.
 */
export class UnsupportedCombatOutcomeVersionError extends Error {
  public readonly actualVersion: number;
  public readonly expectedVersion: CombatOutcomeVersion;

  constructor(actualVersion: number) {
    super(
      `Unsupported ICombatOutcome version ${actualVersion}; ` +
        `expected ${COMBAT_OUTCOME_VERSION}.`,
    );
    this.name = 'UnsupportedCombatOutcomeVersionError';
    this.actualVersion = actualVersion;
    this.expectedVersion = COMBAT_OUTCOME_VERSION;
  }
}

/**
 * Thrown by `InteractiveSession.getOutcome()` when called before the
 * session has reached `GameStatus.Completed`. Keeps the contract that
 * outcomes are only meaningful for finished matches.
 */
export class CombatNotCompleteError extends Error {
  constructor(
    message = 'Cannot derive combat outcome: session is not Completed.',
  ) {
    super(message);
    this.name = 'CombatNotCompleteError';
  }
}

/**
 * Validate that a stored outcome matches the current schema version.
 * Throws `UnsupportedCombatOutcomeVersionError` on mismatch.
 */
export function assertCombatOutcomeCurrent(outcome: {
  readonly version: number;
}): asserts outcome is ICombatOutcome {
  if (outcome.version !== COMBAT_OUTCOME_VERSION) {
    throw new UnsupportedCombatOutcomeVersionError(outcome.version);
  }
}
