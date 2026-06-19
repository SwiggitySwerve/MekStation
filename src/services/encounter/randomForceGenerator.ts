/**
 * Random Force Generator
 *
 * Greedy BV-budget fill algorithm for generating opposing forces.
 * Uses inverse-BV weighting so cheaper units appear more often in
 * mixed-BV scenarios, and enforces a per-chassis duplicate cap to
 * prevent homogeneous forces.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/random-force-generator/spec.md
 * @design D5 — greedy fill, inverse-BV weights, chassis cap, no retry loop
 */

import { SeededRandom } from '@/simulation/core/SeededRandom';
import { WeightedTable } from '@/simulation/core/WeightedTable';
import { TechBase } from '@/types/enums/TechBase';
import {
  ForcePosition,
  ForceStatus,
  ForceType,
  IAssignment,
  IForce,
  IForceStats,
  createEmptyStats,
} from '@/types/force/ForceInterfaces';
import { IUnitIndexEntry } from '@/types/unit/UnitIndex';

// =============================================================================
// Public Types
// =============================================================================

/**
 * Options for random force generation.
 */
export interface IRandomForceOptions {
  /** Target total BV for the generated force */
  readonly bvBudget: number;
  /**
   * Fractional tolerance around bvBudget.
   * A force with total BV in [bvBudget * (1 - tolerance), bvBudget * (1 + tolerance)]
   * is considered acceptable.
   * Default: 0.05 (±5%) per spec
   * (openspec/changes/add-encounter-swarm-harness/specs/random-force-generator/spec.md).
   */
  readonly bvTolerance?: number;
  /** Minimum unit tonnage (inclusive). Omit to skip filter. */
  readonly tonnageMin?: number;
  /** Maximum unit tonnage (inclusive). Omit to skip filter. */
  readonly tonnageMax?: number;
  /**
   * Era year string (e.g. "3050"). When provided, only units with
   * entry.year <= Number(era) are eligible. Omit to allow all.
   */
  readonly era?: string;
  /**
   * Tech base filter. "IS" = Inner Sphere only, "Clan" = Clan only,
   * "Mixed" (or omitted) = all.
   */
  readonly techBase?: 'IS' | 'Clan' | 'Mixed';
  /**
   * Logical side identifier carried through to IParticipant records.
   * E.g. "player" or "opfor".
   */
  readonly sideId: string;
  /**
   * Desired unit count for the force.
   * The generator will fill this many slots greedily within the budget.
   */
  readonly count: number;
  /** Seeded RNG instance (injected for determinism). */
  readonly random: SeededRandom;
  /** Unit catalog to draw from. */
  readonly catalog: readonly IUnitIndexEntry[];
  /**
   * Maximum number of units sharing the same chassis.
   * Default: Math.ceil(count / 4), minimum 1.
   */
  readonly duplicateChassisCap?: number;
  /**
   * Per `polish-wave-6.2-gaps` (gap #11, closes PT-010): when the
   * requested `count` cannot satisfy the BV budget, the generator
   * retries ONCE at `count + 1` before re-throwing
   * `BudgetUnsatisfiableError`. Callers that require strict unit-count
   * matching (e.g. PvP balance tests, fixed-deployment scenarios) can
   * opt out by passing `exactUnitCount: true`. Default: false (retry
   * enabled).
   */
  readonly exactUnitCount?: boolean;
}

/**
 * Thrown when the filtered catalog cannot satisfy the BV budget within
 * the specified tolerance, even using the cheapest available units.
 */
