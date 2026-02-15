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
  ICreateForceRequest,
  IUpdateForceRequest,
  ForcePosition,
  canHaveSubForces,
} from '@/types/force';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import { getPilotRepository } from '../pilots/PilotRepository';
import {
  getForceRepository,
  ForceRepository,
  IForceOperationResult,
} from './ForceRepository';
import {
  buildForceHierarchy,
  buildForceSummaries,
  findAssignmentForce,
} from './ForceService.utils';
import {
  validatePilotAvailability,
  validateForce as validateForceImpl,
} from './ForceService.validation';

export interface IForceService {
  createForce(request: ICreateForceRequest): IForceOperationResult;
  getForce(id: string): IForce | null;
  getAllForces(): readonly IForce[];
  updateForce(id: string, request: IUpdateForceRequest): IForceOperationResult;
  deleteForce(id: string): IForceOperationResult;

  getRootForces(): readonly IForce[];
  getChildForces(parentId: string): readonly IForce[];
  getForceHierarchy(id: string): IForceWithHierarchy | null;
  getForceSummaries(): readonly IForceSummary[];

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

  validateForce(id: string): IForceValidation;
  cloneForce(id: string, newName: string): IForceOperationResult;
}

export class ForceService implements IForceService {
  private readonly repository: ForceRepository;

  constructor() {
    this.repository = getForceRepository();
  }

  createForce(request: ICreateForceRequest): IForceOperationResult {
    if (!request.name || request.name.trim().length === 0) {
      return {
        success: false,
        error: 'Force name is required',
      };
    }

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
    return buildForceHierarchy(force);
  }

  getForceSummaries(): readonly IForceSummary[] {
    return buildForceSummaries();
  }

  assignPilot(assignmentId: string, pilotId: string): IForceOperationResult {
    const pilotRepo = getPilotRepository();
    const pilot = pilotRepo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: 'Pilot not found',
      };
    }

    const availabilityCheck = validatePilotAvailability(pilot.status);
    if (!availabilityCheck.available) {
      return {
        success: false,
        error: availabilityCheck.reason,
      };
    }

    const force = findAssignmentForce(assignmentId);
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
    return this.repository.updateAssignment(assignmentId, { unitId });
  }

  assignPilotAndUnit(
    assignmentId: string,
    pilotId: string,
    unitId: string,
  ): IForceOperationResult {
    const pilotRepo = getPilotRepository();
    const pilot = pilotRepo.getById(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: 'Pilot not found',
      };
    }

    const availabilityCheck = validatePilotAvailability(pilot.status);
    if (!availabilityCheck.available) {
      return {
        success: false,
        error: availabilityCheck.reason,
      };
    }

    const force = findAssignmentForce(assignmentId);
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
    const force = findAssignmentForce(assignmentId);
    if (!force) {
      return {
        success: false,
        error: 'Assignment not found',
      };
    }

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
    const force = findAssignmentForce(assignmentId);
    if (!force) {
      return {
        success: false,
        error: 'Assignment not found',
      };
    }

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

    return this.repository.updateAssignment(assignmentId, {
      position: ForcePosition.Lead,
    });
  }

  validateForce(id: string): IForceValidation {
    const force = this.repository.getForceById(id);
    if (!force) {
      return {
        isValid: false,
        errors: [{ code: 'FORCE_NOT_FOUND', message: 'Force not found' }],
        warnings: [],
      };
    }
    return validateForceImpl(force);
  }

  cloneForce(id: string, newName: string): IForceOperationResult {
    const force = this.repository.getForceById(id);
    if (!force) {
      return {
        success: false,
        error: 'Force not found',
      };
    }

    const result = this.repository.createForce({
      name: newName,
      forceType: force.forceType,
      affiliation: force.affiliation,
      description: force.description ? `Cloned from ${force.name}` : undefined,
    });

    if (!result.success || !result.id) {
      return result;
    }

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

const forceServiceFactory: SingletonFactory<ForceService> = createSingleton(
  (): ForceService => new ForceService(),
);

export function getForceService(): ForceService {
  return forceServiceFactory.get();
}

export function resetForceService(): void {
  forceServiceFactory.reset();
}
