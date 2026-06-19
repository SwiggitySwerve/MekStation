/**
 * Campaign.test.ts - Comprehensive tests for Campaign aggregate
 *
 * Tests cover:
 * - ICampaign interface structure
 * - ICampaignOptions interface structure
 * - IMission interface structure
 * - Helper functions (personnel, forces, units, balance, missions)
 * - Type guards (isCampaign, isCampaignOptions, isMission)
 * - Factory functions (createCampaign, createMission, createDefaultCampaignOptions)
 * - Integration tests (campaign with personnel + forces + finances)
 */

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import {
  ICampaign,
  IMission,
  getTotalPersonnel,
  getTotalForces,
  getAllUnits,
  getBalance,
  getTotalMissions,
  getMissionsByStatus,
  getActiveMissions,
  getForceById,
  getMissionById,
  getRootForce,
  isMission,
  isCampaignOptions,
  isCampaign,
  createDefaultCampaignOptions,
  createMission,
  createCampaign,
  createCampaignWithData,
} from '../Campaign';
import { CampaignType } from '../CampaignType';
import { MissionStatus, ForceRole, FormationLevel } from '../enums';
import { IForce } from '../Force';
import { IFinances } from '../IFinances';
import { Money } from '../Money';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestForce(
  id: string,
  name: string,
  parentForceId?: string,
  subForceIds: string[] = [],
  unitIds: string[] = [],
): IForce {
  return {
    id,
    name,
    parentForceId,
    subForceIds,
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestMission(
  id: string,
  name: string,
  status: MissionStatus = MissionStatus.PENDING,
): IMission {
  return {
    id,
    name,
    status,
    type: 'mission',
    systemId: 'Unknown System',
    scenarioIds: [],
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestCampaign(): ICampaign {
  const forces = new Map<string, IForce>();
  forces.set(
    'force-root',
    createTestForce(
      'force-root',
      'Root Force',
      undefined,
      ['force-1', 'force-2'],
      [],
    ),
  );
  forces.set(
    'force-1',
    createTestForce(
      'force-1',
      'Alpha Lance',
      'force-root',
      [],
      ['unit-1', 'unit-2'],
    ),
  );
  forces.set(
    'force-2',
    createTestForce(
      'force-2',
      'Beta Lance',
      'force-root',
      [],
      ['unit-3', 'unit-4'],
    ),
  );

  const missions = new Map<string, IMission>();
  missions.set(
    'mission-1',
    createTestMission('mission-1', 'Raid Mission', MissionStatus.ACTIVE),
  );
  missions.set(
    'mission-2',
    createTestMission('mission-2', 'Defense Mission', MissionStatus.PENDING),
  );
  missions.set(
    'mission-3',
    createTestMission('mission-3', 'Completed Mission', MissionStatus.SUCCESS),
  );

  const finances: IFinances = {
    transactions: [],
    balance: new Money(1000000),
  };

  return {
    id: 'campaign-001',
    name: "Wolf's Dragoons",
    currentDate: new Date('3025-01-01'),
    factionId: 'mercenary',
    forces,
    rootForceId: 'force-root',
    missions,
    finances,
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    campaignStartDate: new Date('3025-01-01'),
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: {},
  };
}

// =============================================================================
// ICampaign Interface Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isMission', () => {
    it('should return true for valid mission', () => {
      const mission = createTestMission(
        'mission-1',
        'Test',
        MissionStatus.ACTIVE,
      );
      expect(isMission(mission)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isMission(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMission(undefined)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isMission({ id: 'test' })).toBe(false);
      expect(isMission({ id: 'test', name: 'Test' })).toBe(false);
    });

    it('should return false for wrong field types', () => {
      expect(
        isMission({
          id: 123,
          name: 'Test',
          status: 'Active',
          createdAt: '',
          updatedAt: '',
        }),
      ).toBe(false);
    });
  });

  describe('isCampaignOptions', () => {
    it('should return true for valid options', () => {
      const options = createDefaultCampaignOptions();
      expect(isCampaignOptions(options)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isCampaignOptions(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isCampaignOptions(undefined)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isCampaignOptions({ healingRateMultiplier: 1.0 })).toBe(false);
    });

    it('should return false for wrong field types', () => {
      const invalid = {
        ...createDefaultCampaignOptions(),
        healingRateMultiplier: 'not a number',
      };
      expect(isCampaignOptions(invalid)).toBe(false);
    });
  });

  describe('isCampaign', () => {
    it('should return true for valid campaign', () => {
      const campaign = createTestCampaign();
      expect(isCampaign(campaign)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isCampaign(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isCampaign(undefined)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isCampaign({ id: 'test' })).toBe(false);
    });

    it('should return false for wrong field types', () => {
      const invalid = {
        id: 'test',
        name: 'Test',
        currentDate: 'not a date', // Should be Date
        factionId: 'mercenary',
        forces: new Map(),
        rootForceId: 'force-root',
        missions: new Map(),
        finances: {},
        options: {},
        createdAt: '',
        updatedAt: '',
      };
      expect(isCampaign(invalid)).toBe(false);
    });
  });
});

describe('Factory Functions', () => {
  describe('createDefaultCampaignOptions', () => {
    it('should create options with default values', () => {
      const options = createDefaultCampaignOptions();

      expect(options.healingRateMultiplier).toBe(1.0);
      expect(options.salaryMultiplier).toBe(1.0);
      expect(options.startingFunds).toBe(0);
      expect(options.maxUnitsPerLance).toBe(4);
    });

    it('should create new instance each time', () => {
      const options1 = createDefaultCampaignOptions();
      const options2 = createDefaultCampaignOptions();

      expect(options1).not.toBe(options2);
      expect(options1).toEqual(options2);
    });
  });

  describe('createMission', () => {
    it('should create mission with required fields', () => {
      const mission = createMission({
        id: 'mission-1',
        name: 'Test Mission',
      });

      expect(mission.id).toBe('mission-1');
      expect(mission.name).toBe('Test Mission');
      expect(mission.status).toBe(MissionStatus.PENDING);
      expect(mission.createdAt).toBeDefined();
      expect(mission.updatedAt).toBeDefined();
    });

    it('should create mission with optional fields', () => {
      const mission = createMission({
        id: 'mission-1',
        name: 'Test Mission',
        status: MissionStatus.ACTIVE,
        description: 'A test mission',
        startDate: new Date('3025-06-15'),
        systemId: 'hesperus-ii',
        scenarioIds: ['scenario-1'],
      });

      expect(mission.status).toBe(MissionStatus.ACTIVE);
      expect(mission.description).toBe('A test mission');
      expect(typeof mission.startDate).toBe('string');
      expect(mission.systemId).toBe('hesperus-ii');
      expect(mission.scenarioIds).toEqual(['scenario-1']);
    });

    it('should set timestamps', () => {
      const before = new Date().toISOString();
      const mission = createMission({ id: 'mission-1', name: 'Test' });
      const after = new Date().toISOString();

      expect(mission.createdAt >= before).toBe(true);
      expect(mission.createdAt <= after).toBe(true);
      expect(mission.updatedAt).toBe(mission.createdAt);
    });
  });

  describe('createCampaign', () => {
    it('should create campaign with required fields', () => {
      const campaign = createCampaign("Wolf's Dragoons", 'mercenary');

      expect(campaign.name).toBe("Wolf's Dragoons");
      expect(campaign.factionId).toBe('mercenary');
      expect(campaign.currentDate).toBeInstanceOf(Date);
      // Per PR4: personnel is no longer on ICampaign — roster store owns it.
      expect(campaign.forces).toBeInstanceOf(Map);
      expect(campaign.missions).toBeInstanceOf(Map);
      expect(campaign.finances).toBeDefined();
      expect(campaign.options).toBeDefined();
    });

    it('should create campaign with default options', () => {
      const campaign = createCampaign('Test', 'mercenary');

      expect(campaign.options.healingRateMultiplier).toBe(1.0);
      expect(campaign.options.salaryMultiplier).toBe(1.0);
    });

    it('should merge custom options with defaults', () => {
      const campaign = createCampaign('Test', 'mercenary', {
        startingFunds: 10000000,
        salaryMultiplier: 1.5,
      });

      expect(campaign.options.startingFunds).toBe(10000000);
      expect(campaign.options.salaryMultiplier).toBe(1.5);
      expect(campaign.options.healingRateMultiplier).toBe(1.0); // Default preserved
    });

    it('should set starting balance from options', () => {
      const campaign = createCampaign('Test', 'mercenary', {
        startingFunds: 5000000,
      });

      expect(campaign.finances.balance.amount).toBe(5000000);
    });

    it('should generate unique IDs', () => {
      const campaign1 = createCampaign('Test1', 'mercenary');
      const campaign2 = createCampaign('Test2', 'mercenary');

      expect(campaign1.id).not.toBe(campaign2.id);
      expect(campaign1.rootForceId).not.toBe(campaign2.rootForceId);
    });

    it('should set campaign start date', () => {
      const campaign = createCampaign('Test', 'mercenary');

      expect(campaign.campaignStartDate).toBeInstanceOf(Date);
    });
  });

  describe('createCampaignWithData', () => {
    it('should create campaign with provided data', () => {
      const forces = new Map<string, IForce>();
      forces.set('force-1', createTestForce('force-1', 'Alpha'));

      const missions = new Map<string, IMission>();
      missions.set('mission-1', createTestMission('mission-1', 'Test'));

      const campaign = createCampaignWithData({
        id: 'campaign-custom',
        name: 'Custom Campaign',
        currentDate: new Date('3025-06-15'),
        factionId: 'davion',
        forces,
        rootForceId: 'force-1',
        missions,
        finances: { transactions: [], balance: new Money(5000000) },
        options: createDefaultCampaignOptions(),
        description: 'A custom campaign',
      });

      expect(campaign.id).toBe('campaign-custom');
      expect(campaign.name).toBe('Custom Campaign');
      expect(campaign.factionId).toBe('davion');
      // Per PR4: personnel is no longer a Map field; pilot count lives on roster store.
      expect(campaign.forces.size).toBe(1);
      expect(campaign.missions.size).toBe(1);
      expect(campaign.finances.balance.amount).toBe(5000000);
      expect(campaign.description).toBe('A custom campaign');
    });
  });
});
