import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import { formatCombatCoverLabel } from './HexMapDisplay.tooltipFormatters';

export function CombatCoverContextRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const label = formatCombatCoverLabel(combatInfo);
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
      data-combat-cover-level={combatInfo.targetCoverLevel}
      data-combat-cover-modifier={combatInfo.targetCoverModifier}
      data-combat-cover-partial={String(combatInfo.targetPartialCover)}
      data-combat-cover-reason={combatInfo.targetCoverReason}
      data-combat-target-hull-down={String(combatInfo.targetHullDown ?? false)}
      data-combat-hull-down-modifier={combatInfo.targetHullDownModifier}
      data-combat-hull-down-reason={combatInfo.targetHullDownReason}
      data-combat-cover-source-refs={combatSourceRefsAttribute}
      data-combat-cover-rule-refs={combatRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
