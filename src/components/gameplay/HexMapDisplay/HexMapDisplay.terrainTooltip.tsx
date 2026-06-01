import React from 'react';

import type { IHexTerrain } from '@/types/gameplay';
import type {
  ITacticalMapHexProjection,
  ITacticalMapProjectionSourceReference,
} from '@/utils/gameplay/tacticalMapProjection';

import { CoverLevel, TERRAIN_PROPERTIES } from '@/types/gameplay/TerrainTypes';
import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';
import { getPrimaryTerrainFeature } from '@/utils/gameplay/terrainMovementCost';

import type { IsometricTerrainOccluderInfo } from './projection';

import {
  formatElevationLabel,
  formatTerrainFeaturesLabel,
  terrainFeatureLevelsAttribute,
} from './HexCell.labels';
import { ProjectionContextRows } from './HexMapDisplay.projectionTooltipRows';
import {
  terrainCliffExitDetailLabel,
  terrainCliffExitDirectionsAttribute,
  terrainCliffExitLabelsAttribute,
  terrainBuildingConstructionFactorsAttribute,
  terrainBuildingDetailLabel,
  terrainBuildingIdsAttribute,
  terrainBuildingLevelsAttribute,
} from './HexMapDisplay.terrainMetadata';

const TERRAIN_ELEVATION_PROJECTION_CHANNEL = 'terrain-elevation';
const SHARED_TACTICAL_PROJECTION_SOURCE = 'shared-tactical-map-projection';

function terrainElevationSourceReferences(
  projection: ITacticalMapHexProjection | undefined,
): readonly ITacticalMapProjectionSourceReference[] {
  return (
    projection?.sourceReferences.filter(
      (source) => source.channel === TERRAIN_ELEVATION_PROJECTION_CHANNEL,
    ) ?? []
  );
}

function terrainElevationSourceAttributes(
  terrain: IHexTerrain,
  projection: ITacticalMapHexProjection | undefined,
): Record<string, string | number | undefined> {
  const sourceReferences = terrainElevationSourceReferences(projection);
  const sourceRefsAttribute =
    formatTacticalProjectionSourceReferences(sourceReferences) || undefined;
  const ruleRefsAttribute =
    formatTacticalProjectionRuleReferences(sourceReferences) || undefined;
  const terrainTypes = terrain.features.map((feature) => feature.type);
  const projectionChannel =
    sourceReferences.length > 0
      ? TERRAIN_ELEVATION_PROJECTION_CHANNEL
      : undefined;
  const cliffExitDirections = terrainCliffExitDirectionsAttribute(terrain);
  const cliffExitLabels = terrainCliffExitLabelsAttribute(terrain);

  return {
    'data-tactical-projection-source': projectionChannel
      ? SHARED_TACTICAL_PROJECTION_SOURCE
      : undefined,
    'data-tactical-projection-channel': projectionChannel,
    'data-tactical-rules-surface': projectionChannel,
    'data-tactical-projection-intent': projection?.intent,
    'data-tactical-projection-status': projection?.status,
    'data-terrain-primary': getPrimaryTerrainFeature(terrain)?.type ?? 'clear',
    'data-terrain-features':
      terrainTypes.length > 0 ? terrainTypes.join(',') : 'clear',
    'data-terrain-feature-levels': terrainFeatureLevelsAttribute(
      terrain.features,
    ),
    'data-terrain-cliff-exits': cliffExitDirections,
    'data-terrain-cliff-exit-labels': cliffExitLabels,
    'data-elevation': terrain.elevation,
    'data-terrain-source-refs': sourceRefsAttribute,
    'data-terrain-rule-refs': ruleRefsAttribute,
  };
}

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
  projection,
  isometricOccluderInfo,
}: {
  readonly terrain: IHexTerrain;
  readonly projection?: ITacticalMapHexProjection;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
}): React.ReactElement {
  const terrainTypes = terrain.features.map((feature) => feature.type);
  const buildingIdAttribute = terrainBuildingIdsAttribute(terrain);
  const buildingLevelAttribute = terrainBuildingLevelsAttribute(terrain);
  const buildingCfAttribute =
    terrainBuildingConstructionFactorsAttribute(terrain);
  const buildingDetailLabel = terrainBuildingDetailLabel(terrain);
  const cliffExitDetailLabel = terrainCliffExitDetailLabel(terrain);
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
  const sourceAttributes = terrainElevationSourceAttributes(
    terrain,
    projection,
  );

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[300px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-terrain-tooltip"
      role="tooltip"
    >
      <div
        className="font-semibold"
        data-testid="hex-terrain-tooltip-title"
        {...sourceAttributes}
      >
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div data-testid="hex-terrain-tooltip-elevation" {...sourceAttributes}>
        Elevation: {formatElevationLabel(terrain.elevation)}
      </div>
      {buildingDetailLabel && (
        <div
          data-testid="hex-terrain-tooltip-building-id"
          data-terrain-building-ids={buildingIdAttribute}
          data-terrain-building-levels={buildingLevelAttribute}
          data-terrain-construction-factors={buildingCfAttribute}
          {...sourceAttributes}
        >
          Building: {buildingDetailLabel}
        </div>
      )}
      {cliffExitDetailLabel && (
        <div
          data-testid="hex-terrain-tooltip-cliff-exits"
          {...sourceAttributes}
        >
          {cliffExitDetailLabel}
        </div>
      )}
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
      <ProjectionContextRows
        projection={projection}
        testIdPrefix="hex-terrain-tooltip"
      />
    </div>
  );
}

export function TerrainContextRows({
  terrain,
  projection,
  testIdPrefix,
}: {
  readonly terrain: IHexTerrain;
  readonly projection?: ITacticalMapHexProjection;
  readonly testIdPrefix: string;
}): React.ReactElement {
  const terrainTypes = terrain.features.map((feature) => feature.type);
  const buildingIdAttribute = terrainBuildingIdsAttribute(terrain);
  const buildingLevelAttribute = terrainBuildingLevelsAttribute(terrain);
  const buildingCfAttribute =
    terrainBuildingConstructionFactorsAttribute(terrain);
  const buildingDetailLabel = terrainBuildingDetailLabel(terrain);
  const cliffExitDetailLabel = terrainCliffExitDetailLabel(terrain);
  const sourceAttributes = terrainElevationSourceAttributes(
    terrain,
    projection,
  );

  return (
    <div className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200">
      <div
        data-testid={`${testIdPrefix}-terrain-context`}
        {...sourceAttributes}
      >
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div
        data-testid={`${testIdPrefix}-elevation-context`}
        {...sourceAttributes}
      >
        Elevation: {formatElevationLabel(terrain.elevation)}
      </div>
      {buildingDetailLabel && (
        <div
          data-testid={`${testIdPrefix}-building-context`}
          data-terrain-building-ids={buildingIdAttribute}
          data-terrain-building-levels={buildingLevelAttribute}
          data-terrain-construction-factors={buildingCfAttribute}
          {...sourceAttributes}
        >
          Building: {buildingDetailLabel}
        </div>
      )}
      {cliffExitDetailLabel && (
        <div
          data-testid={`${testIdPrefix}-cliff-exits-context`}
          {...sourceAttributes}
        >
          {cliffExitDetailLabel}
        </div>
      )}
    </div>
  );
}
