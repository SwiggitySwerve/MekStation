/**
 * Replay manifest types — discriminated union covering every replay source
 * the engine produces. Per add-replay-library (replay-library spec —
 * IReplayManifestEntry Discriminated Union): one entry shape per
 * `ReplaySource` so the central `simulation-reports/replay-index.json`
 * can be filtered, narrowed, and rendered with source-specific metadata.
 *
 * Council #4 ruled an enum-discriminated union (Option C hybrid) over a
 * flat shape with optional fields because TypeScript can enforce that
 * "swarm entries always have configName" while a flat shape cannot.
 */

import { GameSide, ReplaySource } from '@/types/gameplay';

/**
 * Fields shared by every replay manifest entry. `bvTotal` is computed at
 * write time from `IGameCreatedPayload.units`; consumers MUST NOT lazy-
 * recompute on read (Momus MUST RESOLVE #1 — IGameUnit has no `bv` field
 * for cheap access, so the only correct answer is "compute once at write").
 */
export interface IReplayManifestEntryBase {
  /** Game identifier — also the file basename (without `.jsonl` extension). */
  readonly id: string;
  /** Replay source discriminator. */
  readonly replaySource: ReplaySource;
  /**
   * File path relative to `simulation-reports/` (e.g. `"swarm/sim-1.jsonl"`,
   * `"quick/quick-99.jsonl"`). The Library page reads `simulation-reports/`
   * + this path to load the event log.
   */
  readonly path: string;
  /** ISO 8601 timestamp at manifest-write time. */
  readonly createdAt: string;
  /**
   * Number of turns played. Derived from `GameEnded.turns` when present;
   * falls back to count of `turn_started` events; falls back to `0` when
   * neither is present (e.g. crashed mid-run).
   */
  readonly turns: number;
  /** Winner side, or `null` for draws / no result. */
  readonly winner: GameSide | null;
  /** Sum of unit BVs from `GameCreated.payload.units`. */
  readonly bvTotal: number;
}

/**
 * Swarm CLI runner output. Stored under `simulation-reports/swarm/`.
 * `batchTimestamp` groups runs from a single `run-simulation.ts` invocation
 * (was the directory segment in the legacy flat layout; now a metadata
 * field on the entry so the partition stays flat-by-id).
 */
export interface ISwarmReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.Swarm;
  /** Swarm config file basename (e.g. `"duel-3kbv-temperate"`). */
  readonly configName: string;
  /** Run seed for reproducibility. */
  readonly seed: number;
  /** Per-invocation timestamp (preserved from the legacy `run-timestamp`). */
  readonly batchTimestamp: string;
}

/**
 * In-app quick game. Stored under `simulation-reports/quick/`. Persisted
 * by `QuickGameResults` on completion (today the stream lives in memory
 * and dies with the React tree — this is the new write path).
 */
export interface IQuickReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.Quick;
  /** Side the player chose. */
  readonly playerSide: GameSide;
  /** AI variant identifier in use for this quick game. */
  readonly aiVariant: string;
}

/**
 * PvP match record. Reserved for future use — `InMemoryMatchStore` is
 * dev-only today and has no durable persistence. Manifest shape pre-defined
 * so the future PvP write path plugs in without spec churn.
 */
export interface IPvPReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.PvP;
  readonly opponentName: string;
  readonly matchId: string;
}

/**
 * Campaign mission record. Reserved for future use — campaign mode does
 * not emit events yet. Manifest shape pre-defined so the future campaign
 * emitter plugs in without spec churn.
 */
export interface ICampaignReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.Campaign;
  readonly campaignId: string;
  readonly missionId: string;
  readonly difficulty: string;
}

/**
 * Discriminated union of every manifest entry shape. Narrows on
 * `entry.replaySource`. Consumers iterating `IReplayManifestEntry[]`
 * must handle every variant or fail compilation.
 */
export type IReplayManifestEntry =
  | ISwarmReplayManifestEntry
  | IQuickReplayManifestEntry
  | IPvPReplayManifestEntry
  | ICampaignReplayManifestEntry;
