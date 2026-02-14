/**
 * SPA Acquisition System Tests
 *
 * Tests for special ability acquisition, veterancy rolls, and purchase mechanics.
 */

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { IPerson } from '@/types/campaign/Person';

import {
  SPA_CATALOG,
  rollVeterancySPA,
  rollComingOfAgeSPA,
  purchaseSPA,
  personHasSPA,
} from '../spaAcquisition';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a test person with optional overrides.
 */
function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'test-person-1',
    name: 'Test Pilot',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('2025-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 100,
    totalXpEarned: 100,
    xpSpent: 0,
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
    pilotSkills: { gunnery: 4, piloting: 4 },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a seeded random function for deterministic testing.
 * Maps die values to random() inputs: (die - 1) / 6
 */
function randomFor(value: number): () => number {
  return () => value;
}

// =============================================================================
// SPA Catalog Tests
// =============================================================================

describe('SPA_CATALOG', () => {
  it('should have 10 SPAs defined', () => {
    expect(Object.keys(SPA_CATALOG).length).toBe(10);
  });

  it('should have correct benefit SPAs', () => {
    expect(SPA_CATALOG.fast_learner.isFlaw).toBe(false);
    expect(SPA_CATALOG.fast_learner.isOriginOnly).toBe(false);
    expect(SPA_CATALOG.fast_learner.xpCost).toBe(30);

    expect(SPA_CATALOG.toughness.isFlaw).toBe(false);
    expect(SPA_CATALOG.toughness.xpCost).toBe(25);

    expect(SPA_CATALOG.iron_man.isFlaw).toBe(false);
    expect(SPA_CATALOG.iron_man.xpCost).toBe(40);
  });

  it('should have origin-only SPA', () => {
    expect(SPA_CATALOG.natural_aptitude.isOriginOnly).toBe(true);
    expect(SPA_CATALOG.natural_aptitude.isFlaw).toBe(false);
  });

  it('should have flaw SPAs with negative XP cost', () => {
    expect(SPA_CATALOG.slow_learner.isFlaw).toBe(true);
    expect(SPA_CATALOG.slow_learner.xpCost).toBe(-10);

    expect(SPA_CATALOG.glass_jaw.isFlaw).toBe(true);
    expect(SPA_CATALOG.glass_jaw.xpCost).toBe(-10);

    expect(SPA_CATALOG.gremlins.isFlaw).toBe(true);
    expect(SPA_CATALOG.gremlins.xpCost).toBe(-5);
  });
});

// =============================================================================
// Veterancy SPA Roll Tests
// =============================================================================

describe('rollVeterancySPA', () => {
  it('should return null if person already has veterancy SPA', () => {
    const person = createTestPerson({
      traits: { hasGainedVeterancySPA: true },
    });
    const result = rollVeterancySPA(person, randomFor(0.5));
    expect(result).toBeNull();
  });

  it('should exclude origin-only SPAs from eligible pool', () => {
    const person = createTestPerson();
    // Use random value that selects natural_aptitude if it were in pool
    // Since natural_aptitude is origin-only, it should be excluded
    const result = rollVeterancySPA(person, randomFor(0.5));
    expect(result).not.toEqual(SPA_CATALOG.natural_aptitude);
  });

  it('should exclude already-held SPAs', () => {
    const person = createTestPerson({
      specialAbilities: ['fast_learner'],
    });
    // Roll multiple times to check fast_learner is never returned
    for (let i = 0; i < 10; i++) {
      const result = rollVeterancySPA(person, randomFor(i / 10));
      if (result) {
        expect(result.id).not.toBe('fast_learner');
      }
    }
  });

  it('should have 1/40 chance of flaw instead of benefit', () => {
    const person = createTestPerson();
    // random() = 0 means Math.floor(0 * 40) = 0, which triggers flaw
    const result = rollVeterancySPA(person, randomFor(0));
    expect(result?.isFlaw).toBe(true);
  });

  it('should select from benefit pool when not flaw roll', () => {
    const person = createTestPerson();
    // random() = 0.5 means Math.floor(0.5 * 40) = 20, not 0, so benefit
    const result = rollVeterancySPA(person, randomFor(0.5));
    expect(result?.isFlaw).toBe(false);
  });

  it('should return null if no eligible SPAs available', () => {
    // Create person with all non-flaw SPAs already held
    const person = createTestPerson({
      specialAbilities: [
        'fast_learner',
        'toughness',
        'pain_resistance',
        'weapon_specialist',
        'tactical_genius',
        'iron_man',
      ],
    });
    const result = rollVeterancySPA(person, randomFor(0.5));
    expect(result).toBeNull();
  });

  it('should return a valid SPA from catalog', () => {
    const person = createTestPerson();
    const result = rollVeterancySPA(person, randomFor(0.5));
    expect(result).not.toBeNull();
    if (result) {
      expect(SPA_CATALOG[result.id]).toBeDefined();
    }
  });
});

// =============================================================================
// Coming of Age SPA Roll Tests
// =============================================================================

describe('rollComingOfAgeSPA', () => {
  it('should return null (stub)', () => {
    const person = createTestPerson();
    const result = rollComingOfAgeSPA(person, randomFor(0.5));
    expect(result).toBeNull();
  });
});

// =============================================================================
// Purchase SPA Tests
// =============================================================================

describe('purchaseSPA', () => {
  it('should deduct XP and add SPA to person', () => {
    const person = createTestPerson({ xp: 100 });
    const result = purchaseSPA(person, 'fast_learner');
    expect(result.success).toBe(true);
    expect(result.updatedPerson.xp).toBe(70); // 100 - 30
    expect(result.updatedPerson.specialAbilities).toContain('fast_learner');
  });

  it('should fail if insufficient XP', () => {
    const person = createTestPerson({ xp: 10 });
    const result = purchaseSPA(person, 'fast_learner');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Insufficient');
    expect(result.updatedPerson.xp).toBe(10); // unchanged
  });

  it('should fail if SPA does not exist', () => {
    const person = createTestPerson({ xp: 100 });
    const result = purchaseSPA(person, 'nonexistent_spa');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should fail if person already has SPA', () => {
    const person = createTestPerson({
      xp: 100,
      specialAbilities: ['fast_learner'],
    });
    const result = purchaseSPA(person, 'fast_learner');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('already has');
  });

  it('should handle negative XP cost (flaws)', () => {
    const person = createTestPerson({ xp: 100 });
    const result = purchaseSPA(person, 'slow_learner');
    expect(result.success).toBe(true);
    expect(result.updatedPerson.xp).toBe(110); // 100 - (-10)
    expect(result.updatedPerson.specialAbilities).toContain('slow_learner');
  });

  it('should preserve other specialAbilities', () => {
    const person = createTestPerson({
      xp: 100,
      specialAbilities: ['toughness'],
    });
    const result = purchaseSPA(person, 'fast_learner');
    expect(result.success).toBe(true);
    expect(result.updatedPerson.specialAbilities).toContain('toughness');
    expect(result.updatedPerson.specialAbilities).toContain('fast_learner');
  });

  it('should not mutate original person', () => {
    const person = createTestPerson({ xp: 100 });
    const originalXp = person.xp;
    purchaseSPA(person, 'fast_learner');
    expect(person.xp).toBe(originalXp);
  });
});

// =============================================================================
// Person Has SPA Tests
// =============================================================================

describe('personHasSPA', () => {
  it('should return true if person has SPA', () => {
    const person = createTestPerson({
      specialAbilities: ['fast_learner'],
    });
    expect(personHasSPA(person, 'fast_learner')).toBe(true);
  });

  it('should return false if person does not have SPA', () => {
    const person = createTestPerson({
      specialAbilities: ['fast_learner'],
    });
    expect(personHasSPA(person, 'toughness')).toBe(false);
  });

  it('should return false if person has no specialAbilities', () => {
    const person = createTestPerson();
    expect(personHasSPA(person, 'fast_learner')).toBe(false);
  });

  it('should return false if specialAbilities is undefined', () => {
    const person = createTestPerson();
    const personWithoutAbilities = { ...person, specialAbilities: undefined };
    expect(personHasSPA(personWithoutAbilities, 'fast_learner')).toBe(false);
  });
});
