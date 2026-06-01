import type { ICombatRangeHex } from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

export type CombatProjectionDataAttributes = Readonly<
  Record<string, string | number | undefined>
>;

function formatRangeBracket(rangeBracket: ICombatRangeHex['rangeBracket']) {
  return rangeBracket.replace(/_/g, ' ');
}

function combatProjectionTargetLabel(
  combatProjection: ICombatRangeHex,
): string {
  return combatProjection.targetUnitIds.length > 0
    ? combatProjection.targetUnitIds.join(', ')
    : 'none';
}

export function combatProjectionSummary(
  combatProjection: ICombatRangeHex | undefined,
): string | null {
  if (!combatProjection) return null;

  const range = formatRangeBracket(combatProjection.rangeBracket);
  const distanceLabel =
    combatProjection.distance === 1
      ? '1 hex'
      : `${combatProjection.distance} hexes`;
  const targetLabel = combatProjectionTargetLabel(combatProjection);
  const blocker = combatProjection.lineOfSightBlocker;
  const blockerLabel = blocker
    ? `; blocker ${blocker.kind} at ${coordToKey(blocker.hex)}${
        blocker.terrain ? ` terrain ${blocker.terrain}` : ''
      }: ${blocker.reason}`
    : combatProjection.lineOfSightBlockerReason
      ? `; ${combatProjection.lineOfSightBlockerReason}`
      : '';

  return `Combat projection LOS ${combatProjection.losState}; range ${range} at ${distanceLabel}; targets ${targetLabel}${blockerLabel}`;
}

export function combatProjectionDataAttributes(
  combatProjection: ICombatRangeHex | undefined,
): CombatProjectionDataAttributes {
  const blocker = combatProjection?.lineOfSightBlocker;
  return {
    'data-combat-projection-los-state': combatProjection?.losState,
    'data-combat-projection-range-bracket': combatProjection?.rangeBracket,
    'data-combat-projection-distance': combatProjection?.distance,
    'data-combat-projection-target-ids':
      combatProjection?.targetUnitIds.join(','),
    'data-combat-projection-los-blocker-hex': blocker
      ? coordToKey(blocker.hex)
      : undefined,
    'data-combat-projection-los-blocker-kind': blocker?.kind,
    'data-combat-projection-los-blocker-terrain': blocker?.terrain,
    'data-combat-projection-los-blocker-reason':
      blocker?.reason ?? combatProjection?.lineOfSightBlockerReason,
  };
}
