/**
 * Tests for the aging system
 *
 * Covers:
 * - Milestone lookup by age
 * - Attribute modifier calculation (cumulative)
 * - Age calculation from birth date
 * - Birthday detection
 * - processAging: delta-return contract with two-arg (entry, pilot) signature
 * - NPC rule: null pilot → empty delta
 * - Glass Jaw / Slow Learner trait application at age 61+
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums';
import { PilotType, PilotStatus } from '@/types/pilot/PilotInterfaces';

import {
  AGING_MILESTONES,
  getMilestoneForAge,
  getAgingAttributeModifier,
  calculateAge,
  isBirthday,
  processAging,
} from '../aging';

// =============================================================================
// Test Factories
// =============================================================================

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'John Smith',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 500,
    campaignXpEarned: 1500,
    campaignKills: 8,
    campaignMissions: 12,
    hireDate: new Date('3000-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'John Smith',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-01-25T00:00:00Z',
    ...overrides,
  };
}

function makeOptions(
  overrides: Partial<ICampaignOptions> = {},
): ICampaignOptions {
  return {
    useAgingEffects: true,
    healingRateMultiplier: 1.0,
    salaryMultiplier: 1.0,
    retirementAge: 65,
    healingWaitingPeriod: 7,
    maxPatientsPerDoctor: 4,
    doctorsUseAdministration: false,
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
    useAutoResolve: false,
    autoResolveCasualtyRate: 1.0,
    allowPilotCapture: true,
    useRandomInjuries: true,
    pilotDeathChance: 0.1,
    autoEject: true,
    trackAmmunition: true,
    useQuirks: true,
    maxUnitsPerLance: 4,
    maxLancesPerCompany: 4,
    enforceFormationRules: false,
    allowMixedFormations: true,
    requireForceCommanders: false,
    useCombatTeams: false,
    dateFormat: 'yyyy-MM-dd',
    useFactionRules: false,
    techLevel: 1,
    limitByYear: false,
    allowClanEquipment: true,
    useRandomEvents: false,
    enableDayReportNotifications: true,
    useTurnover: false,
    turnoverFixedTargetNumber: 7,
    turnoverCheckFrequency: 'monthly',
    turnoverCommanderImmune: true,
    turnoverPayoutMultiplier: 1.0,
    turnoverUseSkillModifiers: false,
    turnoverUseAgeModifiers: false,
    turnoverUseMissionStatusModifiers: false,
    trackFactionStanding: false,
    regardChangeMultiplier: 1.0,
    ...overrides,
  } as ICampaignOptions;
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
    expect(getMilestoneForAge(20).label).toBe('<25');
  });

  it('should return 25-30 milestone for age 30', () => {
    expect(getMilestoneForAge(30).label).toBe('25-30');
  });

  it('should return 61-70 milestone for age 65', () => {
    expect(getMilestoneForAge(65).label).toBe('61-70');
  });

  it('should return 101+ milestone for age 150', () => {
    expect(getMilestoneForAge(150).label).toBe('101+');
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

  it('should return 0 for STR at age 65 (cumulative: 0.5+0.5+0+0-1.0=0)', () => {
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
    expect(calculateAge('1990-01-15', '2025-01-14')).toBe(34);
  });

  it('should calculate age correctly on birthday', () => {
    expect(calculateAge('1990-01-15', '2025-01-15')).toBe(35);
  });

  it('should calculate age correctly after birthday', () => {
    expect(calculateAge('1990-01-15', '2025-01-16')).toBe(35);
  });

  it('should handle Date objects', () => {
    const birth = new Date('1990-01-15');
    const current = new Date('2025-01-15');
    expect(calculateAge(birth, current)).toBe(35);
  });

  it('should handle ISO 8601 strings', () => {
    expect(calculateAge('1990-01-15T00:00:00Z', '2025-01-15T00:00:00Z')).toBe(
      35,
    );
  });
});

// =============================================================================
// isBirthday Tests
// =============================================================================

describe('isBirthday', () => {
  it('should return true on birthday', () => {
    expect(isBirthday('1990-01-15', '2025-01-15')).toBe(true);
  });

  it('should return false day before birthday', () => {
    expect(isBirthday('1990-01-15', '2025-01-14')).toBe(false);
  });

  it('should return false day after birthday', () => {
    expect(isBirthday('1990-01-15', '2025-01-16')).toBe(false);
  });

  it('should ignore year difference', () => {
    expect(isBirthday('1990-01-15', '2025-01-15')).toBe(true);
  });

  it('should handle Date objects', () => {
    const birth = new Date('1990-01-15');
    const current = new Date('2025-01-15');
    expect(isBirthday(birth, current)).toBe(true);
  });
});

// =============================================================================
// processAging Tests — delta-return contract
// =============================================================================

describe('processAging', () => {
  it('should return empty delta for NPC (pilot === null)', () => {
    const entry = makeEntry();
    const options = makeOptions();
    const delta = processAging(entry, null, '2025-01-15', options);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.events).toHaveLength(0);
  });

  it('should return empty delta if useAgingEffects is false', () => {
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions({ useAgingEffects: false });
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.events).toHaveLength(0);
  });

  it('should return empty delta if pilot has no birthDate', () => {
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: undefined });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.events).toHaveLength(0);
  });

  it('should return empty delta if not birthday', () => {
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-16', options);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.events).toHaveLength(0);
  });

  it('should return empty delta if not crossing milestone boundary (still same milestone)', () => {
    // Born 1995-01-15, age 30 on 2025-01-15 — stays in 25-30 milestone (was 29 = 25-30)
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1995-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.events).toHaveLength(0);
  });

  it('should return delta with events when crossing milestone boundary', () => {
    // Born 1994-01-15, age 31 on 2025-01-15 — crosses from 25-30 to 31-40
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.events).toHaveLength(1);
    expect(delta.events[0].type).toBe('aging');
    expect(delta.events[0].age).toBe(31);
    expect(delta.events[0].milestone.label).toBe('31-40');
    expect(delta.events[0].personId).toBe('pilot-001');
  });

  it('should return non-null vault when attribute changes exist at milestone', () => {
    // Age 31 (31-40 milestone) has STR +0.5, so cumulative is non-zero
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.vault).not.toBeNull();
    expect(delta.vault?.pilotId).toBe('pilot-001');
    expect(delta.vault?.attributeChanges).toBeDefined();
  });

  it('should include STR change in vault.attributeChanges at age 31', () => {
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    // Age 31: cumulative STR = 25-30 (0.5) + 31-40 (0.5) = 1.0
    expect(delta.vault?.attributeChanges['STR']).toBe(1.0);
  });

  it('should apply Glass Jaw at age 61 (roster.traitsDelta)', () => {
    // Born 1964-01-15, age 61 on 2025-01-15 — crosses from 51-60 to 61-70
    const entry = makeEntry({ traits: {} });
    const pilot = makePilot({ birthDate: '1964-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.roster?.traitsDelta.glassJaw).toBe(true);
  });

  it('should apply Slow Learner at age 61 (roster.traitsDelta)', () => {
    const entry = makeEntry({ traits: {} });
    const pilot = makePilot({ birthDate: '1964-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.roster?.traitsDelta.slowLearner).toBe(true);
  });

  it('should not apply Glass Jaw if entry has Toughness', () => {
    const entry = makeEntry({ traits: { toughness: true } });
    const pilot = makePilot({ birthDate: '1964-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.roster?.traitsDelta.glassJaw).toBeUndefined();
  });

  it('should not apply Glass Jaw if entry already has Glass Jaw', () => {
    const entry = makeEntry({ traits: { glassJaw: true } });
    const pilot = makePilot({ birthDate: '1964-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.roster?.traitsDelta.glassJaw).toBeUndefined();
  });

  it('should not apply Slow Learner if entry has Fast Learner', () => {
    const entry = makeEntry({ traits: { fastLearner: true } });
    const pilot = makePilot({ birthDate: '1964-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.roster?.traitsDelta.slowLearner).toBeUndefined();
  });

  it('should not apply Slow Learner if entry already has Slow Learner', () => {
    const entry = makeEntry({ traits: { slowLearner: true } });
    const pilot = makePilot({ birthDate: '1964-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.roster?.traitsDelta.slowLearner).toBeUndefined();
  });

  it('should handle Date object for currentDate', () => {
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, new Date('2025-01-15'), options);
    expect(delta.events).toHaveLength(1);
  });

  it('should return null roster when no trait changes (no age-61+ milestone)', () => {
    // Age 31 crossing: has attribute changes but no trait changes
    const entry = makeEntry({ traits: {} });
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    // 31-40 milestone does not apply Glass Jaw or Slow Learner
    expect(delta.roster).toBeNull();
  });
});

// =============================================================================
// Integration: cumulative modifiers across milestones
// =============================================================================

describe('Aging System Integration', () => {
  it('should reflect cumulative STR modifier at age 75 in getAgingAttributeModifier', () => {
    // STR: 25-30 (0.5) + 31-40 (0.5) + 61-70 (-1.0) + 71-80 (-1.0) = -1.0
    expect(getAgingAttributeModifier(75, 'STR')).toBe(-1.0);
  });

  it('should emit event when processAging crosses milestone', () => {
    const entry = makeEntry();
    const pilot = makePilot({ birthDate: '1994-01-15' });
    const options = makeOptions();
    const delta = processAging(entry, pilot, '2025-01-15', options);
    expect(delta.events).toHaveLength(1);
    expect(delta.events[0].milestone.label).toBe('31-40');
  });
});
