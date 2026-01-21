/**
 * Encounters API Routes Tests
 *
 * Comprehensive tests for all encounter API endpoints:
 * - /api/encounters (list, create)
 * - /api/encounters/[id] (get, update, delete)
 * - /api/encounters/[id]/clone
 * - /api/encounters/[id]/launch
 * - /api/encounters/[id]/validate
 * - /api/encounters/[id]/template
 * - /api/encounters/[id]/player-force
 * - /api/encounters/[id]/opponent-force
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  IEncounter,
  ICreateEncounterInput,
  IUpdateEncounterInput,
  ScenarioTemplateType,
  EncounterStatus,
  TerrainPreset,
  VictoryConditionType,
} from '@/types/encounter';
import { IEncounterOperationResult, EncounterErrorCode } from '@/services/encounter/EncounterRepository';

// Import handlers
import encountersHandler from '@/pages/api/encounters/index';
import encounterByIdHandler from '@/pages/api/encounters/[id]/index';
import cloneHandler from '@/pages/api/encounters/[id]/clone';
import launchHandler from '@/pages/api/encounters/[id]/launch';
import validateHandler from '@/pages/api/encounters/[id]/validate';
import templateHandler from '@/pages/api/encounters/[id]/template';
import playerForceHandler from '@/pages/api/encounters/[id]/player-force';
import opponentForceHandler from '@/pages/api/encounters/[id]/opponent-force';

// =============================================================================
// Mocks
// =============================================================================

// Mock SQLite service
jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: jest.fn(() => ({
    initialize: jest.fn(),
  })),
}));

// Mock Encounter service
const mockEncounterService = {
  getAllEncounters: jest.fn(),
  getEncounter: jest.fn(),
  createEncounter: jest.fn(),
  updateEncounter: jest.fn(),
  deleteEncounter: jest.fn(),
  cloneEncounter: jest.fn(),
  launchEncounter: jest.fn(),
  validateEncounter: jest.fn(),
  applyTemplate: jest.fn(),
  setPlayerForce: jest.fn(),
  setOpponentForce: jest.fn(),
  clearOpponentForce: jest.fn(),
};

jest.mock('@/services/encounter/EncounterService', () => ({
  getEncounterService: () => mockEncounterService,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createMockRequest(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as NextApiRequest;
}

interface MockNextApiResponse extends NextApiResponse {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
}

function createMockResponse(): MockNextApiResponse {
  const res: Partial<MockNextApiResponse> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  // Cast through Partial to satisfy the interface while only implementing what we need for tests
  return res as MockNextApiResponse;
}

function createMockEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'encounter-1',
    name: 'Test Encounter',
    description: '',
    status: EncounterStatus.Draft,
    template: ScenarioTemplateType.Custom,
    playerForce: undefined,
    opponentForce: undefined,
    opForConfig: undefined,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    gameSessionId: undefined,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createSuccessResult(overrides: Partial<IEncounterOperationResult> = {}): IEncounterOperationResult {
  return {
    success: true,
    id: 'encounter-1',
    ...overrides,
  };
}

function createErrorResult(error: string, code?: EncounterErrorCode): IEncounterOperationResult {
  return {
    success: false,
    error,
    errorCode: code,
  };
}

// =============================================================================
// Tests: /api/encounters
// =============================================================================

describe('GET /api/encounters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all encounters', async () => {
    const encounters = [
      createMockEncounter({ id: 'enc-1', name: 'Encounter 1' }),
      createMockEncounter({ id: 'enc-2', name: 'Encounter 2' }),
    ];
    mockEncounterService.getAllEncounters.mockReturnValue(encounters);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      encounters,
      count: 2,
    });
  });

  it('should return empty list when no encounters exist', async () => {
    mockEncounterService.getAllEncounters.mockReturnValue([]);

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      encounters: [],
      count: 0,
    });
  });

  it('should handle service errors', async () => {
    mockEncounterService.getAllEncounters.mockImplementation(() => {
      throw new Error('Database error');
    });

    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
  });
});

describe('POST /api/encounters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new encounter', async () => {
    const input: ICreateEncounterInput = {
      name: 'New Encounter',
      description: 'Test description',
    };
    const encounter = createMockEncounter(input);
    const result = createSuccessResult();

    mockEncounterService.createEncounter.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({ method: 'POST', body: input });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(mockEncounterService.createEncounter).toHaveBeenCalledWith(input);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      ...result,
      encounter,
    });
  });

  it('should reject creation without name', async () => {
    const req = createMockRequest({ method: 'POST', body: {} });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: name' });
    expect(mockEncounterService.createEncounter).not.toHaveBeenCalled();
  });

  it('should handle service validation errors', async () => {
    const input: ICreateEncounterInput = { name: 'Test' };
    const result = createErrorResult('Invalid encounter data', EncounterErrorCode.VALIDATION_ERROR);

    mockEncounterService.createEncounter.mockReturnValue(result);

    const req = createMockRequest({ method: 'POST', body: input });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid encounter data',
      errorCode: EncounterErrorCode.VALIDATION_ERROR,
    });
  });

  it('should handle service exceptions', async () => {
    mockEncounterService.createEncounter.mockImplementation(() => {
      throw new Error('Failed to save');
    });

    const req = createMockRequest({ method: 'POST', body: { name: 'Test' } });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save' });
  });
});

describe('Unsupported methods /api/encounters', () => {
  it('should reject unsupported methods', async () => {
    const req = createMockRequest({ method: 'DELETE' });
    const res = createMockResponse();

    await encountersHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method DELETE Not Allowed' });
  });
});

// =============================================================================
// Tests: /api/encounters/[id]
// =============================================================================

describe('GET /api/encounters/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get encounter by ID', async () => {
    const encounter = createMockEncounter();
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({ method: 'GET', query: { id: 'encounter-1' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(mockEncounterService.getEncounter).toHaveBeenCalledWith('encounter-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ encounter });
  });

  it('should return 404 when encounter not found', async () => {
    mockEncounterService.getEncounter.mockReturnValue(null);

    const req = createMockRequest({ method: 'GET', query: { id: 'nonexistent' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Encounter not found' });
  });

  it('should reject missing ID', async () => {
    const req = createMockRequest({ method: 'GET', query: {} });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should reject invalid ID type', async () => {
    const req = createMockRequest({ method: 'GET', query: { id: ['array'] } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle service errors', async () => {
    mockEncounterService.getEncounter.mockImplementation(() => {
      throw new Error('Database error');
    });

    const req = createMockRequest({ method: 'GET', query: { id: 'encounter-1' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
  });
});

describe('PATCH /api/encounters/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update encounter', async () => {
    const update: IUpdateEncounterInput = { name: 'Updated Name' };
    const encounter = createMockEncounter({ name: 'Updated Name' });
    const result = createSuccessResult();

    mockEncounterService.updateEncounter.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'encounter-1' },
      body: update,
    });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(mockEncounterService.updateEncounter).toHaveBeenCalledWith('encounter-1', update);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter });
  });

  it('should handle update validation errors', async () => {
    const update: IUpdateEncounterInput = { name: '' };
    const result = createErrorResult('Name cannot be empty', EncounterErrorCode.VALIDATION_ERROR);

    mockEncounterService.updateEncounter.mockReturnValue(result);

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'encounter-1' },
      body: update,
    });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Name cannot be empty',
      errorCode: EncounterErrorCode.VALIDATION_ERROR,
    });
  });

  it('should handle update service exceptions', async () => {
    mockEncounterService.updateEncounter.mockImplementation(() => {
      throw new Error('Update failed');
    });

    const req = createMockRequest({
      method: 'PATCH',
      query: { id: 'encounter-1' },
      body: { name: 'Test' },
    });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Update failed' });
  });
});

describe('DELETE /api/encounters/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete encounter', async () => {
    const result = createSuccessResult();
    mockEncounterService.deleteEncounter.mockReturnValue(result);

    const req = createMockRequest({ method: 'DELETE', query: { id: 'encounter-1' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(mockEncounterService.deleteEncounter).toHaveBeenCalledWith('encounter-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('should handle delete errors', async () => {
    const result = createErrorResult('Cannot delete active encounter', EncounterErrorCode.INVALID_STATUS);
    mockEncounterService.deleteEncounter.mockReturnValue(result);

    const req = createMockRequest({ method: 'DELETE', query: { id: 'encounter-1' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Cannot delete active encounter',
      errorCode: EncounterErrorCode.INVALID_STATUS,
    });
  });

  it('should handle delete service exceptions', async () => {
    mockEncounterService.deleteEncounter.mockImplementation(() => {
      throw new Error('Delete failed');
    });

    const req = createMockRequest({ method: 'DELETE', query: { id: 'encounter-1' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
  });
});

describe('Unsupported methods /api/encounters/[id]', () => {
  it('should reject unsupported methods', async () => {
    const req = createMockRequest({ method: 'POST', query: { id: 'encounter-1' } });
    const res = createMockResponse();

    await encounterByIdHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PATCH', 'DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// =============================================================================
// Tests: /api/encounters/[id]/clone
// =============================================================================

describe('POST /api/encounters/[id]/clone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clone encounter with new name', async () => {
    const newName = 'Cloned Encounter';
    const clonedEncounter = createMockEncounter({ id: 'encounter-2', name: newName });
    const result = createSuccessResult({ id: 'encounter-2' });

    mockEncounterService.cloneEncounter.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(clonedEncounter);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
      body: { newName },
    });
    const res = createMockResponse();

    await cloneHandler(req, res);

    expect(mockEncounterService.cloneEncounter).toHaveBeenCalledWith('encounter-1', newName);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter: clonedEncounter });
  });

  it('should reject clone without newName', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
      body: {},
    });
    const res = createMockResponse();

    await cloneHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: newName' });
    expect(mockEncounterService.cloneEncounter).not.toHaveBeenCalled();
  });

  it('should reject clone with missing ID', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: {},
      body: { newName: 'Test' },
    });
    const res = createMockResponse();

    await cloneHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle clone errors', async () => {
    const result = createErrorResult('Source encounter not found', EncounterErrorCode.NOT_FOUND);
    mockEncounterService.cloneEncounter.mockReturnValue(result);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'nonexistent' },
      body: { newName: 'Clone' },
    });
    const res = createMockResponse();

    await cloneHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Source encounter not found',
      errorCode: EncounterErrorCode.NOT_FOUND,
    });
  });

  it('should handle clone service exceptions', async () => {
    mockEncounterService.cloneEncounter.mockImplementation(() => {
      throw new Error('Clone failed');
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
      body: { newName: 'Clone' },
    });
    const res = createMockResponse();

    await cloneHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Clone failed' });
  });

  it('should reject non-POST methods', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await cloneHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// =============================================================================
// Tests: /api/encounters/[id]/launch
// =============================================================================

describe('POST /api/encounters/[id]/launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should launch encounter and return game session ID', async () => {
    const encounter = createMockEncounter({
      status: EncounterStatus.Launched,
      gameSessionId: 'session-123',
    });
    const result = createSuccessResult();

    mockEncounterService.launchEncounter.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await launchHandler(req, res);

    expect(mockEncounterService.launchEncounter).toHaveBeenCalledWith('encounter-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...result,
      encounter,
      gameSessionId: 'session-123',
    });
  });

  it('should handle launch validation errors', async () => {
    const result = createErrorResult('Both forces must be set before launching', EncounterErrorCode.VALIDATION_ERROR);
    mockEncounterService.launchEncounter.mockReturnValue(result);

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await launchHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Both forces must be set before launching',
      errorCode: EncounterErrorCode.VALIDATION_ERROR,
    });
  });

  it('should reject launch with missing ID', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: {},
    });
    const res = createMockResponse();

    await launchHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle launch service exceptions', async () => {
    mockEncounterService.launchEncounter.mockImplementation(() => {
      throw new Error('Launch failed');
    });

    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await launchHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Launch failed' });
  });

  it('should reject non-POST methods', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await launchHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// =============================================================================
// Tests: /api/encounters/[id]/validate
// =============================================================================

describe('GET /api/encounters/[id]/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return validation result for valid encounter', async () => {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };
    mockEncounterService.validateEncounter.mockReturnValue(validation);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await validateHandler(req, res);

    expect(mockEncounterService.validateEncounter).toHaveBeenCalledWith('encounter-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ validation });
  });

  it('should return validation result with errors', async () => {
    const validation = {
      valid: false,
      errors: ['Player force not set', 'Opponent force not set'],
      warnings: ['Map size is small for this scenario'],
    };
    mockEncounterService.validateEncounter.mockReturnValue(validation);

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await validateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ validation });
  });

  it('should reject validate with missing ID', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {},
    });
    const res = createMockResponse();

    await validateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle validate service exceptions', async () => {
    mockEncounterService.validateEncounter.mockImplementation(() => {
      throw new Error('Validation failed');
    });

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await validateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed' });
  });

  it('should reject non-GET methods', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await validateHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// =============================================================================
// Tests: /api/encounters/[id]/template
// =============================================================================

describe('PUT /api/encounters/[id]/template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply template to encounter', async () => {
    const template: ScenarioTemplateType = ScenarioTemplateType.Skirmish;
    const encounter = createMockEncounter({
      template,
    });
    const result = createSuccessResult();

    mockEncounterService.applyTemplate.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { template },
    });
    const res = createMockResponse();

    await templateHandler(req, res);

    expect(mockEncounterService.applyTemplate).toHaveBeenCalledWith('encounter-1', template);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter });
  });

  it('should reject template without template field', async () => {
    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: {},
    });
    const res = createMockResponse();

    await templateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: template' });
    expect(mockEncounterService.applyTemplate).not.toHaveBeenCalled();
  });

  it('should reject template with missing ID', async () => {
    const req = createMockRequest({
      method: 'PUT',
      query: {},
      body: { template: 'skirmish' },
    });
    const res = createMockResponse();

    await templateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle template application errors', async () => {
    const result = createErrorResult('Invalid template type', EncounterErrorCode.VALIDATION_ERROR);
    mockEncounterService.applyTemplate.mockReturnValue(result);

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { template: 'invalid' },
    });
    const res = createMockResponse();

    await templateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid template type',
      errorCode: EncounterErrorCode.VALIDATION_ERROR,
    });
  });

  it('should handle template service exceptions', async () => {
    mockEncounterService.applyTemplate.mockImplementation(() => {
      throw new Error('Template application failed');
    });

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { template: 'skirmish' },
    });
    const res = createMockResponse();

    await templateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Template application failed' });
  });

  it('should reject non-PUT methods', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await templateHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['PUT']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// =============================================================================
// Tests: /api/encounters/[id]/player-force
// =============================================================================

describe('PUT /api/encounters/[id]/player-force', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set player force', async () => {
    const forceId = 'force-1';
    const encounter = createMockEncounter({
      playerForce: {
        forceId,
        forceName: 'Player Force',
        totalBV: 5000,
        unitCount: 4,
      },
    });
    const result = createSuccessResult();

    mockEncounterService.setPlayerForce.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { forceId },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(mockEncounterService.setPlayerForce).toHaveBeenCalledWith('encounter-1', forceId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter });
  });

  it('should reject set without forceId', async () => {
    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: {},
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: forceId' });
    expect(mockEncounterService.setPlayerForce).not.toHaveBeenCalled();
  });

  it('should handle set player force errors', async () => {
    const result = createErrorResult('Force not found', EncounterErrorCode.NOT_FOUND);
    mockEncounterService.setPlayerForce.mockReturnValue(result);

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { forceId: 'nonexistent' },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Force not found',
      errorCode: EncounterErrorCode.NOT_FOUND,
    });
  });
});

describe('DELETE /api/encounters/[id]/player-force', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear player force', async () => {
    const encounter = createMockEncounter({ playerForce: undefined });
    const result = createSuccessResult();

    mockEncounterService.updateEncounter.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'DELETE',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(mockEncounterService.updateEncounter).toHaveBeenCalledWith('encounter-1', {
      playerForceId: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter });
  });

  it('should handle clear player force errors', async () => {
    const result = createErrorResult('Cannot clear force from active encounter', EncounterErrorCode.INVALID_STATUS);
    mockEncounterService.updateEncounter.mockReturnValue(result);

    const req = createMockRequest({
      method: 'DELETE',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Cannot clear force from active encounter',
      errorCode: EncounterErrorCode.INVALID_STATUS,
    });
  });
});

describe('Player force - missing ID and exceptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject with missing ID', async () => {
    const req = createMockRequest({
      method: 'PUT',
      query: {},
      body: { forceId: 'force-1' },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle service exceptions', async () => {
    mockEncounterService.setPlayerForce.mockImplementation(() => {
      throw new Error('Service error');
    });

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { forceId: 'force-1' },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service error' });
  });

  it('should reject unsupported methods', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await playerForceHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['PUT', 'DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});

// =============================================================================
// Tests: /api/encounters/[id]/opponent-force
// =============================================================================

describe('PUT /api/encounters/[id]/opponent-force', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set opponent force', async () => {
    const forceId = 'force-2';
    const encounter = createMockEncounter({
      opponentForce: {
        forceId,
        forceName: 'Opponent Force',
        totalBV: 5000,
        unitCount: 4,
      },
    });
    const result = createSuccessResult();

    mockEncounterService.setOpponentForce.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { forceId },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(mockEncounterService.setOpponentForce).toHaveBeenCalledWith('encounter-1', forceId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter });
  });

  it('should reject set without forceId', async () => {
    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: {},
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: forceId' });
    expect(mockEncounterService.setOpponentForce).not.toHaveBeenCalled();
  });

  it('should handle set opponent force errors', async () => {
    const result = createErrorResult('Force not found', EncounterErrorCode.NOT_FOUND);
    mockEncounterService.setOpponentForce.mockReturnValue(result);

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { forceId: 'nonexistent' },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Force not found',
      errorCode: EncounterErrorCode.NOT_FOUND,
    });
  });
});

describe('DELETE /api/encounters/[id]/opponent-force', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear opponent force', async () => {
    const encounter = createMockEncounter({ opponentForce: undefined });
    const result = createSuccessResult();

    mockEncounterService.clearOpponentForce.mockReturnValue(result);
    mockEncounterService.getEncounter.mockReturnValue(encounter);

    const req = createMockRequest({
      method: 'DELETE',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(mockEncounterService.clearOpponentForce).toHaveBeenCalledWith('encounter-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ...result, encounter });
  });

  it('should handle clear opponent force errors', async () => {
    const result = createErrorResult('Cannot clear force from active encounter', EncounterErrorCode.INVALID_STATUS);
    mockEncounterService.clearOpponentForce.mockReturnValue(result);

    const req = createMockRequest({
      method: 'DELETE',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Cannot clear force from active encounter',
      errorCode: EncounterErrorCode.INVALID_STATUS,
    });
  });
});

describe('Opponent force - missing ID and exceptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject with missing ID', async () => {
    const req = createMockRequest({
      method: 'PUT',
      query: {},
      body: { forceId: 'force-2' },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid encounter ID' });
  });

  it('should handle service exceptions', async () => {
    mockEncounterService.setOpponentForce.mockImplementation(() => {
      throw new Error('Service error');
    });

    const req = createMockRequest({
      method: 'PUT',
      query: { id: 'encounter-1' },
      body: { forceId: 'force-2' },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service error' });
  });

  it('should reject unsupported methods', async () => {
    const req = createMockRequest({
      method: 'POST',
      query: { id: 'encounter-1' },
    });
    const res = createMockResponse();

    await opponentForceHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['PUT', 'DELETE']);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
