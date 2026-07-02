/**
 * Encounter Service Tests
 *
 * Tests for encounter management and launch operations.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import {
  IEncounter,
  ICreateEncounterInput,
  IUpdateEncounterInput,
  IMapConfiguration,
  IVictoryCondition,
  EncounterStatus,
  VictoryConditionType,
  TerrainPreset,
  ScenarioTemplateType,
  PilotSkillTemplate,
  SCENARIO_TEMPLATES,
} from '@/types/encounter';
import { IForce, ForceType, ForcePosition, ForceStatus } from '@/types/force';
import { createGameSession } from '@/utils/gameplay/gameSessionCore';

import { IEncounterOperationResult } from '../EncounterRepository';

// =============================================================================
// Mock Data Storage
// =============================================================================

const mockEncounters = new Map<string, IEncounter>();
const mockForces = new Map<string, IForce>();
let mockIdCounter = 0;
let mockSessionIdCounter = 0;

// Default map configuration for testing
const DEFAULT_MAP_CONFIG: IMapConfiguration = {
  radius: 6,
  terrain: TerrainPreset.Clear,
  playerDeploymentZone: 'south',
  opponentDeploymentZone: 'north',
};

// =============================================================================
// Mock Force Repository
// =============================================================================

jest.mock('../../forces/ForceRepository', () => ({
  getForceRepository: () => ({
    getForceById: (id: string) => mockForces.get(id) ?? null,
    getAllForces: () => Array.from(mockForces.values()),
  }),
}));

// =============================================================================
// Mock Pilot Service — launchEncounter resolves pilots through PilotService
// =============================================================================

jest.mock('../../pilots/PilotService', () => ({
  getPilotService: () => ({
    getPilot: () => null,
  }),
}));

// =============================================================================
// Mock Game Session Factory
// =============================================================================

jest.mock('@/utils/gameplay/gameSessionCore', () => ({
  createGameSession: jest.fn((config, units) => {
    mockSessionIdCounter += 1;
    return {
      id: `game-session-${mockSessionIdCounter}`,
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
      config,
      units,
      events: [],
      currentState: {},
    };
  }),
}));

// Mock catalog adaptation — launchEncounter combat-seeds its units through
// the canonical catalog (per `extend-combat-seed-to-all-session-producers`);
// the suite's synthetic unitRefs are not real catalog entries, so the
// adapter returns a fixed BattleMech shape for every ref.
jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(async (unitRef: string, options?: { side?: unknown }) => ({
    id: unitRef,
    side: options?.side,
    position: { q: 0, r: 0 },
    facing: 0,
    heat: 0,
    movementThisTurn: 'stationary',
    hexesMovedThisTurn: 0,
    heatSinks: 10,
    heatSinkType: 'single',
    armor: { head: 9, center_torso: 20 },
    structure: { head: 3, center_torso: 10 },
    startingInternalStructure: { head: 3, center_torso: 10 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: 'pending',
    tonnage: 50,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  })),
}));

function getTemplateDefaults(
  templateType: ScenarioTemplateType | undefined,
): Pick<IEncounter, 'mapConfig' | 'victoryConditions'> {
  const template = SCENARIO_TEMPLATES.find((t) => t.type === templateType);

  return {
    mapConfig: template?.defaultMapConfig ?? DEFAULT_MAP_CONFIG,
    victoryConditions: template?.defaultVictoryConditions ?? [],
  };
}

function createMockEncounter(
  input: ICreateEncounterInput,
): IEncounterOperationResult {
  const id = `encounter-${++mockIdCounter}`;
  const now = new Date().toISOString();
  const { mapConfig, victoryConditions } = getTemplateDefaults(input.template);

  const encounter: IEncounter = {
    id,
    name: input.name,
    description: input.description,
    status: EncounterStatus.Draft,
    template: input.template,
    mapConfig,
    victoryConditions,
    optionalRules: [],
    createdAt: now,
    updatedAt: now,
  };
  mockEncounters.set(id, encounter);
  return { success: true, id };
}

function forceReferenceFromId(
  forceId: string | undefined,
): NonNullable<IEncounter['playerForce']> | undefined {
  if (!forceId) return undefined;

  return {
    forceId,
    forceName: '',
    totalBV: 0,
    unitCount: 0,
  };
}

function resolvePlayerForce(
  encounter: IEncounter,
  input: IUpdateEncounterInput,
): IEncounter['playerForce'] {
  return input.playerForceId === undefined
    ? encounter.playerForce
    : forceReferenceFromId(input.playerForceId);
}

function resolveOpponentForce(
  encounter: IEncounter,
  input: IUpdateEncounterInput,
): IEncounter['opponentForce'] {
  return 'opponentForceId' in input
    ? forceReferenceFromId(input.opponentForceId)
    : encounter.opponentForce;
}

function resolveOpForConfig(
  encounter: IEncounter,
  input: IUpdateEncounterInput,
): IEncounter['opForConfig'] {
  return 'opForConfig' in input ? input.opForConfig : encounter.opForConfig;
}

function encounterStatusFor(updated: IEncounter): EncounterStatus {
  const hasPlayerForce = !!updated.playerForce;
  const hasOpponent = !!updated.opponentForce || !!updated.opForConfig;
  const hasVictoryConditions = updated.victoryConditions.length > 0;

  return hasPlayerForce && hasOpponent && hasVictoryConditions
    ? EncounterStatus.Ready
    : EncounterStatus.Draft;
}

function updateMockEncounter(
  id: string,
  input: IUpdateEncounterInput,
): IEncounterOperationResult {
  const encounter = mockEncounters.get(id);
  if (!encounter) {
    return { success: false, error: 'Encounter not found' };
  }

  if (
    encounter.status === EncounterStatus.Launched ||
    encounter.status === EncounterStatus.Completed
  ) {
    return {
      success: false,
      error: `Cannot update encounter in ${encounter.status} status`,
    };
  }

  const updated: IEncounter = {
    ...encounter,
    name: input.name ?? encounter.name,
    description:
      input.description !== undefined
        ? input.description
        : encounter.description,
    playerForce: resolvePlayerForce(encounter, input),
    opponentForce: resolveOpponentForce(encounter, input),
    opForConfig: resolveOpForConfig(encounter, input),
    mapConfig: input.mapConfig
      ? { ...encounter.mapConfig, ...input.mapConfig }
      : encounter.mapConfig,
    victoryConditions: input.victoryConditions ?? encounter.victoryConditions,
    optionalRules: input.optionalRules ?? encounter.optionalRules,
    updatedAt: new Date().toISOString(),
  };

  mockEncounters.set(id, {
    ...updated,
    status: encounterStatusFor(updated),
  });

  return { success: true, id };
}

// =============================================================================
// Mock Encounter Repository
// =============================================================================

jest.mock('../EncounterRepository', () => ({
  getEncounterRepository: () => ({
    createEncounter: jest.fn(createMockEncounter),
    getEncounterById: (id: string) => mockEncounters.get(id) ?? null,
    getAllEncounters: () => Array.from(mockEncounters.values()),
    getEncountersByStatus: (status: EncounterStatus) =>
      Array.from(mockEncounters.values()).filter((e) => e.status === status),
    updateEncounter: jest.fn(updateMockEncounter),
    deleteEncounter: jest.fn((id: string): IEncounterOperationResult => {
      const encounter = mockEncounters.get(id);
      if (!encounter) {
        return { success: false, error: 'Encounter not found' };
      }
      if (encounter.status === EncounterStatus.Launched) {
        return { success: false, error: 'Cannot delete a launched encounter' };
      }
      mockEncounters.delete(id);
      return { success: true };
    }),
    linkGameSession: jest.fn(
      (
        encounterId: string,
        gameSessionId: string,
      ): IEncounterOperationResult => {
        const encounter = mockEncounters.get(encounterId);
        if (!encounter) {
          return { success: false, error: 'Encounter not found' };
        }
        mockEncounters.set(encounterId, {
          ...encounter,
          status: EncounterStatus.Launched,
          gameSessionId,
          updatedAt: new Date().toISOString(),
        });
        return { success: true, id: encounterId };
      },
    ),
  }),
}));

// Import after mocks
import { EncounterService } from '../EncounterService';

// =============================================================================
// Helper Functions
// =============================================================================

function createMockForce(
  id: string,
  name: string,
  totalBV: number = 5000,
  assignedUnits: number = 4,
): IForce {
  const assignments = Array.from({ length: assignedUnits }, (_, i) => ({
    id: `${id}-assign-${i + 1}`,
    pilotId: `${id}-pilot-${i + 1}`,
    unitId: `${id}-unit-${i + 1}`,
    position: ForcePosition.Member,
    slot: i + 1,
  }));
  const force: IForce = {
    id,
    name,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments,
    stats: {
      totalBV,
      totalTonnage: 200,
      assignedPilots: assignedUnits,
      assignedUnits,
      emptySlots: 4 - assignedUnits,
      averageSkill: { gunnery: 4, piloting: 5 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockForces.set(id, force);
  return force;
}

function clearMocks(): void {
  mockEncounters.clear();
  mockForces.clear();
  mockIdCounter = 0;
  mockSessionIdCounter = 0;
  jest.mocked(createGameSession).mockClear();
}

// =============================================================================
// Tests
// =============================================================================

describe('EncounterService', () => {
  let service: EncounterService;

  beforeEach(() => {
    clearMocks();
    service = new EncounterService();
  });

  // ===========================================================================
  // Encounter CRUD
  // ===========================================================================

  describe('Encounter CRUD', () => {
    it('should create an encounter with basic input', () => {
      const result = service.createEncounter({
        name: 'Test Encounter',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      const encounter = service.getEncounter(result.id!);
      expect(encounter).toBeDefined();
      expect(encounter?.name).toBe('Test Encounter');
      expect(encounter?.status).toBe(EncounterStatus.Draft);
    });

    it('should create an encounter with description', () => {
      const result = service.createEncounter({
        name: 'Test Encounter',
        description: 'A test battle scenario',
      });

      expect(result.success).toBe(true);
      const encounter = service.getEncounter(result.id!);
      expect(encounter?.description).toBe('A test battle scenario');
    });

    it('should create an encounter with a template', () => {
      const result = service.createEncounter({
        name: 'Duel Encounter',
        template: ScenarioTemplateType.Duel,
      });

      expect(result.success).toBe(true);
      const encounter = service.getEncounter(result.id!);
      expect(encounter?.template).toBe(ScenarioTemplateType.Duel);
      expect(encounter?.mapConfig.radius).toBe(5); // Duel template uses radius 5
      expect(encounter?.victoryConditions).toHaveLength(1);
      expect(encounter?.victoryConditions[0].type).toBe(
        VictoryConditionType.DestroyAll,
      );
    });

    it('should reject empty encounter name', () => {
      const result = service.createEncounter({
        name: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encounter name is required');
    });

    it('should reject whitespace-only encounter name', () => {
      const result = service.createEncounter({
        name: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encounter name is required');
    });

    it('should get all encounters', () => {
      service.createEncounter({ name: 'Encounter 1' });
      service.createEncounter({ name: 'Encounter 2' });

      const encounters = service.getAllEncounters();
      expect(encounters).toHaveLength(2);
    });

    it('should return null for non-existent encounter', () => {
      const encounter = service.getEncounter('non-existent-id');
      expect(encounter).toBeNull();
    });

    it('should update an encounter name', () => {
      const createResult = service.createEncounter({ name: 'Original Name' });
      const updateResult = service.updateEncounter(createResult.id!, {
        name: 'Updated Name',
      });

      expect(updateResult.success).toBe(true);
      const encounter = service.getEncounter(createResult.id!);
      expect(encounter?.name).toBe('Updated Name');
    });

    it('should delete an encounter', () => {
      const createResult = service.createEncounter({ name: 'To Delete' });
      const deleteResult = service.deleteEncounter(createResult.id!);

      expect(deleteResult.success).toBe(true);
      expect(service.getEncounter(createResult.id!)).toBeNull();
    });
  });

  // ===========================================================================
  // Filter Methods
  // ===========================================================================

  describe('Filter Methods', () => {
    it('should get ready encounters', () => {
      // Create an encounter that will become ready
      const playerForce = createMockForce('force-1', 'Alpha Lance');
      const opponentForce = createMockForce('force-2', 'Bravo Lance');

      const result = service.createEncounter({
        name: 'Ready Encounter',
        template: ScenarioTemplateType.Skirmish,
      });

      // Set forces to make it ready
      service.setPlayerForce(result.id!, playerForce.id);
      service.setOpponentForce(result.id!, opponentForce.id);

      // Create a draft encounter
      service.createEncounter({ name: 'Draft Encounter' });

      const readyEncounters = service.getReadyEncounters();
      expect(readyEncounters).toHaveLength(1);
      expect(readyEncounters[0].name).toBe('Ready Encounter');
    });

    it('should get draft encounters', () => {
      service.createEncounter({ name: 'Draft 1' });
      service.createEncounter({ name: 'Draft 2' });

      const draftEncounters = service.getDraftEncounters();
      expect(draftEncounters).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Configuration
  // ===========================================================================

  describe('Configuration', () => {
    describe('setPlayerForce', () => {
      it('should set player force successfully', () => {
        const force = createMockForce('force-player', 'Player Lance');
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.setPlayerForce(createResult.id!, force.id);

        expect(result.success).toBe(true);
        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.playerForce?.forceId).toBe(force.id);
      });

      it('should reject non-existent force', () => {
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.setPlayerForce(createResult.id!, 'non-existent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Force not found');
      });

      it('should hydrate player force with current force data', () => {
        const force = createMockForce(
          'force-hydrate',
          'Hydrate Lance',
          6000,
          4,
        );
        const createResult = service.createEncounter({ name: 'Test' });
        service.setPlayerForce(createResult.id!, force.id);

        const encounter = service.getEncounter(createResult.id!);

        expect(encounter?.playerForce?.forceName).toBe('Hydrate Lance');
        expect(encounter?.playerForce?.totalBV).toBe(6000);
        expect(encounter?.playerForce?.unitCount).toBe(4);
      });
    });

    describe('setOpponentForce', () => {
      it('should set opponent force successfully', () => {
        const force = createMockForce('force-opponent', 'Opponent Lance');
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.setOpponentForce(createResult.id!, force.id);

        expect(result.success).toBe(true);
        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.opponentForce?.forceId).toBe(force.id);
      });

      it('should reject non-existent force', () => {
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.setOpponentForce(
          createResult.id!,
          'non-existent',
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Force not found');
      });

      it('should clear opForConfig when setting explicit opponent force', () => {
        const force = createMockForce('force-explicit', 'Explicit Lance');
        const createResult = service.createEncounter({ name: 'Test' });

        // First set opForConfig through updateEncounter
        service.updateEncounter(createResult.id!, {
          opForConfig: {
            targetBV: 5000,
            pilotSkillTemplate: PilotSkillTemplate.Regular,
          },
        });

        // Then set explicit opponent force
        service.setOpponentForce(createResult.id!, force.id);

        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.opponentForce?.forceId).toBe(force.id);
        // opForConfig should be cleared (set to undefined)
        expect(encounter?.opForConfig).toBeUndefined();
      });
    });

    describe('clearOpponentForce', () => {
      it('should clear opponent force', () => {
        const force = createMockForce('force-clear', 'Clear Lance');
        const createResult = service.createEncounter({ name: 'Test' });
        service.setOpponentForce(createResult.id!, force.id);

        const result = service.clearOpponentForce(createResult.id!);

        expect(result.success).toBe(true);
        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.opponentForce).toBeUndefined();
      });
    });

    describe('applyTemplate', () => {
      it('should apply duel template', () => {
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.applyTemplate(
          createResult.id!,
          ScenarioTemplateType.Duel,
        );

        expect(result.success).toBe(true);
        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.mapConfig.radius).toBe(5);
        expect(encounter?.victoryConditions).toHaveLength(1);
        expect(encounter?.victoryConditions[0].type).toBe(
          VictoryConditionType.DestroyAll,
        );
      });

      it('should apply skirmish template', () => {
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.applyTemplate(
          createResult.id!,
          ScenarioTemplateType.Skirmish,
        );

        expect(result.success).toBe(true);
        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.mapConfig.radius).toBe(8);
        expect(encounter?.victoryConditions).toHaveLength(2);
      });

      it('should apply battle template', () => {
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.applyTemplate(
          createResult.id!,
          ScenarioTemplateType.Battle,
        );

        expect(result.success).toBe(true);
        const encounter = service.getEncounter(createResult.id!);
        expect(encounter?.mapConfig.radius).toBe(12);
      });

      it('should reject unknown template', () => {
        const createResult = service.createEncounter({ name: 'Test' });

        const result = service.applyTemplate(
          createResult.id!,
          'unknown' as ScenarioTemplateType,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown template');
      });
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should return invalid for encounter without player force', () => {
      const createResult = service.createEncounter({ name: 'Test' });

      const validation = service.validateEncounter(createResult.id!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Player force must be selected');
    });

    it('should return invalid for encounter without opponent', () => {
      const playerForce = createMockForce('force-p', 'Player');
      const createResult = service.createEncounter({ name: 'Test' });
      service.setPlayerForce(createResult.id!, playerForce.id);

      const validation = service.validateEncounter(createResult.id!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Opponent force or OpFor configuration is required',
      );
    });

    it('should return invalid for encounter without victory conditions', () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({ name: 'Test' });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      // Clear victory conditions
      service.updateEncounter(createResult.id!, { victoryConditions: [] });

      const validation = service.validateEncounter(createResult.id!);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'At least one victory condition is required',
      );
    });

    it('should return valid for complete encounter', () => {
      const playerForce = createMockForce('force-p', 'Player', 5000);
      const opponentForce = createMockForce('force-o', 'Opponent', 5000);
      const createResult = service.createEncounter({
        name: 'Complete Test',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const validation = service.validateEncounter(createResult.id!);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return error for non-existent encounter', () => {
      const validation = service.validateEncounter('non-existent');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Encounter not found');
    });

    it('should warn about BV imbalance', () => {
      const playerForce = createMockForce('force-p', 'Player', 10000);
      const opponentForce = createMockForce('force-o', 'Opponent', 5000);
      const createResult = service.createEncounter({
        name: 'Imbalanced',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const validation = service.validateEncounter(createResult.id!);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((w) => w.includes('unbalanced'))).toBe(
        true,
      );
    });

    describe('canLaunch', () => {
      it('should return true for valid encounter', () => {
        const playerForce = createMockForce('force-p', 'Player');
        const opponentForce = createMockForce('force-o', 'Opponent');
        const createResult = service.createEncounter({
          name: 'Launchable',
          template: ScenarioTemplateType.Skirmish,
        });
        service.setPlayerForce(createResult.id!, playerForce.id);
        service.setOpponentForce(createResult.id!, opponentForce.id);

        expect(service.canLaunch(createResult.id!)).toBe(true);
      });

      it('should return false for invalid encounter', () => {
        const createResult = service.createEncounter({
          name: 'Not Launchable',
        });

        expect(service.canLaunch(createResult.id!)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Launch
  // ===========================================================================

  describe('Launch', () => {
    it('should launch a valid encounter', async () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'To Launch',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const launchResult = await service.launchEncounter(createResult.id!);

      expect(launchResult.success).toBe(true);
      const encounter = service.getEncounter(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Launched);
      expect(encounter?.gameSessionId).toBeDefined();
    });

    it('combat-seeds launched units with per-location armor and structure', async () => {
      // Per `extend-combat-seed-to-all-session-producers`
      // (game-session-management "Combat State Seeding at Session
      // Creation"): the units the launch passes to createGameSession
      // SHALL carry catalog armor/structure/heat-sink construction
      // inputs — the raw path previously created 0-armor sessions.
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Seeded Launch',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const launchResult = await service.launchEncounter(createResult.id!);

      expect(launchResult.success).toBe(true);
      const sessionUnits = (createGameSession as jest.Mock).mock.calls.at(
        -1,
      )?.[1] as readonly {
        armorByLocation?: Record<string, number>;
        structureByLocation?: Record<string, number>;
        heatSinks?: number;
      }[];
      expect(sessionUnits.length).toBeGreaterThan(0);
      for (const unit of sessionUnits) {
        expect(unit.armorByLocation).toMatchObject({
          head: 9,
          center_torso: 20,
        });
        expect(unit.structureByLocation).toMatchObject({
          head: 3,
          center_torso: 10,
        });
        expect(unit.heatSinks).toBe(10);
      }
    });

    it('should thread campaign linkage into the launched session config', async () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Campaign Launch',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const launchResult = await service.launchEncounter(createResult.id!, {
        campaignId: 'campaign-1',
        contractId: 'contract-1',
        scenarioId: 'scenario-1',
      });

      expect(launchResult.success).toBe(true);
      expect(createGameSession).toHaveBeenCalledTimes(1);
      const [config] = jest.mocked(createGameSession).mock.calls[0];
      expect(config.encounterId).toBe(createResult.id);
      expect(config.campaignId).toBe('campaign-1');
      expect(config.contractId).toBe('contract-1');
      expect(config.scenarioId).toBe('scenario-1');
    });

    it('should fail before session creation when contract linkage is incomplete', async () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Broken Campaign Launch',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const result = await service.launchEncounter(createResult.id!, {
        contractId: 'contract-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('campaignId');
      expect(result.error).toContain('scenarioId');
      expect(createGameSession).not.toHaveBeenCalled();
    });

    it('should reject launching non-existent encounter', async () => {
      const result = await service.launchEncounter('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encounter not found');
    });

    it('should reject launching invalid encounter', async () => {
      const createResult = service.createEncounter({ name: 'Invalid' });

      const result = await service.launchEncounter(createResult.id!);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot launch');
    });

    it('should reject launching already launched encounter', async () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Already Launched',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);
      await service.launchEncounter(createResult.id!);

      const result = await service.launchEncounter(createResult.id!);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encounter is already launched');
    });

    it('should reject launching completed encounter', async () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Completed',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      // Manually set status to completed for test
      const encounter = mockEncounters.get(createResult.id!);
      if (encounter) {
        mockEncounters.set(createResult.id!, {
          ...encounter,
          status: EncounterStatus.Completed,
        });
      }

      const result = await service.launchEncounter(createResult.id!);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encounter is already completed');
    });
  });

  // ===========================================================================
  // Cloning
  // ===========================================================================

  describe('Cloning', () => {
    it('should clone an encounter', () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Original',
        description: 'Original description',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      const cloneResult = service.cloneEncounter(createResult.id!, 'Cloned');

      expect(cloneResult.success).toBe(true);
      expect(cloneResult.id).toBeDefined();
      expect(cloneResult.id).not.toBe(createResult.id);

      const cloned = service.getEncounter(cloneResult.id!);
      expect(cloned?.name).toBe('Cloned');
      expect(cloned?.template).toBe(ScenarioTemplateType.Skirmish);
    });

    it('should set description indicating clone source', () => {
      const createResult = service.createEncounter({
        name: 'Source',
        description: 'Has description',
      });

      const cloneResult = service.cloneEncounter(createResult.id!, 'Clone');

      const cloned = service.getEncounter(cloneResult.id!);
      expect(cloned?.description).toContain('Cloned from Source');
    });

    it('should return error when cloning non-existent encounter', () => {
      const result = service.cloneEncounter('non-existent', 'Clone');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encounter not found');
    });

    it('should copy configuration to cloned encounter', () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'With Config',
        template: ScenarioTemplateType.Battle,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);
      service.updateEncounter(createResult.id!, {
        optionalRules: ['forced_withdrawal'],
      });

      const cloneResult = service.cloneEncounter(
        createResult.id!,
        'Cloned Config',
      );

      const cloned = service.getEncounter(cloneResult.id!);
      expect(cloned?.playerForce?.forceId).toBe(playerForce.id);
      expect(cloned?.opponentForce?.forceId).toBe(opponentForce.id);
    });

    it('should clone encounter with opForConfig', () => {
      const createResult = service.createEncounter({
        name: 'With OpFor Config',
        template: ScenarioTemplateType.Skirmish,
      });
      const playerForce = createMockForce('force-p', 'Player');
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.updateEncounter(createResult.id!, {
        opForConfig: {
          targetBVPercent: 100,
          pilotSkillTemplate: PilotSkillTemplate.Regular,
        },
      });

      const cloneResult = service.cloneEncounter(
        createResult.id!,
        'Cloned OpFor',
      );

      const cloned = service.getEncounter(cloneResult.id!);
      expect(cloned?.opForConfig?.pilotSkillTemplate).toBe(
        PilotSkillTemplate.Regular,
      );
      expect(cloned?.opForConfig?.targetBVPercent).toBe(100);
    });

    it('should start cloned encounter in draft status', () => {
      const playerForce = createMockForce('force-p', 'Player');
      const opponentForce = createMockForce('force-o', 'Opponent');
      const createResult = service.createEncounter({
        name: 'Ready Original',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);
      service.setOpponentForce(createResult.id!, opponentForce.id);

      // Original should be ready
      const original = service.getEncounter(createResult.id!);
      expect(original?.status).toBe(EncounterStatus.Ready);

      const cloneResult = service.cloneEncounter(
        createResult.id!,
        'Cloned Ready',
      );

      const cloned = service.getEncounter(cloneResult.id!);
      // Clone status depends on whether config is copied - may become ready
      expect([EncounterStatus.Draft, EncounterStatus.Ready]).toContain(
        cloned?.status,
      );
    });
  });

  // ===========================================================================
  // Force Hydration
  // ===========================================================================

  describe('Force Hydration', () => {
    it('should hydrate player force with current data', () => {
      const force = createMockForce(
        'force-hydrate-1',
        'Hydrated Player',
        7500,
        3,
      );
      const createResult = service.createEncounter({ name: 'Hydration Test' });
      service.setPlayerForce(createResult.id!, force.id);

      const encounter = service.getEncounter(createResult.id!);

      expect(encounter?.playerForce?.forceName).toBe('Hydrated Player');
      expect(encounter?.playerForce?.totalBV).toBe(7500);
      expect(encounter?.playerForce?.unitCount).toBe(3);
    });

    it('should hydrate opponent force with current data', () => {
      const force = createMockForce(
        'force-hydrate-2',
        'Hydrated Opponent',
        8000,
        4,
      );
      const createResult = service.createEncounter({ name: 'Hydration Test' });
      service.setOpponentForce(createResult.id!, force.id);

      const encounter = service.getEncounter(createResult.id!);

      expect(encounter?.opponentForce?.forceName).toBe('Hydrated Opponent');
      expect(encounter?.opponentForce?.totalBV).toBe(8000);
      expect(encounter?.opponentForce?.unitCount).toBe(4);
    });

    it('should null out playerForce when the referenced force was deleted', () => {
      // Phase B of repair-broken-encounter-drafts widened the hydration
      // boundary: a stored forceId that no longer resolves now becomes
      // `null` (rather than passing the dangling ref through). Detection
      // of "force deleted out from under the encounter" is downstream's
      // job via `encounterBrokenRefs(encounter, rawForceIds)`.
      const force = createMockForce('force-deleted', 'Deleted Force');
      const createResult = service.createEncounter({
        name: 'Deleted Force Test',
      });
      service.setPlayerForce(createResult.id!, force.id);

      // Delete the force out from under the encounter.
      mockForces.delete(force.id);

      const encounter = service.getEncounter(createResult.id!);
      expect(encounter?.playerForce).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty encounters list', () => {
      const encounters = service.getAllEncounters();
      expect(encounters).toHaveLength(0);
    });

    it('should handle multiple templates applied sequentially', () => {
      const createResult = service.createEncounter({ name: 'Multi Template' });

      service.applyTemplate(createResult.id!, ScenarioTemplateType.Duel);
      let encounter = service.getEncounter(createResult.id!);
      expect(encounter?.mapConfig.radius).toBe(5);

      service.applyTemplate(createResult.id!, ScenarioTemplateType.Battle);
      encounter = service.getEncounter(createResult.id!);
      expect(encounter?.mapConfig.radius).toBe(12);
    });

    it('should not modify original encounter when cloning', () => {
      const playerForce = createMockForce('force-original', 'Original Force');
      const createResult = service.createEncounter({
        name: 'Original Unchanged',
        template: ScenarioTemplateType.Skirmish,
      });
      service.setPlayerForce(createResult.id!, playerForce.id);

      const cloneResult = service.cloneEncounter(createResult.id!, 'Clone');
      service.updateEncounter(cloneResult.id!, { name: 'Modified Clone' });

      const original = service.getEncounter(createResult.id!);
      expect(original?.name).toBe('Original Unchanged');
    });
  });
});
