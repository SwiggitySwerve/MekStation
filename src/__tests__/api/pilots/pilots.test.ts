/**
 * Pilots API Routes - Comprehensive Tests
 * 
 * Tests all pilot API endpoints:
 * - GET/POST /api/pilots - List and create pilots
 * - GET/PUT/DELETE /api/pilots/[id] - Individual pilot operations
 * - POST /api/pilots/[id]/improve-gunnery - Skill improvement
 * - POST /api/pilots/[id]/improve-piloting - Skill improvement
 * - POST /api/pilots/[id]/purchase-ability - Special abilities
 * 
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { NextApiRequest, NextApiResponse } from 'next';
import indexHandler from '@/pages/api/pilots/index';
import idHandler from '@/pages/api/pilots/[id]';
import improveGunneryHandler from '@/pages/api/pilots/[id]/improve-gunnery';
import improvePilotingHandler from '@/pages/api/pilots/[id]/improve-piloting';
import purchaseAbilityHandler from '@/pages/api/pilots/[id]/purchase-ability';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getPilotService, getPilotRepository } from '@/services/pilots';
import { 
  IPilot, 
  PilotType, 
  PilotStatus, 
  PilotExperienceLevel,
  ICreatePilotOptions,
  getAbility,
  meetsPrerequisites,
} from '@/types/pilot';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('@/services/persistence/SQLiteService');
jest.mock('@/services/pilots');
jest.mock('@/types/pilot', () => {
  const actual = jest.requireActual<typeof import('@/types/pilot')>('@/types/pilot');
  return {
    ...actual,
    getAbility: jest.fn(),
    meetsPrerequisites: jest.fn(),
  };
});

const mockSQLiteService = {
  initialize: jest.fn(),
};

const mockPilotService = {
  listPilots: jest.fn(),
  listActivePilots: jest.fn(),
  getPilot: jest.fn(),
  createPilot: jest.fn(),
  createFromTemplate: jest.fn(),
  createRandom: jest.fn(),
  updatePilot: jest.fn(),
  deletePilot: jest.fn(),
  improveGunnery: jest.fn(),
  improvePiloting: jest.fn(),
  canImproveGunnery: jest.fn(),
  canImprovePiloting: jest.fn(),
};

const mockPilotRepository = {
  spendXp: jest.fn(),
  addXp: jest.fn(),
  addAbility: jest.fn(),
};

(getSQLiteService as jest.Mock).mockReturnValue(mockSQLiteService);
(getPilotService as jest.Mock).mockReturnValue(mockPilotService);
(getPilotRepository as jest.Mock).mockReturnValue(mockPilotRepository);

// =============================================================================
// Test Helpers
// =============================================================================

function createMockRequest(method: string, body?: unknown, query?: unknown): NextApiRequest {
  return {
    method,
    body,
    query: query || {},
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
  return res as MockNextApiResponse;
}

function createMockPilot(overrides?: Partial<IPilot>): IPilot {
  return {
    id: 'pilot-1',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    name: 'Test Pilot',
    callsign: 'Ace',
    affiliation: 'Davion',
    skills: {
      gunnery: 4,
      piloting: 5,
    },
    wounds: 0,
    abilities: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: 100,
      totalXpEarned: 100,
      rank: 'MechWarrior',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Test Suite: GET /api/pilots
// =============================================================================

describe('GET /api/pilots - List pilots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should list all pilots when no filter provided', async () => {
    const mockPilots = [
      createMockPilot({ id: 'pilot-1', name: 'Pilot One' }),
      createMockPilot({ id: 'pilot-2', name: 'Pilot Two' }),
    ];

    mockPilotService.listPilots.mockReturnValue(mockPilots);

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(mockSQLiteService.initialize).toHaveBeenCalled();
    expect(mockPilotService.listPilots).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      pilots: mockPilots,
      count: 2,
    });
  });

  it('should list only active pilots when status=active', async () => {
    const mockPilots = [createMockPilot({ id: 'pilot-1', status: PilotStatus.Active })];

    mockPilotService.listActivePilots.mockReturnValue(mockPilots);

    const req = createMockRequest('GET', undefined, { status: 'active' });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(mockPilotService.listActivePilots).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      pilots: mockPilots,
      count: 1,
    });
  });

  it('should return empty array when no pilots exist', async () => {
    mockPilotService.listPilots.mockReturnValue([]);

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      pilots: [],
      count: 0,
    });
  });

  it('should handle database initialization errors', async () => {
    mockSQLiteService.initialize.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
  });

  it('should handle service errors', async () => {
    mockPilotService.listPilots.mockImplementation(() => {
      throw new Error('Service error');
    });

    const req = createMockRequest('GET');
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service error' });
  });
});

// =============================================================================
// Test Suite: POST /api/pilots - Create pilot
// =============================================================================

describe('POST /api/pilots - Create pilot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should create pilot with full mode', async () => {
    const options: ICreatePilotOptions = {
      identity: {
        name: 'New Pilot',
        callsign: 'Rookie',
      },
      type: PilotType.Persistent,
      skills: {
        gunnery: 4,
        piloting: 5,
      },
    };

    const mockPilot = createMockPilot({ id: 'new-pilot-1', name: 'New Pilot' });

    mockPilotService.createPilot.mockReturnValue({
      success: true,
      id: 'new-pilot-1',
    });
    mockPilotService.getPilot.mockReturnValue(mockPilot);

    const req = createMockRequest('POST', { mode: 'full', options });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(mockPilotService.createPilot).toHaveBeenCalledWith(options);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      id: 'new-pilot-1',
      pilot: mockPilot,
    });
  });

  it('should create pilot from template', async () => {
    const identity = {
      name: 'Veteran Pilot',
      callsign: 'Vet',
    };

    const mockPilot = createMockPilot({ id: 'vet-1', name: 'Veteran Pilot' });

    mockPilotService.createFromTemplate.mockReturnValue({
      success: true,
      id: 'vet-1',
    });
    mockPilotService.getPilot.mockReturnValue(mockPilot);

    const req = createMockRequest('POST', {
      mode: 'template',
      template: PilotExperienceLevel.Veteran,
      identity,
    });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(mockPilotService.createFromTemplate).toHaveBeenCalledWith(
      PilotExperienceLevel.Veteran,
      identity
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      id: 'vet-1',
      pilot: mockPilot,
    });
  });

  it('should create random pilot', async () => {
    const identity = {
      name: 'Random Pilot',
    };

    const mockPilot = createMockPilot({ id: 'random-1', name: 'Random Pilot' });

    mockPilotService.createRandom.mockReturnValue({
      success: true,
      id: 'random-1',
    });
    mockPilotService.getPilot.mockReturnValue(mockPilot);

    const req = createMockRequest('POST', {
      mode: 'random',
      identity,
    });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(mockPilotService.createRandom).toHaveBeenCalledWith(identity);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should reject request without mode', async () => {
    const req = createMockRequest('POST', {});
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required field: mode (full | template | random)',
    });
  });

  it('should reject full mode without options', async () => {
    const req = createMockRequest('POST', { mode: 'full' });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required field: options (for full mode)',
    });
  });

  it('should reject template mode without template or identity', async () => {
    const req = createMockRequest('POST', { mode: 'template' });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: template, identity (for template mode)',
    });
  });

  it('should reject random mode without identity', async () => {
    const req = createMockRequest('POST', { mode: 'random' });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required field: identity (for random mode)',
    });
  });

  it('should reject invalid mode', async () => {
    const req = createMockRequest('POST', { mode: 'invalid' });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid mode: invalid. Must be full, template, or random',
    });
  });

  it('should handle service creation failure', async () => {
    const options: ICreatePilotOptions = {
      identity: { name: 'Test' },
      type: PilotType.Persistent,
      skills: { gunnery: 4, piloting: 5 },
    };

    mockPilotService.createPilot.mockReturnValue({
      success: false,
      error: 'Invalid pilot data',
      errorCode: 'VALIDATION_ERROR',
    });

    const req = createMockRequest('POST', { mode: 'full', options });
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid pilot data',
      errorCode: 'VALIDATION_ERROR',
    });
  });

  it('should reject unsupported HTTP methods', async () => {
    const req = createMockRequest('PATCH');
    const res = createMockResponse();

    await indexHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method PATCH Not Allowed' });
  });
});

// =============================================================================
// Test Suite: GET /api/pilots/[id]
// =============================================================================

describe('GET /api/pilots/[id] - Get pilot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should get pilot by ID', async () => {
    const mockPilot = createMockPilot({ id: 'pilot-1' });
    mockPilotService.getPilot.mockReturnValue(mockPilot);

    const req = createMockRequest('GET', undefined, { id: 'pilot-1' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(mockPilotService.getPilot).toHaveBeenCalledWith('pilot-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ pilot: mockPilot });
  });

  it('should return 404 for non-existent pilot', async () => {
    mockPilotService.getPilot.mockReturnValue(null);

    const req = createMockRequest('GET', undefined, { id: 'non-existent' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Pilot non-existent not found' });
  });

  it('should reject invalid ID type', async () => {
    const req = createMockRequest('GET', undefined, { id: ['invalid', 'array'] });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid pilot ID' });
  });
});

// =============================================================================
// Test Suite: PUT /api/pilots/[id] - Update pilot
// =============================================================================

describe('PUT /api/pilots/[id] - Update pilot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should update pilot', async () => {
    const updates = {
      name: 'Updated Name',
      callsign: 'NewCallsign',
      status: PilotStatus.Injured,
    };

    const updatedPilot = createMockPilot({ ...updates });

    mockPilotService.updatePilot.mockReturnValue({ success: true });
    mockPilotService.getPilot.mockReturnValue(updatedPilot);

    const req = createMockRequest('PUT', updates, { id: 'pilot-1' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(mockPilotService.updatePilot).toHaveBeenCalledWith('pilot-1', updates);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      pilot: updatedPilot,
    });
  });

  it('should filter out immutable fields', async () => {
    const body = {
      id: 'new-id', // Should be filtered
      type: PilotType.Statblock, // Should be filtered
      createdAt: '2099-01-01', // Should be filtered
      name: 'Updated Name', // Should be kept
    };

    mockPilotService.updatePilot.mockReturnValue({ success: true });
    mockPilotService.getPilot.mockReturnValue(createMockPilot({ name: 'Updated Name' }));

    const req = createMockRequest('PUT', body, { id: 'pilot-1' });
    const res = createMockResponse();

    await idHandler(req, res);

    // Verify immutable fields were stripped
    expect(mockPilotService.updatePilot).toHaveBeenCalledWith('pilot-1', {
      name: 'Updated Name',
    });
  });

  it('should handle update failure', async () => {
    mockPilotService.updatePilot.mockReturnValue({
      success: false,
      error: 'Pilot not found',
      errorCode: 'NOT_FOUND',
    });

    const req = createMockRequest('PUT', { name: 'New Name' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Pilot not found',
      errorCode: 'NOT_FOUND',
    });
  });
});

// =============================================================================
// Test Suite: DELETE /api/pilots/[id]
// =============================================================================

describe('DELETE /api/pilots/[id] - Delete pilot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should delete pilot', async () => {
    mockPilotService.deletePilot.mockReturnValue({ success: true });

    const req = createMockRequest('DELETE', undefined, { id: 'pilot-1' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(mockPilotService.deletePilot).toHaveBeenCalledWith('pilot-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should handle delete failure (pilot not found)', async () => {
    mockPilotService.deletePilot.mockReturnValue({
      success: false,
      error: 'Pilot not found',
      errorCode: 'NOT_FOUND',
    });

    const req = createMockRequest('DELETE', undefined, { id: 'non-existent' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Pilot not found',
      errorCode: 'NOT_FOUND',
    });
  });

  it('should reject unsupported methods on [id] route', async () => {
    const req = createMockRequest('PATCH', undefined, { id: 'pilot-1' });
    const res = createMockResponse();

    await idHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE']);
  });
});

// =============================================================================
// Test Suite: POST /api/pilots/[id]/improve-gunnery
// =============================================================================

describe('POST /api/pilots/[id]/improve-gunnery - Improve gunnery skill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should improve gunnery skill successfully', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 4, piloting: 5 },
      career: {
        ...createMockPilot().career!,
        xp: 200,
      },
    });

    const improvedPilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 3, piloting: 5 },
      career: {
        ...createMockPilot().career!,
        xp: 0, // 200 - 200 cost
      },
    });

    mockPilotService.getPilot.mockReturnValueOnce(pilot).mockReturnValueOnce(improvedPilot);
    mockPilotService.canImproveGunnery.mockReturnValue({ canImprove: true, cost: 200 });
    mockPilotService.improveGunnery.mockReturnValue({ success: true });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improveGunneryHandler(req, res);

    expect(mockPilotService.improveGunnery).toHaveBeenCalledWith('pilot-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      newGunnery: 3,
      xpSpent: 200,
      xpRemaining: 0,
    });
  });

  it('should reject improvement when at max skill (gunnery 1)', async () => {
    const pilot = createMockPilot({
      skills: { gunnery: 1, piloting: 5 },
      career: { ...createMockPilot().career!, xp: 1000 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockPilotService.canImproveGunnery.mockReturnValue({ canImprove: false, cost: null });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improveGunneryHandler(req, res);

    expect(mockPilotService.improveGunnery).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Gunnery is already at maximum (1)',
    });
  });

  it('should reject improvement when insufficient XP', async () => {
    const pilot = createMockPilot({
      skills: { gunnery: 4, piloting: 5 },
      career: { ...createMockPilot().career!, xp: 50 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockPilotService.canImproveGunnery.mockReturnValue({ canImprove: false, cost: 200 });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improveGunneryHandler(req, res);

    expect(mockPilotService.improveGunnery).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Insufficient XP. Need 200, have 50',
    });
  });

  it('should handle pilot not found', async () => {
    mockPilotService.getPilot.mockReturnValue(null);

    const req = createMockRequest('POST', {}, { id: 'non-existent' });
    const res = createMockResponse();

    await improveGunneryHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Pilot non-existent not found',
    });
  });

  it('should reject non-POST methods', async () => {
    const req = createMockRequest('GET', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improveGunneryHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
  });
});

// =============================================================================
// Test Suite: POST /api/pilots/[id]/improve-piloting
// =============================================================================

describe('POST /api/pilots/[id]/improve-piloting - Improve piloting skill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should improve piloting skill successfully', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 4, piloting: 5 },
      career: {
        ...createMockPilot().career!,
        xp: 150,
      },
    });

    const improvedPilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 4, piloting: 4 },
      career: {
        ...createMockPilot().career!,
        xp: 0, // 150 - 150 cost
      },
    });

    mockPilotService.getPilot.mockReturnValueOnce(pilot).mockReturnValueOnce(improvedPilot);
    mockPilotService.canImprovePiloting.mockReturnValue({ canImprove: true, cost: 150 });
    mockPilotService.improvePiloting.mockReturnValue({ success: true });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improvePilotingHandler(req, res);

    expect(mockPilotService.improvePiloting).toHaveBeenCalledWith('pilot-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      newPiloting: 4,
      xpSpent: 150,
      xpRemaining: 0,
    });
  });

  it('should reject improvement when at max skill (piloting 1)', async () => {
    const pilot = createMockPilot({
      skills: { gunnery: 4, piloting: 1 },
      career: { ...createMockPilot().career!, xp: 1000 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockPilotService.canImprovePiloting.mockReturnValue({ canImprove: false, cost: null });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improvePilotingHandler(req, res);

    expect(mockPilotService.improvePiloting).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Piloting is already at maximum (1)',
    });
  });

  it('should reject improvement when insufficient XP', async () => {
    const pilot = createMockPilot({
      skills: { gunnery: 4, piloting: 5 },
      career: { ...createMockPilot().career!, xp: 20 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockPilotService.canImprovePiloting.mockReturnValue({ canImprove: false, cost: 75 });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improvePilotingHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Insufficient XP. Need 75, have 20',
    });
  });

  it('should handle service improvement failure', async () => {
    const pilot = createMockPilot({
      skills: { gunnery: 4, piloting: 5 },
      career: { ...createMockPilot().career!, xp: 150 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockPilotService.canImprovePiloting.mockReturnValue({ canImprove: true, cost: 75 });
    mockPilotService.improvePiloting.mockReturnValue({
      success: false,
      error: 'Update failed',
    });

    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await improvePilotingHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Update failed',
    });
  });
});

// =============================================================================
// Test Suite: POST /api/pilots/[id]/purchase-ability
// =============================================================================

const mockGetAbility = getAbility as jest.Mock;
const mockMeetsPrerequisites = meetsPrerequisites as jest.Mock;

describe('POST /api/pilots/[id]/purchase-ability - Purchase special ability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSQLiteService.initialize.mockImplementation(() => {});
  });

  it('should purchase ability successfully', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 3, piloting: 4 },
      abilities: [],
      career: { ...createMockPilot().career!, xp: 100 },
    });

    const updatedPilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 3, piloting: 4 },
      abilities: [{ abilityId: 'marksman', acquiredDate: '2024-01-01' }],
      career: { ...createMockPilot().career!, xp: 25 }, // 100 - 75
    });

    mockPilotService.getPilot.mockReturnValueOnce(pilot).mockReturnValueOnce(updatedPilot);
    mockGetAbility.mockReturnValue({ id: 'marksman', name: 'Marksman', xpCost: 75 });
    mockMeetsPrerequisites.mockReturnValue({ meets: true, missing: [] });
    mockPilotRepository.spendXp.mockReturnValue({ success: true });
    mockPilotRepository.addAbility.mockReturnValue({ success: true });

    const req = createMockRequest('POST', { abilityId: 'marksman' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(mockPilotRepository.spendXp).toHaveBeenCalledWith('pilot-1', 75);
    expect(mockPilotRepository.addAbility).toHaveBeenCalledWith('pilot-1', 'marksman');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      abilityId: 'marksman',
      xpSpent: 75,
      xpRemaining: 25,
    });
  });

  it('should reject purchase when missing abilityId', async () => {
    const req = createMockRequest('POST', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Missing abilityId in request body',
    });
  });

  it('should reject unknown ability', async () => {
    const pilot = createMockPilot({ id: 'pilot-1' });
    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue(undefined); // Unknown ability

    const req = createMockRequest('POST', { abilityId: 'unknown-ability' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown ability: unknown-ability',
    });
  });

  it('should reject ability already owned', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 3, piloting: 4 },
      abilities: [{ abilityId: 'marksman', acquiredDate: '2024-01-01' }],
      career: { ...createMockPilot().career!, xp: 100 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue({ id: 'marksman', name: 'Marksman', xpCost: 75 });

    const req = createMockRequest('POST', { abilityId: 'marksman' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Pilot already has ability: Marksman',
    });
  });

  it('should reject when prerequisites not met (missing prerequisite ability)', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 2, piloting: 3 }, // Skills are fine
      abilities: [], // Missing 'weapon-specialist' and 'marksman'
      career: { ...createMockPilot().career!, xp: 200 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue({ id: 'sniper', name: 'Sniper', xpCost: 100 });
    mockMeetsPrerequisites.mockReturnValue({ meets: false, missing: ['weapon-specialist', 'marksman'] });

    const req = createMockRequest('POST', { abilityId: 'sniper' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Prerequisites not met') as string,
      })
    );
  });

  it('should reject when skill requirements not met', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 5, piloting: 5 }, // Gunnery too low (need 4 or better)
      abilities: [],
      career: { ...createMockPilot().career!, xp: 100 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue({ id: 'weapon-specialist', name: 'Weapon Specialist', xpCost: 50 });
    mockMeetsPrerequisites.mockReturnValue({ meets: false, missing: ['Gunnery 4 or better'] });

    const req = createMockRequest('POST', { abilityId: 'weapon-specialist' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Prerequisites not met') as string,
      })
    );
  });

  it('should reject when insufficient XP', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 4, piloting: 5 },
      abilities: [],
      career: { ...createMockPilot().career!, xp: 25 }, // Not enough for weapon-specialist (50)
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue({ id: 'weapon-specialist', name: 'Weapon Specialist', xpCost: 50 });
    mockMeetsPrerequisites.mockReturnValue({ meets: true, missing: [] });

    const req = createMockRequest('POST', { abilityId: 'weapon-specialist' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Insufficient XP. Need 50, have 25',
    });
  });

  it('should refund XP when ability add fails', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 4, piloting: 5 },
      abilities: [],
      career: { ...createMockPilot().career!, xp: 100 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue({ id: 'weapon-specialist', name: 'Weapon Specialist', xpCost: 50 });
    mockMeetsPrerequisites.mockReturnValue({ meets: true, missing: [] });
    mockPilotRepository.spendXp.mockReturnValue({ success: true });
    mockPilotRepository.addAbility.mockReturnValue({
      success: false,
      error: 'Database error',
    });

    const req = createMockRequest('POST', { abilityId: 'weapon-specialist' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(mockPilotRepository.addXp).toHaveBeenCalledWith('pilot-1', 50); // Refund
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Database error',
    });
  });

  it('should reject when XP spend fails', async () => {
    const pilot = createMockPilot({
      id: 'pilot-1',
      skills: { gunnery: 4, piloting: 5 },
      abilities: [],
      career: { ...createMockPilot().career!, xp: 100 },
    });

    mockPilotService.getPilot.mockReturnValue(pilot);
    mockGetAbility.mockReturnValue({ id: 'weapon-specialist', name: 'Weapon Specialist', xpCost: 50 });
    mockMeetsPrerequisites.mockReturnValue({ meets: true, missing: [] });
    mockPilotRepository.spendXp.mockReturnValue({
      success: false,
      error: 'Failed to deduct XP',
    });

    const req = createMockRequest('POST', { abilityId: 'weapon-specialist' }, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(mockPilotRepository.addAbility).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to deduct XP',
    });
  });

  it('should reject non-POST methods', async () => {
    const req = createMockRequest('GET', {}, { id: 'pilot-1' });
    const res = createMockResponse();

    await purchaseAbilityHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
  });
});
