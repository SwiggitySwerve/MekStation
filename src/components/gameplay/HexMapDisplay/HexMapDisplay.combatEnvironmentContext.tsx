import React from 'react';

import type {
  ICombatRangeHex,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

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
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const blockedOptions = environmentBlockedOptions(combatInfo);
  if (blockedOptions.length === 0) return null;

  const weaponIds = blockedOptions.map((option) => option.weaponId);
  const reasons = blockedOptions.map(environmentBlockedReason);
  const projectedCombatSourceReferences =
    projection?.sourceReferences.filter(
      (source) => source.channel === 'combat',
    ) ?? [];
  const environmentSourceReferences = projectedCombatSourceReferences.filter(
    (source) => source.label.toLowerCase().includes('environment'),
  );
  const combatSourceReferences =
    environmentSourceReferences.length > 0
      ? environmentSourceReferences
      : projectedCombatSourceReferences;
  const combatSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(combatSourceReferences) ||
    undefined;
  const combatRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(combatSourceReferences) || undefined;
  const combatProjectionChannel =
    combatSourceReferences.length > 0 ? 'combat' : undefined;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-tactical-projection-source={
        combatProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={combatProjectionChannel}
      data-tactical-rules-surface={combatProjectionChannel}
      data-combat-environment-blocked-weapon-ids={weaponIds.join('|')}
      data-combat-environment-blocked-reasons={reasons.join('|')}
      data-combat-environment-source-refs={combatSourceRefsAttribute}
      data-combat-environment-rule-refs={combatRuleRefsAttribute}
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
