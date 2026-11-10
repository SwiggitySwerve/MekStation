/**
 * Which MASC / Supercharger failure checks a move needs (C-1c PR 1).
 *
 * MegaMek 48fcb2f64: a step uses a booster only when its MP exceeds the
 * unboosted figure (`MoveStep.java` L2308-L2335, L2499-L2548); the lower
 * target number is picked, a Supercharger on a tie (L3217-L3236); both when
 * the MP exceeds the single-boost figure (L3238-L3250); a booster already
 * used this turn is not checked again (L2329-L2335, L3222, L3240).
 *
 * @spec openspec/changes/close-combat-psr-parity-gaps/specs/piloting-skill-rolls/spec.md
 */

import { MovementType } from '@/types/gameplay';
import {
  type IBoosterMPFigures,
  type IBoosterPlanState,
  planMovementEnhancementChecks,
} from '@/utils/gameplay/movement/movementEnhancementPlan';

// A walk-5 Mek: run 8 (ceil 1.5x), one booster 10 (2x), both 13 (ceil 2.5x);
// sprint 10 (2x), one booster 13 (ceil 2.5x), both 15 (3x).
const WALK_5: IBoosterMPFigures = {
  runNoBoost: 8,
  runSingleBoost: 10,
  runMax: 13,
  sprintNoBoost: 10,
  sprintSingleBoost: 13,
  sprintMax: 15,
};

const IDLE: IBoosterPlanState = {
  armed: false,
  level: 0,
  usedThisTurn: false,
};
const ARMED: IBoosterPlanState = { armed: true, level: 0, usedThisTurn: false };

function plan(
  overrides: {
    readonly movementType?: MovementType;
    readonly mpUsed?: number;
    readonly masc?: Partial<IBoosterPlanState>;
    readonly supercharger?: Partial<IBoosterPlanState>;
    readonly unitType?: string;
    readonly industrialMech?: boolean;
    readonly optionalRules?: readonly string[];
    readonly mp?: IBoosterMPFigures;
  } = {},
) {
  return planMovementEnhancementChecks({
    movementType: overrides.movementType ?? MovementType.Run,
    mpUsed: overrides.mpUsed ?? 10,
    unitType: overrides.unitType ?? 'BattleMech',
    masc: { ...ARMED, ...overrides.masc },
    supercharger: { ...IDLE, ...overrides.supercharger },
    mp: overrides.mp ?? WALK_5,
    industrialMech: overrides.industrialMech,
    optionalRules: overrides.optionalRules,
  });
}

function kinds(checks: ReturnType<typeof plan>): readonly string[] {
  return checks.map((check) => check.enhancement);
}

