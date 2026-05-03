/**
 * SPA Acquisition System Tests
 *
 * Tests for special ability acquisition, veterancy rolls, and purchase mechanics.
 * Uses (entry: ICampaignRosterEntry, pilot: IPilot | null) two-arg signatures
 * and asserts on delta-return shapes (ISpaPurchaseDelta) rather than mutated entities.
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot, IPilotAbilityRef } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  SPA_CATALOG,
  rollVeterancySPA,
  rollComingOfAgeSPA,
  purchaseSPA,
  pilotHasSPA,
  personHasSPA,
} from '../spaAcquisition';

// =============================================================================
// Test Factories
// =============================================================================

/**
 * Minimal ICampaignRosterEntry for progression tests.
 * Provides required fields; all optional fields default to absent.
 */
function makeEntry(
  overrides?: Partial<ICampaignRosterEntry>,
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'Test Pilot',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 100,
    campaignXpEarned: 100,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    traits: {},
    ...overrides,
  } as ICampaignRosterEntry;
}

/**
 * Minimal IPilot for progression tests.
 * Abilities default to empty; birthDate defaults to absent.
 */
function makePilot(overrides?: Partial<IPilot>): IPilot {
  return {
    id: 'pilot-001',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    name: 'Test Pilot',
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    ...overrides,
  } as IPilot;
}

