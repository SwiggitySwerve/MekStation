/**
 * Salvage Engine
 *
 * Pure functions that turn an `ICombatOutcome` into salvage decisions.
 * Has no side effects — `salvageProcessor` is the day-pipeline glue that
 * persists results onto the campaign.
 *
 * Pipeline (left → right):
 *
 *   ICombatOutcome
 *     └── aggregateSalvageCandidates ──► ISalvagePool
 *           └── splitByContract / splitByAuction ──► ISalvageAllocation
 *                 └── applyHostileTerritoryModifier ──► ISalvageAllocation
 *
 * All helpers are pure — same input, same output, no I/O. This keeps unit
 * testing trivial and lets the processor batch many outcomes per day
 * without surprising state.
 *
 * @spec openspec/changes/add-salvage-rules-engine/specs/salvage-rules/spec.md
 * @module lib/campaign/salvage/salvageEngine
 */

import type { IContract } from '@/types/campaign/Mission';
import type {
  ISalvageAllocation,
  ISalvageAward,
  ISalvageCandidate,
  ISalvagePool,
  SalvageDisposition,
  SalvageSplitMethod,
} from '@/types/campaign/Salvage';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import {
  CBILLS_PER_BATTLE_VALUE,
  DamageLevel,
  RECOVERY_PERCENTAGE_BY_DAMAGE,
  REPAIR_COST_PER_TON_BY_DAMAGE,
} from '@/types/campaign/Salvage';
import { UnitFinalStatus } from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { logger } from '@/utils/logger';

// =============================================================================
// Optional Per-Unit Lookup Surface
// =============================================================================

/**
 * Minimal per-unit metadata the engine needs in order to estimate value
 * and repair cost. Production callers pass real unit records; tests pass
 * a small stub. Keeping the surface narrow lets us avoid pulling
 * MekStation construction types into the engine.
 */
export interface IUnitValueMetadata {
  readonly designation: string;
  readonly tonnage: number;
  readonly battleValue: number;
}

/**
 * Lookup contract: unitId → metadata. Returning `null` is fine — the
 * engine will fall back to default sizing so a missing record doesn't
 * crash the pipeline.
 */
export type UnitMetadataLookup = (unitId: string) => IUnitValueMetadata | null;

/** Default lookup used when callers don't supply one (Wave 3 MVP). */
const DEFAULT_LOOKUP: UnitMetadataLookup = () => null;

/** Defaults that keep arithmetic stable when a lookup returns null. */
const DEFAULT_TONNAGE = 50;
const DEFAULT_BATTLE_VALUE = 1_000;
const DEFAULT_DESIGNATION = 'Unknown Mech';

// =============================================================================
// Salvageable Component Filter
// =============================================================================

/**
 * Lower-cased substrings that mark a destroyed component as
 * NON-salvageable. Engine, gyro, and internal-structure damage can't be
 * recovered as parts (per `add-salvage-rules-engine` spec §1).
 */
const NON_SALVAGEABLE_KEYWORDS: readonly string[] = [
  'engine',
  'gyro',
  'internal structure',
  'internal-structure',
  'cockpit',
  'life support',
  'sensors',
];

/** Lower-case substring test against the non-salvageable keyword list. */
function isSalvageablePart(componentName: string): boolean {
  const lower = componentName.toLowerCase();
  return !NON_SALVAGEABLE_KEYWORDS.some((kw) => lower.includes(kw));
}

// =============================================================================
// Damage Classification
// =============================================================================

/**
 * Classify a unit's damage into the canonical 5-step `DamageLevel` enum.
 * The classifier reads the delta's structure map — if any location's
 * remaining structure is unknown, we treat it as undamaged at that loc.
 *
 * Rules per spec §Recovery Percentage By Damage Level:
 *   - no armor lost                 → INTACT
 *   - <30% structure lost           → LIGHT
 *   - 30%–60% structure lost        → MODERATE
 *   - 60%–99% structure lost        → HEAVY
 *   - 100% structure lost OR CT     → DESTROYED
 *     destroyed
 */
