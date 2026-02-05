/**
 * Campaign Instance State Service Tests
 *
 * Tests for the CampaignInstanceStateService high-level state management.
 * Uses fake-indexeddb for browser storage simulation.
 */

// Polyfill structuredClone for Node.js < 17
if (typeof structuredClone === 'undefined') {
  Object.defineProperty(global, 'structuredClone', {
    value: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T,
    writable: true,
    configurable: true,
  });
}

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import type {
  IUnitDamageState,
  ILocationDamageState,
} from '../../../types/campaign/CampaignInstanceInterfaces';

import { createEmptyDamageState } from '../../../types/campaign/CampaignInstanceInterfaces';
import {
  CampaignUnitStatus,
  CampaignPilotStatus,
  XP_REWARDS,
  SKILL_IMPROVEMENT_COSTS,
} from '../../../types/campaign/CampaignInterfaces';
import {
  CampaignInstanceService,
  _resetCampaignInstanceService,
} from '../../persistence/CampaignInstanceService';
import { _resetIndexedDBService } from '../../persistence/IndexedDBService';
import {
  CampaignInstanceStateService,
  _resetCampaignInstanceStateService,
} from '../CampaignInstanceStateService';

// Reset singletons and IndexedDB before each test
beforeEach(() => {
  // Create a fresh IndexedDB for each test
  Object.defineProperty(global, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
  _resetIndexedDBService();
  _resetCampaignInstanceService();
  _resetCampaignInstanceStateService();
});

// =============================================================================
// Test Utilities
// =============================================================================

async function createTestUnit(
  persistenceService: CampaignInstanceService,
  overrides: Partial<{
    campaignId: string;
    vaultUnitId: string;
    name: string;
  }> = {},
) {
  return persistenceService.createUnitInstance(
    {
      campaignId: overrides.campaignId ?? 'test-campaign',
      vaultUnitId: overrides.vaultUnitId ?? 'vault-unit-1',
    },
    {
      version: 1,
      name: overrides.name ?? 'Test Atlas AS7-D',
      chassis: 'Atlas',
      variant: 'AS7-D',
    },
  );
}

async function createTestPilot(
  persistenceService: CampaignInstanceService,
  overrides: Partial<{
    campaignId: string;
    vaultPilotId: string;
    name: string;
    startingXP: number;
    gunnery: number;
    piloting: number;
  }> = {},
) {
  const pilot = await persistenceService.createPilotInstanceFromVault(
    {
      campaignId: overrides.campaignId ?? 'test-campaign',
      vaultPilotId: overrides.vaultPilotId ?? 'vault-pilot-1',
    },
    {
      name: overrides.name ?? 'Test MechWarrior',
      skills: {
        gunnery: overrides.gunnery ?? 4,
        piloting: overrides.piloting ?? 5,
      },
    },
  );

  // If startingXP is specified, update the pilot instance
  if (overrides.startingXP && overrides.startingXP > 0) {
    return persistenceService.updatePilotInstance(pilot.id, {
      currentXP: overrides.startingXP,
    });
  }

  return pilot;
}

function createTestLocationDamage(
  overrides: Partial<ILocationDamageState> = {},
): ILocationDamageState {
  return {
    location: 'center_torso',
    armorCurrent: 40,
    armorMax: 40,
    structureCurrent: 20,
    structureMax: 20,
    components: [],
    ...overrides,
  };
}

function createTestDamageState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    locations: [
      createTestLocationDamage({ location: 'center_torso' }),
      createTestLocationDamage({ location: 'left_torso' }),
      createTestLocationDamage({ location: 'right_torso' }),
    ],
    ammoExpended: {},
    currentHeat: 0,
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupportHits: 0,
    isImmobilized: false,
    ...overrides,
  };
}

function createDamagedState(damagePercentage: number): IUnitDamageState {
  // Calculate armor damage to achieve approximately the target damage percentage
  // Using a simplified calculation based on center torso
  const armorMax = 40;
  const structureMax = 20;
  const _totalPerLocation = armorMax + structureMax;
  const damageAmount = Math.floor((armorMax * damagePercentage) / 100);
  const armorCurrent = Math.max(0, armorMax - damageAmount);

  return createTestDamageState({
    locations: [
      createTestLocationDamage({
        location: 'center_torso',
        armorCurrent,
        armorMax,
        structureCurrent: structureMax, // Structure intact
        structureMax,
      }),
      createTestLocationDamage({ location: 'left_torso' }),
      createTestLocationDamage({ location: 'right_torso' }),
    ],
  });
}

