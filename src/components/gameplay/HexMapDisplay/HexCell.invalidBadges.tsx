import React from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IMovementRangeHex,
} from '@/types/gameplay';

function includesReason(text: string | undefined, pattern: string): boolean {
  return text?.toLowerCase().includes(pattern) ?? false;
}

function movementReasonText(
  movementInfo: IMovementRangeHex,
): string | undefined {
  return (
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason
  );
}

function combatReasonText(combatInfo: ICombatRangeHex): string | undefined {
  return (
    combatInfo.attackInvalidDetails ??
    combatInfo.indirectFireUnavailableReason ??
    combatInfo.lineOfSightBlockerReason ??
    combatInfo.visibilityBlockedReason ??
    combatInfo.blockedReason ??
    combatInfo.attackInvalidReason
  );
}

function formatMovementInvalidBadgeLabel(
  movementInfo: IMovementRangeHex,
): string {
  const reason = movementReasonText(movementInfo);
  if (includesReason(reason, 'water')) return 'WTR';
  if (movementInfo.altitudeControlRequired) return 'ALT';
  if (includesReason(reason, 'altitude controls')) return 'ALT';
  if (includesReason(reason, 'bridge') || includesReason(reason, 'clearance')) {
    return 'BRDG';
  }
  if (includesReason(reason, 'elevation')) return 'ELEV';
  if (includesReason(reason, 'occupied')) return 'OCC';
  if (includesReason(reason, 'outside')) return 'OOB';
  if (includesReason(reason, 'stand')) return 'STAND';
  if (includesReason(reason, 'path costs')) return 'NO MP';
  if (includesReason(reason, 'no legal')) return 'NO PATH';
  if (includesReason(reason, 'shut down')) return 'SHUT';
  if (includesReason(reason, 'unconscious')) return 'KO';
  if (includesReason(reason, 'aerospace') || includesReason(reason, 'flight')) {
    return 'AERO';
  }

  switch (movementInfo.movementInvalidReason) {
    case 'DestinationOccupied':
      return 'OCC';
    case 'DestinationOutOfBounds':
      return 'OOB';
    case 'InsufficientMP':
      return 'NO MP';
    case 'UnitImmobile':
      return 'NO MOVE';
    case 'InvalidPath':
      return 'BAD PATH';
    case 'JumpUnavailable':
      return 'NO JUMP';
    case 'NoLegalPath':
      return 'NO PATH';
    case 'NoMovementCapability':
      return 'NO MOVE';
    case 'TerrainBlocked':
      return 'TERR';
    case 'InvalidDestination':
      return 'BAD';
    default:
      return movementInfo.blockedReason ? 'BLK' : 'NO';
  }
}

function formatCombatInvalidBadgeLabel(combatInfo: ICombatRangeHex): string {
  const blockerReason = combatReasonText(combatInfo);
  if (combatInfo.attackInvalidReason === 'NoLineOfSight') {
    if (
      includesReason(blockerReason, 'tag') ||
      includesReason(blockerReason, 'ecm')
    ) {
      return 'TAG';
    }
    if (includesReason(blockerReason, 'elevation')) return 'ELEV';
    if (includesReason(blockerReason, 'building')) return 'BLDG';
    if (includesReason(blockerReason, 'woods')) return 'WOOD';
    if (includesReason(blockerReason, 'smoke')) return 'SMK';
  }

  switch (combatInfo.attackInvalidReason) {
    case 'NoLineOfSight':
      return 'LOS';
    case 'OutOfAmmo':
      return 'AMMO';
    case 'OutOfArc':
      return 'ARC';
    case 'OutOfRange':
      return 'OUT';
    case 'SameHex':
      return 'SAME';
    case 'TargetNotVisible':
      return 'HIDDEN';
    case 'InvalidTarget':
      return 'INVALID';
    default:
      return combatInfo.blockedReason ? 'BLOCK' : 'NO';
  }
}

function Badge({
  x,
  y,
  width,
  fill,
  text,
  testId,
  reason,
  reasonCode,
  reasonKind,
}: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly fill: string;
  readonly text: string;
  readonly testId: string;
  readonly reason?: string;
  readonly reasonCode?: string;
  readonly reasonKind: 'movement' | 'combat';
}): React.ReactElement {
  const label = reason ?? text;
  return (
    <g
      pointerEvents="none"
      data-testid={testId}
      aria-label={label}
      data-invalid-badge-kind={reasonKind}
      data-invalid-badge-reason={reason}
      data-invalid-badge-code={reasonCode}
    >
      <title>{label}</title>
      <rect
        x={x - width / 2}
        y={y}
        width={width}
        height={12}
        rx={3}
        fill={fill}
        opacity={0.92}
      />
      <text
        x={x}
        y={y + 9}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fff7ed"
      >
        {text}
      </text>
    </g>
  );
}

export function MovementInvalidBadge({
  x,
  y,
  hex,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (!movementInfo || movementInfo.reachable) return null;

  const label = formatMovementInvalidBadgeLabel(movementInfo);
  const reason = movementReasonText(movementInfo);
  return (
    <Badge
      x={x}
      y={y + 7}
      width={Math.max(30, label.length * 6 + 8)}
      fill="#7f1d1d"
      text={label}
      testId={`hex-movement-invalid-badge-${hex.q}-${hex.r}`}
      reason={reason}
      reasonCode={movementInfo.movementInvalidReason}
      reasonKind="movement"
    />
  );
}

export function CombatInvalidBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo?: ICombatRangeHex;
}): React.ReactElement | null {
  if (!combatInfo?.attackInvalidReason) return null;

  const label = formatCombatInvalidBadgeLabel(combatInfo);
  const reason = combatReasonText(combatInfo);
  return (
    <Badge
      x={x}
      y={y + 58}
      width={Math.max(30, label.length * 6 + 8)}
      fill="#7f1d1d"
      text={label}
      testId={`hex-combat-invalid-badge-${hex.q}-${hex.r}`}
      reason={reason}
      reasonCode={combatInfo.attackInvalidReason}
      reasonKind="combat"
    />
  );
}
