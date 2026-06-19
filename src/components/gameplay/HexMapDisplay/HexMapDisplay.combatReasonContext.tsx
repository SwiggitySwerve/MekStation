import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import { combatProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';

export function combatReasonText(
  combatInfo: ICombatRangeHex,
): string | undefined {
  return combatInfo.attackable
    ? (combatInfo.toHitReason ??
        combatInfo.indirectFireReason ??
        combatInfo.targetCoverReason)
    : (combatInfo.attackInvalidDetails ??
        combatInfo.indirectFireUnavailableReason ??
        combatInfo.blockedReason ??
        combatInfo.visibilityBlockedReason ??
        combatInfo.lineOfSightBlockerReason);
}

export function CombatReasonContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const label = combatReasonText(combatInfo);
  if (!label) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      dataAttributes={{
        'data-combat-attackable': combatInfo.attackable ? 'true' : 'false',
        'data-combat-has-target': combatInfo.hasTarget ? 'true' : 'false',
        'data-combat-target-ids': combatInfo.targetUnitIds.join(','),
        'data-combat-range-bracket': combatInfo.rangeBracket,
        'data-combat-distance': combatInfo.distance,
        'data-combat-los-state': combatInfo.losState,
        'data-combat-firing-arc': combatInfo.firingArc,
        'data-combat-blocked-reason': combatInfo.blockedReason,
        'data-combat-invalid-reason': combatInfo.attackInvalidReason,
        'data-combat-invalid-details': combatInfo.attackInvalidDetails,
        'data-combat-visibility-blocked-reason':
          combatInfo.visibilityBlockedReason,
        'data-combat-los-blocker-reason': combatInfo.lineOfSightBlockerReason,
        'data-combat-to-hit-reason': combatInfo.toHitReason,
        'data-combat-indirect-fire-reason': combatInfo.indirectFireReason,
        'data-combat-indirect-blocked-reason':
          combatInfo.indirectFireUnavailableReason,
        'data-combat-cover-reason': combatInfo.targetCoverReason,
        'data-combat-reason': label,
        'data-combat-reason-source-refs': source.sourceRefs,
        'data-combat-reason-rule-refs': source.ruleRefs,
      }}
      source={source}
      testId={testId}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
