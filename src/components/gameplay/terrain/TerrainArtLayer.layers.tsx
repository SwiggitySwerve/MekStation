import React from 'react';

import type { IHexCoordinate, ITerrainFeature } from '@/types/gameplay';
import type { TerrainVisualKey } from '@/utils/terrain/terrainVisualMap';

import { symbolIdFor } from '@/utils/terrain/terrainVisualMap';

import {
  flatFillFor,
  type TerrainArtStack,
  type TerrainSymbolState,
} from './TerrainArtLayer.model';

const ART_SIZE = 80;
const ART_HALF = ART_SIZE / 2;
const SECONDARY_ART_OPACITY = 0.75;

interface TerrainContourSegment {
  readonly edgeIndex: number;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: string;
  readonly width: number;
}

interface TerrainLayerCoordinates {
  readonly hex: IHexCoordinate;
  readonly x: number;
  readonly y: number;
}

interface TerrainFallbackGroupProps {
  readonly hex: IHexCoordinate;
  readonly pathD: string;
  readonly fill: string;
}

interface TerrainBaseLayerProps extends TerrainLayerCoordinates {
  readonly stack: TerrainArtStack;
  readonly symbolState: TerrainSymbolState;
  readonly firstFeature: ITerrainFeature | undefined;
  readonly pathD: string;
}

type TerrainSecondaryLayerProps = TerrainBaseLayerProps;

interface TerrainContourLinesProps {
  readonly hex: IHexCoordinate;
  readonly contours: readonly TerrainContourSegment[];
}

function secondaryOpacity(key: TerrainVisualKey): number {
  return key.includes('woods') || key === 'rubble' ? SECONDARY_ART_OPACITY : 1;
}

export function TerrainFallbackGroup({
  hex,
  pathD,
  fill,
}: TerrainFallbackGroupProps): React.ReactElement {
  return (
    <g data-testid={`terrain-art-${hex.q}-${hex.r}`} data-fallback="true">
      <path d={pathD} fill={fill} data-terrain-fallback="true" />
    </g>
  );
}

export function TerrainBaseLayer({
  hex,
  x,
  y,
  stack,
  symbolState,
  firstFeature,
  pathD,
}: TerrainBaseLayerProps): React.ReactElement | null {
  if (stack.base && !symbolState.useBaseFallback) {
    return (
      <use
        href={`#${symbolIdFor(stack.base)}`}
        x={x - ART_HALF}
        y={y - ART_HALF}
        width={ART_SIZE}
        height={ART_SIZE}
        data-testid={`terrain-base-${hex.q}-${hex.r}`}
        data-visual-key={stack.base}
      />
    );
  }

  if (!symbolState.useBaseFallback || !firstFeature) return null;
  return (
    <path
      d={pathD}
      fill={flatFillFor(firstFeature) ?? '#f8fafc'}
      data-testid={`terrain-base-fallback-${hex.q}-${hex.r}`}
      data-terrain-fallback="true"
    />
  );
}

export function TerrainSecondaryLayer({
  hex,
  x,
  y,
  stack,
  symbolState,
  firstFeature,
  pathD,
}: TerrainSecondaryLayerProps): React.ReactElement | null {
  if (stack.secondary && !symbolState.useSecondaryFallback) {
    return (
      <use
        href={`#${symbolIdFor(stack.secondary)}`}
        x={x - ART_HALF}
        y={y - ART_HALF}
        width={ART_SIZE}
        height={ART_SIZE}
        opacity={secondaryOpacity(stack.secondary)}
        data-testid={`terrain-secondary-${hex.q}-${hex.r}`}
        data-visual-key={stack.secondary}
      />
    );
  }

  if (!symbolState.useSecondaryFallback || !firstFeature) return null;
  return (
    <path
      d={pathD}
      fill={flatFillFor(firstFeature) ?? '#78716c'}
      opacity={0.5}
      data-testid={`terrain-secondary-fallback-${hex.q}-${hex.r}`}
      data-terrain-fallback="true"
    />
  );
}

export function TerrainContourLines({
  hex,
  contours,
}: TerrainContourLinesProps): React.ReactElement {
  return (
    <>
      {contours.map((segment) => (
        <line
          key={`contour-${hex.q}-${hex.r}-${segment.edgeIndex}`}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          stroke={segment.color}
          strokeWidth={segment.width}
          strokeLinecap="round"
          pointerEvents="none"
          data-testid={`terrain-contour-${hex.q}-${hex.r}-${segment.edgeIndex}`}
          data-contour-delta={segment.width}
        />
      ))}
    </>
  );
}
