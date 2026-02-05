import { describe, it, expect } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPerson, IInjury } from '@/types/campaign/Person';

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { Money } from '@/types/campaign/Money';

import {
  getFounderModifier,
  getRecentPromotionModifier,
  getAgeModifier,
  getInjuryModifier,
  getOfficerModifier,
  getServiceContractModifier,
  getSkillDesirabilityModifier,
  getBaseTargetModifier,
  getMissionStatusModifier,
  getFatigueModifier,
  getHRStrainModifier,
  getManagementSkillModifier,
  getSharesModifier,
  getUnitRatingModifier,
  getHostileTerritoryModifier,
  getLoyaltyModifier,
  getFactionCampaignModifier,
  getFactionOriginModifier,
  getFamilyModifier,
} from '../index';

function createTestPerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'person-001',
    name: 'Test Person',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3020-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 200,
    xpSpent: 100,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: {
      healingRateMultiplier: 1.0,
      salaryMultiplier: 1.0,
      retirementAge: 65,
      healingWaitingPeriod: 1,
      medicalSystem: MedicalSystem.STANDARD,
      maxPatientsPerDoctor: 25,
      doctorsUseAdministration: false,
      xpPerMission: 1,
      xpPerKill: 1,
      xpCostMultiplier: 1.0,
      trackTimeInService: true,
      useEdge: true,
      startingFunds: 0,
      maintenanceCostMultiplier: 1.0,
      repairCostMultiplier: 1.0,
      acquisitionCostMultiplier: 1.0,
      payForMaintenance: true,
      payForRepairs: true,
      payForSalaries: true,
      payForAmmunition: true,
      maintenanceCycleDays: 7,
      useLoanSystem: true,
      useTaxes: true,
      taxRate: 10,
      overheadPercent: 5,
      useRoleBasedSalaries: false,
      payForSecondaryRole: true,
      maxLoanPercent: 50,
      defaultLoanRate: 5,
      taxFrequency: 'annually',
      useFoodAndHousing: true,
      clanPriceMultiplier: 2.0,
      mixedTechPriceMultiplier: 1.5,
      usedEquipmentMultiplier: 0.5,
      damagedEquipmentMultiplier: 0.33,
      useAutoResolve: false,
      autoResolveCasualtyRate: 1.0,
      allowPilotCapture: true,
      useRandomInjuries: true,
      pilotDeathChance: 0.1,
      autoEject: true,
      trackAmmunition: true,
      useQuirks: false,
      maxUnitsPerLance: 4,
      maxLancesPerCompany: 3,
      enforceFormationRules: false,
      allowMixedFormations: true,
      requireForceCommanders: false,
      useCombatTeams: false,
      dateFormat: 'yyyy-MM-dd',
      useFactionRules: false,
      techLevel: 1,
      limitByYear: true,
      allowClanEquipment: false,
      useRandomEvents: false,
      enableDayReportNotifications: true,
      useTurnover: true,
      turnoverFixedTargetNumber: 3,
      turnoverCheckFrequency: 'monthly',
      turnoverCommanderImmune: true,
      turnoverPayoutMultiplier: 12,
      turnoverUseSkillModifiers: true,
      turnoverUseAgeModifiers: true,
      turnoverUseMissionStatusModifiers: true,
      trackFactionStanding: true,
      regardChangeMultiplier: 1.0,
    },
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
    campaignType: CampaignType.MERCENARY,
  };
}

function createPermanentInjury(id: string): IInjury {
  return {
    id,
    type: 'Broken Bone',
    location: 'Left Arm',
    severity: 3,
    daysToHeal: 0,
    permanent: true,
    acquired: new Date('3024-01-01'),
  };
}

function createNonPermanentInjury(id: string): IInjury {
  return {
    id,
    type: 'Bruise',
    location: 'Torso',
    severity: 1,
    daysToHeal: 7,
    permanent: false,
    acquired: new Date('3025-06-01'),
  };
}

// =============================================================================
// Personal Modifiers
// =============================================================================

