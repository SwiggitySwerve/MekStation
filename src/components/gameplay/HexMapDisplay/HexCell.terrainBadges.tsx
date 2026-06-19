import React from 'react';

import type {
  IHexCoordinate,
  ITerrainFeature,
  MapProjectionMode,
} from '@/types/gameplay';
import type {
  ITacticalMapProjectionSourceReference,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import { TERRAIN_LAYER_ORDER } from '@/constants/terrain';
import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTerrainFeatureReferenceLabel,
  terrainFeatureLevelsAttribute,
} from './HexCell.labels';
import {
  terrainCliffExitDirectionsAttributeForFeatures,
  terrainCliffExitLabelsAttributeForFeatures,
} from './HexMapDisplay.terrainMetadata';

const TERRAIN_ELEVATION_PROJECTION_CHANNEL = 'terrain-elevation';
const SHARED_TACTICAL_PROJECTION_SOURCE = 'shared-tactical-map-projection';
const TERRAIN_BADGES_BY_TYPE: Readonly<Record<string, string>> = {
  clear: 'CLR',
  light_woods: 'LWD',
  heavy_woods: 'HWD',
  building: 'BLDG',
  pavement: 'PAV',
  road: 'RD',
  rough: 'RGH',
  rubble: 'RBL',
  water: 'WTR',
  sand: 'SND',
  mud: 'MUD',
  snow: 'SNW',
  ice: 'ICE',
  swamp: 'SWP',
  heavy_industrial: 'IND',
  planted_field: 'PLT',
  bridge: 'BRG',
  mines: 'MIN',
  fire: 'FIR',
  smoke: 'SMK',
};

interface TerrainElevationProjectionMetadata {
  readonly projectionIntent?: TacticalMapHexProjectionIntent;
  readonly projectionStatus?: TacticalMapHexProjectionStatus;
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
}

function formatTerrainBadge(terrainType: string | null): string {
  return terrainType ? (TERRAIN_BADGES_BY_TYPE[terrainType] ?? 'CLR') : 'CLR';
}

function sortTerrainFeaturesForDisplay(
  terrainFeatures: readonly ITerrainFeature[],
): readonly ITerrainFeature[] {
  return [...terrainFeatures].sort((a, b) => {
    const aOrder =
      TERRAIN_LAYER_ORDER[a.type as keyof typeof TERRAIN_LAYER_ORDER];
    const bOrder =
      TERRAIN_LAYER_ORDER[b.type as keyof typeof TERRAIN_LAYER_ORDER];
    return (bOrder ?? 0) - (aOrder ?? 0);
  });
}

function formatTerrainBadgeFeature(feature: ITerrainFeature): string {
  const badge = formatTerrainBadge(feature.type);
  return feature.level > 1 ? `${badge}${feature.level}` : badge;
}

function formatTerrainBadgeLabel(
  terrainFeatures: readonly ITerrainFeature[],
): string {
  const displayFeatures = sortTerrainFeaturesForDisplay(terrainFeatures);
  if (displayFeatures.length === 0) return formatTerrainBadge(null);

  const visibleBadges = displayFeatures
    .slice(0, 2)
    .map(formatTerrainBadgeFeature);
  const hiddenCount = displayFeatures.length - visibleBadges.length;
  return `${visibleBadges.join('/')}${hiddenCount > 0 ? `+${hiddenCount}` : ''}`;
}

function terrainElevationSourceReferencesAttribute(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): string | undefined {
  const terrainElevationReferences =
    sourceReferences?.filter(
      (reference) => reference.channel === TERRAIN_ELEVATION_PROJECTION_CHANNEL,
    ) ?? [];
  return terrainElevationReferences.length > 0
    ? formatTacticalProjectionSourceReferences(terrainElevationReferences)
    : undefined;
}

function terrainElevationRuleReferencesAttribute(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): string | undefined {
  const terrainElevationReferences =
    sourceReferences?.filter(
      (reference) => reference.channel === TERRAIN_ELEVATION_PROJECTION_CHANNEL,
    ) ?? [];
  const formatted = formatTacticalProjectionRuleReferences(
    terrainElevationReferences,
  );
  return formatted || undefined;
}

function formatTerrainElevationProjectionContext({
  projectionIntent,
  projectionStatus,
  sourceReferences,
}: TerrainElevationProjectionMetadata): string {
  const terrainSources =
    sourceReferences?.filter(
      (reference) => reference.channel === TERRAIN_ELEVATION_PROJECTION_CHANNEL,
    ) ?? [];
  const parts = [
    `projection channel ${TERRAIN_ELEVATION_PROJECTION_CHANNEL}`,
    `rules surface ${TERRAIN_ELEVATION_PROJECTION_CHANNEL}`,
    projectionIntent ? `intent ${projectionIntent}` : '',
    projectionStatus ? `status ${projectionStatus}` : '',
    ...terrainSources.map((reference) => reference.detail ?? reference.label),
  ].filter(Boolean);
  return parts.join('; ');
}

