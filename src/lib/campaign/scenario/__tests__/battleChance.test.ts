/**
 * Battle Chance Calculator Tests
 *
 * Tests for AtB battle chance calculation system including:
 * - BASE_BATTLE_CHANCE constants per combat role
 * - calculateBattleTypeMod() with morale level modifier
 * - checkForBattle() with injectable random function
 *
 * @module campaign/scenario/__tests__/battleChance
 */

import {
  BASE_BATTLE_CHANCE,
  calculateBattleTypeMod,
  checkForBattle,
  type RandomFn,
} from '../battleChance';
import { CombatRole, AtBMoraleLevel, type ICombatTeam } from '@/types/campaign/scenario/scenarioTypes';
import { type IContract } from '@/types/campaign/Mission';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a seeded random function that always returns a specific value.
 * Used for deterministic testing.
 *
 * @param value - The value to return (0-1 range)
 * @returns RandomFn that always returns the specified value
 */
const seededRandom = (value: number): RandomFn => () => value;

/**
 * Create a mock combat team for testing.
 *
 * @param role - Combat role for the team
 * @returns ICombatTeam with default values
 */
const createMockTeam = (role: CombatRole): ICombatTeam => ({
  forceId: 'test-force-001',
  role,
  battleChance: BASE_BATTLE_CHANCE[role],
});

/**
 * Create a mock contract for testing.
 *
 * @param moraleLevel - Morale level for the contract
 * @returns IContract with minimal required fields
 */
const createMockContract = (moraleLevel: AtBMoraleLevel = AtBMoraleLevel.STALEMATE): IContract => ({
  id: 'test-contract-001',
  name: 'Test Contract',
  type: 'contract',
  status: MissionStatus.ACTIVE,
  systemId: 'test-system',
  scenarioIds: [],
  startDate: '3025-01-01',
  endDate: '3025-12-31',
  createdAt: '3025-01-01T00:00:00Z',
  updatedAt: '3025-01-01T00:00:00Z',
  employerId: 'test-employer',
  targetId: 'test-target',
  paymentTerms: {
    basePayment: new Money(100000),
    successPayment: new Money(50000),
    partialPayment: new Money(25000),
    failurePayment: new Money(0),
    salvagePercent: 50,
    transportPayment: new Money(0),
    supportPayment: new Money(0),
  },
  salvageRights: 'Integrated',
  commandRights: 'Independent',
  moraleLevel,
});

// =============================================================================
// BASE_BATTLE_CHANCE Tests
// =============================================================================

describe('BASE_BATTLE_CHANCE', () => {
  it('should have 7 combat roles defined', () => {
    expect(Object.keys(BASE_BATTLE_CHANCE)).toHaveLength(7);
  });

  it('should have Maneuver role with 40% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.MANEUVER]).toBe(40);
  });

  it('should have Frontline role with 20% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.FRONTLINE]).toBe(20);
  });

  it('should have Patrol role with 60% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.PATROL]).toBe(60);
  });

  it('should have Training role with 10% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.TRAINING]).toBe(10);
  });

  it('should have Cadre role with 10% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.CADRE]).toBe(10);
  });

  it('should have Auxiliary role with 0% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.AUXILIARY]).toBe(0);
  });

  it('should have Reserve role with 0% chance', () => {
    expect(BASE_BATTLE_CHANCE[CombatRole.RESERVE]).toBe(0);
  });

  it('should have all values in 0-100 range', () => {
    Object.values(BASE_BATTLE_CHANCE).forEach((chance) => {
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(100);
    });
  });
});

// =============================================================================
// calculateBattleTypeMod Tests
// =============================================================================

describe('calculateBattleTypeMod', () => {
  it('should return 1 for STALEMATE morale', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.STALEMATE);
    expect(mod).toBe(1);
  });

  it('should return -4 for ADVANCING morale (+1 from STALEMATE)', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.ADVANCING);
    expect(mod).toBe(-4);
  });

  it('should return -9 for DOMINATING morale (+2 from STALEMATE)', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.DOMINATING);
    expect(mod).toBe(-9);
  });

  it('should return -14 for OVERWHELMING morale (+3 from STALEMATE)', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.OVERWHELMING);
    expect(mod).toBe(-14);
  });

  it('should return 6 for WEAKENED morale (-1 from STALEMATE)', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.WEAKENED);
    expect(mod).toBe(6);
  });

  it('should return 11 for CRITICAL morale (-2 from STALEMATE)', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.CRITICAL);
    expect(mod).toBe(11);
  });

  it('should return 16 for ROUTED morale (-3 from STALEMATE)', () => {
    const mod = calculateBattleTypeMod(AtBMoraleLevel.ROUTED);
    expect(mod).toBe(16);
  });

  it('should follow formula: 1 + (STALEMATE.ordinal - current.ordinal) * 5', () => {
    // Test all morale levels follow the formula
    const moraleOrder = [
      AtBMoraleLevel.ROUTED,
      AtBMoraleLevel.CRITICAL,
      AtBMoraleLevel.WEAKENED,
      AtBMoraleLevel.STALEMATE,
      AtBMoraleLevel.ADVANCING,
      AtBMoraleLevel.DOMINATING,
      AtBMoraleLevel.OVERWHELMING,
    ];

    const stalemateIndex = 3; // STALEMATE is at index 3

    moraleOrder.forEach((morale, index) => {
      const expected = 1 + (stalemateIndex - index) * 5;
      const actual = calculateBattleTypeMod(morale);
      expect(actual).toBe(expected);
    });
  });
});

