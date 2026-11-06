import { MovementType, RangeBracket } from '@/types/gameplay';
import {
  calculateTargetingQuirkModifier,
  hasQuirk,
} from '@/utils/gameplay/quirkModifiers';
import { calculateToHit } from '@/utils/gameplay/toHit';

// MegaMek 48fcb2f64 OptionsConstants.java:72-74,135-137; Entity.java:12721-12781.
const cases = [
  ['imp_target_short', 'improved_targeting_short', RangeBracket.Short, -1],
  ['imp_target_med', 'improved_targeting_medium', RangeBracket.Medium, -1],
  ['imp_target_long', 'improved_targeting_long', RangeBracket.Long, -1],
  ['poor_target_short', 'poor_targeting_short', RangeBracket.Short, 1],
  ['poor_target_med', 'poor_targeting_medium', RangeBracket.Medium, 1],
  ['poor_target_long', 'poor_targeting_long', RangeBracket.Long, 1],
] as const;

describe('native targeting quirk ids', () => {
  it.each(cases)(
    '%s applies its pinned modifier through calculateToHit',
    (native, legacy, bracket, modifier) => {
      const attacker = {
        gunnery: 4,
        movementType: MovementType.Stationary,
        heat: 0,
        damageModifiers: [],
      };
      const target = {
        movementType: MovementType.Stationary,
        hexesMoved: 0,
        prone: false,
        immobile: false,
        partialCover: false,
      };
      const baseline = calculateToHit(attacker, target, bracket, 3);
      const result = calculateToHit(
        { ...attacker, unitQuirks: [native] },
        target,
        bracket,
        3,
      );
      expect(result.finalToHit - baseline.finalToHit).toBe(modifier);
      expect(calculateTargetingQuirkModifier([native], bracket)).toEqual(
        calculateTargetingQuirkModifier([legacy], bracket),
      );
      expect(hasQuirk([native], legacy)).toBe(true);
      expect(hasQuirk([legacy], native)).toBe(true);
      // A saved alias and its native spelling represent one boolean quirk.
      expect(
        calculateTargetingQuirkModifier([native, legacy, native], bracket)
          ?.value,
      ).toBe(modifier);
      for (const other of [
        RangeBracket.Short,
        RangeBracket.Medium,
        RangeBracket.Long,
      ]) {
        if (other !== bracket)
          expect(calculateTargetingQuirkModifier([native], other)).toBeNull();
      }
    },
  );
  it.each([RangeBracket.Short, RangeBracket.Medium, RangeBracket.Long])(
    'opposing native targeting quirks cancel at %s',
    (bracket) => {
      const ids = cases
        .filter((row) => row[2] === bracket)
        .map((row) => row[0]);
      expect(calculateTargetingQuirkModifier(ids, bracket)).toBeNull();
    },
  );
  it('preserves exact unknown ids and does not confuse similar names', () => {
    expect(hasQuirk(['unknown'], 'unknown')).toBe(true);
    expect(hasQuirk(['imp_target_shorter'], 'improved_targeting_short')).toBe(
      false,
    );
    expect(
      calculateTargetingQuirkModifier(
        ['imp_target_shorter'],
        RangeBracket.Short,
      ),
    ).toBeNull();
  });
});
