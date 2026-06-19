import type { ICombatRangeHex } from '@/types/gameplay';

import { CoverLevel, RangeBracket } from '@/types/gameplay';

export function formatRangeBracketLabel(bracket: RangeBracket): string {
  switch (bracket) {
    case RangeBracket.Short:
      return 'S';
    case RangeBracket.Medium:
      return 'M';
    case RangeBracket.Long:
      return 'L';
    case RangeBracket.Extreme:
      return 'X';
    case RangeBracket.OutOfRange:
      return 'OUT';
  }
}

export function formatCombatRangeBadgeLabel(
  combatInfo: ICombatRangeHex,
): string {
  const distance = Number.isFinite(combatInfo.distance)
    ? combatInfo.distance
    : '?';
  return `${formatRangeBracketLabel(combatInfo.rangeBracket)}${distance}`;
}

function formatCombatCoverBadgeLevelLabel(level: CoverLevel): string {
  switch (level) {
    case CoverLevel.Partial:
      return 'P';
    case CoverLevel.Full:
      return 'F';
    case CoverLevel.None:
      return 'C';
  }
}

export function formatCombatCoverBadgeLabel(
  combatInfo: ICombatRangeHex,
): string {
  return `${formatCombatCoverBadgeLevelLabel(combatInfo.targetCoverLevel)}+${combatInfo.targetCoverModifier}`;
}

function formatRangeBracketName(bracket: RangeBracket): string {
  return bracket.replace(/_/g, ' ');
}

function formatWeaponList(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(', ') : 'none';
}

export function formatCombatBadgeSummary(combatInfo: ICombatRangeHex): string {
  const status = combatInfo.attackable ? 'attack available' : 'not attackable';
  const blockedOptions = combatInfo.weaponRangeOptions
    .filter((option) => !option.available)
    .map((option) => `${option.weaponId} ${option.blockedReason ?? 'blocked'}`);
  const optionSummary =
    blockedOptions.length > 0
      ? `; blocked weapons ${blockedOptions.join(', ')}`
      : '';
  return `${formatRangeBracketName(combatInfo.rangeBracket)} range at ${combatInfo.distance} hexes; ${status}; weapons available ${formatWeaponList(combatInfo.weaponIdsAvailable)}${optionSummary}`;
}

export function weaponOptionAvailabilityCount(combatInfo: ICombatRangeHex): {
  readonly available: number;
  readonly total: number;
  readonly blocked: number;
} {
  const total = combatInfo.weaponRangeOptions.length;
  const available = combatInfo.weaponRangeOptions.filter(
    (option) => option.available,
  ).length;
  return {
    available,
    total,
    blocked: total - available,
  };
}

export function formatWeaponAvailabilityTitle(
  combatInfo: ICombatRangeHex,
): string {
  const { available, total, blocked } =
    weaponOptionAvailabilityCount(combatInfo);
  const blockedOptions = combatInfo.weaponRangeOptions
    .filter((option) => !option.available)
    .map(
      (option) => `${option.weaponId}: ${option.blockedReason ?? 'blocked'}`,
    );
  const blockedSummary =
    blockedOptions.length > 0 ? `; blocked ${blockedOptions.join(', ')}` : '';
  return `Weapons available ${available} of ${total}; blocked ${blocked}${blockedSummary}`;
}
