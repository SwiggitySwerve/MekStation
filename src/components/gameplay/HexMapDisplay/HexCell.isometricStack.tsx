import React from 'react';

import type { IHexCoordinate } from '@/types/gameplay';

import { formatElevationLabel } from './HexCell.labels';
import { hexPath } from './renderHelpers';

const ISOMETRIC_ELEVATION_LAYER_OFFSET = 6;
const MAX_RENDERED_ELEVATION_LAYERS = 8;

export function getIsometricElevationLayerCount({
  isIsometricTile,
  elevation,
}: {
  readonly isIsometricTile: boolean;
  readonly elevation: number;
}): number {
  if (!isIsometricTile || elevation <= 0) return 0;
  return Math.min(elevation, MAX_RENDERED_ELEVATION_LAYERS);
}

export function IsometricElevationStack({
  x,
  y,
  hex,
  elevationLayerCount,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly elevationLayerCount: number;
}): React.ReactElement | null {
  if (elevationLayerCount <= 0) return null;

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-elevation-stack-${hex.q}-${hex.r}`}
    >
      {Array.from({ length: elevationLayerCount }, (_, i) => {
        const layer = elevationLayerCount - i;
        const offset = layer * ISOMETRIC_ELEVATION_LAYER_OFFSET;
        const layerLabel = formatElevationLabel(layer);
        const layerTitle = `Elevation layer ${layerLabel} of hex ${hex.q},${hex.r}`;
        return (
          <g
            key={`elevation-layer-${layer}`}
            data-testid={`hex-elevation-stack-layer-${hex.q}-${hex.r}-${layer}`}
            data-elevation-layer={layer}
            aria-label={layerTitle}
          >
            <title>{layerTitle}</title>
            <path
              d={hexPath(x, y + offset)}
              fill="#475569"
              opacity={0.18 + (layer / elevationLayerCount) * 0.08}
              stroke="#1e293b"
              strokeOpacity={0.28}
              strokeWidth={0.75}
            />
            <rect
              x={x + 23}
              y={y + offset - 6}
              width={17}
              height={9}
              rx={2}
              fill="#0f172a"
              fillOpacity={0.72}
              stroke="#e2e8f0"
              strokeOpacity={0.35}
              strokeWidth={0.5}
            />
            <text
              x={x + 31.5}
              y={y + offset + 1}
              textAnchor="middle"
              fontSize={6}
              fontWeight="bold"
              fill="#f8fafc"
            >
              {layerLabel}
            </text>
          </g>
        );
      })}
    </g>
  );
}
