import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import { formatCombatVisibilityLabel } from './HexMapDisplay.tooltipFormatters';

export function CombatVisibilityContextRows({
  combatInfo,
  projection,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const label = formatCombatVisibilityLabel(combatInfo);
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
      data-combat-visibility-state={combatInfo.targetVisibilityState}
      data-combat-visibility-visible-target-ids={combatInfo.visibleTargetUnitIds.join(
        '|',
      )}
      data-combat-visibility-obscured-target-ids={combatInfo.obscuredTargetUnitIds.join(
        '|',
      )}
      data-combat-visibility-source-refs={combatSourceRefsAttribute}
      data-combat-visibility-rule-refs={combatRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
