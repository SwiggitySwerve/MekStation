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
 * Rules-level movement mode used for terrain/elevation pathing. The player
 * still chooses Walk / Run / Jump; this mode tells the rules engine whether a
 * ground path should pay mech, tracked, wheeled, hover, VTOL, naval, or
 * other vehicle motive terrain costs.
 */
export type MovementTravelMode =
  | 'walk'
  | 'run'
  | 'jump'
  | 'tracked'
  | 'wheeled'
  | 'hover'
  | 'vtol'
  | 'naval'
  | 'hydrofoil'
  | 'submarine'
  | 'umu'
  | 'biped_swim'
  | 'quad_swim'
  | 'wige'
  | 'rail'
  | 'maglev';

/**
 * Persistent motive mode stored on a unit's movement capability. Run and jump
 * are player-selected movement types, not chassis motive modes.
 */
export type MovementMotiveMode = Exclude<MovementTravelMode, 'run' | 'jump'>;

/**
 * Rules-level movement heat source. Most entities inherit MegaMek's base
 * zero movement heat; Meks override it with engine walk/run/jump heat.
 */
export type MovementHeatProfile = 'mek' | 'airmek' | 'none';

/**
 * Unit-type movement terrain adjustments that cannot be inferred from motive
 * mode alone.
 */
export type MovementTerrainProfile = 'infantry';

/**
 * Optional road-bonus eligibility profile. Default vehicle motive modes keep
 * their normal road bonus; represented infantry motives use the TacOps option.
 */
export type MovementPavementRoadBonusProfile = 'tacops_infantry';

/**
 * Mutable conversion state for units whose rules height changes after import.
 * Numeric values preserve MegaMek-style conversion constants where callers
 * already carry them.
 */
export type MovementConversionMode =
  | 'mek'
  | 'mech'
  | 'airmek'
  | 'airmech'
  | 'fighter'
  | 'vehicle'
  | 'tracked'
  | 'wheeled';

/**
 * Import-time hint for deriving unit height from later runtime state changes.
 */
export type MovementUnitHeightProfile =
  | { readonly kind: 'lam'; readonly standingHeight: number }
  | { readonly kind: 'quadvee'; readonly standingHeight: number }
  | { readonly kind: 'infantry_mount'; readonly mountedHeight?: number };

/**
 * Water-capable equipment represented by the tactical movement layer.
 */
export interface IMovementWaterCapability {
  /** Full amphibious equipment/chassis; can use water without the normal run prohibition. */
  readonly fullyAmphibious?: boolean;
  /** Limited amphibious equipment; pays amphibious water cost where represented. */
  readonly limitedAmphibious?: boolean;
  /** Flotation hull equipment; lifts tracked/wheeled vehicle water terrain prohibition. */
  readonly flotationHull?: boolean;
  /** Terrain Master: Frogman reduces represented deep-water movement cost. */
  readonly frogmanSpecialist?: boolean;
}

/**
 * Optional stand-up rule switches represented by movement projection.
 */
export type MovementStandUpArmActuator =
  | 'hand'
  | 'lower_arm'
  | 'upper_arm'
  | 'shoulder';

export type MovementStandUpLegProfile = 'biped' | 'quad';

export interface IMovementStandUpArmActuators {
  /** First missing/destroyed left-arm actuator, in MegaMek stand-up priority. */
  readonly left?: MovementStandUpArmActuator;
  /** First missing/destroyed right-arm actuator, in MegaMek stand-up priority. */
  readonly right?: MovementStandUpArmActuator;
}

export interface IMovementStandUpCapability {
  /** MegaMek stand-up leg profile; intact quads stand without a PSR. */
  readonly standUpLegProfile?: MovementStandUpLegProfile;
  /** MegaMek no/minimal-arms quirk: stand-up PSR gets +2 before arm checks. */
  readonly noMinimalArmsQuirk?: boolean;
  /** Side-specific arm actuator losses represented for TacOps Attempting to Stand. */
  readonly armActuators?: IMovementStandUpArmActuators;
  /** TacOps Attempting to Stand: destroyed arms add represented PSR penalties. */
  readonly tacOpsAttemptingStand?: boolean;
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
  /** Source thrust MP retained when conversion projection disables ordinary jump movement. */
  readonly conversionThrustMP?: number;
  /** Chassis/squad motive mode for terrain and elevation pathing. */
  readonly movementMode?: MovementMotiveMode;
  /** Whether movement should generate Mek-style engine heat. */
  readonly movementHeatProfile?: MovementHeatProfile;
  /** Unit-type terrain-cost adjustments layered over motive-mode pathing. */
  readonly movementTerrainProfile?: MovementTerrainProfile;
  /** Optional profile controlling whether pavement/road +1 MP applies. */
  readonly pavementRoadBonusProfile?: MovementPavementRoadBonusProfile;
  /** MegaMek-style entity height() above elevation for bridge clearance; default is 0. */
  readonly unitHeight?: number;
  /** Source-backed dynamic height profile for conversion or mounted infantry state. */
  readonly unitHeightProfile?: MovementUnitHeightProfile;
  /** Optional equipment that modifies water movement legality and MP costs. */
  readonly waterCapability?: IMovementWaterCapability;
  /** Optional stand-up rules that affect prone movement projection. */
  readonly standUpCapability?: IMovementStandUpCapability;
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
