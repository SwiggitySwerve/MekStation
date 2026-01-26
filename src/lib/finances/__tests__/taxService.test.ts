import { describe, it, expect } from '@jest/globals';
import { Money } from '@/types/campaign/Money';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';
import {
  calculateTaxes,
  calculateProfits,
  calculateMonthlyOverhead,
  calculateFoodAndHousing,
  FOOD_AND_HOUSING_COSTS,
} from '../taxService';

describe('taxService', () => {
  // Helper to create a minimal campaign
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
      options: {
        healingRateMultiplier: 1.0,
        salaryMultiplier: 1.0,
        retirementAge: 65,
        healingWaitingPeriod: 1,
        useAdvancedMedical: false,
        maxPatientsPerDoctor: 25,
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
      },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      ...overrides,
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
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'pilot-1',
            {
              id: 'pilot-1',
              name: 'Test Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
        options: {
          ...createTestCampaign().options,
          payForSalaries: true,
          salaryMultiplier: 1.0,
          overheadPercent: 5,
        },
      });

      const overhead = calculateMonthlyOverhead(campaign);
      const expectedSalary = 1500;
      const expectedOverhead = expectedSalary * 0.05;
      expect(overhead.amount).toBeCloseTo(expectedOverhead, 2);
    });

    it('should return zero overhead when salaries are disabled', () => {
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'pilot-1',
            {
              id: 'pilot-1',
              name: 'Test Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
        options: {
          ...createTestCampaign().options,
          payForSalaries: false,
          overheadPercent: 5,
        },
      });

      const overhead = calculateMonthlyOverhead(campaign);
      expect(overhead.isZero()).toBe(true);
    });
  });

  describe('calculateFoodAndHousing', () => {
    it('should calculate food/housing for officer', () => {
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'officer-1',
            {
              id: 'officer-1',
              name: 'Commander',
              primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
      });

      const cost = calculateFoodAndHousing(campaign);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.officer);
    });

    it('should calculate food/housing for enlisted', () => {
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'pilot-1',
            {
              id: 'pilot-1',
              name: 'Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
      });

      const cost = calculateFoodAndHousing(campaign);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.enlisted);
    });

    it('should calculate food/housing for prisoner', () => {
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'pow-1',
            {
              id: 'pow-1',
              name: 'Prisoner',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.POW,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
      });

      const cost = calculateFoodAndHousing(campaign);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.prisoner);
    });

    it('should skip non-alive personnel', () => {
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'pilot-1',
            {
              id: 'pilot-1',
              name: 'Alive Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
          [
            'kia-1',
            {
              id: 'kia-1',
              name: 'Dead Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.KIA,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
      });

      const cost = calculateFoodAndHousing(campaign);
      expect(cost.amount).toBe(FOOD_AND_HOUSING_COSTS.enlisted);
    });

    it('should calculate total for multiple personnel', () => {
      const campaign = createTestCampaign({
        personnel: new Map([
          [
            'officer-1',
            {
              id: 'officer-1',
              name: 'Commander',
              primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
          [
            'pilot-1',
            {
              id: 'pilot-1',
              name: 'Pilot 1',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
          [
            'pilot-2',
            {
              id: 'pilot-2',
              name: 'Pilot 2',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
          [
            'pow-1',
            {
              id: 'pow-1',
              name: 'Prisoner',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.POW,
              totalXpEarned: 500,
              recruitmentDate: new Date('3025-01-01'),
              missionsCompleted: 0,
              totalKills: 0,
            } as IPerson,
          ],
        ]),
      });

      const cost = calculateFoodAndHousing(campaign);
      const expected =
        FOOD_AND_HOUSING_COSTS.officer +
        FOOD_AND_HOUSING_COSTS.enlisted * 2 +
        FOOD_AND_HOUSING_COSTS.prisoner;
      expect(cost.amount).toBe(expected);
    });
  });
});
