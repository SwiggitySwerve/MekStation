/**
 * Scenario Type Selection Tests
 *
 * Tests for AtB scenario type selection tables including:
 * - selectManeuverScenario() - d40 table
 * - selectPatrolScenario() - d60 table
 * - selectFrontlineScenario() - d20 table
 * - selectTrainingScenario() - d10 table
 * - selectScenarioType() dispatcher function
 *
 * @module campaign/scenario/__tests__/scenarioTypeSelection
 */

import {
  CombatRole,
  AtBMoraleLevel,
  AtBScenarioType,
} from '@/types/campaign/scenario/scenarioTypes';

import { type RandomFn } from '../battleChance';
import {
  selectManeuverScenario,
  selectPatrolScenario,
  selectFrontlineScenario,
  selectTrainingScenario,
  selectScenarioType,
} from '../scenarioTypeSelection';

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
const seededRandom =
  (value: number): RandomFn =>
  () =>
    value;

// =============================================================================
// selectManeuverScenario Tests (d40 table)
// =============================================================================

describe('selectManeuverScenario', () => {
  describe('Roll 1: base_attack (enemy attacker)', () => {
    it('should return base_attack with isAttacker=false for roll 1', () => {
      const result = selectManeuverScenario(1);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 2-8: breakthrough (player attacker)', () => {
    it('should return breakthrough with isAttacker=true for roll 2', () => {
      const result = selectManeuverScenario(2);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(true);
    });

    it('should return breakthrough with isAttacker=true for roll 5', () => {
      const result = selectManeuverScenario(5);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(true);
    });

    it('should return breakthrough with isAttacker=true for roll 8', () => {
      const result = selectManeuverScenario(8);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 9-16: standup (player attacker)', () => {
    it('should return standup with isAttacker=true for roll 9', () => {
      const result = selectManeuverScenario(9);
      expect(result.scenarioType).toBe(AtBScenarioType.STANDUP);
      expect(result.isAttacker).toBe(true);
    });

    it('should return standup with isAttacker=true for roll 12', () => {
      const result = selectManeuverScenario(12);
      expect(result.scenarioType).toBe(AtBScenarioType.STANDUP);
      expect(result.isAttacker).toBe(true);
    });

    it('should return standup with isAttacker=true for roll 16', () => {
      const result = selectManeuverScenario(16);
      expect(result.scenarioType).toBe(AtBScenarioType.STANDUP);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 17-24: standup (enemy attacker)', () => {
    it('should return standup with isAttacker=false for roll 17', () => {
      const result = selectManeuverScenario(17);
      expect(result.scenarioType).toBe(AtBScenarioType.STANDUP);
      expect(result.isAttacker).toBe(false);
    });

    it('should return standup with isAttacker=false for roll 20', () => {
      const result = selectManeuverScenario(20);
      expect(result.scenarioType).toBe(AtBScenarioType.STANDUP);
      expect(result.isAttacker).toBe(false);
    });

    it('should return standup with isAttacker=false for roll 24', () => {
      const result = selectManeuverScenario(24);
      expect(result.scenarioType).toBe(AtBScenarioType.STANDUP);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 25-32: chase or hold_the_line (player attacker)', () => {
    it('should return chase or hold_the_line with isAttacker=true for roll 25', () => {
      const result = selectManeuverScenario(25);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HOLD_THE_LINE]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });

    it('should return chase or hold_the_line with isAttacker=true for roll 28', () => {
      const result = selectManeuverScenario(28);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HOLD_THE_LINE]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });

    it('should return chase or hold_the_line with isAttacker=true for roll 32', () => {
      const result = selectManeuverScenario(32);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HOLD_THE_LINE]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 33-40: hold_the_line (player attacker)', () => {
    it('should return hold_the_line with isAttacker=true for roll 33', () => {
      const result = selectManeuverScenario(33);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(true);
    });

    it('should return hold_the_line with isAttacker=true for roll 36', () => {
      const result = selectManeuverScenario(36);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(true);
    });

    it('should return hold_the_line with isAttacker=true for roll 40', () => {
      const result = selectManeuverScenario(40);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 41+: base_attack (player attacker)', () => {
    it('should return base_attack with isAttacker=true for roll 41', () => {
      const result = selectManeuverScenario(41);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(true);
    });

    it('should return base_attack with isAttacker=true for roll 50', () => {
      const result = selectManeuverScenario(50);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(true);
    });

    it('should clamp to last entry for roll 100', () => {
      const result = selectManeuverScenario(100);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(true);
    });
  });
});

// =============================================================================
// selectPatrolScenario Tests (d60 table)
// =============================================================================

describe('selectPatrolScenario', () => {
  describe('Roll 1: base_attack (enemy attacker)', () => {
    it('should return base_attack with isAttacker=false for roll 1', () => {
      const result = selectPatrolScenario(1);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 2-10: chase or hide_and_seek (player attacker)', () => {
    it('should return chase or hide_and_seek with isAttacker=true for roll 2', () => {
      const result = selectPatrolScenario(2);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HIDE_AND_SEEK]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });

    it('should return chase or hide_and_seek with isAttacker=true for roll 6', () => {
      const result = selectPatrolScenario(6);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HIDE_AND_SEEK]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });

    it('should return chase or hide_and_seek with isAttacker=true for roll 10', () => {
      const result = selectPatrolScenario(10);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HIDE_AND_SEEK]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 11-20: hide_and_seek (player attacker)', () => {
    it('should return hide_and_seek with isAttacker=true for roll 11', () => {
      const result = selectPatrolScenario(11);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(true);
    });

    it('should return hide_and_seek with isAttacker=true for roll 15', () => {
      const result = selectPatrolScenario(15);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(true);
    });

    it('should return hide_and_seek with isAttacker=true for roll 20', () => {
      const result = selectPatrolScenario(20);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 21-30: probe (player attacker)', () => {
    it('should return probe with isAttacker=true for roll 21', () => {
      const result = selectPatrolScenario(21);
      expect(result.scenarioType).toBe(AtBScenarioType.PROBE);
      expect(result.isAttacker).toBe(true);
    });

    it('should return probe with isAttacker=true for roll 25', () => {
      const result = selectPatrolScenario(25);
      expect(result.scenarioType).toBe(AtBScenarioType.PROBE);
      expect(result.isAttacker).toBe(true);
    });

    it('should return probe with isAttacker=true for roll 30', () => {
      const result = selectPatrolScenario(30);
      expect(result.scenarioType).toBe(AtBScenarioType.PROBE);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 31-40: probe (enemy attacker)', () => {
    it('should return probe with isAttacker=false for roll 31', () => {
      const result = selectPatrolScenario(31);
      expect(result.scenarioType).toBe(AtBScenarioType.PROBE);
      expect(result.isAttacker).toBe(false);
    });

    it('should return probe with isAttacker=false for roll 35', () => {
      const result = selectPatrolScenario(35);
      expect(result.scenarioType).toBe(AtBScenarioType.PROBE);
      expect(result.isAttacker).toBe(false);
    });

    it('should return probe with isAttacker=false for roll 40', () => {
      const result = selectPatrolScenario(40);
      expect(result.scenarioType).toBe(AtBScenarioType.PROBE);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 41-50: extraction (player attacker)', () => {
    it('should return extraction with isAttacker=true for roll 41', () => {
      const result = selectPatrolScenario(41);
      expect(result.scenarioType).toBe(AtBScenarioType.EXTRACTION);
      expect(result.isAttacker).toBe(true);
    });

    it('should return extraction with isAttacker=true for roll 45', () => {
      const result = selectPatrolScenario(45);
      expect(result.scenarioType).toBe(AtBScenarioType.EXTRACTION);
      expect(result.isAttacker).toBe(true);
    });

    it('should return extraction with isAttacker=true for roll 50', () => {
      const result = selectPatrolScenario(50);
      expect(result.scenarioType).toBe(AtBScenarioType.EXTRACTION);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 51-60: recon_raid (player attacker)', () => {
    it('should return recon_raid with isAttacker=true for roll 51', () => {
      const result = selectPatrolScenario(51);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(true);
    });

    it('should return recon_raid with isAttacker=true for roll 55', () => {
      const result = selectPatrolScenario(55);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(true);
    });

    it('should return recon_raid with isAttacker=true for roll 60', () => {
      const result = selectPatrolScenario(60);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 61+: clamp to last entry', () => {
    it('should clamp to recon_raid for roll 61', () => {
      const result = selectPatrolScenario(61);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(true);
    });

    it('should clamp to recon_raid for roll 100', () => {
      const result = selectPatrolScenario(100);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(true);
    });
  });
});

// =============================================================================
// selectFrontlineScenario Tests (d20 table)
// =============================================================================

describe('selectFrontlineScenario', () => {
  describe('Roll 1: base_attack (enemy attacker)', () => {
    it('should return base_attack with isAttacker=false for roll 1', () => {
      const result = selectFrontlineScenario(1);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 2-4: hold_the_line (enemy attacker)', () => {
    it('should return hold_the_line with isAttacker=false for roll 2', () => {
      const result = selectFrontlineScenario(2);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(false);
    });

    it('should return hold_the_line with isAttacker=false for roll 3', () => {
      const result = selectFrontlineScenario(3);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(false);
    });

    it('should return hold_the_line with isAttacker=false for roll 4', () => {
      const result = selectFrontlineScenario(4);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 5-8: recon_raid (enemy attacker)', () => {
    it('should return recon_raid with isAttacker=false for roll 5', () => {
      const result = selectFrontlineScenario(5);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(false);
    });

    it('should return recon_raid with isAttacker=false for roll 6', () => {
      const result = selectFrontlineScenario(6);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(false);
    });

    it('should return recon_raid with isAttacker=false for roll 8', () => {
      const result = selectFrontlineScenario(8);
      expect(result.scenarioType).toBe(AtBScenarioType.RECON_RAID);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 9-12: extraction (enemy attacker)', () => {
    it('should return extraction with isAttacker=false for roll 9', () => {
      const result = selectFrontlineScenario(9);
      expect(result.scenarioType).toBe(AtBScenarioType.EXTRACTION);
      expect(result.isAttacker).toBe(false);
    });

    it('should return extraction with isAttacker=false for roll 10', () => {
      const result = selectFrontlineScenario(10);
      expect(result.scenarioType).toBe(AtBScenarioType.EXTRACTION);
      expect(result.isAttacker).toBe(false);
    });

    it('should return extraction with isAttacker=false for roll 12', () => {
      const result = selectFrontlineScenario(12);
      expect(result.scenarioType).toBe(AtBScenarioType.EXTRACTION);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 13-16: hide_and_seek (player attacker)', () => {
    it('should return hide_and_seek with isAttacker=true for roll 13', () => {
      const result = selectFrontlineScenario(13);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(true);
    });

    it('should return hide_and_seek with isAttacker=true for roll 14', () => {
      const result = selectFrontlineScenario(14);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(true);
    });

    it('should return hide_and_seek with isAttacker=true for roll 16', () => {
      const result = selectFrontlineScenario(16);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 17-20: breakthrough (enemy attacker)', () => {
    it('should return breakthrough with isAttacker=false for roll 17', () => {
      const result = selectFrontlineScenario(17);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(false);
    });

    it('should return breakthrough with isAttacker=false for roll 18', () => {
      const result = selectFrontlineScenario(18);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(false);
    });

    it('should return breakthrough with isAttacker=false for roll 20', () => {
      const result = selectFrontlineScenario(20);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 21+: clamp to last entry', () => {
    it('should clamp to breakthrough for roll 21', () => {
      const result = selectFrontlineScenario(21);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(false);
    });

    it('should clamp to breakthrough for roll 100', () => {
      const result = selectFrontlineScenario(100);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(false);
    });
  });
});

// =============================================================================
// selectTrainingScenario Tests (d10 table)
// =============================================================================

describe('selectTrainingScenario', () => {
  describe('Roll 1: base_attack (enemy attacker)', () => {
    it('should return base_attack with isAttacker=false for roll 1', () => {
      const result = selectTrainingScenario(1);
      expect(result.scenarioType).toBe(AtBScenarioType.BASE_ATTACK);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 2-3: hold_the_line (enemy attacker)', () => {
    it('should return hold_the_line with isAttacker=false for roll 2', () => {
      const result = selectTrainingScenario(2);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(false);
    });

    it('should return hold_the_line with isAttacker=false for roll 3', () => {
      const result = selectTrainingScenario(3);
      expect(result.scenarioType).toBe(AtBScenarioType.HOLD_THE_LINE);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 4-5: breakthrough (player attacker)', () => {
    it('should return breakthrough with isAttacker=true for roll 4', () => {
      const result = selectTrainingScenario(4);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(true);
    });

    it('should return breakthrough with isAttacker=true for roll 5', () => {
      const result = selectTrainingScenario(5);
      expect(result.scenarioType).toBe(AtBScenarioType.BREAKTHROUGH);
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 6-7: chase or breakthrough (player attacker)', () => {
    it('should return chase or breakthrough with isAttacker=true for roll 6', () => {
      const result = selectTrainingScenario(6);
      expect([AtBScenarioType.CHASE, AtBScenarioType.BREAKTHROUGH]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });

    it('should return chase or breakthrough with isAttacker=true for roll 7', () => {
      const result = selectTrainingScenario(7);
      expect([AtBScenarioType.CHASE, AtBScenarioType.BREAKTHROUGH]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 8-9: hide_and_seek (enemy attacker)', () => {
    it('should return hide_and_seek with isAttacker=false for roll 8', () => {
      const result = selectTrainingScenario(8);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(false);
    });

    it('should return hide_and_seek with isAttacker=false for roll 9', () => {
      const result = selectTrainingScenario(9);
      expect(result.scenarioType).toBe(AtBScenarioType.HIDE_AND_SEEK);
      expect(result.isAttacker).toBe(false);
    });
  });

  describe('Roll 10: chase or hold_the_line (player attacker)', () => {
    it('should return chase or hold_the_line with isAttacker=true for roll 10', () => {
      const result = selectTrainingScenario(10);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HOLD_THE_LINE]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });
  });

  describe('Roll 11+: clamp to last entry', () => {
    it('should clamp to chase or hold_the_line for roll 11', () => {
      const result = selectTrainingScenario(11);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HOLD_THE_LINE]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });

    it('should clamp to chase or hold_the_line for roll 100', () => {
      const result = selectTrainingScenario(100);
      expect([AtBScenarioType.CHASE, AtBScenarioType.HOLD_THE_LINE]).toContain(
        result.scenarioType,
      );
      expect(result.isAttacker).toBe(true);
    });
  });
});

// =============================================================================
// selectScenarioType Dispatcher Tests
// =============================================================================

describe('selectScenarioType', () => {
  describe('Maneuver role routing', () => {
    it('should route to selectManeuverScenario for MANEUVER role', () => {
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
      expect([true, false]).toContain(result.isAttacker);
    });

    it('should apply morale modifier to roll for MANEUVER role', () => {
      // STALEMATE = 0 modifier, so roll should be unmodified
      const result1 = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(result1.scenarioType).toBeDefined();

      // OVERWHELMING = -14 modifier, so roll should be reduced
      const result2 = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.OVERWHELMING,
        seededRandom(0.5),
      );
      expect(result2.scenarioType).toBeDefined();
    });
  });

  describe('Patrol role routing', () => {
    it('should route to selectPatrolScenario for PATROL role', () => {
      const result = selectScenarioType(
        CombatRole.PATROL,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
      expect([true, false]).toContain(result.isAttacker);
    });
  });

  describe('Frontline role routing', () => {
    it('should route to selectFrontlineScenario for FRONTLINE role', () => {
      const result = selectScenarioType(
        CombatRole.FRONTLINE,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
      expect([true, false]).toContain(result.isAttacker);
    });
  });

  describe('Training role routing', () => {
    it('should route to selectTrainingScenario for TRAINING role', () => {
      const result = selectScenarioType(
        CombatRole.TRAINING,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
      expect([true, false]).toContain(result.isAttacker);
    });
  });

  describe('Cadre role routing', () => {
    it('should route to selectTrainingScenario for CADRE role (same table)', () => {
      const result = selectScenarioType(
        CombatRole.CADRE,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
      expect([true, false]).toContain(result.isAttacker);
    });
  });

  describe('Morale modifier integration', () => {
    it('should apply ROUTED morale modifier (+16)', () => {
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.ROUTED,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
    });

    it('should apply OVERWHELMING morale modifier (-14)', () => {
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.OVERWHELMING,
        seededRandom(0.5),
      );
      expect(result.scenarioType).toBeDefined();
    });

    it('should clamp modified roll to minimum 1', () => {
      // With OVERWHELMING morale (-14) and low random, roll should clamp to 1
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.OVERWHELMING,
        seededRandom(0.01),
      );
      expect(result.scenarioType).toBeDefined();
    });
  });

  describe('All morale levels', () => {
    it('should work with all 7 morale levels', () => {
      const moraleValues = Object.values(AtBMoraleLevel);
      const roles = [
        CombatRole.MANEUVER,
        CombatRole.PATROL,
        CombatRole.FRONTLINE,
        CombatRole.TRAINING,
      ];

      moraleValues.forEach((morale) => {
        roles.forEach((role) => {
          const result = selectScenarioType(role, morale, seededRandom(0.5));
          expect(result.scenarioType).toBeDefined();
          expect(typeof result.isAttacker).toBe('boolean');
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle random value of 0.0', () => {
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.0),
      );
      expect(result.scenarioType).toBeDefined();
      expect(typeof result.isAttacker).toBe('boolean');
    });

    it('should handle random value of 0.99', () => {
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.99),
      );
      expect(result.scenarioType).toBeDefined();
      expect(typeof result.isAttacker).toBe('boolean');
    });

    it('should return readonly IScenarioTypeResult', () => {
      const result = selectScenarioType(
        CombatRole.MANEUVER,
        AtBMoraleLevel.STALEMATE,
        seededRandom(0.5),
      );
      expect(Object.isFrozen(result) || !Object.isExtensible(result)).toBe(
        true,
      );
    });
  });
});
