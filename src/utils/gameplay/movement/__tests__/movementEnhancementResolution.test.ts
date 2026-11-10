/**
 * Resolving MASC / Supercharger failure checks (C-1c PR 1).
 *
 * MegaMek 48fcb2f64: the check is 2d6 and fails when `roll < target`; a
 * Supercharger on an Industrial Mek rolls with -1 (`Entity.java` L16526-L16541).
 * A failure rolls the hits table, but only the Supercharger uses it (engine
 * hits); MASC puts one slot per leg in the crit list whatever the roll
 * (`Entity.java` L16570-L16580, L16630-L16631; `TWRulesEquipment.java`
 * L259-L285, L299-L310). Edge rerolls once (`TWGameManager.java` L6568-L6678).
 * MASC is checked first and the Supercharger check is skipped after a MASC
 * failure (`MovePathHandler.java` L2467-L2468).
 *
 * @spec openspec/changes/close-combat-psr-parity-gaps/specs/piloting-skill-rolls/spec.md
 */

import type { D6Roller } from '@/utils/gameplay/diceTypes';
import type { IMovementEnhancementCheck } from '@/utils/gameplay/movement/movementEnhancementPlan';

import {
  type IEdgeBudget,
  resolveMovementEnhancementCheck,
  resolveMovementEnhancementChecks,
} from '@/utils/gameplay/movement/movementEnhancementResolution';

const MASC_7: IMovementEnhancementCheck = {
  enhancement: 'MASC',
  targetNumber: 7,
  level: 2,
  rollModifier: 0,
};
const SUPERCHARGER_7: IMovementEnhancementCheck = {
  enhancement: 'Supercharger',
  targetNumber: 7,
  level: 2,
  rollModifier: 0,
};

/** A roller that returns the scripted dice in order and throws if over-drawn. */
function scripted(
  dice: readonly number[],
): D6Roller & { readonly drawn: () => number } {
  let index = 0;
  const roller = (() => {
    if (index >= dice.length) {
      throw new Error(
        `over-drew: ${index + 1} dice requested, ${dice.length} scripted`,
      );
    }
    const value = dice[index];
    index += 1;
    return value;
  }) as D6Roller & { drawn: () => number };
  roller.drawn = () => index;
  return roller;
}

const EDGE_2: IEdgeBudget = {
  abilities: ['edge_when_masc_fails'],
  pointsRemaining: 2,
  turn: 3,
  unitId: 'm1',
};

describe('resolveMovementEnhancementCheck', () => {
  describe('the roll', () => {
    it('draws exactly two dice, first die first, and passes at the target', () => {
      const roller = scripted([3, 4]);
      const result = resolveMovementEnhancementCheck({ check: MASC_7, roller });

      expect(roller.drawn()).toBe(2);
      expect(result.attempts).toEqual([
        { dice: [3, 4], roll: 7, modifiedRoll: 7, passed: true },
      ]);
      expect(result.passed).toBe(true);
      expect(result.failure).toBeUndefined();
    });

    it('fails when the roll is below the target (strictly less than)', () => {
      const result = resolveMovementEnhancementCheck({
        check: MASC_7,
        roller: scripted([3, 3, 1, 1]),
      });

      expect(result.attempts[0]).toMatchObject({ roll: 6, passed: false });
      expect(result.passed).toBe(false);
    });

    it('applies the Industrial Supercharger -1 to the roll, not the target', () => {
      const industrial = { ...SUPERCHARGER_7, rollModifier: -1 };
      const result = resolveMovementEnhancementCheck({
        check: industrial,
        roller: scripted([3, 4, 1, 1]),
      });

      expect(result.attempts[0]).toMatchObject({
        dice: [3, 4],
        roll: 7,
        modifiedRoll: 6,
        passed: false,
      });
    });

    it('requires a roller', () => {
      // @ts-expect-error a roller is mandatory: there is no ambient default.
      const call = () => resolveMovementEnhancementCheck({ check: MASC_7 });
      expect(call).toThrow();
    });
  });

  describe('failure effects', () => {
    it('MASC: one slot per leg, and no hits roll is drawn', () => {
      const roller = scripted([1, 1]);
      const result = resolveMovementEnhancementCheck({ check: MASC_7, roller });

      expect(roller.drawn()).toBe(2);
      expect(result.failure).toEqual({
        legCrits: ['left_leg', 'right_leg'],
        engineHits: 0,
        destroyEnhancement: false,
      });
    });

    it.each([
      [[1, 1], 0], // 2
      [[3, 4], 0], // 7
      [[4, 4], 1], // 8
      [[4, 5], 1], // 9
      [[5, 5], 2], // 10
      [[5, 6], 2], // 11
      [[6, 6], 3], // 12
    ])(
      'Supercharger: hits roll %j gives %i engine hits',
      (hitsDice, engineHits) => {
        const roller = scripted([1, 1, ...hitsDice]);
        const result = resolveMovementEnhancementCheck({
          check: SUPERCHARGER_7,
          roller,
        });

        expect(roller.drawn()).toBe(4);
        expect(result.failure).toEqual({
          legCrits: [],
          engineHits,
          failureHitsRoll: hitsDice[0] + hitsDice[1],
          destroyEnhancement: true,
        });
      },
    );

    it('Supercharger is destroyed even when the hits roll gives no engine damage', () => {
      const result = resolveMovementEnhancementCheck({
        check: SUPERCHARGER_7,
        roller: scripted([1, 1, 1, 2]),
      });

      expect(result.failure?.engineHits).toBe(0);
      expect(result.failure?.destroyEnhancement).toBe(true);
    });

    it('a pass draws nothing beyond the check', () => {
      const roller = scripted([6, 6]);
      resolveMovementEnhancementCheck({ check: SUPERCHARGER_7, roller });
      expect(roller.drawn()).toBe(2);
    });
  });

  describe('Edge (edge_when_masc_fails)', () => {
    it('rerolls a failure once, spends a point, and keeps the pass', () => {
      const roller = scripted([1, 1, 4, 4]);
      const result = resolveMovementEnhancementCheck({
        check: MASC_7,
        roller,
        edge: EDGE_2,
      });

      expect(roller.drawn()).toBe(4);
      expect(result.attempts).toEqual([
        {
          dice: [1, 1],
          roll: 2,
          modifiedRoll: 2,
          passed: false,
          edgeSuperseded: true,
        },
        {
          dice: [4, 4],
          roll: 8,
          modifiedRoll: 8,
          passed: true,
          edgeReroll: true,
        },
      ]);
      expect(result.passed).toBe(true);
      expect(result.failure).toBeUndefined();
      expect(result.edgePointsRemaining).toBe(1);
    });

    it('rerolls only once: a second failure stands and takes effect', () => {
      const roller = scripted([1, 1, 2, 2]);
      const result = resolveMovementEnhancementCheck({
        check: MASC_7,
        roller,
        edge: EDGE_2,
      });

      expect(roller.drawn()).toBe(4);
      expect(result.passed).toBe(false);
      expect(result.failure?.legCrits).toEqual(['left_leg', 'right_leg']);
      expect(result.edgePointsRemaining).toBe(1);
    });

    it('does not reroll without the ability or without a point', () => {
      for (const edge of [
        { ...EDGE_2, abilities: [] },
        { ...EDGE_2, pointsRemaining: 0 },
      ]) {
        const roller = scripted([1, 1]);
        const result = resolveMovementEnhancementCheck({
          check: MASC_7,
          roller,
          edge,
        });
        expect(roller.drawn()).toBe(2);
        expect(result.attempts).toHaveLength(1);
        expect(result.edgePointsRemaining).toBe(edge.pointsRemaining);
      }
    });

    it('does not spend Edge on a pass', () => {
      const result = resolveMovementEnhancementCheck({
        check: MASC_7,
        roller: scripted([6, 6]),
        edge: EDGE_2,
      });
      expect(result.edgePointsRemaining).toBe(2);
    });

    it('a Supercharger failure rolls its hits only after the final attempt', () => {
      // Edge reroll fails: 2 + 2 check dice, then the 2 hits dice.
      const roller = scripted([1, 1, 1, 2, 6, 6]);
      const result = resolveMovementEnhancementCheck({
        check: SUPERCHARGER_7,
        roller,
        edge: EDGE_2,
      });

      expect(roller.drawn()).toBe(6);
      expect(result.failure).toMatchObject({
        engineHits: 3,
        failureHitsRoll: 12,
      });
    });

    it('reports no Edge budget as undefined remaining points', () => {
      expect(
        resolveMovementEnhancementCheck({
          check: MASC_7,
          roller: scripted([6, 6]),
        }).edgePointsRemaining,
      ).toBeUndefined();
    });
  });
});

