import React from 'react';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import { combatProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';
import { formatCombatCoverLabel } from './HexMapDisplay.tooltipFormatters';

export function CombatCoverContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const label = formatCombatCoverLabel(combatInfo);
  if (!label) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      dataAttributes={{
        'data-combat-cover-level': combatInfo.targetCoverLevel,
        'data-combat-cover-modifier': combatInfo.targetCoverModifier,
        'data-combat-cover-partial': String(combatInfo.targetPartialCover),
        'data-combat-cover-reason': combatInfo.targetCoverReason,
        'data-combat-target-hull-down': String(
          combatInfo.targetHullDown ?? false,
        ),
        'data-combat-hull-down-modifier': combatInfo.targetHullDownModifier,
        'data-combat-hull-down-reason': combatInfo.targetHullDownReason,
        'data-combat-cover-source-refs': source.sourceRefs,
        'data-combat-cover-rule-refs': source.ruleRefs,
      }}
      source={source}
      testId={testId}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
