import React from 'react';

import type { MapInteractionState } from './useMapInteraction';

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
          onClick={() =>
            interaction.setProjectionMode((mode) =>
              mode === 'topDown' ? 'isometricPreview' : 'topDown',
            )
          }
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
            interaction.projectionMode === 'isometricPreview'
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-white text-slate-700 hover:bg-gray-100'
          }`}
          title="Toggle isometric preview"
          aria-pressed={interaction.projectionMode === 'isometricPreview'}
          data-testid="projection-toggle"
        >
          {interaction.projectionMode === 'topDown' ? 'ISO' : '2D'}
        </button>
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
          CVR
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
          LOS
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
          -
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
          0
        </button>
      </div>
    </div>
  );
}
