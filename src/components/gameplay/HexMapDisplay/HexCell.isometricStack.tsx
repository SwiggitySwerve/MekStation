import React from 'react';

import type { IHexCoordinate, ITerrainFeature } from '@/types/gameplay';

import { formatElevationLabel } from './HexCell.labels';
import {
  getIsometricTerrainEffectiveHeight,
  type IsometricTerrainOccluderInfo,
} from './projection';
import { hexPath } from './renderHelpers';

const ISOMETRIC_ELEVATION_LAYER_OFFSET = 6;
const MAX_RENDERED_ELEVATION_LAYERS = 8;

export interface IsometricElevationStackMetrics {
  readonly effectiveHeight: number;
  readonly renderedLayerCount: number;
  readonly capped: boolean;
  readonly overflowLayerCount: number;
}

export function getIsometricElevationStackMetrics({
  isIsometricTile,
  elevation,
  terrainFeatures = [],
}: {
  readonly isIsometricTile: boolean;
  readonly elevation: number;
  readonly terrainFeatures?: readonly ITerrainFeature[];
}): IsometricElevationStackMetrics {
  if (!isIsometricTile) {
    return {
      effectiveHeight: 0,
      renderedLayerCount: 0,
      capped: false,
      overflowLayerCount: 0,
    };
  }

  const effectiveHeight = getIsometricTerrainEffectiveHeight({
    elevation,
    terrainFeatures,
  });
  if (effectiveHeight <= 0) {
    return {
      effectiveHeight: 0,
      renderedLayerCount: 0,
      capped: false,
      overflowLayerCount: 0,
    };
  }

  const renderedLayerCount = Math.min(
    effectiveHeight,
    MAX_RENDERED_ELEVATION_LAYERS,
  );
  return {
    effectiveHeight,
    renderedLayerCount,
    capped: effectiveHeight > renderedLayerCount,
    overflowLayerCount: effectiveHeight - renderedLayerCount,
  };
}

export function getIsometricElevationLayerCount({
  isIsometricTile,
  elevation,
  terrainFeatures = [],
}: {
  readonly isIsometricTile: boolean;
  readonly elevation: number;
  readonly terrainFeatures?: readonly ITerrainFeature[];
}): number {
  return getIsometricElevationStackMetrics({
    isIsometricTile,
    elevation,
    terrainFeatures,
  }).renderedLayerCount;
}

export function IsometricElevationStack({
  x,
  y,
  hex,
  stackMetrics,
  isometricOccluderInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly stackMetrics: IsometricElevationStackMetrics;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
}): React.ReactElement | null {
  const { effectiveHeight, renderedLayerCount, capped, overflowLayerCount } =
    stackMetrics;
  if (renderedLayerCount <= 0) return null;

  const occludedUnitIds = isometricOccluderInfo?.occludedUnitIds ?? [];
  const occlusionReasons = isometricOccluderInfo?.reasons ?? [];
  const occludesUnits =
    occludedUnitIds.length > 0 ? occludedUnitIds.join(',') : undefined;
  const effectiveHeightLabel = formatElevationLabel(effectiveHeight);
  const occluderTitle = occludesUnits
    ? `Elevation stack ${hex.q},${hex.r} may hide units ${occludesUnits}`
    : undefined;
  const stackTitle = capped
    ? `Elevation stack ${hex.q},${hex.r} shows ${renderedLayerCount} of ${effectiveHeight} effective levels (${overflowLayerCount} levels above rendered cap)`
    : `Elevation stack ${hex.q},${hex.r} shows ${renderedLayerCount} effective levels`;
  const capTitle = `Effective stack height ${effectiveHeightLabel}; ${renderedLayerCount} of ${effectiveHeight} levels rendered`;

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-elevation-stack-${hex.q}-${hex.r}`}
      data-elevation-effective-height={effectiveHeight}
      data-elevation-rendered-layers={renderedLayerCount}
      data-elevation-stack-capped={capped ? 'true' : undefined}
      data-elevation-stack-overflow={capped ? overflowLayerCount : undefined}
      data-isometric-occludes-units={occludesUnits}
      data-isometric-occlusion-reasons={
        occlusionReasons.length > 0 ? occlusionReasons.join('|') : undefined
      }
      data-isometric-occluder-rotation-step={
        isometricOccluderInfo?.rotationStep
      }
      aria-label={occluderTitle ?? stackTitle}
    >
      <title>{occluderTitle ?? stackTitle}</title>
      {Array.from({ length: renderedLayerCount }, (_, i) => {
        const layer = renderedLayerCount - i;
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
              opacity={0.18 + (layer / renderedLayerCount) * 0.08}
              stroke={occludesUnits ? '#38bdf8' : '#1e293b'}
              strokeOpacity={occludesUnits ? 0.78 : 0.28}
              strokeWidth={occludesUnits ? 1.1 : 0.75}
              strokeDasharray={occludesUnits ? '4 3' : undefined}
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
      {capped && (
        <g
          data-testid={`hex-elevation-stack-cap-${hex.q}-${hex.r}`}
          data-elevation-effective-height={effectiveHeight}
          data-elevation-rendered-layers={renderedLayerCount}
          data-elevation-stack-overflow={overflowLayerCount}
          aria-label={capTitle}
        >
          <title>{capTitle}</title>
          <rect
            x={x - 15}
            y={y + renderedLayerCount * ISOMETRIC_ELEVATION_LAYER_OFFSET - 20}
            width={30}
            height={10}
            rx={2}
            fill="#0f172a"
            fillOpacity={0.86}
            stroke="#f8fafc"
            strokeOpacity={0.42}
            strokeWidth={0.5}
          />
          <text
            x={x}
            y={y + renderedLayerCount * ISOMETRIC_ELEVATION_LAYER_OFFSET - 12}
            textAnchor="middle"
            fontSize={7}
            fontWeight="bold"
            fill="#f8fafc"
          >
            {effectiveHeightLabel}
          </text>
        </g>
      )}
    </g>
  );
}
