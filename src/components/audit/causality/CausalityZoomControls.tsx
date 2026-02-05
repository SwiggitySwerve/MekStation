/**
 * CausalityZoomControls Component
 * Zoom and pan controls for the causality graph.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';

import { Button } from '@/components/ui/Button';

// =============================================================================
// Types
// =============================================================================

export interface CausalityZoomControlsProps {
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Handler for zoom in */
  onZoomIn: () => void;
  /** Handler for zoom out */
  onZoomOut: () => void;
  /** Handler for reset to default zoom */
  onReset: () => void;
  /** Handler for fit-to-screen */
  onFit: () => void;
  /** Minimum zoom level (default: 0.25) */
  minZoom?: number;
  /** Maximum zoom level (default: 2) */
  maxZoom?: number;
}

// =============================================================================
// Icons
// =============================================================================

const ZoomInIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"
    />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6"
    />
  </svg>
);

const ResetIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
    />
  </svg>
);

const FitIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
    />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function CausalityZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  minZoom = 0.25,
  maxZoom = 2,
}: CausalityZoomControlsProps): React.ReactElement {
  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className="bg-surface-base/90 border-border-theme-subtle flex items-center gap-1 rounded-lg border p-1.5 shadow-lg shadow-black/20 backdrop-blur-sm">
      {/* Zoom Out */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
        className="p-1.5"
      >
        <ZoomOutIcon />
      </Button>

      {/* Zoom Level Indicator */}
      <div className="text-text-theme-secondary bg-surface-raised/50 min-w-[52px] rounded px-2 py-1 text-center font-mono text-xs">
        {zoomPercent}%
      </div>

      {/* Zoom In */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
        className="p-1.5"
      >
        <ZoomInIcon />
      </Button>

      {/* Divider */}
      <div className="bg-border-theme-subtle mx-1 h-5 w-px" />

      {/* Reset Zoom */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        aria-label="Reset zoom to 100%"
        title="Reset zoom"
        className="p-1.5"
      >
        <ResetIcon />
      </Button>

      {/* Fit to Screen */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onFit}
        aria-label="Fit graph to screen"
        title="Fit to screen"
        className="p-1.5"
      >
        <FitIcon />
      </Button>
    </div>
  );
}

export default CausalityZoomControls;