export function classifyDamageLevel(
  delta: IUnitCombatDelta,
  initialStructurePerLocation: Readonly<Record<string, number>> | null = null,
): DamageLevel {
  // Destroyed always wins regardless of partial structure data.
  if (delta.destroyed || delta.finalStatus === UnitFinalStatus.Destroyed) {
    return DamageLevel.Destroyed;
  }
  if (
    delta.destroyedLocations.includes('CT') ||
    delta.destroyedLocations.includes('Center Torso') ||
    delta.destroyedLocations.includes('CenterTorso')
  ) {
    return DamageLevel.Destroyed;
  }

  // Compute structure-lost % when we have an initial baseline. Without a
  // baseline, fall back to a conservative read on `internalsRemaining`
  // alone: any zero-internal location bumps damage one step.
  let structureLostPct = 0;
  if (initialStructurePerLocation) {
    const baselineTotal = Object.values(initialStructurePerLocation).reduce(
      (sum, v) => sum + v,
      0,
    );
    if (baselineTotal > 0) {
      const remainingTotal = Object.values(delta.internalsRemaining).reduce(
        (sum, v) => sum + v,
        0,
      );
      structureLostPct =
        Math.max(0, baselineTotal - remainingTotal) / baselineTotal;
    }
  } else {
    // No baseline — derive from how many locations have zero structure
    // remaining. Each blown location ≈ 14% structure (7-loc mech).
    const zeroLocs = Object.values(delta.internalsRemaining).filter(
      (v) => v <= 0,
    ).length;
    structureLostPct = Math.min(1.0, zeroLocs * 0.14);
  }

  if (
    delta.finalStatus === UnitFinalStatus.Crippled ||
    structureLostPct >= 0.6
  ) {
    return structureLostPct >= 0.99 ? DamageLevel.Destroyed : DamageLevel.Heavy;
  }
  if (structureLostPct >= 0.3) return DamageLevel.Moderate;
  if (structureLostPct > 0 || delta.finalStatus === UnitFinalStatus.Damaged) {
    return DamageLevel.Light;
  }
  return DamageLevel.Intact;
}

/**
 * Map a `DamageLevel` to the canonical recovery percentage (0..1).
 * Pure pass-through to `RECOVERY_PERCENTAGE_BY_DAMAGE` — exposed as a
 * function so callers don't have to import the table.
 */
export function computeRecoveryPercentage(level: DamageLevel): number {
  return RECOVERY_PERCENTAGE_BY_DAMAGE[level];
}

// =============================================================================
// Value + Repair Cost Estimation
// =============================================================================

/**
 * Estimate a unit's pre-damage C-Bill value. MVP uses
 * `battleValue × CBILLS_PER_BATTLE_VALUE`; production will swap in a
 * price book lookup. Falls back to a sensible default when metadata is
 * missing.
 */
export function estimateUnitValue(meta: IUnitValueMetadata | null): number {
  const bv = meta?.battleValue ?? DEFAULT_BATTLE_VALUE;
  return Math.max(0, Math.round(bv * CBILLS_PER_BATTLE_VALUE));
}

/**
 * Estimate the C-Bill cost to repair a damaged unit back to combat-ready.
 * Formula: `tonnage × cost-per-ton[damageLevel]`. DESTROYED returns 0
 * because the chassis itself is gone — repair cost on parts is handled
 * separately by `estimatePartRepairCost`.
 */
export function estimateRepairCost(
  meta: IUnitValueMetadata | null,
  damageLevel: DamageLevel,
): number {
  const tonnage = meta?.tonnage ?? DEFAULT_TONNAGE;
  const perTon = REPAIR_COST_PER_TON_BY_DAMAGE[damageLevel];
  return Math.max(0, Math.round(tonnage * perTon));
}

