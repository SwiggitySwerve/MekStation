import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';

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
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  const label = formatCombatC3Label(combatInfo);
  if (!label) return null;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-combat-c3-benefit="true"
      data-combat-c3-spotter={combatInfo.c3SpotterId ?? undefined}
      data-combat-c3-spotter-range={combatInfo.c3SpotterRange ?? undefined}
      data-combat-c3-effective-range={combatInfo.rangeBracket}
    >
      {label}
    </div>
  );
}
