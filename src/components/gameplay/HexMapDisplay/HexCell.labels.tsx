import type {
  ICombatRangeHex,
  ITerrainFeature,
  IMovementRangeHex,
} from '@/types/gameplay';

import { TERRAIN_LAYER_ORDER } from '@/constants/terrain';
import { formatCombatAmmoImpact } from '@/utils/gameplay/tacticalMapProjection.combatExplanation';

import { formatCombatC3Label } from './HexMapDisplay.combatC3Context';
import { terrainCliffExitLabelsAttributeForFeatures } from './HexMapDisplay.terrainMetadata';

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
  const levelLabel = feature.level > 0 ? `${label} L${feature.level}` : label;
  const cliffExitLabels = terrainCliffExitLabelsAttributeForFeatures([feature]);
  return cliffExitLabels
    ? `${levelLabel} cliff edges ${cliffExitLabels}`
    : levelLabel;
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
    .map((impact) => formatCombatAmmoImpact(impact));
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

function formatMovementModeSuffix(movementInfo: IMovementRangeHex): string {
  return movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
    ? ` via ${formatMovementModeLabel(movementInfo.movementMode)}`
    : '';
}

function formatMovementTerrainCostLabel(
  movementInfo: IMovementRangeHex,
): string {
  return movementInfo.terrainCost !== undefined
    ? `, terrain +${movementInfo.terrainCost}`
    : '';
}

function formatMovementTurningCostLabel(
  movementInfo: IMovementRangeHex,
): string {
  return movementInfo.turningCost !== undefined
    ? `, turning +${movementInfo.turningCost}`
    : '';
}

function formatMovementElevationLabel(movementInfo: IMovementRangeHex): string {
  const elevationParts = [
    movementInfo.elevationDelta !== undefined &&
      `delta ${formatElevationLabel(movementInfo.elevationDelta)}`,
    movementInfo.elevationCost !== undefined &&
      `cost +${movementInfo.elevationCost}`,
  ].filter(Boolean);
  return elevationParts.length > 0
    ? `, elevation ${elevationParts.join(' ')}`
    : '';
}

function formatMovementHeatLabel(movementInfo: IMovementRangeHex): string {
  return movementInfo.heatGenerated !== undefined
    ? `, heat +${movementInfo.heatGenerated}`
    : '';
}

function formatStandPsrLabel(movementInfo: IMovementRangeHex): string {
  if (!movementInfo.standUpPsrRequired) return '';
  if (movementInfo.standUpPsrImpossibleReason) {
    return `, stand PSR impossible: ${movementInfo.standUpPsrImpossibleReason}`;
  }
  if (movementInfo.standUpPsrTargetNumber === undefined) {
    return ', stand PSR required';
  }
  return `, stand PSR TN ${movementInfo.standUpPsrTargetNumber}`;
}

function formatStandNoPsrLabel(movementInfo: IMovementRangeHex): string {
  return !movementInfo.standUpPsrRequired &&
    movementInfo.standUpPsrAutomaticSuccessReason
    ? `, ${movementInfo.standUpPsrAutomaticSuccessReason}: no PSR`
    : '';
}

function formatMovementStandLabel(movementInfo: IMovementRangeHex): string {
  if (!movementInfo.standUpRequired) return '';
  return `, stand +${movementInfo.standUpCost ?? '?'} MP${formatStandPsrLabel(
    movementInfo,
  )}${formatStandNoPsrLabel(movementInfo)}`;
}

function formatMovementHullDownExitLabel(
  movementInfo: IMovementRangeHex,
): string {
  return movementInfo.hullDownExitRequired
    ? `, exit hull-down +${movementInfo.hullDownExitCost ?? '?'} MP`
    : '';
}

function formatMovementAltitudeControlLabel(
  movementInfo: IMovementRangeHex,
): string {
  if (!movementInfo.altitudeControlRequired) return '';
  const altitude =
    movementInfo.altitudeControlAltitude === undefined
      ? ''
      : ` at altitude ${movementInfo.altitudeControlAltitude}`;
  return `, ${movementInfo.altitudeControlMode ?? 'altitude'} altitude controls${altitude}`;
}

function formatMovementAutomaticLandingLabel(
  movementInfo: IMovementRangeHex,
): string {
  if (!movementInfo.automaticLandingRequired) return '';
  const reason = movementInfo.automaticLandingReason
    ? `: ${movementInfo.automaticLandingReason}`
    : '';
  return `, automatic ${formatMovementModeLabel(
    movementInfo.automaticLandingMode,
  )} landing ${movementInfo.automaticLandingDistance ?? 0}/${
    movementInfo.automaticLandingMinimumDistance ?? 0
  } hexes${reason}`;
}

function formatMovementInvalidLabel(movementInfo: IMovementRangeHex): string {
  if (!movementInfo.movementInvalidReason) return '';
  const details = movementInfo.movementInvalidDetails
    ? `: ${movementInfo.movementInvalidDetails}`
    : '';
  return `, invalid ${movementInfo.movementInvalidReason}${details}`;
}

function formatMovementBlockedLabel(movementInfo: IMovementRangeHex): string {
  return movementInfo.blockedReason ? `, ${movementInfo.blockedReason}` : '';
}

export function formatMovementLabel(movementInfo: IMovementRangeHex): string {
  return `${movementInfo.movementType}${formatMovementModeSuffix(
    movementInfo,
  )} ${movementInfo.reachable ? 'reachable' : 'blocked'}: ${
    movementInfo.mpCost
  } MP${formatMovementTerrainCostLabel(
    movementInfo,
  )}${formatMovementTurningCostLabel(
    movementInfo,
  )}${formatMovementElevationLabel(movementInfo)}${formatMovementHeatLabel(
    movementInfo,
  )}${formatMovementStandLabel(movementInfo)}${formatMovementHullDownExitLabel(
    movementInfo,
  )}${formatMovementAltitudeControlLabel(
    movementInfo,
  )}${formatMovementAutomaticLandingLabel(
    movementInfo,
  )}${formatMovementInvalidLabel(movementInfo)}${formatMovementBlockedLabel(
    movementInfo,
  )}`;
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
