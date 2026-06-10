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
 *
 * Audit 2026-06-09 G (remediation W5.1a) hardening:
 *   - Every action/handler reads volatile camera state through
 *     latest-value refs, so the function identities are stable across
 *     pan/zoom events. Identity churn used to re-fire downstream
 *     effects (lens applicator, hotkey re-attach) on every camera
 *     event and defeated the HexCell memo chain.
 *   - `centerOn` projects the target hex through the SAME transform
 *     the render layer applies (`projectMapPoint`), so isometric
 *     centering lands the viewport on the hex's projected position.
 *   - Wheel/touchmove are bound as non-passive NATIVE listeners on
 *     the SVG — React attaches its synthetic wheel/touch listeners
 *     passively at the root, which made `e.preventDefault()` a no-op.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  IHexCoordinate,
  MapIsometricRotationStep,
  MapProjectionMode,
} from '@/types/gameplay';

import {
  HEX_SIZE,
  HEX_WIDTH,
  HEX_HEIGHT,
  hexToPixel,
} from '@/constants/hexMap';

import {
  isometricRotationStepForTouchGesture,
  touchAngleDegrees,
  touchDistance,
} from './mapTouchGestures';
import { projectMapPoint } from './projection';
import {
  useMapLayerState,
  type IMapLayerInteractionState,
} from './useMapLayerState';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Structural subset shared by React synthetic and native wheel events.
 * The handlers only touch these members, so accepting the subset lets
 * the same callback serve the JSX prop AND the non-passive native
 * listener without unsafe casts.
 */
export interface IWheelEventLike {
  preventDefault(): void;
  readonly deltaY: number;
  readonly clientX: number;
  readonly clientY: number;
}

/** Structural touch point — see `IWheelEventLike` for the rationale. */
export interface ITouchPointLike {
  readonly clientX: number;
  readonly clientY: number;
}

