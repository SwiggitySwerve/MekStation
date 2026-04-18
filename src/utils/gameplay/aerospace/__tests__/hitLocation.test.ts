/**
 * Aerospace hit-location tests — exhaustive (direction × roll).
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (2.5)
 */

import { AerospaceArc } from '../../../../types/unit/AerospaceInterfaces';
import {
  determineAerospaceHitLocationFromRoll,
  resolveFrontTable,
  resolveRearTable,
  resolveSideTable,
  toSmallCraftArc,
} from '../hitLocation';
import { AerospaceAttackDirection } from '../state';

describe('resolveFrontTable', () => {
  const table: Array<[number, AerospaceArc, boolean]> = [
    [2, AerospaceArc.NOSE, true],
    [3, AerospaceArc.RIGHT_WING, false],
    [4, AerospaceArc.RIGHT_WING, false],
    [5, AerospaceArc.NOSE, false],
    [6, AerospaceArc.NOSE, false],
    [7, AerospaceArc.NOSE, false],
    [8, AerospaceArc.LEFT_WING, false],
    [9, AerospaceArc.LEFT_WING, false],
    [10, AerospaceArc.AFT, false],
    [11, AerospaceArc.AFT, false],
    [12, AerospaceArc.NOSE, true],
  ];

  it.each(table)('roll %i → %s (TAC=%s)', (roll, arc, tac) => {
    const r = resolveFrontTable(roll);
    expect(r.arc).toBe(arc);
    expect(r.isTAC).toBe(tac);
  });
});

describe('resolveSideTable (SIDE_LEFT — near wing = LeftWing)', () => {
  const table: Array<[number, AerospaceArc, boolean]> = [
    [2, AerospaceArc.LEFT_WING, true],
    [3, AerospaceArc.NOSE, false],
    [4, AerospaceArc.NOSE, false],
    [5, AerospaceArc.NOSE, false],
    [6, AerospaceArc.LEFT_WING, false],
    [7, AerospaceArc.LEFT_WING, false],
    [8, AerospaceArc.LEFT_WING, false],
    [9, AerospaceArc.AFT, false],
    [10, AerospaceArc.AFT, false],
    [11, AerospaceArc.LEFT_WING, true],
    [12, AerospaceArc.LEFT_WING, true],
  ];

  it.each(table)('roll %i → %s (TAC=%s)', (roll, arc, tac) => {
    const r = resolveSideTable(roll, AerospaceArc.LEFT_WING);
    expect(r.arc).toBe(arc);
    expect(r.isTAC).toBe(tac);
  });
});

describe('resolveSideTable (SIDE_RIGHT — near wing = RightWing)', () => {
  it('roll 6 → RightWing', () => {
    expect(resolveSideTable(6, AerospaceArc.RIGHT_WING).arc).toBe(
      AerospaceArc.RIGHT_WING,
    );
  });
  it('roll 2 → RightWing + TAC', () => {
    const r = resolveSideTable(2, AerospaceArc.RIGHT_WING);
    expect(r.arc).toBe(AerospaceArc.RIGHT_WING);
    expect(r.isTAC).toBe(true);
  });
});

describe('resolveRearTable', () => {
  // 3-5 picks a wing via d6 tiebreak (even=left, odd=right).
  const fixedLeft = () => 2;
  const fixedRight = () => 3;
  const table: Array<[number, () => number, AerospaceArc, boolean]> = [
    [2, fixedLeft, AerospaceArc.AFT, true],
    [3, fixedLeft, AerospaceArc.LEFT_WING, false],
    [3, fixedRight, AerospaceArc.RIGHT_WING, false],
    [4, fixedLeft, AerospaceArc.LEFT_WING, false],
    [5, fixedRight, AerospaceArc.RIGHT_WING, false],
    [6, fixedLeft, AerospaceArc.AFT, false],
    [7, fixedLeft, AerospaceArc.AFT, false],
    [8, fixedLeft, AerospaceArc.AFT, false],
    [9, fixedLeft, AerospaceArc.NOSE, false],
    [10, fixedLeft, AerospaceArc.NOSE, false],
    [11, fixedLeft, AerospaceArc.AFT, true],
    [12, fixedLeft, AerospaceArc.AFT, true],
  ];

  it.each(table)('roll %i → %s (TAC=%s)', (roll, tie, arc, tac) => {
    const r = resolveRearTable(roll, tie);
    expect(r.arc).toBe(arc);
    expect(r.isTAC).toBe(tac);
  });
});

describe('toSmallCraftArc', () => {
  it('LEFT_WING → LEFT_SIDE', () => {
    expect(toSmallCraftArc(AerospaceArc.LEFT_WING)).toBe(
      AerospaceArc.LEFT_SIDE,
    );
  });
  it('RIGHT_WING → RIGHT_SIDE', () => {
    expect(toSmallCraftArc(AerospaceArc.RIGHT_WING)).toBe(
      AerospaceArc.RIGHT_SIDE,
    );
  });
  it('NOSE passes through', () => {
    expect(toSmallCraftArc(AerospaceArc.NOSE)).toBe(AerospaceArc.NOSE);
  });
  it('AFT passes through', () => {
    expect(toSmallCraftArc(AerospaceArc.AFT)).toBe(AerospaceArc.AFT);
  });
});

describe('determineAerospaceHitLocationFromRoll — Small Craft override', () => {
  it('SIDE_LEFT roll 6 on Small Craft → LEFT_SIDE', () => {
    const r = determineAerospaceHitLocationFromRoll(
      AerospaceAttackDirection.SIDE_LEFT,
      6,
      { dice: [3, 3], isSmallCraft: true },
    );
    expect(r.arc).toBe(AerospaceArc.LEFT_SIDE);
  });
  it('SIDE_RIGHT roll 6 on Small Craft → RIGHT_SIDE', () => {
    const r = determineAerospaceHitLocationFromRoll(
      AerospaceAttackDirection.SIDE_RIGHT,
      6,
      { dice: [3, 3], isSmallCraft: true },
    );
    expect(r.arc).toBe(AerospaceArc.RIGHT_SIDE);
  });
});

describe('determineAerospaceHitLocationFromRoll — exhaustive coverage', () => {
  it('covers every direction × every roll without throwing', () => {
    for (const dir of Object.values(AerospaceAttackDirection)) {
      for (let roll = 2; roll <= 12; roll++) {
        const r = determineAerospaceHitLocationFromRoll(dir, roll, {
          dice: [1, roll - 1],
          diceRoller: () => 2,
          isSmallCraft: false,
        });
        expect(r.arc).toBeDefined();
        expect(r.roll.total).toBe(roll);
      }
    }
  });
});