describe('resolveMovementEnhancementChecks', () => {
  it('skips the Supercharger check after a MASC failure', () => {
    const roller = scripted([1, 1]);
    const result = resolveMovementEnhancementChecks({
      checks: [MASC_7, SUPERCHARGER_7],
      roller,
    });

    expect(roller.drawn()).toBe(2);
    expect(result.resolutions.map((r) => r.check.enhancement)).toEqual([
      'MASC',
    ]);
    expect(result.passed).toBe(false);
  });

  it('checks the Supercharger after a MASC pass, in that order', () => {
    const roller = scripted([4, 4, 1, 1, 1, 1]);
    const result = resolveMovementEnhancementChecks({
      checks: [MASC_7, SUPERCHARGER_7],
      roller,
    });

    expect(roller.drawn()).toBe(6);
    expect(result.resolutions.map((r) => r.check.enhancement)).toEqual([
      'MASC',
      'Supercharger',
    ]);
    expect(result.passed).toBe(false);
  });

  it('passes when every check passes and draws four dice for two checks', () => {
    const roller = scripted([4, 4, 5, 5]);
    const result = resolveMovementEnhancementChecks({
      checks: [MASC_7, SUPERCHARGER_7],
      roller,
    });

    expect(roller.drawn()).toBe(4);
    expect(result.passed).toBe(true);
  });

  it('shares the Edge points across the checks', () => {
    // MASC fails, Edge rerolls and passes (2 -> 1); the Supercharger then
    // fails and its Edge reroll takes the last point (1 -> 0).
    const roller = scripted([1, 1, 4, 4, 1, 1, 4, 4]);
    const result = resolveMovementEnhancementChecks({
      checks: [MASC_7, SUPERCHARGER_7],
      roller,
      edge: EDGE_2,
    });

    expect(result.passed).toBe(true);
    expect(result.edgePointsRemaining).toBe(0);
  });

  it('plans nothing and draws nothing for an empty list', () => {
    const roller = scripted([]);
    expect(resolveMovementEnhancementChecks({ checks: [], roller })).toEqual({
      resolutions: [],
      passed: true,
      edgePointsRemaining: undefined,
    });
  });

  it('is repeatable: the same dice give the same result', () => {
    const run = () =>
      resolveMovementEnhancementChecks({
        checks: [MASC_7, SUPERCHARGER_7],
        roller: scripted([4, 4, 2, 3, 6, 5]),
        edge: EDGE_2,
      });
    expect(run()).toEqual(run());
  });
});
