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

import { useState, useMemo, useRef, useEffect } from 'react';

import type { IHexCoordinate, MapProjectionMode } from '@/types/gameplay';

import type {
  ITouchEventLike,
  IWheelEventLike,
} from './useMapInteraction.events';

import { useMapCameraActions } from './useMapInteraction.actions';
import {
  buildMapViewBox,
  transformedViewBoxForCamera,
  type CameraPoint,
  type ViewBox,
} from './useMapInteraction.camera';
import {
  CENTER_EASE_MS,
  FOCUS_BUMP_ZOOM,
  FOCUS_MIN_ZOOM,
  ZOOM_MAX,
  ZOOM_MIN,
} from './useMapInteraction.constants';
import { useMapInteractionHandlers } from './useMapInteraction.handlers';
import {
  useCenterEaseRef,
  useLatestMapInteractionRefs,
  useMapDragRefs,
} from './useMapInteraction.refs';
import {
  useMapLayerState,
  type IMapLayerInteractionState,
} from './useMapLayerState';

export { CENTER_EASE_MS, FOCUS_BUMP_ZOOM, FOCUS_MIN_ZOOM, ZOOM_MAX, ZOOM_MIN };
export type {
  ITouchEventLike,
  ITouchPointLike,
  IWheelEventLike,
} from './useMapInteraction.events';

/**
 * Structural subset shared by React synthetic and native wheel events.
 * The handlers only touch these members, so accepting the subset lets
 * the same callback serve the JSX prop AND the non-passive native
 * listener without unsafe casts.
 */

/** Structural touch point — see `IWheelEventLike` for the rationale. */

/** Structural subset shared by React synthetic and native touch events. */

/**
 * Zoom bounds — per `add-minimap-and-camera-controls` task 1.3. The
 * previous Phase-1 hook clamped to [0.5, 3]; the new spec tightens
 * that so the camera never zooms out so far the minimap becomes
 * redundant nor so far in that a single hex fills the screen.
 */

/**
 * Per task 7.2: double-click focus on a low-zoom camera (< 0.6) bumps
 * zoom to 0.8 before centering, so the focused unit is legible after
 * the camera lands.
 */

/**
 * Per task 7.3 / spec "center animation eases over 200ms". Used by
 * `centerOn` to interpolate pan when the user has not requested
 * reduced motion.
 */

/**
 * Clamp helper — used both for zoom and (indirectly, via
 * `clampPanToMap`) for pan. Keeping this inline avoids pulling in a
 * math utility for a two-line function.
 */
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
  readonly pan: CameraPoint;
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
  pan: CameraPoint;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<CameraPoint>>;
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
  const refs = useLatestMapInteractionRefs({
    viewBox,
    pan,
    zoom,
    layerInteraction,
  });
  const dragRefs = useMapDragRefs();
  const { easeRafRef } = useCenterEaseRef();

  // ---------------------------------------------------------------
  // Latest-value refs (audit 2026-06-09 G, W5.1a). Handlers read the
  // camera through these instead of closing over render-scoped state,
  // which keeps every returned function identity-stable across
  // pan/zoom events. The refs are re-synced on every render so an
  // external `setZoom`/`setPan` (both exposed below) stays visible to
  // the handlers too.
  // ---------------------------------------------------------------

  // Drag/gesture bookkeeping is handler-internal and never rendered,
  // so plain refs (not state) avoid re-render churn during drags.

  // Track mid-flight ease animations so a new centerOn call can
  // cancel the previous one cleanly.

  useEffect(() => {
    setViewBox(buildMapViewBox(radius));
  }, [radius]);

  const { clampPan, panBy, zoomTo, centerOn } = useMapCameraActions({
    svgRef,
    setPan,
    setZoom,
    ...refs,
    easeRafRef,
  });
  const {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useMapInteractionHandlers({
    svgRef,
    setPan,
    setZoom,
    panRef: refs.panRef,
    zoomRef: refs.zoomRef,
    layerInteractionRef: refs.layerInteractionRef,
    dragRefs,
    clampPan,
    zoomTo,
  });

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
    return transformedViewBoxForCamera({ pan, viewBox, zoom });
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