/**
 * Creates a seeded random function for deterministic testing.
 * Returns the given constant value on every call.
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
  it('should return null for NPC (pilot === null)', () => {
    const entry = makeEntry();
    const result = rollVeterancySPA(entry, null, randomFor(0.5));
    expect(result).toBeNull();
  });

  it('should return null if entry already has veterancy SPA', () => {
    const entry = makeEntry({ traits: { hasGainedVeterancySPA: true } });
    const pilot = makePilot();
    const result = rollVeterancySPA(entry, pilot, randomFor(0.5));
    expect(result).toBeNull();
  });

  it('should exclude origin-only SPAs from eligible pool', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    // Use benefit roll (not flaw) — random 0.5 → floor(0.5*40)=20, not 0
    const result = rollVeterancySPA(entry, pilot, randomFor(0.5));
    expect(result).not.toEqual(SPA_CATALOG.natural_aptitude);
  });

  it('should exclude SPAs the pilot already holds', () => {
    const abilities: readonly IPilotAbilityRef[] = [
      { abilityId: 'fast_learner', acquiredDate: '3025-01-01', xpSpent: 30 },
    ];
    const entry = makeEntry();
    const pilot = makePilot({ abilities });

    // Roll 10 times across the full benefit pool — fast_learner must never be returned
    for (let i = 0; i < 10; i++) {
      const result = rollVeterancySPA(entry, pilot, randomFor(i / 10));
      if (result) {
        expect(result.id).not.toBe('fast_learner');
      }
    }
  });

  it('should have 1/40 chance of flaw when random() * 40 === 0', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    // random() = 0 → Math.floor(0 * 40) = 0 → flaw path
    const result = rollVeterancySPA(entry, pilot, randomFor(0));
    expect(result?.isFlaw).toBe(true);
  });

  it('should select from benefit pool when not a flaw roll', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    // random() = 0.5 → floor(0.5 * 40) = 20, not 0 → benefit path
    const result = rollVeterancySPA(entry, pilot, randomFor(0.5));
    expect(result?.isFlaw).toBe(false);
  });

  it('should return null if no eligible SPAs available', () => {
    const abilities: readonly IPilotAbilityRef[] = [
      'fast_learner',
      'toughness',
      'pain_resistance',
      'weapon_specialist',
      'tactical_genius',
      'iron_man',
    ].map((id) => ({ abilityId: id, acquiredDate: '3025-01-01', xpSpent: 0 }));

    const entry = makeEntry();
    const pilot = makePilot({ abilities });
    // benefit pool is empty → returns null even on non-flaw roll
    const result = rollVeterancySPA(entry, pilot, randomFor(0.5));
    expect(result).toBeNull();
  });

  it('should return a valid SPA from catalog', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const result = rollVeterancySPA(entry, pilot, randomFor(0.5));
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
  it('should return null for PC (stub not implemented)', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    const result = rollComingOfAgeSPA(entry, pilot, randomFor(0.5));
    expect(result).toBeNull();
  });

  it('should return null for NPC', () => {
    const entry = makeEntry();
    const result = rollComingOfAgeSPA(entry, null, randomFor(0.5));
    expect(result).toBeNull();
  });
});

// =============================================================================
// Purchase SPA Tests — delta-return shape assertions
// =============================================================================

describe('purchaseSPA', () => {
  it('should return failure delta for NPC (pilot === null)', () => {
    const entry = makeEntry({ xp: 100 });
    const delta = purchaseSPA(entry, null, 'fast_learner', '3025-01-15');
    expect(delta.success).toBe(false);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.reason).toContain('NPC');
  });

  it('should return success delta with vault + roster on valid purchase', () => {
    const entry = makeEntry({ xp: 100 });
    const pilot = makePilot();
    const delta = purchaseSPA(entry, pilot, 'fast_learner', '3025-01-15');

    expect(delta.success).toBe(true);
    expect(delta.vault?.pilotId).toBe('pilot-001');
    expect(delta.vault?.newAbility.abilityId).toBe('fast_learner');
    expect(delta.vault?.newAbility.acquiredDate).toBe('3025-01-15');
    expect(delta.vault?.newAbility.xpSpent).toBe(30);
    // xpDelta is negative (deduction) — -xpCost for benefits
    expect(delta.roster?.pilotId).toBe('pilot-001');
    expect(delta.roster?.xpDelta).toBe(-30);
  });

  it('should return failure delta when insufficient XP', () => {
    const entry = makeEntry({ xp: 10 });
    const pilot = makePilot();
    const delta = purchaseSPA(entry, pilot, 'fast_learner', '3025-01-15');

    expect(delta.success).toBe(false);
    expect(delta.vault).toBeNull();
    expect(delta.roster).toBeNull();
    expect(delta.reason).toContain('Insufficient');
  });

  it('should return failure delta when SPA not in catalog', () => {
    const entry = makeEntry({ xp: 100 });
    const pilot = makePilot();
    const delta = purchaseSPA(entry, pilot, 'nonexistent_spa', '3025-01-15');

    expect(delta.success).toBe(false);
    expect(delta.reason).toContain('not found');
  });

  it('should return failure delta when pilot already has SPA', () => {
    const abilities: readonly IPilotAbilityRef[] = [
      { abilityId: 'fast_learner', acquiredDate: '3025-01-01', xpSpent: 30 },
    ];
    const entry = makeEntry({ xp: 100 });
    const pilot = makePilot({ abilities });
    const delta = purchaseSPA(entry, pilot, 'fast_learner', '3025-01-15');

    expect(delta.success).toBe(false);
    expect(delta.reason).toContain('already has');
  });

  it('should handle flaw purchase — xpDelta is positive (flaw grants XP)', () => {
    // slow_learner has xpCost = -10 → xpDelta = -(-10) = +10
    const entry = makeEntry({ xp: 100 });
    const pilot = makePilot();
    const delta = purchaseSPA(entry, pilot, 'slow_learner', '3025-01-15');

    expect(delta.success).toBe(true);
    expect(delta.vault?.newAbility.abilityId).toBe('slow_learner');
    expect(delta.vault?.newAbility.xpSpent).toBe(-10);
    expect(delta.roster?.xpDelta).toBe(10); // -(-10) = 10
  });

  it('should allow flaw purchase even with 0 XP (flaw grants XP)', () => {
    // newXp = 0 - (-10) = 10 >= 0 — should succeed
    const entry = makeEntry({ xp: 0 });
    const pilot = makePilot();
    const delta = purchaseSPA(entry, pilot, 'slow_learner', '3025-01-15');

    expect(delta.success).toBe(true);
    expect(delta.roster?.xpDelta).toBe(10);
  });

  it('should not mutate entry or pilot (immutable delta pattern)', () => {
    const entry = makeEntry({ xp: 100 });
    const pilot = makePilot();
    const originalXp = entry.xp;
    const originalAbilities = pilot.abilities;

    purchaseSPA(entry, pilot, 'fast_learner', '3025-01-15');

    // Entry and pilot must be unchanged — caller commits the delta
    expect(entry.xp).toBe(originalXp);
    expect(pilot.abilities).toBe(originalAbilities);
  });
});

// =============================================================================
// pilotHasSPA Tests
// =============================================================================

describe('pilotHasSPA', () => {
  it('should return true when pilot has the SPA', () => {
    const abilities: readonly IPilotAbilityRef[] = [
      { abilityId: 'fast_learner', acquiredDate: '3025-01-01', xpSpent: 30 },
    ];
    const pilot = makePilot({ abilities });
    expect(pilotHasSPA(pilot, 'fast_learner')).toBe(true);
  });

  it('should return false when pilot does not have the SPA', () => {
    const abilities: readonly IPilotAbilityRef[] = [
      { abilityId: 'fast_learner', acquiredDate: '3025-01-01', xpSpent: 30 },
    ];
    const pilot = makePilot({ abilities });
    expect(pilotHasSPA(pilot, 'toughness')).toBe(false);
  });

  it('should return false when pilot has no abilities', () => {
    const pilot = makePilot({ abilities: [] });
    expect(pilotHasSPA(pilot, 'fast_learner')).toBe(false);
  });
});

// =============================================================================
// personHasSPA Tests
// =============================================================================

describe('personHasSPA', () => {
  it('should return false for NPC (pilot === null)', () => {
    const entry = makeEntry();
    expect(personHasSPA(entry, null, 'fast_learner')).toBe(false);
  });

  it('should return true when pilot has the SPA', () => {
    const abilities: readonly IPilotAbilityRef[] = [
      { abilityId: 'fast_learner', acquiredDate: '3025-01-01', xpSpent: 30 },
    ];
    const entry = makeEntry();
    const pilot = makePilot({ abilities });
    expect(personHasSPA(entry, pilot, 'fast_learner')).toBe(true);
  });

  it('should return false when pilot does not have the SPA', () => {
    const entry = makeEntry();
    const pilot = makePilot();
    expect(personHasSPA(entry, pilot, 'fast_learner')).toBe(false);
  });

  it('should ignore entry — SPA ownership lives in vault pilot', () => {
    // Entry has no traits or SPA-like fields; result depends solely on pilot
    const entry = makeEntry();
    const pilot = makePilot();
    expect(personHasSPA(entry, pilot, 'fast_learner')).toBe(false);
  });
});