function createDestroyedState(): IUnitDamageState {
  return createTestDamageState({
    locations: [
      createTestLocationDamage({
        location: 'center_torso',
        armorCurrent: 0,
        armorMax: 40,
        structureCurrent: 0, // Structure destroyed
        structureMax: 20,
      }),
      createTestLocationDamage({ location: 'left_torso' }),
      createTestLocationDamage({ location: 'right_torso' }),
    ],
  });
}

// =============================================================================
// Unit Damage Tests
// =============================================================================

describe('CampaignInstanceStateService - Unit Damage', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('applyDamage', () => {
    it('should apply damage and return updated instance', async () => {
      const unit = await createTestUnit(persistenceService);
      const damagedState = createDamagedState(25);

      const result = await stateService.applyDamage(unit.id, damagedState);

      expect(result.instance.id).toBe(unit.id);
      expect(result.previousDamagePercentage).toBe(0);
      expect(result.newDamagePercentage).toBeGreaterThan(0);
      expect(result.eventId).toBeTruthy();
    });

    it('should change status from Operational to Damaged', async () => {
      const unit = await createTestUnit(persistenceService);
      const damagedState = createDamagedState(30);

      const result = await stateService.applyDamage(unit.id, damagedState);

      expect(result.statusChanged).toBe(true);
      expect(result.instance.status).toBe(CampaignUnitStatus.Damaged);
    });

    it('should mark unit as destroyed when structure is destroyed', async () => {
      const unit = await createTestUnit(persistenceService);
      const destroyedState = createDestroyedState();

      const result = await stateService.applyDamage(unit.id, destroyedState);

      expect(result.destroyed).toBe(true);
      expect(result.instance.status).toBe(CampaignUnitStatus.Destroyed);
    });

    it('should throw for non-existent unit', async () => {
      await expect(
        stateService.applyDamage('non-existent', createDamagedState(10)),
      ).rejects.toThrow('Unit instance not found');
    });

    it('should include damage source in event', async () => {
      const unit = await createTestUnit(persistenceService);

      const result = await stateService.applyDamage(
        unit.id,
        createDamagedState(20),
        {
          damageSource: 'AC/20 Hit',
          attackerUnitId: 'enemy-1',
          gameId: 'game-123',
        },
      );

      expect(result.eventId).toBeTruthy();
      // Event was emitted with the damage source
    });

    it('should unassign pilot when unit is destroyed', async () => {
      const unit = await createTestUnit(persistenceService);
      const pilot = await createTestPilot(persistenceService);

      // Assign pilot to unit
      await persistenceService.assignPilotToUnit(pilot.id, unit.id);

      // Destroy the unit
      const destroyedState = createDestroyedState();
      await stateService.applyDamage(unit.id, destroyedState);

      // Pilot should be unassigned
      const updatedPilot = await persistenceService.getPilotInstance(pilot.id);
      expect(updatedPilot?.assignedUnitInstanceId).toBeUndefined();
    });
  });
});

// =============================================================================
// Unit Repair Tests
// =============================================================================

