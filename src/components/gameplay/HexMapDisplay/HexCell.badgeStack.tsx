import React from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  MapProjectionMode,
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

import {
  CombatLineOfSightBlockerBadge,
  CombatRangeBadge,
} from './HexCell.combatBadges';
import { CombatImpactBadge } from './HexCell.combatImpactBadge';
import { MovementHoverCostBadge } from './HexCell.hoverMovementBadge';
import {
  CombatInvalidBadge,
  MovementInvalidBadge,
} from './HexCell.invalidBadges';
import {
  MovementAutomaticLandingBadge,
  MovementPathStepBadge,
  MovementReachBadge,
  MovementStandUpBadge,
  MovementStepCostBadge,
} from './HexCell.movementBadges';
import { MovementBlockedOptionsBadge } from './HexCell.movementBlockedOptionsBadge';
import {
  movementOptionHeatGeneratedAttribute,
  movementOptionMaxReachableHeatGenerated,
} from './HexCell.movementOptionSummaries';
import { ProjectionStatusBadge } from './HexCell.projectionBadges';
import {
  ElevationBadge,
  HeatBadge,
  TerrainBadge,
} from './HexCell.terrainBadges';

export function HexCellBadgeStack({
  combatInfo,
  combatLosBlockerFor,
  elevation,
  elevationLabel,
  hex,
  hoverMpCost,
  movementInfo,
  movementOptions,
  pathIndex,
  projectionMode,
  showElevationBadge,
  tacticalProjectionBlockedReasons,
  tacticalProjectionCombatStatus,
  tacticalProjectionExplanation,
  tacticalProjectionIntent,
  tacticalProjectionSourceReferences,
  tacticalProjectionStatus,
  tacticalProjectionMovementStatus,
  tacticalProjectionMovementCostReasons,
  tacticalProjectionMovementHazardReasons,
  tacticalProjectionMovementCostStatus,
  tacticalProjectionMovementHazardStatus,
  terrainFeatures,
  x,
  y,
}: {
  readonly combatInfo?: ICombatRangeHex;
  readonly combatLosBlockerFor?: readonly ITacticalMapCombatLosBlockerReference[];
  readonly elevation: number;
  readonly elevationLabel: string;
  readonly hex: IHexCoordinate;
  readonly hoverMpCost?: number;
  readonly movementInfo?: IMovementRangeHex;
  readonly movementOptions: readonly NonNullable<
    IMovementRangeHex['movementModeOptions']
  >[number][];
  readonly pathIndex?: number;
  readonly projectionMode: MapProjectionMode;
  readonly showElevationBadge?: boolean;
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
  readonly terrainFeatures: NonNullable<IHexTerrain['features']>;
  readonly x: number;
  readonly y: number;
}): React.ReactElement {
  return (
    <>
      {showElevationBadge &&
        projectionMode === 'topDown' &&
        elevation !== 0 && (
          <ElevationBadge
            x={x}
            y={y}
            hex={hex}
            elevation={elevation}
            label={elevationLabel}
            projectionMode={projectionMode}
            projectionIntent={tacticalProjectionIntent}
            projectionStatus={tacticalProjectionStatus}
            sourceReferences={tacticalProjectionSourceReferences}
          />
        )}
      <ProjectionStatusBadge
        x={x}
        y={y}
        hex={hex}
        status={tacticalProjectionStatus}
        intent={tacticalProjectionIntent}
        movementStatus={tacticalProjectionMovementStatus}
        movementCostStatus={tacticalProjectionMovementCostStatus}
        movementCostReasons={tacticalProjectionMovementCostReasons}
        movementHazardStatus={tacticalProjectionMovementHazardStatus}
        movementHazardReasons={tacticalProjectionMovementHazardReasons}
        combatStatus={tacticalProjectionCombatStatus}
        blockedReasons={tacticalProjectionBlockedReasons}
        sourceReferences={tacticalProjectionSourceReferences}
        explanation={tacticalProjectionExplanation}
      />
      <TerrainBadge
        x={x}
        y={y}
        hex={hex}
        terrainFeatures={terrainFeatures}
        projectionMode={projectionMode}
        projectionIntent={tacticalProjectionIntent}
        projectionStatus={tacticalProjectionStatus}
        sourceReferences={tacticalProjectionSourceReferences}
      />
      {hoverMpCost === undefined && (
        <MovementReachBadge
          x={x}
          y={y}
          hex={hex}
          movementInfo={movementInfo}
          projectionExplanation={tacticalProjectionExplanation}
          sourceReferences={tacticalProjectionSourceReferences}
        />
      )}
      <MovementBlockedOptionsBadge
        x={x}
        y={y}
        hex={hex}
        movementInfo={movementInfo}
        projectionExplanation={tacticalProjectionExplanation}
        sourceReferences={tacticalProjectionSourceReferences}
      />
      <MovementStepCostBadge
        x={x}
        y={y}
        hex={hex}
        movementInfo={movementInfo}
        projectionExplanation={tacticalProjectionExplanation}
        sourceReferences={tacticalProjectionSourceReferences}
      />
      <MovementStandUpBadge x={x} y={y} hex={hex} movementInfo={movementInfo} />
      <MovementAutomaticLandingBadge
        x={x}
        y={y}
        hex={hex}
        movementInfo={movementInfo}
      />
      <MovementPathStepBadge x={x} y={y} hex={hex} pathIndex={pathIndex} />
      <HeatBadge
        x={x}
        y={y}
        hex={hex}
        heatGenerated={movementOptionMaxReachableHeatGenerated(movementInfo)}
        movementOptionHeats={movementOptionHeatGeneratedAttribute(
          movementOptions,
        )}
      />
      <MovementInvalidBadge
        x={x}
        y={y}
        hex={hex}
        movementInfo={movementInfo}
        projectionExplanation={tacticalProjectionExplanation}
        sourceReferences={tacticalProjectionSourceReferences}
      />
      <MovementHoverCostBadge
        x={x}
        y={y}
        hex={hex}
        hoverMpCost={hoverMpCost}
        movementInfo={movementInfo}
        projectionExplanation={tacticalProjectionExplanation}
        sourceReferences={tacticalProjectionSourceReferences}
      />
      <CombatLineOfSightBlockerBadge
        x={x}
        y={y}
        hex={hex}
        blockerRefs={combatLosBlockerFor}
      />
      <CombatRangeBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatImpactBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatInvalidBadge
        x={x}
        y={y}
        hex={hex}
        combatInfo={combatInfo}
        projectionExplanation={tacticalProjectionExplanation}
        sourceReferences={tacticalProjectionSourceReferences}
      />
    </>
  );
}
