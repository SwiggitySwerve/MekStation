import React from 'react';

import type { ICombatRangeHex, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatElevationLabel,
  formatMovementModeLabel,
  formatTerrainFeaturesLabel,
} from './HexCell.labels';
import {
  formatCombatCoverLabel,
  formatCombatVisibilityLabel,
  formatCombatWeaponLabel,
  formatToHitModifierLabel,
} from './HexMapDisplay.tooltipFormatters';

function formatProjectionStatusLabel(
  status: ITacticalMapHexProjection['status'],
): string {
  switch (status) {
    case 'mixed':
      return 'Mixed';
    case 'blocked':
      return 'Blocked';
    case 'legal':
      return 'Legal';
    case 'neutral':
      return 'Neutral';
  }
}

function movementReasonText(
  movementInfo: IMovementRangeHex,
): string | undefined {
  return (
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason
  );
}

function combatReasonText(combatInfo: ICombatRangeHex): string | undefined {
  return combatInfo.attackable
    ? (combatInfo.toHitReason ??
        combatInfo.indirectFireReason ??
        combatInfo.targetCoverReason)
    : (combatInfo.blockedReason ??
        combatInfo.attackInvalidDetails ??
        combatInfo.visibilityBlockedReason ??
        combatInfo.lineOfSightBlockerReason);
}

function ProjectionTerrainRows({
  projection,
}: {
  readonly projection: ITacticalMapHexProjection;
}): React.ReactElement {
  const terrainTypes = projection.terrain.features.map(
    (feature) => feature.type,
  );

  return (
    <div className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200">
      <div data-testid="hex-tactical-tooltip-terrain-context">
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div data-testid="hex-tactical-tooltip-elevation-context">
        Elevation: {formatElevationLabel(projection.terrain.elevation)}
      </div>
    </div>
  );
}

export function CombinedTacticalHoverTooltip({
  projection,
}: {
  readonly projection: ITacticalMapHexProjection;
}): React.ReactElement | null {
  const movementInfo = projection.movement;
  const combatInfo = projection.combat;
  if (!movementInfo || !combatInfo) return null;

  const movementMode =
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
      ? ` via ${formatMovementModeLabel(movementInfo.movementMode)}`
      : '';
  const combatStatus = combatInfo.attackable
    ? 'Attack available'
    : combatInfo.hasTarget
      ? 'Blocked'
      : combatInfo.inRange
        ? 'In range'
        : 'Out of range';
  const targetLabel =
    combatInfo.targetUnitIds.length > 0
      ? combatInfo.targetUnitIds.join(', ')
      : 'No target';
  const weaponLabel = formatCombatWeaponLabel(combatInfo);
  const visibilityLabel = formatCombatVisibilityLabel(combatInfo);
  const coverLabel = formatCombatCoverLabel(combatInfo);
  const modifierLabel = formatToHitModifierLabel(combatInfo);
  const movementReason = movementReasonText(movementInfo);
  const combatReason = combatReasonText(combatInfo);

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[340px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-tactical-tooltip"
      data-tactical-tooltip-status={projection.status}
      data-tactical-tooltip-intent={projection.intent}
      data-tactical-tooltip-blocked-reasons={projection.blockedReasons.join(
        '|',
      )}
      role="tooltip"
    >
      <div className="font-semibold" data-testid="hex-tactical-tooltip-status">
        {formatProjectionStatusLabel(projection.status)} - {projection.intent}
      </div>
      <ProjectionTerrainRows projection={projection} />
      <div
        className="mt-1 border-t border-slate-700/70 pt-1"
        data-testid="hex-tactical-tooltip-movement"
      >
        Movement: {movementInfo.reachable ? 'reachable' : 'blocked'} -{' '}
        {movementInfo.movementType}
        {movementMode};{' '}
        {Number.isFinite(movementInfo.mpCost) ? movementInfo.mpCost : 'X'} MP
      </div>
      {movementInfo.terrainCost !== undefined && (
        <div data-testid="hex-tactical-tooltip-movement-terrain">
          Terrain cost: +{movementInfo.terrainCost}
        </div>
      )}
      {movementInfo.elevationDelta !== undefined && (
        <div data-testid="hex-tactical-tooltip-movement-elevation">
          Elevation: {formatElevationLabel(movementInfo.elevationDelta)}
          {movementInfo.elevationCost !== undefined
            ? `, cost +${movementInfo.elevationCost}`
            : ''}
        </div>
      )}
      {movementInfo.heatGenerated !== undefined && (
        <div data-testid="hex-tactical-tooltip-movement-heat">
          Heat: +{movementInfo.heatGenerated}
        </div>
      )}
      {movementReason && (
        <div
          className="text-[11px] text-slate-200"
          data-testid="hex-tactical-tooltip-movement-reason"
        >
          {movementReason}
        </div>
      )}
      <div
        className="mt-1 border-t border-slate-700/70 pt-1"
        data-testid="hex-tactical-tooltip-combat"
      >
        Combat: {combatStatus}
        {combatInfo.toHitNumber !== undefined
          ? ` - TN${combatInfo.toHitNumber}`
          : ''}
      </div>
      <div data-testid="hex-tactical-tooltip-combat-target">
        Target: {targetLabel}
      </div>
      <div data-testid="hex-tactical-tooltip-combat-range">
        Range: {combatInfo.rangeBracket.replace(/_/g, ' ')} at{' '}
        {combatInfo.distance} hexes
      </div>
      <div data-testid="hex-tactical-tooltip-combat-geometry">
        LOS {combatInfo.losState}; {combatInfo.firingArc} arc
      </div>
      {weaponLabel && (
        <div data-testid="hex-tactical-tooltip-combat-weapons">
          {weaponLabel}
        </div>
      )}
      {visibilityLabel && (
        <div data-testid="hex-tactical-tooltip-combat-visibility">
          {visibilityLabel}
        </div>
      )}
      {coverLabel && (
        <div data-testid="hex-tactical-tooltip-combat-cover">{coverLabel}</div>
      )}
      {combatInfo.minimumRangeReason && (
        <div data-testid="hex-tactical-tooltip-combat-minimum-range">
          {combatInfo.minimumRangeReason}
        </div>
      )}
      {combatInfo.indirectFireReason && (
        <div data-testid="hex-tactical-tooltip-combat-indirect-fire">
          {combatInfo.indirectFireReason}
        </div>
      )}
      {modifierLabel && (
        <div data-testid="hex-tactical-tooltip-combat-modifiers">
          {modifierLabel}
        </div>
      )}
      {combatReason && (
        <div
          className="text-[11px] text-slate-200"
          data-testid="hex-tactical-tooltip-combat-reason"
        >
          {combatReason}
        </div>
      )}
      {projection.blockedReasons.length > 0 && (
        <div
          className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
          data-testid="hex-tactical-tooltip-projection-reasons"
        >
          Projection: {projection.blockedReasons.join('; ')}
        </div>
      )}
    </div>
  );
}
