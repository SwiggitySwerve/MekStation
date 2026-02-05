/**
 * Hex Grid Interfaces
 * Core type definitions for the hex grid system.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Facing direction on a hex grid (0-5).
 * Uses flat-top hex orientation.
 */
export enum Facing {
  /** North (0) - directly up */
  North = 0,
  /** Northeast (1) */
  Northeast = 1,
  /** Southeast (2) */
  Southeast = 2,
  /** South (3) - directly down */
  South = 3,
  /** Southwest (4) */
  Southwest = 4,
  /** Northwest (5) */
  Northwest = 5,
}

/**
 * Movement type for a unit.
 */
export enum MovementType {
  /** Did not move */
  Stationary = 'stationary',
  /** Walked (base MP) */
  Walk = 'walk',
  /** Ran (1.5x walk MP) */
  Run = 'run',
  /** Jumped (jump jets) */
  Jump = 'jump',
}

/**
 * Firing arc classification.
 */
export enum FiringArc {
  /** Front arc (facing direction +-1) */
  Front = 'front',
  /** Left side arc */
  Left = 'left',
  /** Right side arc */
  Right = 'right',
  /** Rear arc (opposite of facing) */
  Rear = 'rear',
}

/**
 * Range bracket for combat modifiers.
 */
export enum RangeBracket {
  /** 0-3 hexes: +0 modifier */
  Short = 'short',
  /** 4-6 hexes: +2 modifier */
  Medium = 'medium',
  /** 7-15 hexes: +4 modifier */
  Long = 'long',
  /** 16+ hexes: weapon-specific */
  Extreme = 'extreme',
  /** Target out of weapon's max range */
  OutOfRange = 'out_of_range',
}

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Axial coordinate for a hex position.
 * Uses the q,r axial coordinate system.
 */
export interface IHexCoordinate {
  /** Column coordinate (increases east) */
  readonly q: number;
  /** Row coordinate (increases southeast) */
  readonly r: number;
}

/**
 * Cube coordinate for a hex position.
 * Used internally for some calculations (q + r + s = 0).
 */
export interface ICubeCoordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * A single hex on the map.
 */
export interface IHex {
  /** Axial coordinate */
  readonly coord: IHexCoordinate;
  /** Unit ID occupying this hex (null if empty) */
  readonly occupantId: string | null;
  /** Terrain type (future: woods, water, etc.) */
  readonly terrain: string;
  /** Elevation level (future) */
  readonly elevation: number;
}

/**
 * Hex grid map configuration.
 */
export interface IHexGridConfig {
  /** Radius of the hexagonal grid (number of rings from center) */
  readonly radius: number;
}

/**
 * Hex grid map with all hexes.
 */
export interface IHexGrid {
  /** Grid configuration */
  readonly config: IHexGridConfig;
  /** Map of coordinate key to hex */
  readonly hexes: Map<string, IHex>;
}

/**
 * Unit position on the hex grid.
 */
export interface IUnitPosition {
  /** Unit ID */
  readonly unitId: string;
  /** Current hex coordinate */
  readonly coord: IHexCoordinate;
  /** Current facing direction (0-5) */
  readonly facing: Facing;
  /** Whether unit is prone (fallen) */
  readonly prone: boolean;
}

/**
 * Movement record for a unit this turn.
 */
export interface IMovementRecord {
  /** Unit ID */
  readonly unitId: string;
  /** Starting position */
  readonly startCoord: IHexCoordinate;
  /** Ending position */
  readonly endCoord: IHexCoordinate;
  /** Starting facing */
  readonly startFacing: Facing;
  /** Ending facing */
  readonly endFacing: Facing;
  /** Type of movement */
  readonly movementType: MovementType;
  /** Number of hexes moved */
  readonly hexesMoved: number;
  /** Path taken (for display) */
  readonly path: readonly IHexCoordinate[];
}

/**
 * Result of movement validation.
 */
export interface IMovementValidation {
  /** Whether the movement is valid */
  readonly valid: boolean;
  /** Error message if invalid */
  readonly error?: string;
  /** Total MP cost */
  readonly mpCost: number;
  /** Heat generated */
  readonly heatGenerated: number;
}

/**
 * Movement capabilities for a unit.
 */
export interface IMovementCapability {
  /** Walking MP */
  readonly walkMP: number;
  /** Running MP (calculated: ceil(walkMP * 1.5)) */
  readonly runMP: number;
  /** Jump MP (0 if no jump jets) */
  readonly jumpMP: number;
}

/**
 * Path node for pathfinding.
 */
export interface IPathNode {
  /** Hex coordinate */
  readonly coord: IHexCoordinate;
  /** Cumulative MP cost to reach this node */
  readonly cost: number;
  /** Estimated total cost (cost + heuristic) */
  readonly estimatedTotal: number;
  /** Previous node in path */
  readonly parent: IPathNode | null;
}

/**
 * Range calculation result.
 */
export interface IRangeResult {
  /** Distance in hexes */
  readonly distance: number;
  /** Range bracket */
  readonly bracket: RangeBracket;
  /** To-hit modifier from range */
  readonly modifier: number;
}

/**
 * Arc determination result.
 */
export interface IArcResult {
  /** Which arc the target is in relative to attacker */
  readonly arc: FiringArc;
  /** Angle in degrees (for display) */
  readonly angle: number;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an object is an IHexCoordinate.
 */
export function isHexCoordinate(obj: unknown): obj is IHexCoordinate {
  if (typeof obj !== 'object' || obj === null) return false;
  const coord = obj as IHexCoordinate;
  return (
    typeof coord.q === 'number' &&
    typeof coord.r === 'number' &&
    Number.isInteger(coord.q) &&
    Number.isInteger(coord.r)
  );
}

/**
 * Type guard to check if an object is an IUnitPosition.
 */
export function isUnitPosition(obj: unknown): obj is IUnitPosition {
  if (typeof obj !== 'object' || obj === null) return false;
  const pos = obj as IUnitPosition;
  return (
    typeof pos.unitId === 'string' &&
    isHexCoordinate(pos.coord) &&
    typeof pos.facing === 'number' &&
    pos.facing >= 0 &&
    pos.facing <= 5 &&
    typeof pos.prone === 'boolean'
  );
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Direction deltas for axial coordinates (flat-top hexes).
 * Index corresponds to Facing enum value.
 */
export const AXIAL_DIRECTION_DELTAS: readonly IHexCoordinate[] = [
  { q: 0, r: -1 }, // North (0)
  { q: 1, r: -1 }, // Northeast (1)
  { q: 1, r: 0 }, // Southeast (2)
  { q: 0, r: 1 }, // South (3)
  { q: -1, r: 1 }, // Southwest (4)
  { q: -1, r: 0 }, // Northwest (5)
] as const;

/**
 * Range bracket definitions.
 */
export const RANGE_BRACKET_DEFINITIONS = {
  [RangeBracket.Short]: { min: 0, max: 3, modifier: 0 },
  [RangeBracket.Medium]: { min: 4, max: 6, modifier: 2 },
  [RangeBracket.Long]: { min: 7, max: 15, modifier: 4 },
  [RangeBracket.Extreme]: { min: 16, max: Infinity, modifier: 6 },
  [RangeBracket.OutOfRange]: {
    min: Infinity,
    max: Infinity,
    modifier: Infinity,
  },
} as const;
