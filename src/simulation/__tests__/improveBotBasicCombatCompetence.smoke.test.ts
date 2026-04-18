/**
 * Per-change smoke test for improve-bot-basic-combat-competence.
 *
 * Asserts:
 * - DEFAULT_BEHAVIOR carries safeHeatThreshold (default 13)
 * - scoreTarget produces threat × killProbability (higher gunnery = lower threat;
 *   farther target = lower kill probability)
 * - selectTarget(attacker) picks the highest-scored target (deterministic;
 *   not uniform random anymore)
 * - applyHeatBudget drops the lowest damage-per-heat weapon when projected
 *   heat exceeds the safe threshold
 *
 * @spec openspec/changes/improve-bot-basic-combat-competence/tasks.md § 1, § 2, § 5
 */

import { describe, it, expect } from '@jest/globals';

import {
  AttackAI,
  applyHeatBudget,
  scoreTarget,
} from '@/simulation/ai/AttackAI';
import {
  DEFAULT_BEHAVIOR,
  type IAIUnitState,
  type IWeapon,
} from '@/simulation/ai/types';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Facing, MovementType } from '@/types/gameplay';

function makeWeapon(
  id: string,
  damage: number,
  heat: number,
  longRange = 9,
): IWeapon {
  return {
    id,
    name: id,
    damage,
    heat,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange,
    ammoPerTon: 0,
    destroyed: false,
  };
}

function makeUnit(
  unitId: string,
  pos: { q: number; r: number },
  weapons: IWeapon[],
  gunnery = 4,
): IAIUnitState {
  return {
    unitId,
    position: pos,
    facing: Facing.North,
    heat: 0,
    weapons,
    ammo: {},
    destroyed: false,
    gunnery,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
  };
}

describe('improve-bot-basic-combat-competence — smoke test', () => {
  describe('DEFAULT_BEHAVIOR (task 1.1)', () => {
    it('carries safeHeatThreshold = 13', () => {
      expect(DEFAULT_BEHAVIOR.safeHeatThreshold).toBe(13);
    });
  });

  describe('scoreTarget (task 2)', () => {
    it('returns 0 for destroyed targets', () => {
      const attacker = makeUnit('a', { q: 0, r: 0 }, [makeWeapon('w', 5, 3)]);
      const dead: IAIUnitState = {
        ...makeUnit('d', { q: 0, r: 1 }, [makeWeapon('w', 5, 3)]),
        destroyed: true,
      };
      expect(scoreTarget(attacker, dead)).toBe(0);
    });

    it('returns 0 for self', () => {
      const a = makeUnit('a', { q: 0, r: 0 }, [makeWeapon('w', 5, 3)]);
      expect(scoreTarget(a, a)).toBe(0);
    });

    it('higher-damage target scores higher than lower-damage target at same range', () => {
      const attacker = makeUnit('attacker', { q: 0, r: 0 }, [
        makeWeapon('mlaser', 5, 3),
      ]);
      const heavyHitter = makeUnit('heavy', { q: 0, r: 1 }, [
        makeWeapon('ppc', 10, 10),
        makeWeapon('ac20', 20, 7),
      ]);
      const lightHitter = makeUnit('light', { q: 0, r: 1 }, [
        makeWeapon('mg', 2, 0),
      ]);
      expect(scoreTarget(attacker, heavyHitter)).toBeGreaterThan(
        scoreTarget(attacker, lightHitter),
      );
    });

    it('closer target scores higher than far target at equal damage', () => {
      const attacker = makeUnit('attacker', { q: 0, r: 0 }, [
        makeWeapon('lrm', 5, 5, 21),
      ]);
      const close = makeUnit('close', { q: 0, r: 2 }, [makeWeapon('w', 5, 3)]);
      const far = makeUnit('far', { q: 0, r: 15 }, [makeWeapon('w', 5, 3)]);
      // Close target has lower TN range modifier → higher killProbability
      // → higher score, with threat held equal.
      expect(scoreTarget(attacker, close)).toBeGreaterThan(
        scoreTarget(attacker, far),
      );
    });
  });

  describe('AttackAI.selectTarget with attacker (task 2.5)', () => {
    it('picks the highest-scored target deterministically when scores differ', () => {
      const ai = new AttackAI();
      const attacker = makeUnit('a', { q: 0, r: 0 }, [
        makeWeapon('mlaser', 5, 3),
      ]);
      const big = makeUnit('big', { q: 0, r: 1 }, [
        makeWeapon('ac20', 20, 7),
        makeWeapon('ppc', 10, 10),
      ]);
      const small = makeUnit('small', { q: 0, r: 1 }, [makeWeapon('sl', 3, 1)]);
      const random = new SeededRandom(1);
      const target = ai.selectTarget([small, big], random, attacker);
      expect(target?.unitId).toBe('big');
    });

    it('falls back to uniform-random pick when attacker is omitted', () => {
      const ai = new AttackAI();
      const t1 = makeUnit('t1', { q: 0, r: 1 }, [makeWeapon('w', 5, 3)]);
      const t2 = makeUnit('t2', { q: 0, r: 2 }, [makeWeapon('w', 5, 3)]);
      const random = new SeededRandom(42);
      const target = ai.selectTarget([t1, t2], random);
      expect(target).toBeDefined();
      expect(['t1', 't2']).toContain(target!.unitId);
    });

    it('returns null when target list is empty', () => {
      const ai = new AttackAI();
      const random = new SeededRandom(1);
      expect(ai.selectTarget([], random)).toBeNull();
    });
  });

  describe('applyHeatBudget (task 5)', () => {
    it('keeps full list when projected heat fits under threshold', () => {
      const weapons = [makeWeapon('mlaser', 5, 3), makeWeapon('sl', 3, 1)];
      const result = applyHeatBudget(weapons, 0, 0, 13);
      expect(result.map((w) => w.id)).toEqual(['mlaser', 'sl']);
    });

    it('drops lowest damage-per-heat weapon when projected exceeds threshold', () => {
      // PPC: 10/10 = 1.0 efficiency
      // Medium Laser: 5/3 = 1.67 efficiency
      // Small Laser: 3/1 = 3.0 efficiency
      // Total heat 14 + currentHeat 0 = 14 > 13. Drop PPC (worst).
      const weapons = [
        makeWeapon('ppc', 10, 10),
        makeWeapon('mlaser', 5, 3),
        makeWeapon('sl', 3, 1),
      ];
      const result = applyHeatBudget(weapons, 0, 0, 13);
      expect(result.map((w) => w.id)).toEqual(['mlaser', 'sl']);
    });

    it('drops multiple weapons until under threshold', () => {
      // currentHeat=10, weapons sum to 14, threshold=13 → projected 24
      // Drop PPC (10/10=1.0) → 14, still over. Drop ML (5/3=1.67) → 11. OK.
      const weapons = [
        makeWeapon('ppc', 10, 10),
        makeWeapon('mlaser', 5, 3),
        makeWeapon('sl', 3, 1),
      ];
      const result = applyHeatBudget(weapons, 10, 0, 13);
      expect(result.map((w) => w.id)).toEqual(['sl']);
    });

    it('drops everything when even the lightest weapon overflows', () => {
      const weapons = [makeWeapon('mlaser', 5, 3)];
      const result = applyHeatBudget(weapons, 50, 5, 13);
      expect(result).toEqual([]);
    });
  });
});
