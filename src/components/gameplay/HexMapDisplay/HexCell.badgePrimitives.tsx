import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapProjectionSourceReference } from '@/utils/gameplay/tacticalMapProjection';

export type SvgBadgeDataAttributes = Record<
  string,
  string | number | null | undefined
>;

export interface HexCellBadgePositionProps {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
}

export interface MovementProjectionBadgeProps extends HexCellBadgePositionProps {
  readonly movementInfo?: IMovementRangeHex;
  readonly projectionExplanation?: string;
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
}

interface SvgRectModel {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number | string;
  readonly rx: number | string;
  readonly fill: string;
  readonly opacity?: number | string;
  readonly stroke?: string;
  readonly strokeOpacity?: number | string;
  readonly strokeWidth?: number | string;
}

interface SvgTextModel {
  readonly x: number;
  readonly y: number;
  readonly fill: string;
  readonly fontSize: number | string;
  readonly fontWeight: number | string;
  readonly textAnchor?: 'start' | 'middle' | 'end';
}

export function HexCellSvgTextBadge({
  dataAttributes,
  label,
  rect,
  testId,
  text,
  title,
}: {
  readonly dataAttributes?: SvgBadgeDataAttributes;
  readonly label: string;
  readonly rect: SvgRectModel;
  readonly testId: string;
  readonly text: SvgTextModel;
  readonly title: string;
}): React.ReactElement {
  return (
    <g
      pointerEvents="none"
      data-testid={testId}
      aria-label={title}
      {...dataAttributes}
    >
      <title>{title}</title>
      <rect {...rect} />
      <text textAnchor="middle" {...text}>
        {label}
      </text>
    </g>
  );
}
