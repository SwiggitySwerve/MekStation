import React, { useCallback, useMemo, useRef } from 'react';

import {
  MINIMAP_SIZE,
  minimapPixelToWorld,
  type IWorldBounds,
} from './minimapGeometry';

type MinimapViewportRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type WorldPoint = { readonly x: number; readonly y: number };
type MutableWorldDelta = { x: number; y: number };

interface UseMinimapInteractionsArgs {
  readonly bounds: IWorldBounds;
  readonly viewportRect: MinimapViewportRect;
  readonly onCenterAt: (worldPoint: WorldPoint) => void;
  readonly onDragPan: (worldDelta: WorldPoint) => void;
}

interface MinimapDragRefs {
  readonly pendingDragRef: React.MutableRefObject<MutableWorldDelta | null>;
  readonly lastDragEmitRef: React.MutableRefObject<number>;
  readonly dragRafRef: React.MutableRefObject<number | null>;
}

const DRAG_EMIT_INTERVAL_MS = 66;

function eventToMinimapPixel(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * MINIMAP_SIZE,
    y: ((clientY - rect.top) / rect.height) * MINIMAP_SIZE,
  };
}

function pointInsideRect(
  point: { readonly x: number; readonly y: number },
  rect: MinimapViewportRect,
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function accumulateDrag(
  pending: MutableWorldDelta | null,
  delta: WorldPoint,
): MutableWorldDelta {
  return {
    x: (pending?.x ?? 0) + delta.x,
    y: (pending?.y ?? 0) + delta.y,
  };
}

function flushPendingDrag(
  refs: MinimapDragRefs,
  onDragPan: (worldDelta: WorldPoint) => void,
  emittedAt: number,
): void {
  const delta = refs.pendingDragRef.current;
  if (!delta) return;
  refs.pendingDragRef.current = null;
  refs.lastDragEmitRef.current = emittedAt;
  onDragPan(delta);
}

function scheduleDeferredDragFlush(
  refs: MinimapDragRefs,
  onDragPan: (worldDelta: WorldPoint) => void,
): void {
  refs.dragRafRef.current = requestAnimationFrame(() => {
    refs.dragRafRef.current = null;
    flushPendingDrag(refs, onDragPan, Date.now());
  });
}

function scheduleDragFlush(
  refs: MinimapDragRefs,
  onDragPan: (worldDelta: WorldPoint) => void,
): void {
  if (refs.dragRafRef.current !== null) return;
  refs.dragRafRef.current = requestAnimationFrame(() => {
    refs.dragRafRef.current = null;
    const now = Date.now();
    if (now - refs.lastDragEmitRef.current < DRAG_EMIT_INTERVAL_MS) {
      scheduleDeferredDragFlush(refs, onDragPan);
      return;
    }
    flushPendingDrag(refs, onDragPan, now);
  });
}

function cancelScheduledFlush(refs: MinimapDragRefs): void {
  if (refs.dragRafRef.current === null) return;
  cancelAnimationFrame(refs.dragRafRef.current);
  refs.dragRafRef.current = null;
}

export function useMinimapInteractions({
  bounds,
  viewportRect,
  onCenterAt,
  onDragPan,
}: UseMinimapInteractionsArgs): {
  readonly svgRef: React.RefObject<SVGSVGElement | null>;
  readonly handleMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  readonly handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  readonly handleMouseUp: () => void;
} {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<{
    lastClientX: number;
    lastClientY: number;
  } | null>(null);
  const pendingDragRef = useRef<MutableWorldDelta | null>(null);
  const lastDragEmitRef = useRef<number>(0);
  const dragRafRef = useRef<number | null>(null);
  const dragRefs = useMemo(
    () => ({ pendingDragRef, lastDragEmitRef, dragRafRef }),
    [],
  );

  const eventToWorld = useCallback(
    (clientX: number, clientY: number): WorldPoint | null => {
      const pixel = eventToMinimapPixel(svgRef.current, clientX, clientY);
      return pixel ? minimapPixelToWorld(pixel, bounds, MINIMAP_SIZE) : null;
    },
    [bounds],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const pixel = eventToMinimapPixel(svgRef.current, e.clientX, e.clientY);
      if (!pixel) return;

      if (pointInsideRect(pixel, viewportRect)) {
        dragStateRef.current = {
          lastClientX: e.clientX,
          lastClientY: e.clientY,
        };
        e.preventDefault();
        return;
      }

      const world = eventToWorld(e.clientX, e.clientY);
      if (world) onCenterAt(world);
    },
    [eventToWorld, onCenterAt, viewportRect],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const dxScreen = e.clientX - dragState.lastClientX;
      const dyScreen = e.clientY - dragState.lastClientY;
      dragStateRef.current = {
        lastClientX: e.clientX,
        lastClientY: e.clientY,
      };

      const worldDelta = {
        x: dxScreen * (bounds.width / MINIMAP_SIZE),
        y: dyScreen * (bounds.height / MINIMAP_SIZE),
      };
      pendingDragRef.current = accumulateDrag(
        pendingDragRef.current,
        worldDelta,
      );
      scheduleDragFlush(dragRefs, onDragPan);
    },
    [bounds.width, bounds.height, dragRefs, onDragPan],
  );

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null;
    cancelScheduledFlush(dragRefs);
    flushPendingDrag(dragRefs, onDragPan, Date.now());
  }, [dragRefs, onDragPan]);

  return {
    svgRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