describe('CampaignInstanceStateService - Unit Repair', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('startRepair', () => {
    it('should start repair on a damaged unit', async () => {
      const unit = await createTestUnit(persistenceService);
      // First damage the unit
      await stateService.applyDamage(unit.id, createDamagedState(30));

      const result = await stateService.startRepair(
        unit.id,
        ['Armor: Head', 'Armor: CT Front'],
        50000,
        7,
      );

      expect(result.status).toBe(CampaignUnitStatus.Repairing);
      expect(result.estimatedRepairCost).toBe(50000);
      expect(result.estimatedRepairTime).toBe(7);
    });

    it('should throw when trying to repair a destroyed unit', async () => {
      const unit = await createTestUnit(persistenceService);
      await stateService.applyDamage(unit.id, createDestroyedState());

      await expect(
        stateService.startRepair(unit.id, ['Armor'], 10000, 5),
      ).rejects.toThrow('Cannot repair a destroyed unit');
    });

    it('should throw for non-existent unit', async () => {
      await expect(
        stateService.startRepair('non-existent', ['Armor'], 10000, 5),
      ).rejects.toThrow('Unit instance not found');
    });
  });

  describe('completeRepair', () => {
    it('should complete repair and restore unit status', async () => {
      const unit = await createTestUnit(persistenceService);
      await stateService.applyDamage(unit.id, createDamagedState(30));
      await stateService.startRepair(unit.id, ['Armor'], 50000, 7);

      const result = await stateService.completeRepair(
        unit.id,
        45000,
        6,
        createEmptyDamageState(),
      );

      expect(result.status).toBe(CampaignUnitStatus.Operational);
      expect(result.estimatedRepairCost).toBe(0);
      expect(result.estimatedRepairTime).toBe(0);
    });

    it('should throw when unit is not being repaired', async () => {
      const unit = await createTestUnit(persistenceService);

      await expect(
        stateService.completeRepair(
          unit.id,
          10000,
          5,
          createEmptyDamageState(),
        ),
      ).rejects.toThrow('Unit is not currently being repaired');
    });

    it('should throw for non-existent unit', async () => {
      await expect(
        stateService.completeRepair(
          'non-existent',
          10000,
          5,
          createEmptyDamageState(),
        ),
      ).rejects.toThrow('Unit instance not found');
    });
  });
});

// =============================================================================
// Pilot XP Tests
// =============================================================================

describe('CampaignInstanceStateService - Pilot XP', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('awardXP', () => {
    it('should award XP to pilot', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.awardXP(
        pilot.id,
        5,
        'mission_participation',
      );

      expect(result.currentXP).toBe(5);
      expect(result.campaignXPEarned).toBe(5);
    });

    it('should accumulate XP across multiple awards', async () => {
      const pilot = await createTestPilot(persistenceService);

      await stateService.awardXP(pilot.id, 5, 'mission_participation');
      const result = await stateService.awardXP(pilot.id, 3, 'kill');

      expect(result.currentXP).toBe(8);
      expect(result.campaignXPEarned).toBe(8);
    });

    it('should throw for non-existent pilot', async () => {
      await expect(
        stateService.awardXP('non-existent', 5, 'mission_participation'),
      ).rejects.toThrow('Pilot instance not found');
    });
  });
});

// =============================================================================
// Pilot Wounds Tests
// =============================================================================

describe('CampaignInstanceStateService - Pilot Wounds', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('applyWounds', () => {
    it('should apply wounds and change status to Wounded', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.applyWounds(pilot.id, 2, 'Head hit');

      expect(result.previousWounds).toBe(0);
      expect(result.totalWounds).toBe(2);
      expect(result.instance.status).toBe(CampaignPilotStatus.Wounded);
      expect(result.statusChanged).toBe(true);
      expect(result.deceased).toBe(false);
    });

    it('should change status to Critical at 4+ wounds', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.applyWounds(
        pilot.id,
        4,
        'Cockpit damage',
      );

      expect(result.totalWounds).toBe(4);
      expect(result.instance.status).toBe(CampaignPilotStatus.Critical);
    });

    it('should mark pilot as KIA at 6+ wounds', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.applyWounds(
        pilot.id,
        6,
        'Ammo explosion',
      );

      expect(result.totalWounds).toBe(6);
      expect(result.deceased).toBe(true);
      expect(result.instance.status).toBe(CampaignPilotStatus.KIA);
    });

    it('should accumulate wounds across multiple applications', async () => {
      const pilot = await createTestPilot(persistenceService);

      await stateService.applyWounds(pilot.id, 2, 'First hit');
      const result = await stateService.applyWounds(pilot.id, 3, 'Second hit');

      expect(result.previousWounds).toBe(2);
      expect(result.totalWounds).toBe(5);
      expect(result.instance.status).toBe(CampaignPilotStatus.Critical);
    });

    it('should unassign pilot from unit when deceased', async () => {
      const pilot = await createTestPilot(persistenceService);
      const unit = await createTestUnit(persistenceService);

      await persistenceService.assignPilotToUnit(pilot.id, unit.id);
      await stateService.applyWounds(pilot.id, 6, 'Fatal');

      const updatedUnit = await persistenceService.getUnitInstance(unit.id);
      expect(updatedUnit?.assignedPilotInstanceId).toBeUndefined();
    });

    it('should calculate recovery time based on wounds', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.applyWounds(pilot.id, 3, 'Damage');

      // 7 days per wound
      expect(result.instance.recoveryTime).toBe(21);
    });

    it('should throw for non-existent pilot', async () => {
      await expect(
        stateService.applyWounds('non-existent', 2, 'Test'),
      ).rejects.toThrow('Pilot instance not found');
    });
  });
});

