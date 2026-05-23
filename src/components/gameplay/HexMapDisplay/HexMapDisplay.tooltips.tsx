import React from 'react';

import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

import { CoverLevel, TERRAIN_PROPERTIES } from '@/types/gameplay/TerrainTypes';

import {
  formatElevationLabel,
  formatTerrainFeaturesLabel,
} from './HexCell.labels';
import {
  formatCombatCoverLabel,
  formatCombatVisibilityLabel,
  formatCombatWeaponLabel,
  formatToHitModifierLabel,
} from './HexMapDisplay.tooltipFormatters';

interface MapHtmlOverlaysProps {
  readonly hoverUnreachable: boolean;
  readonly hoverUnreachableReason?: string;
  readonly hoverMovementInfo?: IMovementRangeHex;
  readonly hoverCombatInfo?: ICombatRangeHex;
  readonly hoverTerrainInfo?: IHexTerrain;
  readonly mpLegend?: {
    readonly active: 'walk' | 'run' | 'jump';
    readonly jumpAvailable: boolean;
  };
}

export function MapHtmlOverlays({
  hoverUnreachable,
  hoverUnreachableReason,
  hoverMovementInfo,
  hoverCombatInfo,
  hoverTerrainInfo,
  mpLegend,
}: MapHtmlOverlaysProps): React.ReactElement {
  return (
    <>
      {hoverMovementInfo && (
        <MovementHoverTooltip
          movementInfo={hoverMovementInfo}
          terrain={hoverTerrainInfo}
        />
      )}

      {!hoverMovementInfo && hoverUnreachable && (
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
        </div>
      )}

      {!hoverMovementInfo && !hoverUnreachable && hoverCombatInfo && (
        <CombatHoverTooltip
          combatInfo={hoverCombatInfo}
          terrain={hoverTerrainInfo}
        />
      )}

      {!hoverMovementInfo &&
        !hoverUnreachable &&
        !hoverCombatInfo &&
        hoverTerrainInfo && <TerrainHoverTooltip terrain={hoverTerrainInfo} />}

      {mpLegend && (
        <div
          className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1 rounded bg-white/90 p-2 text-xs shadow"
          data-testid="mp-legend"
        >
          {(['walk', 'run', 'jump'] as const).map((kind) => {
            const isActive = mpLegend.active === kind;
            const isJumpDisabled = kind === 'jump' && !mpLegend.jumpAvailable;
            const swatch =
              kind === 'walk'
                ? 'bg-green-500'
                : kind === 'run'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500';
            const label =
              kind === 'walk' ? 'Walk' : kind === 'run' ? 'Run' : 'Jump';
            return (
              <div
                key={kind}
                className={`flex items-center gap-2 rounded px-1 py-0.5 ${
                  isActive
                    ? 'font-semibold ring-1 ring-slate-700'
                    : 'opacity-70'
                } ${isJumpDisabled ? 'opacity-40' : ''}`}
                data-testid={`mp-legend-${kind}`}
                data-active={isActive ? 'true' : undefined}
                data-disabled={isJumpDisabled ? 'true' : undefined}
                title={isJumpDisabled ? 'No jump capability' : undefined}
              >
                <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function terrainCoverLabel(terrain: IHexTerrain): CoverLevel {
  let bestCover = CoverLevel.None;
  for (const feature of terrain.features) {
    const cover = TERRAIN_PROPERTIES[feature.type].coverLevel;
    if (cover === CoverLevel.Full) return cover;
    if (cover === CoverLevel.Partial) bestCover = cover;
  }
  return bestCover;
}

function TerrainHoverTooltip({
  terrain,
}: {
  readonly terrain: IHexTerrain;
}): React.ReactElement {
  const terrainTypes = terrain.features.map((feature) => feature.type);
  const blocksLos = terrain.features.some(
    (feature) => TERRAIN_PROPERTIES[feature.type].blocksLOS,
  );
  const heatEffect = terrain.features.reduce(
    (total, feature) => total + TERRAIN_PROPERTIES[feature.type].heatEffect,
    0,
  );
  const specialRules = terrain.features
    .flatMap((feature) => TERRAIN_PROPERTIES[feature.type].specialRules)
    .join(', ');

  return (
    <div
      className="pointer-events-none absolute top-2 left-1/2 max-w-[300px] -translate-x-1/2 rounded bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow"
      data-testid="hex-terrain-tooltip"
      role="tooltip"
    >
      <div className="font-semibold" data-testid="hex-terrain-tooltip-title">
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div data-testid="hex-terrain-tooltip-elevation">
        Elevation: {formatElevationLabel(terrain.elevation)}
      </div>
      <div data-testid="hex-terrain-tooltip-cover">
        Cover: {terrainCoverLabel(terrain)}
      </div>
      <div data-testid="hex-terrain-tooltip-los">
        LOS: {blocksLos ? 'blocks' : 'clear'}
      </div>
      {heatEffect !== 0 && (
        <div data-testid="hex-terrain-tooltip-heat">
          Heat effect: {heatEffect > 0 ? '+' : ''}
          {heatEffect}
        </div>
      )}
      {specialRules && (
        <div
          className="mt-1 text-[11px] text-slate-200"
          data-testid="hex-terrain-tooltip-rules"
        >
          {specialRules}
        </div>
      )}
    </div>
  );
}

function TerrainContextRows({
  terrain,
  testIdPrefix,
}: {
  readonly terrain: IHexTerrain;
  readonly testIdPrefix: string;
}): React.ReactElement {
  const terrainTypes = terrain.features.map((feature) => feature.type);

  return (
    <div className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200">
      <div data-testid={`${testIdPrefix}-terrain-context`}>
        Terrain: {formatTerrainFeaturesLabel(terrainTypes)}
      </div>
      <div data-testid={`${testIdPrefix}-elevation-context`}>
        Elevation: {formatElevationLabel(terrain.elevation)}
      </div>
    </div>
  );
}

function MovementHoverTooltip({
  movementInfo,
  terrain,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly terrain?: IHexTerrain;
}): React.ReactElement {
  const movementMode =
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
      ? ` via ${movementInfo.movementMode}`
      : '';
  const status = movementInfo.reachable ? 'Reachable' : 'Blocked';
  const reason =
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason;

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
      {movementInfo.standUpRequired && (
        <div data-testid="hex-movement-tooltip-stand-up">
          Stand up: +{movementInfo.standUpCost ?? '?'} MP
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
  terrain,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly terrain?: IHexTerrain;
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
      {weaponLabel && (
        <div data-testid="hex-combat-tooltip-weapons">{weaponLabel}</div>
      )}
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