/**
 * Estimate the C-Bill cost to refit a salvaged part. Pulled from the
 * spec's `original × (1 - recovery%)` formula. Used by the part branch
 * of `aggregateSalvageCandidates`.
 */
export function estimatePartRepairCost(
  originalValue: number,
  recoveryPercentage: number,
): number {
  return Math.max(0, Math.round(originalValue * (1 - recoveryPercentage)));
}

// =============================================================================
// Aggregate
// =============================================================================

/**
 * Build candidate part records from a destroyed-component list. Filters
 * out non-salvageable items (engine, gyro, IS) per spec §1.
 *
 * Part `originalValue` is intentionally simple — `partValueGuess(name)` —
 * because Wave 3 MVP doesn't have a real price book. Wave 4 will replace
 * with a lookup.
 */
function buildPartCandidates(
  delta: IUnitCombatDelta,
  matchId: string,
  damageLevel: DamageLevel,
): ISalvageCandidate[] {
  const candidates: ISalvageCandidate[] = [];
  for (const name of delta.destroyedComponents) {
    if (!isSalvageablePart(name)) continue;
    const originalValue = partValueGuess(name);
    // Parts pulled from a destroyed unit are themselves damaged — give
    // them HEAVY recovery (25%) so the math stays sane. Wave 4 can refine
    // per-part using crit data.
    const partLevel =
      damageLevel === DamageLevel.Destroyed ? DamageLevel.Heavy : damageLevel;
    const recoveryPercentage = computeRecoveryPercentage(partLevel);
    const recoveredValue = Math.round(originalValue * recoveryPercentage);
    candidates.push({
      source: 'part',
      unitId: delta.unitId,
      designation: name,
      destroyedFromBattle: matchId,
      finalStatus: deltaToFinalStatus(delta),
      damageLevel: partLevel,
      originalValue,
      recoveredValue,
      recoveryPercentage,
      repairCostEstimate: estimatePartRepairCost(
        originalValue,
        recoveryPercentage,
      ),
      partId: `${delta.unitId}::${name}`,
      disposition: 'mercenary',
      status: 'pending',
    });
  }
  return candidates;
}

/**
 * Quick + dirty part value table. MVP placeholder; Wave 4 will replace
 * with a real price book. Values are in C-Bills, normalised to give the
 * unit tests stable arithmetic.
 */
function partValueGuess(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('ppc')) return 200_000;
  if (lower.includes('large laser')) return 100_000;
  if (lower.includes('ac/20')) return 300_000;
  if (lower.includes('ac/10')) return 200_000;
  if (lower.includes('ac/5')) return 125_000;
  if (lower.includes('ac/2')) return 75_000;
  if (lower.includes('lrm')) return 100_000;
  if (lower.includes('srm')) return 50_000;
  if (lower.includes('medium laser')) return 40_000;
  if (lower.includes('small laser')) return 11_250;
  if (lower.includes('machine gun')) return 5_000;
  if (lower.includes('flamer')) return 7_500;
  if (lower.includes('heat sink')) return 2_000;
  if (lower.includes('jump jet')) return 5_000;
  return 25_000;
}

/** Map a delta's UnitFinalStatus enum onto the candidate's narrowed status. */
function deltaToFinalStatus(
  delta: IUnitCombatDelta,
): ISalvageCandidate['finalStatus'] {
  switch (delta.finalStatus) {
    case UnitFinalStatus.Damaged:
      return 'damaged';
    case UnitFinalStatus.Crippled:
      return 'crippled';
    case UnitFinalStatus.Destroyed:
      return 'destroyed';
    case UnitFinalStatus.Ejected:
      return 'ejected';
    case UnitFinalStatus.Intact:
    default:
      return 'intact';
  }
}

