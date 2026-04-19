/**
 * Motive damage table tests.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-motive-damage-roll
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/vehicle-unit-system/spec.md
 *   #requirement motive-damage-state-tracking
 */

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  applyMotionTypeAggravation,
  applyMotiveDamageToState,
  computeEffectiveMP,
  createMotiveDamageState,
  motiveDamageFromRoll,
  requiresMotiveRollOnAnyHit,
} from '../motiveDamage';

describe('motiveDamage', () => {
  describe('table outcomes (task 4.2)', () => {
    const cases: {
      dice: readonly [number, number];
      severity: string;
      mp: number;
      immo: boolean;
    }[] = [
      { dice: [1, 1], severity: 'none', mp: 0, immo: false }, // 2
      { dice: [1, 2], severity: 'none', mp: 0, immo: false }, // 3
      { dice: [2, 2], severity: 'none', mp: 0, immo: false }, // 4
      { dice: [2, 3], severity: 'none', mp: 0, immo: false }, // 5
      { dice: [3, 3], severity: 'minor', mp: 1, immo: false }, // 6
      { dice: [3, 4], severity: 'minor', mp: 1, immo: false }, // 7
      { dice: [4, 4], severity: 'moderate', mp: 2, immo: false }, // 8
      { dice: [4, 5], severity: 'moderate', mp: 2, immo: false }, // 9
      { dice: [5, 5], severity: 'heavy', mp: 3, immo: false }, // 10
      { dice: [5, 6], severity: 'heavy', mp: 3, immo: false }, // 11
      { dice: [6, 6], severity: 'immobilized', mp: 0, immo: true }, // 12
    ];

    for (const c of cases) {
      it(`roll ${c.dice[0] + c.dice[1]} → ${c.severity}`, () => {
        const r = motiveDamageFromRoll(c.dice);
        expect(r.severity).toBe(c.severity);
        expect(r.mpPenalty).toBe(c.mp);
        expect(r.immobilized).toBe(c.immo);
      });
    }
  });

  describe('motion-type sensitivity (task 4.6)', () => {
    it('hover vehicles roll on ANY hit', () => {
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.HOVER)).toBe(true);
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.HYDROFOIL)).toBe(true);
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.NAVAL)).toBe(true);
    });

    it('tracked / wheeled do NOT roll on every hit', () => {
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.TRACKED)).toBe(false);
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.WHEELED)).toBe(false);
    });
  });

  describe('motion-type aggravation (task 5)', () => {
    it('wheeled heavy → immobilized', () => {
      const heavy = motiveDamageFromRoll([5, 5]);
      const aggr = applyMotionTypeAggravation(heavy, GroundMotionType.WHEELED);
      expect(aggr.severity).toBe('immobilized');
      expect(aggr.immobilized).toBe(true);
    });

    it('hover heavy → immobilized', () => {
      const heavy = motiveDamageFromRoll([5, 5]);
      const aggr = applyMotionTypeAggravation(heavy, GroundMotionType.HOVER);
      expect(aggr.immobilized).toBe(true);
    });

    it('tracked heavy stays heavy', () => {
      const heavy = motiveDamageFromRoll([5, 5]);
      const aggr = applyMotionTypeAggravation(heavy, GroundMotionType.TRACKED);
      expect(aggr.severity).toBe('heavy');
      expect(aggr.immobilized).toBe(false);
    });

    it('naval heavy stays heavy but caller sets sinking', () => {
      const heavy = motiveDamageFromRoll([5, 5]);
      const aggr = applyMotionTypeAggravation(heavy, GroundMotionType.NAVAL);
      expect(aggr.severity).toBe('heavy');
    });

    it('non-heavy rolls are unchanged by aggravation', () => {
      const minor = motiveDamageFromRoll([3, 3]);
      expect(applyMotionTypeAggravation(minor, GroundMotionType.WHEELED)).toBe(
        minor,
      );
    });
  });

  describe('state stacking (task 4.4)', () => {
    it('penalties accumulate across rolls', () => {
      let state = createMotiveDamageState(5);
      const r1 = motiveDamageFromRoll([3, 4]); // -1
      state = applyMotiveDamageToState(state, r1);
      expect(state.penaltyMP).toBe(1);

      const r2 = motiveDamageFromRoll([4, 5]); // -2
      state = applyMotiveDamageToState(state, r2);
      expect(state.penaltyMP).toBe(3);

      const r3 = motiveDamageFromRoll([5, 5]); // -3
      state = applyMotiveDamageToState(state, r3);
      expect(state.penaltyMP).toBe(6);
    });

    it('once immobilized, subsequent rolls are no-ops', () => {
      let state = createMotiveDamageState(5);
      state = applyMotiveDamageToState(state, motiveDamageFromRoll([6, 6]));
      expect(state.immobilized).toBe(true);

      state = applyMotiveDamageToState(state, motiveDamageFromRoll([3, 4]));
      expect(state.penaltyMP).toBe(0); // unchanged
    });
  });

  describe('effective MP (spec scenario "motive penalty applies to flank MP")', () => {
    it('cruise 5, penalty 2 → cruise 3, flank floor(3×1.5)=4', () => {
      const state = applyMotiveDamageToState(
        createMotiveDamageState(5),
        motiveDamageFromRoll([4, 5]), // -2
      );
      const eff = computeEffectiveMP(state);
      expect(eff.cruiseMP).toBe(3);
      expect(eff.flankMP).toBe(4);
      expect(eff.immobilized).toBe(false);
    });

    it('cruise floor at 0 (not negative)', () => {
      let state = createMotiveDamageState(3);
      state = applyMotiveDamageToState(state, motiveDamageFromRoll([5, 5])); // -3
      state = applyMotiveDamageToState(state, motiveDamageFromRoll([5, 5])); // -3 more
      const eff = computeEffectiveMP(state);
      expect(eff.cruiseMP).toBe(0);
      expect(eff.flankMP).toBe(0);
    });

    it('immobilized clamps cruise & flank to 0', () => {
      const state = applyMotiveDamageToState(
        createMotiveDamageState(6),
        motiveDamageFromRoll([6, 6]),
      );
      const eff = computeEffectiveMP(state);
      expect(eff).toEqual({ cruiseMP: 0, flankMP: 0, immobilized: true });
    });
  });
});
