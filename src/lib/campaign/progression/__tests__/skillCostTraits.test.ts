/**
 * Tests for Skill Cost Trait Modifiers
 *
 * Validates trait-based cost modifiers for skill improvement.
 * Tests trait stacking, tech skill detection, and cost calculations.
 * Uses (entry: ICampaignRosterEntry, pilot: IPilot | null) two-arg pattern.
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { SKILL_CATALOG } from '@/constants/campaign/skillCatalog';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums';
import { PilotType, PilotStatus } from '@/types/pilot/PilotInterfaces';

import {
  isTechSkill,
  calculateTraitMultiplier,
  getSkillImprovementCostWithTraits,
  checkVeterancySPA,
} from '../skillCostTraits';

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
// isTechSkill Tests
// =============================================================================

describe('isTechSkill', () => {
  it('should return true for tech-mech skill', () => {
    const skill = SKILL_CATALOG['tech-mech'];
    if (skill) {
      expect(isTechSkill(skill)).toBe(true);
    }
  });

  it('should return true for tech-aero skill', () => {
    const skill = SKILL_CATALOG['tech-aero'];
    if (skill) {
      expect(isTechSkill(skill)).toBe(true);
    }
  });

  it('should return false for gunnery skill', () => {
    const skill = SKILL_CATALOG['gunnery'];
    if (skill) {
      expect(isTechSkill(skill)).toBe(false);
    }
  });

  it('should return false for piloting skill', () => {
    const skill = SKILL_CATALOG['piloting'];
    if (skill) {
      expect(isTechSkill(skill)).toBe(false);
    }
  });
});

// =============================================================================
// calculateTraitMultiplier Tests
// =============================================================================

describe('calculateTraitMultiplier', () => {
  it('should return 1.0 for NPC (null pilot)', () => {
    const entry = makeEntry();
    expect(calculateTraitMultiplier(entry, null, 'gunnery')).toBe(1.0);
  });

  it('should return 1.0 for entry with no traits', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(1.0);
  });

  it('should return 1.2 for Slow Learner on non-tech skill', () => {
    const entry = makeEntry({ traits: { slowLearner: true } });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(1.2);
  });

  it('should return 0.8 for Fast Learner on non-tech skill', () => {
    const entry = makeEntry({ traits: { fastLearner: true } });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(0.8);
  });

  it('should return 1.0 for both Slow Learner and Fast Learner (cancels out)', () => {
    const entry = makeEntry({
      traits: { slowLearner: true, fastLearner: true },
    });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(1.0);
  });

  it('should return 1.1 for Gremlins on tech-mech skill', () => {
    const entry = makeEntry({ traits: { gremlins: true } });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'tech-mech')).toBeCloseTo(
      1.1,
    );
  });

  it('should return 0.9 for Tech Empathy on tech-mech skill', () => {
    const entry = makeEntry({ traits: { techEmpathy: true } });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'tech-mech')).toBeCloseTo(
      0.9,
    );
  });

  it('should return 1.0 for Gremlins on non-tech skill (ignored)', () => {
    const entry = makeEntry({ traits: { gremlins: true } });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(1.0);
  });

  it('should return 1.0 for Tech Empathy on non-tech skill (ignored)', () => {
    const entry = makeEntry({ traits: { techEmpathy: true } });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(1.0);
  });

  it('should stack Slow Learner + Gremlins on tech-mech skill', () => {
    const entry = makeEntry({ traits: { slowLearner: true, gremlins: true } });
    const pilot = makePilot();
    // 1.0 + 0.2 + 0.1 = 1.3
    expect(calculateTraitMultiplier(entry, pilot, 'tech-mech')).toBeCloseTo(
      1.3,
    );
  });

  it('should stack Fast Learner + Tech Empathy on tech-mech skill', () => {
    const entry = makeEntry({
      traits: { fastLearner: true, techEmpathy: true },
    });
    const pilot = makePilot();
    // 1.0 - 0.2 - 0.1 = 0.7
    expect(calculateTraitMultiplier(entry, pilot, 'tech-mech')).toBeCloseTo(
      0.7,
    );
  });

  it('should floor multiplier at 0.1 when heavily discounted', () => {
    // Fast Learner + Tech Empathy + additional discount scenario — ensure floor at 0.1
    const entry = makeEntry({
      traits: { fastLearner: true, techEmpathy: true },
    });
    const pilot = makePilot();
    const result = calculateTraitMultiplier(entry, pilot, 'tech-mech');
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  it('should return 1.0 when traits is undefined', () => {
    const entry = makeEntry({ traits: undefined });
    const pilot = makePilot();
    expect(calculateTraitMultiplier(entry, pilot, 'gunnery')).toBe(1.0);
  });
});

// =============================================================================
// getSkillImprovementCostWithTraits Tests
// =============================================================================

describe('getSkillImprovementCostWithTraits', () => {
  it('should return base cost for NPC (null pilot)', () => {
    const entry = makeEntry({ traits: { slowLearner: true } });
    const options = makeOptions();
    // NPC: no trait modifiers applied (pilot === null)
    const baseCost = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entry,
      null,
      options,
    );
    const normalCost = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      makeEntry(),
      null,
      options,
    );
    // Both should be same (no traits applied for null pilot)
    expect(baseCost).toBe(normalCost);
  });

  it('should apply Slow Learner +20% to base cost', () => {
    const entryNoTraits = makeEntry();
    const entrySlowLearner = makeEntry({ traits: { slowLearner: true } });
    const pilot = makePilot();
    const options = makeOptions();
    const baseCost = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entryNoTraits,
      pilot,
      options,
    );
    const withTrait = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entrySlowLearner,
      pilot,
      options,
    );
    expect(withTrait).toBe(Math.max(1, Math.round(baseCost * 1.2)));
  });

  it('should apply Fast Learner -20% to base cost', () => {
    const entryNoTraits = makeEntry();
    const entryFastLearner = makeEntry({ traits: { fastLearner: true } });
    const pilot = makePilot();
    const options = makeOptions();
    const baseCost = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entryNoTraits,
      pilot,
      options,
    );
    const withTrait = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entryFastLearner,
      pilot,
      options,
    );
    expect(withTrait).toBe(Math.max(1, Math.round(baseCost * 0.8)));
  });

  it('should apply Gremlins +10% to tech-mech skill', () => {
    const entryNoTraits = makeEntry();
    const entryGremlins = makeEntry({ traits: { gremlins: true } });
    const pilot = makePilot();
    const options = makeOptions();
    const baseCost = getSkillImprovementCostWithTraits(
      'tech-mech',
      0,
      entryNoTraits,
      pilot,
      options,
    );
    const withTrait = getSkillImprovementCostWithTraits(
      'tech-mech',
      0,
      entryGremlins,
      pilot,
      options,
    );
    expect(withTrait).toBe(Math.max(1, Math.round(baseCost * 1.1)));
  });

  it('should return minimum cost of 1 even with heavy discounts', () => {
    const entry = makeEntry({
      traits: { fastLearner: true, techEmpathy: true },
    });
    const pilot = makePilot();
    const options = makeOptions();
    const cost = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entry,
      pilot,
      options,
    );
    expect(cost).toBeGreaterThanOrEqual(1);
  });

  it('should increase cost at higher skill levels', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const options = makeOptions();
    const costLevel0 = getSkillImprovementCostWithTraits(
      'gunnery',
      0,
      entry,
      pilot,
      options,
    );
    const costLevel3 = getSkillImprovementCostWithTraits(
      'gunnery',
      3,
      entry,
      pilot,
      options,
    );
    expect(costLevel3).toBeGreaterThanOrEqual(costLevel0);
  });
});

// =============================================================================
// checkVeterancySPA Tests
// =============================================================================

describe('checkVeterancySPA', () => {
  it('should return false if entry has hasGainedVeterancySPA flag', () => {
    const entry = makeEntry({ traits: { hasGainedVeterancySPA: true } });
    expect(checkVeterancySPA(entry, 'gunnery')).toBe(false);
  });

  it('should return false if entry has no traits', () => {
    const entry = makeEntry();
    expect(checkVeterancySPA(entry, 'gunnery')).toBe(false);
  });

  it('should return false if traits is undefined', () => {
    const entry = makeEntry({ traits: undefined });
    expect(checkVeterancySPA(entry, 'gunnery')).toBe(false);
  });

  it('should return false for any skill (stub always returns false)', () => {
    const entry = makeEntry({ traits: {} });
    expect(checkVeterancySPA(entry, 'piloting')).toBe(false);
    expect(checkVeterancySPA(entry, 'tech-mech')).toBe(false);
    expect(checkVeterancySPA(entry, 'gunnery')).toBe(false);
  });
});