export function ElevationBadge({
  x,
  y,
  hex,
  elevation,
  label,
  projectionMode,
  projectionIntent,
  projectionStatus,
  sourceReferences,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly elevation: number;
  readonly label: string;
  readonly projectionMode: MapProjectionMode;
} & TerrainElevationProjectionMetadata): React.ReactElement {
  const sourceReferencesAttribute =
    terrainElevationSourceReferencesAttribute(sourceReferences);
  const ruleReferencesAttribute =
    terrainElevationRuleReferencesAttribute(sourceReferences);
  const projectionContext = formatTerrainElevationProjectionContext({
    projectionIntent,
    projectionStatus,
    sourceReferences,
  });
  const title = `Elevation ${label} (level ${elevation}); ${projectionContext}`;
  const elevationSign =
    elevation > 0 ? 'positive' : elevation < 0 ? 'negative' : 'zero';
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-elevation-label-${hex.q}-${hex.r}`}
      role="img"
      aria-label={title}
      data-elevation-label={label}
      data-elevation-value={elevation}
      data-elevation-sign={elevationSign}
      data-projection-mode={projectionMode}
      data-tactical-projection-source={SHARED_TACTICAL_PROJECTION_SOURCE}
      data-tactical-projection-channel={TERRAIN_ELEVATION_PROJECTION_CHANNEL}
      data-tactical-rules-surface={TERRAIN_ELEVATION_PROJECTION_CHANNEL}
      data-tactical-projection-intent={projectionIntent}
      data-tactical-projection-status={projectionStatus}
      data-tactical-projection-sources={sourceReferencesAttribute}
      data-tactical-projection-rule-refs={ruleReferencesAttribute}
    >
      <title>{title}</title>
      <rect
        x={x - 12}
        y={y - 21}
        width={24}
        height={14}
        rx={3}
        fill="#f8fafc"
        opacity={0.88}
        stroke="#334155"
        strokeOpacity={0.4}
        strokeWidth={0.75}
      />
      <text
        x={x}
        y={y - 11}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill="#0f172a"
      >
        {label}
      </text>
    </g>
  );
}

export function TerrainBadge({
  x,
  y,
  hex,
  terrainFeatures,
  projectionMode,
  projectionIntent,
  projectionStatus,
  sourceReferences,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly terrainFeatures: readonly ITerrainFeature[];
  readonly projectionMode: MapProjectionMode;
} & TerrainElevationProjectionMetadata): React.ReactElement {
  const displayFeatures = sortTerrainFeaturesForDisplay(terrainFeatures);
  const displayTypes = displayFeatures.map((feature) => feature.type);
  const label = formatTerrainBadgeLabel(displayFeatures);
  const sourceReferencesAttribute =
    terrainElevationSourceReferencesAttribute(sourceReferences);
  const ruleReferencesAttribute =
    terrainElevationRuleReferencesAttribute(sourceReferences);
  const projectionContext = formatTerrainElevationProjectionContext({
    projectionIntent,
    projectionStatus,
    sourceReferences,
  });
  const title = `Terrain ${formatTerrainFeatureReferenceLabel(
    displayFeatures,
  )}; ${projectionContext}`;
  const width = Math.max(30, label.length * 6 + 8);

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-terrain-label-${hex.q}-${hex.r}`}
      role="img"
      aria-label={title}
      data-terrain-badge={label}
      data-terrain-features={
        displayTypes.length > 0 ? displayTypes.join(',') : 'clear'
      }
      data-terrain-feature-levels={terrainFeatureLevelsAttribute(
        displayFeatures,
      )}
      data-terrain-cliff-exits={terrainCliffExitDirectionsAttributeForFeatures(
        displayFeatures,
      )}
      data-terrain-cliff-exit-labels={terrainCliffExitLabelsAttributeForFeatures(
        displayFeatures,
      )}
      data-terrain-feature-count={displayTypes.length}
      data-projection-mode={projectionMode}
      data-tactical-projection-source={SHARED_TACTICAL_PROJECTION_SOURCE}
      data-tactical-projection-channel={TERRAIN_ELEVATION_PROJECTION_CHANNEL}
      data-tactical-rules-surface={TERRAIN_ELEVATION_PROJECTION_CHANNEL}
      data-tactical-projection-intent={projectionIntent}
      data-tactical-projection-status={projectionStatus}
      data-tactical-projection-sources={sourceReferencesAttribute}
      data-tactical-projection-rule-refs={ruleReferencesAttribute}
    >
      <title>{title}</title>
      <rect
        x={x - width / 2}
        y={y - 5}
        width={width}
        height={11}
        rx={3}
        fill="#f8fafc"
        opacity={0.82}
        stroke="#334155"
        strokeOpacity={0.35}
        strokeWidth={0.6}
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fontSize={7}
        fontWeight="bold"
        fill="#334155"
      >
        {label}
      </text>
    </g>
  );
}

export function HeatBadge({
  x,
  y,
  hex,
  heatGenerated,
  movementOptionHeats,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly heatGenerated?: number;
  readonly movementOptionHeats?: string;
}): React.ReactElement | null {
  if (!heatGenerated) return null;
  const title = movementOptionHeats
    ? `Max movement heat +${heatGenerated}; options ${movementOptionHeats}`
    : `Heat generated +${heatGenerated}`;
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-heat-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-heat-generated={heatGenerated}
      data-movement-option-heats={movementOptionHeats}
    >
      <title>{title}</title>
      <rect
        x={x + 3}
        y={y + 20}
        width={26}
        height={12}
        rx={3}
        fill="#c2410c"
        opacity={0.9}
      />
      <text
        x={x + 16}
        y={y + 29}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fff7ed"
      >
        +{heatGenerated}H
      </text>
    </g>
  );
}
