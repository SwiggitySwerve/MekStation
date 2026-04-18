/**
 * QuickResolveService — Monte Carlo batch runner for the Quick Resolve UI.
 *
 * Spawns N seeded `GameEngine` instances and aggregates the per-run
 * post-battle reports into a single `IBatchResult`. Engineered to be a
 * pure orchestrator: it consumes the existing `GameEngine.runToCompletion`
 * + `derivePostBattleReport` primitives and never reaches into engine
 * internals.
 *
 * Determinism contract (CRITICAL):
 *   For a fixed `(config, runs, baseSeed)`, calling `runBatch` twice
 *   MUST produce a deeply equal `IBatchResult`. Each run gets its own
 *   `new GameEngine({ seed: baseSeed + i })` — never share an engine
 *   across runs, and never short-circuit per-run PRNG consumption.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/simulation-system/spec.md
 */

import type { IGameEngineConfig, IAdaptedUnit } from '@/engine/types';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import { GameEngine } from '@/engine/GameEngine';
import { derivePostBattleReport } from '@/utils/gameplay/postBattleReport';

import type { IBatchOutcome, IBatchResult } from './batchOutcome';

import { aggregateBatchOutcomes } from './aggregateBatchOutcomes';

// =============================================================================
// Constants
// =============================================================================

/** Default number of runs when caller omits `options.runs`. */
export const DEFAULT_RUN_COUNT = 100;

/** Inclusive bounds for `options.runs`. */
export const MIN_RUN_COUNT = 1;
export const MAX_RUN_COUNT = 5000;

/** Spec § 8: yield to the event loop every N runs. */
export const YIELD_INTERVAL = 10;

/**
 * Spec § 7.2: abort the batch if more than this fraction of runs error
 * out. Computed on a rolling basis after at least YIELD_INTERVAL runs
 * have been attempted (small batches are not aborted on a single bad
 * run).
 */
export const SYSTEMIC_ERROR_THRESHOLD = 0.2;

// =============================================================================
// Public types
// =============================================================================

/** Per-side battle inputs handed to `runBatch`. */
export interface IQuickResolveBattleConfig {
  readonly playerUnits: readonly IAdaptedUnit[];
  readonly opponentUnits: readonly IAdaptedUnit[];
  readonly gameUnits: readonly IGameUnit[];
  /** Engine knobs (mapRadius, turnLimit). `seed` is overridden per run. */
  readonly engineConfig?: Omit<IGameEngineConfig, 'seed'>;
}

/** Run-level options. All optional with documented defaults. */
export interface IQuickResolveRunOptions {
  /** Number of runs in the batch (default 100, range [1, 5000]). */
  readonly runs?: number;
  /**
   * Seed used for the first run. Subsequent runs use `baseSeed + i`.
   * If omitted, a cryptographically random integer is generated and
   * round-tripped on the result so the batch can be replayed.
   */
  readonly baseSeed?: number;
  /** Cancellation source — when aborted, the batch finishes the current
   *  run and aggregates the partial outcomes. */
  readonly signal?: AbortSignal;
  /** Progress callback invoked after each run (sync, may schedule UI updates). */
  readonly onProgress?: (progress: IQuickResolveProgress) => void;
}

export interface IQuickResolveProgress {
  readonly runsCompleted: number;
  readonly totalRuns: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Yield control to the event loop. `setImmediate`-style microtask is
 * sufficient — we just need the main thread to pump pending UI updates
 * before the next synchronous run.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Generate a 32-bit positive integer seed. Prefers `crypto` when
 * available; falls back to `Math.random` so tests / SSR contexts that
 * lack a usable Web Crypto still work deterministically-after-the-fact
 * (the seed is round-tripped onto the result).
 */
function generateBaseSeed(): number {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto?.getRandomValues === 'function'
  ) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    // SeededRandom uses the seed as a uint32 — mask explicitly for clarity.
    return buf[0]! >>> 0;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

// =============================================================================
// Errors
// =============================================================================

export const ERR_INVALID_RUN_COUNT = 'Invalid run count';
export const ERR_SYSTEMIC_FAILURE = 'Quick Resolve failed: engine errors';

/**
 * Thrown when more than 20% of runs error out. Carries the partial
 * outcomes so the UI can still render what was collected.
 */
export class QuickResolveSystemicFailure extends Error {
  readonly partialOutcomes: readonly IBatchOutcome[];
  readonly partialResult: IBatchResult;

