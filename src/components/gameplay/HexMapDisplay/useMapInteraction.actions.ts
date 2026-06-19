import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';

import type { IHexCoordinate } from '@/types/gameplay';

import type { IMapLayerInteractionState } from './useMapLayerState';

import {
  clamp,
  clampPanToViewBox,
  cursorAnchoredPan,
  panForCenteredHex,
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

export interface MapCameraActions {
  readonly clampPan: (next: CameraPoint, currentZoom: number) => CameraPoint;
  readonly panBy: (dx: number, dy: number) => void;
  readonly zoomTo: (
    nextZoom: number,
    cursorPoint?: { x: number; y: number },
  ) => void;
  readonly centerOn: (
    hex: IHexCoordinate,
    opts?: { animate?: boolean; bumpLowZoom?: boolean },
  ) => void;
}

export function useMapCameraActions({
  svgRef,
  setPan,
  setZoom,
  viewBoxRef,
  panRef,
  zoomRef,
  layerInteractionRef,
  easeRafRef,
}: {
  readonly svgRef: RefObject<SVGSVGElement | null>;
  readonly setPan: Dispatch<SetStateAction<CameraPoint>>;
  readonly setZoom: Dispatch<SetStateAction<number>>;
  readonly viewBoxRef: MutableRefObject<ViewBox>;
  readonly panRef: MutableRefObject<CameraPoint>;
  readonly zoomRef: MutableRefObject<number>;
  readonly layerInteractionRef: MutableRefObject<IMapLayerInteractionState>;
  readonly easeRafRef: MutableRefObject<number | null>;
}): MapCameraActions {
  const clampPan = useCallback(
    (next: CameraPoint, currentZoom: number): CameraPoint =>
      clampPanToViewBox(next, currentZoom, viewBoxRef.current),
    [viewBoxRef],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setPan((prev) =>
        clampPan({ x: prev.x + dx, y: prev.y + dy }, zoomRef.current),
      );
    },
    [clampPan, setPan, zoomRef],
  );

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
      const viewBoxNow = viewBoxRef.current;
      setPan((prev) =>
        cursorAnchoredPan({
          clampedZoom: clamped,
          cursorPoint,
          currentPan: prev,
          currentZoom: zoomRef.current,
          svgBounds: rect,
          viewBox: viewBoxNow,
        }),
      );
      setZoom(clamped);
    },
    [setPan, setZoom, svgRef, viewBoxRef, zoomRef],
  );

  const centerOn = useCallback(
    (
      hex: IHexCoordinate,
      opts?: { animate?: boolean; bumpLowZoom?: boolean },
    ) => {
      const animate = opts?.animate ?? true;
      const bumpLowZoom = opts?.bumpLowZoom ?? true;

      if (easeRafRef.current !== null) {
        cancelAnimationFrame(easeRafRef.current);
        easeRafRef.current = null;
      }

      const currentZoom = zoomRef.current;
      const targetZoom =
        bumpLowZoom && currentZoom < FOCUS_MIN_ZOOM
          ? FOCUS_BUMP_ZOOM
          : currentZoom;
      if (targetZoom !== currentZoom) setZoom(targetZoom);

      const targetPan = panForCenteredHex({
        hex,
        layers: layerInteractionRef.current,
        targetZoom,
        viewBox: viewBoxRef.current,
      });

      if (!animate) {
        setPan(targetPan);
        return;
      }

      const start = performance.now();
      const startPan = panRef.current;

      const step = (now: number): void => {
        const t = clamp((now - start) / CENTER_EASE_MS, 0, 1);
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
    [
      easeRafRef,
      layerInteractionRef,
      panRef,
      setPan,
      setZoom,
      viewBoxRef,
      zoomRef,
    ],
  );

  return { clampPan, panBy, zoomTo, centerOn };
}
