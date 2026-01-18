/**
 * Force Management Interfaces
 *
 * Core type definitions for force organization and pilot-mech assignments.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import { IEntity } from '../core/IEntity';

// =============================================================================
// Enums
// =============================================================================

/**
 * Force type determines the organizational structure.
 * Based on Inner Sphere / Clan conventions.
 */
export enum ForceType {
  /** Inner Sphere: 4 units */
  Lance = 'lance',
  /** Clan: 5 units (Star) */
  Star = 'star',
  /** ComStar/WoB: 6 units */
  Level_II = 'level_ii',
  /** Inner Sphere: 3 lances (12 units) */
  Company = 'company',
  /** Clan: 5 Stars (25 units) */
  Binary = 'binary',
  /** Inner Sphere: 3 companies (36 units) */
  Battalion = 'battalion',
  /** Clan: 2 Binaries (50 units) */
  Cluster = 'cluster',
  /** Custom force size */
  Custom = 'custom',
}

/**
 * Position/role within a force.
 */
export enum ForcePosition {
  /** Force commander */
  Commander = 'commander',
  /** Second in command */
  Executive = 'executive',
  /** Lance/Star leader */
  Lead = 'lead',
  /** Standard member */
  Member = 'member',
  /** Scout/recon position */
  Scout = 'scout',
  /** Fire support position */
  FireSupport = 'fire_support',
}

/**
 * Force status for campaign tracking.
 */
export enum ForceStatus {
  /** Ready for deployment */
  Active = 'active',
  /** Under repair/refit */
  Maintenance = 'maintenance',
  /** In transit */
  Transit = 'transit',
  /** Disbanded */
  Disbanded = 'disbanded',
}

// =============================================================================
// Assignment Interfaces
// =============================================================================

/**
 * Assignment of a pilot to a mech within a force.
 */
export interface IAssignment {
  /** Unique assignment ID */
  readonly id: string;
  /** Pilot ID (persistent pilot) or null for empty slot */
  readonly pilotId: string | null;
  /** Unit/mech ID reference */
  readonly unitId: string | null;
  /** Position within the force */
  readonly position: ForcePosition;
  /** Slot number (1-4 for lance, 1-5 for star, etc.) */
  readonly slot: number;
  /** Optional notes for this assignment */
  readonly notes?: string;
}

/**
 * Request to create a new assignment.
 */
export interface ICreateAssignmentRequest {
  readonly pilotId?: string;
  readonly unitId?: string;
  readonly position?: ForcePosition;
  readonly slot: number;
  readonly notes?: string;
}

/**
 * Request to update an assignment.
 */
export interface IUpdateAssignmentRequest {
  readonly pilotId?: string | null;
  readonly unitId?: string | null;
  readonly position?: ForcePosition;
  readonly notes?: string;
}

// =============================================================================
// Force Interfaces
// =============================================================================

/**
 * Calculated force statistics.
 */
export interface IForceStats {
  /** Total Battle Value of all assigned units */
  readonly totalBV: number;
  /** Total tonnage of all assigned units */
  readonly totalTonnage: number;
  /** Number of assigned pilots */
  readonly assignedPilots: number;
  /** Number of assigned units */
  readonly assignedUnits: number;
  /** Number of empty slots */
  readonly emptySlots: number;
  /** Average pilot skill (gunnery/piloting) */
  readonly averageSkill: { gunnery: number; piloting: number } | null;
}

/**
 * Complete force entity.
 */
export interface IForce extends IEntity {
  /** Display name */
  readonly name: string;
  /** Force type (lance, star, company, etc.) */
  readonly forceType: ForceType;
  /** Current status */
  readonly status: ForceStatus;
  /** Faction/house affiliation */
  readonly affiliation?: string;
  /** Parent force ID for hierarchy */
  readonly parentId?: string;
  /** Child force IDs */
  readonly childIds: readonly string[];
  /** Pilot-mech assignments */
  readonly assignments: readonly IAssignment[];
  /** Calculated statistics */
  readonly stats: IForceStats;
  /** Optional description/notes */
  readonly description?: string;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last update timestamp */
  readonly updatedAt: string;
}

