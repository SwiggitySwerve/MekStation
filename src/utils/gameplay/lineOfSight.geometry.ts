import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';

import type { ILOSResult } from './lineOfSight.types';

import { cubeToAxial, hexAngle, hexDistance, hexEquals } from './hexMath';

/**
 * Calculate the LOS height at a specific point along the line.
 * Uses linear interpolation between shooter and target heights.
 */
export function interpolateLOSHeight(
  fromHeight: number,
  toHeight: number,
  totalDistance: number,
  currentDistance: number,
): number {
  if (totalDistance === 0) return fromHeight;
  const t = currentDistance / totalDistance;
  return fromHeight + (toHeight - fromHeight) * t;
}

export function terrainBlocksNonDiagramLOS(options: {
  readonly terrainHeight: number;
  readonly currentDistance: number;
  readonly shooterHeight: number;
  readonly targetDistance: number;
  readonly targetHeight: number;
}): boolean {
  const {
    currentDistance,
    shooterHeight,
    terrainHeight,
    targetDistance,
    targetHeight,
  } = options;
  const maxEndpointHeight = Math.max(shooterHeight, targetHeight);

  return (
    terrainHeight > maxEndpointHeight ||
    (currentDistance === 1 && terrainHeight > shooterHeight) ||
    (targetDistance === 1 && terrainHeight > targetHeight)
  );
}

export function buildingBlocksNonDiagramLOS(options: {
  readonly buildingHeight: number;
  readonly currentDistance: number;
  readonly shooterHeight: number;
  readonly targetDistance: number;
  readonly targetHeight: number;
}): boolean {
  return terrainBlocksNonDiagramLOS({
    terrainHeight: options.buildingHeight,
    currentDistance: options.currentDistance,
    shooterHeight: options.shooterHeight,
    targetDistance: options.targetDistance,
    targetHeight: options.targetHeight,
  });
}

const LINE_PIXEL_NUDGE = 0.001;
const SQRT_3 = Math.sqrt(3);

function axialToLinePixel(coord: IHexCoordinate): { x: number; y: number } {
  return {
    x: coord.q * SQRT_3,
    y: 2 * coord.r + coord.q,
  };
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundCubeToAxial(cube: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}): IHexCoordinate {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  const axial = cubeToAxial({ x: rx, y: ry, z: rz });
  return {
    q: normalizeZero(axial.q),
    r: normalizeZero(axial.r),
  };
}

export function hexLineWithPerpendicularNudge(
  from: IHexCoordinate,
  to: IHexCoordinate,
  side: -1 | 1,
): readonly IHexCoordinate[] {
  const distance = hexDistance(from, to);
  if (distance === 0) return [from];

  const fromPixel = axialToLinePixel(from);
  const toPixel = axialToLinePixel(to);
  const dx = toPixel.x - fromPixel.x;
  const dy = toPixel.y - fromPixel.y;
  const length = Math.hypot(dx, dy);
  const normalX = (-dy / length) * LINE_PIXEL_NUDGE * side;
  const normalY = (dx / length) * LINE_PIXEL_NUDGE * side;

  const line: IHexCoordinate[] = [];
  for (let i = 0; i <= distance; i++) {
    if (i === 0) {
      line.push(from);
      continue;
    }
    if (i === distance) {
      line.push(to);
      continue;
    }

    const t = i / distance;
    const x = fromPixel.x + (toPixel.x - fromPixel.x) * t + normalX;
    const y = fromPixel.y + (toPixel.y - fromPixel.y) * t + normalY;
    const q = x / SQRT_3;
    const r = (y - q) / 2;
    line.push(roundCubeToAxial({ x: q, y: -q - r, z: r }));
  }

  return line;
}

export function isDividedLosBearing(
  from: IHexCoordinate,
  to: IHexCoordinate,
): boolean {
  return hexAngle(from, to) % 60 === 30;
}

export function interveningHexesForLine(
  lineHexes: readonly IHexCoordinate[],
  from: IHexCoordinate,
  to: IHexCoordinate,
): readonly IHexCoordinate[] {
  return lineHexes.filter(
    (hex) => !hexEquals(hex, from) && !hexEquals(hex, to),
  );
}

function losSeverity(result: ILOSResult): number {
  if (!result.hasLOS) return Number.POSITIVE_INFINITY;
  return result.interveningTerrainEffects.reduce(
    (sum, effect) => sum + effect.modifier,
    0,
  );
}

export function defenderFavorableDividedResult(
  left: ILOSResult,
  right: ILOSResult,
): ILOSResult {
  return losSeverity(left) >= losSeverity(right) ? left : right;
}
