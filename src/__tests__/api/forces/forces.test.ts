/**
 * Comprehensive tests for Forces API routes
 *
 * Tests all endpoints:
 * - /api/forces (index.ts)
 * - /api/forces/[id] ([id].ts)
 * - /api/forces/[id]/clone ([id]/clone.ts)
 * - /api/forces/[id]/validate ([id]/validate.ts)
 * - /api/forces/assignments/[id] (assignments/[id].ts)
 * - /api/forces/assignments/swap (assignments/swap.ts)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import {
  parseApiResponse,
  parseErrorResponse,
  createMock,
} from '@/__tests__/helpers';
import idHandler from '@/pages/api/forces/[id]';
import cloneHandler from '@/pages/api/forces/[id]/clone';
import validateHandler from '@/pages/api/forces/[id]/validate';
import assignmentHandler from '@/pages/api/forces/assignments/[id]';
import swapHandler from '@/pages/api/forces/assignments/swap';
import indexHandler from '@/pages/api/forces/index';
import { getForceService, ForceService } from '@/services/forces/ForceService';
import {
  getSQLiteService,
  SQLiteService,
} from '@/services/persistence/SQLiteService';
import { ForceType, ForceStatus, ForcePosition, IForce } from '@/types/force';

// =============================================================================
// Response Types for Type-Safe Testing
// =============================================================================

interface ForceListResponse {
  forces: IForce[];
  count: number;
}

interface ForceCreateResponse {
  success: boolean;
  id?: string;
  force?: IForce;
  error?: string;
}

interface ForceGetResponse {
  force: IForce;
}

interface ForceUpdateResponse {
  success: boolean;
  force?: IForce;
  error?: string;
}

interface ForceDeleteResponse {
  success: boolean;
  error?: string;
}

interface ForceCloneResponse {
  success: boolean;
  id?: string;
  force?: IForce;
  error?: string;
}

interface ForceValidationResponse {
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

interface AssignmentResponse {
  success: boolean;
  error?: string;
}

// Mock dependencies
jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/forces/ForceService');

const mockSQLiteService = getSQLiteService as jest.MockedFunction<
  typeof getSQLiteService
>;
const mockGetForceService = getForceService as jest.MockedFunction<
  typeof getForceService
>;

// =============================================================================
// Test Data
// =============================================================================

const mockForce = {
  id: 'force-1',
  name: 'Alpha Lance',
  forceType: ForceType.Lance,
  status: ForceStatus.Active,
  affiliation: 'Steiner',
  childIds: [],
  assignments: [
    {
      id: 'assign-1',
      pilotId: 'pilot-1',
      unitId: 'unit-1',
      position: ForcePosition.Commander,
      slot: 1,
    },
    {
      id: 'assign-2',
      pilotId: null,
      unitId: null,
      position: ForcePosition.Member,
      slot: 2,
    },
  ],
  stats: {
    totalBV: 2500,
    totalTonnage: 200,
    assignedPilots: 1,
    assignedUnits: 1,
    emptySlots: 3,
    averageSkill: { gunnery: 4, piloting: 5 },
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockValidation = {
  isValid: true,
  errors: [],
  warnings: [],
};

// =============================================================================
// Setup
// =============================================================================

describe('Forces API Routes', () => {
  let mockForceService: {
    getAllForces: jest.Mock;
    createForce: jest.Mock;
    getForce: jest.Mock;
    updateForce: jest.Mock;
    deleteForce: jest.Mock;
    cloneForce: jest.Mock;
    validateForce: jest.Mock;
    assignPilot: jest.Mock;
    assignUnit: jest.Mock;
    assignPilotAndUnit: jest.Mock;
    setAssignmentPosition: jest.Mock;
    clearAssignment: jest.Mock;
    swapAssignments: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockForceService = {
      getAllForces: jest.fn(),
      createForce: jest.fn(),
      getForce: jest.fn(),
      updateForce: jest.fn(),
      deleteForce: jest.fn(),
      cloneForce: jest.fn(),
      validateForce: jest.fn(),
      assignPilot: jest.fn(),
      assignUnit: jest.fn(),
      assignPilotAndUnit: jest.fn(),
      setAssignmentPosition: jest.fn(),
      clearAssignment: jest.fn(),
      swapAssignments: jest.fn(),
    };

    mockSQLiteService.mockReturnValue(
      createMock<SQLiteService>({
        initialize: jest.fn(),
        getDatabase: jest.fn(),
        close: jest.fn(),
        isInitialized: jest.fn().mockReturnValue(true),
      }),
    );

    mockGetForceService.mockReturnValue(
      createMock<ForceService>(mockForceService),
    );
  });

  // ===========================================================================
  // /api/forces - List and Create
  // ===========================================================================

  describe('GET /api/forces', () => {
    it('should list all forces', async () => {
      const forces = [
        mockForce,
        { ...mockForce, id: 'force-2', name: 'Bravo Lance' },
      ];
      mockForceService.getAllForces.mockReturnValue(forces);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceListResponse>(res);
      expect(data.forces).toEqual(forces);
      expect(data.count).toBe(2);
    });

    it('should return empty array when no forces exist', async () => {
      mockForceService.getAllForces.mockReturnValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceListResponse>(res);
      expect(data.forces).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle list errors', async () => {
      mockForceService.getAllForces.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/forces', () => {
    it('should create a new force', async () => {
      const requestBody = {
        name: 'Charlie Lance',
        forceType: ForceType.Lance,
        affiliation: 'Davion',
      };

      mockForceService.createForce.mockReturnValue({
        success: true,
        id: 'force-3',
      });
      mockForceService.getForce.mockReturnValue(mockForce);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: requestBody,
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseApiResponse<ForceCreateResponse>(res);
      expect(data.success).toBe(true);
      expect(data.id).toBe('force-3');
      expect(data.force).toEqual(mockForce);
    });

    it('should reject missing name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { forceType: ForceType.Lance },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('name');
    });

    it('should reject missing forceType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { name: 'Test Lance' },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('forceType');
    });

    it('should handle creation failure', async () => {
      mockForceService.createForce.mockReturnValue({
        success: false,
        error: 'Duplicate name',
        errorCode: 'DUPLICATE_NAME',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { name: 'Alpha Lance', forceType: ForceType.Lance },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<ForceCreateResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Duplicate name');
    });

    it('should handle creation errors', async () => {
      mockForceService.createForce.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { name: 'Test Lance', forceType: ForceType.Lance },
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });

    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  // ===========================================================================
  // /api/forces/[id] - Get, Update, Delete
  // ===========================================================================

  describe('GET /api/forces/[id]', () => {
    it('should get a force by ID', async () => {
      mockForceService.getForce.mockReturnValue(mockForce);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceGetResponse>(res);
      expect(data.force).toEqual(mockForce);
    });

    it('should return 404 for non-existent force', async () => {
      mockForceService.getForce.mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('not found');
    });

    it('should reject missing ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing or invalid force ID');
    });

    it('should handle get errors', async () => {
      mockForceService.getForce.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('PATCH /api/forces/[id]', () => {
    it('should update a force', async () => {
      mockForceService.updateForce.mockReturnValue({
        success: true,
      });
      mockForceService.getForce.mockReturnValue({
        ...mockForce,
        name: 'Updated Lance',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'force-1' },
        body: { name: 'Updated Lance' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceUpdateResponse>(res);
      expect(data.success).toBe(true);
      expect(data.force?.name).toBe('Updated Lance');
    });

    it('should handle update failure', async () => {
      mockForceService.updateForce.mockReturnValue({
        success: false,
        error: 'Invalid force type',
        errorCode: 'INVALID_TYPE',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'force-1' },
        body: { forceType: 'invalid' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<ForceUpdateResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid force type');
    });

    it('should handle update errors', async () => {
      mockForceService.updateForce.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'force-1' },
        body: { name: 'Test' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });
  });

  describe('DELETE /api/forces/[id]', () => {
    it('should delete a force', async () => {
      mockForceService.deleteForce.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'force-1' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceDeleteResponse>(res);
      expect(data.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      mockForceService.deleteForce.mockReturnValue({
        success: false,
        error: 'Force has children',
        errorCode: 'HAS_CHILDREN',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'force-1' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<ForceDeleteResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Force has children');
    });

    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { id: 'force-1' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  // ===========================================================================
  // /api/forces/[id]/clone - Clone Force
  // ===========================================================================

  describe('POST /api/forces/[id]/clone', () => {
    it('should clone a force with new name', async () => {
      mockForceService.cloneForce.mockReturnValue({
        success: true,
        id: 'force-clone',
      });
      mockForceService.getForce.mockReturnValue({
        ...mockForce,
        id: 'force-clone',
        name: 'Alpha Lance (Copy)',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { id: 'force-1' },
        body: { newName: 'Alpha Lance (Copy)' },
      });

      await cloneHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = parseApiResponse<ForceCloneResponse>(res);
      expect(data.success).toBe(true);
      expect(data.id).toBe('force-clone');
      expect(data.force?.name).toBe('Alpha Lance (Copy)');
    });

    it('should reject missing newName', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { id: 'force-1' },
        body: {},
      });

      await cloneHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('newName');
    });

    it('should reject missing ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: {},
        body: { newName: 'Test' },
      });

      await cloneHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing or invalid force ID');
    });

    it('should handle clone failure', async () => {
      mockForceService.cloneForce.mockReturnValue({
        success: false,
        error: 'Source force not found',
        errorCode: 'NOT_FOUND',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { id: 'non-existent' },
        body: { newName: 'Clone' },
      });

      await cloneHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<ForceCloneResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Source force not found');
    });

    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await cloneHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  // ===========================================================================
  // /api/forces/[id]/validate - Validate Force
  // ===========================================================================

  describe('GET /api/forces/[id]/validate', () => {
    it('should validate a force', async () => {
      mockForceService.validateForce.mockReturnValue(mockValidation);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceValidationResponse>(res);
      expect(data.validation).toEqual(mockValidation);
      expect(data.validation.isValid).toBe(true);
    });

    it('should return validation errors', async () => {
      const invalidValidation = {
        isValid: false,
        errors: [{ code: 'EMPTY_SLOT', message: 'Slot 2 is empty', slot: 2 }],
        warnings: [
          {
            code: 'LOW_BV',
            message: 'Low battle value',
            assignmentId: 'assign-1',
          },
        ],
      };

      mockForceService.validateForce.mockReturnValue(invalidValidation);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<ForceValidationResponse>(res);
      expect(data.validation.isValid).toBe(false);
      expect(data.validation.errors).toHaveLength(1);
      expect(data.validation.warnings).toHaveLength(1);
    });

    it('should reject missing ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing or invalid force ID');
    });

    it('should handle validation errors', async () => {
      mockForceService.validateForce.mockImplementation(() => {
        throw new Error('Validation error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Validation error');
    });

    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { id: 'force-1' },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  // ===========================================================================
  // /api/forces/assignments/[id] - Assignment Operations
  // ===========================================================================

  describe('PUT /api/forces/assignments/[id]', () => {
    it('should assign pilot only', async () => {
      mockForceService.assignPilot.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'assign-1' },
        body: { pilotId: 'pilot-2' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(true);
      expect(mockForceService.assignPilot).toHaveBeenCalledWith(
        'assign-1',
        'pilot-2',
      );
    });

    it('should assign unit only', async () => {
      mockForceService.assignUnit.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'assign-1' },
        body: { unitId: 'unit-2' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(true);
      expect(mockForceService.assignUnit).toHaveBeenCalledWith(
        'assign-1',
        'unit-2',
      );
    });

    it('should assign pilot and unit together', async () => {
      mockForceService.assignPilotAndUnit.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'assign-1' },
        body: { pilotId: 'pilot-2', unitId: 'unit-2' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(true);
      expect(mockForceService.assignPilotAndUnit).toHaveBeenCalledWith(
        'assign-1',
        'pilot-2',
        'unit-2',
      );
    });

    it('should update position', async () => {
      mockForceService.setAssignmentPosition.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'assign-1' },
        body: { position: ForcePosition.Scout },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(true);
      expect(mockForceService.setAssignmentPosition).toHaveBeenCalledWith(
        'assign-1',
        ForcePosition.Scout,
      );
    });

    it('should reject empty update', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'assign-1' },
        body: {},
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('No update provided');
    });

    it('should reject missing assignment ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: {},
        body: { pilotId: 'pilot-1' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing or invalid assignment ID');
    });

    it('should handle assignment failure', async () => {
      mockForceService.assignPilot.mockReturnValue({
        success: false,
        error: 'Pilot already assigned',
        errorCode: 'ALREADY_ASSIGNED',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'assign-1' },
        body: { pilotId: 'pilot-1' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Pilot already assigned');
    });
  });

  describe('DELETE /api/forces/assignments/[id]', () => {
    it('should clear an assignment', async () => {
      mockForceService.clearAssignment.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'assign-1' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(true);
      expect(mockForceService.clearAssignment).toHaveBeenCalledWith('assign-1');
    });

    it('should handle clear failure', async () => {
      mockForceService.clearAssignment.mockReturnValue({
        success: false,
        error: 'Assignment not found',
        errorCode: 'NOT_FOUND',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'non-existent' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Assignment not found');
    });

    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'assign-1' },
      });

      await assignmentHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  // ===========================================================================
  // /api/forces/assignments/swap - Swap Assignments
  // ===========================================================================

  describe('POST /api/forces/assignments/swap', () => {
    it('should swap two assignments', async () => {
      mockForceService.swapAssignments.mockReturnValue({
        success: true,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          assignmentId1: 'assign-1',
          assignmentId2: 'assign-2',
        },
      });

      await swapHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(true);
      expect(mockForceService.swapAssignments).toHaveBeenCalledWith(
        'assign-1',
        'assign-2',
      );
    });

    it('should reject missing assignmentId1', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { assignmentId2: 'assign-2' },
      });

      await swapHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject missing assignmentId2', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { assignmentId1: 'assign-1' },
      });

      await swapHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle swap failure', async () => {
      mockForceService.swapAssignments.mockReturnValue({
        success: false,
        error: 'Assignments in different forces',
        errorCode: 'DIFFERENT_FORCES',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          assignmentId1: 'assign-1',
          assignmentId2: 'assign-other',
        },
      });

      await swapHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = parseApiResponse<AssignmentResponse>(res);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Assignments in different forces');
    });

    it('should handle swap errors', async () => {
      mockForceService.swapAssignments.mockImplementation(() => {
        throw new Error('Database error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          assignmentId1: 'assign-1',
          assignmentId2: 'assign-2',
        },
      });

      await swapHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database error');
    });

    it('should reject unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await swapHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = parseErrorResponse(res);
      expect(data.error).toContain('Not Allowed');
    });
  });

  // ===========================================================================
  // Database Initialization Tests
  // ===========================================================================

  describe('Database initialization errors', () => {
    it('should handle database init failure in index route', async () => {
      mockSQLiteService.mockReturnValue(
        createMock<SQLiteService>({
          initialize: jest.fn(() => {
            throw new Error('Database init failed');
          }),
          getDatabase: jest.fn(),
          close: jest.fn(),
          isInitialized: jest.fn().mockReturnValue(false),
        }),
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await indexHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database init failed');
    });

    it('should handle database init failure in id route', async () => {
      mockSQLiteService.mockReturnValue(
        createMock<SQLiteService>({
          initialize: jest.fn(() => {
            throw new Error('Database init failed');
          }),
          getDatabase: jest.fn(),
          close: jest.fn(),
          isInitialized: jest.fn().mockReturnValue(false),
        }),
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'force-1' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = parseErrorResponse(res);
      expect(data.error).toBe('Database init failed');
    });
  });
});
