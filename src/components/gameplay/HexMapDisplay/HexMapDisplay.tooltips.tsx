import React from 'react';

import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from './HexMapDisplay.types';
import type { IsometricTerrainOccluderInfo } from './projection';

import { formatMovementModeLabel } from './HexCell.labels';
import { CombatC3ContextRows } from './HexMapDisplay.combatC3Context';
import { CombatCoverContextRows } from './HexMapDisplay.combatCoverContext';
import { CombatEnvironmentContextRows } from './HexMapDisplay.combatEnvironmentContext';
import { CombatIndirectFireContextRows } from './HexMapDisplay.combatIndirectFireContext';
import { CombatLosContextRows } from './HexMapDisplay.combatLosContext';
import { CombatMinimumRangeContextRows } from './HexMapDisplay.combatMinimumRangeContext';
import { CombatReasonContextRows } from './HexMapDisplay.combatReasonContext';
import { CombatTargetingContextRows } from './HexMapDisplay.combatTargetingContext';
import { CombatVisibilityContextRows } from './HexMapDisplay.combatVisibilityContext';
import { CombatWeaponImpactRows } from './HexMapDisplay.combatWeaponImpacts';
import { CombatWeaponOptionRows } from './HexMapDisplay.combatWeaponOptions';
import { CombinedTacticalHoverTooltip } from './HexMapDisplay.combinedTooltip';
import { MovementCostContextRows } from './HexMapDisplay.movementCostContext';
import { MovementModeOptionRows } from './HexMapDisplay.movementOptionRows';
import { MovementReasonContextRows } from './HexMapDisplay.movementReasonContext';
import { MovementStandUpContextRows } from './HexMapDisplay.movementStandUpContext';
import { MapMovementPointLegend } from './HexMapDisplay.mpLegend';
import { ProjectionContextRows } from './HexMapDisplay.projectionTooltipRows';
import {
  IsometricOccluderContextRows,
  TerrainContextRows,
  TerrainHoverTooltip,
} from './HexMapDisplay.terrainTooltip';
import { CombatToHitModifierRows } from './HexMapDisplay.toHitModifierRows';
import {
  formatCombatWeaponImpactLabel,
  formatCombatWeaponLabel,
  formatToHitModifierLabel,
} from './HexMapDisplay.tooltipFormatters';

interface MapHtmlOverlaysProps {
  readonly hoverUnreachable: boolean;
  readonly hoverUnreachableReason?: string;
  readonly hoverMovementInfo?: IMovementRangeHex;
  readonly hoverCombatInfo?: ICombatRangeHex;
  readonly hoverTerrainInfo?: IHexTerrain;
  readonly hoverProjectionInfo?: ITacticalMapHexProjection;
  readonly hoverIsometricOccluderInfo?: IsometricTerrainOccluderInfo;
  readonly mpLegend?: MapMovementPointLegendState;
  readonly onMovementModeSelect?: (mode: MapMovementKind) => void;
}

export function MapHtmlOverlays({
  hoverUnreachable,
  hoverUnreachableReason,
  hoverMovementInfo,
  hoverCombatInfo,
  hoverTerrainInfo,
  hoverProjectionInfo,
  hoverIsometricOccluderInfo,
  mpLegend,
  onMovementModeSelect,
}: MapHtmlOverlaysProps): React.ReactElement {
  const showCombinedTacticalTooltip = Boolean(
    hoverProjectionInfo?.movement && hoverProjectionInfo.combat,
  );

  return (
    <>
      {showCombinedTacticalTooltip && hoverProjectionInfo && (
        <CombinedTacticalHoverTooltip
          projection={hoverProjectionInfo}
          isometricOccluderInfo={hoverIsometricOccluderInfo}
        />
      )}

      {!showCombinedTacticalTooltip && hoverMovementInfo && (
        <MovementHoverTooltip
          movementInfo={hoverMovementInfo}
          projection={hoverProjectionInfo}
          terrain={hoverTerrainInfo}
          isometricOccluderInfo={hoverIsometricOccluderInfo}
        />
      )}

      {!showCombinedTacticalTooltip &&
        !hoverMovementInfo &&
        hoverUnreachable && (
          <div
            className="pointer-events-none absolute top-2 left-1/2 max-w-[260px] -translate-x-1/2 rounded bg-slate-900/90 px-2 py-1 text-xs font-medium text-slate-100 shadow"
            data-testid="hex-unreachable-tooltip"
            role="tooltip"
          >
            <div>Unreachable</div>
            {hoverUnreachableReason && (
              <div
                className="mt-0.5 text-[11px] font-normal text-slate-200"
                data-testid="hex-unreachable-tooltip-reason"
              >
                {hoverUnreachableReason}
              </div>
            )}
            {hoverTerrainInfo && (
              <TerrainContextRows
                terrain={hoverTerrainInfo}
                projection={hoverProjectionInfo}
                testIdPrefix="hex-unreachable-tooltip"
              />
            )}
            <IsometricOccluderContextRows
              info={hoverIsometricOccluderInfo}
              testIdPrefix="hex-unreachable-tooltip"
            />
            <ProjectionContextRows
              projection={hoverProjectionInfo}
              testIdPrefix="hex-unreachable-tooltip"
            />
          </div>
        )}

      {!showCombinedTacticalTooltip &&
        !hoverMovementInfo &&
        !hoverUnreachable &&
        hoverCombatInfo && (
          <CombatHoverTooltip
            combatInfo={hoverCombatInfo}
            projection={hoverProjectionInfo}
            terrain={hoverTerrainInfo}
            isometricOccluderInfo={hoverIsometricOccluderInfo}
          />
        )}

      {!showCombinedTacticalTooltip &&
        !hoverMovementInfo &&
        !hoverUnreachable &&
        !hoverCombatInfo &&
        hoverTerrainInfo && (
          <TerrainHoverTooltip
            terrain={hoverTerrainInfo}
            projection={hoverProjectionInfo}
            isometricOccluderInfo={hoverIsometricOccluderInfo}
          />
        )}

      {mpLegend && (
        <MapMovementPointLegend
          {...mpLegend}
          onMovementModeSelect={onMovementModeSelect}
        />
      )}
    </>
  );
}

