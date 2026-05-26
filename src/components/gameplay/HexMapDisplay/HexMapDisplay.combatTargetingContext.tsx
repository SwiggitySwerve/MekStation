import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

function combatTargetingSourceAttributes(
  combatInfo: ICombatRangeHex,
  projection?: ITacticalMapHexProjection,
): Record<string, string | number | undefined> {
  const combatSourceReferences =
    projection?.sourceReferences.filter(
      (source) => source.channel === 'combat',
    ) ?? [];
  const sourceRefsAttribute =
    formatTacticalProjectionSourceReferences(combatSourceReferences) ||
    undefined;
  const ruleRefsAttribute =
    formatTacticalProjectionRuleReferences(combatSourceReferences) || undefined;
  const projectionChannel =
    combatSourceReferences.length > 0 ? 'combat' : undefined;

  return {
    'data-tactical-projection-source': projectionChannel
      ? 'shared-tactical-map-projection'
      : undefined,
    'data-tactical-projection-channel': projectionChannel,
    'data-tactical-rules-surface': projectionChannel,
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
    'data-combat-targeting-source-refs': sourceRefsAttribute,
    'data-combat-targeting-rule-refs': ruleRefsAttribute,
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