export class BudgetUnsatisfiableError extends Error {
  constructor(
    /** Minimum achievable total BV (one cheapest unit per slot) */
    public readonly achievableMinBV: number,
    /** Maximum achievable total BV (most expensive unit per slot, uncapped) */
    public readonly achievableMaxBV: number,
    public readonly options: IRandomForceOptions,
  ) {
    super(
      `BV budget ${options.bvBudget} is unsatisfiable: ` +
        `achievable range [${achievableMinBV}, ${achievableMaxBV}] ` +
        `for ${options.count} units`,
    );
    this.name = 'BudgetUnsatisfiableError';
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Map IRandomForceOptions.techBase string to TechBase enum for comparison.
 * Returns null when no filter should be applied ("Mixed" or omitted).
 */
function resolveTechBaseFilter(
  techBase: IRandomForceOptions['techBase'],
): TechBase | null {
  if (techBase === 'IS') return TechBase.INNER_SPHERE;
  if (techBase === 'Clan') return TechBase.CLAN;
  return null; // Mixed / undefined — no filter
}

/**
 * Apply all eligibility filters to the catalog and return matching entries.
 * BV-undefined units are kept (weight = 1); the caller handles missing BV.
 */
function filterCatalog(
  catalog: readonly IUnitIndexEntry[],
  opts: IRandomForceOptions,
): IUnitIndexEntry[] {
  const eraYear = opts.era !== undefined ? Number(opts.era) : undefined;
  const techBaseFilter = resolveTechBaseFilter(opts.techBase);

  return catalog.filter((entry) => {
    // Era filter: introduction year must be <= the requested era year
    if (eraYear !== undefined && (entry.year ?? 0) > eraYear) return false;

    // Tech base filter
    if (techBaseFilter !== null && entry.techBase !== techBaseFilter)
      return false;

    // Tonnage filters
    if (opts.tonnageMin !== undefined && entry.tonnage < opts.tonnageMin)
      return false;
    if (opts.tonnageMax !== undefined && entry.tonnage > opts.tonnageMax)
      return false;

    return true;
  });
}

/**
 * Build a WeightedTable of catalog entries using inverse-BV weighting.
 * Units with lower BV get higher weight (appear more frequently when budget
 * is tight). Units without a BV value are assigned weight 1.0.
 */
function buildWeightedTable(
  entries: readonly IUnitIndexEntry[],
): WeightedTable<IUnitIndexEntry> {
  const table = new WeightedTable<IUnitIndexEntry>();
  for (const entry of entries) {
    // inverse-BV: cheaper units are proportionally more common
    const weight = 1 / Math.max(1, entry.bv ?? 1);
    table.add(weight, entry);
  }
  return table;
}

/**
 * Compute a safe (unique) assignment id for a given slot.
 */
function makeAssignmentId(forceId: string, slot: number): string {
  return `${forceId}-slot-${slot}`;
}

/**
 * Compute IForceStats from the list of selected entries.
 */
function computeStats(entries: IUnitIndexEntry[]): IForceStats {
  const base = createEmptyStats();
  const totalBV = entries.reduce((sum, e) => sum + (e.bv ?? 0), 0);
  const totalTonnage = entries.reduce((sum, e) => sum + e.tonnage, 0);
  return {
    ...base,
    totalBV,
    totalTonnage,
    assignedUnits: entries.length,
    emptySlots: 0,
  };
}

interface IGenerationSettings {
  readonly bvBudget: number;
  readonly count: number;
  readonly random: SeededRandom;
  readonly sideId: string;
  readonly duplicateChassisCap: number;
  readonly lowerBound: number;
  readonly upperBound: number;
}

interface IBudgetBounds {
  readonly achievableMinBV: number;
  readonly achievableMaxBV: number;
}

interface IAffordableEntryInput {
  readonly remaining: readonly IUnitIndexEntry[];
  readonly remainingBudget: number;
  readonly slotsLeft: number;
  readonly lowerBound: number;
  readonly cumulativeBV: number;
}

interface IForceSelectionInput {
  readonly eligible: readonly IUnitIndexEntry[];
  readonly settings: IGenerationSettings;
  readonly bounds: IBudgetBounds;
  readonly opts: IRandomForceOptions;
}

function deriveGenerationSettings(
  opts: IRandomForceOptions,
): IGenerationSettings {
  const { bvBudget, bvTolerance = 0.05, count, random, sideId } = opts;
  const duplicateChassisCap =
    opts.duplicateChassisCap ?? Math.max(1, Math.ceil(count / 4));

  return {
    bvBudget,
    count,
    random,
    sideId,
    duplicateChassisCap,
    lowerBound: bvBudget * (1 - bvTolerance),
    upperBound: bvBudget * (1 + bvTolerance),
  };
}

function computeBudgetBounds(
  eligible: readonly IUnitIndexEntry[],
  count: number,
): IBudgetBounds {
  const sortedByCost = [...eligible].sort((a, b) => (a.bv ?? 0) - (b.bv ?? 0));
  const cheapestN = sortedByCost.slice(0, count);
  const mostExpensiveN = [...eligible]
    .sort((a, b) => (b.bv ?? 0) - (a.bv ?? 0))
    .slice(0, count);

  return {
    achievableMinBV: cheapestN.reduce((sum, entry) => sum + (entry.bv ?? 0), 0),
    achievableMaxBV: mostExpensiveN.reduce(
      (sum, entry) => sum + (entry.bv ?? 0),
      0,
    ),
  };
}

function throwUnsatisfiable(
  bounds: IBudgetBounds,
  opts: IRandomForceOptions,
): never {
  throw new BudgetUnsatisfiableError(
    bounds.achievableMinBV,
    bounds.achievableMaxBV,
    opts,
  );
}

function assertBudgetIsSatisfiable(
  bounds: IBudgetBounds,
  settings: IGenerationSettings,
  opts: IRandomForceOptions,
): void {
  if (
    bounds.achievableMinBV > settings.upperBound ||
    bounds.achievableMaxBV < settings.lowerBound
  ) {
    throwUnsatisfiable(bounds, opts);
  }
}

function filteredByBVRange(
  entries: readonly IUnitIndexEntry[],
  minBV: number,
  maxBV: number,
): IUnitIndexEntry[] {
  return entries.filter((entry) => {
    const bv = entry.bv ?? 0;
    return bv >= minBV && bv <= maxBV;
  });
}

function findAffordableEntries({
  remaining,
  remainingBudget,
  slotsLeft,
  lowerBound,
  cumulativeBV,
}: IAffordableEntryInput): IUnitIndexEntry[] {
  const deficit = lowerBound - cumulativeBV;
  const slotMin = deficit > 0 ? deficit / slotsLeft : 0;
  const slotCap = (remainingBudget / slotsLeft) * 2;
  const heuristicMatches = filteredByBVRange(remaining, slotMin, slotCap);
  const budgetMatches = filteredByBVRange(remaining, slotMin, remainingBudget);

  return heuristicMatches.length > 0
    ? heuristicMatches
    : budgetMatches.length > 0
      ? budgetMatches
      : filteredByBVRange(remaining, 0, remainingBudget);
}

function selectAffordableEntry(
  affordable: readonly IUnitIndexEntry[],
  settings: IGenerationSettings,
  bounds: IBudgetBounds,
  opts: IRandomForceOptions,
): IUnitIndexEntry {
  const table = buildWeightedTable(affordable);
  return (
    table.select(() => settings.random.next()) ??
    throwUnsatisfiable(bounds, opts)
  );
}

function removeChassisWhenCapped(
  remaining: readonly IUnitIndexEntry[],
  pick: IUnitIndexEntry,
  chassisCounts: Map<string, number>,
  duplicateChassisCap: number,
): IUnitIndexEntry[] {
  const chassisCount = (chassisCounts.get(pick.chassis) ?? 0) + 1;
  chassisCounts.set(pick.chassis, chassisCount);

  return chassisCount >= duplicateChassisCap
    ? remaining.filter((entry) => entry.chassis !== pick.chassis)
    : [...remaining];
}

function selectForceEntries({
  eligible,
  settings,
  bounds,
  opts,
}: IForceSelectionInput): IUnitIndexEntry[] {
  const chassisCounts: Map<string, number> = new Map();
  const selected: IUnitIndexEntry[] = [];
  let cumulativeBV = 0;
  let remaining = [...eligible];

  for (let slot = 0; slot < settings.count; slot++) {
    const affordable = findAffordableEntries({
      remaining,
      remainingBudget: settings.upperBound - cumulativeBV,
      slotsLeft: settings.count - slot,
      lowerBound: settings.lowerBound,
      cumulativeBV,
    });

    if (affordable.length === 0) {
      if (cumulativeBV >= settings.lowerBound) break;
      throwUnsatisfiable(bounds, opts);
    }

    const pick = selectAffordableEntry(affordable, settings, bounds, opts);
    selected.push(pick);
    cumulativeBV += pick.bv ?? 0;
    remaining = removeChassisWhenCapped(
      remaining,
      pick,
      chassisCounts,
      settings.duplicateChassisCap,
    );
  }

  if (cumulativeBV < settings.lowerBound && selected.length < settings.count) {
    throwUnsatisfiable(bounds, opts);
  }

  return selected;
}

function buildGeneratedForce(
  selected: IUnitIndexEntry[],
  settings: IGenerationSettings,
): IForce {
  const forceId = `rand-force-${settings.sideId}-${settings.random.nextInt(
    1_000_000,
  )}`;
  const now = new Date().toISOString();
  const assignments: IAssignment[] = selected.map((entry, idx) => ({
    id: makeAssignmentId(forceId, idx + 1),
    pilotId: null, // Pilot pairing done separately (Task 4.10)
    unitId: entry.id,
    position: idx === 0 ? ForcePosition.Commander : ForcePosition.Member,
    slot: idx + 1,
  }));

  return {
    id: forceId,
    name: `${settings.sideId} Force`,
    forceType: ForceType.Custom,
    status: ForceStatus.Active,
    childIds: [],
    assignments,
    stats: computeStats(selected),
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// Public Generator
// =============================================================================

/**
 * Generate a random IForce drawn from the provided catalog within a BV budget.
 *
 * Algorithm (D5):
 * 1. Filter catalog by era/techBase/tonnage.
 * 2. Build inverse-BV weighted table.
 * 3. Greedily fill `count` slots; each pick is drawn from the weighted table.
 *    If the chosen unit would push the cumulative BV beyond budget*(1+tolerance),
 *    rebuild the table excluding that and all more-expensive units, then retry.
 * 4. Enforce duplicate chassis cap: once a chassis has been picked `cap` times,
 *    remove all remaining entries for that chassis from the table.
 * 5. If the table empties before `count` slots are filled, and the total BV
 *    cannot reach the lower bound, throw BudgetUnsatisfiableError.
 * 6. Return an IForce with all required fields populated.
 *
 * @throws {BudgetUnsatisfiableError} when no combination of filtered units can
 *   satisfy the budget.
 */
export function generateRandomForce(opts: IRandomForceOptions): IForce {
  // Per polish-wave-6.2-gaps (gap #11, closes PT-010): retry once at
  // count + 1 when the requested count can't fit the budget. Opt out via
  // exactUnitCount: true (PvP-balance / fixed-deployment scenarios). The
  // retry path is deterministic — the same SeededRandom is reused, but
  // running with count+1 produces a different draw pattern that may
  // satisfy the budget where count couldn't (e.g. 10k BV / count=2 needs
  // two 5000-BV mechs but the catalog tops out at ~4500; count=3 lets
  // three ~3300-BV mechs hit it).
  try {
    return generateRandomForceOnce(opts);
  } catch (err) {
    if (
      err instanceof BudgetUnsatisfiableError &&
      opts.exactUnitCount !== true &&
      opts.count > 0
    ) {
      return generateRandomForceOnce({ ...opts, count: opts.count + 1 });
    }
    throw err;
  }
}

/**
 * Single-attempt force generation — the original algorithm body, exported
 * privately so `generateRandomForce` can wrap it with the PT-010 retry.
 */
function generateRandomForceOnce(opts: IRandomForceOptions): IForce {
  const settings = deriveGenerationSettings(opts);
  const eligible = filterCatalog(opts.catalog, opts);

  if (eligible.length === 0) {
    throw new BudgetUnsatisfiableError(0, 0, opts);
  }

  const bounds = computeBudgetBounds(eligible, settings.count);
  assertBudgetIsSatisfiable(bounds, settings, opts);
  const selected = selectForceEntries({ eligible, settings, bounds, opts });
  return buildGeneratedForce(selected, settings);
}
