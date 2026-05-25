import React from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  ITerrainFeature,
  IMovementRangeHex,
  MapProjectionMode,
} from '@/types/gameplay';

import { TERRAIN_LAYER_ORDER } from '@/constants/terrain';

import { formatCombatC3Label } from './HexMapDisplay.combatC3Context';

export function formatElevationLabel(elevation: number): string {
  if (elevation > 0) return `+${elevation}`;
  return `${elevation}`;
}

export function formatTerrainLabel(terrainType: string | null): string {
  return terrainType ? terrainType.replace(/_/g, ' ') : 'clear';
}

export function formatTerrainFeaturesLabel(
  terrainTypes: readonly string[],
): string {
  if (terrainTypes.length === 0) return 'clear';
  return terrainTypes.map(formatTerrainLabel).join(', ');
}

function formatTerrainFeatureReference(feature: ITerrainFeature): string {
  const label = formatTerrainLabel(feature.type);
  return feature.level > 0 ? `${label} L${feature.level}` : label;
}

export function formatTerrainFeatureReferenceLabel(
  terrainFeatures: readonly ITerrainFeature[],
): string {
  const displayFeatures = sortTerrainFeaturesForDisplay(terrainFeatures);
  if (displayFeatures.length === 0) return 'clear';
  return displayFeatures.map(formatTerrainFeatureReference).join(', ');
}

export function terrainFeatureLevelsAttribute(
  terrainFeatures: readonly ITerrainFeature[],
): string {
  const displayFeatures = sortTerrainFeaturesForDisplay(terrainFeatures);
  if (displayFeatures.length === 0) return 'clear:0';
  return displayFeatures
    .map((feature) => `${feature.type}:${feature.level}`)
    .join('|');
}

export function formatMovementModeLabel(mode: string | undefined): string {
  switch (mode) {
    case 'vtol':
      return 'VTOL';
    case 'wige':
      return 'WiGE';
    case 'umu':
      return 'UMU';
    case 'biped_swim':
      return 'biped swim';
    case 'quad_swim':
      return 'quad swim';
    case undefined:
      return '';
    default:
      return mode.replace(/_/g, ' ');
  }
}

export function formatCombatLabel(combatInfo: ICombatRangeHex): string {
  const targetLabel = combatInfo.hasTarget
    ? `, targets ${combatInfo.targetUnitIds.join(', ')}`
    : '';
  const weaponImpactLabel =
    combatInfo.hasTarget && combatInfo.availableWeaponImpacts.length > 0
      ? `, weapon heat +${combatInfo.availableWeaponHeat}${formatAmmoImpactLabel(
          combatInfo,
        )}${formatDamageImpactLabel(combatInfo)}`
      : '';
  const visibilityLabel =
    combatInfo.targetVisibilityState !== 'none'
      ? `, visibility ${combatInfo.targetVisibilityState}`
      : '';
  const coverLabel = combatInfo.targetCoverReason
    ? `, ${combatInfo.targetCoverReason}`
    : '';
  const minimumRangeLabel = combatInfo.minimumRangeReason
    ? `, ${combatInfo.minimumRangeReason}`
    : '';
  const c3Label = formatCombatC3Label(combatInfo);
  const c3BenefitLabel = c3Label ? `, ${c3Label}` : '';
  const toHitLabel = combatInfo.toHitReason
    ? `, ${combatInfo.toHitReason}`
    : '';
  const losBlockerLabel = combatInfo.lineOfSightBlockerReason
    ? `, ${combatInfo.lineOfSightBlockerReason}`
    : '';
  const invalidLabel = combatInfo.attackInvalidReason
    ? `, invalid ${combatInfo.attackInvalidReason}${
        combatInfo.attackInvalidDetails
          ? `: ${combatInfo.attackInvalidDetails}`
          : ''
      }`
    : '';
  const indirectLabel = combatInfo.indirectFireReason
    ? `, ${combatInfo.indirectFireReason}`
    : '';
  const note = combatInfo.blockedReason ? `, ${combatInfo.blockedReason}` : '';
  return `combat ${combatInfo.rangeBracket.replace(
    /_/g,
    ' ',
  )} at ${combatInfo.distance} hexes, LOS ${combatInfo.losState}, ${combatInfo.firingArc} arc${targetLabel}${weaponImpactLabel}${visibilityLabel}${coverLabel}${minimumRangeLabel}${c3BenefitLabel}${toHitLabel}${losBlockerLabel}${invalidLabel}${indirectLabel}${note}`;
}