  constructor(
    partialOutcomes: readonly IBatchOutcome[],
    partialResult: IBatchResult,
  ) {
    super(ERR_SYSTEMIC_FAILURE);
    this.name = 'QuickResolveSystemicFailure';
    this.partialOutcomes = partialOutcomes;
    this.partialResult = partialResult;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Run a single Monte Carlo batch and return the aggregated result.
 *
 * @throws Error('Invalid run count') when runs is outside [1, 5000].
 * @throws QuickResolveSystemicFailure when >20% of runs error out.
 */
export async function runBatch(
  battle: IQuickResolveBattleConfig,
  options: IQuickResolveRunOptions = {},
): Promise<IBatchResult> {
  // ---- 1. Validate ---------------------------------------------------------
  const runs = options.runs ?? DEFAULT_RUN_COUNT;
  if (!Number.isInteger(runs) || runs < MIN_RUN_COUNT || runs > MAX_RUN_COUNT) {
    throw new Error(ERR_INVALID_RUN_COUNT);
  }

  // ---- 2. Resolve baseSeed (round-tripped on the result) ------------------
  const baseSeed = options.baseSeed ?? generateBaseSeed();

  // ---- 3. Pre-cancellation guard -----------------------------------------
  // Spec: an already-aborted signal means zero engines created.
  if (isAborted(options.signal)) {
    return aggregateBatchOutcomes([], baseSeed);
  }

  // ---- 4. Run loop --------------------------------------------------------
  const outcomes: IBatchOutcome[] = [];
  const baseEngineConfig = battle.engineConfig ?? {};

  for (let i = 0; i < runs; i++) {
    // Cancellation observed at the top of each iteration so callers
    // see partial aggregation up to the last completed run.
    if (isAborted(options.signal)) break;

    const seed = baseSeed + i;
    const startedAt = performance.now();
    let outcome: IBatchOutcome;
    try {
      // CRITICAL determinism contract: fresh engine per run, fresh
      // SeededRandom per engine. Never reuse PRNG state across runs.
      const engine = new GameEngine({ ...baseEngineConfig, seed });
      const session = engine.runToCompletion(
        battle.playerUnits,
        battle.opponentUnits,
        battle.gameUnits,
      );
      const report = derivePostBattleReport(session);
      outcome = {
        runIndex: i,
        seed,
        durationMs: performance.now() - startedAt,
        report,
      };
    } catch (err) {
      outcome = {
        runIndex: i,
        seed,
        durationMs: performance.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    outcomes.push(outcome);
    options.onProgress?.({
      runsCompleted: outcomes.length,
      totalRuns: runs,
    });

    // ---- 4a. Systemic failure guard --------------------------------------
    // Only check after we have enough samples for the ratio to be
    // meaningful (matches YIELD_INTERVAL — same cadence the spec uses
    // for yielding so the cost stays predictable).
    if (outcomes.length >= YIELD_INTERVAL) {
      const errored = outcomes.filter((o) => o.error !== undefined).length;
      if (errored / outcomes.length > SYSTEMIC_ERROR_THRESHOLD) {
        const partialResult = aggregateBatchOutcomes(outcomes, baseSeed);
        throw new QuickResolveSystemicFailure(outcomes, partialResult);
      }
    }

    // ---- 4b. Yield to event loop every YIELD_INTERVAL runs --------------
    if ((i + 1) % YIELD_INTERVAL === 0 && i + 1 < runs) {
      await yieldToEventLoop();
    }
  }

  // ---- 5. Aggregate -------------------------------------------------------
  return aggregateBatchOutcomes(outcomes, baseSeed);
}

/**
 * Service-style namespace export — the brief and tasks reference
 * `QuickResolveService.runBatch(...)`. We keep the function-style
 * `runBatch` as the canonical API and expose the namespace as a thin
 * wrapper so existing call sites in the docs work verbatim.
 */
export const QuickResolveService = {
  runBatch,
  DEFAULT_RUN_COUNT,
  MIN_RUN_COUNT,
  MAX_RUN_COUNT,
} as const;
