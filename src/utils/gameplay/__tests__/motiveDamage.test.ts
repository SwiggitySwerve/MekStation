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
  applyMotiveDamageToState,
  computeEffectiveMP,
  createMotiveDamageState,
  motiveDamageFromRoll,
  motiveRollModifierForMotionType,
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
      { dice: [1, 1], severity: 'none', mp: 0, immo: false },
      { dice: [1, 2], severity: 'none', mp: 0, immo: false },
      { dice: [2, 2], severity: 'none', mp: 0, immo: false },
      { dice: [2, 3], severity: 'none', mp: 0, immo: false },
      { dice: [3, 3], severity: 'minor', mp: 1, immo: false },
      { dice: [3, 4], severity: 'minor', mp: 1, immo: false },
      { dice: [4, 4], severity: 'moderate', mp: 2, immo: false },
      { dice: [4, 5], severity: 'moderate', mp: 2, immo: false },
      { dice: [5, 5], severity: 'heavy', mp: 3, immo: false },
      { dice: [5, 6], severity: 'heavy', mp: 3, immo: false },
      { dice: [6, 6], severity: 'immobilized', mp: 0, immo: true },
    ];

    for (const c of cases) {
      it(`roll ${c.dice[0] + c.dice[1]} -> ${c.severity}`, () => {
        const r = motiveDamageFromRoll(c.dice);
        expect(r.severity).toBe(c.severity);
        expect(r.mpPenalty).toBe(c.mp);
        expect(r.immobilized).toBe(c.immo);
      });
    }
  });

  describe('motion-type sensitivity (task 4.6)', () => {
    it('hover-class vehicles roll on any hit', () => {
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.HOVER)).toBe(true);
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.HYDROFOIL)).toBe(true);
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.NAVAL)).toBe(true);
    });

    it('tracked / wheeled do not roll on every hit', () => {
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.TRACKED)).toBe(false);
      expect(requiresMotiveRollOnAnyHit(GroundMotionType.WHEELED)).toBe(false);
    });
  });

  describe('motive roll modifiers (task 5)', () => {
    it('maps motion types to MegaMek flat roll modifiers', () => {
      expect(motiveRollModifierForMotionType(GroundMotionType.TRACKED)).toBe(0);
      expect(motiveRollModifierForMotionType(GroundMotionType.WHEELED)).toBe(2);
      expect(motiveRollModifierForMotionType(GroundMotionType.HOVER)).toBe(3);
      expect(motiveRollModifierForMotionType(GroundMotionType.HYDROFOIL)).toBe(
        3,
      );
      expect(motiveRollModifierForMotionType(GroundMotionType.WIGE)).toBe(4);
      expect(motiveRollModifierForMotionType(GroundMotionType.NAVAL)).toBe(0);
    });

    it('applies flat modifiers before table lookup', () => {
      const modified = motiveDamageFromRoll([4, 5], 3);
      expect(modified.roll).toBe(12);
      expect(modified.severity).toBe('immobilized');
      expect(modified.immobilized).toBe(true);
    });

    it('does not convert heavy results after table lookup', () => {
      const heavy = motiveDamageFromRoll([5, 5], 0);
      expect(heavy.roll).toBe(10);
      expect(heavy.severity).toBe('heavy');
      expect(heavy.immobilized).toBe(false);
    });

    it('can move a no-effect raw roll into a minor result through modifiers', () => {
      const minor = motiveDamageFromRoll([2, 3], 2);
      expect(minor.roll).toBe(7);
      expect(minor.severity).toBe('minor');
      expect(minor.mpPenalty).toBe(1);
    });
  });

  describe('state stacking (task 4.4)', () => {
    it('penalties accumulate across rolls', () => {
      let state = createMotiveDamageState(5);
      const r1 = motiveDamageFromRoll([3, 4]);
      state = applyMotiveDamageToState(state, r1);
      expect(state.penaltyMP).toBe(1);

      const r2 = motiveDamageFromRoll([4, 5]);
      state = applyMotiveDamageToState(state, r2);
      expect(state.penaltyMP).toBe(3);

      const r3 = motiveDamageFromRoll([5, 5]);
      state = applyMotiveDamageToState(state, r3);
      expect(state.penaltyMP).toBe(6);
    });

    it('once immobilized, subsequent rolls are no-ops', () => {
      let state = createMotiveDamageState(5);
      state = applyMotiveDamageToState(state, motiveDamageFromRoll([6, 6]));
      expect(state.immobilized).toBe(true);

      state = applyMotiveDamageToState(state, motiveDamageFromRoll([3, 4]));
      expect(state.penaltyMP).toBe(0);
    });
  });

  describe('effective MP (spec scenario "motive penalty applies to flank MP")', () => {
    it('cruise 5, penalty 2 -> cruise 3, flank floor(3 * 1.5) = 4', () => {
      const state = applyMotiveDamageToState(
        createMotiveDamageState(5),
        motiveDamageFromRoll([4, 5]),
      );
      const eff = computeEffectiveMP(state);
      expect(eff.cruiseMP).toBe(3);
      expect(eff.flankMP).toBe(4);
      expect(eff.immobilized).toBe(false);
    });

    it('cruise floor at 0 (not negative)', () => {
      let state = createMotiveDamageState(3);
      state = applyMotiveDamageToState(state, motiveDamageFromRoll([5, 5]));
      state = applyMotiveDamageToState(state, motiveDamageFromRoll([5, 5]));
      const eff = computeEffectiveMP(state);
      expect(eff.cruiseMP).toBe(0);
      expect(eff.flankMP).toBe(0);
    });

    it('immobilized clamps cruise and flank to 0', () => {
      const state = applyMotiveDamageToState(
        createMotiveDamageState(6),
        motiveDamageFromRoll([6, 6]),
      );
      const eff = computeEffectiveMP(state);
      expect(eff).toEqual({ cruiseMP: 0, flankMP: 0, immobilized: true });
    });
  });
});
