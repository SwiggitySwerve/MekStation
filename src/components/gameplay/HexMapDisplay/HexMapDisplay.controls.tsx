import React from 'react';

import type { MapLayerId, MapProjectionMode } from '@/types/gameplay';

import type { MapInteractionState } from './useMapInteraction';

import {
  CoverIcon,
  FiringArcIcon,
  IsometricIcon,
  LosIcon,
  MovementIcon,
  ResetViewIcon,
  RotateLeftIcon,
  RotateRightIcon,
  TopDownIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './HexMapDisplay.controlIcons';
import {
  formatIsometricCameraControlLabel,
  formatIsometricRotationDegrees,
  formatProjectionModeControlLabel,
  isometricCameraControlAttributes,
  projectionModeControlAttributes,
} from './HexMapDisplay.projectionControls';
import { isIsometricProjection } from './projection';

interface MapControlsProps {
  readonly interaction: MapInteractionState;
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
  const targetProjectionMode: MapProjectionMode = isIsometric
    ? 'topDown'
    : 'isometric2d';

  return (
    <div
      // z-10: the minimap overlay (200x200, top-right) renders AFTER this
      // cluster in the DOM (HexMapDisplay renders overlayChildren last), so
      // in short map panels (e.g. 1280x720) its translucent container used
      // to paint over — and intercept pointer events for — the top of this
      // column, making zoom-in unclickable (e2e triage RC12). Interactive
      // buttons must stack above the glanceable overlay where they collide.
      className="absolute right-4 bottom-4 z-10 flex gap-2"
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
          aria-label={formatProjectionModeControlLabel(
            interaction.projectionMode,
            targetProjectionMode,
          )}
          aria-pressed={isIsometric}
          data-testid="projection-toggle"
          {...projectionModeControlAttributes({
            currentMode: interaction.projectionMode,
            targetMode: targetProjectionMode,
            rotationStep: interaction.isometricRotationStep,
          })}
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
              aria-label={formatIsometricCameraControlLabel(
                'left',
                interaction.isometricRotationStep,
              )}
              data-testid="projection-rotate-left"
              {...isometricCameraControlAttributes(
                interaction.isometricRotationStep,
                'left',
              )}
            >
              <RotateLeftIcon />
            </button>
            <button
              type="button"
              onClick={interaction.rotateIsometricRight}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 text-xs font-medium text-slate-700 shadow hover:bg-gray-100"
              title="Rotate isometric camera right"
              aria-label={formatIsometricCameraControlLabel(
                'right',
                interaction.isometricRotationStep,
              )}
              data-testid="projection-rotate-right"
              {...isometricCameraControlAttributes(
                interaction.isometricRotationStep,
                'right',
              )}
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