// =============================================================================
// checkForBattle Tests
// =============================================================================

describe('checkForBattle', () => {
  describe('Maneuver role (40% chance)', () => {
    it('should return true when roll is within 40% (roll 0.39)', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const random = seededRandom(0.39);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(true);
    });

    it('should return false at exactly 40% boundary (roll 0.40)', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const random = seededRandom(0.40);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(false);
    });

    it('should return false when roll exceeds 40% (roll 0.41)', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const random = seededRandom(0.41);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(false);
    });

    it('should return true at 0% (roll 0.0)', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const random = seededRandom(0.0);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(true);
    });
  });

  describe('Patrol role (60% chance)', () => {
    it('should return true when roll is within 60% (roll 0.59)', () => {
      const team = createMockTeam(CombatRole.PATROL);
      const contract = createMockContract();
      const random = seededRandom(0.59);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(true);
    });

    it('should return false when roll exceeds 60% (roll 0.61)', () => {
      const team = createMockTeam(CombatRole.PATROL);
      const contract = createMockContract();
      const random = seededRandom(0.61);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(false);
    });
  });

  describe('Frontline role (20% chance)', () => {
    it('should return true when roll is within 20% (roll 0.19)', () => {
      const team = createMockTeam(CombatRole.FRONTLINE);
      const contract = createMockContract();
      const random = seededRandom(0.19);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(true);
    });

    it('should return false when roll exceeds 20% (roll 0.21)', () => {
      const team = createMockTeam(CombatRole.FRONTLINE);
      const contract = createMockContract();
      const random = seededRandom(0.21);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(false);
    });
  });

  describe('Training role (10% chance)', () => {
    it('should return true when roll is within 10% (roll 0.09)', () => {
      const team = createMockTeam(CombatRole.TRAINING);
      const contract = createMockContract();
      const random = seededRandom(0.09);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(true);
    });

    it('should return false when roll exceeds 10% (roll 0.11)', () => {
      const team = createMockTeam(CombatRole.TRAINING);
      const contract = createMockContract();
      const random = seededRandom(0.11);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(false);
    });
  });

  describe('Cadre role (10% chance)', () => {
    it('should return true when roll is within 10% (roll 0.09)', () => {
      const team = createMockTeam(CombatRole.CADRE);
      const contract = createMockContract();
      const random = seededRandom(0.09);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(true);
    });

    it('should return false when roll exceeds 10% (roll 0.11)', () => {
      const team = createMockTeam(CombatRole.CADRE);
      const contract = createMockContract();
      const random = seededRandom(0.11);

      const result = checkForBattle(team, contract, random);
      expect(result).toBe(false);
    });
  });

  describe('Auxiliary role (0% chance)', () => {
    it('should always return false regardless of roll', () => {
      const team = createMockTeam(CombatRole.AUXILIARY);
      const contract = createMockContract();

      expect(checkForBattle(team, contract, seededRandom(0.0))).toBe(false);
      expect(checkForBattle(team, contract, seededRandom(0.5))).toBe(false);
      expect(checkForBattle(team, contract, seededRandom(1.0))).toBe(false);
    });
  });

  describe('Reserve role (0% chance)', () => {
    it('should always return false regardless of roll', () => {
      const team = createMockTeam(CombatRole.RESERVE);
      const contract = createMockContract();

      expect(checkForBattle(team, contract, seededRandom(0.0))).toBe(false);
      expect(checkForBattle(team, contract, seededRandom(0.5))).toBe(false);
      expect(checkForBattle(team, contract, seededRandom(1.0))).toBe(false);
    });
  });

  describe('Deterministic behavior with seeded random', () => {
    it('should produce consistent results with same seed', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const seed = 0.35;

      const result1 = checkForBattle(team, contract, seededRandom(seed));
      const result2 = checkForBattle(team, contract, seededRandom(seed));

      expect(result1).toBe(result2);
    });

    it('should work with all morale levels', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const moraleValues = Object.values(AtBMoraleLevel);

      moraleValues.forEach((morale) => {
        const contract = createMockContract(morale);
        const random = seededRandom(0.35);

        // Should not throw and should return boolean
        const result = checkForBattle(team, contract, random);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle random value of 0.0 (minimum)', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const result = checkForBattle(team, contract, seededRandom(0.0));

      expect(typeof result).toBe('boolean');
    });

    it('should handle random value of 0.99 (near maximum)', () => {
      const team = createMockTeam(CombatRole.MANEUVER);
      const contract = createMockContract();
      const result = checkForBattle(team, contract, seededRandom(0.99));

      expect(typeof result).toBe('boolean');
    });

    it('should handle all 7 combat roles', () => {
      const roles = Object.values(CombatRole);
      const contract = createMockContract();
      const random = seededRandom(0.5);

      roles.forEach((role) => {
        const team = createMockTeam(role);
        const result = checkForBattle(team, contract, random);
        expect(typeof result).toBe('boolean');
      });
    });
  });
});
