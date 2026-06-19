import React from 'react';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import { combatProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';

export function CombatMinimumRangeContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const label = combatInfo.minimumRangeReason;
  if (!label) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      testId={testId}
      source={source}
      dataAttributes={{
        'data-combat-minimum-range-penalty': combatInfo.minimumRangePenalty,
        'data-combat-minimum-range-weapon-ids':
          combatInfo.minimumRangeWeaponIds?.join('|'),
        'data-combat-minimum-range-reason': combatInfo.minimumRangeReason,
        'data-combat-minimum-range-source-refs': source.sourceRefs,
        'data-combat-minimum-range-rule-refs': source.ruleRefs,
      }}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
