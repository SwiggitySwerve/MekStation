import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';
import type {
  ITacticalMapProjectionSourceReference,
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import type { SvgDataAttributes } from './HexCell.overlayAttributes';
import type { HexOverlayState } from './HexCell.overlayModel';

import {
  combatWeaponOptionArcStatesAttribute,
  combatWeaponOptionAvailabilityAttribute,
  combatWeaponOptionBlockedReasonsAttribute,
  combatWeaponOptionEnvironmentStatesAttribute,
  combatWeaponOptionExpectedDamagesAttribute,
  combatWeaponOptionRangesAttribute,
  combatWeaponOptionToHitModifiersAttribute,
  combatWeaponOptionToHitNumbersAttribute,
} from './HexCell.combatOptionSummaries';
import {
  buildElevationStackAttributes,
  type ElevationStackAttributeState,
} from './HexCell.elevationStackAttributes';
import { terrainFeatureLevelsAttribute } from './HexCell.labels';
import {
  movementOptionAltitudeControlMpCostsAttribute,
  movementOptionAltitudeControlStepCountsAttribute,
  movementOptionAutomaticLandingsAttribute,
  movementOptionBlockedReasonsAttribute,
  movementOptionConversionMpCostsAttribute,
  movementOptionConversionStepCountsAttribute,
  movementOptionCostsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionHeatGeneratedAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionStatesAttribute,
  movementOptionTerrainCostsAttribute,
  movementOptionTypesAttribute,
} from './HexCell.movementOptionSummaries';

export interface HexCellRootAttributesOptions {
  readonly combatInfo?: ICombatRangeHex;
  readonly combatLosBlockerReasons?: string;
  readonly combatLosBlockerTargetHexes?: string;
  readonly elevation: number;
  readonly elevationStackMetrics: ElevationStackAttributeState;
  readonly hex: IHexCoordinate;
  readonly hexLabel: string;
  readonly isIsometricOccluder: boolean;
  readonly isUnreachableHover?: boolean;
  readonly movementInfo?: IMovementRangeHex;
  readonly movementOptionCount?: number;
  readonly movementOptions: readonly NonNullable<
    IMovementRangeHex['movementModeOptions']
  >[number][];
  readonly occludedUnitIds?: string;
  readonly occluderElevation?: number;
  readonly occlusionReasons?: string;
  readonly overlayState: HexOverlayState;
  readonly pathIndex?: number;
  readonly tacticalProjectionBlockedReasons?: readonly string[];
  readonly tacticalProjectionCombatStatus?: TacticalMapCombatProjectionStatus;
  readonly tacticalProjectionExplanation?: string;
  readonly tacticalProjectionIntent?: TacticalMapHexProjectionIntent;
  readonly tacticalProjectionMovementCostReasons?: readonly string[];
  readonly tacticalProjectionMovementCostStatus?: TacticalMapMovementCostProjectionStatus;
  readonly tacticalProjectionMovementHazardReasons?: readonly string[];
  readonly tacticalProjectionMovementHazardStatus?: TacticalMapMovementHazardProjectionStatus;
  readonly tacticalProjectionMovementStatus?: TacticalMapMovementProjectionStatus;
  readonly tacticalProjectionSourceReferences?: readonly ITacticalMapProjectionSourceReference[];
  readonly tacticalProjectionStatus?: TacticalMapHexProjectionStatus;
  readonly terrainBuildingCfAttribute?: string;
  readonly terrainBuildingIdAttribute?: string;
  readonly terrainBuildingLevelAttribute?: string;
  readonly terrainCliffExitDirections?: string;
  readonly terrainCliffExitLabels?: string;
  readonly terrainFeatures: NonNullable<IHexTerrain['features']>;
  readonly terrainType: string | null;
  readonly terrainTypes: readonly string[];
}

export function buildRootAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  return {
    ...buildCellIdentityAttributes(options),
    ...buildMovementAttributes(options),
    ...buildTerrainAttributes(options),
    ...buildProjectionAttributes(options),
    ...buildCombatAttributes(options),
    ...buildElevationStackAttributes(options),
  };
}

function buildCellIdentityAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  const {
    combatInfo,
    combatLosBlockerReasons,
    combatLosBlockerTargetHexes,
    elevation,
    elevationStackMetrics,
    hex,
    hexLabel,
    isIsometricOccluder,
    isUnreachableHover,
    movementInfo,
    movementOptionCount,
    movementOptions,
    occludedUnitIds,
    occluderElevation,
    occlusionReasons,
    overlayState,
    pathIndex,
    tacticalProjectionBlockedReasons,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionIntent,
    tacticalProjectionMovementCostReasons,
    tacticalProjectionMovementCostStatus,
    tacticalProjectionMovementHazardReasons,
    tacticalProjectionMovementHazardStatus,
    tacticalProjectionMovementStatus,
    tacticalProjectionSourceReferences,
    tacticalProjectionStatus,
    terrainBuildingCfAttribute,
    terrainBuildingIdAttribute,
    terrainBuildingLevelAttribute,
    terrainCliffExitDirections,
    terrainCliffExitLabels,
    terrainFeatures,
    terrainType,
    terrainTypes,
  } = options;
  return {
    'data-testid': `hex-${hex.q}-${hex.r}`,
    'data-unreachable': isUnreachableHover ? 'true' : undefined,
    'data-reachable': movementInfo
      ? movementInfo.reachable
        ? 'true'
        : 'false'
      : undefined,
  };
}

function buildMovementAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  const {
    combatInfo,
    combatLosBlockerReasons,
    combatLosBlockerTargetHexes,
    elevation,
    elevationStackMetrics,
    hex,
    hexLabel,
    isIsometricOccluder,
    isUnreachableHover,
    movementInfo,
    movementOptionCount,
    movementOptions,
    occludedUnitIds,
    occluderElevation,
    occlusionReasons,
    overlayState,
    pathIndex,
    tacticalProjectionBlockedReasons,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionIntent,
    tacticalProjectionMovementCostReasons,
    tacticalProjectionMovementCostStatus,
    tacticalProjectionMovementHazardReasons,
    tacticalProjectionMovementHazardStatus,
    tacticalProjectionMovementStatus,
    tacticalProjectionSourceReferences,
    tacticalProjectionStatus,
    terrainBuildingCfAttribute,
    terrainBuildingIdAttribute,
    terrainBuildingLevelAttribute,
    terrainCliffExitDirections,
    terrainCliffExitLabels,
    terrainFeatures,
    terrainType,
    terrainTypes,
  } = options;
  return {
    'data-movement-type': movementInfo?.movementType,
    'data-movement-mode': movementInfo?.movementMode,
    'data-movement-conversion-step-count': movementInfo?.conversionStepCount,
    'data-movement-conversion-mp-cost': movementInfo?.conversionMpCost,
    'data-movement-altitude-control-step-count':
      movementInfo?.altitudeControlStepCount,
    'data-movement-altitude-control-mp-cost':
      movementInfo?.altitudeControlMpCost,
    'data-movement-option-count':
      movementOptionCount && movementOptionCount > 1
        ? movementOptionCount
        : undefined,
    'data-movement-option-types': movementOptionTypesAttribute(movementInfo),
    'data-movement-option-costs': movementOptionCostsAttribute(movementInfo),
    'data-movement-option-states': movementOptionStatesAttribute(movementInfo),
    'data-movement-option-blocked-reasons':
      movementOptionBlockedReasonsAttribute(movementOptions),
    'data-movement-option-invalid-reasons':
      movementOptionInvalidReasonsAttribute(movementOptions),
    'data-movement-option-invalid-details':
      movementOptionInvalidDetailsAttribute(movementOptions),
    'data-movement-option-terrain-costs':
      movementOptionTerrainCostsAttribute(movementOptions),
    'data-movement-option-elevation-deltas':
      movementOptionElevationDeltasAttribute(movementOptions),
    'data-movement-option-elevation-costs':
      movementOptionElevationCostsAttribute(movementOptions),
    'data-movement-option-heats':
      movementOptionHeatGeneratedAttribute(movementOptions),
    'data-movement-option-conversion-step-counts':
      movementOptionConversionStepCountsAttribute(movementOptions),
    'data-movement-option-conversion-mp-costs':
      movementOptionConversionMpCostsAttribute(movementOptions),
    'data-movement-option-altitude-control-step-counts':
      movementOptionAltitudeControlStepCountsAttribute(movementOptions),
    'data-movement-option-altitude-control-mp-costs':
      movementOptionAltitudeControlMpCostsAttribute(movementOptions),
    'data-movement-option-automatic-landings':
      movementOptionAutomaticLandingsAttribute(movementOptions),
    'data-mp-cost': movementInfo?.mpCost,
    'data-terrain-cost': movementInfo?.terrainCost,
    'data-heat-generated': movementInfo?.heatGenerated,
    'data-elevation': elevation,
  };
}

function buildTerrainAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  const {
    combatInfo,
    combatLosBlockerReasons,
    combatLosBlockerTargetHexes,
    elevation,
    elevationStackMetrics,
    hex,
    hexLabel,
    isIsometricOccluder,
    isUnreachableHover,
    movementInfo,
    movementOptionCount,
    movementOptions,
    occludedUnitIds,
    occluderElevation,
    occlusionReasons,
    overlayState,
    pathIndex,
    tacticalProjectionBlockedReasons,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionIntent,
    tacticalProjectionMovementCostReasons,
    tacticalProjectionMovementCostStatus,
    tacticalProjectionMovementHazardReasons,
    tacticalProjectionMovementHazardStatus,
    tacticalProjectionMovementStatus,
    tacticalProjectionSourceReferences,
    tacticalProjectionStatus,
    terrainBuildingCfAttribute,
    terrainBuildingIdAttribute,
    terrainBuildingLevelAttribute,
    terrainCliffExitDirections,
    terrainCliffExitLabels,
    terrainFeatures,
    terrainType,
    terrainTypes,
  } = options;
  return {
    'data-terrain-primary': terrainType ?? undefined,
    'data-terrain-features':
      terrainTypes.length > 0 ? terrainTypes.join(',') : undefined,
    'data-terrain-feature-levels':
      terrainFeatureLevelsAttribute(terrainFeatures),
    'data-terrain-cliff-exits': terrainCliffExitDirections,
    'data-terrain-cliff-exit-labels': terrainCliffExitLabels,
    'data-terrain-building-ids': terrainBuildingIdAttribute,
    'data-terrain-building-levels': terrainBuildingLevelAttribute,
    'data-terrain-construction-factors': terrainBuildingCfAttribute,
    'data-elevation-delta': movementInfo?.elevationDelta,
    'data-elevation-cost': movementInfo?.elevationCost,
    'data-stand-up-required': movementInfo?.standUpRequired
      ? 'true'
      : undefined,
    'data-stand-up-mode': movementInfo?.standUpMode,
    'data-stand-up-cost': movementInfo?.standUpCost,
    'data-stand-up-psr-required': movementInfo?.standUpPsrRequired
      ? 'true'
      : undefined,
    'data-stand-up-psr-reason': movementInfo?.standUpPsrReason,
    'data-stand-up-psr-target': movementInfo?.standUpPsrTargetNumber,
    'data-stand-up-psr-modifier': movementInfo?.standUpPsrModifier,
    'data-stand-up-psr-modifier-details':
      movementInfo?.standUpPsrModifierDetails?.join('|'),
    'data-stand-up-psr-impossible-reason':
      movementInfo?.standUpPsrImpossibleReason,
    'data-stand-up-psr-automatic-success-reason':
      movementInfo?.standUpPsrAutomaticSuccessReason,
    'data-hull-down-exit-required': movementInfo?.hullDownExitRequired
      ? 'true'
      : undefined,
    'data-hull-down-exit-cost': movementInfo?.hullDownExitCost,
    'data-movement-blocked-reason': movementInfo?.blockedReason,
    'data-movement-invalid-reason': movementInfo?.movementInvalidReason,
    'data-movement-invalid-details': movementInfo?.movementInvalidDetails,
    'data-movement-altitude-control-required':
      movementInfo?.altitudeControlRequired ? 'true' : undefined,
    'data-movement-altitude-control-mode': movementInfo?.altitudeControlMode,
    'data-movement-altitude-control-altitude':
      movementInfo?.altitudeControlAltitude,
    'data-movement-automatic-landing-required':
      movementInfo?.automaticLandingRequired ? 'true' : undefined,
    'data-movement-automatic-landing-mode': movementInfo?.automaticLandingMode,
    'data-movement-automatic-landing-distance':
      movementInfo?.automaticLandingDistance,
    'data-movement-automatic-landing-minimum-distance':
      movementInfo?.automaticLandingMinimumDistance,
    'data-movement-automatic-landing-reason':
      movementInfo?.automaticLandingReason,
    'data-path-index': pathIndex,
    'data-path-step':
      pathIndex === undefined
        ? undefined
        : pathIndex === 0
          ? 'start'
          : pathIndex,
  };
}

function buildProjectionAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  const {
    combatInfo,
    combatLosBlockerReasons,
    combatLosBlockerTargetHexes,
    elevation,
    elevationStackMetrics,
    hex,
    hexLabel,
    isIsometricOccluder,
    isUnreachableHover,
    movementInfo,
    movementOptionCount,
    movementOptions,
    occludedUnitIds,
    occluderElevation,
    occlusionReasons,
    overlayState,
    pathIndex,
    tacticalProjectionBlockedReasons,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionIntent,
    tacticalProjectionMovementCostReasons,
    tacticalProjectionMovementCostStatus,
    tacticalProjectionMovementHazardReasons,
    tacticalProjectionMovementHazardStatus,
    tacticalProjectionMovementStatus,
    tacticalProjectionSourceReferences,
    tacticalProjectionStatus,
    terrainBuildingCfAttribute,
    terrainBuildingIdAttribute,
    terrainBuildingLevelAttribute,
    terrainCliffExitDirections,
    terrainCliffExitLabels,
    terrainFeatures,
    terrainType,
    terrainTypes,
  } = options;
  return {
    'data-tactical-projection-intent': tacticalProjectionIntent,
    'data-tactical-projection-status': tacticalProjectionStatus,
    'data-tactical-projection-movement-status':
      tacticalProjectionMovementStatus,
    'data-tactical-projection-movement-cost-status':
      tacticalProjectionMovementCostStatus,
    'data-tactical-projection-movement-cost-reasons':
      tacticalProjectionMovementCostReasons &&
      tacticalProjectionMovementCostReasons.length > 0
        ? tacticalProjectionMovementCostReasons.join('|')
        : undefined,
    'data-tactical-projection-movement-hazard-status':
      tacticalProjectionMovementHazardStatus,
    'data-tactical-projection-movement-hazard-reasons':
      tacticalProjectionMovementHazardReasons &&
      tacticalProjectionMovementHazardReasons.length > 0
        ? tacticalProjectionMovementHazardReasons.join('|')
        : undefined,
    'data-tactical-projection-combat-status': tacticalProjectionCombatStatus,
    'data-tactical-projection-blocked-reasons':
      tacticalProjectionBlockedReasons &&
      tacticalProjectionBlockedReasons.length > 0
        ? tacticalProjectionBlockedReasons.join('|')
        : undefined,
    'data-tactical-projection-sources':
      tacticalProjectionSourceReferences &&
      tacticalProjectionSourceReferences.length > 0
        ? formatTacticalProjectionSourceReferences(
            tacticalProjectionSourceReferences,
          )
        : undefined,
    'data-tactical-projection-rule-refs':
      tacticalProjectionSourceReferences &&
      tacticalProjectionSourceReferences.length > 0
        ? formatTacticalProjectionRuleReferences(
            tacticalProjectionSourceReferences,
          )
        : undefined,
    'data-tactical-projection-explanation': tacticalProjectionExplanation,
    'data-isometric-occludes-units': occludedUnitIds,
    'data-isometric-occlusion-reasons': occlusionReasons,
    'data-isometric-occluder-elevation': isIsometricOccluder
      ? occluderElevation
      : undefined,
  };
}

function buildCombatAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  return {
    ...buildCombatStateAttributes(options),
    ...buildCombatWeaponAttributes(options),
  };
}

function buildCombatStateAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  const { combatInfo, combatLosBlockerReasons, combatLosBlockerTargetHexes } =
    options;
  return {
    'data-combat-range-bracket': combatInfo?.rangeBracket,
    'data-combat-distance': combatInfo?.distance,
    'data-combat-los-state': combatInfo?.losState,
    'data-combat-los-blocker-reason': combatInfo?.lineOfSightBlockerReason,
    'data-combat-los-blocker-hex': combatInfo?.lineOfSightBlocker
      ? `${combatInfo.lineOfSightBlocker.hex.q},${combatInfo.lineOfSightBlocker.hex.r}`
      : undefined,
    'data-combat-los-blocker-kind': combatInfo?.lineOfSightBlocker?.kind,
    'data-combat-los-blocker-terrain': combatInfo?.lineOfSightBlocker?.terrain,
    'data-combat-target-cover-level': combatInfo?.targetCoverLevel,
    'data-combat-target-partial-cover': combatInfo
      ? combatInfo.targetPartialCover
        ? 'true'
        : 'false'
      : undefined,
    'data-combat-cover-modifier': combatInfo?.targetCoverModifier,
    'data-combat-cover-reason': combatInfo?.targetCoverReason,
    'data-combat-target-hull-down': combatInfo
      ? combatInfo.targetHullDown
        ? 'true'
        : 'false'
      : undefined,
    'data-combat-hull-down-modifier': combatInfo?.targetHullDownModifier,
    'data-combat-hull-down-reason': combatInfo?.targetHullDownReason,
    'data-combat-minimum-range-penalty': combatInfo?.minimumRangePenalty,
    'data-combat-minimum-range-weapons':
      combatInfo?.minimumRangeWeaponIds?.join(','),
    'data-combat-minimum-range-reason': combatInfo?.minimumRangeReason,
    'data-combat-to-hit-number': combatInfo?.toHitNumber,
    'data-combat-to-hit-modifiers': combatInfo?.toHitModifiers
      ?.map((modifier) => `${modifier.name}:${modifier.value}`)
      .join('|'),
    'data-combat-to-hit-reason': combatInfo?.toHitReason,
    'data-combat-c3-benefit': combatInfo?.c3BenefitApplied ? 'true' : undefined,
    'data-combat-c3-spotter': combatInfo?.c3SpotterId ?? undefined,
    'data-combat-c3-spotter-range': combatInfo?.c3SpotterRange ?? undefined,
    'data-combat-firing-arc': combatInfo?.firingArc,
    'data-combat-in-arc': combatInfo
      ? combatInfo.inArc
        ? 'true'
        : 'false'
      : undefined,
    'data-combat-target-visibility': combatInfo?.targetVisibilityState,
    'data-combat-visible-target-ids':
      combatInfo?.visibleTargetUnitIds.join(','),
    'data-combat-obscured-target-ids':
      combatInfo?.obscuredTargetUnitIds.join(','),
    'data-combat-visibility-blocked-reason':
      combatInfo?.visibilityBlockedReason,
    'data-combat-valid-target': combatInfo?.attackable
      ? 'true'
      : combatInfo?.hasTarget
        ? 'false'
        : undefined,
    'data-combat-blocked-reason': combatInfo?.blockedReason,
    'data-combat-invalid-reason': combatInfo?.attackInvalidReason,
    'data-combat-invalid-details': combatInfo?.attackInvalidDetails,
    'data-combat-indirect-fire': combatInfo?.indirectFireAvailable
      ? 'true'
      : undefined,
    'data-combat-indirect-spotter': combatInfo?.indirectFireSpotterId,
    'data-combat-indirect-basis': combatInfo?.indirectFireBasis,
    'data-combat-indirect-penalty': combatInfo?.indirectFireToHitPenalty,
    'data-combat-indirect-spotter-attacked':
      combatInfo?.indirectFireSpotterAttacked ? 'true' : undefined,
    'data-combat-indirect-forward-observer':
      combatInfo?.indirectFireForwardObserver ? 'true' : undefined,
    'data-combat-indirect-penalty-cancelled':
      combatInfo?.indirectFirePenaltyCancelled,
    'data-combat-indirect-reason': combatInfo?.indirectFireReason,
    'data-combat-indirect-blocked-reason':
      combatInfo?.indirectFireUnavailableReason,
    'data-weapons-in-range': combatInfo?.weaponIdsInRange.join(','),
    'data-weapons-in-arc': combatInfo?.weaponIdsInArc.join(','),
    'data-weapons-available': combatInfo?.weaponIdsAvailable.join(','),
  };
}

function buildCombatWeaponAttributes(
  options: HexCellRootAttributesOptions,
): SvgDataAttributes {
  const {
    combatInfo,
    combatLosBlockerReasons,
    combatLosBlockerTargetHexes,
    hexLabel,
    overlayState,
  } = options;
  return {
    'data-combat-weapon-option-ranges': combatWeaponOptionRangesAttribute(
      combatInfo?.weaponRangeOptions ?? [],
    ),
    'data-combat-weapon-option-arc-states':
      combatWeaponOptionArcStatesAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-weapon-option-environment-states':
      combatWeaponOptionEnvironmentStatesAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-weapon-option-availability':
      combatWeaponOptionAvailabilityAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-weapon-option-blocked-reasons':
      combatWeaponOptionBlockedReasonsAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-weapon-option-to-hit-numbers':
      combatWeaponOptionToHitNumbersAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-weapon-option-to-hit-modifiers':
      combatWeaponOptionToHitModifiersAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-weapon-option-expected-damages':
      combatWeaponOptionExpectedDamagesAttribute(
        combatInfo?.weaponRangeOptions ?? [],
      ),
    'data-combat-target-ids': combatInfo?.targetUnitIds.join(','),
    'data-combat-valid-target-ids': combatInfo?.validTargetUnitIds.join(','),
    'data-combat-los-blocker-for-target-hexes': combatLosBlockerTargetHexes,
    'data-combat-los-blocker-for-reasons': combatLosBlockerReasons,
    'data-hex-overlay-kind': overlayState.kind ?? undefined,
    'aria-label': hexLabel,
  };
}