/**
 * Request to create a new force.
 */
export interface ICreateForceRequest {
  readonly name: string;
  readonly forceType: ForceType;
  readonly affiliation?: string;
  readonly parentId?: string;
  readonly description?: string;
}

/**
 * Request to update a force.
 */
export interface IUpdateForceRequest {
  readonly name?: string;
  readonly forceType?: ForceType;
  readonly status?: ForceStatus;
  readonly affiliation?: string;
  readonly parentId?: string | null;
  readonly description?: string;
}

// =============================================================================
// Hierarchy Types
// =============================================================================

/**
 * Force with resolved hierarchy (children populated).
 */
export interface IForceWithHierarchy extends IForce {
  /** Resolved child forces */
  readonly children: readonly IForceWithHierarchy[];
}

/**
 * Flattened force for list views.
 */
export interface IForceSummary {
  readonly id: string;
  readonly name: string;
  readonly forceType: ForceType;
  readonly status: ForceStatus;
  readonly affiliation?: string;
  readonly stats: IForceStats;
  readonly depth: number; // Hierarchy depth for indentation
  readonly parentId?: string;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Force validation result.
 */
export interface IForceValidation {
  readonly isValid: boolean;
  readonly errors: readonly IForceValidationError[];
  readonly warnings: readonly IForceValidationWarning[];
}

export interface IForceValidationError {
  readonly code: string;
  readonly message: string;
  readonly slot?: number;
  readonly assignmentId?: string;
}

export interface IForceValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly slot?: number;
  readonly assignmentId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the default slot count for a force type.
 */
export function getDefaultSlotCount(forceType: ForceType): number {
  switch (forceType) {
    case ForceType.Lance:
      return 4;
    case ForceType.Star:
      return 5;
    case ForceType.Level_II:
      return 6;
    case ForceType.Company:
      return 12;
    case ForceType.Binary:
      return 10;
    case ForceType.Battalion:
      return 36;
    case ForceType.Cluster:
      return 50;
    case ForceType.Custom:
      return 4; // Default for custom
    default:
      return 4;
  }
}

/**
 * Get display name for force type.
 */
export function getForceTypeName(forceType: ForceType): string {
  switch (forceType) {
    case ForceType.Lance:
      return 'Lance';
    case ForceType.Star:
      return 'Star';
    case ForceType.Level_II:
      return 'Level II';
    case ForceType.Company:
      return 'Company';
    case ForceType.Binary:
      return 'Binary';
    case ForceType.Battalion:
      return 'Battalion';
    case ForceType.Cluster:
      return 'Cluster';
    case ForceType.Custom:
      return 'Custom';
    default:
      return 'Unknown';
  }
}

/**
 * Check if force type supports sub-forces.
 */
export function canHaveSubForces(forceType: ForceType): boolean {
  return [
    ForceType.Company,
    ForceType.Binary,
    ForceType.Battalion,
    ForceType.Cluster,
  ].includes(forceType);
}

/**
 * Create empty assignments for a force type.
 */
export function createEmptyAssignments(forceType: ForceType): IAssignment[] {
  const slotCount = getDefaultSlotCount(forceType);
  const assignments: IAssignment[] = [];

  for (let i = 1; i <= slotCount; i++) {
    assignments.push({
      id: `slot-${i}`,
      pilotId: null,
      unitId: null,
      position: i === 1 ? ForcePosition.Lead : ForcePosition.Member,
      slot: i,
    });
  }

  return assignments;
}

/**
 * Calculate empty stats for a new force.
 */
export function createEmptyStats(): IForceStats {
  return {
    totalBV: 0,
    totalTonnage: 0,
    assignedPilots: 0,
    assignedUnits: 0,
    emptySlots: 0,
    averageSkill: null,
  };
}
