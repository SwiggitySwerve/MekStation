import { describe, it, expect } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPerson } from '@/types/campaign/Person';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { rosterEntryToPerson } from '@/lib/campaign/utils/rosterEntryToPerson';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  calculateTaxes,
  calculateProfits,
  calculateMonthlyOverhead,
  calculateFoodAndHousing,
  FOOD_AND_HOUSING_COSTS,
} from '../taxService';

/**
 * Cluster E PR1 — IPerson fixtures are now synthesized via the
 * `(rosterEntry, vaultPilot) → rosterEntryToPerson()` bridge so the
 * test substrate exercises the same shim production code uses to
 * adapt the new roster-employment substrate to legacy `IPerson`-shaped
 * helpers. Tax-service tests need test-only states (POW, KIA) and
 * roles (ADMIN_COMMAND) — those still arrive via the `overrides` spread
 * because the bridge cannot synthesize them from the 5-value
 * `CampaignPilotStatus` enum or the bridge's hardcoded PILOT role.
 */
function makePerson(overrides: Partial<IPerson> = {}): IPerson {
  const id = overrides.id ?? 'person-1';
  const name = overrides.name ?? 'Test Person';
  const entry: ICampaignRosterEntry = {
    pilotId: id,
    pilotName: name,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: overrides.totalXpEarned ?? 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
  };
  const vault: IPilot = {
    id,
    name,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
  };
  const base = rosterEntryToPerson(entry, vault);
  return { ...base, ...overrides };
}

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
            makePerson({
              id: 'pilot-1',
              name: 'Test Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
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
            makePerson({
              id: 'pilot-1',
              name: 'Test Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
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
            makePerson({
              id: 'officer-1',
              name: 'Commander',
              primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
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
            makePerson({
              id: 'pilot-1',
              name: 'Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
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
            makePerson({
              id: 'pow-1',
              name: 'Prisoner',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.POW,
              totalXpEarned: 500,
            }),
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
            makePerson({
              id: 'pilot-1',
              name: 'Alive Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
          ],
          [
            'kia-1',
            makePerson({
              id: 'kia-1',
              name: 'Dead Pilot',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.KIA,
              totalXpEarned: 500,
            }),
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
            makePerson({
              id: 'officer-1',
              name: 'Commander',
              primaryRole: CampaignPersonnelRole.ADMIN_COMMAND,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
          ],
          [
            'pilot-1',
            makePerson({
              id: 'pilot-1',
              name: 'Pilot 1',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
          ],
          [
            'pilot-2',
            makePerson({
              id: 'pilot-2',
              name: 'Pilot 2',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.ACTIVE,
              totalXpEarned: 500,
            }),
          ],
          [
            'pow-1',
            makePerson({
              id: 'pow-1',
              name: 'Prisoner',
              primaryRole: CampaignPersonnelRole.PILOT,
              status: PersonnelStatus.POW,
              totalXpEarned: 500,
            }),
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
