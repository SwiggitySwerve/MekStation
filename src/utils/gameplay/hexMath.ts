/**
 * Hex Math Utilities
 * Core mathematical operations for hex grid coordinates.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import {
  IHexCoordinate,
  ICubeCoordinate,
  AXIAL_DIRECTION_DELTAS,
  Facing,
} from '@/types/gameplay';

// =============================================================================
// Coordinate Conversion
// =============================================================================

/**
 * Convert axial coordinates to cube coordinates.
 * Cube coordinates satisfy: x + y + z = 0
 */
export function axialToCube(coord: IHexCoordinate): ICubeCoordinate {
  return {
    x: coord.q,
    z: coord.r,
    y: -coord.q - coord.r,
  };
}

/**
 * Convert cube coordinates to axial coordinates.
 */
export function cubeToAxial(cube: ICubeCoordinate): IHexCoordinate {
  return {
    q: cube.x,
    r: cube.z,
  };
}

/**
 * Create a coordinate key for map storage.
 */
export function coordToKey(coord: IHexCoordinate): string {
  return `${coord.q},${coord.r}`;
}

/**
 * Parse a coordinate key back to a coordinate.
 */
export function keyToCoord(key: string): IHexCoordinate {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

// =============================================================================
// Coordinate Arithmetic
// =============================================================================

/**
 * Add two hex coordinates.
 */
export function hexAdd(a: IHexCoordinate, b: IHexCoordinate): IHexCoordinate {
  return {
    q: a.q + b.q,
    r: a.r + b.r,
  };
}

/**
 * Subtract hex coordinate b from a.
 */
export function hexSubtract(
  a: IHexCoordinate,
  b: IHexCoordinate,
): IHexCoordinate {
  return {
    q: a.q - b.q,
    r: a.r - b.r,
  };
}

/**
 * Scale a hex coordinate by a factor.
 */
export function hexScale(
  coord: IHexCoordinate,
  factor: number,
): IHexCoordinate {
  return {
    q: coord.q * factor,
    r: coord.r * factor,
  };
}

/**
 * Check if two coordinates are equal.
 */
export function hexEquals(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}

// =============================================================================
// Distance Calculation
// =============================================================================

/**
 * Calculate the distance between two hexes in hex steps.
 * Uses the axial distance formula: max(|dq|, |dr|, |dq + dr|)
 */
export function hexDistance(a: IHexCoordinate, b: IHexCoordinate): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(a.q + a.r - b.q - b.r); // s = -q - r
  return Math.max(dq, dr, ds);
}

/**
 * Calculate the distance in cube coordinates (equivalent result).
 */
export function cubeDistance(a: ICubeCoordinate, b: ICubeCoordinate): number {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.z - b.z),
  );
}

// =============================================================================
// Neighbor Calculation
// =============================================================================

/**
 * Get the neighboring hex in a given direction.
 */
export function hexNeighbor(
  coord: IHexCoordinate,
  direction: Facing,
): IHexCoordinate {
  const delta = AXIAL_DIRECTION_DELTAS[direction];
  return hexAdd(coord, delta);
}

/**
 * Get all six neighbors of a hex.
 * Returns neighbors in order: N, NE, SE, S, SW, NW (Facing 0-5)
 */
export function hexNeighbors(coord: IHexCoordinate): readonly IHexCoordinate[] {
  return AXIAL_DIRECTION_DELTAS.map((delta) => hexAdd(coord, delta));
}

/**
 * Get neighbors within a certain range.
 * Returns all hexes at exactly the specified distance.
 */
export function hexRing(
  center: IHexCoordinate,
  radius: number,
): readonly IHexCoordinate[] {
  if (radius === 0) {
    return [center];
  }

  const results: IHexCoordinate[] = [];

  // Start at the hex radius steps in one direction (e.g., southwest)
  let current = hexAdd(
    center,
    hexScale(AXIAL_DIRECTION_DELTAS[Facing.Southwest], radius),
  );

  // Walk around the ring in 6 segments
  for (let direction = 0; direction < 6; direction++) {
    for (let step = 0; step < radius; step++) {
      results.push(current);
      current = hexNeighbor(current, direction as Facing);
    }
  }

  return results;
}

/**
 * Get all hexes within a certain radius (inclusive).
 * Returns hexes from center outward.
 */
export function hexSpiral(
  center: IHexCoordinate,
  radius: number,
): readonly IHexCoordinate[] {
  const results: IHexCoordinate[] = [center];

  for (let r = 1; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }

  return results;
}

/**
 * Get all hexes within a certain range (inclusive).
 * More efficient than hexSpiral for large ranges.
 */
export function hexesInRange(
  center: IHexCoordinate,
  range: number,
): readonly IHexCoordinate[] {
  const results: IHexCoordinate[] = [];

  for (let q = -range; q <= range; q++) {
    const r1 = Math.max(-range, -q - range);
    const r2 = Math.min(range, -q + range);
    for (let r = r1; r <= r2; r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }

  return results;
}

// =============================================================================
// Line Drawing
// =============================================================================

/**
 * Linear interpolation helper.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Round cube coordinates to nearest hex.
 */
function cubeRound(cube: { x: number; y: number; z: number }): ICubeCoordinate {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  // Adjust the largest difference to satisfy x + y + z = 0
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { x: rx, y: ry, z: rz };
}

/**
 * Draw a line between two hexes using the DDA algorithm.
 * Returns all hexes the line passes through.
 */
export function hexLine(
  a: IHexCoordinate,
  b: IHexCoordinate,
): readonly IHexCoordinate[] {
  const distance = hexDistance(a, b);
  if (distance === 0) {
    return [a];
  }

  const cubeA = axialToCube(a);
  const cubeB = axialToCube(b);
  const results: IHexCoordinate[] = [];

  for (let i = 0; i <= distance; i++) {
    const t = i / distance;
    const cubeInterp = {
      x: lerp(cubeA.x, cubeB.x, t),
      y: lerp(cubeA.y, cubeB.y, t),
      z: lerp(cubeA.z, cubeB.z, t),
    };
    const rounded = cubeRound(cubeInterp);
    results.push(cubeToAxial(rounded));
  }

  return results;
}

// =============================================================================
// Angle Calculation
// =============================================================================

/**
 * Calculate the angle from one hex to another in degrees.
 * 0 degrees is North, increases clockwise.
 */
export function hexAngle(from: IHexCoordinate, to: IHexCoordinate): number {
  // Convert to pixel coordinates for angle calculation (flat-top hex)
  const dx = (to.q - from.q) * 1.5; // Simplified, actual would use hex size
  const dy = to.r - from.r + (to.q - from.q) * 0.5;

  // atan2 gives angle from positive x-axis, we need from positive y-axis (North)
  const radians = Math.atan2(dx, -dy);
  let degrees = radians * (180 / Math.PI);

  // Normalize to 0-360
  if (degrees < 0) {
    degrees += 360;
  }

  return degrees;
}

/**
 * Convert an angle to the closest facing direction.
 */
export function angleToFacing(angle: number): Facing {
  // Normalize angle to 0-360
  const normalized = ((angle % 360) + 360) % 360;

  // Each facing covers 60 degrees, centered on 0, 60, 120, 180, 240, 300
  // Add 30 to shift the boundaries, then divide by 60
  const index = Math.floor(((normalized + 30) % 360) / 60);

  return index as Facing;
}

/**
 * Convert a facing direction to its center angle.
 */
export function facingToAngle(facing: Facing): number {
  return facing * 60;
}