function formatAmmoImpactLabel(combatInfo: ICombatRangeHex): string {
  const ammoImpacts = combatInfo.availableWeaponImpacts
    .filter((impact) => impact.ammoConsumed > 0)
    .map((impact) => {
      const remaining =
        impact.ammoRemaining === undefined
          ? ''
          : ` ${Math.max(0, impact.ammoRemaining - impact.ammoConsumed)} left`;
      return `${impact.weaponName} -${impact.ammoConsumed}${remaining}`;
    });
  return ammoImpacts.length > 0 ? `, ammo ${ammoImpacts.join(', ')}` : '';
}

function formatDamageImpactLabel(combatInfo: ICombatRangeHex): string {
  if (combatInfo.availableWeaponDamage <= 0) return '';
  const expected =
    combatInfo.expectedDamage === undefined
      ? ''
      : `, expected ${formatDamageValue(combatInfo.expectedDamage)}`;
  return `, damage ${formatDamageValue(combatInfo.availableWeaponDamage)}${expected}`;
}

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function formatMovementLabel(movementInfo: IMovementRangeHex): string {
  const elevationParts = [
    movementInfo.elevationDelta !== undefined &&
      `delta ${formatElevationLabel(movementInfo.elevationDelta)}`,
    movementInfo.elevationCost !== undefined &&
      `cost +${movementInfo.elevationCost}`,
  ].filter(Boolean);
  const standPsrLabel = movementInfo.standUpPsrRequired
    ? `, stand PSR${
        movementInfo.standUpPsrImpossibleReason
          ? ` impossible: ${movementInfo.standUpPsrImpossibleReason}`
          : movementInfo.standUpPsrTargetNumber === undefined
            ? ' required'
            : ` TN ${movementInfo.standUpPsrTargetNumber}`
      }`
    : '';
  const standLabel = movementInfo.standUpRequired
    ? `, stand +${movementInfo.standUpCost ?? '?'} MP${standPsrLabel}`
    : '';
  const invalidLabel = movementInfo.movementInvalidReason
    ? `, invalid ${movementInfo.movementInvalidReason}${
        movementInfo.movementInvalidDetails
          ? `: ${movementInfo.movementInvalidDetails}`
          : ''
      }`
    : '';
  const blockedLabel = movementInfo.blockedReason
    ? `, ${movementInfo.blockedReason}`
    : '';

  return `${movementInfo.movementType}${
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
      ? ` via ${formatMovementModeLabel(movementInfo.movementMode)}`
      : ''
  } ${movementInfo.reachable ? 'reachable' : 'blocked'}: ${movementInfo.mpCost} MP${
    movementInfo.terrainCost !== undefined
      ? `, terrain +${movementInfo.terrainCost}`
      : ''
  }${elevationParts.length > 0 ? `, elevation ${elevationParts.join(' ')}` : ''}${
    movementInfo.heatGenerated !== undefined
      ? `, heat +${movementInfo.heatGenerated}`
      : ''
  }${standLabel}${invalidLabel}${blockedLabel}`;
}

function formatTerrainBadge(terrainType: string | null): string {
  switch (terrainType) {
    case 'light_woods':
      return 'LWD';
    case 'heavy_woods':
      return 'HWD';
    case 'building':
      return 'BLDG';
    case 'pavement':
      return 'PAV';
    case 'road':
      return 'RD';
    case 'rough':
      return 'RGH';
    case 'rubble':
      return 'RBL';
    case 'water':
      return 'WTR';
    case 'sand':
      return 'SND';
    case 'mud':
      return 'MUD';
    case 'snow':
      return 'SNW';
    case 'ice':
      return 'ICE';
    case 'swamp':
      return 'SWP';
    case 'bridge':
      return 'BRG';
    case 'fire':
      return 'FIR';
    case 'smoke':
      return 'SMK';
    default:
      return 'CLR';
  }
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

export function ElevationBadge({
  x,
  y,
  hex,
  elevation,
  label,
  projectionMode,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly elevation: number;
  readonly label: string;
  readonly projectionMode: MapProjectionMode;
}): React.ReactElement {
  const elevationSign =
    elevation > 0 ? 'positive' : elevation < 0 ? 'negative' : 'zero';
  const title = `Elevation ${label} (level ${elevation})`;
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
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly terrainFeatures: readonly ITerrainFeature[];
  readonly projectionMode: MapProjectionMode;
}): React.ReactElement {
  const displayFeatures = sortTerrainFeaturesForDisplay(terrainFeatures);
  const displayTypes = displayFeatures.map((feature) => feature.type);
  const label = formatTerrainBadgeLabel(displayFeatures);
  const title = `Terrain ${formatTerrainFeatureReferenceLabel(displayFeatures)}`;
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
      data-terrain-feature-count={displayTypes.length}
      data-projection-mode={projectionMode}
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
