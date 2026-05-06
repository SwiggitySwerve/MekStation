/**
 * Swarm Aggregation — Type definitions for IAggregatedSwarmReport (Task 6.6).
 *
 * Extracted into a leaf module so the implementation file stays under the
 * 400-line max-lines lint cap. Consumers that only need the shape of the
 * report (e.g., a future CLI flag wiring or a downstream UI panel) can import
 * from here without pulling in the full aggregation logic.
 */

// =============================================================================
// Output types — IAggregatedSwarmReport
// =============================================================================

/**
 * Win/loss/draw record for a single chassis matchup cell.
 *
 * Per `add-combat-fidelity-suite` Phase 5 (`combat-analytics` delta —
 * "Per-Chassis Aggregation Surfaces Combat Fidelity Metrics"): the
 * per-matchup averages (`criticalsLandedAvg`, `componentsDestroyedAvg`,
 * `ammoExplosionsAvg`, `shutdownsAvg`, `fallsAvg`) are mean values
 * across every run that produced this cell. They are unconditional —
 * cells with zero events still emit zero rather than `undefined` so
 * downstream consumers don't have to guard against missing fields.
 */
export interface IChassisMatchupRecord {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  /** Mean `CriticalHit` event count across all runs of this matchup. */
  readonly criticalsLandedAvg: number;
  /** Mean `ComponentDestroyed` event count across all runs of this matchup. */
  readonly componentsDestroyedAvg: number;
  /** Mean `AmmoExplosion` event count across all runs of this matchup. */
  readonly ammoExplosionsAvg: number;
  /** Mean `HeatEffectApplied { effect: 'shutdown' }` count across all runs. */
  readonly shutdownsAvg: number;
  /** Mean `UnitFell` event count across all runs of this matchup. */
  readonly fallsAvg: number;
}

/**
 * Per-chassis-pair win/loss matrix.
 * chassisMatrix[chassisA][chassisB] answers "how did chassisA fare against chassisB?"
 * Mirror entries are always present (chassisB vs chassisA reflects the inverse).
 */
export type ChassisMatrix = Record<
  string,
  Record<string, IChassisMatchupRecord>
>;

/** Gunnery skill bucket label */
export type GunneryBracket = '1-2' | '3-4' | '5-6' | '7+';

/** Aggregate statistics for one gunnery bracket */
export interface IGunneryBracketRecord {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly avgDamageDealt: number;
}

/**
 * AI variant head-to-head record.
 * wins / losses are from the perspective of the alphabetically-first variant.
 */
export interface IAIVariantMatchupRecord {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly avgTurns: number;
}

/** Per-pilot career statistics (vault pilots only) */
export interface IPilotPerformanceRecord {
  readonly runs: number;
  readonly wins: number;
  readonly kills: number;
  readonly takenWounds: number;
}

/** Damage matrix: attacker → target → total damage dealt */
export type DamageMatrix = Record<string, Record<string, number>>;

/** Kill credits: attacker unit → kill count */
export type KillCredits = Record<string, number>;

/** Per-unit performance (wins/losses/draws + damage dealt) */
export interface IUnitPerformanceRecord {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly totalDamageDealt: number;
}

/** Rollups always produced regardless of schemaVersion */
export interface IBaseRollups {
  /** Total damage dealt indexed by [sourceUnitId][targetUnitId] */
  readonly damageMatrix: DamageMatrix;
  /** Kill count per attacking unit */
  readonly killCredits: KillCredits;
  /** Per-unit win/loss/damage summary */
  readonly unitPerformance: Record<string, IUnitPerformanceRecord>;
}

/** Rollups produced only when schemaVersion >= 2 inputs are present */
export interface ISchemaV2Rollups {
  /** Per-chassis matchup win/loss matrix (see spec §"Per-Chassis Win/Loss Matrix") */
  readonly chassisMatrix: ChassisMatrix;
  /** Gunnery bracket performance (brackets: '1-2', '3-4', '5-6', '7+') */
  readonly gunneryBracket: Record<GunneryBracket, IGunneryBracketRecord>;
  /**
   * AI variant head-to-head.
   * Key is canonical-ordered: alphabetically-first variant + '_vs_' + other.
   * wins counts wins for the alphabetically-first variant.
   */
  readonly aiVariantHeadToHead: Record<string, IAIVariantMatchupRecord>;
  /**
   * Per-pilot performance (vault pilots only; empty object when all pilots are
   * synthesized via the template strategy).
   */
  readonly pilotPerformance: Record<string, IPilotPerformanceRecord>;
  /**
   * Count of runs where a side fielded mixed AI variants (excluded from
   * aiVariantHeadToHead cells, counted here for transparency).
   */
  readonly mixedVariantRuns: number;
}

/**
 * Full aggregated swarm report.
 *
 * aggregations is present only when at least one input has schemaVersion >= 2.
 * schemaVersion2RunCount is always set (0 when no v2 inputs were present).
 */
export interface IAggregatedSwarmReport {
  /** Total number of runs processed */
  readonly totalRuns: number;
  /**
   * Number of runs that carried schemaVersion >= 2 (and therefore participants
   * payload). New rollups are derived exclusively from this subset.
   */
  readonly schemaVersion2RunCount: number;
  /** Base rollups from all inputs */
  readonly baseRollups: IBaseRollups;
  /**
   * Schema-v2-gated rollups. Present only when schemaVersion2RunCount > 0.
   * Omitted (undefined) for pure schemaVersion-1 batches.
   */
  readonly aggregations?: ISchemaV2Rollups;
}