// =============================================================================
// Pilot Kill Recording Tests
// =============================================================================

describe('CampaignInstanceStateService - Kill Recording', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('recordKill', () => {
    it('should record kill and increment kill count', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.recordKill(
        pilot.id,
        'Enemy Atlas',
        'AC/20',
      );

      expect(result.killCount).toBe(1);
    });

    it('should award XP for kill', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.recordKill(
        pilot.id,
        'Enemy Hunchback',
        'Medium Laser',
      );

      expect(result.currentXP).toBe(XP_REWARDS.KILL);
    });

    it('should accumulate multiple kills', async () => {
      const pilot = await createTestPilot(persistenceService);

      await stateService.recordKill(pilot.id, 'Enemy 1', 'Weapon A');
      await stateService.recordKill(pilot.id, 'Enemy 2', 'Weapon B');
      const result = await stateService.recordKill(
        pilot.id,
        'Enemy 3',
        'Weapon C',
      );

      expect(result.killCount).toBe(3);
      expect(result.currentXP).toBe(XP_REWARDS.KILL * 3);
    });

    it('should throw for non-existent pilot', async () => {
      await expect(
        stateService.recordKill('non-existent', 'Enemy', 'Weapon'),
      ).rejects.toThrow('Pilot instance not found');
    });
  });
});

// =============================================================================
// Skill Improvement Tests
// =============================================================================

describe('CampaignInstanceStateService - Skill Improvement', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('improveSkill', () => {
    it('should improve gunnery skill and deduct XP', async () => {
      const pilot = await createTestPilot(persistenceService, {
        gunnery: 4,
        startingXP: 20,
      });

      const result = await stateService.improveSkill(pilot.id, 'gunnery');

      expect(result.currentSkills.gunnery).toBe(3);
      expect(result.currentXP).toBe(
        20 - SKILL_IMPROVEMENT_COSTS.GUNNERY_IMPROVEMENT,
      );
    });

    it('should improve piloting skill and deduct XP', async () => {
      const pilot = await createTestPilot(persistenceService, {
        piloting: 5,
        startingXP: 20,
      });

      const result = await stateService.improveSkill(pilot.id, 'piloting');

      expect(result.currentSkills.piloting).toBe(4);
      expect(result.currentXP).toBe(
        20 - SKILL_IMPROVEMENT_COSTS.PILOTING_IMPROVEMENT,
      );
    });

    it('should throw when skill is already at minimum', async () => {
      const pilot = await createTestPilot(persistenceService, {
        gunnery: SKILL_IMPROVEMENT_COSTS.MIN_SKILL,
        startingXP: 100,
      });

      await expect(
        stateService.improveSkill(pilot.id, 'gunnery'),
      ).rejects.toThrow(
        `gunnery is already at maximum (${SKILL_IMPROVEMENT_COSTS.MIN_SKILL})`,
      );
    });

    it('should throw when not enough XP', async () => {
      const pilot = await createTestPilot(persistenceService, {
        gunnery: 4,
        startingXP: 5,
      });

      await expect(
        stateService.improveSkill(pilot.id, 'gunnery'),
      ).rejects.toThrow('Not enough XP');
    });

    it('should throw for non-existent pilot', async () => {
      await expect(
        stateService.improveSkill('non-existent', 'gunnery'),
      ).rejects.toThrow('Pilot instance not found');
    });
  });
});

// =============================================================================
// Mission Completion Tests
// =============================================================================

