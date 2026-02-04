/**
 * Pilot Repository Tests
 *
 * Comprehensive unit tests for the SQLite-based pilot repository.
 * Tests all CRUD operations, career tracking, abilities, and XP management.
 */

import {
  PilotRepository,
  getPilotRepository,
  resetPilotRepository,
  PilotErrorCode,
} from '../PilotRepository';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  PilotType,
  PilotStatus,
  ICreatePilotOptions,
  DEFAULT_PILOT_SKILLS,
} from '@/types/pilot';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = './data/test-pilot-repository.db';

describe('PilotRepository', () => {
  let repository: PilotRepository;

  // Helper to create valid pilot options
  const createPilotOptions = (
    overrides: Partial<ICreatePilotOptions> = {}
  ): ICreatePilotOptions => ({
    identity: {
      name: 'Test Pilot',
      callsign: 'Tester',
      affiliation: 'Davion',
      portrait: 'portrait-001',
      background: 'A test pilot background',
    },
    type: PilotType.Persistent,
    skills: DEFAULT_PILOT_SKILLS,
    ...overrides,
  });

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Ensure data directory exists
    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Reset singletons
    resetSQLiteService();
    resetPilotRepository();

    // Initialize with test database
    const sqliteService = getSQLiteService({ path: TEST_DB_PATH });
    sqliteService.initialize();

    repository = getPilotRepository();
  });

  afterEach(() => {
    // Close database and clean up
    resetSQLiteService();
    resetPilotRepository();

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // ===========================================================================
  // create() tests
  // ===========================================================================

  describe('create', () => {
    it('should create a new pilot with default skills', () => {
      const options = createPilotOptions();
      const result = repository.create(options);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^pilot-/);
    });

    it('should create a pilot with custom skills', () => {
      const options = createPilotOptions({
        skills: { gunnery: 3, piloting: 4 },
      });
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.skills.gunnery).toBe(3);
      expect(pilot?.skills.piloting).toBe(4);
    });

    it('should create a pilot with starting XP', () => {
      const options = createPilotOptions({
        startingXp: 100,
      });
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.career?.xp).toBe(100);
      expect(pilot?.career?.totalXpEarned).toBe(100);
    });

    it('should create a pilot with initial abilities', () => {
      const options = createPilotOptions({
        abilityIds: ['marksman', 'dodge'],
      });
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.abilities).toHaveLength(2);
      expect(pilot?.abilities.map((a) => a.abilityId)).toContain('marksman');
      expect(pilot?.abilities.map((a) => a.abilityId)).toContain('dodge');
    });

    it('should create a pilot with a rank', () => {
      const options = createPilotOptions({
        rank: 'Lieutenant',
      });
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.career?.rank).toBe('Lieutenant');
    });

    it('should create a pilot with all identity fields', () => {
      const options = createPilotOptions({
        identity: {
          name: 'John Smith',
          callsign: 'Ghost',
          affiliation: 'Steiner',
          portrait: 'portrait-123',
          background: 'Veteran of the Clan Invasion',
        },
      });
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.name).toBe('John Smith');
      expect(pilot?.callsign).toBe('Ghost');
      expect(pilot?.affiliation).toBe('Steiner');
      expect(pilot?.portrait).toBe('portrait-123');
      expect(pilot?.background).toBe('Veteran of the Clan Invasion');
    });

    it('should create a statblock pilot', () => {
      const options = createPilotOptions({
        type: PilotType.Statblock,
      });
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.type).toBe(PilotType.Statblock);
      // Statblock pilots should not have career data
      expect(pilot?.career).toBeUndefined();
    });

    it('should create a pilot with minimal identity (name only)', () => {
      const options: ICreatePilotOptions = {
        identity: { name: 'Minimal Pilot' },
        type: PilotType.Persistent,
        skills: DEFAULT_PILOT_SKILLS,
      };
      const result = repository.create(options);

      expect(result.success).toBe(true);

      const pilot = repository.getById(result.id!);
      expect(pilot?.name).toBe('Minimal Pilot');
      expect(pilot?.callsign).toBeUndefined();
      expect(pilot?.affiliation).toBeUndefined();
    });

    it('should set initial status to Active', () => {
      const result = repository.create(createPilotOptions());

      const pilot = repository.getById(result.id!);
      expect(pilot?.status).toBe(PilotStatus.Active);
    });

    it('should set initial wounds to 0', () => {
      const result = repository.create(createPilotOptions());

      const pilot = repository.getById(result.id!);
      expect(pilot?.wounds).toBe(0);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const beforeCreate = new Date().toISOString();
      const result = repository.create(createPilotOptions());
      const afterCreate = new Date().toISOString();

      const pilot = repository.getById(result.id!);
      expect(pilot).not.toBeNull();
      expect(pilot!.createdAt).toBeDefined();
      expect(pilot!.updatedAt).toBeDefined();
      expect(pilot!.createdAt >= beforeCreate).toBe(true);
      expect(pilot!.createdAt <= afterCreate).toBe(true);
    });

    it('should initialize career stats to zero for persistent pilots', () => {
      const result = repository.create(createPilotOptions());

      const pilot = repository.getById(result.id!);
      expect(pilot?.career?.missionsCompleted).toBe(0);
      expect(pilot?.career?.victories).toBe(0);
      expect(pilot?.career?.defeats).toBe(0);
      expect(pilot?.career?.draws).toBe(0);
      expect(pilot?.career?.totalKills).toBe(0);
      expect(pilot?.career?.killRecords).toHaveLength(0);
      expect(pilot?.career?.missionHistory).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getById() tests
  // ===========================================================================

  describe('getById', () => {
    it('should return null for non-existent pilot', () => {
      const pilot = repository.getById('non-existent-id');
      expect(pilot).toBeNull();
    });

    it('should return the pilot after creation', () => {
      const createResult = repository.create(createPilotOptions());
      const pilot = repository.getById(createResult.id!);

      expect(pilot).not.toBeNull();
      expect(pilot?.id).toBe(createResult.id);
    });

    it('should return pilot with all abilities loaded', () => {
      const createResult = repository.create(
        createPilotOptions({ abilityIds: ['marksman', 'dodge', 'toughness'] })
      );

      const pilot = repository.getById(createResult.id!);

      expect(pilot?.abilities).toHaveLength(3);
      pilot?.abilities.forEach((ability) => {
        expect(ability.abilityId).toBeDefined();
        expect(ability.acquiredDate).toBeDefined();
      });
    });

    it('should return pilot with career data for persistent pilots', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 50 })
      );

      const pilot = repository.getById(createResult.id!);

      expect(pilot?.career).toBeDefined();
      expect(pilot?.career?.xp).toBe(50);
      expect(pilot?.career?.rank).toBe('MechWarrior'); // Default rank
    });
  });

  // ===========================================================================
  // update() tests
  // ===========================================================================

  describe('update', () => {
    it('should update pilot name', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        name: 'Updated Name',
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.name).toBe('Updated Name');
    });

    it('should update pilot callsign', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        callsign: 'NewCallsign',
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.callsign).toBe('NewCallsign');
    });

    it('should update pilot affiliation', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        affiliation: 'Liao',
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.affiliation).toBe('Liao');
    });

    it('should update pilot portrait', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        portrait: 'new-portrait',
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.portrait).toBe('new-portrait');
    });

    it('should update pilot background', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        background: 'New background story',
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.background).toBe('New background story');
    });

    it('should update pilot status', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        status: PilotStatus.Injured,
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.status).toBe(PilotStatus.Injured);
    });

    it('should update pilot skills', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        skills: { gunnery: 2, piloting: 3 },
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.skills.gunnery).toBe(2);
      expect(pilot?.skills.piloting).toBe(3);
    });

    it('should update pilot wounds', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        wounds: 3,
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.wounds).toBe(3);
    });

    it('should update updatedAt timestamp', () => {
      const createResult = repository.create(createPilotOptions());
      const pilotBefore = repository.getById(createResult.id!);

      // updatedAt should be set and a valid ISO date
      expect(pilotBefore?.updatedAt).toBeDefined();

      repository.update(createResult.id!, { name: 'Updated' });

      const pilotAfter = repository.getById(createResult.id!);
      expect(pilotAfter?.updatedAt).toBeDefined();
      // updatedAt should be >= createdAt after update
      expect(pilotAfter!.updatedAt >= pilotBefore!.createdAt).toBe(true);
    });

    it('should return success with no changes when no fields provided', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {});

      expect(updateResult.success).toBe(true);
      expect(updateResult.id).toBe(createResult.id);
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.update('non-existent-id', { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });

    it('should clear optional fields when set to empty string', () => {
      const createResult = repository.create(
        createPilotOptions({
          identity: {
            name: 'Test',
            callsign: 'Original',
          },
        })
      );

      repository.update(createResult.id!, { callsign: '' });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.callsign).toBeUndefined();
    });

    it('should update multiple fields at once', () => {
      const createResult = repository.create(createPilotOptions());
      const updateResult = repository.update(createResult.id!, {
        name: 'New Name',
        callsign: 'New Callsign',
        status: PilotStatus.MIA,
        wounds: 2,
      });

      expect(updateResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.name).toBe('New Name');
      expect(pilot?.callsign).toBe('New Callsign');
      expect(pilot?.status).toBe(PilotStatus.MIA);
      expect(pilot?.wounds).toBe(2);
    });
  });

  // ===========================================================================
  // delete() tests
  // ===========================================================================

  describe('delete', () => {
    it('should delete existing pilot', () => {
      const createResult = repository.create(createPilotOptions());
      const deleteResult = repository.delete(createResult.id!);

      expect(deleteResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot).toBeNull();
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.delete('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });

    it('should return id in result on successful delete', () => {
      const createResult = repository.create(createPilotOptions());
      const deleteResult = repository.delete(createResult.id!);

      expect(deleteResult.id).toBe(createResult.id);
    });
  });

  // ===========================================================================
  // list() tests
  // ===========================================================================

  describe('list', () => {
    it('should return empty array when no pilots', () => {
      const pilots = repository.list();
      expect(pilots).toEqual([]);
    });

    it('should return all pilots', () => {
      repository.create(
        createPilotOptions({ identity: { name: 'Pilot Alpha' } })
      );
      repository.create(
        createPilotOptions({ identity: { name: 'Pilot Beta' } })
      );
      repository.create(
        createPilotOptions({ identity: { name: 'Pilot Gamma' } })
      );

      const pilots = repository.list();

      expect(pilots).toHaveLength(3);
    });

    it('should return pilots sorted by name', () => {
      repository.create(
        createPilotOptions({ identity: { name: 'Zeta Pilot' } })
      );
      repository.create(
        createPilotOptions({ identity: { name: 'Alpha Pilot' } })
      );
      repository.create(
        createPilotOptions({ identity: { name: 'Mike Pilot' } })
      );

      const pilots = repository.list();

      expect(pilots[0].name).toBe('Alpha Pilot');
      expect(pilots[1].name).toBe('Mike Pilot');
      expect(pilots[2].name).toBe('Zeta Pilot');
    });

    it('should return readonly array', () => {
      repository.create(createPilotOptions());

      const pilots = repository.list();

      expect(Array.isArray(pilots)).toBe(true);
    });
  });

  // ===========================================================================
  // listByStatus() tests
  // ===========================================================================

  describe('listByStatus', () => {
    beforeEach(() => {
      // Create pilots with different statuses
      repository.create(
        createPilotOptions({ identity: { name: 'Active Pilot 1' } })
      );
      repository.create(
        createPilotOptions({ identity: { name: 'Active Pilot 2' } })
      );
      const pilot3 = repository.create(
        createPilotOptions({ identity: { name: 'Injured Pilot' } })
      );
      const pilot4 = repository.create(
        createPilotOptions({ identity: { name: 'KIA Pilot' } })
      );

      repository.update(pilot3.id!, { status: PilotStatus.Injured });
      repository.update(pilot4.id!, { status: PilotStatus.KIA });
    });

    it('should return only pilots with matching status', () => {
      const activePilots = repository.listByStatus(PilotStatus.Active);

      expect(activePilots).toHaveLength(2);
      activePilots.forEach((pilot) => {
        expect(pilot.status).toBe(PilotStatus.Active);
      });
    });

    it('should return empty array when no pilots match status', () => {
      const miaPilots = repository.listByStatus(PilotStatus.MIA);

      expect(miaPilots).toHaveLength(0);
    });

    it('should return injured pilots', () => {
      const injuredPilots = repository.listByStatus(PilotStatus.Injured);

      expect(injuredPilots).toHaveLength(1);
      expect(injuredPilots[0].name).toBe('Injured Pilot');
    });

    it('should return KIA pilots', () => {
      const kiaPilots = repository.listByStatus(PilotStatus.KIA);

      expect(kiaPilots).toHaveLength(1);
      expect(kiaPilots[0].name).toBe('KIA Pilot');
    });

    it('should return pilots sorted by name', () => {
      const activePilots = repository.listByStatus(PilotStatus.Active);

      expect(activePilots[0].name).toBe('Active Pilot 1');
      expect(activePilots[1].name).toBe('Active Pilot 2');
    });
  });

  // ===========================================================================
  // exists() tests
  // ===========================================================================

  describe('exists', () => {
    it('should return true for existing pilot', () => {
      const createResult = repository.create(createPilotOptions());

      expect(repository.exists(createResult.id!)).toBe(true);
    });

    it('should return false for non-existent pilot', () => {
      expect(repository.exists('non-existent-id')).toBe(false);
    });

    it('should return false after pilot is deleted', () => {
      const createResult = repository.create(createPilotOptions());
      repository.delete(createResult.id!);

      expect(repository.exists(createResult.id!)).toBe(false);
    });
  });

  // ===========================================================================
  // addAbility() tests
  // ===========================================================================

  describe('addAbility', () => {
    it('should add ability to pilot', () => {
      const createResult = repository.create(createPilotOptions());
      const addResult = repository.addAbility(createResult.id!, 'marksman');

      expect(addResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.abilities).toHaveLength(1);
      expect(pilot?.abilities[0].abilityId).toBe('marksman');
    });

    it('should set acquiredDate on ability', () => {
      const beforeAdd = new Date().toISOString();
      const createResult = repository.create(createPilotOptions());
      repository.addAbility(createResult.id!, 'marksman');
      const afterAdd = new Date().toISOString();

      const pilot = repository.getById(createResult.id!);
      expect(pilot).not.toBeNull();
      expect(pilot!.abilities[0].acquiredDate).toBeDefined();
      expect(pilot!.abilities[0].acquiredDate >= beforeAdd).toBe(true);
      expect(pilot!.abilities[0].acquiredDate <= afterAdd).toBe(true);
    });

    it('should set acquiredGameId when provided', () => {
      const createResult = repository.create(createPilotOptions());
      repository.addAbility(createResult.id!, 'marksman', 'game-123');

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.abilities[0].acquiredGameId).toBe('game-123');
    });

    it('should not set acquiredGameId when not provided', () => {
      const createResult = repository.create(createPilotOptions());
      repository.addAbility(createResult.id!, 'marksman');

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.abilities[0].acquiredGameId).toBeUndefined();
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.addAbility('non-existent-id', 'marksman');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });

    it('should allow adding multiple abilities', () => {
      const createResult = repository.create(createPilotOptions());
      repository.addAbility(createResult.id!, 'marksman');
      repository.addAbility(createResult.id!, 'dodge');
      repository.addAbility(createResult.id!, 'toughness');

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.abilities).toHaveLength(3);
    });
  });

  // ===========================================================================
  // removeAbility() tests
  // ===========================================================================

  describe('removeAbility', () => {
    it('should remove ability from pilot', () => {
      const createResult = repository.create(
        createPilotOptions({ abilityIds: ['marksman', 'dodge'] })
      );
      const removeResult = repository.removeAbility(
        createResult.id!,
        'marksman'
      );

      expect(removeResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.abilities).toHaveLength(1);
      expect(pilot?.abilities[0].abilityId).toBe('dodge');
    });

    it('should succeed even if ability does not exist on pilot', () => {
      const createResult = repository.create(createPilotOptions());
      const removeResult = repository.removeAbility(
        createResult.id!,
        'non-existent-ability'
      );

      expect(removeResult.success).toBe(true);
    });

    it('should return pilot id in result', () => {
      const createResult = repository.create(
        createPilotOptions({ abilityIds: ['marksman'] })
      );
      const removeResult = repository.removeAbility(
        createResult.id!,
        'marksman'
      );

      expect(removeResult.id).toBe(createResult.id);
    });
  });

  // ===========================================================================
  // recordKill() tests
  // ===========================================================================

  describe('recordKill', () => {
    it('should record a kill for pilot', () => {
      const createResult = repository.create(createPilotOptions());
      const killResult = repository.recordKill(createResult.id!, {
        targetId: 'unit-123',
        targetName: 'Atlas AS7-D',
        weaponUsed: 'AC/20',
        gameId: 'game-456',
      });

      expect(killResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.totalKills).toBe(1);
      expect(pilot?.career?.killRecords).toHaveLength(1);
      expect(pilot?.career?.killRecords[0].targetName).toBe('Atlas AS7-D');
      expect(pilot?.career?.killRecords[0].weaponUsed).toBe('AC/20');
    });

    it('should set kill date automatically', () => {
      const beforeKill = new Date().toISOString();
      const createResult = repository.create(createPilotOptions());
      repository.recordKill(createResult.id!, {
        targetId: 'unit-123',
        targetName: 'Atlas AS7-D',
        weaponUsed: 'AC/20',
        gameId: 'game-456',
      });
      const afterKill = new Date().toISOString();

      const pilot = repository.getById(createResult.id!);
      expect(pilot).not.toBeNull();
      expect(pilot!.career).toBeDefined();
      expect(pilot!.career!.killRecords[0].date >= beforeKill).toBe(true);
      expect(pilot!.career!.killRecords[0].date <= afterKill).toBe(true);
    });

    it('should increment total kills counter', () => {
      const createResult = repository.create(createPilotOptions());

      repository.recordKill(createResult.id!, {
        targetId: 'unit-1',
        targetName: 'Target 1',
        weaponUsed: 'PPC',
        gameId: 'game-1',
      });
      repository.recordKill(createResult.id!, {
        targetId: 'unit-2',
        targetName: 'Target 2',
        weaponUsed: 'LRM',
        gameId: 'game-1',
      });
      repository.recordKill(createResult.id!, {
        targetId: 'unit-3',
        targetName: 'Target 3',
        weaponUsed: 'AC/10',
        gameId: 'game-2',
      });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.totalKills).toBe(3);
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.recordKill('non-existent-id', {
        targetId: 'unit-123',
        targetName: 'Target',
        weaponUsed: 'PPC',
        gameId: 'game-456',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });
  });

  // ===========================================================================
  // recordMission() tests
  // ===========================================================================

  describe('recordMission', () => {
    it('should record a victory mission', () => {
      const createResult = repository.create(createPilotOptions());
      const missionResult = repository.recordMission(createResult.id!, {
        gameId: 'game-123',
        missionName: 'Battle of Tukayyid',
        outcome: 'victory',
        xpEarned: 25,
        kills: 2,
      });

      expect(missionResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.missionsCompleted).toBe(1);
      expect(pilot?.career?.victories).toBe(1);
      expect(pilot?.career?.defeats).toBe(0);
      expect(pilot?.career?.draws).toBe(0);
    });

    it('should record a defeat mission', () => {
      const createResult = repository.create(createPilotOptions());
      repository.recordMission(createResult.id!, {
        gameId: 'game-123',
        missionName: 'Defense of Luthien',
        outcome: 'defeat',
        xpEarned: 10,
        kills: 0,
      });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.missionsCompleted).toBe(1);
      expect(pilot?.career?.victories).toBe(0);
      expect(pilot?.career?.defeats).toBe(1);
    });

    it('should record a draw mission', () => {
      const createResult = repository.create(createPilotOptions());
      repository.recordMission(createResult.id!, {
        gameId: 'game-123',
        missionName: 'Raid on Solaris',
        outcome: 'draw',
        xpEarned: 15,
        kills: 1,
      });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.missionsCompleted).toBe(1);
      expect(pilot?.career?.draws).toBe(1);
    });

    it('should add XP from mission', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 50 })
      );
      repository.recordMission(createResult.id!, {
        gameId: 'game-123',
        missionName: 'Test Mission',
        outcome: 'victory',
        xpEarned: 30,
        kills: 1,
      });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(80);
      expect(pilot?.career?.totalXpEarned).toBe(80);
    });

    it('should record mission in history', () => {
      const createResult = repository.create(createPilotOptions());
      repository.recordMission(createResult.id!, {
        gameId: 'game-123',
        missionName: 'Test Mission',
        outcome: 'victory',
        xpEarned: 25,
        kills: 2,
      });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.missionHistory).toHaveLength(1);
      expect(pilot?.career?.missionHistory[0].missionName).toBe('Test Mission');
      expect(pilot?.career?.missionHistory[0].outcome).toBe('victory');
      expect(pilot?.career?.missionHistory[0].xpEarned).toBe(25);
      expect(pilot?.career?.missionHistory[0].kills).toBe(2);
    });

    it('should set mission date automatically', () => {
      const beforeMission = new Date().toISOString();
      const createResult = repository.create(createPilotOptions());
      repository.recordMission(createResult.id!, {
        gameId: 'game-123',
        missionName: 'Test Mission',
        outcome: 'victory',
        xpEarned: 25,
        kills: 0,
      });
      const afterMission = new Date().toISOString();

      const pilot = repository.getById(createResult.id!);
      expect(pilot).not.toBeNull();
      expect(pilot!.career).toBeDefined();
      expect(pilot!.career!.missionHistory[0].date >= beforeMission).toBe(true);
      expect(pilot!.career!.missionHistory[0].date <= afterMission).toBe(true);
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.recordMission('non-existent-id', {
        gameId: 'game-123',
        missionName: 'Test',
        outcome: 'victory',
        xpEarned: 10,
        kills: 0,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });

    it('should accumulate multiple missions', () => {
      const createResult = repository.create(createPilotOptions());

      repository.recordMission(createResult.id!, {
        gameId: 'game-1',
        missionName: 'Mission 1',
        outcome: 'victory',
        xpEarned: 25,
        kills: 2,
      });
      repository.recordMission(createResult.id!, {
        gameId: 'game-2',
        missionName: 'Mission 2',
        outcome: 'defeat',
        xpEarned: 10,
        kills: 0,
      });
      repository.recordMission(createResult.id!, {
        gameId: 'game-3',
        missionName: 'Mission 3',
        outcome: 'victory',
        xpEarned: 30,
        kills: 3,
      });

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.missionsCompleted).toBe(3);
      expect(pilot?.career?.victories).toBe(2);
      expect(pilot?.career?.defeats).toBe(1);
      expect(pilot?.career?.xp).toBe(65);
      expect(pilot?.career?.missionHistory).toHaveLength(3);
    });
  });

  // ===========================================================================
  // addXp() tests
  // ===========================================================================

  describe('addXp', () => {
    it('should add XP to pilot', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 50 })
      );
      const addResult = repository.addXp(createResult.id!, 25);

      expect(addResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(75);
      expect(pilot?.career?.totalXpEarned).toBe(75);
    });

    it('should add XP to pilot with zero XP', () => {
      const createResult = repository.create(createPilotOptions());
      repository.addXp(createResult.id!, 100);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(100);
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.addXp('non-existent-id', 50);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });

    it('should accumulate multiple XP additions', () => {
      const createResult = repository.create(createPilotOptions());
      repository.addXp(createResult.id!, 10);
      repository.addXp(createResult.id!, 20);
      repository.addXp(createResult.id!, 30);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(60);
      expect(pilot?.career?.totalXpEarned).toBe(60);
    });
  });

  // ===========================================================================
  // spendXp() tests
  // ===========================================================================

  describe('spendXp', () => {
    it('should spend XP from pilot pool', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 100 })
      );
      const spendResult = repository.spendXp(createResult.id!, 30);

      expect(spendResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(70);
      expect(pilot?.career?.totalXpEarned).toBe(100); // Total earned unchanged
    });

    it('should spend all available XP', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 50 })
      );
      const spendResult = repository.spendXp(createResult.id!, 50);

      expect(spendResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(0);
    });

    it('should return error when insufficient XP', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 50 })
      );
      const spendResult = repository.spendXp(createResult.id!, 100);

      expect(spendResult.success).toBe(false);
      expect(spendResult.errorCode).toBe(PilotErrorCode.InsufficientXp);
      expect(spendResult.error).toContain('Insufficient XP');
      expect(spendResult.error).toContain('Have 50');
      expect(spendResult.error).toContain('need 100');
    });

    it('should return error for non-existent pilot', () => {
      const result = repository.spendXp('non-existent-id', 10);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(PilotErrorCode.NotFound);
    });

    it('should allow spending after earning more XP', () => {
      const createResult = repository.create(
        createPilotOptions({ startingXp: 50 })
      );

      // First spend
      repository.spendXp(createResult.id!, 30);

      // Earn more
      repository.addXp(createResult.id!, 40);

      // Spend again
      const spendResult = repository.spendXp(createResult.id!, 50);
      expect(spendResult.success).toBe(true);

      const pilot = repository.getById(createResult.id!);
      expect(pilot?.career?.xp).toBe(10); // 50 - 30 + 40 - 50 = 10
      expect(pilot?.career?.totalXpEarned).toBe(90); // 50 + 40
    });
  });

  // ===========================================================================
  // Singleton tests
  // ===========================================================================

  describe('singleton', () => {
    it('getPilotRepository should return same instance', () => {
      const repo1 = getPilotRepository();
      const repo2 = getPilotRepository();

      expect(repo1).toBe(repo2);
    });

    it('resetPilotRepository should clear instance', () => {
      const repo1 = getPilotRepository();
      resetPilotRepository();
      const repo2 = getPilotRepository();

      // They should be different instances after reset
      // Note: This test may not work correctly in all scenarios since
      // we're using the same underlying database, but the instances
      // should be different objects
      expect(repo1).not.toBe(repo2);
    });
  });
});
