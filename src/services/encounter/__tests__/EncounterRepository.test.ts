/**
 * EncounterRepository Tests
 *
 * Unit tests for the SQLite-based encounter repository.
 * Tests CRUD operations, status management, and data integrity.
 */

import {
  EncounterRepository,
  getEncounterRepository,
  EncounterErrorCode,
} from '../EncounterRepository';
import { getSQLiteService, resetSQLiteService } from '@/services/persistence/SQLiteService';
import {
  EncounterStatus,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
  PilotSkillTemplate,
  IVictoryCondition,
  IOpForConfig,
} from '@/types/encounter';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = './data/test-encounter-repository.db';

// Helper to reset the repository singleton between tests
// Since EncounterRepository doesn't export a reset function, we use module mocking
let repositoryInstance: EncounterRepository | null = null;

function getTestRepository(): EncounterRepository {
  if (!repositoryInstance) {
    repositoryInstance = new EncounterRepository();
  }
  return repositoryInstance;
}

function resetTestRepository(): void {
  repositoryInstance = null;
}

describe('EncounterRepository', () => {
  let repository: EncounterRepository;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Clean up WAL files if they exist
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // Ensure data directory exists
    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Reset singletons
    resetSQLiteService();
    resetTestRepository();

    // Initialize with test database
    const sqliteService = getSQLiteService({ path: TEST_DB_PATH });
    sqliteService.initialize();

    repository = getTestRepository();
  });

  afterEach(() => {
    // Close database and clean up
    resetSQLiteService();
    resetTestRepository();

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Clean up WAL files
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  // ===========================================================================
  // Initialize Tests
  // ===========================================================================
  describe('initialize', () => {
    it('should create encounters table on first initialization', () => {
      repository.initialize();

      // Verify table exists by querying it
      const encounters = repository.getAllEncounters();
      expect(encounters).toEqual([]);
    });

    it('should be idempotent - calling multiple times does not error', () => {
      repository.initialize();
      repository.initialize();
      repository.initialize();

      const encounters = repository.getAllEncounters();
      expect(encounters).toEqual([]);
    });
  });

  // ===========================================================================
  // Create Encounter Tests
  // ===========================================================================
  describe('createEncounter', () => {
    it('should create a new encounter with basic fields', () => {
      const result = repository.createEncounter({
        name: 'Test Encounter',
        description: 'A test encounter description',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^encounter-/);
    });

    it('should create encounter without description', () => {
      const result = repository.createEncounter({
        name: 'Minimal Encounter',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      const encounter = repository.getEncounterById(result.id!);
      expect(encounter).not.toBeNull();
      expect(encounter?.name).toBe('Minimal Encounter');
      expect(encounter?.description).toBeUndefined();
    });

    it('should set default status as Draft', () => {
      const result = repository.createEncounter({ name: 'Draft Test' });
      const encounter = repository.getEncounterById(result.id!);

      expect(encounter?.status).toBe(EncounterStatus.Draft);
    });

    it('should set default map configuration', () => {
      const result = repository.createEncounter({ name: 'Map Config Test' });
      const encounter = repository.getEncounterById(result.id!);

      expect(encounter?.mapConfig).toEqual({
        radius: 6,
        terrain: TerrainPreset.Clear,
        playerDeploymentZone: 'south',
        opponentDeploymentZone: 'north',
      });
    });

    it('should use template defaults when template is specified', () => {
      const result = repository.createEncounter({
        name: 'Duel Encounter',
        template: ScenarioTemplateType.Duel,
      });

      const encounter = repository.getEncounterById(result.id!);

      expect(encounter?.template).toBe(ScenarioTemplateType.Duel);
      expect(encounter?.mapConfig.radius).toBe(5);
      expect(encounter?.victoryConditions).toHaveLength(1);
      expect(encounter?.victoryConditions[0].type).toBe(VictoryConditionType.DestroyAll);
    });

    it('should use Skirmish template defaults correctly', () => {
      const result = repository.createEncounter({
        name: 'Skirmish Encounter',
        template: ScenarioTemplateType.Skirmish,
      });

      const encounter = repository.getEncounterById(result.id!);

      expect(encounter?.template).toBe(ScenarioTemplateType.Skirmish);
      expect(encounter?.mapConfig.radius).toBe(8);
      expect(encounter?.victoryConditions).toHaveLength(2);
    });

    it('should use Battle template defaults correctly', () => {
      const result = repository.createEncounter({
        name: 'Battle Encounter',
        template: ScenarioTemplateType.Battle,
      });

      const encounter = repository.getEncounterById(result.id!);

      expect(encounter?.template).toBe(ScenarioTemplateType.Battle);
      expect(encounter?.mapConfig.radius).toBe(12);
      expect(encounter?.victoryConditions).toHaveLength(2);
    });

    it('should set timestamps on creation', () => {
      const before = new Date().toISOString();
      const result = repository.createEncounter({ name: 'Timestamp Test' });
      const after = new Date().toISOString();

      const encounter = repository.getEncounterById(result.id!);

      expect(encounter?.createdAt).toBeDefined();
      expect(encounter?.updatedAt).toBeDefined();
      expect(encounter!.createdAt >= before).toBe(true);
      expect(encounter!.createdAt <= after).toBe(true);
    });
  });

  // ===========================================================================
  // Get Encounter Tests
  // ===========================================================================
  describe('getEncounterById', () => {
    it('should return null for non-existent ID', () => {
      const encounter = repository.getEncounterById('non-existent-id');
      expect(encounter).toBeNull();
    });

    it('should return encounter after creation', () => {
      const createResult = repository.createEncounter({
        name: 'Retrieval Test',
        description: 'Test description',
      });

      const encounter = repository.getEncounterById(createResult.id!);

      expect(encounter).not.toBeNull();
      expect(encounter?.id).toBe(createResult.id);
      expect(encounter?.name).toBe('Retrieval Test');
      expect(encounter?.description).toBe('Test description');
    });

    it('should properly deserialize JSON fields', () => {
      const createResult = repository.createEncounter({
        name: 'JSON Test',
        template: ScenarioTemplateType.Skirmish,
      });

      const encounter = repository.getEncounterById(createResult.id!);

      // Verify JSON fields are properly parsed
      expect(typeof encounter?.mapConfig).toBe('object');
      expect(Array.isArray(encounter?.victoryConditions)).toBe(true);
      expect(Array.isArray(encounter?.optionalRules)).toBe(true);
    });
  });

  // ===========================================================================
  // Get All Encounters Tests
  // ===========================================================================
  describe('getAllEncounters', () => {
    it('should return empty array when no encounters exist', () => {
      const encounters = repository.getAllEncounters();
      expect(encounters).toEqual([]);
    });

    it('should return all created encounters', () => {
      repository.createEncounter({ name: 'Encounter 1' });
      repository.createEncounter({ name: 'Encounter 2' });
      repository.createEncounter({ name: 'Encounter 3' });

      const encounters = repository.getAllEncounters();

      expect(encounters).toHaveLength(3);
      expect(encounters.some((e) => e.name === 'Encounter 1')).toBe(true);
      expect(encounters.some((e) => e.name === 'Encounter 2')).toBe(true);
      expect(encounters.some((e) => e.name === 'Encounter 3')).toBe(true);
    });

    it('should return encounters ordered by updated_at DESC', () => {
      const result1 = repository.createEncounter({ name: 'First' });
      repository.createEncounter({ name: 'Second' });

      // Update the first one to make it more recent
      repository.updateEncounter(result1.id!, { name: 'First Updated' });

      const encounters = repository.getAllEncounters();

      // First Updated should be first (most recently updated)
      expect(encounters[0].name).toBe('First Updated');
      expect(encounters[1].name).toBe('Second');
    });
  });

  // ===========================================================================
  // Get Encounters By Status Tests
  // ===========================================================================
  describe('getEncountersByStatus', () => {
    it('should return empty array when no encounters match status', () => {
      repository.createEncounter({ name: 'Draft Encounter' });

      const readyEncounters = repository.getEncountersByStatus(EncounterStatus.Ready);
      expect(readyEncounters).toEqual([]);
    });

    it('should return only encounters with matching status', () => {
      repository.createEncounter({ name: 'Draft 1' });
      repository.createEncounter({ name: 'Draft 2' });

      const draftEncounters = repository.getEncountersByStatus(EncounterStatus.Draft);
      expect(draftEncounters).toHaveLength(2);
    });

    it('should filter by different statuses', () => {
      const result = repository.createEncounter({ name: 'Status Test' });

      // Set status to Ready
      repository.setEncounterStatus(result.id!, EncounterStatus.Ready);

      const draftEncounters = repository.getEncountersByStatus(EncounterStatus.Draft);
      const readyEncounters = repository.getEncountersByStatus(EncounterStatus.Ready);

      expect(draftEncounters).toHaveLength(0);
      expect(readyEncounters).toHaveLength(1);
      expect(readyEncounters[0].name).toBe('Status Test');
    });
  });

  // ===========================================================================
  // Update Encounter Tests
  // ===========================================================================
  describe('updateEncounter', () => {
    it('should update encounter name', () => {
      const createResult = repository.createEncounter({ name: 'Original Name' });
      const updateResult = repository.updateEncounter(createResult.id!, {
        name: 'Updated Name',
      });

      expect(updateResult.success).toBe(true);

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.name).toBe('Updated Name');
    });

    it('should update encounter description', () => {
      const createResult = repository.createEncounter({ name: 'Description Test' });
      repository.updateEncounter(createResult.id!, {
        description: 'New Description',
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.description).toBe('New Description');
    });

    it('should clear description when set to null', () => {
      const createResult = repository.createEncounter({
        name: 'Clear Description',
        description: 'Initial Description',
      });

      // Note: undefined is not handled as "clear" in the repository - only explicit null works
      // The repository only processes description if it's !== undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      repository.updateEncounter(createResult.id!, { description: null as any });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.description).toBeUndefined();
    });

    it('should update player force reference', () => {
      const createResult = repository.createEncounter({ name: 'Force Test' });
      repository.updateEncounter(createResult.id!, {
        playerForceId: 'force-123',
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.playerForce).toBeDefined();
      expect(encounter?.playerForce?.forceId).toBe('force-123');
    });

    it('should update opponent force reference', () => {
      const createResult = repository.createEncounter({ name: 'Opponent Force Test' });
      repository.updateEncounter(createResult.id!, {
        opponentForceId: 'force-456',
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.opponentForce).toBeDefined();
      expect(encounter?.opponentForce?.forceId).toBe('force-456');
    });

    it('should update OpFor config', () => {
      const createResult = repository.createEncounter({ name: 'OpFor Test' });
      const opForConfig: IOpForConfig = {
        targetBV: 5000,
        pilotSkillTemplate: PilotSkillTemplate.Regular,
        faction: 'Lyran Commonwealth',
      };

      repository.updateEncounter(createResult.id!, { opForConfig });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.opForConfig).toBeDefined();
      expect(encounter?.opForConfig?.targetBV).toBe(5000);
      expect(encounter?.opForConfig?.pilotSkillTemplate).toBe(PilotSkillTemplate.Regular);
    });

    it('should merge partial map config updates', () => {
      const createResult = repository.createEncounter({ name: 'Map Update Test' });

      repository.updateEncounter(createResult.id!, {
        mapConfig: { radius: 10 },
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.mapConfig.radius).toBe(10);
      // Other fields should be preserved
      expect(encounter?.mapConfig.terrain).toBe(TerrainPreset.Clear);
      expect(encounter?.mapConfig.playerDeploymentZone).toBe('south');
    });

    it('should update victory conditions', () => {
      const createResult = repository.createEncounter({ name: 'Victory Test' });
      const victoryConditions: IVictoryCondition[] = [
        { type: VictoryConditionType.Cripple, threshold: 60 },
        { type: VictoryConditionType.TurnLimit, turnLimit: 10 },
      ];

      repository.updateEncounter(createResult.id!, { victoryConditions });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.victoryConditions).toHaveLength(2);
      expect(encounter?.victoryConditions[0].type).toBe(VictoryConditionType.Cripple);
      expect(encounter?.victoryConditions[0].threshold).toBe(60);
    });

    it('should update optional rules', () => {
      const createResult = repository.createEncounter({ name: 'Rules Test' });
      const optionalRules = ['floating_crits', 'edge'];

      repository.updateEncounter(createResult.id!, { optionalRules });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.optionalRules).toEqual(['floating_crits', 'edge']);
    });

    it('should update updatedAt timestamp', () => {
      const createResult = repository.createEncounter({ name: 'Timestamp Update' });
      const originalEncounter = repository.getEncounterById(createResult.id!);
      const originalUpdatedAt = originalEncounter?.updatedAt;

      // Update the encounter
      repository.updateEncounter(createResult.id!, { name: 'New Name' });

      const updatedEncounter = repository.getEncounterById(createResult.id!);
      // The updatedAt should be >= the original (may be same if fast execution)
      expect(updatedEncounter?.updatedAt).toBeDefined();
      expect(updatedEncounter!.updatedAt >= originalUpdatedAt!).toBe(true);
    });

    it('should return NOT_FOUND error for non-existent encounter', () => {
      const result = repository.updateEncounter('non-existent-id', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(EncounterErrorCode.NotFound);
      expect(result.error).toBe('Encounter not found');
    });

    it('should return INVALID_STATUS error when updating Launched encounter', () => {
      const createResult = repository.createEncounter({ name: 'Launched Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Launched);

      const result = repository.updateEncounter(createResult.id!, { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(EncounterErrorCode.InvalidStatus);
      expect(result.error).toContain('launched');
    });

    it('should return INVALID_STATUS error when updating Completed encounter', () => {
      const createResult = repository.createEncounter({ name: 'Completed Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Completed);

      const result = repository.updateEncounter(createResult.id!, { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(EncounterErrorCode.InvalidStatus);
      expect(result.error).toContain('completed');
    });
  });

  // ===========================================================================
  // Delete Encounter Tests
  // ===========================================================================
  describe('deleteEncounter', () => {
    it('should delete existing encounter', () => {
      const createResult = repository.createEncounter({ name: 'To Delete' });
      const deleteResult = repository.deleteEncounter(createResult.id!);

      expect(deleteResult.success).toBe(true);

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter).toBeNull();
    });

    it('should return NOT_FOUND for non-existent encounter', () => {
      const result = repository.deleteEncounter('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(EncounterErrorCode.NotFound);
    });

    it('should return INVALID_STATUS when deleting Launched encounter', () => {
      const createResult = repository.createEncounter({ name: 'Launched Delete Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Launched);

      const result = repository.deleteEncounter(createResult.id!);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(EncounterErrorCode.InvalidStatus);
      expect(result.error).toBe('Cannot delete a launched encounter');
    });

    it('should allow deleting Draft encounter', () => {
      const createResult = repository.createEncounter({ name: 'Draft Delete' });
      const result = repository.deleteEncounter(createResult.id!);

      expect(result.success).toBe(true);
    });

    it('should allow deleting Ready encounter', () => {
      const createResult = repository.createEncounter({ name: 'Ready Delete' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Ready);

      const result = repository.deleteEncounter(createResult.id!);

      expect(result.success).toBe(true);
    });

    it('should allow deleting Completed encounter', () => {
      const createResult = repository.createEncounter({ name: 'Completed Delete' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Completed);

      const result = repository.deleteEncounter(createResult.id!);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Set Encounter Status Tests
  // ===========================================================================
  describe('setEncounterStatus', () => {
    it('should set status to Ready', () => {
      const createResult = repository.createEncounter({ name: 'Status Ready Test' });
      const result = repository.setEncounterStatus(createResult.id!, EncounterStatus.Ready);

      expect(result.success).toBe(true);

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Ready);
    });

    it('should set status to Launched', () => {
      const createResult = repository.createEncounter({ name: 'Status Launched Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Launched);

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Launched);
    });

    it('should set status to Completed', () => {
      const createResult = repository.createEncounter({ name: 'Status Completed Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Completed);

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Completed);
    });

    it('should update updatedAt when status changes', () => {
      const createResult = repository.createEncounter({ name: 'Status Timestamp Test' });
      const originalEncounter = repository.getEncounterById(createResult.id!);
      const originalUpdatedAt = originalEncounter?.updatedAt;

      repository.setEncounterStatus(createResult.id!, EncounterStatus.Ready);

      const updatedEncounter = repository.getEncounterById(createResult.id!);
      // The updatedAt should be >= the original (may be same if fast execution)
      expect(updatedEncounter?.updatedAt).toBeDefined();
      expect(updatedEncounter!.updatedAt >= originalUpdatedAt!).toBe(true);
    });

    it('should return success with id for valid status change', () => {
      const createResult = repository.createEncounter({ name: 'Status Return Test' });
      const result = repository.setEncounterStatus(createResult.id!, EncounterStatus.Ready);

      expect(result.success).toBe(true);
      expect(result.id).toBe(createResult.id);
    });
  });

  // ===========================================================================
  // Link Game Session Tests
  // ===========================================================================
  describe('linkGameSession', () => {
    it('should link game session and set status to Launched', () => {
      const createResult = repository.createEncounter({ name: 'Link Session Test' });
      const result = repository.linkGameSession(createResult.id!, 'game-session-123');

      expect(result.success).toBe(true);

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.gameSessionId).toBe('game-session-123');
      expect(encounter?.status).toBe(EncounterStatus.Launched);
    });

    it('should update updatedAt when linking session', () => {
      const createResult = repository.createEncounter({ name: 'Link Timestamp Test' });
      const originalEncounter = repository.getEncounterById(createResult.id!);
      const originalUpdatedAt = originalEncounter?.updatedAt;

      repository.linkGameSession(createResult.id!, 'game-456');

      const updatedEncounter = repository.getEncounterById(createResult.id!);
      // The updatedAt should be >= the original (may be same if fast execution)
      expect(updatedEncounter?.updatedAt).toBeDefined();
      expect(updatedEncounter!.updatedAt >= originalUpdatedAt!).toBe(true);
    });

    it('should return encounter id on success', () => {
      const createResult = repository.createEncounter({ name: 'Link ID Test' });
      const result = repository.linkGameSession(createResult.id!, 'game-789');

      expect(result.id).toBe(createResult.id);
    });
  });

  // ===========================================================================
  // Status Recalculation Tests
  // ===========================================================================
  describe('status recalculation', () => {
    it('should remain Draft when only player force is set', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Test 1' });
      repository.updateEncounter(createResult.id!, { playerForceId: 'force-1' });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Draft);
    });

    it('should remain Draft when player force and opponent force set but no victory conditions', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Test 2' });
      repository.updateEncounter(createResult.id!, {
        playerForceId: 'force-1',
        opponentForceId: 'force-2',
        victoryConditions: [], // Explicitly empty
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Draft);
    });

    it('should become Ready when player force, opponent force, and victory conditions are set', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Test 3' });
      repository.updateEncounter(createResult.id!, {
        playerForceId: 'force-1',
        opponentForceId: 'force-2',
        victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Ready);
    });

    it('should become Ready when player force, OpFor config, and victory conditions are set', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Test 4' });
      repository.updateEncounter(createResult.id!, {
        playerForceId: 'force-1',
        opForConfig: { targetBV: 5000, pilotSkillTemplate: PilotSkillTemplate.Regular },
        victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
      });

      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Ready);
    });

    it('should not change Launched status during recalculation', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Launched Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Launched);

      // This should not change status since we can't update launched encounters
      const result = repository.updateEncounter(createResult.id!, { name: 'New Name' });

      expect(result.success).toBe(false);
      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Launched);
    });

    it('should not change Completed status during recalculation', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Completed Test' });
      repository.setEncounterStatus(createResult.id!, EncounterStatus.Completed);

      const result = repository.updateEncounter(createResult.id!, { name: 'New Name' });

      expect(result.success).toBe(false);
      const encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Completed);
    });

    it('should revert from Ready to Draft when victory conditions are cleared', () => {
      const createResult = repository.createEncounter({ name: 'Recalc Revert Test' });

      // First make it Ready
      repository.updateEncounter(createResult.id!, {
        playerForceId: 'force-1',
        opponentForceId: 'force-2',
        victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
      });

      let encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Ready);

      // Clear victory conditions (this field can be set to empty array)
      repository.updateEncounter(createResult.id!, { victoryConditions: [] });

      encounter = repository.getEncounterById(createResult.id!);
      expect(encounter?.status).toBe(EncounterStatus.Draft);
    });
  });

  // ===========================================================================
  // Row to Encounter Conversion Tests
  // ===========================================================================
  describe('data serialization/deserialization', () => {
    it('should handle null optional fields correctly', () => {
      const createResult = repository.createEncounter({ name: 'Null Fields Test' });
      const encounter = repository.getEncounterById(createResult.id!);

      // Description uses nullish coalescing so null becomes undefined
      expect(encounter?.description).toBeUndefined();
      // Template is cast directly so null remains (null as ScenarioTemplateType | undefined is still null)
      expect(encounter?.template).toBeFalsy();
      // These use truthy checks so null/undefined both become undefined
      expect(encounter?.playerForce).toBeUndefined();
      expect(encounter?.opponentForce).toBeUndefined();
      expect(encounter?.opForConfig).toBeUndefined();
      // gameSessionId uses nullish coalescing so null becomes undefined
      expect(encounter?.gameSessionId).toBeUndefined();
    });

    it('should preserve complex nested objects through serialization', () => {
      const createResult = repository.createEncounter({ name: 'Complex Data Test' });
      repository.updateEncounter(createResult.id!, {
        opForConfig: {
          targetBV: 8000,
          targetBVPercent: 110,
          era: 'Clan Invasion',
          faction: 'Jade Falcon',
          unitTypes: ['BattleMech', 'OmniMech'],
          pilotSkillTemplate: PilotSkillTemplate.Veteran,
        },
        victoryConditions: [
          { type: VictoryConditionType.Cripple, threshold: 75 },
          { type: VictoryConditionType.TurnLimit, turnLimit: 20 },
          { type: VictoryConditionType.Custom, description: 'Hold the hill for 5 turns' },
        ],
        mapConfig: {
          radius: 10,
          terrain: TerrainPreset.LightWoods,
          playerDeploymentZone: 'east',
          opponentDeploymentZone: 'west',
        },
      });

      const encounter = repository.getEncounterById(createResult.id!);

      // Verify OpFor config
      expect(encounter?.opForConfig?.targetBV).toBe(8000);
      expect(encounter?.opForConfig?.targetBVPercent).toBe(110);
      expect(encounter?.opForConfig?.unitTypes).toEqual(['BattleMech', 'OmniMech']);

      // Verify victory conditions
      expect(encounter?.victoryConditions).toHaveLength(3);
      expect(encounter?.victoryConditions[2].description).toBe('Hold the hill for 5 turns');

      // Verify map config
      expect(encounter?.mapConfig.terrain).toBe(TerrainPreset.LightWoods);
      expect(encounter?.mapConfig.playerDeploymentZone).toBe('east');
    });
  });

  // ===========================================================================
  // Singleton Tests
  // ===========================================================================
  describe('getEncounterRepository singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const repo1 = getEncounterRepository();
      const repo2 = getEncounterRepository();

      expect(repo1).toBe(repo2);
    });
  });
});
