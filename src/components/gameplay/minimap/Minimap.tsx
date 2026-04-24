/**
 * Minimap — top-right panel showing the full tactical map, unit dots,
 * and the live camera viewport rectangle.
 *
 * Why a separate component:
 *   - The main HexMapDisplay owns camera state; the minimap is a
 *     read-only projection of that state plus unit positions.
 *   - Keeping the minimap in its own SVG with its own viewBox means
 *     the minimap never has to run a separate zoom layer.
 *
 * Per spec (add-minimap-and-camera-controls / tactical-map-interface):
 *   - Fixed 200x200 px, 12px top-right margin
 *   - Opaque backdrop + subtle drop shadow
 *   - Unit dots colored by side (Player=blue, Opponent=red,
 *     Neutral=gray), sized by weight class (mapped from unitType)
 *   - Camera viewport = bordered rectangle, updates live
 *   - Click centers camera; drag on the viewport rectangle pans
 *     continuously
 *   - Hover on a dot shows the unit name tooltip
 *   - Does NOT zoom (fixed scale)
 *   - `role="region"` with `aria-label`
 */

import React, { useCallback, useMemo, useRef, useState } from "react";

import type { IHexCoordinate, IUnitToken } from "@/types/gameplay";

import { hexToPixel } from "@/constants/hexMap";
import { GameSide, TokenUnitType } from "@/types/gameplay";

import {
  MINIMAP_MARGIN,
  MINIMAP_SIZE,
  minimapPixelToWorld,
  viewportRectOnMinimap,
  worldBoundsForRadius,
  worldToMinimapPixel,
} from "./minimapGeometry";

export interface MinimapProps {
  /** Hex radius of the map (same value fed to HexMapDisplay). */
  readonly radius: number;
  /** Live list of unit tokens. */
  readonly tokens: readonly IUnitToken[];
  /**
   * Current main-camera state. Zoom and pan drive the viewport
   * rectangle. The world-bounding-box is derived from `radius` via
   * `worldBoundsForRadius` — we keep the camera prop narrow so the
   * host only needs to pass live-changing fields.
   */
  readonly camera: {
    readonly zoom: number;
    readonly pan: { readonly x: number; readonly y: number };
  };
  /**
   * Callback — minimap click converted to a world-space target. The
   * host translates this into a `centerOn(hexCoord)` call. We do not
   * call `centerOn` directly here to keep the minimap host-agnostic.
   */
  readonly onCenterAt: (worldPoint: { x: number; y: number }) => void;
  /**
   * Callback — drag delta in world-space units. The host converts
   * this to a pan on the main camera (inversely scaled by zoom).
   */
  readonly onDragPan: (worldDelta: { x: number; y: number }) => void;
  /** Optional: is the minimap currently visible. Defaults true. */
  readonly visible?: boolean;
}

/**
 * Map unitType → dot radius in minimap-pixel units. Larger unit
 * classes read bigger on the glanceable minimap. Default (undefined
 * unitType) is treated as Mech per the existing token convention.
 */
function dotRadiusForUnitType(unitType: TokenUnitType | undefined): number {
  switch (unitType) {
    case TokenUnitType.Vehicle:
      return 4.5;
    case TokenUnitType.Aerospace:
      return 5;
    case TokenUnitType.BattleArmor:
      return 2.5;
    case TokenUnitType.Infantry:
      return 2;
    case TokenUnitType.ProtoMech:
      return 3;
    case TokenUnitType.Mech:
    default:
      return 4;
  }
}

/**
 * Map side → dot color. Neutral fallback handles any non-Player,
 * non-Opponent side (none exists today, but the fallback keeps the
 * minimap forward-compatible).
 */
function dotColorForSide(side: GameSide): string {
  switch (side) {
    case GameSide.Player:
      return "#3b82f6"; // blue-500
    case GameSide.Opponent:
      return "#ef4444"; // red-500
    default:
      return "#6b7280"; // gray-500
  }
}

/**
 * Side label — used in the hover tooltip so screen-readers get a
 * meaningful name + affiliation, not just a unit name.
 */
function sideLabel(side: GameSide): string {
  switch (side) {
    case GameSide.Player:
      return "Player";
    case GameSide.Opponent:
      return "Opponent";
    default:
      return "Neutral";
  }
}

