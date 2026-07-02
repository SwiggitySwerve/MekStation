/**
 * Minimap - top-right panel showing the full tactical map, unit dots,
 * and the live camera viewport rectangle.
 *
 * Per spec (add-minimap-and-camera-controls / tactical-map-interface):
 * - Fixed 200x200 px, 12px top-right margin
 * - Opaque backdrop + subtle drop shadow
 * - Unit dots colored by side and sized by unitType
 * - Camera viewport = bordered rectangle, updates live
 * - Click centers camera; drag on the viewport rectangle pans
 * - Hover on a dot shows the unit name tooltip
 * - Does NOT zoom
 * - `role="region"` with `aria-label`
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { IHexCoordinate, IUnitToken } from '@/types/gameplay';

import {
  buildMinimapDots,
  MinimapDots,
  MinimapTerrainBackdrop,
  MinimapTooltip,
} from './MinimapDots';
import {
  MINIMAP_MARGIN,
  MINIMAP_SIZE,
  viewportRectOnMinimap,
  worldBoundsForRadius,
} from './minimapGeometry';
import { useMinimapInteractions } from './useMinimapInteractions';

export interface MinimapProps {
  /** Hex radius of the map (same value fed to HexMapDisplay). */
  readonly radius: number;
  /** Live list of unit tokens. */
  readonly tokens: readonly IUnitToken[];
  /**
   * Current main-camera state. Zoom and pan drive the viewport
   * rectangle. The world-bounding-box is derived from `radius` via
   * `worldBoundsForRadius`.
   */
  readonly camera: {
    readonly zoom: number;
    readonly pan: { readonly x: number; readonly y: number };
  };
  /**
   * Callback - minimap click converted to a world-space target. The
   * host translates this into a `centerOn(hexCoord)` call.
   */
  readonly onCenterAt: (worldPoint: { x: number; y: number }) => void;
  /**
   * Callback - drag delta in world-space units. The host converts
   * this to a pan on the main camera.
   */
  readonly onDragPan: (worldDelta: { x: number; y: number }) => void;
  /** Optional: is the minimap currently visible. Defaults true. */
  readonly visible?: boolean;
}

/**
 * Host panels shorter than this cannot show the 200px minimap (top-right)
 * AND the bottom-right camera/overlay control column without the two
 * translucently painting over each other (re-audit VD-07). Below it the
 * glanceable AMBIENT minimap yields to the interactive controls. jsdom
 * reports 0 heights, so 0 is treated as "unmeasured -> show".
 */
const MINIMAP_MIN_HOST_HEIGHT = 460;

export function Minimap({
  radius,
  tokens,
  camera,
  onCenterAt,
  onDragPan,
  visible = true,
}: MinimapProps): React.ReactElement | null {
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hostTooShort, setHostTooShort] = useState(false);
  const bounds = useMemo(() => worldBoundsForRadius(radius), [radius]);

  // Auto-yield on short map panels: watch the positioned host's height and
  // drop the minimap when both it and the control column cannot fit.
  useEffect(() => {
    const host = containerRef.current?.offsetParent;
    if (!(host instanceof HTMLElement)) return;
    const check = (): void => {
      const height = host.clientHeight;
      setHostTooShort(height > 0 && height < MINIMAP_MIN_HOST_HEIGHT);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(host);
    return () => observer.disconnect();
  }, [visible]);

  const viewportRect = useMemo(
    () =>
      viewportRectOnMinimap(
        {
          viewBox: bounds,
          zoom: camera.zoom,
          pan: camera.pan,
        },
        bounds,
        MINIMAP_SIZE,
      ),
    [bounds, camera.zoom, camera.pan],
  );

  const dots = useMemo(
    () => buildMinimapDots(tokens, bounds),
    [tokens, bounds],
  );

  const { svgRef, handleMouseDown, handleMouseMove, handleMouseUp } =
    useMinimapInteractions({
      bounds,
      viewportRect,
      onCenterAt,
      onDragPan,
    });

  const terrainBackdrop = useMemo(() => <MinimapTerrainBackdrop />, []);

  if (!visible) return null;

  return (
    <div
      // `invisible` (not unmount / display:none) when the host is too short:
      // the element stays in flow so the ResizeObserver keeps measuring and
      // restores the minimap the moment the panel grows tall enough.
      ref={containerRef}
      className={`absolute rounded-md bg-slate-900/85 shadow-lg ring-1 ring-slate-700/60 backdrop-blur-sm ${
        hostTooShort ? 'pointer-events-none invisible' : ''
      }`}
      style={{
        top: MINIMAP_MARGIN,
        right: MINIMAP_MARGIN,
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
      }}
      data-testid="minimap"
      data-minimap-yielded={hostTooShort ? 'true' : undefined}
      role="region"
      aria-hidden={hostTooShort ? 'true' : undefined}
      aria-label="Tactical map overview. Click or drag to pan the main camera."
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="block h-full w-full cursor-pointer touch-none select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="minimap-svg"
      >
        {terrainBackdrop}
        <MinimapDots dots={dots} onHoverUnit={setHoveredUnitId} />

        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(2, viewportRect.width)}
          height={Math.max(2, viewportRect.height)}
          fill="transparent"
          stroke="#fbbf24"
          strokeWidth={1.5}
          data-testid="minimap-viewport-rect"
          pointerEvents="none"
        />
      </svg>

      <MinimapTooltip dots={dots} hoveredUnitId={hoveredUnitId} />
    </div>
  );
}

export { worldBoundsForRadius } from './minimapGeometry';
export type { IHexCoordinate };