describe('Turnover Personal Modifiers', () => {
  describe('getFounderModifier', () => {
    it('should return -2 for a founder', () => {
      const person = createTestPerson({ isFounder: true });
      expect(getFounderModifier(person)).toBe(-2);
    });

    it('should return 0 for a non-founder', () => {
      const person = createTestPerson({ isFounder: false });
      expect(getFounderModifier(person)).toBe(0);
    });

    it('should return 0 when isFounder is undefined', () => {
      const person = createTestPerson();
      expect(getFounderModifier(person)).toBe(0);
    });
  });

  describe('getRecentPromotionModifier', () => {
    it('should return -1 when promoted within 6 months', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        lastRankChangeDate: new Date('3025-03-01'),
      });
      expect(getRecentPromotionModifier(person, campaign)).toBe(-1);
    });

    it('should return 0 when promoted more than 6 months ago', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        lastRankChangeDate: new Date('3024-01-01'),
      });
      expect(getRecentPromotionModifier(person, campaign)).toBe(0);
    });

    it('should return 0 when no promotion date exists', () => {
      const campaign = createTestCampaign();
      const person = createTestPerson();
      expect(getRecentPromotionModifier(person, campaign)).toBe(0);
    });

    it('should return -1 when promoted exactly 5 months ago', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        lastRankChangeDate: new Date('3025-01-15'),
      });
      expect(getRecentPromotionModifier(person, campaign)).toBe(-1);
    });
  });

  describe('getAgeModifier', () => {
    it('should return -1 for age < 20 (young)', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        recruitmentDate: new Date('3010-01-01'),
      });
      expect(getAgeModifier(person, campaign)).toBe(-1);
    });

    it('should return 0 for age 25 (normal)', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        recruitmentDate: new Date('3000-01-01'),
      });
      expect(getAgeModifier(person, campaign)).toBe(0);
    });

    it('should return +3 for age 50-54', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        recruitmentDate: new Date('2975-01-01'),
      });
      expect(getAgeModifier(person, campaign)).toBe(3);
    });

    it('should return +5 for age 55-59', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        recruitmentDate: new Date('2970-01-01'),
      });
      expect(getAgeModifier(person, campaign)).toBe(5);
    });

    it('should return +6 for age 60-64', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        recruitmentDate: new Date('2965-01-01'),
      });
      expect(getAgeModifier(person, campaign)).toBe(6);
    });

    it('should return +8 for age 65+', () => {
      const campaign = createTestCampaign({
        currentDate: new Date('3025-06-15'),
      });
      const person = createTestPerson({
        recruitmentDate: new Date('2960-01-01'),
      });
      expect(getAgeModifier(person, campaign)).toBe(8);
    });
  });

  describe('getInjuryModifier', () => {
    it('should return 0 for no injuries', () => {
      const person = createTestPerson({ injuries: [] });
      expect(getInjuryModifier(person)).toBe(0);
    });

    it('should return +1 for 1 permanent injury', () => {
      const person = createTestPerson({
        injuries: [createPermanentInjury('inj-1')],
      });
      expect(getInjuryModifier(person)).toBe(1);
    });

    it('should return +3 for 3 permanent injuries', () => {
      const person = createTestPerson({
        injuries: [
          createPermanentInjury('inj-1'),
          createPermanentInjury('inj-2'),
          createPermanentInjury('inj-3'),
        ],
      });
      expect(getInjuryModifier(person)).toBe(3);
    });

    it('should not count non-permanent injuries', () => {
      const person = createTestPerson({
        injuries: [
          createPermanentInjury('inj-1'),
          createNonPermanentInjury('inj-2'),
          createNonPermanentInjury('inj-3'),
        ],
      });
      expect(getInjuryModifier(person)).toBe(1);
    });

    it('should return 0 for only non-permanent injuries', () => {
      const person = createTestPerson({
        injuries: [
          createNonPermanentInjury('inj-1'),
          createNonPermanentInjury('inj-2'),
        ],
      });
      expect(getInjuryModifier(person)).toBe(0);
    });
  });

  describe('getOfficerModifier', () => {
    it('should return -1 for commander', () => {
      const person = createTestPerson({ isCommander: true });
      expect(getOfficerModifier(person)).toBe(-1);
    });

    it('should return -1 for second in command', () => {
      const person = createTestPerson({ isSecondInCommand: true });
      expect(getOfficerModifier(person)).toBe(-1);
    });

    it('should return 0 for regular personnel', () => {
      const person = createTestPerson();
      expect(getOfficerModifier(person)).toBe(0);
    });

    it('should return -1 when both commander and second in command', () => {
      const person = createTestPerson({
        isCommander: true,
        isSecondInCommand: true,
      });
      expect(getOfficerModifier(person)).toBe(-1);
    });
  });

  describe('getServiceContractModifier', () => {
    it('should return 0 (not yet implemented)', () => {
      const person = createTestPerson();
      expect(getServiceContractModifier(person)).toBe(0);
    });
  });

  describe('getSkillDesirabilityModifier', () => {
    it('should return -2 for elite pilot (avg skill <= 2)', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 2, piloting: 2 },
      });
      const campaign = createTestCampaign();
      expect(getSkillDesirabilityModifier(person, campaign)).toBe(-2);
    });

    it('should return -1 for veteran pilot (avg skill <= 3)', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 3, piloting: 3 },
      });
      const campaign = createTestCampaign();
      expect(getSkillDesirabilityModifier(person, campaign)).toBe(-1);
    });

    it('should return 0 for regular pilot (avg skill <= 4)', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 4, piloting: 4 },
      });
      const campaign = createTestCampaign();
      expect(getSkillDesirabilityModifier(person, campaign)).toBe(0);
    });

    it('should return +1 for green pilot (avg skill 5-6)', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 5, piloting: 5 },
      });
      const campaign = createTestCampaign();
      expect(getSkillDesirabilityModifier(person, campaign)).toBe(1);
    });

    it('should return +2 for ultra-green pilot (avg skill >= 7)', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 7, piloting: 8 },
      });
      const campaign = createTestCampaign();
      expect(getSkillDesirabilityModifier(person, campaign)).toBe(2);
    });

    it('should handle mixed skill levels', () => {
      const person = createTestPerson({
        pilotSkills: { gunnery: 2, piloting: 4 },
      });
      const campaign = createTestCampaign();
      expect(getSkillDesirabilityModifier(person, campaign)).toBe(-1);
    });
  });
});

