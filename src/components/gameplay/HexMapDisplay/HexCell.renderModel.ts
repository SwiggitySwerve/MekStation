import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';
import type {
  ITacticalMapCombatLosBlockerReference,
  ITacticalMapProjectionSourceReference,
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import type { ElevationStackAttributeState } from './HexCell.elevationStackAttributes';
import type { HexOverlayState } from './HexCell.overlayModel';

import { formatCombatLabel, formatMovementLabel } from './HexCell.labels';
import {
  buildOverlayAttributes,
  formatHexOverlayLabel,
  type SvgDataAttributes,
} from './HexCell.overlayAttributes';
import {
  buildHexLabel,
  buildProjectionLabelParts,
  formatCombatLosBlockerReasons,
  formatCombatLosBlockerTargetHexes,
  formatOptionalRuleReferences,
  formatOptionalSourceReferences,
  formatPathLabel,
  joinNonEmpty,
  movementOptionsForRootAttributes,
} from './HexCell.renderLabels';
import { buildRootAttributes } from './HexCell.rootAttributes';
import {
  terrainBuildingConstructionFactorsAttribute,
  terrainBuildingIdsAttribute,
  terrainBuildingLevelsAttribute,
  terrainCliffExitDirectionsAttribute,
  terrainCliffExitLabelsAttribute,
} from './HexMapDisplay.terrainMetadata';
import { getPrimaryTerrainFeature } from './renderHelpers';

export interface HexCellRenderModelOptions {
  readonly combatInfo?: ICombatRangeHex;
  readonly combatLosBlockerFor?: readonly ITacticalMapCombatLosBlockerReference[];
  readonly elevation: number;
  readonly elevationLabel: string;
  readonly elevationStackMetrics: ElevationStackAttributeState;
  readonly hex: IHexCoordinate;
  readonly isInPath: boolean;
  readonly isIsometricOccluder: boolean;
  readonly isUnreachableHover?: boolean;
  readonly movementInfo?: IMovementRangeHex;
  readonly occluderElevation?: number;
  readonly occludedUnitIds?: string;
  readonly occluderLabel: string;
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
  readonly terrain?: IHexTerrain;
}

export interface HexCellRenderModel {
  readonly combatLosBlockerReasons?: string;
  readonly combatLosBlockerTargetHexes?: string;
  readonly hexLabel: string;
  readonly movementOptions: readonly NonNullable<
    IMovementRangeHex['movementModeOptions']
  >[number][];
  readonly overlayAttributes: SvgDataAttributes;
  readonly overlayBlockedReasons?: string;
  readonly overlayLabel?: string;
  readonly overlayRuleReferences?: string;
  readonly overlaySourceReferences?: string;
  readonly rootAttributes: SvgDataAttributes;
  readonly terrainFeatures: NonNullable<IHexTerrain['features']>;
  readonly terrainType: string | null;
}

export function buildHexCellRenderModel(
  options: HexCellRenderModelOptions,
): HexCellRenderModel {
  const {
    combatInfo,
    combatLosBlockerFor,
    elevation,
    elevationLabel,
    elevationStackMetrics,
    hex,
    isInPath,
    isIsometricOccluder,
    isUnreachableHover,
    movementInfo,
    occluderElevation,
    occludedUnitIds,
    occluderLabel,
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
    terrain,
  } = options;

  const terrainFeatures = terrain?.features ?? [];
  const terrainTypes = terrainFeatures.map((feature) => feature.type);
  const terrainType = getPrimaryTerrainFeature(terrain)?.type ?? null;
  const terrainBuildingIdAttribute = terrainBuildingIdsAttribute(terrain);
  const terrainBuildingLevelAttribute = terrainBuildingLevelsAttribute(terrain);
  const terrainBuildingCfAttribute =
    terrainBuildingConstructionFactorsAttribute(terrain);
  const terrainCliffExitDirections =
    terrainCliffExitDirectionsAttribute(terrain);
  const terrainCliffExitLabels = terrainCliffExitLabelsAttribute(terrain);
  const movementOptionCount = movementInfo?.movementModeOptions?.length;
  const movementOptions = movementOptionsForRootAttributes(movementInfo);
  const combatLosBlockerTargetHexes =
    formatCombatLosBlockerTargetHexes(combatLosBlockerFor);
  const combatLosBlockerReasons =
    formatCombatLosBlockerReasons(combatLosBlockerFor);
  const buildingStructureLabel = [
    terrainBuildingIdAttribute ? `building ${terrainBuildingIdAttribute}` : '',
    terrainBuildingLevelAttribute
      ? `level ${terrainBuildingLevelAttribute}`
      : '',
    terrainBuildingCfAttribute ? `CF ${terrainBuildingCfAttribute}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const movementLabel = movementInfo ? formatMovementLabel(movementInfo) : null;
  const combatLabel = combatInfo ? formatCombatLabel(combatInfo) : null;
  const pathLabel = formatPathLabel(pathIndex);
  const projectionLabelParts = buildProjectionLabelParts({
    tacticalProjectionBlockedReasons,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionIntent,
    tacticalProjectionMovementStatus,
    tacticalProjectionStatus,
  });
  const hexLabel = buildHexLabel({
    buildingStructureLabel,
    combatLabel,
    elevationLabel,
    hex,
    movementLabel,
    occluderLabel,
    pathLabel,
    projectionLabelParts,
    terrainFeatures,
    terrainType,
  });

  const overlaySourceReferences = formatOptionalSourceReferences(
    tacticalProjectionSourceReferences,
  );
  const overlayRuleReferences = formatOptionalRuleReferences(
    tacticalProjectionSourceReferences,
  );
  const overlayBlockedReasons = joinNonEmpty(
    tacticalProjectionBlockedReasons,
    '|',
  );
  const overlayLabel = overlayState.kind
    ? formatHexOverlayLabel({
        hex,
        overlayKind: overlayState.kind,
        status: tacticalProjectionStatus,
        movementStatus: tacticalProjectionMovementStatus,
        combatStatus: tacticalProjectionCombatStatus,
        blockedReasons: tacticalProjectionBlockedReasons,
        explanation: tacticalProjectionExplanation,
      })
    : undefined;

  const rootAttributes = buildRootAttributes({
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
    occluderElevation,
    movementOptionCount,
    movementOptions,
    occludedUnitIds,
    occlusionReasons,
    overlayState,
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
    pathIndex,
  });
  const overlayAttributes = buildOverlayAttributes({
    overlayBlockedReasons,
    overlayLabel,
    overlayRuleReferences,
    overlaySourceReferences,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionMovementCostReasons,
    tacticalProjectionMovementCostStatus,
    tacticalProjectionMovementHazardReasons,
    tacticalProjectionMovementHazardStatus,
    tacticalProjectionMovementStatus,
    tacticalProjectionStatus,
    overlayState,
  });

  return {
    combatLosBlockerReasons,
    combatLosBlockerTargetHexes,
    hexLabel,
    movementOptions,
    overlayAttributes,
    overlayBlockedReasons,
    overlayLabel,
    overlayRuleReferences,
    overlaySourceReferences,
    rootAttributes,
    terrainFeatures,
    terrainType,
  };
}
