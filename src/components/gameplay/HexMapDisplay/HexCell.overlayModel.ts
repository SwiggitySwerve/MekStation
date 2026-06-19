import type { ICombatRangeHex, IMovementRangeHex } from '@/types/gameplay';
import type {
  ITacticalMapProjectionSourceReference,
  TacticalMapCombatProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import { HEX_COLORS } from '@/constants/hexMap';
import { MovementType } from '@/types/gameplay';

export type HexOverlayKind =
  | 'selected'
  | 'path'
  | 'movement-legal'
  | 'movement-blocked'
  | 'combat-attackable'
  | 'combat-blocked'
  | 'legacy-range'
  | 'hover';

export interface HexOverlayState {
  readonly fill: string | null;
  readonly hasOverlay: boolean;
  readonly isLegacyAttackRangeFallback: boolean;
  readonly kind: HexOverlayKind | null;
  readonly opacity: number;
}

interface HexOverlayStateOptions {
  readonly combatInfo?: ICombatRangeHex;
  readonly isHovered: boolean;
  readonly isInAttackRange: boolean;
  readonly isInPath: boolean;
  readonly isSelected: boolean;
  readonly movementInfo?: IMovementRangeHex;
  readonly tacticalProjectionCombatStatus?: TacticalMapCombatProjectionStatus;
  readonly tacticalProjectionSourceReferences?: readonly ITacticalMapProjectionSourceReference[];
}

function createOverlayState(
  options: Omit<HexOverlayState, 'hasOverlay'>,
): HexOverlayState {
  return {
    ...options,
    hasOverlay: options.kind !== null,
  };
}

export function deriveHexOverlayState({
  combatInfo,
  isHovered,
  isInAttackRange,
  isInPath,
  isSelected,
  movementInfo,
  tacticalProjectionCombatStatus,
  tacticalProjectionSourceReferences,
}: HexOverlayStateOptions): HexOverlayState {
  const isLegacyAttackRangeFallback =
    isInAttackRange &&
    !combatInfo &&
    tacticalProjectionCombatStatus === 'range-only' &&
    hasLegacyAttackRangeSource(tacticalProjectionSourceReferences);

  if (isSelected) {
    return createOverlayState({
      fill: HEX_COLORS.hexSelected,
      isLegacyAttackRangeFallback,
      kind: 'selected',
      opacity: 0.7,
    });
  }

  if (isInPath) {
    return createOverlayState({
      fill: HEX_COLORS.pathHighlight,
      isLegacyAttackRangeFallback,
      kind: 'path',
      opacity: 0.6,
    });
  }

  if (movementInfo) {
    return createOverlayState({
      fill: movementInfo.reachable
        ? colorForMovementType(movementInfo.movementType)
        : HEX_COLORS.movementRangeUnreachable,
      isLegacyAttackRangeFallback,
      kind: movementInfo.reachable ? 'movement-legal' : 'movement-blocked',
      opacity: 0.5,
    });
  }

  if (combatInfo?.inRange || combatInfo?.hasTarget) {
    return createOverlayState({
      fill: combatInfo.attackable
        ? HEX_COLORS.attackRange
        : HEX_COLORS.movementRangeUnreachable,
      isLegacyAttackRangeFallback,
      kind: combatInfo.attackable ? 'combat-attackable' : 'combat-blocked',
      opacity: combatInfo.attackable ? 0.5 : 0.45,
    });
  }

  if (isLegacyAttackRangeFallback) {
    return createOverlayState({
      fill: HEX_COLORS.attackRangeFallback,
      isLegacyAttackRangeFallback,
      kind: 'legacy-range',
      opacity: 0.24,
    });
  }

  if (isInAttackRange) {
    return createOverlayState({
      fill: HEX_COLORS.attackRange,
      isLegacyAttackRangeFallback,
      kind: 'combat-attackable',
      opacity: 0.5,
    });
  }

  if (isHovered) {
    return createOverlayState({
      fill: HEX_COLORS.hexHover,
      isLegacyAttackRangeFallback,
      kind: 'hover',
      opacity: 0.4,
    });
  }

  return createOverlayState({
    fill: null,
    isLegacyAttackRangeFallback,
    kind: null,
    opacity: 0.5,
  });
}

function colorForMovementType(type: MovementType): string {
  switch (type) {
    case MovementType.Walk:
      return HEX_COLORS.movementRangeWalk;
    case MovementType.Run:
    case MovementType.Sprint:
    case MovementType.Evade:
      return HEX_COLORS.movementRangeRun;
    case MovementType.Jump:
      return HEX_COLORS.movementRangeJump;
    default:
      return HEX_COLORS.movementRange;
  }
}

function hasLegacyAttackRangeSource(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): boolean {
  return (
    sourceReferences?.some(
      (reference) => reference.channel === 'legacy-attack-range',
    ) ?? false
  );
}
