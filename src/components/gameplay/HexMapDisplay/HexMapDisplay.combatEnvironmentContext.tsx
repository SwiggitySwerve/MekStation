import React from 'react';

import type {
  ICombatRangeHex,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';

function environmentBlockedOptions(
  combatInfo: ICombatRangeHex,
): readonly ICombatWeaponRangeOption[] {
  return combatInfo.weaponRangeOptions.filter(
    (option) => !option.environmentLegal,
  );
}

function environmentBlockedReason(option: ICombatWeaponRangeOption): string {
  return option.blockedReason ?? 'environment blocked';
}

export function CombatEnvironmentContextRows({
  combatInfo,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  const blockedOptions = environmentBlockedOptions(combatInfo);
  if (blockedOptions.length === 0) return null;

  const weaponIds = blockedOptions.map((option) => option.weaponId);
  const reasons = blockedOptions.map(environmentBlockedReason);

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-combat-environment-blocked-weapon-ids={weaponIds.join('|')}
      data-combat-environment-blocked-reasons={reasons.join('|')}
    >
      Environment restrictions:{' '}
      {blockedOptions
        .map(
          (option) => `${option.weaponId}: ${environmentBlockedReason(option)}`,
        )
        .join('; ')}
    </div>
  );
}
