import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { HEX_SIZE, HEX_COLORS } from '@/constants/hexMap';
import { GameSide } from '@/types/gameplay';

import { hexToPixel, getFacingRotation } from './renderHelpers';

export interface UnitTokenComponentProps {
  token: IUnitToken;
  onClick: () => void;
}

export const UnitTokenComponent = React.memo(function UnitTokenComponent({
  token,
  onClick,
}: UnitTokenComponentProps): React.ReactElement {
  const { x, y } = hexToPixel(token.position);
  const rotation = getFacingRotation(token.facing);

  let color =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  if (token.isDestroyed) {
    color = HEX_COLORS.destroyedToken;
  }

  const ringColor = token.isSelected
    ? '#fbbf24'
    : token.isValidTarget
      ? '#f87171'
      : 'transparent';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
      data-testid={`unit-token-${token.unitId}`}
    >
      {/* Selection/target ring */}
      <circle
        r={HEX_SIZE * 0.7}
        fill="none"
        stroke={ringColor}
        strokeWidth={3}
      />

      {/* Token body */}
      <circle
        r={HEX_SIZE * 0.5}
        fill={color}
        stroke="#1e293b"
        strokeWidth={2}
      />

      {/* Facing indicator (arrow) */}
      <g transform={`rotate(${rotation - 90})`}>
        <path
          d="M0,-20 L8,-8 L0,-12 L-8,-8 Z"
          fill="white"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </g>

      <text
        y={4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill="white"
      >
        {token.designation}
      </text>

      {token.isDestroyed && (
        <g stroke="#dc2626" strokeWidth={3}>
          <line x1={-12} y1={-12} x2={12} y2={12} />
          <line x1={12} y1={-12} x2={-12} y2={12} />
        </g>
      )}
    </g>
  );
});
