import React from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

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
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  const blocker = combatInfo.lineOfSightBlocker;
  const label = formatCombatLosContextLabel(combatInfo);
  if (!blocker || !label) return null;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-combat-los-state={combatInfo.losState}
      data-combat-los-blocker-hex={coordToKey(blocker.hex)}
      data-combat-los-blocker-kind={blocker.kind}
      data-combat-los-blocker-terrain={blocker.terrain}
      data-combat-los-blocker-reason={blocker.reason}
    >
      {label}
    </div>
  );
}
