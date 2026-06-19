import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import {
  sourceReferencesForProjection,
  tacticalProjectionSourceMetadata,
} from './HexMapDisplay.tacticalProjectionAttributes';

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

export function CombatLosContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const blocker = combatInfo.lineOfSightBlocker;
  const label = formatCombatLosContextLabel(combatInfo);
  if (!blocker || !label) return null;

  const losSourceReferences = sourceReferencesForProjection(projection, [
    'combat',
    'los-blocker',
  ]);
  const losProjectionChannel =
    losSourceReferences.length > 0
      ? Array.from(
          new Set(losSourceReferences.map((source) => source.channel)),
        ).join('|')
      : undefined;
  const source = tacticalProjectionSourceMetadata(
    losSourceReferences,
    losProjectionChannel ?? 'line-of-sight',
  );

  return (
    <TacticalProjectionContextRow
      testId={testId}
      source={source}
      rulesSurface="line-of-sight"
      dataAttributes={{
        'data-combat-los-state': combatInfo.losState,
        'data-combat-los-blocker-hex': coordToKey(blocker.hex),
        'data-combat-los-blocker-kind': blocker.kind,
        'data-combat-los-blocker-terrain': blocker.terrain,
        'data-combat-los-blocker-reason': blocker.reason,
        'data-combat-los-context-source-refs': source.sourceRefs,
        'data-combat-los-context-rule-refs': source.ruleRefs,
      }}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
