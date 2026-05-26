/**
 * Game session lifecycle event payloads
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import type { GamePhase, GameSide } from './GameSessionCoreTypes';
import type { IGameConfig, IGameUnit } from './GameSessionUnitTypes';

/**
 * Encounter snapshot stamped onto `IGameCreatedPayload.encounterMeta` at
 * session creation by `EncounterService.launchEncounter` (and the
 * pre-battle launch handlers). Snapshot semantics — once written, this
 * shape reflects what the encounter looked like AT LAUNCH; subsequent
 * encounter-row mutations (rename, force re-assignment, deletion) do
 * NOT alter historical replay rows.
 *
 * Read by `src/replay-library/backfill-scan.ts` when rebuilding the
 * manifest from disk so an Encounter row can render its encounter
 * name + template + force summaries without resolving any external
 * references (per design.md decision: "the manifest entry is a
 * snapshot — the source forces may have been deleted by the time the
 * user opens the replay").
 *
 * `templateType` is `null` for free-form / custom encounters where the
 * user did not apply one of the four `ScenarioTemplateType` presets;
 * the Library row falls back to the literal "Custom" label.
 *
 * `playerForceSummary` / `opponentSummary` are pre-rendered strings
 * (e.g. `"Lance Alpha (4500 BV, 4 units)"` or `"Generated Lance (~3000
 * BV)"`) — keeping them as strings means the Library row never needs a
 * formatter and stale force ids cannot break rendering.
 *
 * The field type uses `string | null` for `templateType` rather than
 * the typed `ScenarioTemplateType` enum so this interface stays
 * importable from contexts that don't pull in the encounter package
 * (e.g. the lifecycle event-builder). The actual runtime value is
 * always either a `ScenarioTemplateType` literal or `null`.
 */
export interface IEncounterMeta {
  readonly encounterId: string;
  readonly encounterName: string;
  readonly templateType: string | null;
  readonly playerForceSummary: string;
  readonly opponentSummary: string;
}

/**
 * Game created event payload.
 */
export interface IGameCreatedPayload {
  /** Game configuration */
  readonly config: IGameConfig;
  /** Participating units */
  readonly units: readonly IGameUnit[];
  /**
   * Per `link-encounters-to-replays` PR 3: encounter snapshot stamped at
   * session creation when the session originated from
   * `EncounterService.launchEncounter` (or a pre-battle launch handler
   * carrying an encounter context). Optional so non-encounter sessions
   * (swarm CLI runs, hot-seat quick games, raw `createGameSession`
   * callers) write nothing here. Read by the replay-library backfill
   * scan to recover the per-encounter fields when rebuilding the
   * manifest from disk.
   */
  readonly encounterMeta?: IEncounterMeta;
  /**
   * Per `add-scenario-objective-engine`: scenario objective markers
   * placed at generation time, keyed by canonical `"q,r"` hex key.
   * Carried on the seed event so `deriveState` can reconstruct the
   * objective map from the event log alone. Omitted for destruction-
   * only scenarios — an absent map behaves identically to today.
   */
  readonly objectives?: Record<string, IObjectiveMarker>;
}

/**
 * Game started event payload.
 */
export interface IGameStartedPayload {
  /** Starting player (who moves first in first turn) */
  readonly firstSide: GameSide;
}

/**
 * Game ended event payload.
 */
export interface IGameEndedPayload {
  /** Winning side */
  readonly winner: GameSide | 'draw';
  /** Reason for game end */
  readonly reason:
    | 'destruction'
    | 'concede'
    | 'turn_limit'
    | 'objective'
    | 'aborted';
  /**
   * Final turn count when the game ended. Optional for back-compat with
   * NDJSON event streams written before this field was populated.
   */
  readonly turns?: number;
}

/**
 * Turn started event payload.
 * Empty object for events that don't carry additional data.
 */
export interface ITurnStartedPayload {
  /** Intentionally empty - turn number is in the event base */
  readonly _type?: 'turn_started';
}

/**
 * Turn ended event payload.
 * Empty object for events that don't carry additional data.
 */
export interface ITurnEndedPayload {
  /** Intentionally empty - turn number is in the event base */
  readonly _type?: 'turn_ended';
}

/**
 * Phase changed event payload.
 */
export interface IPhaseChangedPayload {
  /** Previous phase */
  readonly fromPhase: GamePhase;
  /** New phase */
  readonly toPhase: GamePhase;
}

/**
 * Initiative rolled event payload.
 */
export interface IInitiativeRolledPayload {
  /** Player roll result (2d6) */
  readonly playerRoll: number;
  /** Opponent roll result (2d6) */
  readonly opponentRoll: number;
  /** Player-side initiative modifier from source-backed force bonuses. */
  readonly playerModifier?: number;
  /** Opponent-side initiative modifier from source-backed force bonuses. */
  readonly opponentModifier?: number;
  /** Player roll plus modifier, when a modifier was applied. */
  readonly playerTotal?: number;
  /** Opponent roll plus modifier, when a modifier was applied. */
  readonly opponentTotal?: number;
  /**
   * Side whose Tactical Genius SPA replaced its initial initiative roll.
   * `playerRoll` / `opponentRoll` remain the final raw 2d6 values.
   */
  readonly tacticalGeniusRerollSide?: GameSide;
  /** Initial player raw 2d6 before Tactical Genius replacement, when used. */
  readonly playerOriginalRoll?: number;
  /** Initial opponent raw 2d6 before Tactical Genius replacement, when used. */
  readonly opponentOriginalRoll?: number;
  /** Winner of initiative */
  readonly winner: GameSide;
  /** Did the winner choose to move first? */
  readonly movesFirst: GameSide;
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): every individual
   * d6 the server consumed to produce this event, in consumption order
   * (typically 4: player d6 + d6, opponent d6 + d6). OPTIONAL so legacy
   * single-player / hot-seat resolvers (which don't go through the
   * `RollCapture` wrapper) keep working without filling this in. The
   * multiplayer client renders dice straight from this array.
   */
  readonly rolls?: readonly number[];
}

/**
 * Explicit initiative order selected for the turn. `InitiativeRolled`
 * preserves dice/SPA audit details; this payload is the replayable turn-order
 * fact consumed by phase/activation state.
 */
export interface IInitiativeOrderSetPayload {
  /** Side that won the initiative roll. */
  readonly winner: GameSide;
  /** Side that acts first in alternating phases. */
  readonly firstMover: GameSide;
  /** Side that acts second in alternating phases. */
  readonly secondMover: GameSide;
}
