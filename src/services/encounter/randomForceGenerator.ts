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
  // Default ±5% per spec scenario in
  // openspec/changes/add-encounter-swarm-harness/specs/random-force-generator/spec.md.
  const { bvBudget, bvTolerance = 0.05, count, random, sideId } = opts;

  const duplicateChassisCap =
    opts.duplicateChassisCap ?? Math.max(1, Math.ceil(count / 4));

  const tolerance = bvTolerance;
  const lowerBound = bvBudget * (1 - tolerance);
  const upperBound = bvBudget * (1 + tolerance);

  // --- Step 1: filter catalog ---
  const eligible = filterCatalog(opts.catalog, opts);

  if (eligible.length === 0) {
    throw new BudgetUnsatisfiableError(0, 0, opts);
  }

  // Sanity check: can the budget even be satisfied?
  const sortedByCost = [...eligible].sort((a, b) => (a.bv ?? 0) - (b.bv ?? 0));
  const cheapestN = sortedByCost.slice(0, count);
  const achievableMinBV = cheapestN.reduce((s, e) => s + (e.bv ?? 0), 0);
  // max is harder to bound (chassis cap applies), so use top-N uncapped as upper
  const mostExpensiveN = [...eligible]
    .sort((a, b) => (b.bv ?? 0) - (a.bv ?? 0))
    .slice(0, count);
  const achievableMaxBV = mostExpensiveN.reduce((s, e) => s + (e.bv ?? 0), 0);

  if (achievableMinBV > upperBound || achievableMaxBV < lowerBound) {
    throw new BudgetUnsatisfiableError(achievableMinBV, achievableMaxBV, opts);
  }

  // --- Steps 2–4: greedy fill ---
  const chassisCounts: Map<string, number> = new Map();
  const selected: IUnitIndexEntry[] = [];
  let cumulativeBV = 0;

  // We maintain a mutable set of remaining eligible entries and rebuild the
  // weighted table each pass (entries are excluded by budget cap or chassis cap).
  let remaining = [...eligible];

  for (let slot = 0; slot < count; slot++) {
    const remainingBudget = upperBound - cumulativeBV;
    const slotsLeft = count - slot;

    // Exclude entries whose BV would bust the upper bound for THIS slot.
    // We leave headroom for future slots: remainingBudget / slotsLeft is the
    // average per slot; we allow up to 2× that so diverse fills are possible.
    const slotCap = (remainingBudget / slotsLeft) * 2;

    // Enforce lower-bound reachability: each slot must contribute at least
    // (deficit / slotsLeft) BV so the cumulative total can reach lowerBound.
    const deficit = lowerBound - cumulativeBV;
    const slotMin = deficit > 0 ? deficit / slotsLeft : 0;

    let affordable = remaining.filter(
      (e) => (e.bv ?? 0) <= slotCap && (e.bv ?? 0) >= slotMin,
    );

    if (affordable.length === 0) {
      // Relax slotCap (headroom heuristic) but keep slotMin to preserve
      // lower-bound reachability. Accept anything in [slotMin, remainingBudget].
      affordable = remaining.filter(
        (e) => (e.bv ?? 0) <= remainingBudget && (e.bv ?? 0) >= slotMin,
      );
    }

    if (affordable.length === 0) {
      // Final relax: slotMin is impossible to satisfy — just stay within budget.
      // Lower bound may not be reached; final check below handles it.
      affordable = remaining.filter((e) => (e.bv ?? 0) <= remainingBudget);
    }

    if (affordable.length === 0) {
      // Can't add more — check if we already satisfy lower bound
      if (cumulativeBV >= lowerBound) break;
      throw new BudgetUnsatisfiableError(
        achievableMinBV,
        achievableMaxBV,
        opts,
      );
    }

    // Rebuild table with current affordable subset
    const table = buildWeightedTable(affordable);
    const pick = table.select(() => random.next());

    if (pick === null) {
      // Weighted table returned null despite non-empty affordable — shouldn't happen
      if (cumulativeBV >= lowerBound) break;
      throw new BudgetUnsatisfiableError(
        achievableMinBV,
        achievableMaxBV,
        opts,
      );
    }

    selected.push(pick);
    cumulativeBV += pick.bv ?? 0;

    // Track chassis usage and evict at cap
    const chassisCount = (chassisCounts.get(pick.chassis) ?? 0) + 1;
    chassisCounts.set(pick.chassis, chassisCount);

    if (chassisCount >= duplicateChassisCap) {
      // Remove all further entries for this chassis
      remaining = remaining.filter((e) => e.chassis !== pick.chassis);
    }
  }

  // Final check: did we achieve the lower bound?
  if (cumulativeBV < lowerBound && selected.length < count) {
    throw new BudgetUnsatisfiableError(achievableMinBV, achievableMaxBV, opts);
  }

  // --- Step 5: assemble IForce ---
  const forceId = `rand-force-${sideId}-${random.nextInt(1_000_000)}`;
  const now = new Date().toISOString();

  const assignments: IAssignment[] = selected.map((entry, idx) => ({
    id: makeAssignmentId(forceId, idx + 1),
    pilotId: null, // Pilot pairing done separately (Task 4.10)
    unitId: entry.id,
    position: idx === 0 ? ForcePosition.Commander : ForcePosition.Member,
    slot: idx + 1,
  }));

  const stats = computeStats(selected);

  const force: IForce = {
    id: forceId,
    name: `${sideId} Force`,
    forceType: ForceType.Custom,
    status: ForceStatus.Active,
    childIds: [],
    assignments,
    stats,
    createdAt: now,
    updatedAt: now,
  };

  return force;
}
