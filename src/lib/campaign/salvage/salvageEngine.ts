import type { IContract } from '@/types/campaign/Mission';
import type {
  ISalvageAllocation,
  ISalvageCandidate,
  ISalvagePool,
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

import {
  applyHostileTerritoryModifier,
  emptyAward,
  resolveSalvagePercent,
  splitByAuction,
  splitByContract,
} from './salvageEngine.allocation';
export {
  applyHostileTerritoryModifier,
  resolveSalvagePercent,
  splitByAuction,
  splitByContract,
} from './salvageEngine.allocation';
export interface IUnitValueMetadata {
  readonly designation: string;
  readonly tonnage: number;
  readonly battleValue: number;
}
export type UnitMetadataLookup = (unitId: string) => IUnitValueMetadata | null;
const DEFAULT_LOOKUP: UnitMetadataLookup = () => null;
const DEFAULT_TONNAGE = 50;
const DEFAULT_BATTLE_VALUE = 1_000;
const DEFAULT_DESIGNATION = 'Unknown Mech';
const NON_SALVAGEABLE_KEYWORDS: readonly string[] = [
  'engine',
  'gyro',
  'internal structure',
  'internal-structure',
  'cockpit',
  'life support',
  'sensors',
];
function isSalvageablePart(componentName: string): boolean {
  const lower = componentName.toLowerCase();
  return !NON_SALVAGEABLE_KEYWORDS.some((kw) => lower.includes(kw));
}
export function classifyDamageLevel(
  delta: IUnitCombatDelta,
  initialStructurePerLocation: Readonly<Record<string, number>> | null = null,
): DamageLevel {
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
export function computeRecoveryPercentage(level: DamageLevel): number {
  return RECOVERY_PERCENTAGE_BY_DAMAGE[level];
}
export function estimateUnitValue(meta: IUnitValueMetadata | null): number {
  const bv = meta?.battleValue ?? DEFAULT_BATTLE_VALUE;
  return Math.max(0, Math.round(bv * CBILLS_PER_BATTLE_VALUE));
}
export function estimateRepairCost(
  meta: IUnitValueMetadata | null,
  damageLevel: DamageLevel,
): number {
  const tonnage = meta?.tonnage ?? DEFAULT_TONNAGE;
  const perTon = REPAIR_COST_PER_TON_BY_DAMAGE[damageLevel];
  return Math.max(0, Math.round(tonnage * perTon));
}
export function estimatePartRepairCost(
  originalValue: number,
  recoveryPercentage: number,
): number {
  return Math.max(0, Math.round(originalValue * (1 - recoveryPercentage)));
}
function buildPartCandidates(
  delta: IUnitCombatDelta,
  matchId: string,
  damageLevel: DamageLevel,
): ISalvageCandidate[] {
  const candidates: ISalvageCandidate[] = [];
  for (const name of delta.destroyedComponents) {
    if (!isSalvageablePart(name)) continue;
    const originalValue = partValueGuess(name);
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
