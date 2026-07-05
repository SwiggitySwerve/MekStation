import React from 'react';

import { FACTION_COLORS } from './StarmapDisplay.model';

interface StarmapFactionLegendProps {
  readonly isOpen: boolean;
  readonly onToggle: (isOpen: boolean) => void;
}

interface StarmapZoomControlsProps {
  readonly zoom: number;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onResetView: () => void;
}

export function StarmapFactionLegend({
  isOpen,
  onToggle,
}: StarmapFactionLegendProps): React.ReactElement {
  return (
    <div className="absolute top-3 right-3 text-xs text-slate-200">
      {isOpen ? (
        <div className="rounded border border-slate-700/80 bg-slate-900/90 p-3 shadow-lg">
          <button
            type="button"
            onClick={() => onToggle(false)}
            className="mb-2 flex w-full items-center justify-between gap-4 font-semibold text-slate-100"
            data-testid="starmap-legend-toggle"
            aria-expanded="true"
          >
            <span>Factions</span>
            <span aria-hidden="true">x</span>
          </button>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(FACTION_COLORS).map(([faction, color]) => (
              <div key={faction} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{faction}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(true)}
          className="rounded border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-semibold text-slate-100 shadow-lg transition-colors hover:bg-slate-800"
          data-testid="starmap-legend-toggle"
          aria-expanded="false"
        >
          Legend
        </button>
      )}
    </div>
  );
}

export function StarmapZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
}: StarmapZoomControlsProps): React.ReactElement {
  return (
    <div
      className="absolute right-4 bottom-4 flex flex-col items-end gap-1"
      data-testid="zoom-controls"
    >
      <span
        className="rounded bg-slate-800/90 px-2 py-1 text-xs text-slate-100 shadow-lg"
        data-testid="starmap-detail-status"
      >
        Zoom {(zoom * 100).toFixed(0)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
        title="Zoom in"
        data-testid="zoom-in-btn"
      >
        +
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
        title="Zoom out"
        data-testid="zoom-out-btn"
      >
        -
      </button>
      <button
        type="button"
        onClick={onResetView}
        className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
        title="Reset view"
        data-testid="reset-view-btn"
      >
        O
      </button>
    </div>
  );
}
