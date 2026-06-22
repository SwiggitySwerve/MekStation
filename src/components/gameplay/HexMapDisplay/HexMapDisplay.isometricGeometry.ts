import { HEX_SIZE } from '@/constants/hexMap';

export const ISOMETRIC_ELEVATION_UNIT = 6;

export type IsometricExtrusionFaceId =
  | 'east'
  | 'southeast'
  | 'southwest'
  | 'west'
  | 'northwest'
  | 'northeast';

export interface IsometricExtrusionFace {
  readonly id: IsometricExtrusionFaceId;
  readonly edgeStartIndex: number;
  readonly edgeEndIndex: number;
  readonly shade: number;
}

const ISOMETRIC_EXTRUSION_FACES: readonly IsometricExtrusionFace[] = [
  { id: 'east', edgeStartIndex: 0, edgeEndIndex: 1, shade: 0.66 },
  { id: 'southeast', edgeStartIndex: 1, edgeEndIndex: 2, shade: 0.58 },
  { id: 'southwest', edgeStartIndex: 2, edgeEndIndex: 3, shade: 0.66 },
  { id: 'west', edgeStartIndex: 3, edgeEndIndex: 4, shade: 0.58 },
  { id: 'northwest', edgeStartIndex: 4, edgeEndIndex: 5, shade: 0.66 },
  { id: 'northeast', edgeStartIndex: 5, edgeEndIndex: 0, shade: 0.58 },
];

function normalizeRotationStep(step: number): number {
  return ((step % 6) + 6) % 6;
}

export function getCameraFacingExtrusionFaces(
  rotationStep: number,
): readonly IsometricExtrusionFace[] {
  const start = (normalizeRotationStep(rotationStep) + 1) % 6;
  return [
    ISOMETRIC_EXTRUSION_FACES[start],
    ISOMETRIC_EXTRUSION_FACES[(start + 1) % 6],
  ];
}

function hexVertex({
  x,
  y,
  index,
}: {
  readonly x: number;
  readonly y: number;
  readonly index: number;
}): { readonly x: number; readonly y: number } {
  const angleRad = (Math.PI / 180) * 60 * index;
  return {
    x: x + HEX_SIZE * Math.cos(angleRad),
    y: y + HEX_SIZE * Math.sin(angleRad),
  };
}

function formatPoint(point: {
  readonly x: number;
  readonly y: number;
}): string {
  return `${Number(point.x.toFixed(3))},${Number(point.y.toFixed(3))}`;
}

export function buildIsometricExtrusionFacePoints({
  x,
  y,
  face,
  height,
}: {
  readonly x: number;
  readonly y: number;
  readonly face: IsometricExtrusionFace;
  readonly height: number;
}): string {
  const topStart = hexVertex({ x, y, index: face.edgeStartIndex });
  const topEnd = hexVertex({ x, y, index: face.edgeEndIndex });
  const bottomEnd = { x: topEnd.x, y: topEnd.y + height };
  const bottomStart = { x: topStart.x, y: topStart.y + height };
  return [topStart, topEnd, bottomEnd, bottomStart].map(formatPoint).join(' ');
}
