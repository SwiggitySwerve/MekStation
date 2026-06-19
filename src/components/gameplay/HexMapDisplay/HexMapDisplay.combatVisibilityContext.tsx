import React from 'react';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import { combatProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';
import { formatCombatVisibilityLabel } from './HexMapDisplay.tooltipFormatters';

export function CombatVisibilityContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const label = formatCombatVisibilityLabel(combatInfo);
  if (!label) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      testId={testId}
      source={source}
      dataAttributes={{
        'data-combat-visibility-state': combatInfo.targetVisibilityState,
        'data-combat-visibility-visible-target-ids':
          combatInfo.visibleTargetUnitIds.join('|'),
        'data-combat-visibility-obscured-target-ids':
          combatInfo.obscuredTargetUnitIds.join('|'),
        'data-combat-visibility-source-refs': source.sourceRefs,
        'data-combat-visibility-rule-refs': source.ruleRefs,
      }}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
