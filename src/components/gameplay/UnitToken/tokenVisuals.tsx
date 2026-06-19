import React from 'react';

import { HEX_COLORS } from '@/constants/hexMap';
import { GameSide } from '@/types/gameplay';

export const TOKEN_BODY_OUTLINE_COLOR = '#1e293b';
export const TOKEN_BODY_STROKE_WIDTH = 2;

export function selectionTargetRingColor({
  isSelected,
  isValidTarget,
}: {
  readonly isSelected: boolean;
  readonly isValidTarget: boolean;
}): string {
  if (isSelected) return '#fbbf24';
  if (isValidTarget) return '#f87171';
  return 'transparent';
}

export function tokenSideBodyColor(
  side: GameSide,
  isDestroyed: boolean,
): string {
  if (isDestroyed) return HEX_COLORS.destroyedToken;
  return side === GameSide.Player
    ? HEX_COLORS.playerToken
    : HEX_COLORS.opponentToken;
}

export function landedAerospaceBodyColor(side: GameSide): string {
  return side === GameSide.Player ? '#93c5fd' : '#fca5a5';
}

export function TokenDesignationLabel({
  y,
  fontSize,
  children,
}: {
  readonly y: number;
  readonly fontSize: number;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <text
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fill="#1e293b"
      style={{ pointerEvents: 'none' }}
    >
      {children}
    </text>
  );
}

export function DestroyedCrossOverlay({
  xRadius,
  yRadius = xRadius,
  strokeWidth,
}: {
  readonly xRadius: number;
  readonly yRadius?: number;
  readonly strokeWidth: number;
}): React.ReactElement {
  return (
    <g
      stroke="#dc2626"
      strokeWidth={strokeWidth}
      data-testid="unit-destroyed-overlay"
      pointerEvents="none"
      aria-hidden="true"
    >
      <line x1={-xRadius} y1={-yRadius} x2={xRadius} y2={yRadius} />
      <line x1={xRadius} y1={-yRadius} x2={-xRadius} y2={yRadius} />
    </g>
  );
}
