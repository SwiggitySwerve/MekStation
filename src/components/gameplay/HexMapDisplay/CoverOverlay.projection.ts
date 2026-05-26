import type { ICombatRangeHex } from '@/types/gameplay';

import { CoverLevel } from '@/types/gameplay/TerrainTypes';

export type CoverProjectionOverlayAttributes = Readonly<
  Record<string, string | number | undefined>
>;

function formatBoolean(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? 'true' : 'false';
}

function formatIds(ids: readonly string[]): string | undefined {
  return ids.length > 0 ? ids.join(',') : undefined;
}

function formatCoverModifier(combatInfo: ICombatRangeHex): string {
  return combatInfo.targetCoverModifier > 0
    ? `+${combatInfo.targetCoverModifier}`
    : '+0';
}

export function combatProjectionHasCover(
  combatInfo: ICombatRangeHex | undefined,
): boolean {
  if (!combatInfo) return false;
  return (
    combatInfo.targetCoverLevel !== CoverLevel.None ||
    combatInfo.targetPartialCover ||
    combatInfo.targetCoverModifier > 0 ||
    combatInfo.targetHullDown === true ||
    (combatInfo.targetHullDownModifier ?? 0) > 0 ||
    Boolean(combatInfo.targetCoverReason)
  );
}

export function coverProjectionOverlayLevel(
  combatInfo: ICombatRangeHex | undefined,
): CoverLevel | undefined {
  return combatProjectionHasCover(combatInfo)
    ? combatInfo?.targetCoverLevel
    : undefined;
}

export function coverProjectionOverlayTitleParts({
  combatInfo,
  projectionExplanation,
}: {
  readonly combatInfo?: ICombatRangeHex;
  readonly projectionExplanation?: string;
}): readonly string[] {
  const parts: string[] = [];

  if (combatInfo) {
    parts.push(
      `Projected combat cover: ${combatInfo.targetCoverLevel} ${formatCoverModifier(combatInfo)}`,
    );
    parts.push(
      combatInfo.targetPartialCover
        ? 'target partial cover true'
        : 'target partial cover false',
    );
    if (combatInfo.targetCoverReason) parts.push(combatInfo.targetCoverReason);
    if (combatInfo.targetHullDownReason) {
      parts.push(combatInfo.targetHullDownReason);
    }
  }

  if (projectionExplanation) {
    parts.push(`Projection: ${projectionExplanation}`);
  }

  return parts;
}

export function coverProjectionOverlayAttributes({
  combatInfo,
  projectionExplanation,
}: {
  readonly combatInfo?: ICombatRangeHex;
  readonly projectionExplanation?: string;
}): CoverProjectionOverlayAttributes {
  return {
    'data-cover-projection-level': combatInfo?.targetCoverLevel,
    'data-cover-projection-partial-cover': formatBoolean(
      combatInfo?.targetPartialCover,
    ),
    'data-cover-projection-modifier': combatInfo?.targetCoverModifier,
    'data-cover-projection-reason': combatInfo?.targetCoverReason,
    'data-cover-projection-target-hull-down': formatBoolean(
      combatInfo?.targetHullDown,
    ),
    'data-cover-projection-hull-down-modifier':
      combatInfo?.targetHullDownModifier,
    'data-cover-projection-hull-down-reason': combatInfo?.targetHullDownReason,
    'data-cover-projection-attackable': formatBoolean(combatInfo?.attackable),
    'data-cover-projection-target-ids': combatInfo
      ? formatIds(combatInfo.targetUnitIds)
      : undefined,
    'data-cover-projection-valid-target-ids': combatInfo
      ? formatIds(combatInfo.validTargetUnitIds)
      : undefined,
    'data-tactical-projection-explanation': projectionExplanation,
  };
}
