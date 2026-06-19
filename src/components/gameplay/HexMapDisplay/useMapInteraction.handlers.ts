import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import type { CameraPoint } from './useMapInteraction.camera';
import type {
  ITouchEventLike,
  IWheelEventLike,
} from './useMapInteraction.events';
import type { MapDragRefs } from './useMapInteraction.refs';
import type { IMapLayerInteractionState } from './useMapLayerState';

import {
  isometricRotationStepForTouchGesture,
  touchAngleDegrees,
  touchDistance,
} from './mapTouchGestures';
import { clamp } from './useMapInteraction.camera';
import { ZOOM_MAX, ZOOM_MIN } from './useMapInteraction.constants';

export interface MapInteractionHandlers {
  readonly handleWheel: (e: IWheelEventLike) => void;
  readonly handleMouseDown: (e: ReactMouseEvent) => void;
  readonly handleMouseMove: (e: ReactMouseEvent) => void;
  readonly handleMouseUp: () => void;
  readonly handleKeyDown: (e: ReactKeyboardEvent) => void;
  readonly handleTouchStart: (e: ITouchEventLike) => void;
  readonly handleTouchMove: (e: ITouchEventLike) => void;
  readonly handleTouchEnd: () => void;
}

export function useMapInteractionHandlers({
  svgRef,
  setPan,
  setZoom,
  panRef,
  zoomRef,
  layerInteractionRef,
  dragRefs,
  clampPan,
  zoomTo,
}: {
  readonly svgRef: RefObject<SVGSVGElement | null>;
  readonly setPan: Dispatch<SetStateAction<CameraPoint>>;
  readonly setZoom: Dispatch<SetStateAction<number>>;
  readonly panRef: MutableRefObject<CameraPoint>;
  readonly zoomRef: MutableRefObject<number>;
  readonly layerInteractionRef: MutableRefObject<IMapLayerInteractionState>;
  readonly dragRefs: MapDragRefs;
  readonly clampPan: (next: CameraPoint, currentZoom: number) => CameraPoint;
  readonly zoomTo: (
    nextZoom: number,
    cursorPoint?: { x: number; y: number },
  ) => void;
}): MapInteractionHandlers {
  const handleWheel = useWheelHandler({ svgRef, setZoom, zoomRef, zoomTo });
  const { handleMouseDown, handleMouseMove, handleMouseUp } =
    usePointerHandlers({
      setPan,
      panRef,
      zoomRef,
      isPanningRef: dragRefs.isPanningRef,
      panStartRef: dragRefs.panStartRef,
      clampPan,
    });
  const handleKeyDown = useKeyboardHandler(layerInteractionRef);
  const { handleTouchStart, handleTouchMove, handleTouchEnd } =
    useTouchHandlers({
      setPan,
      setZoom,
      panRef,
      zoomRef,
      layerInteractionRef,
      isPanningRef: dragRefs.isPanningRef,
      panStartRef: dragRefs.panStartRef,
      touchStartRef: dragRefs.touchStartRef,
      clampPan,
    });

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

function useWheelHandler({
  svgRef,
  setZoom,
  zoomRef,
  zoomTo,
}: {
  readonly svgRef: RefObject<SVGSVGElement | null>;
  readonly setZoom: Dispatch<SetStateAction<number>>;
  readonly zoomRef: MutableRefObject<number>;
  readonly zoomTo: (
    nextZoom: number,
    cursorPoint?: { x: number; y: number },
  ) => void;
}): (e: IWheelEventLike) => void {
  return useCallback(
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
    [setZoom, svgRef, zoomRef, zoomTo],
  );
}

function usePointerHandlers({
  setPan,
  panRef,
  zoomRef,
  isPanningRef,
  panStartRef,
  clampPan,
}: {
  readonly setPan: Dispatch<SetStateAction<CameraPoint>>;
  readonly panRef: MutableRefObject<CameraPoint>;
  readonly zoomRef: MutableRefObject<number>;
  readonly isPanningRef: MutableRefObject<boolean>;
  readonly panStartRef: MutableRefObject<CameraPoint>;
  readonly clampPan: (next: CameraPoint, currentZoom: number) => CameraPoint;
}): Pick<
  MapInteractionHandlers,
  'handleMouseDown' | 'handleMouseMove' | 'handleMouseUp'
> {
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 0) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX - panRef.current.x,
          y: e.clientY - panRef.current.y,
        };
      }
    },
    [isPanningRef, panRef, panStartRef],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (isPanningRef.current) {
        const next = {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        };
        setPan(clampPan(next, zoomRef.current));
      }
    },
    [clampPan, isPanningRef, panStartRef, setPan, zoomRef],
  );

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, [isPanningRef]);

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}

function useKeyboardHandler(
  layerInteractionRef: MutableRefObject<IMapLayerInteractionState>,
): (e: ReactKeyboardEvent) => void {
  return useCallback(
    (e: ReactKeyboardEvent) => {
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
    },
    [layerInteractionRef],
  );
}

function useTouchHandlers({
  setPan,
  setZoom,
  panRef,
  zoomRef,
  layerInteractionRef,
  isPanningRef,
  panStartRef,
  touchStartRef,
  clampPan,
}: {
  readonly setPan: Dispatch<SetStateAction<CameraPoint>>;
  readonly setZoom: Dispatch<SetStateAction<number>>;
  readonly panRef: MutableRefObject<CameraPoint>;
  readonly zoomRef: MutableRefObject<number>;
  readonly layerInteractionRef: MutableRefObject<IMapLayerInteractionState>;
  readonly isPanningRef: MutableRefObject<boolean>;
  readonly panStartRef: MutableRefObject<CameraPoint>;
  readonly touchStartRef: MapDragRefs['touchStartRef'];
  readonly clampPan: (next: CameraPoint, currentZoom: number) => CameraPoint;
}): Pick<
  MapInteractionHandlers,
  'handleTouchStart' | 'handleTouchMove' | 'handleTouchEnd'
> {
  const handleTouchStart = useCallback(
    (e: ITouchEventLike) => {
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
    },
    [
      isPanningRef,
      layerInteractionRef,
      panRef,
      panStartRef,
      touchStartRef,
      zoomRef,
    ],
  );

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
    [
      clampPan,
      isPanningRef,
      layerInteractionRef,
      panStartRef,
      setPan,
      setZoom,
      touchStartRef,
      zoomRef,
    ],
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    isPanningRef.current = false;
  }, [isPanningRef, touchStartRef]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
