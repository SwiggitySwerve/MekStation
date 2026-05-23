import type { ICombatRangeHex } from '@/types/gameplay';

import { CoverLevel } from '@/types/gameplay/TerrainTypes';

export function formatCombatWeaponLabel(
  combatInfo: ICombatRangeHex,
): string | null {
  if (combatInfo.attackInvalidReason === 'OutOfAmmo') {
    return 'Weapons: no ammunition';
  }
  if (
    combatInfo.attackInvalidReason === 'InvalidTarget' &&
    combatInfo.attackInvalidDetails === 'No operational weapons'
  ) {
    return 'Weapons: none operational';
  }
  if (combatInfo.weaponIdsAvailable.length > 0) {
    return `Weapons: ${combatInfo.weaponIdsAvailable.join(', ')}`;
  }
  if (combatInfo.weaponIdsInRange.length > 0) {
    return `Weapons in range: ${combatInfo.weaponIdsInRange.join(
      ', ',
    )}; none in arc`;
  }
  if (combatInfo.hasTarget) return 'Weapons: none in range';
  return null;
}

export function formatCombatVisibilityLabel(
  combatInfo: ICombatRangeHex,
): string | null {
  if (
    combatInfo.targetVisibilityState === 'none' &&
    combatInfo.targetUnitIds.length === 0
  ) {
    return null;
  }
  const stateLabel = formatCombatVisibilityStateLabel(
    combatInfo.targetVisibilityState,
  );
  const visibleLabel =
    combatInfo.visibleTargetUnitIds.length > 0
      ? `visible ${combatInfo.visibleTargetUnitIds.join(', ')}`
      : null;
  const obscuredLabel =
    combatInfo.obscuredTargetUnitIds.length > 0
      ? `obscured ${combatInfo.obscuredTargetUnitIds.join(', ')}`
      : null;
  const contactLabels = [visibleLabel, obscuredLabel].filter(Boolean);
  return `Visibility: ${stateLabel}${
    contactLabels.length > 0 ? ` (${contactLabels.join('; ')})` : ''
  }`;
}

export function formatCombatCoverLabel(
  combatInfo: ICombatRangeHex,
): string | null {
  if (
    combatInfo.targetCoverLevel === CoverLevel.None &&
    combatInfo.targetCoverModifier <= 0 &&
    !combatInfo.targetCoverReason
  ) {
    return null;
  }
  const modifier =
    combatInfo.targetCoverModifier > 0
      ? ` +${combatInfo.targetCoverModifier}`
      : '';
  return `Cover: ${combatInfo.targetCoverLevel}${modifier}${
    combatInfo.targetCoverReason ? ` - ${combatInfo.targetCoverReason}` : ''
  }`;
}

export function formatToHitModifierLabel(
  combatInfo: ICombatRangeHex,
): string | null {
  if (!combatInfo.toHitModifiers || combatInfo.toHitModifiers.length === 0) {
    return null;
  }
  return `Modifiers: ${combatInfo.toHitModifiers
    .map(
      (modifier) =>
        `${modifier.name} ${modifier.value >= 0 ? '+' : ''}${modifier.value}`,
    )
    .join('; ')}`;
}

function formatCombatVisibilityStateLabel(
  state: ICombatRangeHex['targetVisibilityState'],
): string {
  switch (state) {
    case 'lastKnown':
      return 'last known';
    case 'mixed':
      return 'mixed';
    case 'hidden':
      return 'hidden';
    case 'visible':
      return 'visible';
    case 'none':
      return 'none';
  }
}
