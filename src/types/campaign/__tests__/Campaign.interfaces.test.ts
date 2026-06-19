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

describe('ICampaign Interface', () => {
  describe('interface structure', () => {
    it('should have all required fields', () => {
      const campaign = createTestCampaign();

      expect(campaign.id).toBe('campaign-001');
      expect(campaign.name).toBe("Wolf's Dragoons");
      expect(campaign.currentDate).toBeInstanceOf(Date);
      expect(campaign.factionId).toBe('mercenary');
      // Per PR4 of `wire-iperson-hard-cutover`: personnel is no longer a
      // field on ICampaign — the roster store owns it.
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

    it('personnel is sourced from useCampaignRosterStore (PR4 hard-cutover)', () => {
      // Per PR4 of `wire-iperson-hard-cutover`: ICampaign no longer has
      // a `personnel` field. The roster store is canonical.
      const pilots = useCampaignRosterStore.getState().pilots;
      expect(Array.isArray(pilots)).toBe(true);
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

describe('ICampaignOptions Interface', () => {
  describe('interface structure', () => {
    it('should have all personnel options', () => {
      const options = createDefaultCampaignOptions();

      expect(options.healingRateMultiplier).toBe(1.0);
      expect(options.salaryMultiplier).toBe(1.0);
      expect(options.retirementAge).toBe(65);
      expect(options.healingWaitingPeriod).toBe(1);
      expect(options.medicalSystem).toBe(MedicalSystem.STANDARD);
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

describe('IMission Interface', () => {
  describe('interface structure', () => {
    it('should have all required fields', () => {
      const mission = createTestMission(
        'mission-1',
        'Test Mission',
        MissionStatus.ACTIVE,
      );

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