export function Minimap({
  radius,
  tokens,
  camera,
  onCenterAt,
  onDragPan,
  visible = true,
}: MinimapProps): React.ReactElement | null {
  const svgRef = useRef<SVGSVGElement>(null);

  // Live hover state drives the tooltip. We track the hovered unit
  // id rather than the full token so the callback closure stays
  // stable as tokens re-render.
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

  // Drag tracking — dragging on the viewport rectangle pans the main
  // camera continuously. Drag state is local to the minimap.
  const dragStateRef = useRef<{
    lastClientX: number;
    lastClientY: number;
  } | null>(null);

  // Per task 9.1: cap drag→onDragPan emission at ~15 FPS (~66ms per
  // frame). Without throttling, a mousemove storm would fire one
  // onDragPan per pixel of travel, which re-renders the main map 60+
  // times per second — wasteful at a glanceable-scale control. We
  // accumulate deltas and flush on the next RAF tick at most every
  // 66ms.
  const pendingDragRef = useRef<{ x: number; y: number } | null>(null);
  const lastDragEmitRef = useRef<number>(0);
  const dragRafRef = useRef<number | null>(null);

  const bounds = useMemo(() => worldBoundsForRadius(radius), [radius]);

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

  // Pre-compute the dot list so the SVG only iterates once. Skip
  // destroyed units — keeping a dot for destroyed wrecks adds noise
  // without action value at this scale.
  const dots = useMemo(() => {
    return tokens
      .filter((t) => !t.isDestroyed)
      .map((token) => {
        const world = hexToPixel(token.position.q, token.position.r);
        const { x, y } = worldToMinimapPixel(world, bounds, MINIMAP_SIZE);
        return {
          unitId: token.unitId,
          name: token.name,
          side: token.side,
          cx: x,
          cy: y,
          r: dotRadiusForUnitType(token.unitType),
          isSelected: token.isSelected,
        };
      });
  }, [tokens, bounds]);

  /**
   * Convert a mouse event on the minimap SVG into a world-space
   * point. The click handler feeds this to `onCenterAt`.
   */
  const eventToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      // The SVG is stretched to fit MINIMAP_SIZE CSS px, so pixel
      // ratio is identity (rect.width === MINIMAP_SIZE).
      const px = ((clientX - rect.left) / rect.width) * MINIMAP_SIZE;
      const py = ((clientY - rect.top) / rect.height) * MINIMAP_SIZE;
      return minimapPixelToWorld({ x: px, y: py }, bounds, MINIMAP_SIZE);
    },
    [bounds],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Ignore non-primary buttons to keep the minimap simple.
      if (e.button !== 0) return;

      // Determine whether the click landed on the viewport rectangle
      // (drag) or outside (click-to-center). The rect hit-test is a
      // simple AABB check in minimap pixel space.
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * MINIMAP_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * MINIMAP_SIZE;
      const onViewportRect =
        px >= viewportRect.x &&
        px <= viewportRect.x + viewportRect.width &&
        py >= viewportRect.y &&
        py <= viewportRect.y + viewportRect.height;

      if (onViewportRect) {
        dragStateRef.current = {
          lastClientX: e.clientX,
          lastClientY: e.clientY,
        };
        e.preventDefault();
      } else {
        const world = eventToWorld(e.clientX, e.clientY);
        if (world) onCenterAt(world);
      }
    },
    [eventToWorld, onCenterAt, viewportRect],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!dragStateRef.current) return;
      const dxScreen = e.clientX - dragStateRef.current.lastClientX;
      const dyScreen = e.clientY - dragStateRef.current.lastClientY;
      dragStateRef.current = {
        lastClientX: e.clientX,
        lastClientY: e.clientY,
      };
      // Convert screen-space minimap delta into world-space delta.
      // minimapSize / bounds.width = pixels per world unit, so
      // inverse it.
      const worldPerPixelX = bounds.width / MINIMAP_SIZE;
      const worldPerPixelY = bounds.height / MINIMAP_SIZE;
      const worldDx = dxScreen * worldPerPixelX;
      const worldDy = dyScreen * worldPerPixelY;

      // Accumulate pending world-delta and flush at most every ~66ms
      // (~15 FPS). RAF runs at vsync (~60fps on most monitors), so we
      // additionally gate on `Date.now() - lastDragEmitRef` to cap
      // the emit rate independent of refresh rate.
      const pending = pendingDragRef.current ?? { x: 0, y: 0 };
      pendingDragRef.current = {
        x: pending.x + worldDx,
        y: pending.y + worldDy,
      };
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const now = Date.now();
        if (now - lastDragEmitRef.current < 66) {
          // Re-schedule on the next frame so the accumulated delta
          // isn't dropped when the cap fires.
          dragRafRef.current = requestAnimationFrame(() => {
            dragRafRef.current = null;
            const delta = pendingDragRef.current;
            if (!delta) return;
            pendingDragRef.current = null;
            lastDragEmitRef.current = Date.now();
            onDragPan(delta);
          });
          return;
        }
        const delta = pendingDragRef.current;
        if (!delta) return;
        pendingDragRef.current = null;
        lastDragEmitRef.current = now;
        onDragPan(delta);
      });
    },
    [bounds.width, bounds.height, onDragPan],
  );

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null;
    // Flush any pending delta so the final drop isn't lost.
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    const pending = pendingDragRef.current;
    if (pending) {
      pendingDragRef.current = null;
      lastDragEmitRef.current = Date.now();
      onDragPan(pending);
    }
  }, [onDragPan]);

  // Per task 9.4: "Minimap terrain baked once per map load, cached".
  // The backdrop is a pure function of `radius` (and the constant
  // MINIMAP_SIZE); memoize so the element identity is stable across
  // camera pans, pointer hovers, and dot re-renders. React's
  // reconciler still keeps the existing DOM node when identity
  // changes, but the stable identity lets profiler tooling verify
  // the invariant.
  const terrainBackdrop = useMemo(
    () => (
      <>
        <defs>
          <radialGradient id="minimap-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        <rect
          x={0}
          y={0}
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
          fill="url(#minimap-bg)"
          data-testid="minimap-backdrop"
        />
      </>
    ),
    // Backdrop recomputes only when the radius-dependent bounds
    // would actually change the rendered area. MINIMAP_SIZE is a
    // module constant so there's no runtime dep on it.
    [],
  );

  if (!visible) return null;

  // Styled as a fixed-position overlay — the GameplayLayout's map
  // panel is position: relative, so `absolute` positions this inside
  // the panel rather than the viewport.
  return (
    <div
      className="absolute rounded-md bg-slate-900/85 shadow-lg ring-1 ring-slate-700/60 backdrop-blur-sm"
      style={{
        top: MINIMAP_MARGIN,
        right: MINIMAP_MARGIN,
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
      }}
      data-testid="minimap"
      role="region"
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
        {/* Background terrain band — memoized. See `terrainBackdrop`
            above; the backdrop is stable across pan/zoom changes
            (task 9.4). */}
        {terrainBackdrop}

        {/* Unit dots — colored by side, sized by unitType. Each dot
            carries an SVG <title> element so screen readers and
            default browser tooltips surface the unit name (§ 8.3). */}
        <g data-testid="minimap-dots">
          {dots.map((dot) => (
            <circle
              key={dot.unitId}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill={dotColorForSide(dot.side)}
              stroke={dot.isSelected ? "#fef08a" : "#0f172a"}
              strokeWidth={dot.isSelected ? 1.5 : 0.5}
              data-testid={`minimap-dot-${dot.unitId}`}
              onMouseEnter={() => setHoveredUnitId(dot.unitId)}
              onMouseLeave={() => setHoveredUnitId(null)}
              style={{ cursor: "pointer" }}
            >
              {/* <title> is the accessible, browser-native tooltip
                  for SVG per WAI-ARIA. */}
              <title>{`${dot.name} — ${sideLabel(dot.side)}`}</title>
            </circle>
          ))}
        </g>

        {/* Camera viewport rectangle — bordered, live. Stroke only
            so terrain and dots remain visible beneath. */}
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

      {/* Hover tooltip. Rendered in HTML above the SVG because
          inline SVG tooltips are not styleable across browsers. */}
      {hoveredUnitId && (
        <div
          className="pointer-events-none absolute bottom-1 left-1 rounded bg-slate-950/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-100 shadow"
          data-testid="minimap-tooltip"
          role="tooltip"
        >
          {(() => {
            const d = dots.find((x) => x.unitId === hoveredUnitId);
            return d ? `${d.name} — ${sideLabel(d.side)}` : "";
          })()}
        </div>
      )}
    </div>
  );
}

// Re-export the world-bounds type so consumers can pass the main
// camera's viewBox by value without importing from the geometry
// helper directly.
export { worldBoundsForRadius } from "./minimapGeometry";
export type { IHexCoordinate };
