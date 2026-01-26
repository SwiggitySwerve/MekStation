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

import {
  ICampaign,
  ICampaignOptions,
  IMission,
  getTotalPersonnel,
  getActivePersonnel,
  getPersonnelByStatus,
  getTotalForces,
  getAllUnits,
  getBalance,
  getTotalMissions,
  getMissionsByStatus,
  getActiveMissions,
  getPersonById,
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
import { IPerson } from '../Person';
import { IForce } from '../Force';
import { IFinances } from '../IFinances';
import { Money } from '../Money';
import {
  PersonnelStatus,
  CampaignPersonnelRole,
  MissionStatus,
  ForceType,
  FormationLevel,
} from '../enums';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestPerson(
  id: string,
  name: string,
  status: PersonnelStatus = PersonnelStatus.ACTIVE
): IPerson {
  return {
    id,
    name,
    status,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    xp: 100,
    totalXpEarned: 100,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    recruitmentDate: new Date('2025-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    daysToWaitForHealing: 0,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestForce(
  id: string,
  name: string,
  parentForceId?: string,
  subForceIds: string[] = [],
  unitIds: string[] = []
): IForce {
  return {
    id,
    name,
    parentForceId,
    subForceIds,
    unitIds,
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestMission(
  id: string,
  name: string,
  status: MissionStatus = MissionStatus.PENDING
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
  const personnel = new Map<string, IPerson>();
  personnel.set('person-1', createTestPerson('person-1', 'John Smith', PersonnelStatus.ACTIVE));
  personnel.set('person-2', createTestPerson('person-2', 'Jane Doe', PersonnelStatus.ACTIVE));
  personnel.set('person-3', createTestPerson('person-3', 'Bob Wilson', PersonnelStatus.WOUNDED));
  personnel.set('person-4', createTestPerson('person-4', 'Alice Brown', PersonnelStatus.MIA));

  const forces = new Map<string, IForce>();
  forces.set('force-root', createTestForce('force-root', 'Root Force', undefined, ['force-1', 'force-2'], []));
  forces.set('force-1', createTestForce('force-1', 'Alpha Lance', 'force-root', [], ['unit-1', 'unit-2']));
  forces.set('force-2', createTestForce('force-2', 'Beta Lance', 'force-root', [], ['unit-3', 'unit-4']));

  const missions = new Map<string, IMission>();
  missions.set('mission-1', createTestMission('mission-1', 'Raid Mission', MissionStatus.ACTIVE));
  missions.set('mission-2', createTestMission('mission-2', 'Defense Mission', MissionStatus.PENDING));
  missions.set('mission-3', createTestMission('mission-3', 'Completed Mission', MissionStatus.SUCCESS));

  const finances: IFinances = {
    transactions: [],
    balance: new Money(1000000),
  };

   return {
     id: 'campaign-001',
     name: "Wolf's Dragoons",
     currentDate: new Date('3025-01-01'),
     factionId: 'mercenary',
     personnel,
     forces,
     rootForceId: 'force-root',
     missions,
     finances,
     factionStandings: {},
     options: createDefaultCampaignOptions(),
     campaignStartDate: new Date('3025-01-01'),
     createdAt: '2026-01-26T10:00:00Z',
     updatedAt: '2026-01-26T10:00:00Z',
   };
}

// =============================================================================
// ICampaign Interface Tests
// =============================================================================

describe('ICampaign Interface', () => {
  describe('interface structure', () => {
    it('should have all required fields', () => {
      const campaign = createTestCampaign();

      expect(campaign.id).toBe('campaign-001');
      expect(campaign.name).toBe("Wolf's Dragoons");
      expect(campaign.currentDate).toBeInstanceOf(Date);
      expect(campaign.factionId).toBe('mercenary');
      expect(campaign.personnel).toBeInstanceOf(Map);
      expect(campaign.forces).toBeInstanceOf(Map);
      expect(campaign.rootForceId).toBe('force-root');
      expect(campaign.missions).toBeInstanceOf(Map);
      expect(campaign.finances).toBeDefined();
      expect(campaign.options).toBeDefined();
      expect(campaign.createdAt).toBe('2026-01-26T10:00:00Z');
      expect(campaign.updatedAt).toBe('2026-01-26T10:00:00Z');
    });

    it('should support optional fields', () => {
      const campaign = createTestCampaign();

      expect(campaign.campaignStartDate).toBeInstanceOf(Date);
      expect(campaign.description).toBeUndefined();
      expect(campaign.iconUrl).toBeUndefined();
    });

    it('should have personnel as Map<string, IPerson>', () => {
      const campaign = createTestCampaign();

      expect(campaign.personnel.size).toBe(4);
      expect(campaign.personnel.get('person-1')?.name).toBe('John Smith');
    });

    it('should have forces as Map<string, IForce>', () => {
      const campaign = createTestCampaign();

      expect(campaign.forces.size).toBe(3);
      expect(campaign.forces.get('force-root')?.name).toBe('Root Force');
    });

    it('should have missions as Map<string, IMission>', () => {
      const campaign = createTestCampaign();

      expect(campaign.missions.size).toBe(3);
      expect(campaign.missions.get('mission-1')?.name).toBe('Raid Mission');
    });
  });
});

// =============================================================================
// ICampaignOptions Interface Tests
// =============================================================================

describe('ICampaignOptions Interface', () => {
  describe('interface structure', () => {
    it('should have all personnel options', () => {
      const options = createDefaultCampaignOptions();

      expect(options.healingRateMultiplier).toBe(1.0);
      expect(options.salaryMultiplier).toBe(1.0);
      expect(options.retirementAge).toBe(65);
      expect(options.healingWaitingPeriod).toBe(1);
      expect(options.useAdvancedMedical).toBe(false);
      expect(options.maxPatientsPerDoctor).toBe(25);
      expect(options.xpPerMission).toBe(1);
      expect(options.xpPerKill).toBe(1);
      expect(options.trackTimeInService).toBe(true);
      expect(options.useEdge).toBe(true);
    });

    it('should have all financial options', () => {
      const options = createDefaultCampaignOptions();

      expect(options.startingFunds).toBe(0);
      expect(options.maintenanceCostMultiplier).toBe(1.0);
      expect(options.repairCostMultiplier).toBe(1.0);
      expect(options.acquisitionCostMultiplier).toBe(1.0);
      expect(options.payForMaintenance).toBe(true);
      expect(options.payForRepairs).toBe(true);
      expect(options.payForSalaries).toBe(true);
      expect(options.payForAmmunition).toBe(true);
      expect(options.maintenanceCycleDays).toBe(7);
      expect(options.useLoanSystem).toBe(true);
    });

    it('should have all combat options', () => {
      const options = createDefaultCampaignOptions();

      expect(options.useAutoResolve).toBe(false);
      expect(options.autoResolveCasualtyRate).toBe(1.0);
      expect(options.allowPilotCapture).toBe(true);
      expect(options.useRandomInjuries).toBe(true);
      expect(options.pilotDeathChance).toBe(0.1);
      expect(options.autoEject).toBe(true);
      expect(options.trackAmmunition).toBe(true);
      expect(options.useQuirks).toBe(false);
    });

    it('should have all force options', () => {
      const options = createDefaultCampaignOptions();

      expect(options.maxUnitsPerLance).toBe(4);
      expect(options.maxLancesPerCompany).toBe(3);
      expect(options.enforceFormationRules).toBe(false);
      expect(options.allowMixedFormations).toBe(true);
      expect(options.requireForceCommanders).toBe(false);
      expect(options.useCombatTeams).toBe(false);
    });

    it('should have all general options', () => {
      const options = createDefaultCampaignOptions();

      expect(options.dateFormat).toBe('yyyy-MM-dd');
      expect(options.useFactionRules).toBe(false);
      expect(options.techLevel).toBe(1);
      expect(options.limitByYear).toBe(true);
      expect(options.allowClanEquipment).toBe(false);
      expect(options.useRandomEvents).toBe(false);
    });
  });
});

// =============================================================================
// IMission Interface Tests
// =============================================================================

describe('IMission Interface', () => {
  describe('interface structure', () => {
    it('should have all required fields', () => {
      const mission = createTestMission('mission-1', 'Test Mission', MissionStatus.ACTIVE);

      expect(mission.id).toBe('mission-1');
      expect(mission.name).toBe('Test Mission');
      expect(mission.status).toBe(MissionStatus.ACTIVE);
      expect(mission.createdAt).toBe('2026-01-26T10:00:00Z');
      expect(mission.updatedAt).toBe('2026-01-26T10:00:00Z');
    });

    it('should support optional fields', () => {
      const mission: IMission = {
        id: 'mission-1',
        name: 'Test Mission',
        status: MissionStatus.ACTIVE,
        type: 'mission',
        systemId: 'hesperus-ii',
        scenarioIds: ['scenario-1'],
        description: 'A test mission',
        briefing: 'Briefing text',
        startDate: '3025-06-15',
        endDate: '3025-06-30',
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      };

      expect(mission.description).toBe('A test mission');
      expect(mission.briefing).toBe('Briefing text');
      expect(mission.startDate).toBe('3025-06-15');
      expect(mission.endDate).toBe('3025-06-30');
      expect(mission.systemId).toBe('hesperus-ii');
      expect(mission.scenarioIds).toEqual(['scenario-1']);
    });

    it('should support all mission statuses', () => {
      const statuses = [
        MissionStatus.ACTIVE,
        MissionStatus.SUCCESS,
        MissionStatus.PARTIAL,
        MissionStatus.FAILED,
        MissionStatus.BREACH,
        MissionStatus.CANCELLED,
        MissionStatus.PENDING,
        MissionStatus.ABORTED,
      ];

      statuses.forEach((status) => {
        const mission = createTestMission('mission-1', 'Test', status);
        expect(mission.status).toBe(status);
      });
    });
  });
});

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('Helper Functions', () => {
  describe('getTotalPersonnel', () => {
    it('should return total personnel count', () => {
      const campaign = createTestCampaign();
      expect(getTotalPersonnel(campaign)).toBe(4);
    });

    it('should return 0 for empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');
      expect(getTotalPersonnel(campaign)).toBe(0);
    });
  });

  describe('getActivePersonnel', () => {
    it('should return only active personnel', () => {
      const campaign = createTestCampaign();
      const active = getActivePersonnel(campaign);

      expect(active).toHaveLength(2);
      expect(active.every((p) => p.status === PersonnelStatus.ACTIVE)).toBe(true);
    });

    it('should return empty array when no active personnel', () => {
      const personnel = new Map<string, IPerson>();
      personnel.set('person-1', createTestPerson('person-1', 'John', PersonnelStatus.WOUNDED));

      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        personnel,
        forces: new Map(),
        rootForceId: 'force-root',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getActivePersonnel(campaign)).toHaveLength(0);
    });
  });

  describe('getPersonnelByStatus', () => {
    it('should filter by status', () => {
      const campaign = createTestCampaign();

      const wounded = getPersonnelByStatus(campaign, PersonnelStatus.WOUNDED);
      expect(wounded).toHaveLength(1);
      expect(wounded[0].name).toBe('Bob Wilson');

      const mia = getPersonnelByStatus(campaign, PersonnelStatus.MIA);
      expect(mia).toHaveLength(1);
      expect(mia[0].name).toBe('Alice Brown');
    });

    it('should return empty array for non-existent status', () => {
      const campaign = createTestCampaign();
      const kia = getPersonnelByStatus(campaign, PersonnelStatus.KIA);
      expect(kia).toHaveLength(0);
    });
  });

  describe('getTotalForces', () => {
    it('should return total force count', () => {
      const campaign = createTestCampaign();
      expect(getTotalForces(campaign)).toBe(3);
    });

    it('should return 0 for empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');
      expect(getTotalForces(campaign)).toBe(0);
    });
  });

  describe('getAllUnits', () => {
    it('should collect all unit IDs from force tree', () => {
      const campaign = createTestCampaign();
      const units = getAllUnits(campaign);

      expect(units).toHaveLength(4);
      expect(units).toContain('unit-1');
      expect(units).toContain('unit-2');
      expect(units).toContain('unit-3');
      expect(units).toContain('unit-4');
    });

    it('should return empty array when root force not found', () => {
      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        personnel: new Map(),
        forces: new Map(),
        rootForceId: 'non-existent',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getAllUnits(campaign)).toHaveLength(0);
    });

    it('should not include duplicate unit IDs', () => {
      const forces = new Map<string, IForce>();
      forces.set('force-root', createTestForce('force-root', 'Root', undefined, ['force-1'], ['unit-1']));
      forces.set('force-1', createTestForce('force-1', 'Child', 'force-root', [], ['unit-1', 'unit-2']));

      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        personnel: new Map(),
        forces,
        rootForceId: 'force-root',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      const units = getAllUnits(campaign);
      expect(units).toHaveLength(2);
    });
  });

  describe('getBalance', () => {
    it('should return current balance', () => {
      const campaign = createTestCampaign();
      const balance = getBalance(campaign);

      expect(balance.amount).toBe(1000000);
    });

    it('should return zero for new campaign', () => {
      const campaign = createCampaign('New', 'mercenary');
      const balance = getBalance(campaign);

      expect(balance.amount).toBe(0);
    });
  });

  describe('getTotalMissions', () => {
    it('should return total mission count', () => {
      const campaign = createTestCampaign();
      expect(getTotalMissions(campaign)).toBe(3);
    });

    it('should return 0 for empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');
      expect(getTotalMissions(campaign)).toBe(0);
    });
  });

  describe('getMissionsByStatus', () => {
    it('should filter by status', () => {
      const campaign = createTestCampaign();

      const active = getMissionsByStatus(campaign, MissionStatus.ACTIVE);
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Raid Mission');

      const pending = getMissionsByStatus(campaign, MissionStatus.PENDING);
      expect(pending).toHaveLength(1);
      expect(pending[0].name).toBe('Defense Mission');
    });
  });

  describe('getActiveMissions', () => {
    it('should return only active missions', () => {
      const campaign = createTestCampaign();
      const active = getActiveMissions(campaign);

      expect(active).toHaveLength(1);
      expect(active[0].status).toBe(MissionStatus.ACTIVE);
    });
  });

  describe('getPersonById', () => {
    it('should return person by ID', () => {
      const campaign = createTestCampaign();
      const person = getPersonById(campaign, 'person-1');

      expect(person).toBeDefined();
      expect(person?.name).toBe('John Smith');
    });

    it('should return undefined for non-existent ID', () => {
      const campaign = createTestCampaign();
      const person = getPersonById(campaign, 'non-existent');

      expect(person).toBeUndefined();
    });
  });

  describe('getForceById', () => {
    it('should return force by ID', () => {
      const campaign = createTestCampaign();
      const force = getForceById(campaign, 'force-1');

      expect(force).toBeDefined();
      expect(force?.name).toBe('Alpha Lance');
    });

    it('should return undefined for non-existent ID', () => {
      const campaign = createTestCampaign();
      const force = getForceById(campaign, 'non-existent');

      expect(force).toBeUndefined();
    });
  });

  describe('getMissionById', () => {
    it('should return mission by ID', () => {
      const campaign = createTestCampaign();
      const mission = getMissionById(campaign, 'mission-1');

      expect(mission).toBeDefined();
      expect(mission?.name).toBe('Raid Mission');
    });

    it('should return undefined for non-existent ID', () => {
      const campaign = createTestCampaign();
      const mission = getMissionById(campaign, 'non-existent');

      expect(mission).toBeUndefined();
    });
  });

  describe('getRootForce', () => {
    it('should return root force', () => {
      const campaign = createTestCampaign();
      const rootForce = getRootForce(campaign);

      expect(rootForce).toBeDefined();
      expect(rootForce?.name).toBe('Root Force');
    });

    it('should return undefined when root force not found', () => {
      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        personnel: new Map(),
        forces: new Map(),
        rootForceId: 'non-existent',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getRootForce(campaign)).toBeUndefined();
    });
  });
});