/** Structural subset shared by React synthetic and native touch events. */
export interface ITouchEventLike {
  preventDefault(): void;
  readonly touches: ArrayLike<ITouchPointLike>;
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

export interface MapInteractionState extends IMapLayerInteractionState {
  svgRef: React.RefObject<SVGSVGElement | null>;
  transformedViewBox: string;
  viewBox: ViewBox;
  zoom: number;
  pan: { x: number; y: number };
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
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
  handleWheel: (e: IWheelEventLike) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleTouchStart: (e: ITouchEventLike) => void;
  handleTouchMove: (e: ITouchEventLike) => void;
  handleTouchEnd: () => void;
}

/**
 * Hook — owns camera state for the hex map. `radius` is the map
 * radius in hexes; the world-space viewBox is derived from it.
 */
export function useMapInteraction(
  radius: number,
  initialProjectionMode: MapProjectionMode = 'topDown',
): MapInteractionState {
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const layerInteraction = useMapLayerState(initialProjectionMode);

  // ---------------------------------------------------------------
  // Latest-value refs (audit 2026-06-09 G, W5.1a). Handlers read the
  // camera through these instead of closing over render-scoped state,
  // which keeps every returned function identity-stable across
  // pan/zoom events. The refs are re-synced on every render so an
  // external `setZoom`/`setPan` (both exposed below) stays visible to
  // the handlers too.
  // ---------------------------------------------------------------
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const layerInteractionRef = useRef(layerInteraction);
  layerInteractionRef.current = layerInteraction;

  // Drag/gesture bookkeeping is handler-internal and never rendered,
  // so plain refs (not state) avoid re-render churn during drags.
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{
    dist: number;
    zoom: number;
    angle: number;
    rotationStep: MapIsometricRotationStep;
  } | null>(null);

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
      const halfWidth = (viewBoxRef.current.width * currentZoom) / 2;
      const halfHeight = (viewBoxRef.current.height * currentZoom) / 2;
      return {
        x: clamp(next.x, -halfWidth, halfWidth),
        y: clamp(next.y, -halfHeight, halfHeight),
      };
    },
    [],
  );

  /**
   * Pan the camera by a screen-space delta — simple additive update,
   * then clamp. Exposed via the returned object so keyboard and
   * minimap layers drive the same state as mouse drag.
   */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      setPan((prev) =>
        clampPan({ x: prev.x + dx, y: prev.y + dy }, zoomRef.current),
      );
    },
    [clampPan],
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
      const z0 = zoomRef.current;
      const viewBoxNow = viewBoxRef.current;
      setPan((prev) => {
        const z1 = clamped;
        const ratio = z1 / z0;
        const nextX =
          ratio * prev.x + viewBoxNow.width * (ratio - 1) * (0.5 - cfx);
        const nextY =
          ratio * prev.y + viewBoxNow.height * (ratio - 1) * (0.5 - cfy);
        return clampPan({ x: nextX, y: nextY }, clamped);
      });
      setZoom(clamped);
    },
    [clampPan],
  );

  /**
   * Center the camera on a hex. Converts to world-space, projects
   * through the active map projection, then converts to pan. If
   * animated (default), eases over CENTER_EASE_MS.
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
      const currentZoom = zoomRef.current;
      const targetZoom =
        bumpLowZoom && currentZoom < FOCUS_MIN_ZOOM
          ? FOCUS_BUMP_ZOOM
          : currentZoom;
      if (targetZoom !== currentZoom) setZoom(targetZoom);

      // Target pan: move the hex's PROJECTED world-space position to
      // viewport center. Audit 2026-06-09 G (W5.1a): the render layer
      // draws everything through `getMapProjectionTransform`
      // (rotate-before-shear in isometric mode), so the camera must
      // route the target through the same projection or it lands on
      // the unprojected top-down point. `projectMapPoint` is the
      // identity in top-down mode, so this is a no-op there. With
      // this hook's rendering model the viewport center corresponds
      // to `pan = -projectedPos * targetZoom`.
      const layers = layerInteractionRef.current;
      const world = projectMapPoint(
        hexToPixel(hex.q, hex.r),
        layers.projectionMode,
        layers.isometricRotationStep,
      );
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
      const startPan = panRef.current;

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
    [clampPan],
  );

  /**
   * Wheel handler — zoom-to-cursor. The cursor position is extracted
   * from the event and passed to `zoomTo`, which does the anchoring
   * math. Accepts the structural `IWheelEventLike` so the SAME
   * function serves the non-passive native listener below.
   */
  const handleWheel = useCallback(
    (e: IWheelEventLike) => {
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
      zoomTo(zoomRef.current * delta, cursor);
    },
    [zoomTo],
  );

  /**
   * Mouse-down — starts a pan when:
   *   - middle mouse button (task 2.4)
   *   - Alt + left click (legacy Phase-1 behavior)
   *   - plain left click on an empty hex (task 2.1) — the SVG root
   *     catches the event when the click wasn't handled by a hex or
   *     token child (those call `stopPropagation`).
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 0) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - panRef.current.x,
        y: e.clientY - panRef.current.y,
      };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const next = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        };
        setPan(clampPan(next, zoomRef.current));
      }
    },
    [clampPan],
  );

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const layers = layerInteractionRef.current;
    if (layers.projectionMode !== 'isometric2d') return;

    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      e.stopPropagation();
      layers.rotateIsometricLeft();
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      e.stopPropagation();
      layers.rotateIsometricRight();
    }
  }, []);

  const handleTouchStart = useCallback((e: ITouchEventLike) => {
    if (e.touches.length === 2) {
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const angle = touchAngleDegrees(e.touches[0], e.touches[1]);
      touchStartRef.current = {
        dist,
        zoom: zoomRef.current,
        angle,
        rotationStep: layerInteractionRef.current.isometricRotationStep,
      };
      isPanningRef.current = false;
    } else if (e.touches.length === 1) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.touches[0].clientX - panRef.current.x,
        y: e.touches[0].clientY - panRef.current.y,
      };
      touchStartRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: ITouchEventLike) => {
      e.preventDefault();

      const touchStart = touchStartRef.current;
      if (e.touches.length === 2 && touchStart) {
        const dist = touchDistance(e.touches[0], e.touches[1]);
        const scale = dist / touchStart.dist;
        setZoom(clamp(touchStart.zoom * scale, ZOOM_MIN, ZOOM_MAX));

        const layers = layerInteractionRef.current;
        if (layers.projectionMode === 'isometric2d') {
          layers.setIsometricRotationStep(
            isometricRotationStepForTouchGesture(
              touchStart.rotationStep,
              touchStart.angle,
              touchAngleDegrees(e.touches[0], e.touches[1]),
            ),
          );
        }
      } else if (e.touches.length === 1 && isPanningRef.current) {
        const next = {
          x: e.touches[0].clientX - panStartRef.current.x,
          y: e.touches[0].clientY - panStartRef.current.y,
        };
        setPan(clampPan(next, zoomRef.current));
      }
    },
    [clampPan],
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    isPanningRef.current = false;
  }, []);

  // Audit 2026-06-09 G (W5.1a): React 17+ registers its synthetic
  // wheel/touch listeners as PASSIVE at the root, so calling
  // `preventDefault()` inside an `onWheel`/`onTouchMove` JSX prop is
  // a no-op — the page scrolled along with every map zoom / touch
  // pan. Bind non-passive NATIVE listeners on the SVG instead (the
  // JSX props for these two events were removed from HexMapDisplay).
  // Handlers are identity-stable, so this binds once per mount.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheelListener = (e: WheelEvent): void => handleWheel(e);
    const touchMoveListener = (e: TouchEvent): void => handleTouchMove(e);
    svg.addEventListener('wheel', wheelListener, { passive: false });
    svg.addEventListener('touchmove', touchMoveListener, { passive: false });
    return () => {
      svg.removeEventListener('wheel', wheelListener);
      svg.removeEventListener('touchmove', touchMoveListener);
    };
  }, [handleWheel, handleTouchMove]);

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
  // The action/handler entries are individually identity-stable (see
  // the latest-value refs above), so downstream effects can key on
  // them without churning per camera event.
  return useMemo(
    () => ({
      svgRef,
      transformedViewBox,
      viewBox,
      zoom,
      pan,
      setZoom,
      setPan,
      ...layerInteraction,
      panBy,
      zoomTo,
      centerOn,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleKeyDown,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    }),
    [
      transformedViewBox,
      viewBox,
      zoom,
      pan,
      layerInteraction,
      panBy,
      zoomTo,
      centerOn,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleKeyDown,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    ],
  );
}
