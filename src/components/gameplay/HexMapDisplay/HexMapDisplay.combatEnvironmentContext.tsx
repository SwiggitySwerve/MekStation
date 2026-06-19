import React from 'react';

import type {
  ICombatRangeHex,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import {
  sourceReferencesForProjection,
  tacticalProjectionSourceMetadata,
} from './HexMapDisplay.tacticalProjectionAttributes';

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

export function CombatEnvironmentContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const blockedOptions = environmentBlockedOptions(combatInfo);
  if (blockedOptions.length === 0) return null;

  const weaponIds = blockedOptions.map((option) => option.weaponId);
  const reasons = blockedOptions.map(environmentBlockedReason);
  const projectedCombatSourceReferences = sourceReferencesForProjection(
    projection,
    'combat',
  );
  const environmentSourceReferences = projectedCombatSourceReferences.filter(
    (source) => source.label.toLowerCase().includes('environment'),
  );
  const combatSourceReferences =
    environmentSourceReferences.length > 0
      ? environmentSourceReferences
      : projectedCombatSourceReferences;
  const source = tacticalProjectionSourceMetadata(
    combatSourceReferences,
    'combat',
  );

  return (
    <TacticalProjectionContextRow
      source={source}
      testId={testId}
      dataAttributes={{
        'data-combat-environment-blocked-weapon-ids': weaponIds.join('|'),
        'data-combat-environment-blocked-reasons': reasons.join('|'),
        'data-combat-environment-source-refs': source.sourceRefs,
        'data-combat-environment-rule-refs': source.ruleRefs,
      }}
    >
      Environment restrictions:{' '}
      {blockedOptions
        .map(
          (option) => `${option.weaponId}: ${environmentBlockedReason(option)}`,
        )
        .join('; ')}
    </TacticalProjectionContextRow>
  );
}
