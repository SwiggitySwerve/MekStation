import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

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

export function CombatReasonContextRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const label = combatReasonText(combatInfo);
  if (!label) return null;

  const combatSourceReferences =
    projection?.sourceReferences.filter(
      (source) => source.channel === 'combat',
    ) ?? [];
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
      data-combat-attackable={combatInfo.attackable ? 'true' : 'false'}
      data-combat-has-target={combatInfo.hasTarget ? 'true' : 'false'}
      data-combat-target-ids={combatInfo.targetUnitIds.join(',')}
      data-combat-range-bracket={combatInfo.rangeBracket}
      data-combat-distance={combatInfo.distance}
      data-combat-los-state={combatInfo.losState}
      data-combat-firing-arc={combatInfo.firingArc}
      data-combat-blocked-reason={combatInfo.blockedReason}
      data-combat-invalid-reason={combatInfo.attackInvalidReason}
      data-combat-invalid-details={combatInfo.attackInvalidDetails}
      data-combat-visibility-blocked-reason={combatInfo.visibilityBlockedReason}
      data-combat-los-blocker-reason={combatInfo.lineOfSightBlockerReason}
      data-combat-to-hit-reason={combatInfo.toHitReason}
      data-combat-indirect-fire-reason={combatInfo.indirectFireReason}
      data-combat-indirect-blocked-reason={
        combatInfo.indirectFireUnavailableReason
      }
      data-combat-cover-reason={combatInfo.targetCoverReason}
      data-combat-reason={label}
      data-combat-reason-source-refs={combatSourceRefsAttribute}
      data-combat-reason-rule-refs={combatRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
