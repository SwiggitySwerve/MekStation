import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  combatProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

function combatTargetingSourceAttributes(
  combatInfo: ICombatRangeHex,
  projection?: ITacticalMapHexProjection,
): Record<string, string | number | undefined> {
  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return {
    ...tacticalProjectionDataAttributes(source),
    'data-combat-has-target': combatInfo.hasTarget ? 'true' : 'false',
    'data-combat-attackable': combatInfo.attackable ? 'true' : 'false',
    'data-combat-in-range': combatInfo.inRange ? 'true' : 'false',
    'data-combat-in-arc': combatInfo.inArc ? 'true' : 'false',
    'data-combat-target-ids': combatInfo.targetUnitIds.join(','),
    'data-combat-valid-target-ids': combatInfo.validTargetUnitIds.join(','),
    'data-combat-range-bracket': combatInfo.rangeBracket,
    'data-combat-distance': combatInfo.distance,
    'data-combat-los-state': combatInfo.losState,
    'data-combat-firing-arc': combatInfo.firingArc,
    'data-combat-weapons-in-range': combatInfo.weaponIdsInRange.join(','),
    'data-combat-weapons-in-arc': combatInfo.weaponIdsInArc.join(','),
    'data-combat-weapons-available': combatInfo.weaponIdsAvailable.join(','),
    'data-combat-targeting-source-refs': source.sourceRefs,
    'data-combat-targeting-rule-refs': source.ruleRefs,
  };
}

export function CombatTargetingContextRows({
  combatInfo,
  projection,
  testIdPrefix,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testIdPrefix: string;
}): React.ReactElement {
  const sourceAttributes = combatTargetingSourceAttributes(
    combatInfo,
    projection,
  );

  return (
    <>
      <div data-testid={`${testIdPrefix}-range`} {...sourceAttributes}>
        Range: {combatInfo.rangeBracket.replace(/_/g, ' ')} at{' '}
        {combatInfo.distance} hexes
      </div>
      <div data-testid={`${testIdPrefix}-geometry`} {...sourceAttributes}>
        LOS {combatInfo.losState}; {combatInfo.firingArc} arc
      </div>
    </>
  );
}
