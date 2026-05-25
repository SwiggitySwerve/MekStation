import React from 'react';

import type { MapLayerId } from '@/types/gameplay';

import type { MapInteractionState } from './useMapInteraction';

import { isIsometricProjection } from './projection';

interface MapControlsProps {
  readonly interaction: MapInteractionState;
}

interface ControlIconProps {
  readonly children: React.ReactNode;
}

function ControlIcon({ children }: ControlIconProps): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function IsometricIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 3 21 8 12 13 3 8 12 3Z" />
      <path d="M21 8v7l-9 6-9-6V8" />
      <path d="M12 13v8" />
    </ControlIcon>
  );
}

function TopDownIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" />
      <path d="M8 8.5h8" />
      <path d="M8 12h8" />
      <path d="M8 15.5h8" />
    </ControlIcon>
  );
}

function RotateLeftIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M9 7H4V2" />
      <path d="M4.6 7.8A8 8 0 1 1 6 18.5" />
    </ControlIcon>
  );
}

function RotateRightIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M15 7h5V2" />
      <path d="M19.4 7.8A8 8 0 1 0 18 18.5" />
    </ControlIcon>
  );
}

function MovementIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M5 17 9 7l4 10 2-5 4 5" />
      <circle cx={9} cy={7} r={2} />
      <circle cx={19} cy={17} r={2} />
    </ControlIcon>
  );
}

function CoverIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 3 19 6v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6l7-3Z" />
      <path d="M9 12h6" />
    </ControlIcon>
  );
}

function FiringArcIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M12 18V6" />
      <path d="M6 18a6 6 0 0 1 12 0" />
      <path d="M8 10 12 6l4 4" />
    </ControlIcon>
  );
}

function LosIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M4 12h16" />
      <path d="M7 9 4 12l3 3" />
      <path d="M17 9l3 3-3 3" />
      <circle cx={12} cy={12} r={2} />
    </ControlIcon>
  );
}

function ZoomInIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <circle cx={10.5} cy={10.5} r={5.5} />
      <path d="M10.5 8v5" />
      <path d="M8 10.5h5" />
      <path d="M15 15l5 5" />
    </ControlIcon>
  );
}

function ZoomOutIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <circle cx={10.5} cy={10.5} r={5.5} />
      <path d="M8 10.5h5" />
      <path d="M15 15l5 5" />
    </ControlIcon>
  );
}

function ResetViewIcon(): React.ReactElement {
  return (
    <ControlIcon>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v6h6" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </ControlIcon>
  );
}

function formatIsometricRotationDegrees(rotationStep: number): number {
  return rotationStep * 60;
}

type OverlayToggleProjectionChannel =
  | 'movement'
  | 'cover'
  | 'firing-arc'
  | 'line-of-sight';

type OverlayToggleRulesSurface =
  | 'movement-cost'
  | 'cover-level'
  | 'firing-arc'
  | 'line-of-sight';

function layerToggleProjectionAttributes(
  interaction: MapInteractionState,
  id: MapLayerId,
  projectionChannel: OverlayToggleProjectionChannel,
  rulesSurface: OverlayToggleRulesSurface,
): {
  readonly 'data-map-layer-id': MapLayerId;
  readonly 'data-map-layer-visible': 'true' | 'false';
  readonly 'data-map-layer-locked': 'true' | 'false';
  readonly 'data-map-layer-intensity': number;
  readonly 'data-map-layer-projection-source': 'shared-tactical-map-projection';
  readonly 'data-map-layer-projection-channel': OverlayToggleProjectionChannel;
  readonly 'data-map-layer-rules-surface': OverlayToggleRulesSurface;
} {
  const layer = interaction.layerState[id];
  return {
    'data-map-layer-id': layer.id,
    'data-map-layer-visible': layer.visible ? 'true' : 'false',
    'data-map-layer-locked': layer.locked ? 'true' : 'false',
    'data-map-layer-intensity': layer.intensity,
    'data-map-layer-projection-source': 'shared-tactical-map-projection',
    'data-map-layer-projection-channel': projectionChannel,
    'data-map-layer-rules-surface': rulesSurface,
  };
}

function formatLayerToggleLabel(
  actionLabel: string,
  visible: boolean,
  projectionChannel: OverlayToggleProjectionChannel,
  rulesSurface: OverlayToggleRulesSurface,
): string {
  return [
    actionLabel,
    visible ? 'visible' : 'hidden',
    `projection channel ${projectionChannel}`,
    `rules surface ${rulesSurface}`,
  ].join('; ');
}

