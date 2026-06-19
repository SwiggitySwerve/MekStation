import type {
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
  TacticalMapMovementProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import type { HexCellRenderModelOptions } from './HexCell.renderModel';

import {
  formatTerrainFeatureReferenceLabel,
  formatTerrainLabel,
} from './HexCell.labels';

function formatProjectionStatusForLabel(
  status?: TacticalMapHexProjectionStatus,
): string | null {
  switch (status) {
    case 'mixed':
      return 'mixed';
    case 'blocked':
      return 'blocked';
    case 'legal':
      return 'legal';
    case 'neutral':
      return 'neutral';
    case undefined:
      return null;
  }
}

export function buildProjectionLabelParts({
  tacticalProjectionBlockedReasons,
  tacticalProjectionCombatStatus,
  tacticalProjectionExplanation,
  tacticalProjectionIntent,
  tacticalProjectionMovementStatus,
  tacticalProjectionStatus,
}: Pick<
  HexCellRenderModelOptions,
  | 'tacticalProjectionBlockedReasons'
  | 'tacticalProjectionCombatStatus'
  | 'tacticalProjectionExplanation'
  | 'tacticalProjectionIntent'
  | 'tacticalProjectionMovementStatus'
  | 'tacticalProjectionStatus'
>): string[] {
  const projectionStatusLabel = formatProjectionStatusForLabel(
    tacticalProjectionStatus,
  );
  return [
    projectionStatusLabel && tacticalProjectionIntent
      ? `projection ${projectionStatusLabel} ${tacticalProjectionIntent}`
      : '',
    tacticalProjectionMovementStatus || tacticalProjectionCombatStatus
      ? `projection channels movement ${
          tacticalProjectionMovementStatus ?? 'none'
        } combat ${tacticalProjectionCombatStatus ?? 'none'}`
      : '',
    tacticalProjectionBlockedReasons &&
    tacticalProjectionBlockedReasons.length > 0
      ? `projection blocked ${tacticalProjectionBlockedReasons.join(', ')}`
      : '',
    tacticalProjectionExplanation
      ? `projection detail ${tacticalProjectionExplanation}`
      : '',
  ].filter(Boolean);
}

export function movementOptionsForRootAttributes(
  movementInfo?: IMovementRangeHex,
): readonly NonNullable<IMovementRangeHex['movementModeOptions']>[number][] {
  return movementInfo?.movementModeOptions &&
    movementInfo.movementModeOptions.length > 1
    ? movementInfo.movementModeOptions
    : [];
}

export function formatCombatLosBlockerTargetHexes(
  combatLosBlockerFor:
    | readonly ITacticalMapCombatLosBlockerReference[]
    | undefined,
): string | undefined {
  return combatLosBlockerFor && combatLosBlockerFor.length > 0
    ? combatLosBlockerFor
        .map((ref) => `${ref.targetHex.q},${ref.targetHex.r}`)
        .join('|')
    : undefined;
}

export function formatCombatLosBlockerReasons(
  combatLosBlockerFor:
    | readonly ITacticalMapCombatLosBlockerReference[]
    | undefined,
): string | undefined {
  return combatLosBlockerFor && combatLosBlockerFor.length > 0
    ? combatLosBlockerFor.map((ref) => ref.blocker.reason).join('|')
    : undefined;
}

export function formatPathLabel(pathIndex: number | undefined): string | null {
  return pathIndex === undefined
    ? null
    : pathIndex === 0
      ? 'path start'
      : `path step ${pathIndex}`;
}

export function joinNonEmpty(
  values: readonly string[] | undefined,
  separator: string,
): string | undefined {
  return values && values.length > 0 ? values.join(separator) : undefined;
}

export function formatOptionalSourceReferences(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): string | undefined {
  return sourceReferences && sourceReferences.length > 0
    ? formatTacticalProjectionSourceReferences(sourceReferences)
    : undefined;
}

export function formatOptionalRuleReferences(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): string | undefined {
  return sourceReferences && sourceReferences.length > 0
    ? formatTacticalProjectionRuleReferences(sourceReferences)
    : undefined;
}

export function buildHexLabel({
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
}: {
  readonly buildingStructureLabel: string;
  readonly combatLabel: string | null;
  readonly elevationLabel: string;
  readonly hex: IHexCoordinate;
  readonly movementLabel: string | null;
  readonly occluderLabel: string;
  readonly pathLabel: string | null;
  readonly projectionLabelParts: readonly string[];
  readonly terrainFeatures: NonNullable<IHexTerrain['features']>;
  readonly terrainType: string | null;
}): string {
  return `Hex ${hex.q},${hex.r}; terrain ${formatTerrainFeatureReferenceLabel(
    terrainFeatures,
  )}; primary ${formatTerrainLabel(terrainType)}; elevation ${elevationLabel}${
    buildingStructureLabel ? `; ${buildingStructureLabel}` : ''
  }${
    movementLabel ? `; ${movementLabel}` : ''
  }${combatLabel ? `; ${combatLabel}` : ''}${
    pathLabel ? `; ${pathLabel}` : ''
  }${
    projectionLabelParts.length > 0
      ? `; ${projectionLabelParts.join('; ')}`
      : ''
  }${occluderLabel}`;
}
