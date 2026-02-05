export enum Profession {
  MEKWARRIOR = 'mekwarrior',
  AEROSPACE = 'aerospace',
  VEHICLE = 'vehicle',
  NAVAL = 'naval',
  INFANTRY = 'infantry',
  TECH = 'tech',
  MEDICAL = 'medical',
  ADMINISTRATOR = 'administrator',
  CIVILIAN = 'civilian',
}

export interface IRank {
  readonly names: Partial<Record<Profession, string>>;
  readonly officer: boolean;
  readonly payMultiplier: number;
}

export interface IRankSystem {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly type: 'default' | 'custom' | 'campaign';
  readonly ranks: readonly IRank[];
  readonly officerCut: number;
}

export const RANK_TIERS = {
  ENLISTED_MIN: 0,
  ENLISTED_MAX: 20,
  WARRANT_MIN: 21,
  WARRANT_MAX: 30,
  OFFICER_MIN: 31,
  OFFICER_MAX: 50,
  TOTAL: 51,
} as const;

export type RankTier = 'enlisted' | 'warrant_officer' | 'officer';

export function getRankTier(rankIndex: number): RankTier {
  if (rankIndex >= RANK_TIERS.OFFICER_MIN) return 'officer';
  if (rankIndex >= RANK_TIERS.WARRANT_MIN) return 'warrant_officer';
  return 'enlisted';
}

export function isValidRankIndex(rankIndex: number): boolean {
  return (
    Number.isInteger(rankIndex) &&
    rankIndex >= 0 &&
    rankIndex < RANK_TIERS.TOTAL
  );
}

export function createEmptyRank(): IRank {
  return { names: {}, officer: false, payMultiplier: 1.0 };
}

export function createRanks(
  populatedRanks: Record<number, IRank>,
): readonly IRank[] {
  const ranks: IRank[] = [];
  for (let i = 0; i < RANK_TIERS.TOTAL; i++) {
    ranks.push(populatedRanks[i] ?? createEmptyRank());
  }
  return Object.freeze(ranks);
}

// Type guards
export function isProfession(value: unknown): value is Profession {
  return (
    typeof value === 'string' &&
    Object.values(Profession).includes(value as Profession)
  );
}

export function isRankTier(value: unknown): value is RankTier {
  return (
    value === 'enlisted' || value === 'warrant_officer' || value === 'officer'
  );
}

export const ALL_PROFESSIONS: readonly Profession[] = Object.freeze(
  Object.values(Profession),
);
