/**
 * Task 1.8 — Threat-score delta: gunnery-2 attacker vs gunnery-5 attacker.
 *
 * Spec contract: simulation-system/spec.md
 *   MODIFIED Requirement: "Pilot Skills Drive AI Decisions"
 *   Scenario: "AI threat scoring uses real gunnery"
 *
 * GIVEN two IAIUnitState snapshots, identical except gunnery: 2 vs gunnery: 5
 * WHEN scoreTarget is called for both attackers against the same target
 * THEN the score for gunnery: 2 SHALL exceed the score for gunnery: 5
 * AND the delta SHALL exceed any noise floor introduced by tie-breaking
 *
 * The formula in AttackAI.scoreTarget uses attacker.gunnery in the kill-probability
 * term: tn = attacker.gunnery + rangeMod; killProbability = clamp01(1 - tn/12).
 * Lower gunnery (better skill) → lower tn → higher kill probability → higher score.
 */

import { Facing, MovementType } from '@/types/gameplay';

import type { IAIUnitState, IWeapon } from '../ai/types';

import { scoreTarget } from '../ai/AttackAI';

// Minimal weapon fixture — medium laser stats that guarantee in-range scoring.
const MEDIUM_LASER: IWeapon = {
  id: 'ml-1',
  name: 'Medium Laser',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 5,
  heat: 3,
  minRange: 0,
  ammoPerTon: -1,
  destroyed: false,
};

// Shared target: a healthy unit with a loaded medium laser at distance 3.
const TARGET: IAIUnitState = {
  unitId: 'target-1',
  position: { q: 0, r: 2 }, // 2 hexes north of attacker (within shortRange)
  facing: Facing.North,
  heat: 0,
  weapons: [MEDIUM_LASER],
  ammo: {},
  destroyed: false,
  gunnery: 4, // target's gunnery affects the "threat" term (target as threat)
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  remainingHpFraction: 1.0,
};

// Attacker base fixture — all fields identical except gunnery.
const BASE_ATTACKER: Omit<IAIUnitState, 'gunnery' | 'unitId'> = {
  position: { q: 0, r: 0 },
  facing: Facing.North,
  heat: 0,
  weapons: [MEDIUM_LASER],
  ammo: {},
  destroyed: false,
  movementType: MovementType.Stationary,
  hexesMoved: 0,
};

describe('AttackAI threat scoring uses real gunnery (Task 1.8)', () => {
  /**
   * Scenario: AI threat scoring uses real gunnery
   * Lower gunnery number = better skill = lower to-hit number =
   * higher kill probability = higher scoreTarget result.
   */
  it('should produce a higher score for gunnery-2 attacker than gunnery-5 attacker against the same target', () => {
    const attacker2: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g2',
      gunnery: 2, // skilled pilot
    };
    const attacker5: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g5',
      gunnery: 5, // green pilot
    };

    const score2 = scoreTarget(attacker2, TARGET);
    const score5 = scoreTarget(attacker5, TARGET);

    // Skilled pilot (gunnery 2) MUST score strictly higher than green pilot (gunnery 5).
    // The delta must exceed 0 — the formula is deterministic with no noise floor here.
    expect(score2).toBeGreaterThan(score5);
  });

  it('should produce a score delta of at least 0.25 (non-trivial difference)', () => {
    const attacker2: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g2',
      gunnery: 2,
    };
    const attacker5: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g5',
      gunnery: 5,
    };

    const score2 = scoreTarget(attacker2, TARGET);
    const score5 = scoreTarget(attacker5, TARGET);
    const delta = score2 - score5;

    // Assert meaningful numeric delta — not just floating-point epsilon noise.
    // With threat=1.25 (5dmg/gunnery4) and distance=2 (shortRange, rangeMod=0):
    //   score2 = 1.25 * (1 - 2/12) ≈ 1.042
    //   score5 = 1.25 * (1 - 5/12) ≈ 0.729
    //   delta ≈ 0.3125 — well above any epsilon noise.
    expect(delta).toBeGreaterThanOrEqual(0.25);
  });

  it('should produce a score of 0 for a destroyed target regardless of attacker gunnery', () => {
    // Regression: scoreTarget returns 0 for destroyed targets — this must hold
    // for both gunnery values so the delta-assertion tests the live-target path.
    const destroyedTarget: IAIUnitState = { ...TARGET, destroyed: true };
    const attacker: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g2',
      gunnery: 2,
    };
    expect(scoreTarget(attacker, destroyedTarget)).toBe(0);
  });

  it('should produce a score of 0 when the attacker targets itself', () => {
    const selfTarget: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g2',
      gunnery: 2,
    };
    const attacker: IAIUnitState = { ...selfTarget };
    expect(scoreTarget(attacker, selfTarget)).toBe(0);
  });

  it('should produce DEFAULT_GUNNERY (4) behavior when gunnery field is the default value', () => {
    // Scenario: Default fallback for synthetic units.
    // When toAIUnitState uses DEFAULT_GUNNERY=4 as fallback, the score at gunnery=4
    // must fall between the gunnery-2 and gunnery-5 extremes.
    const attackerDefault: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-default',
      gunnery: 4, // DEFAULT_GUNNERY
    };
    const attacker2: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g2',
      gunnery: 2,
    };
    const attacker5: IAIUnitState = {
      ...BASE_ATTACKER,
      unitId: 'attacker-g5',
      gunnery: 5,
    };

    const scoreDefault = scoreTarget(attackerDefault, TARGET);
    const score2 = scoreTarget(attacker2, TARGET);
    const score5 = scoreTarget(attacker5, TARGET);

    // Default (4) must be between skilled (2) and green (5).
    expect(score2).toBeGreaterThan(scoreDefault);
    expect(scoreDefault).toBeGreaterThan(score5);
  });
});
