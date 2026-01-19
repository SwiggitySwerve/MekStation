/**
 * Movement Calculations
 * Calculate valid movement destinations and costs.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import {
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
  IMovementValidation,
  IMovementRecord,
  MovementType,
  Facing,
} from '@/types/gameplay';
import {
  hexDistance,
  hexEquals,
  hexNeighbors,
  hexLine,
  coordToKey,
} from './hexMath';
import { isInBounds, isOccupied, getHex } from './hexGrid';

// =============================================================================
// Movement Point Calculations
// =============================================================================

/**
 * Calculate running MP from walking MP.
 * Run MP = ceil(walk MP * 1.5)
 */
export function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Create movement capability from base values.
 */
export function createMovementCapability(
  walkMP: number,
  jumpMP: number = 0
): IMovementCapability {
  return {
    walkMP,
    runMP: calculateRunMP(walkMP),
    jumpMP,
  };
}

/**
 * Get the maximum MP available for a movement type.
 */
export function getMaxMP(
  capability: IMovementCapability,
  movementType: MovementType
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
      return capability.runMP;
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

// =============================================================================
// Movement Cost Calculations
// =============================================================================

/**
 * Get the base MP cost to enter a hex.
 * Currently all hexes cost 1 MP (no terrain effects yet).
 */
export function getHexMovementCost(
  grid: IHexGrid,
  coord: IHexCoordinate
): number {
  const hex = getHex(grid, coord);
  if (!hex) return Infinity;
  
  // Future: terrain cost modification
  // For now, all hexes cost 1 MP
  return 1;
}

/**
 * Calculate the minimum MP cost to move from one hex to another.
 * Uses straight-line distance (pathfinding would use actual path cost).
 */
export function estimateMovementCost(
  from: IHexCoordinate,
  to: IHexCoordinate
): number {
  return hexDistance(from, to);
}

// =============================================================================
// Heat Generation
// =============================================================================

/**
 * Calculate heat generated from movement.
 */
export function calculateMovementHeat(
  movementType: MovementType,
  hexesMoved: number
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1; // Walking generates 1 heat
    case MovementType.Run:
      return 2; // Running generates 2 heat
    case MovementType.Jump:
      return Math.max(hexesMoved, 3); // Jumping generates at least 3 heat, or hexes jumped
    default:
      return 0;
  }
}

// =============================================================================
// Target Movement Modifier (TMM)
// =============================================================================

/**
 * Calculate Target Movement Modifier based on movement this turn.
 */
export function calculateTMM(
  movementType: MovementType,
  hexesMoved: number
): number {
  if (movementType === MovementType.Stationary) {
    return 0;
  }
  
  // TMM = hexes moved / 5 (rounded up), minimum 1 if moved
  let tmm = Math.max(1, Math.ceil(hexesMoved / 5));
  
  // Jumping adds +1 additional TMM
  if (movementType === MovementType.Jump) {
    tmm += 1;
  }
  
  return tmm;
}

// =============================================================================
// Movement Validation
// =============================================================================

/**
 * Validate a movement action.
 */
export function validateMovement(
  grid: IHexGrid,
  position: IUnitPosition,
  destination: IHexCoordinate,
  newFacing: Facing,
  movementType: MovementType,
  capability: IMovementCapability
): IMovementValidation {
  // Check destination is in bounds
  if (!isInBounds(grid, destination)) {
    return {
      valid: false,
      error: 'Destination is outside map bounds',
      mpCost: 0,
      heatGenerated: 0,
    };
  }
  
  // Check destination is not occupied (unless staying in place)
  if (!hexEquals(position.coord, destination) && isOccupied(grid, destination)) {
    return {
      valid: false,
      error: 'Destination hex is occupied',
      mpCost: 0,
      heatGenerated: 0,
    };
  }
  
  // Calculate distance
  const distance = hexDistance(position.coord, destination);
  
  // Check movement type is possible
  if (movementType === MovementType.Jump && capability.jumpMP === 0) {
    return {
      valid: false,
      error: 'Unit cannot jump (no jump jets)',
      mpCost: 0,
      heatGenerated: 0,
    };
  }
  
  // Get max MP for movement type
  const maxMP = getMaxMP(capability, movementType);
  
  // Check range
  if (distance > maxMP) {
    return {
      valid: false,
      error: `Destination is ${distance} hexes away, but max range for ${movementType} is ${maxMP}`,
      mpCost: distance,
      heatGenerated: 0,
    };
  }
  
  // For non-jumping movement, check path is clear
  if (movementType !== MovementType.Jump && distance > 0) {
    const path = hexLine(position.coord, destination);
    // Skip first (start) and last (destination) hexes
    for (let i = 1; i < path.length - 1; i++) {
      if (!isInBounds(grid, path[i])) {
        return {
          valid: false,
          error: 'Path goes outside map bounds',
          mpCost: distance,
          heatGenerated: 0,
        };
      }
      if (isOccupied(grid, path[i])) {
        return {
          valid: false,
          error: `Path blocked by unit at (${path[i].q}, ${path[i].r})`,
          mpCost: distance,
          heatGenerated: 0,
        };
      }
    }
  }
  
  const heatGenerated = calculateMovementHeat(movementType, distance);
  
  return {
    valid: true,
    mpCost: distance,
    heatGenerated,
  };
}