export function MapControls({
  interaction,
}: MapControlsProps): React.ReactElement {
  const isIsometric = isIsometricProjection(interaction.projectionMode);
  const isometricRotationDegrees = formatIsometricRotationDegrees(
    interaction.isometricRotationStep,
  );

  return (
    <div
      className="absolute right-4 bottom-4 flex gap-2"
      data-testid="zoom-controls"
    >
      <div className="flex flex-col gap-1" data-testid="overlay-toggles">
        <button
          type="button"
          onClick={() =>
            interaction.setProjectionMode((mode) =>
              mode === 'topDown' ? 'isometric2d' : 'topDown',
            )
          }
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            isIsometric
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle isometric 2.5D view"
          aria-label={
            interaction.projectionMode === 'topDown'
              ? 'Switch to isometric view'
              : 'Switch to top-down view'
          }
          aria-pressed={isIsometric}
          data-testid="projection-toggle"
        >
          {interaction.projectionMode === 'topDown' ? (
            <IsometricIcon />
          ) : (
            <TopDownIcon />
          )}
        </button>
        {isIsometric && (
          <div
            className="flex items-center gap-1"
            data-testid="isometric-rotation-controls"
          >
            <div
              className="pointer-events-none rounded bg-slate-950/85 px-2 py-1 text-[10px] font-semibold text-slate-100 shadow"
              aria-label={`Isometric camera heading ${isometricRotationDegrees} degrees`}
              data-testid="isometric-rotation-heading"
              data-isometric-rotation-step={interaction.isometricRotationStep}
              data-isometric-rotation-degrees={isometricRotationDegrees}
            >
              View {isometricRotationDegrees} deg
            </div>
            <button
              type="button"
              onClick={interaction.rotateIsometricLeft}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 text-xs font-medium text-slate-700 shadow hover:bg-gray-100"
              title="Rotate isometric camera left"
              aria-label="Rotate isometric camera left"
              data-testid="projection-rotate-left"
            >
              <RotateLeftIcon />
            </button>
            <button
              type="button"
              onClick={interaction.rotateIsometricRight}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 text-xs font-medium text-slate-700 shadow hover:bg-gray-100"
              title="Rotate isometric camera right"
              aria-label="Rotate isometric camera right"
              data-testid="projection-rotate-right"
            >
              <RotateRightIcon />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => interaction.setShowMovementOverlay((v) => !v)}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            interaction.showMovementOverlay
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle movement cost overlay"
          aria-label={formatLayerToggleLabel(
            'Toggle movement cost overlay',
            interaction.showMovementOverlay,
            'movement',
            'movement-cost',
          )}
          aria-pressed={interaction.showMovementOverlay}
          data-testid="overlay-toggle-movement"
          {...layerToggleProjectionAttributes(
            interaction,
            'movement',
            'movement',
            'movement-cost',
          )}
        >
          <MovementIcon />
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
          aria-label={formatLayerToggleLabel(
            'Toggle cover level overlay',
            interaction.showCoverOverlay,
            'cover',
            'cover-level',
          )}
          aria-pressed={interaction.showCoverOverlay}
          data-testid="overlay-toggle-cover"
          {...layerToggleProjectionAttributes(
            interaction,
            'cover',
            'cover',
            'cover-level',
          )}
        >
          <CoverIcon />
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
          aria-label={formatLayerToggleLabel(
            'Toggle firing arc overlay',
            interaction.showFiringArcOverlay,
            'firing-arc',
            'firing-arc',
          )}
          aria-pressed={interaction.showFiringArcOverlay}
          data-testid="overlay-toggle-arcs"
          {...layerToggleProjectionAttributes(
            interaction,
            'firingArcs',
            'firing-arc',
            'firing-arc',
          )}
        >
          <FiringArcIcon />
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
          aria-label={formatLayerToggleLabel(
            'Toggle line-of-sight overlay',
            interaction.showLOSOverlay,
            'line-of-sight',
            'line-of-sight',
          )}
          aria-pressed={interaction.showLOSOverlay}
          data-testid="overlay-toggle-los"
          {...layerToggleProjectionAttributes(
            interaction,
            'los',
            'line-of-sight',
            'line-of-sight',
          )}
        >
          <LosIcon />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => interaction.setZoom((z) => Math.min(3, z * 1.2))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
          title="Zoom in"
          aria-label="Zoom in"
          data-testid="zoom-in-btn"
        >
          <ZoomInIcon />
        </button>
        <button
          type="button"
          onClick={() => interaction.setZoom((z) => Math.max(0.5, z / 1.2))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
          title="Zoom out"
          aria-label="Zoom out"
          data-testid="zoom-out-btn"
        >
          <ZoomOutIcon />
        </button>
        <button
          type="button"
          onClick={() => {
            interaction.setZoom(1);
            interaction.setPan({ x: 0, y: 0 });
            interaction.setIsometricRotationStep(0);
          }}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
          title="Reset view"
          aria-label="Reset map view"
          data-testid="reset-view-btn"
        >
          <ResetViewIcon />
        </button>
      </div>
    </div>
  );
}
