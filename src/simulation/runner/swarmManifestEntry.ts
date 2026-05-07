/**
 * Swarm manifest entry builder.
 *
 * Per `add-replay-library` PR 4 (replay-library spec — IReplayManifestEntry
 * Discriminated Union; quick-session spec — Per-Game Event Log Persistence
 * MODIFIED): every successful swarm run SHALL produce an
 * `ISwarmReplayManifestEntry` and append it to the central
 * `simulation-reports/replay-index.json` index. The fields are derived
 * from the run's IGameEvent log + a few caller-supplied bits that are
 * not on the events themselves (configName, runSeed, batchTimestamp).
 *
 * This module is the pure derivation function. Side effects (writing
 * the JSONL, calling `appendManifestEntry`) live at the call site in
 * `scripts/run-simulation.ts`. Keeping the derivation pure means we
 * can unit-test it without spinning up filesystem fixtures.
 *
 * `bvTotal` resolution (Momus MUST RESOLVE #1 from the design Council):
 *   IGameUnit has no `bv` field for cheap access — so the writer cannot
 *   sum from `GameCreated.payload.units`. The cleanest answer in the
 *   swarm-runner context is to use the actual force totals from the
 *   force generator (`force.stats.totalBV`), which the caller already
 *   has at hand. We expose `bvTotal` as a required argument so the
 *   caller threads it in explicitly — the helper does not guess.
 */

// `ISwarmReplayManifestEntry` lives in `@/replay-library`. The runtime
// imports from `@/types/gameplay` come through the gameplay barrel.
import type { ISwarmReplayManifestEntry } from '@/replay-library';

import {
  GameEventType,
  GameSide,
  ReplaySource,
  type IGameEndedPayload,
  type IGameEvent,
} from '@/types/gameplay';

/**
 * Inputs required to build an `ISwarmReplayManifestEntry`.
 *
 * `events` is the full result.events array. We walk it once to extract
 * `winner` (from `GameEnded`), `turns` (`GameEnded.turns` if present,
 * else count of `turn_started` events, else `0`).
 */
export interface IBuildSwarmManifestEntryInput {
  /** Game identifier — also the file basename (without `.jsonl`). */
  readonly gameId: string;
  /** RNG seed for THIS run (config.seed + i). */
  readonly runSeed: number;
  /** Swarm config file basename, no `.json` extension. */
  readonly configName: string;
  /**
   * Per-invocation timestamp string (ISO 8601 with `:` and `.` replaced
   * by `-`). Computed once per CLI invocation by the caller.
   */
  readonly batchTimestamp: string;
  /** Chronological event log produced by the runner. */
  readonly events: readonly IGameEvent[];
  /**
   * Sum of unit BVs for both sides (force.stats.totalBV from each
   * generated force). See module-level comment for why this is
   * caller-supplied rather than derived from the event log.
   */
  readonly bvTotal: number;
  /**
   * ISO 8601 timestamp at write time. Caller-supplied so tests can
   * pin a deterministic value; production callers pass
   * `new Date().toISOString()`.
   */
  readonly createdAt: string;
}

/**
 * Build an `ISwarmReplayManifestEntry` from a completed swarm run.
 *
 * The function is total — every input has a defined output and the
 * derivation paths for `winner` and `turns` cover the cases where the
 * run crashed mid-way (no `GameEnded` event) or finished without
 * recording an explicit turn count.
 */
export function buildSwarmManifestEntry(
  input: IBuildSwarmManifestEntryInput,
): ISwarmReplayManifestEntry {
  const {
    gameId,
    runSeed,
    configName,
    batchTimestamp,
    events,
    bvTotal,
    createdAt,
  } = input;

  // Find the terminal `GameEnded` event. There SHALL be at most one in
  // a well-formed event log; we walk forward and pick the last to be
  // robust against any future emitter that produces multiple (e.g. a
  // runner that calls determineWinner twice). For a crashed run with
  // no GameEnded, both `winner` and `turns` fall back per the rules
  // below.
  let endEvent: IGameEvent | undefined;
  for (const event of events) {
    if (event.type === GameEventType.GameEnded) {
      endEvent = event;
    }
  }

  // Winner: from GameEnded.payload.winner. The payload type uses
  // `GameSide | 'draw'`, but the manifest entry shape uses
  // `GameSide | null` — collapse 'draw' (and absence of an end event)
  // to null per the manifest contract.
  let winner: GameSide | null = null;
  if (endEvent !== undefined) {
    const payload = endEvent.payload as IGameEndedPayload;
    if (
      payload.winner === GameSide.Player ||
      payload.winner === GameSide.Opponent
    ) {
      winner = payload.winner;
    }
  }

  // Turns: GameEnded.turns if present; else count of turn_started
  // events; else 0. Same fallback ladder used by the backfill scan
  // (PR 3) so manifest entries built at write time match those
  // reconstructed from disk.
  let turns = 0;
  if (endEvent !== undefined) {
    const payload = endEvent.payload as IGameEndedPayload;
    if (typeof payload.turns === 'number') {
      turns = payload.turns;
    }
  }
  if (turns === 0) {
    let turnStartedCount = 0;
    for (const event of events) {
      if (event.type === GameEventType.TurnStarted) {
        turnStartedCount += 1;
      }
    }
    turns = turnStartedCount;
  }

  return {
    id: gameId,
    replaySource: ReplaySource.Swarm,
    path: `swarm/${gameId}.jsonl`,
    createdAt,
    turns,
    winner,
    bvTotal,
    configName,
    seed: runSeed,
    batchTimestamp,
  };
}
