import React from 'react';

import type { useAnimationQueue } from '@/stores/useAnimationQueue';
import type {
  IGameEvent,
  IHexCoordinate,
  IHexTerrain,
  IUnitToken,
} from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import { UnitTokenForType } from '@/components/gameplay/UnitToken/UnitTokenForType';
import { HEX_SIZE } from '@/constants/hexMap';
import { GameSide } from '@/types/gameplay';
import { coordToKey, keyToCoord } from '@/utils/gameplay/hexMath';
import { gameSideToObjectiveSide } from '@/utils/gameplay/objectives';

import type { MapInteractionState } from './useMapInteraction';

import { MovementCostOverlay, CoverOverlay } from './Overlays';
import { hexToPixel } from './renderHelpers';

type AnimationState = ReturnType<typeof useAnimationQueue.getState>['active'];
type MovementAnimation = AnimationState[number];

interface SensorRingsLayerProps {
  readonly orderedTokens: readonly IUnitToken[];
}

interface SensorRingProjection {
  readonly displayPosition: IHexCoordinate;
  readonly positionSource: 'current' | 'last-known';
  readonly fogStatus: 'visible' | NonNullable<IUnitToken['fogStatus']>;
}

function deriveSensorRingProjection(token: IUnitToken): SensorRingProjection {
  if (token.fogStatus === 'lastKnown' && token.lastKnownPosition) {
    return {
      displayPosition: token.lastKnownPosition,
      positionSource: 'last-known',
      fogStatus: 'lastKnown',
    };
  }

  return {
    displayPosition: token.position,
    positionSource: 'current',
    fogStatus: token.fogStatus ?? 'visible',
  };
}

function describeSensorRing(
  token: IUnitToken,
  projection: SensorRingProjection,
  sensorRange: number,
): string {
  return [
    `${token.name} sensor ring`,
    `range ${sensorRange} hexes`,
    `displayed at ${coordToKey(projection.displayPosition)}`,
    `source ${coordToKey(token.position)}`,
    `position source ${projection.positionSource}`,
    `visibility ${projection.fogStatus}`,
  ].join('; ');
}

export function SensorRingsLayer({
  orderedTokens,
}: SensorRingsLayerProps): React.ReactElement {
  return (
    <g data-testid="sensor-rings-layer">
      {orderedTokens
        .filter(
          (token) =>
            token.sensorRange != null &&
            token.sensorRange > 0 &&
            token.fogStatus !== 'hidden',
        )
        .map((token) => {
          const sensorRange = token.sensorRange ?? 0;
          const projection = deriveSensorRingProjection(token);
          const center = hexToPixel(projection.displayPosition);
          const radius = sensorRange * HEX_SIZE * 1.5;
          const description = describeSensorRing(
            token,
            projection,
            sensorRange,
          );
          return (
            <circle
              key={`sensor-${token.unitId}`}
              data-testid={`sensor-ring-${token.unitId}`}
              role="img"
              aria-label={description}
              data-sensor-range-hexes={sensorRange}
              data-sensor-radius-px={radius}
              data-sensor-display-position={coordToKey(
                projection.displayPosition,
              )}
              data-sensor-source-position={coordToKey(token.position)}
              data-sensor-position-source={projection.positionSource}
              data-sensor-fog-status={projection.fogStatus}
              cx={center.x}
              cy={center.y}
              r={radius}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="8 6"
              opacity={0.45}
              pointerEvents="none"
            />
          );
        })}
    </g>
  );
}

/**
 * Per `add-scenario-objective-engine` (D6 / task 6): control-state
 * styling for objective markers. `contested` is the visually-distinct
 * style for a hex occupied by both sides; it is derived per-render
 * from token positions, never stored on the marker.
 */
const OBJECTIVE_MARKER_STYLES: Record<
  'neutral' | 'friendly' | 'enemy' | 'contested',
  { fill: string; stroke: string }
> = {
  neutral: { fill: '#94a3b8', stroke: '#475569' },
  friendly: { fill: '#22c55e', stroke: '#15803d' },
  enemy: { fill: '#ef4444', stroke: '#b91c1c' },
  contested: { fill: '#f59e0b', stroke: '#b45309' },
};

