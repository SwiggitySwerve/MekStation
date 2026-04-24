/**
 * Map Interaction Hook
 *
 * Encapsulates pan, zoom, and touch gesture state for the hex map SVG.
 * Originally extracted from HexMapDisplay.tsx for modularity; extended
 * by `add-minimap-and-camera-controls` to expose explicit `panBy`,
 * `zoomTo(scale, cursorPoint)`, and `centerOn(hexCoord)` actions so the
 * minimap, the keyboard hotkey layer, and the unit-focus double-click
 * can drive the camera through a single, testable surface.
 *
 * Why a hook and not a store:
 *   - Pan/zoom state is tightly scoped to the map subtree — hoisting
 *     to Zustand would trigger whole-tree re-renders on every scroll.
 *   - The minimap consumes the same `useCameraControls` facade the
 *     keyboard layer uses (see `src/hooks/useCameraControls.ts`), so
 *     tests and components share a single contract.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

import type { IHexCoordinate } from "@/types/gameplay";

import {
  HEX_SIZE,
  HEX_WIDTH,
  HEX_HEIGHT,
  hexToPixel,
} from "@/constants/hexMap";

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Zoom bounds — per `add-minimap-and-camera-controls` task 1.3. The
 * previous Phase-1 hook clamped to [0.5, 3]; the new spec tightens
 * that so the camera never zooms out so far the minimap becomes
 * redundant nor so far in that a single hex fills the screen.
 */
export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 2.0;

/**
 * Per task 7.2: double-click focus on a low-zoom camera (< 0.6) bumps
 * zoom to 0.8 before centering, so the focused unit is legible after
 * the camera lands.
 */
export const FOCUS_MIN_ZOOM = 0.6;
export const FOCUS_BUMP_ZOOM = 0.8;

/**
 * Per task 7.3 / spec "center animation eases over 200ms". Used by
 * `centerOn` to interpolate pan when the user has not requested
 * reduced motion.
 */
export const CENTER_EASE_MS = 200;

/**
 * Clamp helper — used both for zoom and (indirectly, via
 * `clampPanToMap`) for pan. Keeping this inline avoids pulling in a
 * math utility for a two-line function.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Pure camera-state reducer used by `useCameraControls` unit tests.
 * Exposed so tests can assert on the math without rendering the SVG.
 *
 * Given the current viewBox (in world units), zoom, and pan (in
 * screen pixels), compute the world-space origin the SVG `viewBox`
 * attribute will report. The main map uses this same math via
 * `transformedViewBox` below.
 */
export interface ICameraState {
  readonly viewBox: ViewBox;
  readonly zoom: number;
  readonly pan: { x: number; y: number };
}

/**
 * Compute the screen-space location of the SVG's logical origin
 * given a camera state. Helper for `zoomTo` cursor-anchoring math.
 */
export function worldToScreen(
  world: { x: number; y: number },
  camera: ICameraState,
  viewportSize: { width: number; height: number },
): { x: number; y: number } {
  const scale = 1 / camera.zoom;
  const renderedWidth = camera.viewBox.width * scale;
  const renderedHeight = camera.viewBox.height * scale;
  const originX =
    camera.viewBox.x -
    camera.pan.x * scale +
    (camera.viewBox.width - renderedWidth) / 2;
  const originY =
    camera.viewBox.y -
    camera.pan.y * scale +
    (camera.viewBox.height - renderedHeight) / 2;
  const sx = ((world.x - originX) / renderedWidth) * viewportSize.width;
  const sy = ((world.y - originY) / renderedHeight) * viewportSize.height;
  return { x: sx, y: sy };
}

