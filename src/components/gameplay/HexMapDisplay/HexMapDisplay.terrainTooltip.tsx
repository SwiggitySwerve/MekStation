import React from 'react';

import type { IHexTerrain } from '@/types/gameplay';

import { CoverLevel, TERRAIN_PROPERTIES } from '@/types/gameplay/TerrainTypes';

import type { IsometricTerrainOccluderInfo } from './projection';

import {
  formatElevationLabel,
  formatTerrainFeaturesLabel,
} from './HexCell.labels';

function terrainCoverLabel(terrain: IHexTerrain): CoverLevel {
  let bestCover = CoverLevel.None;
  for (const feature of terrain.features) {
    const cover = TERRAIN_PROPERTIES[feature.type].coverLevel;
    if (cover === CoverLevel.Full) return cover;
    if (cover === CoverLevel.Partial) bestCover = cover;
  }
  return bestCover;
}

export function IsometricOccluderContextRows({
  info,
  testIdPrefix,
}: {
  readonly info?: IsometricTerrainOccluderInfo;
  readonly testIdPrefix: string;
}): React.ReactElement | null {
  if (!info || info.occludedUnitIds.length === 0) return null;

  const occludedUnitIds = info.occludedUnitIds.join(', ');
  const rotationDegrees = info.rotationStep * 60;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={`${testIdPrefix}-isometric-occluder`}
      data-isometric-occludes-units={info.occludedUnitIds.join(',')}
      data-isometric-occluder-elevation={info.occluderElevation}
      data-isometric-occluder-hex={`${info.occluderHex.q},${info.occluderHex.r}`}
      data-isometric-rotation-step={info.rotationStep}
      data-isometric-rotation-degrees={rotationDegrees}
    >
      <div data-testid={`${testIdPrefix}-isometric-occluder-units`}>
        Isometric occluder: may hide {occludedUnitIds}
      </div>
      <div data-testid={`${testIdPrefix}-isometric-occluder-rotation`}>
        Occluder elevation {formatElevationLabel(info.occluderElevation)};
        camera {rotationDegrees} deg
      </div>
      <div data-testid={`${testIdPrefix}-isometric-occluder-reasons`}>
        {info.reasons.join('; ')}
      </div>
    </div>
  );
}

export function TerrainHoverTooltip({
  terrain,
  isometricOccluderInfo,
}: {
  readonly terrain: IHexTerrain;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
}): React.ReactElement {
  const terrainTypes = terrain.features.map((feature) => feature.type);
  const blocksLos = terrain.features.some(
    (feature) => TERRAIN_PROPERTIES[feature.type].blocksLOS,
  );
  const heatEffect = terrain.features.reduce(
    (total, feature) => total + TERRAIN_PROPERTIES[feature.type].heatEffect,
    0,
  );
  const specialRules = terrain.features
    .flatMap((feature) => TERRAIN_PROPERTIES[feature.type].specialRules)
    .join(', ');

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[300px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-terrain-tooltip"
      role="tooltip"
    >
      <div className="font-semibold" data-testid="hex-terrain-tooltip-title">
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div data-testid="hex-terrain-tooltip-elevation">
        Elevation: {formatElevationLabel(terrain.elevation)}
      </div>
      <div data-testid="hex-terrain-tooltip-cover">
        Cover: {terrainCoverLabel(terrain)}
      </div>
      <div data-testid="hex-terrain-tooltip-los">
        LOS: {blocksLos ? 'blocks' : 'clear'}
      </div>
      {heatEffect !== 0 && (
        <div data-testid="hex-terrain-tooltip-heat">
          Heat effect: {heatEffect > 0 ? '+' : ''}
          {heatEffect}
        </div>
      )}
      {specialRules && (
        <div
          className="mt-1 text-[11px] text-slate-200"
          data-testid="hex-terrain-tooltip-rules"
        >
          {specialRules}
        </div>
      )}
      <IsometricOccluderContextRows
        info={isometricOccluderInfo}
        testIdPrefix="hex-terrain-tooltip"
      />
    </div>
  );
}

export function TerrainContextRows({
  terrain,
  testIdPrefix,
}: {
  readonly terrain: IHexTerrain;
  readonly testIdPrefix: string;
}): React.ReactElement {
  const terrainTypes = terrain.features.map((feature) => feature.type);

  return (
    <div className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200">
      <div data-testid={`${testIdPrefix}-terrain-context`}>
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div data-testid={`${testIdPrefix}-elevation-context`}>
        Elevation: {formatElevationLabel(terrain.elevation)}
      </div>
    </div>
  );
}
