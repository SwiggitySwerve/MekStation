/**
 * Force - Hierarchical force organization for campaign system
 * Represents military units organized in a tree structure (lances, companies, battalions, etc.)
 */

import { ForceType, FormationLevel } from './enums';

/**
 * Force interface for hierarchical military organization
 * 
 * Forces form a tree structure where:
 * - Each force can have a parent force (except root)
 * - Each force can have multiple sub-forces (children)
 * - Each force can contain multiple units
 * - Each force can have a commander (person)
 * 
 * @example
 * ```typescript
 * const battalion: IForce = {
 *   id: 'force-1',
 *   name: '1st Battalion',
 *   parentForceId: undefined, // Root force
 *   subForceIds: ['force-2', 'force-3', 'force-4'], // 3 companies
 *   unitIds: [],
 *   forceType: ForceType.STANDARD,
 *   formationLevel: FormationLevel.BATTALION,
 *   commanderId: 'person-123',
 *   createdAt: '2026-01-26T10:00:00Z',
 *   updatedAt: '2026-01-26T10:00:00Z',
 * };
 * ```
 */
export interface IForce {
  /** Unique identifier */
  readonly id: string;
  
  /** Force name (e.g., "Alpha Lance", "1st Company") */
  readonly name: string;
  
  /** Parent force ID (undefined for root forces) */
  readonly parentForceId?: string;
  
  /** Array of sub-force IDs (children in tree) */
  readonly subForceIds: string[];
  
  /** Array of unit IDs assigned to this force */
  readonly unitIds: string[];
  
  /** Force type (standard, support, recon, etc.) */
  readonly forceType: ForceType;
  
  /** Formation level (lance, company, battalion, etc.) */
  readonly formationLevel: FormationLevel;
  
  /** Commander person ID (optional) */
  readonly commanderId?: string;
  
  /** Creation timestamp (ISO 8601) */
  readonly createdAt: string;
  
  /** Last update timestamp (ISO 8601) */
  readonly updatedAt: string;
}

/**
 * Get all parent forces up to root
 * 
 * Traverses up the force hierarchy from the given force to the root,
 * collecting all parent forces along the way.
 * 
 * @param force - Starting force
 * @param forceMap - Map of all forces by ID
 * @returns Array of parent forces (immediate parent first, root last)
 * 
 * @example
 * ```typescript
 * // Lance → Company → Battalion
 * const parents = getAllParents(lance, forceMap);
 * // Returns: [company, battalion]
 * ```
 */
export function getAllParents(
  force: IForce,
  forceMap: Map<string, IForce>
): IForce[] {
  const parents: IForce[] = [];
  let currentForce = force;
  
  // Prevent infinite loops with visited set
  const visited = new Set<string>([force.id]);
  
  while (currentForce.parentForceId) {
    const parent = forceMap.get(currentForce.parentForceId);
    
    if (!parent) {
      // Parent not found in map, stop traversal
      break;
    }
    
    if (visited.has(parent.id)) {
      // Circular reference detected, stop traversal
      break;
    }
    
    parents.push(parent);
    visited.add(parent.id);
    currentForce = parent;
  }
  
  return parents;
}

/**
 * Get all sub-forces recursively
 * 
 * Traverses down the force hierarchy from the given force,
 * collecting all descendant forces (children, grandchildren, etc.).
 * 
 * @param force - Starting force
 * @param forceMap - Map of all forces by ID
 * @returns Array of all descendant forces (depth-first order)
 * 
 * @example
 * ```typescript
 * // Battalion with 3 companies, each with 3 lances
 * const subForces = getAllSubForces(battalion, forceMap);
 * // Returns: [company1, lance1, lance2, lance3, company2, ...]
 * ```
 */
export function getAllSubForces(
  force: IForce,
  forceMap: Map<string, IForce>
): IForce[] {
  const subForces: IForce[] = [];
  
  // Prevent infinite loops with visited set
  const visited = new Set<string>([force.id]);
  
  // Recursive helper function
  function collectSubForces(currentForce: IForce): void {
    for (const subForceId of currentForce.subForceIds) {
      const subForce = forceMap.get(subForceId);
      
      if (!subForce) {
        // Sub-force not found in map, skip
        continue;
      }
      
      if (visited.has(subForce.id)) {
        // Circular reference detected, skip
        continue;
      }
      
      subForces.push(subForce);
      visited.add(subForce.id);
      
      // Recursively collect descendants
      collectSubForces(subForce);
    }
  }
  
  collectSubForces(force);
  
  return subForces;
}

/**
 * Get all unit IDs recursively from force tree
 * 
 * Collects all unit IDs from the given force and all its descendant forces.
 * Useful for determining total force strength or deploying entire formations.
 * 
 * @param force - Starting force
 * @param forceMap - Map of all forces by ID
 * @returns Array of all unit IDs (includes force's units + all descendant units)
 * 
 * @example
 * ```typescript
 * // Get all units in a battalion (including all companies and lances)
 * const allUnits = getAllUnits(battalion, forceMap);
 * // Returns: ['unit-1', 'unit-2', ..., 'unit-36']
 * ```
 */
export function getAllUnits(
  force: IForce,
  forceMap: Map<string, IForce>
): string[] {
  const unitIds: string[] = [];
  
  // Add units from this force
  unitIds.push(...force.unitIds);
  
  // Add units from all sub-forces
  const subForces = getAllSubForces(force, forceMap);
  for (const subForce of subForces) {
    unitIds.push(...subForce.unitIds);
  }
  
  return unitIds;
}

/**
 * Get hierarchical name "Lance 1, Company A, Battalion 3"
 * 
 * Builds a full hierarchical name by traversing up the force tree
 * and joining force names with commas.
 * 
 * @param force - Starting force
 * @param forceMap - Map of all forces by ID
 * @returns Full hierarchical name (child → parent → grandparent)
 * 
 * @example
 * ```typescript
 * const fullName = getFullName(lance, forceMap);
 * // Returns: "Alpha Lance, 1st Company, 3rd Battalion"
 * ```
 */
export function getFullName(
  force: IForce,
  forceMap: Map<string, IForce>
): string {
  const names: string[] = [force.name];
  
  const parents = getAllParents(force, forceMap);
  for (const parent of parents) {
    names.push(parent.name);
  }
  
  return names.join(', ');
}
