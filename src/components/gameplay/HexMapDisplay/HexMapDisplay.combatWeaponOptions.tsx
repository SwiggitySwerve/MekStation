import React from 'react';

import type {
  ICombatRangeHex,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';

function formatRangeLabel(option: ICombatWeaponRangeOption): string {
  return option.rangeBracket.replace(/_/g, ' ');
}

function formatRangeState(option: ICombatWeaponRangeOption): string {
  const label = formatRangeLabel(option);
  return option.inRange ? `${label} range` : label;
}

function formatArcLabel(option: ICombatWeaponRangeOption): string {
  return option.inArc ? 'in arc' : 'out of arc';
}

function formatEnvironmentLabel(option: ICombatWeaponRangeOption): string {
  return option.environmentLegal ? '' : '; environment blocked';
}

function formatMinimumRangeLabel(option: ICombatWeaponRangeOption): string {
  return option.minimumRangePenalty === undefined
    ? ''
    : `; minimum +${option.minimumRangePenalty}`;
}

function formatToHitLabel(option: ICombatWeaponRangeOption): string {
  return option.toHitNumber === undefined ? '' : `; TN ${option.toHitNumber}`;
}

function formatAvailabilityLabel(option: ICombatWeaponRangeOption): string {
  const status = option.available ? 'available' : 'blocked';
  const reason = option.blockedReason ? ` - ${option.blockedReason}` : '';
  return `${status}${reason}`;
}

function formatWeaponOption(option: ICombatWeaponRangeOption): string {
  return `${option.weaponId}: ${formatRangeState(option)}, ${formatArcLabel(
    option,
  )}${formatEnvironmentLabel(option)}${formatMinimumRangeLabel(
    option,
  )}${formatToHitLabel(option)}; ${formatAvailabilityLabel(option)}`;
}

export function CombatWeaponOptionRows({
  combatInfo,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  if (combatInfo.weaponRangeOptions.length === 0) return null;

  return (
    <div data-testid={testId}>
      Weapon options:{' '}
      {combatInfo.weaponRangeOptions.map(formatWeaponOption).join('; ')}
    </div>
  );
}
