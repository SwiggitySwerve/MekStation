/**
 * Force Service
 *
 * Business logic layer for force management.
 * Provides high-level operations on forces and assignments.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import {
  IForce,
  IForceWithHierarchy,
  IForceSummary,
  IForceValidation,
  IForceValidationError,
  IForceValidationWarning,
  ICreateForceRequest,
  IUpdateForceRequest,
  ForcePosition,
  canHaveSubForces,
} from '@/types/force';
import { PilotStatus } from '@/types/pilot';

import { getPilotRepository } from '../pilots/PilotRepository';
import {
  getForceRepository,
  ForceRepository,
  IForceOperationResult,
} from './ForceRepository';

// =============================================================================
// Service Interface
// =============================================================================

export interface IForceService {
  // Force CRUD
  createForce(request: ICreateForceRequest): IForceOperationResult;
  getForce(id: string): IForce | null;
  getAllForces(): readonly IForce[];
  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult;
  deleteForce(id: string): IForceOperationResult;

  // Hierarchy
  getRootForces(): readonly IForce[];
  getChildForces(parentId: string): readonly IForce[];
  getForceHierarchy(id: string): IForceWithHierarchy | null;
  getForceSummaries(): readonly IForceSummary[];

  // Assignments
  assignPilot(assignmentId: string, pilotId: string): IForceOperationResult;
  assignUnit(assignmentId: string, unitId: string): IForceOperationResult;
  assignPilotAndUnit(
    assignmentId: string,
    pilotId: string,
    unitId: string,
  ): IForceOperationResult;
  clearAssignment(assignmentId: string): IForceOperationResult;
  swapAssignments(
    assignmentId1: string,
    assignmentId2: string,
  ): IForceOperationResult;
  setAssignmentPosition(
    assignmentId: string,
    position: ForcePosition,
  ): IForceOperationResult;
  promoteToLead(assignmentId: string): IForceOperationResult;

  // Validation
  validateForce(id: string): IForceValidation;

  // Cloning
  cloneForce(id: string, newName: string): IForceOperationResult;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class ForceService implements IForceService {
  private readonly repository: ForceRepository;

  constructor() {
    this.repository = getForceRepository();
  }

  // ===========================================================================
  // Force CRUD
  // ===========================================================================

  createForce(request: ICreateForceRequest): IForceOperationResult {
    // Validate request
    if (!request.name || request.name.trim().length === 0) {
      return {
        success: false,
        error: 'Force name is required',
      };
    }

    // Validate parent if provided
    if (request.parentId) {
      const parent = this.repository.getForceById(request.parentId);
      if (!parent) {
        return {
          success: false,
          error: 'Parent force not found',
        };
      }
      if (!canHaveSubForces(parent.forceType)) {
        return {
          success: false,
          error: `${parent.forceType} cannot have sub-forces`,
        };
      }
    }

    return this.repository.createForce(request);
  }

  getForce(id: string): IForce | null {
    return this.repository.getForceById(id);
  }

  getAllForces(): readonly IForce[] {
    return this.repository.getAllForces();
  }

  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult {
    const force = this.repository.getForceById(id);
    if (!force) {
      return {
        success: false,
        error: 'Force not found',
      };
    }

    return this.repository.updateForce(id, request);
  }

  deleteForce(id: string): IForceOperationResult {
    const force = this.repository.getForceById(id);
    if (!force) {
      return {
        success: false,
        error: 'Force not found',
      };
    }

    return this.repository.deleteForce(id);
  }

  // ===========================================================================
  // Hierarchy
  // ===========================================================================

  getRootForces(): readonly IForce[] {
    return this.repository.getRootForces();
  }

  getChildForces(parentId: string): readonly IForce[] {
    return this.repository.getChildForces(parentId);
  }

  getForceHierarchy(id: string): IForceWithHierarchy | null {
    const force = this.repository.getForceById(id);
    if (!force) {
      return null;
    }

    const buildHierarchy = (f: IForce): IForceWithHierarchy => {
      const children = this.repository.getChildForces(f.id);
      return {
        ...f,
        children: children.map((child) => buildHierarchy(child)),
      };
    };

    return buildHierarchy(force);
  }

  getForceSummaries(): readonly IForceSummary[] {
    const summaries: IForceSummary[] = [];

    const addForce = (force: IForce, depth: number): void => {
      summaries.push({
        id: force.id,
        name: force.name,
        forceType: force.forceType,
        status: force.status,
        affiliation: force.affiliation,
        stats: force.stats,
        depth,
        parentId: force.parentId,
      });

      // Add children
      const children = this.repository.getChildForces(force.id);
      for (const child of children) {
        addForce(child, depth + 1);
      }
    };

    // Start with root forces
    const rootForces = this.repository.getRootForces();
    for (const force of rootForces) {
      addForce(force, 0);
    }

    return summaries;
  }

  // ===========================================================================
  // Assignments
  // ===========================================================================

  assignPilot(assignmentId: string, pilotId: string): IForceOperationResult {
    // Validate pilot exists
    const pilotRepo = getPilotRepository();
    const pilot = pilotRepo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: 'Pilot not found',
      };
    }

    // Validate pilot is available for assignment
    const availabilityCheck = this.validatePilotAvailability(pilot.status);
    if (!availabilityCheck.available) {
      return {
        success: false,
        error: availabilityCheck.reason,
      };
    }

    // Check if pilot is already assigned in this force
    const force = this.findAssignmentForce(assignmentId);
    if (force) {
      const duplicateAssignment = force.assignments.find(
        (a) => a.pilotId === pilotId && a.id !== assignmentId,
      );
      if (duplicateAssignment) {
        return {
          success: false,
          error: `Pilot is already assigned to slot ${duplicateAssignment.slot} in this force`,
        };
      }
    }

    return this.repository.updateAssignment(assignmentId, { pilotId });
  }

  assignUnit(assignmentId: string, unitId: string): IForceOperationResult {
    // TODO: Validate unit exists (need unit repository)
    return this.repository.updateAssignment(assignmentId, { unitId });
  }

  assignPilotAndUnit(
    assignmentId: string,
    pilotId: string,
    unitId: string,
  ): IForceOperationResult {
    // Validate pilot exists
    const pilotRepo = getPilotRepository();
    const pilot = pilotRepo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: 'Pilot not found',
      };
    }

    // Validate pilot is available for assignment
    const availabilityCheck = this.validatePilotAvailability(pilot.status);
    if (!availabilityCheck.available) {
      return {
        success: false,
        error: availabilityCheck.reason,
      };
    }

    // Check if pilot is already assigned in this force
    const force = this.findAssignmentForce(assignmentId);
    if (force) {
      const duplicateAssignment = force.assignments.find(
        (a) => a.pilotId === pilotId && a.id !== assignmentId,
      );
      if (duplicateAssignment) {
        return {
          success: false,
          error: `Pilot is already assigned to slot ${duplicateAssignment.slot} in this force`,
        };
      }
    }

    // TODO: Validate unit exists

    return this.repository.updateAssignment(assignmentId, { pilotId, unitId });
  }

  clearAssignment(assignmentId: string): IForceOperationResult {
    return this.repository.clearAssignment(assignmentId);
  }

  swapAssignments(
    assignmentId1: string,
    assignmentId2: string,
  ): IForceOperationResult {
    return this.repository.swapAssignments(assignmentId1, assignmentId2);
  }

  setAssignmentPosition(
    assignmentId: string,
    position: ForcePosition,
  ): IForceOperationResult {
    // Find the force containing this assignment
    const force = this.findAssignmentForce(assignmentId);
    if (!force) {
      return {
        success: false,
        error: 'Assignment not found',
      };
    }

    // Validate position is allowed
    const validPositions = Object.values(ForcePosition);
    if (!validPositions.includes(position)) {
      return {
        success: false,
        error: `Invalid position: ${position}`,
      };
    }

    return this.repository.updateAssignment(assignmentId, { position });
  }

  promoteToLead(assignmentId: string): IForceOperationResult {
    // Find the force containing this assignment
    const force = this.findAssignmentForce(assignmentId);
    if (!force) {
      return {
        success: false,
        error: 'Assignment not found',
      };
    }

    // Find current lead and demote them
    const currentLead = force.assignments.find(
      (a) => a.position === ForcePosition.Lead && a.id !== assignmentId,
    );
    if (currentLead) {
      const demoteResult = this.repository.updateAssignment(currentLead.id, {
        position: ForcePosition.Member,
      });
      if (!demoteResult.success) {
        return {
          success: false,
          error: `Failed to demote current lead: ${demoteResult.error}`,
        };
      }
    }

    // Promote the new lead
    return this.repository.updateAssignment(assignmentId, {
      position: ForcePosition.Lead,
    });
  }

  // ===========================================================================
  // Pilot Availability Validation
  // ===========================================================================

  /**
   * Check if a pilot's status allows them to be assigned.
   */
  private validatePilotAvailability(status: PilotStatus): {
    available: boolean;
    reason: string;
  } {
    switch (status) {
      case PilotStatus.Active:
        return { available: true, reason: '' };
      case PilotStatus.Injured:
        // Injured pilots can still be assigned (gameplay decision)
        return { available: true, reason: '' };
      case PilotStatus.MIA:
        return {
          available: false,
          reason: 'Pilot is MIA and cannot be assigned',
        };
      case PilotStatus.KIA:
        return {
          available: false,
          reason: 'Pilot is KIA and cannot be assigned',
        };
      case PilotStatus.Retired:
        return {
          available: false,
          reason: 'Pilot is retired and cannot be assigned',
        };
      default:
        return { available: true, reason: '' };
    }
  }

  /**
   * Find an assignment by ID across all forces.
   */
  private findAssignmentForce(assignmentId: string): IForce | null {
    const allForces = this.repository.getAllForces();
    for (const force of allForces) {
      const assignment = force.assignments.find((a) => a.id === assignmentId);
      if (assignment) {
        return force;
      }
    }
    return null;
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  validateForce(id: string): IForceValidation {
    const force = this.repository.getForceById(id);
    if (!force) {
      return {
        isValid: false,
        errors: [{ code: 'FORCE_NOT_FOUND', message: 'Force not found' }],
        warnings: [],
      };
    }

    const errors: IForceValidationError[] = [];
    const warnings: IForceValidationWarning[] = [];
    const pilotRepo = getPilotRepository();

    // Check for empty slots
    const emptySlots = force.assignments.filter(
      (a) => a.pilotId === null && a.unitId === null,
    );
    if (emptySlots.length > 0) {
      warnings.push({
        code: 'EMPTY_SLOTS',
        message: `Force has ${emptySlots.length} empty slot(s)`,
      });
    }

    // Check for pilots without mechs
    const pilotsWithoutMechs = force.assignments.filter(
      (a) => a.pilotId !== null && a.unitId === null,
    );
    for (const assignment of pilotsWithoutMechs) {
      warnings.push({
        code: 'PILOT_NO_MECH',
        message: `Slot ${assignment.slot}: Pilot assigned but no mech`,
        slot: assignment.slot,
        assignmentId: assignment.id,
      });
    }

    // Check for mechs without pilots
    const mechsWithoutPilots = force.assignments.filter(
      (a) => a.pilotId === null && a.unitId !== null,
    );
    for (const assignment of mechsWithoutPilots) {
      warnings.push({
        code: 'MECH_NO_PILOT',
        message: `Slot ${assignment.slot}: Mech assigned but no pilot`,
        slot: assignment.slot,
        assignmentId: assignment.id,
      });
    }

    // Check for no lead assigned
    const leadAssignment = force.assignments.find(
      (a) => a.position === 'lead' && (a.pilotId !== null || a.unitId !== null),
    );
    if (!leadAssignment) {
      warnings.push({
        code: 'NO_LEAD',
        message: 'Force has no assigned lead',
      });
    }

    // Check for duplicate pilot assignments
    const pilotIds = force.assignments
      .filter((a) => a.pilotId !== null)
      .map((a) => a.pilotId as string);
    const seenPilots = new Set<string>();
    const duplicatePilots = new Set<string>();
    for (const pilotId of pilotIds) {
      if (seenPilots.has(pilotId)) {
        duplicatePilots.add(pilotId);
      }
      seenPilots.add(pilotId);
    }
    duplicatePilots.forEach((duplicatePilotId) => {
      errors.push({
        code: 'DUPLICATE_PILOT',
        message: `Pilot ${duplicatePilotId} is assigned to multiple slots`,
      });
    });

    // Check for unavailable pilots (KIA, MIA, Retired)
    for (const assignment of force.assignments) {
      if (assignment.pilotId) {
        const pilot = pilotRepo.getById(assignment.pilotId);
        if (pilot) {
          const availability = this.validatePilotAvailability(pilot.status);
          if (!availability.available) {
            errors.push({
              code: 'UNAVAILABLE_PILOT',
              message: `Slot ${assignment.slot}: ${availability.reason}`,
              slot: assignment.slot,
              assignmentId: assignment.id,
            });
          }
        } else {
          errors.push({
            code: 'MISSING_PILOT',
            message: `Slot ${assignment.slot}: Referenced pilot no longer exists`,
            slot: assignment.slot,
            assignmentId: assignment.id,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ===========================================================================
  // Cloning
  // ===========================================================================

  cloneForce(id: string, newName: string): IForceOperationResult {
    const force = this.repository.getForceById(id);
    if (!force) {
      return {
        success: false,
        error: 'Force not found',
      };
    }

    // Create new force with same settings
    const result = this.repository.createForce({
      name: newName,
      forceType: force.forceType,
      affiliation: force.affiliation,
      description: force.description ? `Cloned from ${force.name}` : undefined,
    });

    if (!result.success || !result.id) {
      return result;
    }

    // Clone assignments
    const newForce = this.repository.getForceById(result.id);
    if (newForce) {
      for (let i = 0; i < force.assignments.length; i++) {
        const sourceAssignment = force.assignments[i];
        const targetAssignment = newForce.assignments[i];

        if (sourceAssignment.pilotId || sourceAssignment.unitId) {
          this.repository.updateAssignment(targetAssignment.id, {
            pilotId: sourceAssignment.pilotId,
            unitId: sourceAssignment.unitId,
            position: sourceAssignment.position,
            notes: sourceAssignment.notes,
          });
        }
      }
    }

    return result;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let service: ForceService | null = null;

export function getForceService(): ForceService {
  if (!service) {
    service = new ForceService();
  }
  return service;
}
