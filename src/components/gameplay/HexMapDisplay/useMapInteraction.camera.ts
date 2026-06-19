import type {
  IHexCoordinate,
  MapIsometricRotationStep,
  MapProjectionMode,
} from '@/types/gameplay';

import {
  HEX_HEIGHT,
  HEX_SIZE,
  HEX_WIDTH,
  hexToPixel,
} from '@/constants/hexMap';

import { projectMapPoint } from './projection';

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraPoint {
  readonly x: number;
  readonly y: number;
}

export interface CameraLayerProjection {
  readonly projectionMode: MapProjectionMode;
  readonly isometricRotationStep: MapIsometricRotationStep;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildMapViewBox(radius: number): ViewBox {
  const padding = HEX_SIZE * 2;
  const minX = -radius * HEX_WIDTH * 0.75 - padding;
  const maxX = radius * HEX_WIDTH * 0.75 + padding;
  const minY = -radius * HEX_HEIGHT - padding;
  const maxY = radius * HEX_HEIGHT + padding;
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function clampPanToViewBox(
  next: CameraPoint,
  currentZoom: number,
  viewBox: ViewBox,
): CameraPoint {
  const halfWidth = (viewBox.width * currentZoom) / 2;
  const halfHeight = (viewBox.height * currentZoom) / 2;
  return {
    x: clamp(next.x, -halfWidth, halfWidth),
    y: clamp(next.y, -halfHeight, halfHeight),
  };
}

export function transformedViewBoxForCamera({
  pan,
  viewBox,
  zoom,
}: {
  readonly pan: CameraPoint;
  readonly viewBox: ViewBox;
  readonly zoom: number;
}): string {
  const scale = 1 / zoom;
  const width = viewBox.width * scale;
  const height = viewBox.height * scale;
  const x = viewBox.x - pan.x * scale + (viewBox.width - width) / 2;
  const y = viewBox.y - pan.y * scale + (viewBox.height - height) / 2;
  return `${x} ${y} ${width} ${height}`;
}

export function cursorAnchoredPan({
  clampedZoom,
  cursorPoint,
  currentPan,
  currentZoom,
  svgBounds,
  viewBox,
}: {
  readonly clampedZoom: number;
  readonly cursorPoint: CameraPoint;
  readonly currentPan: CameraPoint;
  readonly currentZoom: number;
  readonly svgBounds: { readonly width: number; readonly height: number };
  readonly viewBox: ViewBox;
}): CameraPoint {
  const cfx = cursorPoint.x / svgBounds.width;
  const cfy = cursorPoint.y / svgBounds.height;
  const ratio = clampedZoom / currentZoom;
  const nextX =
    ratio * currentPan.x + viewBox.width * (ratio - 1) * (0.5 - cfx);
  const nextY =
    ratio * currentPan.y + viewBox.height * (ratio - 1) * (0.5 - cfy);
  return clampPanToViewBox({ x: nextX, y: nextY }, clampedZoom, viewBox);
}

export function panForCenteredHex({
  hex,
  layers,
  targetZoom,
  viewBox,
}: {
  readonly hex: IHexCoordinate;
  readonly layers: CameraLayerProjection;
  readonly targetZoom: number;
  readonly viewBox: ViewBox;
}): CameraPoint {
  const world = projectMapPoint(
    hexToPixel(hex.q, hex.r),
    layers.projectionMode,
    layers.isometricRotationStep,
  );
  return clampPanToViewBox(
    { x: -world.x * targetZoom, y: -world.y * targetZoom },
    targetZoom,
    viewBox,
  );
}
