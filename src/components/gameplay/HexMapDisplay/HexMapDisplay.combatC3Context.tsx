import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';

import {
  TacticalProjectionContextRow,
  type CombatContextRowsProps,
} from './HexMapDisplay.contextRow';
import { combatProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';

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

export function CombatC3ContextRows(
  props: CombatContextRowsProps,
): React.ReactElement | null {
  const { combatInfo, projection, testId } = props;
  const label = formatCombatC3Label(combatInfo);
  if (!label) return null;

  const source = combatProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      source={source}
      testId={testId}
      dataAttributes={{
        'data-combat-c3-benefit': 'true',
        'data-combat-c3-spotter': combatInfo.c3SpotterId ?? undefined,
        'data-combat-c3-spotter-range': combatInfo.c3SpotterRange ?? undefined,
        'data-combat-c3-effective-range': combatInfo.rangeBracket,
        'data-combat-c3-source-refs': source.sourceRefs,
        'data-combat-c3-rule-refs': source.ruleRefs,
      }}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