export interface MapInteractionState {
  svgRef: React.RefObject<SVGSVGElement | null>;
  transformedViewBox: string;
  viewBox: ViewBox;
  zoom: number;
  pan: { x: number; y: number };
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  showMovementOverlay: boolean;
  setShowMovementOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showCoverOverlay: boolean;
  setShowCoverOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showLOSOverlay: boolean;
  setShowLOSOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Pan the camera by the given screen-space delta (pixels). Used by
   * the keyboard layer (WASD/arrows) and by the minimap drag handler.
   * The camera is clamped so the map's bounds stay within the
   * viewport.
   */
  panBy: (dx: number, dy: number) => void;
  /**
   * Set zoom to an absolute scale, anchoring the world point that was
   * previously under `cursorPoint` (in screen coordinates relative to
   * the SVG) to the same screen location after the zoom. If no
   * cursorPoint is provided, zoom in place (center anchoring).
   */
  zoomTo: (nextZoom: number, cursorPoint?: { x: number; y: number }) => void;
  /**
   * Center the camera on a hex coordinate. Eases over 200ms unless
   * the user requests reduced motion (or `animate: false` is passed).
   * If current zoom is below FOCUS_MIN_ZOOM, zoom is bumped to
   * FOCUS_BUMP_ZOOM first.
   */
  centerOn: (
    hex: IHexCoordinate,
    opts?: { animate?: boolean; bumpLowZoom?: boolean },
  ) => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

/**
 * Hook — owns camera state for the hex map. `radius` is the map
 * radius in hexes; the world-space viewBox is derived from it.
 */
export function useMapInteraction(radius: number): MapInteractionState {
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{
    dist: number;
    zoom: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [showMovementOverlay, setShowMovementOverlay] = useState(false);
  const [showCoverOverlay, setShowCoverOverlay] = useState(false);
  const [showLOSOverlay, setShowLOSOverlay] = useState(false);

  // Track mid-flight ease animations so a new centerOn call can
  // cancel the previous one cleanly.
  const easeRafRef = useRef<number | null>(null);

  useEffect(() => {
    const padding = HEX_SIZE * 2;
    const minX = -radius * HEX_WIDTH * 0.75 - padding;
    const maxX = radius * HEX_WIDTH * 0.75 + padding;
    const minY = -radius * HEX_HEIGHT - padding;
    const maxY = radius * HEX_HEIGHT + padding;
    setViewBox({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }, [radius]);

  /**
   * Per spec "Pan clamps to map bounds": after any pan we limit the
   * `pan` vector so the SVG's transformed viewBox never wanders
   * entirely off the map. The clamp range scales with zoom because a
   * zoomed-in viewport "moves" faster in world units per pixel.
   */
  const clampPan = useCallback(
    (
      next: { x: number; y: number },
      currentZoom: number,
    ): { x: number; y: number } => {
      // Half-extent of the map in screen pixels at the current zoom.
      // Any pan beyond this would scroll empty space into view.
      const halfWidth = (viewBox.width * currentZoom) / 2;
      const halfHeight = (viewBox.height * currentZoom) / 2;
      return {
        x: clamp(next.x, -halfWidth, halfWidth),
        y: clamp(next.y, -halfHeight, halfHeight),
      };
    },
    [viewBox.width, viewBox.height],
  );

  /**
   * Pan the camera by a screen-space delta — simple additive update,
   * then clamp. Exposed via the returned object so keyboard and
   * minimap layers drive the same state as mouse drag.
   */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      setPan((prev) => clampPan({ x: prev.x + dx, y: prev.y + dy }, zoom));
    },
    [clampPan, zoom],
  );

  /**
   * Zoom to an absolute scale, anchoring the hex under the cursor.
   *
   * Math: to keep the world point `w` under the screen point `s`
   * across a zoom change, we solve for the pan adjustment that
   * preserves the screen→world mapping. In this hook the SVG is
   * rendered with `viewBox` that shifts by `-pan * (1/zoom)`, so
   * changing zoom from z0 to z1 while keeping world point `w` under
   * cursor point `s` means:
   *
   *   newPan = oldPan + (w - centerWorld) * (z1 - z0) / z1
   *
   * Where `centerWorld` is the world point currently under the
   * viewport center. For the rendering model in use here this
   * simplifies to adjusting pan proportionally to the cursor offset
   * from viewport center.
   */
  const zoomTo = useCallback(
    (nextZoom: number, cursorPoint?: { x: number; y: number }) => {
      const clamped = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
      const svg = svgRef.current;
      if (!svg || !cursorPoint) {
        setZoom(clamped);
        return;
      }
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setZoom(clamped);
        return;
      }
      // Cursor position as a fraction of viewport width/height from
      // the top-left. (0,0) = top-left, (1,1) = bottom-right. Using
      // a normalized fraction lets us derive the right pan update
      // regardless of the viewport's physical pixel size.
      const cfx = cursorPoint.x / rect.width;
      const cfy = cursorPoint.y / rect.height;
      // The rendered viewBox is:
      //   x(z, p) = vb.x - p/z + vb.w*(1 - 1/z)/2
      //   width(z) = vb.w/z
      //   worldAtCursor = x + cf*width
      // Solving for p1 given p0 that keeps worldAtCursor(z0,p0) ==
      // worldAtCursor(z1,p1) yields:
      //   p1 = z1*p0/z0 + vb.w*(z1/z0 - 1)*(1/2 - cf)
      // See the test suite for `addMinimapAndCameraControls` for the
      // full derivation.
      setPan((prev) => {
        const z0 = zoom;
        const z1 = clamped;
        const ratio = z1 / z0;
        const nextX =
          ratio * prev.x + viewBox.width * (ratio - 1) * (0.5 - cfx);
        const nextY =
          ratio * prev.y + viewBox.height * (ratio - 1) * (0.5 - cfy);
        return clampPan({ x: nextX, y: nextY }, clamped);
      });
      setZoom(clamped);
    },
    [zoom, clampPan, viewBox.width, viewBox.height],
  );

  /**
   * Center the camera on a hex. Converts to world-space, then to
   * pan. If animated (default), eases linearly over CENTER_EASE_MS.
   *
   * Reduced-motion handling: honored in `useCameraControls`, which
   * is the public facade — this low-level primitive accepts the
   * explicit `animate: false` option.
   */
  const centerOn = useCallback(
    (
      hex: IHexCoordinate,
      opts?: { animate?: boolean; bumpLowZoom?: boolean },
    ) => {
      const animate = opts?.animate ?? true;
      const bumpLowZoom = opts?.bumpLowZoom ?? true;

      // Cancel any in-flight ease so overlapping calls resolve cleanly.
      if (easeRafRef.current !== null) {
        cancelAnimationFrame(easeRafRef.current);
        easeRafRef.current = null;
      }

      // Per task 7.2: if the zoom is too far out to see the unit
      // after centering, bump to FOCUS_BUMP_ZOOM first.
      const targetZoom =
        bumpLowZoom && zoom < FOCUS_MIN_ZOOM ? FOCUS_BUMP_ZOOM : zoom;
      if (targetZoom !== zoom) setZoom(targetZoom);

      // Target pan: move the hex's world-space position to viewport
      // center. With this hook's rendering model the viewport center
      // corresponds to `pan = -worldPos * targetZoom`.
      const world = hexToPixel(hex.q, hex.r);
      const targetPan = clampPan(
        { x: -world.x * targetZoom, y: -world.y * targetZoom },
        targetZoom,
      );

      if (!animate) {
        setPan(targetPan);
        return;
      }

      const start = performance.now();
      // Snapshot the starting pan to interpolate from.
      let startPan = { x: 0, y: 0 };
      setPan((prev) => {
        startPan = prev;
        return prev;
      });

      const step = (now: number): void => {
        const t = clamp((now - start) / CENTER_EASE_MS, 0, 1);
        // easeOutQuad — cheap, good for camera snaps.
        const eased = 1 - (1 - t) * (1 - t);
        setPan({
          x: startPan.x + (targetPan.x - startPan.x) * eased,
          y: startPan.y + (targetPan.y - startPan.y) * eased,
        });
        if (t < 1) {
          easeRafRef.current = requestAnimationFrame(step);
        } else {
          easeRafRef.current = null;
        }
      };
      easeRafRef.current = requestAnimationFrame(step);
    },
    [zoom, clampPan],
  );

  /**
   * Wheel handler — zoom-to-cursor. The cursor position is extracted
   * from the React event and passed to `zoomTo`, which does the
   * anchoring math.
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) {
        setZoom((z) =>
          clamp(z * (e.deltaY > 0 ? 0.9 : 1.1), ZOOM_MIN, ZOOM_MAX),
        );
        return;
      }
      const rect = svg.getBoundingClientRect();
      const cursor = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomTo(zoom * delta, cursor);
    },
    [zoom, zoomTo],
  );

  /**
   * Mouse-down — starts a pan when:
   *   - middle mouse button (task 2.4)
   *   - Alt + left click (legacy Phase-1 behavior)
   *   - plain left click on an empty hex (task 2.1) — the SVG root
   *     catches the event when the click wasn't handled by a hex or
   *     token child (those call `stopPropagation`).
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 0) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const next = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        };
        setPan(clampPan(next, zoom));
      }
    },
    [isPanning, panStart, clampPan, zoom],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const getTouchDistance = useCallback(
    (t1: React.Touch, t2: React.Touch): number => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        setTouchStart({ dist, zoom });
        setIsPanning(false);
      } else if (e.touches.length === 1) {
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        });
        setTouchStart(null);
      }
    },
    [getTouchDistance, zoom, pan],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2 && touchStart) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = dist / touchStart.dist;
        setZoom(clamp(touchStart.zoom * scale, ZOOM_MIN, ZOOM_MAX));
      } else if (e.touches.length === 1 && isPanning) {
        const next = {
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y,
        };
        setPan(clampPan(next, zoom));
      }
    },
    [touchStart, getTouchDistance, isPanning, panStart, clampPan, zoom],
  );

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setIsPanning(false);
  }, []);

  // Clean up any pending ease animation on unmount so we don't leak
  // a RAF callback into a stale component.
  useEffect(() => {
    return () => {
      if (easeRafRef.current !== null) {
        cancelAnimationFrame(easeRafRef.current);
        easeRafRef.current = null;
      }
    };
  }, []);

  const transformedViewBox = useMemo(() => {
    const scale = 1 / zoom;
    const width = viewBox.width * scale;
    const height = viewBox.height * scale;
    const x = viewBox.x - pan.x * scale + (viewBox.width - width) / 2;
    const y = viewBox.y - pan.y * scale + (viewBox.height - height) / 2;
    return `${x} ${y} ${width} ${height}`;
  }, [viewBox, zoom, pan]);

  // Memoize the returned object so consumers (e.g. HexMapDisplay's
  // `onInteractionReady` effect in GameplayLayout) see a stable
  // identity across renders. Without this, every render produced a
  // fresh object, which caused the parent's `setMapInteraction` effect
  // to fire on every render — an infinite loop that hung the
  // gameplay smoke test and cancelled CI at the 20-min ceiling.
  return useMemo(
    () => ({
      svgRef,
      transformedViewBox,
      viewBox,
      zoom,
      pan,
      setZoom,
      setPan,
      showMovementOverlay,
      setShowMovementOverlay,
      showCoverOverlay,
      setShowCoverOverlay,
      showLOSOverlay,
      setShowLOSOverlay,
      panBy,
      zoomTo,
      centerOn,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    }),
    [
      transformedViewBox,
      viewBox,
      zoom,
      pan,
      showMovementOverlay,
      showCoverOverlay,
      showLOSOverlay,
      panBy,
      zoomTo,
      centerOn,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    ],
  );
}