/**
 * Aggregate every salvageable item from one outcome into a pool. Only
 * opponent-side units contribute candidates — player units are owned
 * regardless and don't go through salvage.
 *
 * Per spec:
 *   - non-INTACT enemy unit → unit candidate
 *   - DESTROYED enemy unit → unit candidate (recovery 0) PLUS part
 *     candidates from its destroyed-components list
 *   - INTACT enemy unit (clean retreat) → no candidate
 */
export function aggregateSalvageCandidates(
  outcome: ICombatOutcome,
  options?: {
    readonly lookup?: UnitMetadataLookup;
    readonly hostileTerritory?: boolean;
    readonly initialStructure?: ReadonlyMap<
      string,
      Readonly<Record<string, number>>
    >;
  },
): ISalvagePool {
  const lookup = options?.lookup ?? DEFAULT_LOOKUP;
  const hostileTerritory = options?.hostileTerritory ?? false;
  const candidates: ISalvageCandidate[] = [];

  for (const delta of outcome.unitDeltas) {
    if (delta.side !== GameSide.Opponent) continue;
    if (delta.finalStatus === UnitFinalStatus.Intact) continue;
    if (delta.finalStatus === UnitFinalStatus.Ejected) continue;

    const baseline = options?.initialStructure?.get(delta.unitId) ?? null;
    const damageLevel = classifyDamageLevel(delta, baseline);
    const meta = lookup(delta.unitId);
    const designation = meta?.designation ?? DEFAULT_DESIGNATION;
    const recoveryPercentage = computeRecoveryPercentage(damageLevel);
    const originalValue = estimateUnitValue(meta);
    const recoveredValue = Math.round(originalValue * recoveryPercentage);
    const repairCost = estimateRepairCost(meta, damageLevel);

    // Always emit a unit candidate (even DESTROYED → recovery 0) so
    // reports can show "you saw it, it broke" entries.
    candidates.push({
      source: 'unit',
      unitId: delta.unitId,
      designation,
      destroyedFromBattle: outcome.matchId,
      finalStatus: deltaToFinalStatus(delta),
      damageLevel,
      originalValue,
      recoveredValue,
      recoveryPercentage,
      repairCostEstimate: repairCost,
      disposition: 'mercenary',
      status: 'pending',
    });

    // Destroyed units still yield part candidates for any salvageable
    // crit-destroyed components.
    if (damageLevel === DamageLevel.Destroyed) {
      candidates.push(
        ...buildPartCandidates(delta, outcome.matchId, damageLevel),
      );
    }
  }

  const totalEstimatedValue = candidates.reduce(
    (sum, c) => sum + c.recoveredValue,
    0,
  );

  return {
    battleId: outcome.matchId,
    contractId: outcome.contractId,
    candidates,
    totalEstimatedValue,
    hostileTerritory,
  };
}

// =============================================================================
// Splitter — Contract Branch
// =============================================================================

/**
 * Clamp a raw mercenary-percent into a safe 0..100 range. Logs a warning
 * if the input falls outside the allowed band so misconfigured contracts
 * surface in the dev console.
 */
function clampSalvagePercent(raw: number, contractId: string | null): number {
  if (Number.isNaN(raw)) {
    logger.warn(
      `[salvageEngine] NaN salvagePercent on contract ${contractId ?? '<null>'} — defaulting to 0.`,
    );
    return 0;
  }
  if (raw < 0) {
    logger.warn(
      `[salvageEngine] salvagePercent ${raw} < 0 on contract ${contractId ?? '<null>'} — clamping to 0.`,
    );
    return 0;
  }
  if (raw > 100) {
    logger.warn(
      `[salvageEngine] salvagePercent ${raw} > 100 on contract ${contractId ?? '<null>'} — clamping to 100.`,
    );
    return 100;
  }
  return raw;
}

/**
 * Derive a numeric mercenary percent from a contract. Honours the
 * explicit `salvagePercent` first; otherwise maps the legacy enum.
 *
 * Mapping (Wave 3 MVP):
 *   `None` → 0, `Exchange` → 50, `Integrated` → 50.
 */
