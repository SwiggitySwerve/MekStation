/**
 * Force Service Tests
 *
 * Tests for force management and assignment operations.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import {
  IForce,
  IAssignment,
  IForceStats,
  ForceType,
  ForceStatus,
  ForcePosition,
  getDefaultSlotCount,
} from '@/types/force';
import { IPilot, PilotType, PilotStatus } from '@/types/pilot';

// =============================================================================
// Mock Repositories
// =============================================================================

// Mock pilot storage
const mockPilots = new Map<string, IPilot>();

// Mock force storage
const mockForces = new Map<string, IForce>();
let mockIdCounter = 0;

// Mock pilot repository
jest.mock('../../pilots/PilotRepository', () => ({
  getPilotRepository: () => ({
    getById: (id: string) => mockPilots.get(id) ?? null,
  }),
}));

// Mock force repository
jest.mock('../ForceRepository', () => ({
  getForceRepository: () => ({
    createForce: jest.fn((request: { name: string; forceType: ForceType }) => {
      const id = `force-${++mockIdCounter}`;
      const slotCount = getDefaultSlotCount(request.forceType);
      const assignments: IAssignment[] = [];
      for (let i = 1; i <= slotCount; i++) {
        assignments.push({
          id: `assign-${id}-${i}`,
          pilotId: null,
          unitId: null,
          position: i === 1 ? ForcePosition.Lead : ForcePosition.Member,
          slot: i,
        });
      }
      const force: IForce = {
        id,
        name: request.name,
        forceType: request.forceType,
        status: ForceStatus.Active,
        childIds: [],
        assignments,
        stats: {
          totalBV: 0,
          totalTonnage: 0,
          assignedPilots: 0,
          assignedUnits: 0,
          emptySlots: slotCount,
          averageSkill: null,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockForces.set(id, force);
      return { success: true, id };
    }),
    getForceById: (id: string) => mockForces.get(id) ?? null,
    getAllForces: () => Array.from(mockForces.values()),
    getRootForces: () => Array.from(mockForces.values()).filter((f) => !f.parentId),
    getChildForces: (parentId: string) =>
      Array.from(mockForces.values()).filter((f) => f.parentId === parentId),
    updateForce: jest.fn((id: string, request: Partial<IForce>) => {
      const force = mockForces.get(id);
      if (!force) return { success: false, error: 'Force not found' };
      const updated = { ...force, ...request, updatedAt: new Date().toISOString() };
      mockForces.set(id, updated);
      return { success: true, id };
    }),
    deleteForce: jest.fn((id: string) => {
      if (!mockForces.has(id)) return { success: false, error: 'Force not found' };
      mockForces.delete(id);
      return { success: true };
    }),
    updateAssignment: jest.fn(
      (assignmentId: string, request: Partial<IAssignment>) => {
        const forces = Array.from(mockForces.values());
        for (const force of forces) {
          const assignmentIndex = force.assignments.findIndex(
            (a: IAssignment) => a.id === assignmentId
          );
          if (assignmentIndex !== -1) {
            const assignments = [...force.assignments];
            assignments[assignmentIndex] = {
              ...assignments[assignmentIndex],
              ...request,
            };
            mockForces.set(force.id, {
              ...force,
              assignments,
              updatedAt: new Date().toISOString(),
            });
            return { success: true, id: assignmentId };
          }
        }
        return { success: false, error: 'Assignment not found' };
      }
    ),
    clearAssignment: jest.fn((assignmentId: string) => {
      const forces = Array.from(mockForces.values());
      for (const force of forces) {
        const assignmentIndex = force.assignments.findIndex(
          (a: IAssignment) => a.id === assignmentId
        );
        if (assignmentIndex !== -1) {
          const assignments = [...force.assignments];
          assignments[assignmentIndex] = {
            ...assignments[assignmentIndex],
            pilotId: null,
            unitId: null,
          };
          mockForces.set(force.id, {
            ...force,
            assignments,
            updatedAt: new Date().toISOString(),
          });
          return { success: true, id: assignmentId };
        }
      }
      return { success: false, error: 'Assignment not found' };
    }),
    swapAssignments: jest.fn((assignmentId1: string, assignmentId2: string) => {
      let a1: IAssignment | undefined;
      let a2: IAssignment | undefined;
      let force1: IForce | undefined;
      let force2: IForce | undefined;

      const forces = Array.from(mockForces.values());
      for (const force of forces) {
        const found1 = force.assignments.find((a: IAssignment) => a.id === assignmentId1);
        const found2 = force.assignments.find((a: IAssignment) => a.id === assignmentId2);
        if (found1) {
          a1 = found1;
          force1 = force;
        }
        if (found2) {
          a2 = found2;
          force2 = force;
        }
      }

      if (!a1 || !a2 || !force1 || !force2) {
        return { success: false, error: 'Both assignments must exist' };
      }

      // Capture values before swap
      const a1PilotId = a1.pilotId;
      const a1UnitId = a1.unitId;
      const a2PilotId = a2.pilotId;
      const a2UnitId = a2.unitId;

      // If same force, update both at once
      if (force1.id === force2.id) {
        const assignments = [...force1.assignments];
        const idx1 = assignments.findIndex((a: IAssignment) => a.id === assignmentId1);
        const idx2 = assignments.findIndex((a: IAssignment) => a.id === assignmentId2);
        assignments[idx1] = { ...assignments[idx1], pilotId: a2PilotId, unitId: a2UnitId };
        assignments[idx2] = { ...assignments[idx2], pilotId: a1PilotId, unitId: a1UnitId };
        mockForces.set(force1.id, { ...force1, assignments });
      } else {
        // Different forces
        const assignments1 = [...force1.assignments];
        const idx1 = assignments1.findIndex((a: IAssignment) => a.id === assignmentId1);
        assignments1[idx1] = { ...assignments1[idx1], pilotId: a2PilotId, unitId: a2UnitId };
        mockForces.set(force1.id, { ...force1, assignments: assignments1 });

        const assignments2 = [...force2.assignments];
        const idx2 = assignments2.findIndex((a: IAssignment) => a.id === assignmentId2);
        assignments2[idx2] = { ...assignments2[idx2], pilotId: a1PilotId, unitId: a1UnitId };
        mockForces.set(force2.id, { ...force2, assignments: assignments2 });
      }

      return { success: true };
    }),
  }),
}));

// Import after mocks
import { ForceService, getForceService } from '../ForceService';

// =============================================================================
// Helper Functions
// =============================================================================

function createMockPilot(
  id: string,
  name: string,
  status: PilotStatus = PilotStatus.Active
): IPilot {
  const pilot: IPilot = {
    id,
    name,
    type: PilotType.Persistent,
    status,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockPilots.set(id, pilot);
  return pilot;
}

function clearMocks(): void {
  mockPilots.clear();
  mockForces.clear();
  mockIdCounter = 0;
}

// =============================================================================
// Tests
// =============================================================================

describe('ForceService', () => {
  let service: ForceService;

  beforeEach(() => {
    clearMocks();
    service = new ForceService();
  });

  // ===========================================================================
  // Force CRUD
  // ===========================================================================

  describe('Force CRUD', () => {
    it('should create a lance with 4 slots', () => {
      const result = service.createForce({
        name: 'Alpha Lance',
        forceType: ForceType.Lance,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      const force = service.getForce(result.id!);
      expect(force).toBeDefined();
      expect(force?.name).toBe('Alpha Lance');
      expect(force?.forceType).toBe(ForceType.Lance);
      expect(force?.assignments).toHaveLength(4);
    });

    it('should create a star with 5 slots', () => {
      const result = service.createForce({
        name: 'Nova Star',
        forceType: ForceType.Star,
      });

      expect(result.success).toBe(true);
      const force = service.getForce(result.id!);
      expect(force?.assignments).toHaveLength(5);
    });

    it('should reject empty force name', () => {
      const result = service.createForce({
        name: '',
        forceType: ForceType.Lance,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Force name is required');
    });

    it('should get all forces', () => {
      service.createForce({ name: 'Lance 1', forceType: ForceType.Lance });
      service.createForce({ name: 'Lance 2', forceType: ForceType.Lance });

      const forces = service.getAllForces();
      expect(forces).toHaveLength(2);
    });

    it('should delete a force', () => {
      const result = service.createForce({
        name: 'To Delete',
        forceType: ForceType.Lance,
      });
      const deleteResult = service.deleteForce(result.id!);

      expect(deleteResult.success).toBe(true);
      expect(service.getForce(result.id!)).toBeNull();
    });
  });

  // ===========================================================================
  // Pilot Assignment
  // ===========================================================================

  describe('Pilot Assignment', () => {
    it('should assign a pilot to a slot', () => {
      const pilot = createMockPilot('pilot-1', 'John Doe');
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilot(assignmentId, pilot.id);

      expect(result.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      expect(updated?.assignments[0].pilotId).toBe(pilot.id);
    });

    it('should reject assigning non-existent pilot', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilot(assignmentId, 'non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pilot not found');
    });

    it('should reject assigning KIA pilot', () => {
      const pilot = createMockPilot('pilot-kia', 'Dead Pilot', PilotStatus.KIA);
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilot(assignmentId, pilot.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pilot is KIA and cannot be assigned');
    });

    it('should reject assigning MIA pilot', () => {
      const pilot = createMockPilot('pilot-mia', 'Missing Pilot', PilotStatus.MIA);
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilot(assignmentId, pilot.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pilot is MIA and cannot be assigned');
    });

    it('should reject assigning retired pilot', () => {
      const pilot = createMockPilot(
        'pilot-retired',
        'Retired Pilot',
        PilotStatus.Retired
      );
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilot(assignmentId, pilot.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pilot is retired and cannot be assigned');
    });

    it('should allow assigning injured pilot', () => {
      const pilot = createMockPilot(
        'pilot-injured',
        'Injured Pilot',
        PilotStatus.Injured
      );
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilot(assignmentId, pilot.id);

      expect(result.success).toBe(true);
    });

    it('should reject duplicate pilot assignment in same force', () => {
      const pilot = createMockPilot('pilot-dup', 'Duplicate Pilot');
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId1 = force!.assignments[0].id;
      const assignmentId2 = force!.assignments[1].id;

      // Assign to first slot
      service.assignPilot(assignmentId1, pilot.id);

      // Try to assign to second slot
      const result = service.assignPilot(assignmentId2, pilot.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already assigned to slot');
    });
  });

  // ===========================================================================
  // Unit Assignment
  // ===========================================================================

  describe('Unit Assignment', () => {
    it('should assign a unit to a slot', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignUnit(assignmentId, 'unit-atlas');

      expect(result.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      expect(updated?.assignments[0].unitId).toBe('unit-atlas');
    });

    it('should assign pilot and unit together', () => {
      const pilot = createMockPilot('pilot-combo', 'Combo Pilot');
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      const result = service.assignPilotAndUnit(
        assignmentId,
        pilot.id,
        'unit-atlas'
      );

      expect(result.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      expect(updated?.assignments[0].pilotId).toBe(pilot.id);
      expect(updated?.assignments[0].unitId).toBe('unit-atlas');
    });
  });

  // ===========================================================================
  // Clear and Swap Assignments
  // ===========================================================================

  describe('Clear and Swap Assignments', () => {
    it('should clear an assignment', () => {
      const pilot = createMockPilot('pilot-clear', 'Clear Pilot');
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[0].id;

      service.assignPilotAndUnit(assignmentId, pilot.id, 'unit-atlas');
      const clearResult = service.clearAssignment(assignmentId);

      expect(clearResult.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      expect(updated?.assignments[0].pilotId).toBeNull();
      expect(updated?.assignments[0].unitId).toBeNull();
    });

    it('should swap two assignments', () => {
      const pilot1 = createMockPilot('pilot-swap-1', 'Swap Pilot 1');
      const pilot2 = createMockPilot('pilot-swap-2', 'Swap Pilot 2');
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId1 = force!.assignments[0].id;
      const assignmentId2 = force!.assignments[1].id;

      service.assignPilotAndUnit(assignmentId1, pilot1.id, 'unit-atlas');
      service.assignPilotAndUnit(assignmentId2, pilot2.id, 'unit-marauder');

      const swapResult = service.swapAssignments(assignmentId1, assignmentId2);

      expect(swapResult.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      expect(updated?.assignments[0].pilotId).toBe(pilot2.id);
      expect(updated?.assignments[0].unitId).toBe('unit-marauder');
      expect(updated?.assignments[1].pilotId).toBe(pilot1.id);
      expect(updated?.assignments[1].unitId).toBe('unit-atlas');
    });
  });

  // ===========================================================================
  // Position Assignment
  // ===========================================================================

  describe('Position Assignment', () => {
    it('should set assignment position', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      const assignmentId = force!.assignments[1].id; // Second slot (member)

      const result = service.setAssignmentPosition(
        assignmentId,
        ForcePosition.Scout
      );

      expect(result.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      expect(updated?.assignments[1].position).toBe(ForcePosition.Scout);
    });

    it('should promote to lead and demote current lead', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      // First slot is lead by default
      const newLeadId = force!.assignments[1].id; // Second slot

      const result = service.promoteToLead(newLeadId);

      expect(result.success).toBe(true);
      const updated = service.getForce(forceResult.id!);
      // New lead should be lead
      expect(updated?.assignments[1].position).toBe(ForcePosition.Lead);
      // Old lead should be demoted to member
      expect(updated?.assignments[0].position).toBe(ForcePosition.Member);
    });
  });

  // ===========================================================================
  // Force Validation
  // ===========================================================================

  describe('Force Validation', () => {
    it('should warn about empty slots', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });

      const validation = service.validateForce(forceResult.id!);

      expect(validation.isValid).toBe(true); // Empty slots are warnings, not errors
      expect(validation.warnings.some((w) => w.code === 'EMPTY_SLOTS')).toBe(true);
    });

    it('should warn about pilot without mech', () => {
      const pilot = createMockPilot('pilot-no-mech', 'No Mech Pilot');
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      service.assignPilot(force!.assignments[0].id, pilot.id);

      const validation = service.validateForce(forceResult.id!);

      expect(validation.warnings.some((w) => w.code === 'PILOT_NO_MECH')).toBe(
        true
      );
    });

    it('should warn about mech without pilot', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      service.assignUnit(force!.assignments[0].id, 'unit-atlas');

      const validation = service.validateForce(forceResult.id!);

      expect(validation.warnings.some((w) => w.code === 'MECH_NO_PILOT')).toBe(
        true
      );
    });

    it('should warn about no lead', () => {
      const forceResult = service.createForce({
        name: 'Alpha',
        forceType: ForceType.Lance,
      });
      // Force has empty slots, so no lead is "assigned"

      const validation = service.validateForce(forceResult.id!);

      expect(validation.warnings.some((w) => w.code === 'NO_LEAD')).toBe(true);
    });

    it('should return error for non-existent force', () => {
      const validation = service.validateForce('non-existent');

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === 'FORCE_NOT_FOUND')).toBe(
        true
      );
    });
  });

  // ===========================================================================
  // Force Cloning
  // ===========================================================================

  describe('Force Cloning', () => {
    it('should clone a force with assignments', () => {
      const pilot = createMockPilot('pilot-clone', 'Clone Pilot');
      const forceResult = service.createForce({
        name: 'Original',
        forceType: ForceType.Lance,
      });
      const force = service.getForce(forceResult.id!);
      service.assignPilotAndUnit(force!.assignments[0].id, pilot.id, 'unit-atlas');

      const cloneResult = service.cloneForce(forceResult.id!, 'Clone');

      expect(cloneResult.success).toBe(true);
      const cloned = service.getForce(cloneResult.id!);
      expect(cloned?.name).toBe('Clone');
      expect(cloned?.assignments[0].pilotId).toBe(pilot.id);
      expect(cloned?.assignments[0].unitId).toBe('unit-atlas');
    });

    it('should return error when cloning non-existent force', () => {
      const result = service.cloneForce('non-existent', 'Clone');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Force not found');
    });
  });
});
