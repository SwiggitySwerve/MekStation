import { useRef, type MutableRefObject } from 'react';

import type { CameraPoint, ViewBox } from './useMapInteraction.camera';
import type { IMapLayerInteractionState } from './useMapLayerState';

export interface MapInteractionLatestRefs {
  readonly viewBoxRef: MutableRefObject<ViewBox>;
  readonly panRef: MutableRefObject<CameraPoint>;
  readonly zoomRef: MutableRefObject<number>;
  readonly layerInteractionRef: MutableRefObject<IMapLayerInteractionState>;
}

export function useLatestMapInteractionRefs({
  viewBox,
  pan,
  zoom,
  layerInteraction,
}: {
  readonly viewBox: ViewBox;
  readonly pan: CameraPoint;
  readonly zoom: number;
  readonly layerInteraction: IMapLayerInteractionState;
}): MapInteractionLatestRefs {
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  const panRef = useRef(pan);
  panRef.current = pan;

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const layerInteractionRef = useRef(layerInteraction);
  layerInteractionRef.current = layerInteraction;

  return { viewBoxRef, panRef, zoomRef, layerInteractionRef };
}

export interface TouchGestureStart {
  readonly dist: number;
  readonly zoom: number;
  readonly angle: number;
  readonly rotationStep: IMapLayerInteractionState['isometricRotationStep'];
}

export interface MapDragRefs {
  readonly isPanningRef: MutableRefObject<boolean>;
  readonly panStartRef: MutableRefObject<CameraPoint>;
  readonly touchStartRef: MutableRefObject<TouchGestureStart | null>;
}

export function useMapDragRefs(): MapDragRefs {
  return {
    isPanningRef: useRef(false),
    panStartRef: useRef({ x: 0, y: 0 }),
    touchStartRef: useRef<TouchGestureStart | null>(null),
  };
}

export interface CenterEaseRef {
  readonly easeRafRef: MutableRefObject<number | null>;
}

export function useCenterEaseRef(): CenterEaseRef {
  return { easeRafRef: useRef<number | null>(null) };
}
