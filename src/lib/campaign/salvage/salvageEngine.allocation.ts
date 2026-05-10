import type { IContract } from '@/types/campaign/Mission';
import type {
  ISalvageAllocation,
  ISalvageAward,
  ISalvageCandidate,
  ISalvagePool,
  SalvageDisposition,
} from '@/types/campaign/Salvage';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { logger } from '@/utils/logger';

// =============================================================================
// Splitter â€” Contract Branch
// =============================================================================

/**
 * Clamp a raw mercenary-percent into a safe 0..100 range. Logs a warning
 * if the input falls outside the allowed band so misconfigured contracts
 * surface in the dev console.
 */
function clampSalvagePercent(raw: number, contractId: string | null): number {
  if (Number.isNaN(raw)) {
    logger.warn(
      `[salvageEngine] NaN salvagePercent on contract ${contractId ?? '<null>'} â€” defaulting to 0.`,
    );
    return 0;
  }
  if (raw < 0) {
    logger.warn(
      `[salvageEngine] salvagePercent ${raw} < 0 on contract ${contractId ?? '<null>'} â€” clamping to 0.`,
    );
    return 0;
  }
  if (raw > 100) {
    logger.warn(
      `[salvageEngine] salvagePercent ${raw} > 100 on contract ${contractId ?? '<null>'} â€” clamping to 100.`,
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
 *   `None` â†’ 0, `Exchange` â†’ 50, `Integrated` â†’ 50.
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
export function emptyAward(side: 'mercenary' | 'employer'): ISalvageAward {
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
 * Per spec: total value within Â±10% of target is acceptable; the greedy
 * algorithm hits this on any non-degenerate pool.
 */
export function splitByContract(
  pool: ISalvagePool,
  mercenaryPercent: number,
): ISalvageAllocation {
  const clamped = clampSalvagePercent(mercenaryPercent, pool.contractId);
  const targetMercenaryValue = pool.totalEstimatedValue * (clamped / 100);

  // 0% short-circuit â†’ employer keeps everything.
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

  // 100% short-circuit â†’ mercenary keeps everything.
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
  // the larger remaining shortfall vs. its target â€” this minimises
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
// Splitter â€” Auction Branch
// =============================================================================

/**
 * Run an alternating draft. Per spec: employer picks first, then
 * alternating; same pool + same seed â†’ deep-equal allocation. Seed only
 * affects tie-break ordering, not the picking pattern itself.
 */
export function splitByAuction(
  pool: ISalvagePool,
  seed = 0,
): ISalvageAllocation {
  const sorted = [...pool.candidates].sort((a, b) => {
    const primary = candidateRankingDesc(a, b);
    if (primary !== 0) return primary;
    // Tie-breaker uses seed â†’ deterministic per (pool, seed).
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
 * marginal items first â€” keeps the high-value salvage they fought for.
 *
 * Dropped candidates are added to the employer award (per spec Â§5: the
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
