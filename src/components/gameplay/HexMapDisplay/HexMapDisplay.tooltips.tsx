import React from 'react';

import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import type { MapMovementPointLegendState } from './HexMapDisplay.types';
import type { IsometricTerrainOccluderInfo } from './projection';

import {
  formatElevationLabel,
  formatMovementModeLabel,
} from './HexCell.labels';
import { CombatWeaponImpactRows } from './HexMapDisplay.combatWeaponImpacts';
import { CombatWeaponOptionRows } from './HexMapDisplay.combatWeaponOptions';
import { CombinedTacticalHoverTooltip } from './HexMapDisplay.combinedTooltip';
import { MovementModeOptionRows } from './HexMapDisplay.movementOptionRows';
import { MapMovementPointLegend } from './HexMapDisplay.mpLegend';
import { ProjectionContextRows } from './HexMapDisplay.projectionTooltipRows';
import {
  IsometricOccluderContextRows,
  TerrainContextRows,
  TerrainHoverTooltip,
} from './HexMapDisplay.terrainTooltip';
import { CombatToHitModifierRows } from './HexMapDisplay.toHitModifierRows';
import {
  formatCombatCoverLabel,
  formatCombatVisibilityLabel,
  formatCombatWeaponImpactLabel,
  formatCombatWeaponLabel,
  formatMovementPathSummaryLabel,
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

      {mpLegend && <MapMovementPointLegend {...mpLegend} />}
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
  const reason =
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason;
  const pathSummaryLabel = formatMovementPathSummaryLabel(movementInfo);

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
        testId="hex-movement-tooltip-mode-options"
      />
      {movementInfo.terrainCost !== undefined && (
        <div data-testid="hex-movement-tooltip-terrain">
          Terrain cost: +{movementInfo.terrainCost}
        </div>
      )}
      {movementInfo.elevationDelta !== undefined && (
        <div data-testid="hex-movement-tooltip-elevation">
          Elevation: {formatElevationLabel(movementInfo.elevationDelta)}
          {movementInfo.elevationCost !== undefined
            ? `, cost +${movementInfo.elevationCost}`
            : ''}
        </div>
      )}
      {movementInfo.heatGenerated !== undefined && (
        <div data-testid="hex-movement-tooltip-heat">
          Heat: +{movementInfo.heatGenerated}
        </div>
      )}
      {pathSummaryLabel && (
        <div data-testid="hex-movement-tooltip-path">{pathSummaryLabel}</div>
      )}
      {movementInfo.standUpRequired && (
        <div data-testid="hex-movement-tooltip-stand-up">
          {movementInfo.standUpMode === 'careful'
            ? 'Careful stand'
            : 'Stand up'}
          : +{movementInfo.standUpCost ?? '?'} MP
        </div>
      )}
      {movementInfo.standUpPsrRequired && (
        <div data-testid="hex-movement-tooltip-stand-up-psr">
          {movementInfo.standUpPsrReason ?? 'Stand-up PSR'}
          {movementInfo.standUpPsrImpossibleReason
            ? ` impossible - ${movementInfo.standUpPsrImpossibleReason}`
            : movementInfo.standUpPsrTargetNumber === undefined
              ? ' PSR required'
              : ` TN ${movementInfo.standUpPsrTargetNumber}`}
          {movementInfo.standUpPsrModifier !== undefined &&
          movementInfo.standUpPsrModifier !== 0
            ? ` (${movementInfo.standUpPsrModifier >= 0 ? '+' : ''}${movementInfo.standUpPsrModifier})`
            : ''}
        </div>
      )}
      {movementInfo.standUpPsrModifierDetails?.length ? (
        <div data-testid="hex-movement-tooltip-stand-up-modifiers">
          Modifiers: {movementInfo.standUpPsrModifierDetails.join('; ')}
        </div>
      ) : null}
      {reason && (
        <div
          className="mt-1 text-[11px] text-slate-200"
          data-testid="hex-movement-tooltip-reason"
        >
          {reason}
        </div>
      )}
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
  const reason = combatInfo.attackable
    ? (combatInfo.toHitReason ??
      combatInfo.indirectFireReason ??
      combatInfo.targetCoverReason)
    : (combatInfo.blockedReason ??
      combatInfo.attackInvalidDetails ??
      combatInfo.visibilityBlockedReason ??
      combatInfo.lineOfSightBlockerReason);
  const weaponLabel = formatCombatWeaponLabel(combatInfo);
  const visibilityLabel = formatCombatVisibilityLabel(combatInfo);
  const coverLabel = formatCombatCoverLabel(combatInfo);
  const minimumRangeLabel = combatInfo.minimumRangeReason;
  const indirectFireLabel = combatInfo.indirectFireReason;
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
      <div data-testid="hex-combat-tooltip-range">
        Range: {combatInfo.rangeBracket.replace(/_/g, ' ')} at{' '}
        {combatInfo.distance} hexes
      </div>
      <div data-testid="hex-combat-tooltip-geometry">
        LOS {combatInfo.losState}; {combatInfo.firingArc} arc
      </div>
      {terrain && (
        <TerrainContextRows
          terrain={terrain}
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
        testId="hex-combat-tooltip-weapon-options"
      />
      {weaponImpactLabel && (
        <div data-testid="hex-combat-tooltip-weapon-impact">
          {weaponImpactLabel}
        </div>
      )}
      <CombatWeaponImpactRows
        combatInfo={combatInfo}
        testId="hex-combat-tooltip-weapon-impact-detail"
      />
      {visibilityLabel && (
        <div data-testid="hex-combat-tooltip-visibility">{visibilityLabel}</div>
      )}
      {coverLabel && (
        <div data-testid="hex-combat-tooltip-cover">{coverLabel}</div>
      )}
      {minimumRangeLabel && (
        <div data-testid="hex-combat-tooltip-minimum-range">
          {minimumRangeLabel}
        </div>
      )}
      {indirectFireLabel && (
        <div data-testid="hex-combat-tooltip-indirect-fire">
          {indirectFireLabel}
        </div>
      )}
      {modifierLabel && (
        <div data-testid="hex-combat-tooltip-modifiers">{modifierLabel}</div>
      )}
      <CombatToHitModifierRows
        combatInfo={combatInfo}
        testId="hex-combat-tooltip-to-hit-modifiers"
      />
      {reason && (
        <div
          className="mt-1 text-[11px] text-slate-200"
          data-testid="hex-combat-tooltip-reason"
        >
          {reason}
        </div>
      )}
    </div>
  );
}