// =============================================================================
// Type Guards Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isMission', () => {
    it('should return true for valid mission', () => {
      const mission = createTestMission('mission-1', 'Test', MissionStatus.ACTIVE);
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
      expect(isMission({ id: 123, name: 'Test', status: 'Active', createdAt: '', updatedAt: '' })).toBe(false);
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
        personnel: new Map(),
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

// =============================================================================
// Factory Functions Tests
// =============================================================================

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
      expect(campaign.personnel).toBeInstanceOf(Map);
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
      const personnel = new Map<string, IPerson>();
      personnel.set('person-1', createTestPerson('person-1', 'John'));

      const forces = new Map<string, IForce>();
      forces.set('force-1', createTestForce('force-1', 'Alpha'));

      const missions = new Map<string, IMission>();
      missions.set('mission-1', createTestMission('mission-1', 'Test'));

      const campaign = createCampaignWithData({
        id: 'campaign-custom',
        name: 'Custom Campaign',
        currentDate: new Date('3025-06-15'),
        factionId: 'davion',
        personnel,
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
      expect(campaign.personnel.size).toBe(1);
      expect(campaign.forces.size).toBe(1);
      expect(campaign.missions.size).toBe(1);
      expect(campaign.finances.balance.amount).toBe(5000000);
      expect(campaign.description).toBe('A custom campaign');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration Tests', () => {
  describe('campaign with personnel + forces + finances', () => {
    it('should correctly aggregate all entities', () => {
      const campaign = createTestCampaign();

      // Personnel
      expect(getTotalPersonnel(campaign)).toBe(4);
      expect(getActivePersonnel(campaign)).toHaveLength(2);

      // Forces
      expect(getTotalForces(campaign)).toBe(3);
      expect(getAllUnits(campaign)).toHaveLength(4);

      // Missions
      expect(getTotalMissions(campaign)).toBe(3);
      expect(getActiveMissions(campaign)).toHaveLength(1);

      // Finances
      expect(getBalance(campaign).amount).toBe(1000000);
    });

    it('should support complex force hierarchies', () => {
      const forces = new Map<string, IForce>();
      forces.set('battalion', createTestForce('battalion', 'Battalion', undefined, ['company-1', 'company-2'], []));
      forces.set('company-1', createTestForce('company-1', 'Company 1', 'battalion', ['lance-1', 'lance-2'], []));
      forces.set('company-2', createTestForce('company-2', 'Company 2', 'battalion', ['lance-3'], []));
      forces.set('lance-1', createTestForce('lance-1', 'Lance 1', 'company-1', [], ['unit-1', 'unit-2', 'unit-3', 'unit-4']));
      forces.set('lance-2', createTestForce('lance-2', 'Lance 2', 'company-1', [], ['unit-5', 'unit-6', 'unit-7', 'unit-8']));
      forces.set('lance-3', createTestForce('lance-3', 'Lance 3', 'company-2', [], ['unit-9', 'unit-10', 'unit-11', 'unit-12']));

      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Test',
        currentDate: new Date(),
        factionId: 'mercenary',
        personnel: new Map(),
        forces,
        rootForceId: 'battalion',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getTotalForces(campaign)).toBe(6);
      expect(getAllUnits(campaign)).toHaveLength(12);
    });

    it('should handle empty campaign', () => {
      const campaign = createCampaign('Empty', 'mercenary');

      expect(getTotalPersonnel(campaign)).toBe(0);
      expect(getActivePersonnel(campaign)).toHaveLength(0);
      expect(getTotalForces(campaign)).toBe(0);
      expect(getAllUnits(campaign)).toHaveLength(0);
      expect(getTotalMissions(campaign)).toBe(0);
      expect(getBalance(campaign).amount).toBe(0);
    });

    it('should support large personnel counts', () => {
      const personnel = new Map<string, IPerson>();
      for (let i = 0; i < 100; i++) {
        const status = i % 4 === 0 ? PersonnelStatus.WOUNDED : PersonnelStatus.ACTIVE;
        personnel.set(`person-${i}`, createTestPerson(`person-${i}`, `Person ${i}`, status));
      }

      const campaign = createCampaignWithData({
        id: 'campaign-1',
        name: 'Large Campaign',
        currentDate: new Date(),
        factionId: 'mercenary',
        personnel,
        forces: new Map(),
        rootForceId: 'force-root',
        missions: new Map(),
        finances: { transactions: [], balance: Money.ZERO },
        options: createDefaultCampaignOptions(),
      });

      expect(getTotalPersonnel(campaign)).toBe(100);
      expect(getActivePersonnel(campaign)).toHaveLength(75); // 75% active
      expect(getPersonnelByStatus(campaign, PersonnelStatus.WOUNDED)).toHaveLength(25);
    });

    it('should correctly calculate balance with starting funds', () => {
      const campaign = createCampaign('Funded', 'mercenary', {
        startingFunds: 25000000,
      });

      expect(getBalance(campaign).amount).toBe(25000000);
      expect(getBalance(campaign).format()).toBe('25,000,000.00 C-bills');
    });
  });
});