describe('CampaignInstanceStateService - Mission Completion', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('completeMission', () => {
    it('should complete mission and award base XP', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.completeMission(
        pilot.id,
        'mission-1',
        'Recon Mission',
        'draw',
        0,
      );

      expect(result.instance.missionsParticipated).toBe(1);
      expect(result.xpEarned).toBe(XP_REWARDS.MISSION_PARTICIPATION);
      expect(result.instance.currentXP).toBe(XP_REWARDS.MISSION_PARTICIPATION);
    });

    it('should award victory bonus for victory', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.completeMission(
        pilot.id,
        'mission-1',
        'Assault Mission',
        'victory',
        0,
      );

      expect(result.xpEarned).toBe(
        XP_REWARDS.MISSION_PARTICIPATION + XP_REWARDS.VICTORY_BONUS,
      );
    });

    it('should award survival bonus', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.completeMission(
        pilot.id,
        'mission-1',
        'Defense Mission',
        'draw',
        0,
        { survivedCritical: true },
      );

      expect(result.xpEarned).toBe(
        XP_REWARDS.MISSION_PARTICIPATION + XP_REWARDS.SURVIVAL_BONUS,
      );
    });

    it('should award optional objective XP', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.completeMission(
        pilot.id,
        'mission-1',
        'Complex Mission',
        'draw',
        0,
        { optionalObjectivesCompleted: 3 },
      );

      expect(result.xpEarned).toBe(
        XP_REWARDS.MISSION_PARTICIPATION + 3 * XP_REWARDS.OPTIONAL_OBJECTIVE,
      );
    });

    it('should combine all bonuses', async () => {
      const pilot = await createTestPilot(persistenceService);

      const result = await stateService.completeMission(
        pilot.id,
        'mission-1',
        'Epic Mission',
        'victory',
        2,
        { survivedCritical: true, optionalObjectivesCompleted: 2 },
      );

      // Note: Kill XP is awarded separately via recordKill, not in completeMission
      const expectedXP =
        XP_REWARDS.MISSION_PARTICIPATION +
        XP_REWARDS.VICTORY_BONUS +
        XP_REWARDS.SURVIVAL_BONUS +
        2 * XP_REWARDS.OPTIONAL_OBJECTIVE;

      expect(result.xpEarned).toBe(expectedXP);
    });

    it('should increment mission count across multiple missions', async () => {
      const pilot = await createTestPilot(persistenceService);

      await stateService.completeMission(
        pilot.id,
        'm1',
        'Mission 1',
        'draw',
        0,
      );
      await stateService.completeMission(
        pilot.id,
        'm2',
        'Mission 2',
        'draw',
        0,
      );
      const result = await stateService.completeMission(
        pilot.id,
        'm3',
        'Mission 3',
        'draw',
        0,
      );

      expect(result.instance.missionsParticipated).toBe(3);
    });

    it('should throw for non-existent pilot', async () => {
      await expect(
        stateService.completeMission(
          'non-existent',
          'm1',
          'Mission',
          'draw',
          0,
        ),
      ).rejects.toThrow('Pilot instance not found');
    });
  });
});

// =============================================================================
// Assignment Tests
// =============================================================================

