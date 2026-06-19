import React from 'react';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import { combatProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';

export function CombatIndirectFireContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const label = combatInfo.indirectFireReason;
  if (!label) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      source={source}
      testId={testId}
      dataAttributes={{
        'data-combat-indirect-fire': combatInfo.indirectFireAvailable
          ? 'true'
          : undefined,
        'data-combat-indirect-spotter':
          combatInfo.indirectFireSpotterId ?? undefined,
        'data-combat-indirect-basis': combatInfo.indirectFireBasis,
        'data-combat-indirect-penalty': combatInfo.indirectFireToHitPenalty,
        'data-combat-indirect-spotter-attacked':
          combatInfo.indirectFireSpotterAttacked ? 'true' : undefined,
        'data-combat-indirect-forward-observer':
          combatInfo.indirectFireForwardObserver ? 'true' : undefined,
        'data-combat-indirect-penalty-cancelled':
          combatInfo.indirectFirePenaltyCancelled,
        'data-combat-indirect-reason': combatInfo.indirectFireReason,
        'data-combat-indirect-source-refs': source.sourceRefs,
        'data-combat-indirect-rule-refs': source.ruleRefs,
      }}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
