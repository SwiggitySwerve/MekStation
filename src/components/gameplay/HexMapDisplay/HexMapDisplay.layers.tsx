import React from 'react';

import type { useAnimationQueue } from '@/stores/useAnimationQueue';
import type {
  IGameEvent,
  IHexCoordinate,
  IHexTerrain,
  IUnitToken,
} from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

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
          const center = hexToPixel(
            token.fogStatus === 'lastKnown' && token.lastKnownPosition
              ? token.lastKnownPosition
              : token.position,
          );
          return (
            <circle
              key={`sensor-${token.unitId}`}
              data-testid={`sensor-ring-${token.unitId}`}
              cx={center.x}
              cy={center.y}
              r={sensorRange * HEX_SIZE * 1.5}
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
}

export function UnitTokensLayer({
  orderedTokens,
  movementAnimationsByUnit,
  events,
  tokens,
  onTokenClick,
  onTokenDoubleClick,
}: UnitTokensLayerProps): React.ReactElement {
  return (
    <g>
      {orderedTokens.map((token) => (
        <UnitTokenForType
          key={token.unitId}
          token={token}
          movementAnimation={movementAnimationsByUnit.get(token.unitId)}
          onClick={onTokenClick}
          onDoubleClick={onTokenDoubleClick}
          events={events}
          allTokens={tokens}
        />
      ))}
    </g>
  );
}

interface TerrainOverlayLayersProps {
  readonly interaction: MapInteractionState;
  readonly hexes: readonly IHexCoordinate[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
}

export function TerrainOverlayLayers({
  interaction,
  hexes,
  terrainLookup,
}: TerrainOverlayLayersProps): React.ReactElement {
  return (
    <>
      {interaction.showMovementOverlay && (
        <g data-testid="movement-overlay">
          {hexes.map((hex) => {
            const key = coordToKey(hex);
            const terrain = terrainLookup.get(key);
            return (
              <MovementCostOverlay
                key={`move-${key}`}
                hex={hex}
                terrain={terrain}
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
            return (
              <CoverOverlay key={`cover-${key}`} hex={hex} terrain={terrain} />
            );
          })}
        </g>
      )}
    </>
  );
}

interface MapHtmlOverlaysProps {
  readonly hoverUnreachable: boolean;
  readonly mpLegend?: {
    readonly active: 'walk' | 'run' | 'jump';
    readonly jumpAvailable: boolean;
  };
}

export function MapHtmlOverlays({
  hoverUnreachable,
  mpLegend,
}: MapHtmlOverlaysProps): React.ReactElement {
  return (
    <>
      {hoverUnreachable && (
        <div
          className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded bg-slate-900/90 px-2 py-1 text-xs font-medium text-slate-100 shadow"
          data-testid="hex-unreachable-tooltip"
          role="tooltip"
        >
          Unreachable
        </div>
      )}

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
