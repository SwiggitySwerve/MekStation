/**
 * Pilot Service Tests
 *
 * Comprehensive tests for the PilotService business logic layer.
 * Tests cover CRUD operations, skill advancement, XP operations, wounds, and validation.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import {
  IPilot,
  IPilotIdentity,
  PilotType,
  PilotStatus,
  PilotExperienceLevel,
  PILOT_TEMPLATES,
  XP_AWARDS,
  MIN_SKILL_VALUE,
  MAX_SKILL_VALUE,
} from '@/types/pilot';
import { IPilotOperationResult, PilotErrorCode } from '../PilotRepository';

// =============================================================================
// Mock Repository
// =============================================================================

// Mock pilot storage
const mockPilots = new Map<string, IPilot>();
let mockIdCounter = 0;

// Mock repository implementation
const mockRepository = {
  create: jest.fn((options: {
    identity: IPilotIdentity;
    type: PilotType;
    skills: { gunnery: number; piloting: number };
    startingXp?: number;
    rank?: string;
    abilityIds?: readonly string[];
  }): IPilotOperationResult => {
    const id = `pilot-${++mockIdCounter}`;
    const now = new Date().toISOString();
    const pilot: IPilot = {
      id,
      name: options.identity.name,
      callsign: options.identity.callsign,
      affiliation: options.identity.affiliation,
      portrait: options.identity.portrait,
      background: options.identity.background,
      type: options.type,
      status: PilotStatus.Active,
      skills: options.skills,
      wounds: 0,
      abilities: (options.abilityIds || []).map((abilityId) => ({
        abilityId,
        acquiredDate: now,
      })),
      career: options.type === PilotType.Persistent ? {
        missionsCompleted: 0,
        victories: 0,
        defeats: 0,
        draws: 0,
        totalKills: 0,
        killRecords: [],
        missionHistory: [],
        xp: options.startingXp || 0,
        totalXpEarned: options.startingXp || 0,
        rank: options.rank || 'MechWarrior',
      } : undefined,
      createdAt: now,
      updatedAt: now,
    };
    mockPilots.set(id, pilot);
    return { success: true, id };
  }),

  update: jest.fn((id: string, updates: Partial<IPilot>): IPilotOperationResult => {
    const pilot = mockPilots.get(id);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${id} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }
    const updated: IPilot = {
      ...pilot,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    mockPilots.set(id, updated);
    return { success: true, id };
  }),

  delete: jest.fn((id: string): IPilotOperationResult => {
    if (!mockPilots.has(id)) {
      return {
        success: false,
        error: `Pilot ${id} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }
    mockPilots.delete(id);
    return { success: true, id };
  }),

  getById: jest.fn((id: string): IPilot | null => {
    return mockPilots.get(id) ?? null;
  }),

  list: jest.fn((): readonly IPilot[] => {
    return Array.from(mockPilots.values());
  }),

  listByStatus: jest.fn((status: PilotStatus): readonly IPilot[] => {
    return Array.from(mockPilots.values()).filter((p) => p.status === status);
  }),

  exists: jest.fn((id: string): boolean => {
    return mockPilots.has(id);
  }),

  recordMission: jest.fn((
    pilotId: string,
    mission: {
      gameId: string;
      missionName: string;
      outcome: 'victory' | 'defeat' | 'draw';
      xpEarned: number;
      kills: number;
    }
  ): IPilotOperationResult => {
    const pilot = mockPilots.get(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }
    if (!pilot.career) {
      return { success: true, id: pilotId };
    }
    
    const outcomeKey = mission.outcome === 'victory' ? 'victories' 
      : mission.outcome === 'defeat' ? 'defeats' : 'draws';
    
    const updated: IPilot = {
      ...pilot,
      career: {
        ...pilot.career,
        missionsCompleted: pilot.career.missionsCompleted + 1,
        [outcomeKey]: pilot.career[outcomeKey] + 1,
        xp: pilot.career.xp + mission.xpEarned,
        totalXpEarned: pilot.career.totalXpEarned + mission.xpEarned,
        missionHistory: [
          ...pilot.career.missionHistory,
          {
            gameId: mission.gameId,
            missionName: mission.missionName,
            date: new Date().toISOString(),
            outcome: mission.outcome,
            xpEarned: mission.xpEarned,
            kills: mission.kills,
          },
        ],
      },
      updatedAt: new Date().toISOString(),
    };
    mockPilots.set(pilotId, updated);
    return { success: true, id: pilotId };
  }),

  spendXp: jest.fn((pilotId: string, amount: number): IPilotOperationResult => {
    const pilot = mockPilots.get(pilotId);
    if (!pilot) {
      return {
        success: false,
        error: `Pilot ${pilotId} not found`,
        errorCode: PilotErrorCode.NOT_FOUND,
      };
    }
    if (!pilot.career || pilot.career.xp < amount) {
      return {
        success: false,
        error: `Insufficient XP. Have ${pilot.career?.xp || 0}, need ${amount}`,
        errorCode: PilotErrorCode.INSUFFICIENT_XP,
      };
    }
    const updated: IPilot = {
      ...pilot,
      career: {
        ...pilot.career,
        xp: pilot.career.xp - amount,
      },
      updatedAt: new Date().toISOString(),
    };
    mockPilots.set(pilotId, updated);
    return { success: true, id: pilotId };
  }),
};

// Mock the PilotRepository module
jest.mock('../PilotRepository', () => ({
  getPilotRepository: () => mockRepository,
  PilotErrorCode: {
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_NAME: 'DUPLICATE_NAME',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INSUFFICIENT_XP: 'INSUFFICIENT_XP',
  },
}));

// Import after mocks
import { PilotService, resetPilotService } from '../PilotService';

// =============================================================================
// Helper Functions
// =============================================================================

function createMockIdentity(name: string): IPilotIdentity {
  return {
    name,
    callsign: `${name}-1`,
    affiliation: 'Test Unit',
  };
}

function clearMocks(): void {
  mockPilots.clear();
  mockIdCounter = 0;
  jest.clearAllMocks();
}

// =============================================================================
// Tests
// =============================================================================

describe('PilotService', () => {
  let service: PilotService;

  beforeEach(() => {
    clearMocks();
    resetPilotService();
    service = new PilotService();
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('createPilot', () => {
      it('should create a pilot with valid options', () => {
        const result = service.createPilot({
          identity: createMockIdentity('John Doe'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });

        expect(result.success).toBe(true);
        expect(result.id).toBeDefined();
        expect(mockRepository.create).toHaveBeenCalledTimes(1);
      });

      it('should reject pilot with empty name', () => {
        const result = service.createPilot({
          identity: { name: '' },
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('name is required');
        expect(result.errorCode).toBe(PilotErrorCode.VALIDATION_ERROR);
      });

      it('should reject pilot with whitespace-only name', () => {
        const result = service.createPilot({
          identity: { name: '   ' },
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('name is required');
      });

      it('should reject pilot with invalid gunnery skill', () => {
        const result = service.createPilot({
          identity: createMockIdentity('Invalid Gunnery'),
          type: PilotType.Persistent,
          skills: { gunnery: 0, piloting: 5 },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Gunnery must be between');
      });

      it('should reject pilot with invalid piloting skill', () => {
        const result = service.createPilot({
          identity: createMockIdentity('Invalid Piloting'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 10 },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Piloting must be between');
      });

      it('should accept pilot with edge case skill values', () => {
        const result1 = service.createPilot({
          identity: createMockIdentity('Min Skills'),
          type: PilotType.Persistent,
          skills: { gunnery: MIN_SKILL_VALUE, piloting: MIN_SKILL_VALUE },
        });
        expect(result1.success).toBe(true);

        const result2 = service.createPilot({
          identity: createMockIdentity('Max Skills'),
          type: PilotType.Persistent,
          skills: { gunnery: MAX_SKILL_VALUE, piloting: MAX_SKILL_VALUE },
        });
        expect(result2.success).toBe(true);
      });
    });

    describe('createFromTemplate', () => {
      it('should create a Green pilot with correct skills', () => {
        const result = service.createFromTemplate(
          PilotExperienceLevel.Green,
          createMockIdentity('Green Pilot')
        );

        expect(result.success).toBe(true);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            skills: PILOT_TEMPLATES[PilotExperienceLevel.Green].skills,
            startingXp: PILOT_TEMPLATES[PilotExperienceLevel.Green].startingXp,
            rank: 'Cadet',
          })
        );
      });

      it('should create a Regular pilot with correct skills', () => {
        const result = service.createFromTemplate(
          PilotExperienceLevel.Regular,
          createMockIdentity('Regular Pilot')
        );

        expect(result.success).toBe(true);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            skills: PILOT_TEMPLATES[PilotExperienceLevel.Regular].skills,
            rank: 'MechWarrior',
          })
        );
      });

      it('should create a Veteran pilot with correct skills', () => {
        const result = service.createFromTemplate(
          PilotExperienceLevel.Veteran,
          createMockIdentity('Veteran Pilot')
        );

        expect(result.success).toBe(true);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            skills: PILOT_TEMPLATES[PilotExperienceLevel.Veteran].skills,
            startingXp: PILOT_TEMPLATES[PilotExperienceLevel.Veteran].startingXp,
            rank: 'Sergeant',
          })
        );
      });

      it('should create an Elite pilot with correct skills', () => {
        const result = service.createFromTemplate(
          PilotExperienceLevel.Elite,
          createMockIdentity('Elite Pilot')
        );

        expect(result.success).toBe(true);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            skills: PILOT_TEMPLATES[PilotExperienceLevel.Elite].skills,
            startingXp: PILOT_TEMPLATES[PilotExperienceLevel.Elite].startingXp,
            rank: 'Lieutenant',
          })
        );
      });
    });

    describe('createRandom', () => {
      it('should create a random pilot', () => {
        // Mock Math.random for deterministic results
        const mockRandom = jest.spyOn(Math, 'random');
        mockRandom.mockReturnValue(0.5); // Should give piloting=5, gunnery=5, no ability

        const result = service.createRandom(createMockIdentity('Random Pilot'));

        expect(result.success).toBe(true);
        expect(mockRepository.create).toHaveBeenCalledTimes(1);

        mockRandom.mockRestore();
      });

      it('should create pilots with weighted skill distribution', () => {
        const mockRandom = jest.spyOn(Math, 'random');
        
        // Test veteran roll (10%)
        mockRandom.mockReturnValue(0.05);
        service.createRandom(createMockIdentity('Veteran Roll'));
        expect(mockRepository.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            skills: expect.objectContaining({ gunnery: 3 }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          })
        );

        // Test untrained roll (20%)
        mockRandom.mockReturnValue(0.2);
        service.createRandom(createMockIdentity('Untrained Roll'));
        expect(mockRepository.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            skills: expect.objectContaining({ gunnery: 6 }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          })
        );

        // Test green roll (30%)
        mockRandom.mockReturnValue(0.5);
        service.createRandom(createMockIdentity('Green Roll'));
        expect(mockRepository.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            skills: expect.objectContaining({ gunnery: 5 }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          })
        );

        // Test regular roll (40%)
        mockRandom.mockReturnValue(0.9);
        service.createRandom(createMockIdentity('Regular Roll'));
        expect(mockRepository.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            skills: expect.objectContaining({ gunnery: 4 }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          })
        );

        mockRandom.mockRestore();
      });
    });

    describe('createStatblock', () => {
      it('should create a statblock pilot (not persisted)', () => {
        const pilot = service.createStatblock({
          name: 'NPC Pilot',
          gunnery: 4,
          piloting: 5,
        });

        expect(pilot.id).toMatch(/^statblock-/);
        expect(pilot.name).toBe('NPC Pilot');
        expect(pilot.type).toBe(PilotType.Statblock);
        expect(pilot.status).toBe(PilotStatus.Active);
        expect(pilot.skills.gunnery).toBe(4);
        expect(pilot.skills.piloting).toBe(5);
        expect(pilot.wounds).toBe(0);
        expect(pilot.abilities).toEqual([]);
        expect(mockRepository.create).not.toHaveBeenCalled();
      });

      it('should create a statblock pilot with abilities', () => {
        const pilot = service.createStatblock({
          name: 'NPC with Abilities',
          gunnery: 3,
          piloting: 4,
          abilityIds: ['marksman', 'dodge'],
        });

        expect(pilot.abilities).toHaveLength(2);
        expect(pilot.abilities[0].abilityId).toBe('marksman');
        expect(pilot.abilities[1].abilityId).toBe('dodge');
      });
    });

    describe('updatePilot', () => {
      it('should update a pilot', () => {
        service.createPilot({
          identity: createMockIdentity('Update Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.updatePilot(id, { callsign: 'Updated Callsign' });

        expect(result.success).toBe(true);
        expect(mockRepository.update).toHaveBeenCalledWith(id, { callsign: 'Updated Callsign' });
      });

      it('should return error for non-existent pilot', () => {
        const result = service.updatePilot('non-existent', { callsign: 'Test' });

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(PilotErrorCode.NOT_FOUND);
      });
    });

    describe('deletePilot', () => {
      it('should delete a pilot', () => {
        service.createPilot({
          identity: createMockIdentity('Delete Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.deletePilot(id);

        expect(result.success).toBe(true);
        expect(mockRepository.delete).toHaveBeenCalledWith(id);
      });

      it('should return error for non-existent pilot', () => {
        const result = service.deletePilot('non-existent');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(PilotErrorCode.NOT_FOUND);
      });
    });

    describe('getPilot', () => {
      it('should get a pilot by ID', () => {
        service.createPilot({
          identity: createMockIdentity('Get Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const pilot = service.getPilot(id);

        expect(pilot).not.toBeNull();
        expect(pilot?.name).toBe('Get Test');
      });

      it('should return null for non-existent pilot', () => {
        const pilot = service.getPilot('non-existent');

        expect(pilot).toBeNull();
      });
    });

    describe('listPilots', () => {
      it('should list all pilots', () => {
        service.createPilot({
          identity: createMockIdentity('Pilot 1'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        service.createPilot({
          identity: createMockIdentity('Pilot 2'),
          type: PilotType.Persistent,
          skills: { gunnery: 3, piloting: 4 },
        });

        const pilots = service.listPilots();

        expect(pilots).toHaveLength(2);
        expect(mockRepository.list).toHaveBeenCalled();
      });
    });

    describe('listActivePilots', () => {
      it('should list only active pilots', () => {
        service.createPilot({
          identity: createMockIdentity('Active Pilot'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });

        service.listActivePilots();

        expect(mockRepository.listByStatus).toHaveBeenCalledWith(PilotStatus.Active);
      });
    });
  });

  // ===========================================================================
  // Skill Advancement
  // ===========================================================================

  describe('Skill Advancement', () => {
    describe('canImproveGunnery', () => {
      it('should return true when pilot has enough XP', () => {
        service.createPilot({
          identity: createMockIdentity('Can Improve'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
          startingXp: 500,
        });
        const pilot = service.getPilot('pilot-1')!;

        const result = service.canImproveGunnery(pilot);

        expect(result.canImprove).toBe(true);
        expect(result.cost).toBe(200); // Cost to improve from 4
      });

      it('should return false when pilot lacks XP', () => {
        service.createPilot({
          identity: createMockIdentity('No XP'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
          startingXp: 50,
        });
        const pilot = service.getPilot('pilot-1')!;

        const result = service.canImproveGunnery(pilot);

        expect(result.canImprove).toBe(false);
        expect(result.cost).toBe(200);
      });

      it('should return null cost when at max gunnery (1)', () => {
        service.createPilot({
          identity: createMockIdentity('Max Gunnery'),
          type: PilotType.Persistent,
          skills: { gunnery: 1, piloting: 5 },
          startingXp: 1000,
        });
        const pilot = service.getPilot('pilot-1')!;

        const result = service.canImproveGunnery(pilot);

        expect(result.canImprove).toBe(false);
        expect(result.cost).toBeNull();
      });
    });

    describe('canImprovePiloting', () => {
      it('should return true when pilot has enough XP', () => {
        service.createPilot({
          identity: createMockIdentity('Can Improve Piloting'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
          startingXp: 100,
        });
        const pilot = service.getPilot('pilot-1')!;

        const result = service.canImprovePiloting(pilot);

        expect(result.canImprove).toBe(true);
        expect(result.cost).toBe(75); // Cost to improve from 5
      });

      it('should return null cost when at max piloting (1)', () => {
        service.createPilot({
          identity: createMockIdentity('Max Piloting'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 1 },
          startingXp: 1000,
        });
        const pilot = service.getPilot('pilot-1')!;

        const result = service.canImprovePiloting(pilot);

        expect(result.canImprove).toBe(false);
        expect(result.cost).toBeNull();
      });
    });

    describe('improveGunnery', () => {
      it('should improve gunnery and spend XP', () => {
        service.createPilot({
          identity: createMockIdentity('Improve Gunnery'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
          startingXp: 500,
        });
        const id = 'pilot-1';

        const result = service.improveGunnery(id);

        expect(result.success).toBe(true);
        expect(mockRepository.spendXp).toHaveBeenCalledWith(id, 200);
        expect(mockRepository.update).toHaveBeenCalledWith(id, {
          skills: { gunnery: 3, piloting: 5 },
        });
      });

      it('should return error for non-existent pilot', () => {
        const result = service.improveGunnery('non-existent');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(PilotErrorCode.NOT_FOUND);
      });

      it('should return error when at max gunnery', () => {
        service.createPilot({
          identity: createMockIdentity('Max Gunnery'),
          type: PilotType.Persistent,
          skills: { gunnery: 1, piloting: 5 },
          startingXp: 1000,
        });
        const id = 'pilot-1';

        const result = service.improveGunnery(id);

        expect(result.success).toBe(false);
        expect(result.error).toContain('already at maximum');
        expect(result.errorCode).toBe(PilotErrorCode.VALIDATION_ERROR);
      });

      it('should return error when insufficient XP', () => {
        service.createPilot({
          identity: createMockIdentity('No XP'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
          startingXp: 50,
        });
        const id = 'pilot-1';

        const result = service.improveGunnery(id);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Insufficient XP');
        expect(result.errorCode).toBe(PilotErrorCode.INSUFFICIENT_XP);
      });
    });

    describe('improvePiloting', () => {
      it('should improve piloting and spend XP', () => {
        service.createPilot({
          identity: createMockIdentity('Improve Piloting'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
          startingXp: 100,
        });
        const id = 'pilot-1';

        const result = service.improvePiloting(id);

        expect(result.success).toBe(true);
        expect(mockRepository.spendXp).toHaveBeenCalledWith(id, 75);
        expect(mockRepository.update).toHaveBeenCalledWith(id, {
          skills: { gunnery: 4, piloting: 4 },
        });
      });

      it('should return error when at max piloting', () => {
        service.createPilot({
          identity: createMockIdentity('Max Piloting'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 1 },
          startingXp: 1000,
        });
        const id = 'pilot-1';

        const result = service.improvePiloting(id);

        expect(result.success).toBe(false);
        expect(result.error).toContain('already at maximum');
        expect(result.errorCode).toBe(PilotErrorCode.VALIDATION_ERROR);
      });
    });
  });

  // ===========================================================================
  // XP Operations
  // ===========================================================================

  describe('XP Operations', () => {
    describe('awardMissionXp', () => {
      it('should award base survival XP', () => {
        service.createPilot({
          identity: createMockIdentity('XP Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'draw', 0);

        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            outcome: 'draw',
            xpEarned: XP_AWARDS.missionSurvival,
            kills: 0,
          })
        );
      });

      it('should award XP for kills', () => {
        service.createPilot({
          identity: createMockIdentity('Killer'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'draw', 3);

        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            xpEarned: XP_AWARDS.missionSurvival + (3 * XP_AWARDS.kill),
          })
        );
      });

      it('should award victory bonus', () => {
        service.createPilot({
          identity: createMockIdentity('Victor'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'victory', 0);

        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            xpEarned: XP_AWARDS.missionSurvival + XP_AWARDS.victoryBonus,
          })
        );
      });

      it('should not award victory bonus for defeat', () => {
        service.createPilot({
          identity: createMockIdentity('Loser'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'defeat', 0);

        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            xpEarned: XP_AWARDS.missionSurvival,
          })
        );
      });

      it('should award first blood bonus', () => {
        service.createPilot({
          identity: createMockIdentity('First Blood'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'draw', 1, { firstBlood: true });

        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            xpEarned: XP_AWARDS.missionSurvival + XP_AWARDS.kill + XP_AWARDS.firstBlood,
          })
        );
      });

      it('should award higher BV opponent bonus', () => {
        service.createPilot({
          identity: createMockIdentity('Giant Killer'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'victory', 1, { higherBVOpponent: true });

        const expectedXp = XP_AWARDS.missionSurvival + 
          XP_AWARDS.kill + 
          XP_AWARDS.victoryBonus + 
          XP_AWARDS.higherBVOpponent;
        
        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            xpEarned: expectedXp,
          })
        );
      });

      it('should combine all bonuses', () => {
        service.createPilot({
          identity: createMockIdentity('Max Bonus'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.awardMissionXp(id, 'victory', 2, {
          firstBlood: true,
          higherBVOpponent: true,
        });

        const expectedXp = XP_AWARDS.missionSurvival +
          (2 * XP_AWARDS.kill) +
          XP_AWARDS.victoryBonus +
          XP_AWARDS.firstBlood +
          XP_AWARDS.higherBVOpponent;
        
        expect(result.success).toBe(true);
        expect(mockRepository.recordMission).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            xpEarned: expectedXp,
          })
        );
      });
    });
  });

  // ===========================================================================
  // Wounds
  // ===========================================================================

  describe('Wounds', () => {
    describe('applyWound', () => {
      it('should apply a wound to a pilot', () => {
        service.createPilot({
          identity: createMockIdentity('Wound Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        const result = service.applyWound(id);

        expect(result.success).toBe(true);
        expect(mockRepository.update).toHaveBeenCalledWith(id, {
          wounds: 1,
          status: PilotStatus.Active,
        });
      });

      it('should set status to Injured at 3 wounds', () => {
        service.createPilot({
          identity: createMockIdentity('Injured Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        // Apply 3 wounds
        service.applyWound(id);
        service.applyWound(id);
        const result = service.applyWound(id);

        expect(result.success).toBe(true);
        expect(mockRepository.update).toHaveBeenLastCalledWith(id, {
          wounds: 3,
          status: PilotStatus.Injured,
        });
      });

      it('should set status to KIA at 6 wounds', () => {
        service.createPilot({
          identity: createMockIdentity('KIA Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';

        // Apply 6 wounds
        for (let i = 0; i < 6; i++) {
          service.applyWound(id);
        }

        expect(mockRepository.update).toHaveBeenLastCalledWith(id, {
          wounds: 6,
          status: PilotStatus.KIA,
        });
      });

      it('should return error for non-existent pilot', () => {
        const result = service.applyWound('non-existent');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(PilotErrorCode.NOT_FOUND);
      });
    });

    describe('healWounds', () => {
      it('should heal all wounds', () => {
        service.createPilot({
          identity: createMockIdentity('Heal Test'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';
        service.applyWound(id);
        service.applyWound(id);

        const result = service.healWounds(id);

        expect(result.success).toBe(true);
        expect(mockRepository.update).toHaveBeenLastCalledWith(id, {
          wounds: 0,
          status: PilotStatus.Active,
        });
      });

      it('should return error when pilot is KIA', () => {
        service.createPilot({
          identity: createMockIdentity('Dead Pilot'),
          type: PilotType.Persistent,
          skills: { gunnery: 4, piloting: 5 },
        });
        const id = 'pilot-1';
        
        // Kill the pilot
        for (let i = 0; i < 6; i++) {
          service.applyWound(id);
        }

        const result = service.healWounds(id);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot heal a KIA pilot');
        expect(result.errorCode).toBe(PilotErrorCode.VALIDATION_ERROR);
      });

      it('should return error for non-existent pilot', () => {
        const result = service.healWounds('non-existent');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(PilotErrorCode.NOT_FOUND);
      });
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    describe('validatePilot', () => {
      it('should return no errors for valid pilot', () => {
        const errors = service.validatePilot({
          name: 'Valid Pilot',
          skills: { gunnery: 4, piloting: 5 },
          wounds: 0,
        });

        expect(errors).toHaveLength(0);
      });

      it('should return error for invalid gunnery', () => {
        const errors = service.validatePilot({
          skills: { gunnery: 0, piloting: 5 },
        });

        expect(errors.some((e) => e.includes('Gunnery'))).toBe(true);
      });

      it('should return error for invalid piloting', () => {
        const errors = service.validatePilot({
          skills: { gunnery: 4, piloting: 9 },
        });

        expect(errors.some((e) => e.includes('Piloting'))).toBe(true);
      });

      it('should return error for invalid wounds', () => {
        const errors = service.validatePilot({
          wounds: 7,
        });

        expect(errors.some((e) => e.includes('Wounds'))).toBe(true);
      });

      it('should return error for negative wounds', () => {
        const errors = service.validatePilot({
          wounds: -1,
        });

        expect(errors.some((e) => e.includes('Wounds'))).toBe(true);
      });

      it('should return error for empty name', () => {
        const errors = service.validatePilot({
          name: '',
        });

        expect(errors.some((e) => e.includes('name is required'))).toBe(true);
      });

      it('should return error for whitespace-only name', () => {
        const errors = service.validatePilot({
          name: '   ',
        });

        expect(errors.some((e) => e.includes('name is required'))).toBe(true);
      });

      it('should skip validation for undefined fields', () => {
        const errors = service.validatePilot({});

        expect(errors).toHaveLength(0);
      });

      it('should accumulate multiple errors', () => {
        const errors = service.validatePilot({
          name: '',
          skills: { gunnery: 0, piloting: 9 },
          wounds: 10,
        });

        expect(errors.length).toBeGreaterThanOrEqual(4);
      });
    });
  });
});
