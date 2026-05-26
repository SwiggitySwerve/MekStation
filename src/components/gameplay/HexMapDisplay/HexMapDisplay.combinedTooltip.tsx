import React from 'react';

import type { ICombatRangeHex, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceLabels,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import type { IsometricTerrainOccluderInfo } from './projection';

import {
  formatElevationLabel,
  formatMovementModeLabel,
  formatTerrainFeaturesLabel,
} from './HexCell.labels';
import { CombatC3ContextRows } from './HexMapDisplay.combatC3Context';
import { CombatCoverContextRows } from './HexMapDisplay.combatCoverContext';
import { CombatEnvironmentContextRows } from './HexMapDisplay.combatEnvironmentContext';
import { CombatIndirectFireContextRows } from './HexMapDisplay.combatIndirectFireContext';
import { CombatLosContextRows } from './HexMapDisplay.combatLosContext';
import { CombatMinimumRangeContextRows } from './HexMapDisplay.combatMinimumRangeContext';
import { CombatVisibilityContextRows } from './HexMapDisplay.combatVisibilityContext';
import { CombatWeaponImpactRows } from './HexMapDisplay.combatWeaponImpacts';
import { CombatWeaponOptionRows } from './HexMapDisplay.combatWeaponOptions';
import { MovementCostContextRows } from './HexMapDisplay.movementCostContext';
import { MovementModeOptionRows } from './HexMapDisplay.movementOptionRows';
import { MovementReasonContextRows } from './HexMapDisplay.movementReasonContext';
import { IsometricOccluderContextRows } from './HexMapDisplay.terrainTooltip';
import { CombatToHitModifierRows } from './HexMapDisplay.toHitModifierRows';
import {
  formatCombatWeaponImpactLabel,
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

function formatStandUpLabel(movementInfo: IMovementRangeHex): string {
  return `${movementInfo.standUpMode === 'careful' ? 'Careful stand' : 'Stand up'}: +${movementInfo.standUpCost ?? '?'} MP`;
}

function formatStandUpPsrLabel(movementInfo: IMovementRangeHex): string {
  const reason = movementInfo.standUpPsrReason ?? 'Stand-up PSR';
  if (movementInfo.standUpPsrImpossibleReason) {
    return `${reason} impossible - ${movementInfo.standUpPsrImpossibleReason}`;
  }
  if (movementInfo.standUpPsrTargetNumber === undefined) {
    return `${reason} PSR required`;
  }
  const modifier =
    movementInfo.standUpPsrModifier !== undefined &&
    movementInfo.standUpPsrModifier !== 0
      ? ` (${movementInfo.standUpPsrModifier >= 0 ? '+' : ''}${movementInfo.standUpPsrModifier})`
      : '';
  return `${reason} TN ${movementInfo.standUpPsrTargetNumber}${modifier}`;
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
  isometricOccluderInfo,
}: {
  readonly projection: ITacticalMapHexProjection;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
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
  const weaponImpactLabel = formatCombatWeaponImpactLabel(combatInfo);
  const modifierLabel = formatToHitModifierLabel(combatInfo);
  const combatReason = combatReasonText(combatInfo);

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[340px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-tactical-tooltip"
      data-tactical-tooltip-status={projection.status}
      data-tactical-tooltip-intent={projection.intent}
      data-tactical-tooltip-movement-status={projection.movementStatus}
      data-tactical-tooltip-combat-status={projection.combatStatus}
      data-tactical-tooltip-blocked-reasons={projection.blockedReasons.join(
        '|',
      )}
      data-tactical-tooltip-sources={formatTacticalProjectionSourceReferences(
        projection.sourceReferences,
      )}
      data-tactical-tooltip-rule-refs={formatTacticalProjectionRuleReferences(
        projection.sourceReferences,
      )}
      data-tactical-tooltip-explanation={projection.explanation}
      role="tooltip"
    >
      <div className="font-semibold" data-testid="hex-tactical-tooltip-status">
        {formatProjectionStatusLabel(projection.status)} - {projection.intent}
      </div>
      <div
        className="text-[11px] text-slate-200"
        data-testid="hex-tactical-tooltip-channel-status"
      >
        Movement channel: {projection.movementStatus}; combat channel:{' '}
        {projection.combatStatus}
      </div>
      <ProjectionTerrainRows projection={projection} />
      <IsometricOccluderContextRows
        info={isometricOccluderInfo}
        testIdPrefix="hex-tactical-tooltip"
      />
      <div
        className="mt-1 border-t border-slate-700/70 pt-1"
        data-testid="hex-tactical-tooltip-movement"
      >
        Movement: {movementInfo.reachable ? 'reachable' : 'blocked'} -{' '}
        {movementInfo.movementType}
        {movementMode};{' '}
        {Number.isFinite(movementInfo.mpCost) ? movementInfo.mpCost : 'X'} MP
      </div>
      <MovementModeOptionRows
        movementInfo={movementInfo}
        projection={projection}
        testId="hex-tactical-tooltip-movement-options"
      />
      <MovementCostContextRows
        movementInfo={movementInfo}
        projection={projection}
        testIdPrefix="hex-tactical-tooltip-movement"
      />
      {movementInfo.standUpRequired && (
        <div data-testid="hex-tactical-tooltip-movement-stand-up">
          {formatStandUpLabel(movementInfo)}
        </div>
      )}
      {movementInfo.standUpPsrRequired && (
        <div data-testid="hex-tactical-tooltip-movement-stand-up-psr">
          {formatStandUpPsrLabel(movementInfo)}
        </div>
      )}
      {movementInfo.standUpPsrModifierDetails?.length ? (
        <div data-testid="hex-tactical-tooltip-movement-stand-up-modifiers">
          Modifiers: {movementInfo.standUpPsrModifierDetails.join('; ')}
        </div>
      ) : null}
      <MovementReasonContextRows
        movementInfo={movementInfo}
        projection={projection}
        testId="hex-tactical-tooltip-movement-reason"
      />
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
      <CombatWeaponOptionRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-weapon-options"
      />
      <CombatEnvironmentContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-environment-context"
      />
      {weaponImpactLabel && (
        <div data-testid="hex-tactical-tooltip-combat-weapon-impact">
          {weaponImpactLabel}
        </div>
      )}
      <CombatWeaponImpactRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-weapon-impact-detail"
      />
      <CombatVisibilityContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-visibility"
      />
      <CombatCoverContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-cover"
      />
      <CombatMinimumRangeContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-minimum-range"
      />
      <CombatIndirectFireContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-indirect-fire"
      />
      <CombatC3ContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-c3-context"
      />
      <CombatLosContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-los-context"
      />
      {modifierLabel && (
        <div data-testid="hex-tactical-tooltip-combat-modifiers">
          {modifierLabel}
        </div>
      )}
      <CombatToHitModifierRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-to-hit-modifiers"
      />
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
      {projection.explanation && (
        <div
          className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
          data-testid="hex-tactical-tooltip-projection-explanation"
        >
          Projection detail: {projection.explanation}
        </div>
      )}
      {projection.sourceReferences.length > 0 && (
        <div
          className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
          data-testid="hex-tactical-tooltip-projection-sources"
        >
          Sources:{' '}
          {formatTacticalProjectionSourceLabels(projection.sourceReferences)}
        </div>
      )}
    </div>
  );
}
