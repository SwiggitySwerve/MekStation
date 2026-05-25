import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

export function formatCombatLosContextLabel(
  combatInfo: ICombatRangeHex,
): string | null {
  const blocker = combatInfo.lineOfSightBlocker;
  if (!blocker) return null;

  const terrain = blocker.terrain ? `, terrain ${blocker.terrain}` : '';
  return `LOS context: ${combatInfo.losState} via ${blocker.kind} at ${coordToKey(
    blocker.hex,
  )}${terrain} - ${blocker.reason}`;
}

export function CombatLosContextRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const blocker = combatInfo.lineOfSightBlocker;
  const label = formatCombatLosContextLabel(combatInfo);
  if (!blocker || !label) return null;

  const losSourceReferences =
    projection?.sourceReferences.filter(
      (source) =>
        source.channel === 'combat' || source.channel === 'los-blocker',
    ) ?? [];
  const losSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(losSourceReferences) || undefined;
  const losRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(losSourceReferences) || undefined;
  const losProjectionChannel =
    losSourceReferences.length > 0
      ? Array.from(
          new Set(losSourceReferences.map((source) => source.channel)),
        ).join('|')
      : undefined;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-tactical-projection-source={
        losProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={losProjectionChannel}
      data-tactical-rules-surface={
        losProjectionChannel ? 'line-of-sight' : undefined
      }
      data-combat-los-state={combatInfo.losState}
      data-combat-los-blocker-hex={coordToKey(blocker.hex)}
      data-combat-los-blocker-kind={blocker.kind}
      data-combat-los-blocker-terrain={blocker.terrain}
      data-combat-los-blocker-reason={blocker.reason}
      data-combat-los-context-source-refs={losSourceRefsAttribute}
      data-combat-los-context-rule-refs={losRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