// =============================================================================
// Campaign Modifiers
// =============================================================================

describe('Turnover Campaign Modifiers', () => {
  describe('getBaseTargetModifier', () => {
    it('should return default value of 3 when turnoverFixedTargetNumber not set', () => {
      const campaign = createTestCampaign();
      expect(getBaseTargetModifier(campaign)).toBe(3);
    });

    it('should return custom value when turnoverFixedTargetNumber is set', () => {
      const campaign = createTestCampaign();
      const optionsWithTurnover = {
        ...campaign.options,
        turnoverFixedTargetNumber: 5,
      };
      const campaignWithTurnover = {
        ...campaign,
        options: optionsWithTurnover,
      };
      expect(getBaseTargetModifier(campaignWithTurnover as ICampaign)).toBe(5);
    });
  });

  describe('getMissionStatusModifier', () => {
    it('should return 0 when no missions exist', () => {
      const campaign = createTestCampaign();
      expect(getMissionStatusModifier(campaign)).toBe(0);
    });

    it('should return -1 for last mission SUCCESS', () => {
      const missions = new Map();
      missions.set('m1', {
        id: 'm1',
        name: 'Mission 1',
        status: MissionStatus.SUCCESS,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      });
      const campaign = createTestCampaign({ missions });
      expect(getMissionStatusModifier(campaign)).toBe(-1);
    });

    it('should return +1 for last mission FAILED', () => {
      const missions = new Map();
      missions.set('m1', {
        id: 'm1',
        name: 'Mission 1',
        status: MissionStatus.FAILED,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      });
      const campaign = createTestCampaign({ missions });
      expect(getMissionStatusModifier(campaign)).toBe(1);
    });

    it('should return +2 for last mission BREACH', () => {
      const missions = new Map();
      missions.set('m1', {
        id: 'm1',
        name: 'Mission 1',
        status: MissionStatus.BREACH,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      });
      const campaign = createTestCampaign({ missions });
      expect(getMissionStatusModifier(campaign)).toBe(2);
    });

    it('should ignore ACTIVE missions and use last completed', () => {
      const missions = new Map();
      missions.set('m1', {
        id: 'm1',
        name: 'Mission 1',
        status: MissionStatus.SUCCESS,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      });
      missions.set('m2', {
        id: 'm2',
        name: 'Mission 2',
        status: MissionStatus.ACTIVE,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-02-01T00:00:00Z',
        updatedAt: '3025-02-01T00:00:00Z',
      });
      const campaign = createTestCampaign({ missions });
      expect(getMissionStatusModifier(campaign)).toBe(-1);
    });

    it('should use the last completed mission when multiple exist', () => {
      const missions = new Map();
      missions.set('m1', {
        id: 'm1',
        name: 'Mission 1',
        status: MissionStatus.SUCCESS,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      });
      missions.set('m2', {
        id: 'm2',
        name: 'Mission 2',
        status: MissionStatus.FAILED,
        type: 'mission' as const,
        systemId: 'test',
        scenarioIds: [],
        createdAt: '3025-02-01T00:00:00Z',
        updatedAt: '3025-02-01T00:00:00Z',
      });
      const campaign = createTestCampaign({ missions });
      expect(getMissionStatusModifier(campaign)).toBe(1);
    });
  });
});

// =============================================================================
// Stub Modifiers
// =============================================================================

describe('Turnover Stub Modifiers', () => {
  const person = createTestPerson();
  const campaign = createTestCampaign();

  it('getFatigueModifier should return 0', () => {
    expect(getFatigueModifier(person)).toBe(0);
  });

  it('getHRStrainModifier should return 0', () => {
    expect(getHRStrainModifier(campaign)).toBe(0);
  });

  it('getManagementSkillModifier should return 0', () => {
    expect(getManagementSkillModifier(campaign)).toBe(0);
  });

  it('getSharesModifier should return 0', () => {
    expect(getSharesModifier(person, campaign)).toBe(0);
  });

  it('getUnitRatingModifier should return 0', () => {
    expect(getUnitRatingModifier(campaign)).toBe(0);
  });

  it('getHostileTerritoryModifier should return 0', () => {
    expect(getHostileTerritoryModifier(campaign)).toBe(0);
  });

  it('getLoyaltyModifier should return 0', () => {
    expect(getLoyaltyModifier(person)).toBe(0);
  });

  it('getFactionCampaignModifier should return 0', () => {
    expect(getFactionCampaignModifier(campaign)).toBe(0);
  });

  it('getFactionOriginModifier should return 0', () => {
    expect(getFactionOriginModifier(person)).toBe(0);
  });

  it('getFamilyModifier should return 0', () => {
    expect(getFamilyModifier(person, campaign)).toBe(0);
  });
});