describe('planMovementEnhancementChecks', () => {
  describe('when a check is needed', () => {
    it('plans none while the move stays within the unboosted run MP', () => {
      // G1: an armed booster alone is not a trigger, the MP must exceed it.
      expect(plan({ mpUsed: 8 })).toEqual([]);
      expect(plan({ mpUsed: 1 })).toEqual([]);
    });

    it('plans one MASC check just above the unboosted run MP', () => {
      expect(plan({ mpUsed: 9 })).toEqual([
        { enhancement: 'MASC', targetNumber: 3, level: 0, rollModifier: 0 },
      ]);
    });

    it('plans only a Supercharger check when only it is armed', () => {
      expect(
        plan({
          mpUsed: 9,
          masc: { armed: false },
          supercharger: { armed: true },
        }),
      ).toEqual([
        {
          enhancement: 'Supercharger',
          targetNumber: 3,
          level: 0,
          rollModifier: 0,
        },
      ]);
    });

    it.each([
      MovementType.Walk,
      MovementType.Jump,
      MovementType.Stationary,
      MovementType.Evade,
    ])('plans none for a %s move even with MP above the run figure', (type) => {
      expect(plan({ movementType: type, mpUsed: 12 })).toEqual([]);
    });

    it('plans none for a unit that is not a BattleMech', () => {
      expect(plan({ unitType: 'Tank', mpUsed: 9 })).toEqual([]);
      expect(plan({ unitType: 'VTOL', mpUsed: 9 })).toEqual([]);
      expect(plan({ unitType: 'BattleMech', mpUsed: 9 })).toHaveLength(1);
    });
  });

  describe('either booster (MP within the single-boost figure)', () => {
    const both = { masc: { armed: true }, supercharger: { armed: true } };

    it('picks the booster with the lower target number', () => {
      expect(
        kinds(
          plan({
            mpUsed: 9,
            masc: { armed: true, level: 0 },
            supercharger: { armed: true, level: 2 },
          }),
        ),
      ).toEqual(['MASC']);
      expect(
        kinds(
          plan({
            mpUsed: 9,
            masc: { armed: true, level: 3 },
            supercharger: { armed: true, level: 1 },
          }),
        ),
      ).toEqual(['Supercharger']);
    });

    it('gives a tie to the Supercharger', () => {
      expect(kinds(plan({ mpUsed: 9, ...both }))).toEqual(['Supercharger']);
    });

    it('plans nothing once either booster has already been used this turn', () => {
      // MoveStep L3222: `!hasMASCBeenUsed && !hasSuperchargerBeenUsed`.
      expect(
        plan({ mpUsed: 9, ...both, masc: { armed: true, usedThisTurn: true } }),
      ).toEqual([]);
      expect(
        plan({
          mpUsed: 9,
          ...both,
          supercharger: { armed: true, usedThisTurn: true },
        }),
      ).toEqual([]);
    });
  });

  describe('both boosters (MP above the single-boost figure)', () => {
    const both = { masc: { armed: true }, supercharger: { armed: true } };

    it('plans MASC then Supercharger, in that order', () => {
      expect(kinds(plan({ mpUsed: 11, ...both }))).toEqual([
        'MASC',
        'Supercharger',
      ]);
    });

    it('plans only the booster that has not been used yet', () => {
      expect(
        kinds(
          plan({
            mpUsed: 11,
            ...both,
            masc: { armed: true, usedThisTurn: true },
          }),
        ),
      ).toEqual(['Supercharger']);
      expect(
        kinds(
          plan({
            mpUsed: 11,
            ...both,
            supercharger: { armed: true, usedThisTurn: true },
          }),
        ),
      ).toEqual(['MASC']);
      expect(
        plan({
          mpUsed: 11,
          masc: { armed: true, usedThisTurn: true },
          supercharger: { armed: true, usedThisTurn: true },
        }),
      ).toEqual([]);
    });
  });

  describe('sprint', () => {
    it('uses the sprint figures, not the run figures', () => {
      // 10 is the unboosted sprint maximum, so no check; 11 needs one.
      expect(plan({ movementType: MovementType.Sprint, mpUsed: 10 })).toEqual(
        [],
      );
      expect(
        kinds(plan({ movementType: MovementType.Sprint, mpUsed: 11 })),
      ).toEqual(['MASC']);
    });

    it('plans both boosters above the single-boost sprint figure', () => {
      expect(
        kinds(
          plan({
            movementType: MovementType.Sprint,
            mpUsed: 14,
            masc: { armed: true },
            supercharger: { armed: true },
          }),
        ),
      ).toEqual(['MASC', 'Supercharger']);
    });
  });

  describe('re-moving after a failed or passed check (pin L2329-L2335, L3222)', () => {
    it('does not check again on a replotted path above the unboosted MP', () => {
      // After a failed MASC check the flag stays set and MASC stays armed, so
      // the replotted path may spend boosted MP with no second roll.
      expect(
        plan({ mpUsed: 10, masc: { armed: true, usedThisTurn: true } }),
      ).toEqual([]);
      expect(
        plan({
          mpUsed: 13,
          masc: { armed: true, usedThisTurn: true },
          supercharger: { armed: true, usedThisTurn: true },
        }),
      ).toEqual([]);
    });

    it('a destroyed Supercharger is no longer planned', () => {
      // After a Supercharger failure it is set Off, so only MASC is armed.
      expect(
        kinds(
          plan({
            mpUsed: 9,
            masc: { armed: true },
            supercharger: { armed: false, level: 4 },
          }),
        ),
      ).toEqual(['MASC']);
    });
  });

  describe('target numbers', () => {
    it.each([
      [0, 3],
      [1, 5],
      [2, 7],
      [3, 11],
      [4, 13],
      [5, 13],
      [6, 13],
      [9, 13],
    ])('level %i has target %i', (level, target) => {
      expect(
        plan({ mpUsed: 9, masc: { armed: true, level } })[0],
      ).toMatchObject({ targetNumber: target, level });
    });

    it('follows the alternate and enhanced alternate tables', () => {
      const target = (rules: readonly string[], level: number) =>
        plan({
          mpUsed: 9,
          masc: { armed: true, level },
          optionalRules: rules,
        })[0].targetNumber;
      expect(target(['alternate_masc'], 0)).toBe(0);
      expect(target(['alternate_masc'], 1)).toBe(3);
      expect(target(['alternate_masc_enhanced'], 2)).toBe(3);
      expect(target(['alternate_masc_enhanced'], 3)).toBe(5);
    });

    it('gives the Supercharger of an Industrial Mek a -1 roll modifier only', () => {
      // Entity.java L16536-L16541.
      const supercharger = {
        masc: { armed: false },
        supercharger: { armed: true },
      };
      expect(
        plan({ mpUsed: 9, ...supercharger, industrialMech: true })[0],
      ).toMatchObject({ enhancement: 'Supercharger', rollModifier: -1 });
      expect(
        plan({ mpUsed: 9, ...supercharger, industrialMech: false })[0],
      ).toMatchObject({ rollModifier: 0 });
      expect(plan({ mpUsed: 9, industrialMech: true })[0]).toMatchObject({
        enhancement: 'MASC',
        rollModifier: 0,
      });
    });
  });
});