export function resolveSalvagePercent(contract: IContract | null): number {
  if (!contract) return 0;
  if (typeof contract.salvagePercent === 'number') {
    return clampSalvagePercent(contract.salvagePercent, contract.id);
  }
  switch (contract.salvageRights) {
    case 'None':
      return 0;
    case 'Exchange':
    case 'Integrated':
      return 50;
    default:
      return 0;
  }
}

/**
 * Build an empty award for a side. Helper to keep the splitter readable.
 */
function emptyAward(side: 'mercenary' | 'employer'): ISalvageAward {
  return {
    side,
    candidates: [],
    totalValue: 0,
    estimatedRepairCost: 0,
  };
}

/** Sum the recovered values of an award (used post-distribution). */
function sumAward(candidates: readonly ISalvageCandidate[]): {
  totalValue: number;
  estimatedRepairCost: number;
} {
  let totalValue = 0;
  let estimatedRepairCost = 0;
  for (const c of candidates) {
    totalValue += c.recoveredValue;
    estimatedRepairCost += c.repairCostEstimate;
  }
  return { totalValue, estimatedRepairCost };
}

/**
 * Split a pool by contract clause. Greedy value-weighted distribution:
 * sort candidates by `recoveredValue` desc, then walk in order, awarding
 * each candidate to whichever side is currently furthest below its
 * target. Deterministic for fixed inputs (no RNG, no map iteration).
 *
 * Per spec: total value within ±10% of target is acceptable; the greedy
 * algorithm hits this on any non-degenerate pool.
 */
export function splitByContract(
  pool: ISalvagePool,
  mercenaryPercent: number,
): ISalvageAllocation {
  const clamped = clampSalvagePercent(mercenaryPercent, pool.contractId);
  const targetMercenaryValue = pool.totalEstimatedValue * (clamped / 100);

  // 0% short-circuit → employer keeps everything.
  if (clamped === 0) {
    const employerCandidates = pool.candidates.map((c) =>
      withDisposition(c, 'employer', 'awarded'),
    );
    const sums = sumAward(employerCandidates);
    return {
      pool,
      employerAward: {
        side: 'employer',
        candidates: employerCandidates,
        ...sums,
      },
      mercenaryAward: emptyAward('mercenary'),
      splitMethod: 'contract',
      processed: false,
    };
  }

  // 100% short-circuit → mercenary keeps everything.
  if (clamped === 100) {
    const mercCandidates = pool.candidates.map((c) =>
      withDisposition(c, 'mercenary', 'awarded'),
    );
    const sums = sumAward(mercCandidates);
    return {
      pool,
      employerAward: emptyAward('employer'),
      mercenaryAward: {
        side: 'mercenary',
        candidates: mercCandidates,
        ...sums,
      },
      splitMethod: 'contract',
      processed: false,
    };
  }

  // Best-fit greedy distribution. Sort by recoveredValue desc; ties broken
  // by source/unitId/designation so the result is fully deterministic.
  // After each placement, push the next candidate to whichever side has
  // the larger remaining shortfall vs. its target — this minimises
  // total error vs. the requested split for any non-degenerate pool.
  const sorted = [...pool.candidates].sort(candidateRankingDesc);

  const mercenary: ISalvageCandidate[] = [];
  const employer: ISalvageCandidate[] = [];
  const targetEmployerValue = pool.totalEstimatedValue - targetMercenaryValue;
  let mercTotal = 0;
  let empTotal = 0;

  for (const c of sorted) {
    // Shortfall = how far each side is below its target. Negative means
    // the side has already over-shot. Choose whichever side has the
    // larger shortfall so we close the gap with this candidate.
    const mercShortfall = targetMercenaryValue - mercTotal;
    const empShortfall = targetEmployerValue - empTotal;
    if (mercShortfall >= empShortfall) {
      mercenary.push(withDisposition(c, 'mercenary', 'awarded'));
      mercTotal += c.recoveredValue;
    } else {
      employer.push(withDisposition(c, 'employer', 'awarded'));
      empTotal += c.recoveredValue;
    }
  }

  const mercSums = sumAward(mercenary);
  const empSums = sumAward(employer);

  return {
    pool,
    employerAward: {
      side: 'employer',
      candidates: employer,
      ...empSums,
    },
    mercenaryAward: {
      side: 'mercenary',
      candidates: mercenary,
      ...mercSums,
    },
    splitMethod: 'contract',
    processed: false,
  };
}