function MovementHoverTooltip({
  movementInfo,
  projection,
  terrain,
  isometricOccluderInfo,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly terrain?: IHexTerrain;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
}): React.ReactElement {
  const movementMode =
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
      ? ` via ${formatMovementModeLabel(movementInfo.movementMode)}`
      : '';
  const status = movementInfo.reachable ? 'Reachable' : 'Blocked';

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[300px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-movement-tooltip"
      role="tooltip"
    >
      <div className="font-semibold" data-testid="hex-movement-tooltip-status">
        {status} - {movementInfo.movementType}
        {movementMode}
      </div>
      <div data-testid="hex-movement-tooltip-cost">
        MP: {Number.isFinite(movementInfo.mpCost) ? movementInfo.mpCost : 'X'}
      </div>
      {terrain && (
        <TerrainContextRows
          terrain={terrain}
          projection={projection}
          testIdPrefix="hex-movement-tooltip"
        />
      )}
      <IsometricOccluderContextRows
        info={isometricOccluderInfo}
        testIdPrefix="hex-movement-tooltip"
      />
      <ProjectionContextRows
        projection={projection}
        testIdPrefix="hex-movement-tooltip"
      />
      <MovementModeOptionRows
        movementInfo={movementInfo}
        projection={projection}
        testId="hex-movement-tooltip-mode-options"
      />
      <MovementCostContextRows
        movementInfo={movementInfo}
        projection={projection}
        testIdPrefix="hex-movement-tooltip"
      />
      <MovementStandUpContextRows
        movementInfo={movementInfo}
        projection={projection}
        testIdPrefix="hex-movement-tooltip"
      />
      <MovementReasonContextRows
        movementInfo={movementInfo}
        projection={projection}
        testId="hex-movement-tooltip-reason"
      />
    </div>
  );
}

function CombatHoverTooltip({
  combatInfo,
  projection,
  terrain,
  isometricOccluderInfo,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly terrain?: IHexTerrain;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
}): React.ReactElement {
  const targetLabel =
    combatInfo.targetUnitIds.length > 0
      ? combatInfo.targetUnitIds.join(', ')
      : 'No target';
  const statusLabel = combatInfo.attackable
    ? 'Attack available'
    : combatInfo.hasTarget
      ? 'Blocked'
      : combatInfo.inRange
        ? 'In range'
        : 'Out of range';
  const weaponLabel = formatCombatWeaponLabel(combatInfo);
  const modifierLabel = formatToHitModifierLabel(combatInfo);
  const weaponImpactLabel = formatCombatWeaponImpactLabel(combatInfo);

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[300px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-combat-tooltip"
      role="tooltip"
    >
      <div className="font-semibold" data-testid="hex-combat-tooltip-status">
        {statusLabel}
        {combatInfo.toHitNumber !== undefined
          ? ` - TN${combatInfo.toHitNumber}`
          : ''}
      </div>
      <div data-testid="hex-combat-tooltip-target">Target: {targetLabel}</div>
      <CombatTargetingContextRows
        combatInfo={combatInfo}
        projection={projection}
        testIdPrefix="hex-combat-tooltip"
      />
      {terrain && (
        <TerrainContextRows
          terrain={terrain}
          projection={projection}
          testIdPrefix="hex-combat-tooltip"
        />
      )}
      <IsometricOccluderContextRows
        info={isometricOccluderInfo}
        testIdPrefix="hex-combat-tooltip"
      />
      <ProjectionContextRows
        projection={projection}
        testIdPrefix="hex-combat-tooltip"
      />
      {weaponLabel && (
        <div data-testid="hex-combat-tooltip-weapons">{weaponLabel}</div>
      )}
      <CombatWeaponOptionRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-weapon-options"
      />
      <CombatEnvironmentContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-environment-context"
      />
      {weaponImpactLabel && (
        <div data-testid="hex-combat-tooltip-weapon-impact">
          {weaponImpactLabel}
        </div>
      )}
      <CombatWeaponImpactRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-weapon-impact-detail"
      />
      <CombatVisibilityContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-visibility"
      />
      <CombatCoverContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-cover"
      />
      <CombatMinimumRangeContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-minimum-range"
      />
      <CombatIndirectFireContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-indirect-fire"
      />
      <CombatC3ContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-c3-context"
      />
      <CombatLosContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-los-context"
      />
      {modifierLabel && (
        <div data-testid="hex-combat-tooltip-modifiers">{modifierLabel}</div>
      )}
      <CombatToHitModifierRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-to-hit-modifiers"
      />
      <CombatReasonContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-combat-tooltip-reason"
      />
    </div>
  );
}
