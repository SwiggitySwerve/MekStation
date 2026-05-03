import { describe, it, expect } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  calculateTaxes,
  calculateProfits,
  calculateMonthlyOverhead,
  calculateFoodAndHousing,
  FOOD_AND_HOUSING_COSTS,
} from '../taxService';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Builds a minimal valid ICampaignRosterEntry for tax/overhead/food tests.
 */
function makeRosterEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-1',
    pilotName: 'Test Pilot',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

/**
 * Builds a minimal IPilot for overhead (salary) calculations.
 */
function makeVaultPilot(id: string, totalXpEarned = 500): IPilot {
  return {
    id,
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
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
      xp: totalXpEarned,
      totalXpEarned,
      rank: 'MechWarrior',
    },
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
  };
}

describe('taxService', () => {
  // Helper to create a minimal campaign — used for calculateTaxes / calculateProfits
  // which still take ICampaign directly (finances + options only).
  function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
    return {
      id: 'test-campaign',
      name: 'Test Campaign',
      currentDate: new Date('3025-01-01'),
      factionId: 'mercenary',
      personnel: new Map(),
      forces: new Map(),
      rootForceId: 'root-force',
      missions: new Map(),
      finances: {
        transactions: [],
        balance: new Money(0),
      },
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
        startingFunds: 100000,
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
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      ...overrides,
      campaignType: CampaignType.MERCENARY,
      // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
      unitCombatStates: overrides.unitCombatStates ?? {},
    };
  }

  describe('calculateTaxes', () => {
    it('should calculate tax on positive profit', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(110000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
          taxRate: 10,
          useTaxes: true,
        },
      });

      const tax = calculateTaxes(campaign);
      expect(tax.amount).toBe(1000);
    });

    it('should return zero tax when useTaxes is false', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(110000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
          taxRate: 10,
          useTaxes: false,
        },
      });

      const tax = calculateTaxes(campaign);
      expect(tax.isZero()).toBe(true);
    });

    it('should return zero tax on negative profit', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(90000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
          taxRate: 10,
          useTaxes: true,
        },
      });

      const tax = calculateTaxes(campaign);
      expect(tax.isZero()).toBe(true);
    });

    it('should return zero tax on zero profit', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(100000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
          taxRate: 10,
          useTaxes: true,
        },
      });

      const tax = calculateTaxes(campaign);
      expect(tax.isZero()).toBe(true);
    });
  });

  describe('calculateProfits', () => {
    it('should calculate positive profit', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(150000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
        },
      });

      const profit = calculateProfits(campaign);
      expect(profit.amount).toBe(50000);
    });

    it('should calculate negative profit', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(50000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
        },
      });

      const profit = calculateProfits(campaign);
      expect(profit.amount).toBe(-50000);
    });

    it('should calculate zero profit', () => {
      const campaign = createTestCampaign({
        finances: {
          transactions: [],
          balance: new Money(100000),
        },
        options: {
          ...createTestCampaign().options,
          startingFunds: 100000,
        },
      });

      const profit = calculateProfits(campaign);
      expect(profit.isZero()).toBe(true);
    });
  });

  describe('calculateMonthlyOverhead', () => {
    it('should calculate overhead as 5% of salary total', () => {
      // One PILOT at regular XP (500) = 1500 salary; 5% overhead = 75
      const entries = [
        makeRosterEntry({
          pilotId: 'pilot-1',
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      const pilotsMap = new Map([['pilot-1', makeVaultPilot('pilot-1', 500)]]);
      const options = {
        ...createTestCampaign().options,
        payForSalaries: true,
        salaryMultiplier: 1.0,
        overheadPercent: 5,
      };

      const overhead = calculateMonthlyOverhead(entries, pilotsMap, options);
      const expectedSalary = 1500;
      const expectedOverhead = expectedSalary * 0.05;
      expect(overhead.amount).toBeCloseTo(expectedOverhead, 2);
    });

    it('should return zero overhead when salaries are disabled', () => {
      const entries = [
        makeRosterEntry({
          pilotId: 'pilot-1',
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      const pilotsMap = new Map([['pilot-1', makeVaultPilot('pilot-1', 500)]]);
      const options = {
        ...createTestCampaign().options,
        payForSalaries: false,
        overheadPercent: 5,
      };

      const overhead = calculateMonthlyOverhead(entries, pilotsMap, options);
      expect(overhead.isZero()).toBe(true);
    });
  });

  describe('calculateFoodAndHousing', () => {
    it('should calculate food/housing for officer (ADMIN_COMMAND role)', () => {
      const entries = [
        makeRosterEntry({
          pilotId: 'officer-1',
          primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
          status: CampaignPilotStatus.Active,
        }),
      ];

      const cost = calculateFoodAndHousing(entries);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.officer);
    });

    it('should calculate food/housing for enlisted (non-officer role)', () => {
      const entries = [
        makeRosterEntry({
          pilotId: 'pilot-1',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.Active,
        }),
      ];

      const cost = calculateFoodAndHousing(entries);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.enlisted);
    });

    it('should skip KIA personnel', () => {
      // One alive pilot (enlisted) + one KIA pilot — KIA does not incur food/housing costs
      const entries = [
        makeRosterEntry({
          pilotId: 'pilot-1',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.Active,
        }),
        makeRosterEntry({
          pilotId: 'kia-1',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.KIA,
        }),
      ];

      const cost = calculateFoodAndHousing(entries);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.enlisted);
    });

    it('should include Wounded, Critical, and MIA personnel (all alive statuses)', () => {
      // CampaignPilotStatus has no POW/RETIRED/DESERTED. All non-KIA incur costs.
      const entries = [
        makeRosterEntry({
          pilotId: 'p1',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.Wounded,
        }),
        makeRosterEntry({
          pilotId: 'p2',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.Critical,
        }),
        makeRosterEntry({
          pilotId: 'p3',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.MIA,
        }),
      ];

      const cost = calculateFoodAndHousing(entries);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.enlisted * 3);
    });

    it('should calculate total for multiple personnel (1 officer + 2 enlisted)', () => {
      const entries = [
        makeRosterEntry({
          pilotId: 'officer-1',
          primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
          status: CampaignPilotStatus.Active,
        }),
        makeRosterEntry({
          pilotId: 'pilot-1',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.Active,
        }),
        makeRosterEntry({
          pilotId: 'pilot-2',
          primaryRole: CampaignPersonnelRole.PILOT,
          status: CampaignPilotStatus.Active,
        }),
      ];

      const cost = calculateFoodAndHousing(entries);
      const expected =
        FOOD_AND_HOUSING_COSTS.officer + FOOD_AND_HOUSING_COSTS.enlisted * 2;
      expect(cost.amount).toBe(expected);
    });
  });
});