interface ObjectiveMarkersLayerProps {
  /** Objective markers keyed by canonical `"q,r"` hex key. */
  readonly objectives: Readonly<Record<string, IObjectiveMarker>>;
  /** Unit tokens — used to derive the per-render contested state. */
  readonly tokens: readonly IUnitToken[];
  /** The viewer's side; drives friendly vs. enemy styling. */
  readonly friendlySide: GameSide;
}

/**
 * Read-only SVG layer that renders every scenario objective marker.
 * Rendered above the terrain overlay and below unit tokens (D6). Each
 * marker is styled by `controlSide` (neutral / friendly / enemy) or by
 * the contested state when both sides occupy the hex. Capture markers
 * show `holdProgress` toward `holdTurnsRequired`.
 *
 * The layer NEVER mutates game state — it only reads markers + token
 * positions.
 *
 * @spec scenario-objectives — Objective Marker Rendering
 */
export function ObjectiveMarkersLayer({
  objectives,
  tokens,
  friendlySide,
}: ObjectiveMarkersLayerProps): React.ReactElement {
  const friendlyObjectiveSide = gameSideToObjectiveSide(friendlySide);

  return (
    <g data-testid="objective-markers-layer">
      {Object.values(objectives).map((marker) => {
        const coord = keyToCoord(marker.hexKey);
        const center = hexToPixel(coord);

        // Contested = both sides have at least one token on the hex.
        let hasFriendly = false;
        let hasEnemy = false;
        for (const token of tokens) {
          if (coordToKey(token.position) !== marker.hexKey) continue;
          if (token.side === friendlySide) hasFriendly = true;
          else hasEnemy = true;
        }
        const contested = hasFriendly && hasEnemy;

        const styleKey: 'neutral' | 'friendly' | 'enemy' | 'contested' =
          contested
            ? 'contested'
            : marker.controlSide === 'neutral'
              ? 'neutral'
              : marker.controlSide === friendlyObjectiveSide
                ? 'friendly'
                : 'enemy';
        const style = OBJECTIVE_MARKER_STYLES[styleKey];

        return (
          <g
            key={`objective-${marker.id}`}
            data-testid={`objective-marker-${marker.id}`}
            data-objective-type={marker.objectiveType}
            data-control-state={styleKey}
            pointerEvents="none"
          >
            <circle
              cx={center.x}
              cy={center.y}
              r={HEX_SIZE * 0.55}
              fill={style.fill}
              fillOpacity={0.35}
              stroke={style.stroke}
              strokeWidth={3}
            />
            <text
              x={center.x}
              y={center.y - HEX_SIZE * 0.1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={HEX_SIZE * 0.4}
              fontWeight="bold"
              fill={style.stroke}
            >
              {marker.objectiveType === 'breakthrough'
                ? '⮞'
                : marker.objectiveType === 'defend'
                  ? '⛨'
                  : '◎'}
            </text>
            {marker.objectiveType === 'capture' && (
              <text
                x={center.x}
                y={center.y + HEX_SIZE * 0.32}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={HEX_SIZE * 0.28}
                fontWeight="bold"
                fill={style.stroke}
                data-testid={`objective-progress-${marker.id}`}
              >
                {marker.holdProgress}/{marker.holdTurnsRequired}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

interface UnitTokensLayerProps {
  readonly orderedTokens: readonly IUnitToken[];
  readonly movementAnimationsByUnit: ReadonlyMap<string, MovementAnimation>;
  readonly events: readonly IGameEvent[];
  readonly tokens: readonly IUnitToken[];
  readonly onTokenClick: (unitId: string) => void;
  readonly onTokenDoubleClick: (unitId: string) => void;
  readonly isIsometricView: boolean;
  readonly isometricOcclusionUnitIds: ReadonlySet<string>;
  readonly combatProjectionValidTargetUnitIds?: ReadonlySet<string>;
  readonly isometricOcclusionInfoByUnit?: ReadonlyMap<
    string,
    { readonly reason: string }
  >;
  readonly isometricOcclusionInfosByUnit?: ReadonlyMap<
    string,
    readonly { readonly reason: string }[]
  >;
}

function deriveIsometricVisibilityRule(
  token: IUnitToken,
): 'hidden' | 'lastKnown' | undefined {
  if (token.fogStatus === 'hidden') return 'hidden';
  if (token.fogStatus === 'lastKnown') return 'lastKnown';
  return undefined;
}

function describeIsometricVisibilityRule(rule: 'hidden' | 'lastKnown'): string {
  return rule === 'hidden'
    ? 'Hidden contact is limited by fog or visibility rules'
    : 'Last known contact is limited to stale visibility information';
}

export function UnitTokensLayer({
  orderedTokens,
  movementAnimationsByUnit,
  events,
  tokens,
  onTokenClick,
  onTokenDoubleClick,
  isIsometricView,
  isometricOcclusionUnitIds,
  combatProjectionValidTargetUnitIds,
  isometricOcclusionInfoByUnit,
  isometricOcclusionInfosByUnit,
}: UnitTokensLayerProps): React.ReactElement {
  return (
    <g>
      {orderedTokens.map((token) => {
        const visibilityRule = isIsometricView
          ? deriveIsometricVisibilityRule(token)
          : undefined;
        const terrainOcclusionReason = isIsometricView
          ? formatIsometricTokenOcclusionReason(
              isometricOcclusionInfosByUnit?.get(token.unitId) ??
                maybeSingleOcclusionInfo(
                  isometricOcclusionInfoByUnit?.get(token.unitId),
                ),
            )
          : undefined;

        return (
          <UnitTokenForType
            key={token.unitId}
            token={token}
            movementAnimation={movementAnimationsByUnit.get(token.unitId)}
            onClick={onTokenClick}
            onDoubleClick={onTokenDoubleClick}
            events={events}
            allTokens={tokens}
            combatProjectionValidTarget={combatProjectionValidTargetUnitIds?.has(
              token.unitId,
            )}
            isOcclusionHighlighted={
              isIsometricView &&
              (token.isSelected || isometricOcclusionUnitIds.has(token.unitId))
            }
            isometricOcclusionReason={terrainOcclusionReason}
            isometricVisibilityRule={visibilityRule}
            isometricVisibilityRuleReason={
              visibilityRule
                ? describeIsometricVisibilityRule(visibilityRule)
                : undefined
            }
          />
        );
      })}
    </g>
  );
}

function formatIsometricTokenOcclusionReason(
  infos: readonly { readonly reason: string }[],
): string | undefined {
  if (infos.length === 0) return undefined;
  return infos.map((info) => info.reason).join('; ');
}

function maybeSingleOcclusionInfo(
  info: { readonly reason: string } | undefined,
): readonly { readonly reason: string }[] {
  return info ? [info] : [];
}

interface TerrainOverlayLayersProps {
  readonly interaction: MapInteractionState;
  readonly hexes: readonly IHexCoordinate[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly tacticalMapProjectionLookup?: ReadonlyMap<
    string,
    ITacticalMapHexProjection
  >;
}

export function TerrainOverlayLayers({
  interaction,
  hexes,
  terrainLookup,
  tacticalMapProjectionLookup,
}: TerrainOverlayLayersProps): React.ReactElement {
  return (
    <>
      {interaction.showMovementOverlay && (
        <g data-testid="movement-overlay">
          {hexes.map((hex) => {
            const key = coordToKey(hex);
            const terrain = terrainLookup.get(key);
            const projection = tacticalMapProjectionLookup?.get(key);
            return (
              <MovementCostOverlay
                key={`move-${key}`}
                hex={hex}
                terrain={terrain}
                movementInfo={projection?.movement}
                projectionExplanation={projection?.explanation}
              />
            );
          })}
        </g>
      )}

      {interaction.showCoverOverlay && (
        <g data-testid="cover-overlay">
          {hexes.map((hex) => {
            const key = coordToKey(hex);
            const terrain = terrainLookup.get(key);
            const projection = tacticalMapProjectionLookup?.get(key);
            return (
              <CoverOverlay
                key={`cover-${key}`}
                hex={hex}
                terrain={terrain}
                combatInfo={projection?.combat}
                projectionExplanation={projection?.explanation}
              />
            );
          })}
        </g>
      )}
    </>
  );
}
