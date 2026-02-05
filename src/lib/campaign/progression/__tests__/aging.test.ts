/**
 * Tests for the aging system
 *
 * Covers:
 * - Milestone lookup by age
 * - Attribute modifier calculation
 * - Age calculation from birth date
 * - Birthday detection
 * - Aging processing with trait application
 * - Cumulative modifier application
 */

import { MedicalSystem } from '@/lib/campaign/medical/medicalTypes';
import { ICampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';
import { IPerson } from '@/types/campaign/Person';

import {
  AGING_MILESTONES,
  getMilestoneForAge,
  getAgingAttributeModifier,
  calculateAge,
  isBirthday,
  processAging,
  applyAgingModifiers,
} from '../aging';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a test person with default values
 */
function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'test-person-001',
    name: 'Test Person',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('2020-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      DEX: 5,
      REF: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: {
      gunnery: 4,
      piloting: 4,
    },
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2025-01-26T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates campaign options with aging enabled
 */
function createTestOptions(
  overrides?: Partial<ICampaignOptions>,
): ICampaignOptions {
  return {
    // Personnel
    healingRateMultiplier: 1.0,
    salaryMultiplier: 1.0,
    retirementAge: 65,
    healingWaitingPeriod: 7,
    medicalSystem: MedicalSystem.STANDARD,
    maxPatientsPerDoctor: 4,
    doctorsUseAdministration: false,
    xpPerMission: 1,
    xpPerKill: 1,
    xpCostMultiplier: 1.0,
    trackTimeInService: true,
    useEdge: true,
    useAgingEffects: true,
    // Financial
    startingFunds: 100000,
    maintenanceCostMultiplier: 1.0,
    repairCostMultiplier: 1.0,
    acquisitionCostMultiplier: 1.0,
    payForMaintenance: true,
    payForRepairs: true,
    payForSalaries: true,
    payForAmmunition: true,
    maintenanceCycleDays: 30,
    useLoanSystem: false,
    useTaxes: false,
    taxRate: 0,
    overheadPercent: 5,
    useRoleBasedSalaries: false,
    payForSecondaryRole: false,
    maxLoanPercent: 50,
    defaultLoanRate: 5,
    taxFrequency: 'monthly' as const,
    useFoodAndHousing: false,
    clanPriceMultiplier: 2.0,
    mixedTechPriceMultiplier: 1.5,
    usedEquipmentMultiplier: 0.5,
    damagedEquipmentMultiplier: 0.33,
    // Combat
    useAutoResolve: false,
    autoResolveCasualtyRate: 1.0,
    allowPilotCapture: true,
    useRandomInjuries: true,
    pilotDeathChance: 0.1,
    autoEject: true,
    trackAmmunition: true,
    useQuirks: true,
    // Force
    maxUnitsPerLance: 4,
    maxLancesPerCompany: 4,
    enforceFormationRules: false,
    allowMixedFormations: true,
    requireForceCommanders: false,
    useCombatTeams: false,
    // General
    dateFormat: 'yyyy-MM-dd',
    useFactionRules: false,
    techLevel: 1,
    limitByYear: false,
    allowClanEquipment: true,
    useRandomEvents: false,
    enableDayReportNotifications: true,
    // Turnover
    useTurnover: false,
    turnoverFixedTargetNumber: 7,
    turnoverCheckFrequency: 'monthly',
    turnoverCommanderImmune: true,
    turnoverPayoutMultiplier: 1.0,
    turnoverUseSkillModifiers: false,
    turnoverUseAgeModifiers: false,
    turnoverUseMissionStatusModifiers: false,
    // Faction Standing
    trackFactionStanding: false,
    regardChangeMultiplier: 1.0,
    ...overrides,
  };
}

// =============================================================================
// AGING_MILESTONES Tests
// =============================================================================

describe('AGING_MILESTONES', () => {
  it('should have exactly 10 milestones', () => {
    expect(AGING_MILESTONES).toHaveLength(10);
  });

  it('should have correct labels', () => {
    const labels = AGING_MILESTONES.map((m) => m.label);
    expect(labels).toEqual([
      '<25',
      '25-30',
      '31-40',
      '41-50',
      '51-60',
      '61-70',
      '71-80',
      '81-90',
      '91-100',
      '101+',
    ]);
  });

  it('should have correct age ranges', () => {
    expect(AGING_MILESTONES[0]).toMatchObject({ minAge: 0, maxAge: 24 });
    expect(AGING_MILESTONES[1]).toMatchObject({ minAge: 25, maxAge: 30 });
    expect(AGING_MILESTONES[9]).toMatchObject({ minAge: 101, maxAge: 999 });
  });

  it('should have Glass Jaw and Slow Learner at age 61+', () => {
    for (let i = 5; i < 10; i++) {
      expect(AGING_MILESTONES[i].appliesGlassJaw).toBe(true);
      expect(AGING_MILESTONES[i].appliesSlowLearner).toBe(true);
    }
  });

  it('should not have Glass Jaw or Slow Learner before age 61', () => {
    for (let i = 0; i < 5; i++) {
      expect(AGING_MILESTONES[i].appliesGlassJaw).toBe(false);
      expect(AGING_MILESTONES[i].appliesSlowLearner).toBe(false);
    }
  });
});

// =============================================================================
// getMilestoneForAge Tests
// =============================================================================

describe('getMilestoneForAge', () => {
  it('should return <25 milestone for age 20', () => {
    const milestone = getMilestoneForAge(20);
    expect(milestone.label).toBe('<25');
  });

  it('should return 25-30 milestone for age 30', () => {
    const milestone = getMilestoneForAge(30);
    expect(milestone.label).toBe('25-30');
  });

  it('should return 61-70 milestone for age 65', () => {
    const milestone = getMilestoneForAge(65);
    expect(milestone.label).toBe('61-70');
  });

  it('should return 101+ milestone for age 150', () => {
    const milestone = getMilestoneForAge(150);
    expect(milestone.label).toBe('101+');
  });

  it('should throw error for invalid age', () => {
    expect(() => getMilestoneForAge(-5)).toThrow();
  });
});

// =============================================================================
// getAgingAttributeModifier Tests
// =============================================================================

describe('getAgingAttributeModifier', () => {
  it('should return 0 for age <25', () => {
    expect(getAgingAttributeModifier(20, 'STR')).toBe(0);
  });

  it('should return 0.5 for STR at age 30', () => {
    expect(getAgingAttributeModifier(30, 'STR')).toBe(0.5);
  });

  it('should return 0 for STR at age 65 (cumulative)', () => {
    // Age 65 is in 61-70 milestone
    // Cumulative: 25-30 (0.5) + 31-40 (0.5) + 41-50 (0) + 51-60 (0) + 61-70 (-1.0) = 0
    expect(getAgingAttributeModifier(65, 'STR')).toBe(0);
  });

  it('should return cumulative modifiers at age 65', () => {
    // Age 65 is in 61-70 milestone
    // Cumulative: 25-30 (0.5) + 31-40 (0.5) + 41-50 (0) + 51-60 (0) + 61-70 (-1.0) = 0
    expect(getAgingAttributeModifier(65, 'STR')).toBe(0);
  });

  it('should return 0 for DEX at age 30', () => {
    expect(getAgingAttributeModifier(30, 'DEX')).toBe(0);
  });

  it('should return -0.5 for DEX at age 45', () => {
    expect(getAgingAttributeModifier(45, 'DEX')).toBe(-0.5);
  });
});

// =============================================================================
// calculateAge Tests
// =============================================================================

describe('calculateAge', () => {
  it('should calculate age correctly before birthday', () => {
    const age = calculateAge('1990-01-15', '2025-01-14');
    expect(age).toBe(34);
  });

  it('should calculate age correctly on birthday', () => {
    const age = calculateAge('1990-01-15', '2025-01-15');
    expect(age).toBe(35);
  });

  it('should calculate age correctly after birthday', () => {
    const age = calculateAge('1990-01-15', '2025-01-16');
    expect(age).toBe(35);
  });

  it('should handle Date objects', () => {
    const birth = new Date('1990-01-15');
    const current = new Date('2025-01-15');
    const age = calculateAge(birth, current);
    expect(age).toBe(35);
  });

  it('should handle ISO 8601 strings', () => {
    const age = calculateAge('1990-01-15T00:00:00Z', '2025-01-15T00:00:00Z');
    expect(age).toBe(35);
  });
});

// =============================================================================
// isBirthday Tests
// =============================================================================

describe('isBirthday', () => {
  it('should return true on birthday', () => {
    const result = isBirthday('1990-01-15', '2025-01-15');
    expect(result).toBe(true);
  });

  it('should return false day before birthday', () => {
    const result = isBirthday('1990-01-15', '2025-01-14');
    expect(result).toBe(false);
  });

  it('should return false day after birthday', () => {
    const result = isBirthday('1990-01-15', '2025-01-16');
    expect(result).toBe(false);
  });

  it('should ignore year difference', () => {
    const result = isBirthday('1990-01-15', '2025-01-15');
    expect(result).toBe(true);
  });

  it('should handle Date objects', () => {
    const birth = new Date('1990-01-15');
    const current = new Date('2025-01-15');
    const result = isBirthday(birth, current);
    expect(result).toBe(true);
  });
});

// =============================================================================
// applyAgingModifiers Tests
// =============================================================================

describe('applyAgingModifiers', () => {
  it('should apply STR modifier at age 65', () => {
    const person = createTestPerson({ birthDate: '1960-01-15' });
    const milestone = getMilestoneForAge(65);
    const aged = applyAgingModifiers(person, milestone);

    // Cumulative: 0.5 + 0.5 + 0 + 0 + (-1.0) = 0
    expect(aged.attributes.STR).toBe(5); // 5 + 0
  });

  it('should apply multiple attribute modifiers', () => {
    const person = createTestPerson({ birthDate: '1960-01-15' });
    const milestone = getMilestoneForAge(65);
    const aged = applyAgingModifiers(person, milestone);

    // STR: 0.5 + 0.5 + 0 + 0 + (-1.0) = 0
    expect(aged.attributes.STR).toBe(5); // 5 + 0
    // BOD: 0.5 + 0.5 + 0 + (-1.0) + (-1.0) = -1.0
    expect(aged.attributes.BOD).toBe(4); // 5 + (-1.0)
    // DEX: 0 + 0 + (-0.5) + 0 + (-1.0) = -1.5
    expect(aged.attributes.DEX).toBe(3.5); // 5 + (-1.5)
  });

  it('should not modify original person', () => {
    const person = createTestPerson({ birthDate: '1960-01-15' });
    const originalSTR = person.attributes.STR;
    const milestone = getMilestoneForAge(65);
    applyAgingModifiers(person, milestone);

    expect(person.attributes.STR).toBe(originalSTR);
  });

  it('should return new person object', () => {
    const person = createTestPerson({ birthDate: '1960-01-15' });
    const milestone = getMilestoneForAge(65);
    const aged = applyAgingModifiers(person, milestone);

    expect(aged).not.toBe(person);
  });
});

// =============================================================================
// processAging Tests
// =============================================================================

describe('processAging', () => {
  it('should return unchanged person if useAgingEffects is false', () => {
    const person = createTestPerson({ birthDate: '1960-01-15' });
    const options = createTestOptions({ useAgingEffects: false });
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson).toEqual(person);
    expect(result.events).toEqual([]);
  });

  it('should return unchanged person if not birthday', () => {
    const person = createTestPerson({ birthDate: '1960-01-15' });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-16', options);

    expect(result.updatedPerson).toEqual(person);
    expect(result.events).toEqual([]);
  });

  it('should return unchanged person if not crossing milestone boundary', () => {
    // Person born 1995-01-15, age 30 on 2025-01-15
    // Still in 25-30 milestone (was in 25-30 at age 29)
    const person = createTestPerson({ birthDate: '1995-01-15' });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson).toEqual(person);
    expect(result.events).toEqual([]);
  });

  it('should apply modifiers when crossing milestone boundary', () => {
    // Person born 1960-01-15, age 65 on 2025-01-15
    // Crossing from 61-70 to... wait, they're already in 61-70
    // Let's use age 31 crossing from 25-30 to 31-40
    const person = createTestPerson({ birthDate: '1994-01-15' });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    // Age 31 is in 31-40 milestone, age 30 was in 25-30
    // Should apply modifiers
    expect(result.updatedPerson.attributes.STR).not.toBe(person.attributes.STR);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('aging');
    expect(result.events[0].age).toBe(31);
  });

  it('should apply Glass Jaw at age 61', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: {},
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    // Age 61 is crossing from 51-60 to 61-70
    expect(result.updatedPerson.traits?.glassJaw).toBe(true);
  });

  it('should not apply Glass Jaw if person has Toughness', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: { toughness: true },
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.glassJaw).toBeUndefined();
  });

  it('should not apply Glass Jaw if person already has Glass Jaw', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: { glassJaw: true },
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.glassJaw).toBe(true);
  });

  it('should apply Slow Learner at age 61', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: {},
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.slowLearner).toBe(true);
  });

  it('should not apply Slow Learner if person has Fast Learner', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: { fastLearner: true },
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.slowLearner).toBeUndefined();
  });

  it('should not apply Slow Learner if person already has Slow Learner', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: { slowLearner: true },
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.slowLearner).toBe(true);
  });

  it('should emit aging event with correct data', () => {
    const person = createTestPerson({ birthDate: '1994-01-15' });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: 'aging',
      personId: person.id,
      age: 31,
    });
    expect(result.events[0].milestone.label).toBe('31-40');
  });

  it('should handle both string and Date for currentDate', () => {
    const person = createTestPerson({ birthDate: '1994-01-15' });
    const options = createTestOptions();

    const resultString = processAging(person, '2025-01-15', options);
    const resultDate = processAging(person, new Date('2025-01-15'), options);

    expect(resultString.events).toHaveLength(1);
    expect(resultDate.events).toHaveLength(1);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Aging System Integration', () => {
  it('should apply cumulative modifiers across multiple milestones', () => {
    // Age 75 should have cumulative modifiers from all previous milestones
    const person = createTestPerson({
      birthDate: '1950-01-15',
      attributes: {
        STR: 5,
        BOD: 5,
        DEX: 5,
        REF: 5,
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 0,
      },
    });

    const milestone = getMilestoneForAge(75);
    const aged = applyAgingModifiers(person, milestone);

    // STR: 25-30 (0.5) + 31-40 (0.5) + 61-70 (-1.0) + 71-80 (-1.0) = -1.0
    expect(aged.attributes.STR).toBe(4);
  });

  it('should handle person with no traits', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: undefined,
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.glassJaw).toBe(true);
    expect(result.updatedPerson.traits?.slowLearner).toBe(true);
  });

  it('should handle person with empty traits object', () => {
    const person = createTestPerson({
      birthDate: '1964-01-15',
      traits: {},
    });
    const options = createTestOptions();
    const result = processAging(person, '2025-01-15', options);

    expect(result.updatedPerson.traits?.glassJaw).toBe(true);
    expect(result.updatedPerson.traits?.slowLearner).toBe(true);
  });
});
