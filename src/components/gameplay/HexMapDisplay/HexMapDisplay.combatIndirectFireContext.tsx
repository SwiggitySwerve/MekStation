import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

export function CombatIndirectFireContextRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const label = combatInfo.indirectFireReason;
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
      data-combat-indirect-fire={
        combatInfo.indirectFireAvailable ? 'true' : undefined
      }
      data-combat-indirect-spotter={
        combatInfo.indirectFireSpotterId ?? undefined
      }
      data-combat-indirect-basis={combatInfo.indirectFireBasis}
      data-combat-indirect-penalty={combatInfo.indirectFireToHitPenalty}
      data-combat-indirect-spotter-attacked={
        combatInfo.indirectFireSpotterAttacked ? 'true' : undefined
      }
      data-combat-indirect-forward-observer={
        combatInfo.indirectFireForwardObserver ? 'true' : undefined
      }
      data-combat-indirect-penalty-cancelled={
        combatInfo.indirectFirePenaltyCancelled
      }
      data-combat-indirect-reason={combatInfo.indirectFireReason}
      data-combat-indirect-source-refs={combatSourceRefsAttribute}
      data-combat-indirect-rule-refs={combatRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
