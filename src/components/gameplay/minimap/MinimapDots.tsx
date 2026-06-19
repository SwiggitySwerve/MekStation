import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { hexToPixel } from '@/constants/hexMap';
import { GameSide, TokenUnitType } from '@/types/gameplay';

import {
  MINIMAP_SIZE,
  type IWorldBounds,
  worldToMinimapPixel,
} from './minimapGeometry';

export interface MinimapDotModel {
  readonly unitId: string;
  readonly name: string;
  readonly side: GameSide;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly isSelected: boolean | undefined;
}

interface MinimapDotsProps {
  readonly dots: readonly MinimapDotModel[];
  readonly onHoverUnit: (unitId: string | null) => void;
}

interface MinimapTooltipProps {
  readonly dots: readonly MinimapDotModel[];
  readonly hoveredUnitId: string | null;
}

function dotRadiusForUnitType(unitType: TokenUnitType | undefined): number {
  switch (unitType) {
    case TokenUnitType.Vehicle:
      return 4.5;
    case TokenUnitType.Aerospace:
      return 5;
    case TokenUnitType.BattleArmor:
      return 2.5;
    case TokenUnitType.Infantry:
      return 2;
    case TokenUnitType.ProtoMech:
      return 3;
    case TokenUnitType.Mech:
    default:
      return 4;
  }
}

function dotColorForSide(side: GameSide): string {
  switch (side) {
    case GameSide.Player:
      return '#3b82f6';
    case GameSide.Opponent:
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function sideLabel(side: GameSide): string {
  switch (side) {
    case GameSide.Player:
      return 'Player';
    case GameSide.Opponent:
      return 'Opponent';
    default:
      return 'Neutral';
  }
}

function tooltipText(dot: MinimapDotModel): string {
  return `${dot.name} — ${sideLabel(dot.side)}`;
}

export function buildMinimapDots(
  tokens: readonly IUnitToken[],
  bounds: IWorldBounds,
): MinimapDotModel[] {
  return tokens
    .filter((token) => !token.isDestroyed)
    .map((token) => {
      const world = hexToPixel(token.position.q, token.position.r);
      const { x, y } = worldToMinimapPixel(world, bounds, MINIMAP_SIZE);
      return {
        unitId: token.unitId,
        name: token.name,
        side: token.side,
        cx: x,
        cy: y,
        r: dotRadiusForUnitType(token.unitType),
        isSelected: token.isSelected,
      };
    });
}

export function MinimapDots({
  dots,
  onHoverUnit,
}: MinimapDotsProps): React.ReactElement {
  return (
    <g data-testid="minimap-dots">
      {dots.map((dot) => (
        <circle
          key={dot.unitId}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          fill={dotColorForSide(dot.side)}
          stroke={dot.isSelected ? '#fef08a' : '#0f172a'}
          strokeWidth={dot.isSelected ? 1.5 : 0.5}
          data-testid={`minimap-dot-${dot.unitId}`}
          onMouseEnter={() => onHoverUnit(dot.unitId)}
          onMouseLeave={() => onHoverUnit(null)}
          style={{ cursor: 'pointer' }}
        >
          <title>{tooltipText(dot)}</title>
        </circle>
      ))}
    </g>
  );
}

export function MinimapTooltip({
  dots,
  hoveredUnitId,
}: MinimapTooltipProps): React.ReactElement | null {
  const dot = dots.find((item) => item.unitId === hoveredUnitId);
  if (!dot) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-1 left-1 rounded bg-slate-950/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-100 shadow"
      data-testid="minimap-tooltip"
      role="tooltip"
    >
      {tooltipText(dot)}
    </div>
  );
}

export function MinimapTerrainBackdrop(): React.ReactElement {
  return (
    <>
      <defs>
        <radialGradient id="minimap-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        fill="url(#minimap-bg)"
        data-testid="minimap-backdrop"
      />
    </>
  );
}