/** Comparator used by both contract + auction sorts. Stable, deterministic. */
function candidateRankingDesc(
  a: ISalvageCandidate,
  b: ISalvageCandidate,
): number {
  if (b.recoveredValue !== a.recoveredValue) {
    return b.recoveredValue - a.recoveredValue;
  }
  // Source: unit before part for visual consistency.
  if (a.source !== b.source) return a.source === 'unit' ? -1 : 1;
  if (a.unitId !== b.unitId) return a.unitId.localeCompare(b.unitId);
  return a.designation.localeCompare(b.designation);
}

/** Re-stamp a candidate with a new disposition + status. Pure. */
function withDisposition(
  c: ISalvageCandidate,
  disposition: SalvageDisposition,
  status: ISalvageCandidate['status'],
): ISalvageCandidate {
  return { ...c, disposition, status };
}

// =============================================================================
// Splitter — Auction Branch
// =============================================================================

/**
 * Run an alternating draft. Per spec: employer picks first, then
 * alternating; same pool + same seed → deep-equal allocation. Seed only
 * affects tie-break ordering, not the picking pattern itself.
 */
export function splitByAuction(
  pool: ISalvagePool,
  seed = 0,
): ISalvageAllocation {
  const sorted = [...pool.candidates].sort((a, b) => {
    const primary = candidateRankingDesc(a, b);
    if (primary !== 0) return primary;
    // Tie-breaker uses seed → deterministic per (pool, seed).
    return ((a.unitId.length + seed) % 2) - ((b.unitId.length + seed) % 2);
  });

  const employer: ISalvageCandidate[] = [];
  const mercenary: ISalvageCandidate[] = [];

  sorted.forEach((c, i) => {
    if (i % 2 === 0) {
      employer.push(withDisposition(c, 'auction-employer', 'awarded'));
    } else {
      mercenary.push(withDisposition(c, 'auction-mercenary', 'awarded'));
    }
  });

  const empSums = sumAward(employer);
  const mercSums = sumAward(mercenary);

  return {
    pool,
    employerAward: {
      side: 'employer',
      candidates: employer,
      ...empSums,
    },
    mercenaryAward: {
      side: 'mercenary',
      candidates: mercenary,
      ...mercSums,
    },
    splitMethod: 'auction',
    processed: false,
  };
}

// =============================================================================
// Hostile Territory Modifier
// =============================================================================

/**
 * Halve the mercenary award when the player withdrew from hostile
 * territory. Implementation drops candidates from the mercenary award
 * starting at the *lowest* recovered-value end so the player loses the
 * marginal items first — keeps the high-value salvage they fought for.
 *
 * Dropped candidates are added to the employer award (per spec §5: the
 * remaining half stays on the battlefield, awarded to employer).
 */