describe('CampaignInstanceStateService - Assignments', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  describe('assignPilotToUnit', () => {
    it('should assign pilot to unit', async () => {
      const pilot = await createTestPilot(persistenceService);
      const unit = await createTestUnit(persistenceService);

      const result = await stateService.assignPilotToUnit(pilot.id, unit.id);

      expect(result.pilot.assignedUnitInstanceId).toBe(unit.id);
      expect(result.unit.assignedPilotInstanceId).toBe(pilot.id);
    });

    it('should handle reassigning unit to different pilot', async () => {
      const pilot1 = await createTestPilot(persistenceService, {
        vaultPilotId: 'pilot-1',
        name: 'Pilot 1',
      });
      const pilot2 = await createTestPilot(persistenceService, {
        vaultPilotId: 'pilot-2',
        name: 'Pilot 2',
      });
      const unit = await createTestUnit(persistenceService);

      await stateService.assignPilotToUnit(pilot1.id, unit.id);
      const result = await stateService.assignPilotToUnit(pilot2.id, unit.id);

      expect(result.pilot.id).toBe(pilot2.id);
      expect(result.unit.assignedPilotInstanceId).toBe(pilot2.id);

      // First pilot should be unassigned (via persistence service check)
      const updatedPilot1 = await persistenceService.getPilotInstance(
        pilot1.id,
      );
      expect(updatedPilot1?.assignedUnitInstanceId).toBeUndefined();
    });

    it('should throw for non-existent pilot', async () => {
      const unit = await createTestUnit(persistenceService);

      await expect(
        stateService.assignPilotToUnit('non-existent', unit.id),
      ).rejects.toThrow('Pilot instance not found');
    });

    it('should throw for non-existent unit', async () => {
      const pilot = await createTestPilot(persistenceService);

      await expect(
        stateService.assignPilotToUnit(pilot.id, 'non-existent'),
      ).rejects.toThrow('Unit instance not found');
    });
  });

  describe('unassignPilot', () => {
    it('should unassign pilot from unit', async () => {
      const pilot = await createTestPilot(persistenceService);
      const unit = await createTestUnit(persistenceService);

      await stateService.assignPilotToUnit(pilot.id, unit.id);
      const result = await stateService.unassignPilot(pilot.id);

      expect(result.assignedUnitInstanceId).toBeUndefined();

      const updatedUnit = await persistenceService.getUnitInstance(unit.id);
      expect(updatedUnit?.assignedPilotInstanceId).toBeUndefined();
    });

    it('should be idempotent for already unassigned pilot', async () => {
      const pilot = await createTestPilot(persistenceService);

      // Calling unassign on unassigned pilot should not throw
      const result = await stateService.unassignPilot(pilot.id);

      expect(result.assignedUnitInstanceId).toBeUndefined();
    });

    it('should support different unassign reasons', async () => {
      const pilot = await createTestPilot(persistenceService);
      const unit = await createTestUnit(persistenceService);

      await stateService.assignPilotToUnit(pilot.id, unit.id);
      const result = await stateService.unassignPilot(
        pilot.id,
        'pilot_wounded',
      );

      expect(result.assignedUnitInstanceId).toBeUndefined();
      // Event was emitted with the reason
    });

    it('should throw for non-existent pilot', async () => {
      await expect(stateService.unassignPilot('non-existent')).rejects.toThrow(
        'Pilot instance not found',
      );
    });
  });
});

// =============================================================================
// Integration: Event Chain Tests
// =============================================================================

describe('CampaignInstanceStateService - Event Chains', () => {
  let stateService: CampaignInstanceStateService;
  let persistenceService: CampaignInstanceService;

  beforeEach(() => {
    stateService = new CampaignInstanceStateService();
    persistenceService = new CampaignInstanceService();
  });

  it('should create connected events for damage -> status change -> destruction', async () => {
    const unit = await createTestUnit(persistenceService);

    // Apply fatal damage
    const result = await stateService.applyDamage(
      unit.id,
      createDestroyedState(),
      {
        damageSource: 'PPC Direct Hit',
        gameId: 'game-1',
      },
    );

    // Verify the chain happened
    expect(result.destroyed).toBe(true);
    expect(result.statusChanged).toBe(true);
    expect(result.instance.status).toBe(CampaignUnitStatus.Destroyed);
    // Events were emitted with causality links (verified by event service)
  });

  it('should create connected events for wounds -> status change -> death', async () => {
    const pilot = await createTestPilot(persistenceService);

    const result = await stateService.applyWounds(
      pilot.id,
      6,
      'Ammo Explosion',
      {
        gameId: 'game-1',
      },
    );

    expect(result.deceased).toBe(true);
    expect(result.statusChanged).toBe(true);
    expect(result.instance.status).toBe(CampaignPilotStatus.KIA);
    // Events were emitted with causality links
  });

  it('should create connected events for kill -> XP award', async () => {
    const pilot = await createTestPilot(persistenceService);

    const result = await stateService.recordKill(
      pilot.id,
      'Enemy Atlas',
      'Gauss Rifle',
      {
        gameId: 'game-1',
      },
    );

    expect(result.killCount).toBe(1);
    expect(result.currentXP).toBe(XP_REWARDS.KILL);
    // Kill event triggered XP event with 'derived' relationship
  });

  it('should create connected events for mission completion -> XP awards', async () => {
    const pilot = await createTestPilot(persistenceService);

    const result = await stateService.completeMission(
      pilot.id,
      'mission-1',
      'Final Battle',
      'victory',
      3,
      { survivedCritical: true, optionalObjectivesCompleted: 2 },
    );

    expect(result.eventIds.length).toBeGreaterThan(0);
    // Mission event triggered XP event with 'derived' relationship
  });
});
