import React from 'react';

import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceLabels,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

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
import { MovementCostContextRows } from './HexMapDisplay.movementCostContext';
import { MovementModeOptionRows } from './HexMapDisplay.movementOptionRows';
import { MovementReasonContextRows } from './HexMapDisplay.movementReasonContext';
import { MovementStandUpContextRows } from './HexMapDisplay.movementStandUpContext';
import {
  IsometricOccluderContextRows,
  TerrainContextRows,
} from './HexMapDisplay.terrainTooltip';
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
      <TerrainContextRows
        terrain={projection.terrain}
        projection={projection}
        testIdPrefix="hex-tactical-tooltip"
      />
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
      <MovementStandUpContextRows
        movementInfo={movementInfo}
        projection={projection}
        testIdPrefix="hex-tactical-tooltip-movement"
      />
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
      <CombatTargetingContextRows
        combatInfo={combatInfo}
        projection={projection}
        testIdPrefix="hex-tactical-tooltip-combat"
      />
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
      <CombatReasonContextRows
        combatInfo={combatInfo}
        projection={projection}
        testId="hex-tactical-tooltip-combat-reason"
      />
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