export function applyHostileTerritoryModifier(
  allocation: ISalvageAllocation,
  outcome: ICombatOutcome,
): ISalvageAllocation {
  if (!allocation.pool.hostileTerritory) return allocation;
  if (outcome.endReason !== 'withdrawal') return allocation;

  const mercTarget = allocation.mercenaryAward.totalValue / 2;
  // Sort merc award asc by value; drop until we're at or below target.
  const mercenarySorted = [...allocation.mercenaryAward.candidates].sort(
    (a, b) => a.recoveredValue - b.recoveredValue,
  );

  const kept: ISalvageCandidate[] = [];
  const dropped: ISalvageCandidate[] = [];
  let runningTotal = allocation.mercenaryAward.totalValue;

  for (const c of mercenarySorted) {
    if (runningTotal > mercTarget) {
      dropped.push(withDisposition(c, 'employer', 'awarded'));
      runningTotal -= c.recoveredValue;
    } else {
      kept.push(c);
    }
  }

  const newMercSums = sumAward(kept);
  const employerCandidates = [
    ...allocation.employerAward.candidates,
    ...dropped,
  ];
  const newEmpSums = sumAward(employerCandidates);

  return {
    ...allocation,
    mercenaryAward: {
      side: 'mercenary',
      candidates: kept,
      ...newMercSums,
    },
    employerAward: {
      side: 'employer',
      candidates: employerCandidates,
      ...newEmpSums,
    },
    splitMethod: 'hostile_withdrawal',
  };
}

// =============================================================================
// Public Entry Point
// =============================================================================

/**
 * One-call salvage computation. Aggregates → splits → applies hostile
 * modifier. Used by `salvageProcessor` and any direct callers (UI debug
 * panel, REPL).
 *
 * Standalone skirmishes (`outcome.contractId === null`) return an empty
 * allocation so the processor can short-circuit without special casing.
 */
export function computeSalvage(
  outcome: ICombatOutcome,
  contract: IContract | null,
  options?: {
    readonly lookup?: UnitMetadataLookup;
    readonly hostileTerritory?: boolean;
    readonly initialStructure?: ReadonlyMap<
      string,
      Readonly<Record<string, number>>
    >;
    readonly seed?: number;
  },
): ISalvageAllocation {
  const hostileTerritory =
    options?.hostileTerritory ?? contract?.hostileTerritory ?? false;

  const pool = aggregateSalvageCandidates(outcome, {
    lookup: options?.lookup,
    hostileTerritory,
    initialStructure: options?.initialStructure,
  });

  // Standalone skirmish — no contract = no salvage rights at all.
  if (!contract) {
    return {
      pool,
      employerAward: emptyAward('employer'),
      mercenaryAward: emptyAward('mercenary'),
      splitMethod: 'standalone',
      processed: false,
    };
  }

  const useAuction =
    contract.exchangeSalvage === true ||
    (contract.exchangeSalvage === undefined &&
      contract.salvageRights === 'Exchange');

  const baseAllocation = useAuction
    ? splitByAuction(pool, options?.seed ?? 0)
    : splitByContract(pool, resolveSalvagePercent(contract));

  return applyHostileTerritoryModifier(baseAllocation, outcome);
}

// =============================================================================
// Reporting
// =============================================================================

/** Convert an allocation into a UI-facing `ISalvageReport` summary view. */
export function summarizeAllocation(allocation: ISalvageAllocation): {
  readonly matchId: string;
  readonly contractId: string | null;
  readonly candidates: readonly ISalvageCandidate[];
  readonly totalValueEmployer: number;
  readonly totalValueMercenary: number;
  readonly hostileTerritoryPenalty: number;
  readonly auctionRequired: boolean;
  readonly splitMethod: SalvageSplitMethod;
} {
  const isHostile = allocation.splitMethod === 'hostile_withdrawal';
  const isAuction = allocation.splitMethod === 'auction';
  return {
    matchId: allocation.pool.battleId,
    contractId: allocation.pool.contractId,
    candidates: [
      ...allocation.mercenaryAward.candidates,
      ...allocation.employerAward.candidates,
    ],
    totalValueEmployer: allocation.employerAward.totalValue,
    totalValueMercenary: allocation.mercenaryAward.totalValue,
    hostileTerritoryPenalty: isHostile ? 0.5 : 1.0,
    auctionRequired: isAuction,
    splitMethod: allocation.splitMethod,
  };
}
