import React from 'react';

import type { useAnimationQueue } from '@/stores/useAnimationQueue';
import type {
  IGameEvent,
  IHexCoordinate,
  IHexTerrain,
  IUnitToken,
} from '@/types/gameplay';

import { UnitTokenForType } from '@/components/gameplay/UnitToken/UnitTokenForType';
import { HEX_SIZE } from '@/constants/hexMap';
import { coordToKey } from '@/utils/gameplay/hexMath';

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

interface MapControlsProps {
  readonly interaction: MapInteractionState;
}

export function MapControls({
  interaction,
}: MapControlsProps): React.ReactElement {
  return (
    <div
      className="absolute right-4 bottom-4 flex gap-2"
      data-testid="zoom-controls"
    >
      <div className="flex flex-col gap-1" data-testid="overlay-toggles">
        <button
          type="button"
          onClick={() => interaction.setShowMovementOverlay((v) => !v)}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            interaction.showMovementOverlay
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle movement cost overlay"
          data-testid="overlay-toggle-movement"
        >
          MP
        </button>
        <button
          type="button"
          onClick={() => interaction.setShowCoverOverlay((v) => !v)}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            interaction.showCoverOverlay
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle cover level overlay"
          data-testid="overlay-toggle-cover"
        >
          🛡
        </button>
        <button
          type="button"
          onClick={() => interaction.setShowFiringArcOverlay((v) => !v)}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            interaction.showFiringArcOverlay
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle firing arc overlay"
          data-testid="overlay-toggle-arcs"
        >
          ARC
        </button>
        <button
          type="button"
          onClick={() => interaction.setShowLOSOverlay((v) => !v)}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            interaction.showLOSOverlay
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle LOS overlay"
          data-testid="overlay-toggle-los"
        >
          👁
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => interaction.setZoom((z) => Math.min(3, z * 1.2))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
          title="Zoom in"
          data-testid="zoom-in-btn"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => interaction.setZoom((z) => Math.max(0.5, z / 1.2))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
          title="Zoom out"
          data-testid="zoom-out-btn"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            interaction.setZoom(1);
            interaction.setPan({ x: 0, y: 0 });
          }}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
          title="Reset view"
          data-testid="reset-view-btn"
        >
          ⟳
        </button>
      </div>
    </div>
  );
}