/**
 * Check if a unit is prone and needs to stand.
 * Standing costs all walking MP.
 */
export function canStand(
  position: IUnitPosition,
  capability: IMovementCapability
): boolean {
  return position.prone && capability.walkMP > 0;
}

/**
 * Get the MP cost to stand from prone.
 */
export function getStandingCost(capability: IMovementCapability): number {
  return capability.walkMP;
}

// =============================================================================
// Valid Destination Calculation
// =============================================================================

/**
 * Get all valid destinations for a movement type.
 */
export function getValidDestinations(
  grid: IHexGrid,
  position: IUnitPosition,
  movementType: MovementType,
  capability: IMovementCapability
): readonly IHexCoordinate[] {
  const maxMP = getMaxMP(capability, movementType);
  if (maxMP === 0) {
    return [position.coord]; // Can only stay in place
  }
  
  const destinations: IHexCoordinate[] = [];
  
  // Check all hexes within MP range
  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      const dest: IHexCoordinate = {
        q: position.coord.q + dq,
        r: position.coord.r + dr,
      };
      
      const validation = validateMovement(
        grid,
        position,
        dest,
        position.facing, // Facing doesn't affect destination validity
        movementType,
        capability
      );
      
      if (validation.valid) {
        destinations.push(dest);
      }
    }
  }
  
  return destinations;
}

// =============================================================================
// Movement Record Creation
// =============================================================================

/**
 * Create a movement record for a completed movement.
 */
export function createMovementRecord(
  unitId: string,
  start: IUnitPosition,
  end: IHexCoordinate,
  endFacing: Facing,
  movementType: MovementType,
  path: readonly IHexCoordinate[]
): IMovementRecord {
  return {
    unitId,
    startCoord: start.coord,
    endCoord: end,
    startFacing: start.facing,
    endFacing,
    movementType,
    hexesMoved: hexDistance(start.coord, end),
    path,
  };
}

// =============================================================================
// Attacker Movement Modifier
// =============================================================================

/**
 * Calculate attacker movement modifier for to-hit rolls.
 */
export function calculateAttackerMovementModifier(
  movementType: MovementType
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Jump:
      return 3;
    default:
      return 0;
  }
}

// =============================================================================
// Pathfinding
// =============================================================================

/**
 * Find the shortest path between two hexes using A*.
 * Returns the path or null if no path exists.
 */
export function findPath(
  grid: IHexGrid,
  start: IHexCoordinate,
  end: IHexCoordinate,
  maxCost: number = Infinity
): readonly IHexCoordinate[] | null {
  if (hexEquals(start, end)) {
    return [start];
  }
  
  // A* implementation with proper parent tracking
  interface Node {
    coord: IHexCoordinate;
    g: number;
    f: number;
    parent: string | null;
  }
  
  const openSet = new Map<string, Node>();
  const closedSet = new Map<string, Node>();
  
  const startKey = coordToKey(start);
  openSet.set(startKey, {
    coord: start,
    g: 0,
    f: hexDistance(start, end),
    parent: null,
  });
  
  while (openSet.size > 0) {
    // Find node with lowest f score
    let currentKey: string | null = null;
    let lowestF = Infinity;
    
    for (const entry of Array.from(openSet.entries())) {
      const [key, node] = entry;
      if (node.f < lowestF) {
        lowestF = node.f;
        currentKey = key;
      }
    }
    
    if (currentKey === null) break;
    
    const current = openSet.get(currentKey)!;
    openSet.delete(currentKey);
    closedSet.set(currentKey, current);
    
    // Check if we reached the goal
    if (hexEquals(current.coord, end)) {
      // Reconstruct path by following parent chain
      const path: IHexCoordinate[] = [];
      let nodeKey: string | null = currentKey;
      
      while (nodeKey !== null) {
        const node = closedSet.get(nodeKey);
        if (!node) break;
        path.unshift(node.coord);
        nodeKey = node.parent;
      }
      
      return path;
    }
    
    // Check neighbors
    const neighbors = hexNeighbors(current.coord);
    
    for (const neighbor of neighbors) {
      const neighborKey = coordToKey(neighbor);
      
      // Skip if already evaluated
      if (closedSet.has(neighborKey)) continue;
      
      // Skip if not in bounds
      if (!isInBounds(grid, neighbor)) continue;
      
      // Skip if occupied (unless it's the destination)
      if (!hexEquals(neighbor, end) && isOccupied(grid, neighbor)) continue;
      
      const moveCost = getHexMovementCost(grid, neighbor);
      const tentativeG = current.g + moveCost;
      
      // Skip if over max cost
      if (tentativeG > maxCost) continue;
      
      const existingNode = openSet.get(neighborKey);
      
      if (!existingNode || tentativeG < existingNode.g) {
        openSet.set(neighborKey, {
          coord: neighbor,
          g: tentativeG,
          f: tentativeG + hexDistance(neighbor, end),
          parent: currentKey,
        });
      }
    }
  }
  
  // No path found
  return null;
}
