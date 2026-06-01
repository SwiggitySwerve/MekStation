import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

function formatSpotterRange(range: number | null | undefined): string {
  if (range === null || range === undefined) return 'unknown range';
  return `${range} ${range === 1 ? 'hex' : 'hexes'}`;
}

export function formatCombatC3Label(
  combatInfo: ICombatRangeHex,
): string | null {
  if (!combatInfo.c3BenefitApplied) return null;

  const spotter = combatInfo.c3SpotterId ?? 'unknown';
  const range = formatSpotterRange(combatInfo.c3SpotterRange);
  const bracket = combatInfo.rangeBracket.replace(/_/g, ' ');
  return `C3: spotter ${spotter} at ${range} improves to ${bracket} range`;
}

export function CombatC3ContextRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const label = formatCombatC3Label(combatInfo);
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
      data-combat-c3-benefit="true"
      data-combat-c3-spotter={combatInfo.c3SpotterId ?? undefined}
      data-combat-c3-spotter-range={combatInfo.c3SpotterRange ?? undefined}
      data-combat-c3-effective-range={combatInfo.rangeBracket}
      data-combat-c3-source-refs={combatSourceRefsAttribute}
      data-combat-c3-rule-refs={combatRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
