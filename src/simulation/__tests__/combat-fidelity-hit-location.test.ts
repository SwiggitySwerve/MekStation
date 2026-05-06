/**
 * Phase 6a — `add-combat-fidelity-suite` test pyramid (Task 6.1).
 *
 * Hit-location table coverage: 11 outcomes (2d6 = 2..12) × 4 firing arcs
 * (Front / Left / Right / Rear) = 44 tests.
 *
 * Spec anchor: `combat-resolution/spec.md` "Hit Location Determination"
 * Requirement.
 *
 * **Golden oracle**: MegaMek's `Mek.innerRollHitLocation` switch tables at
 * `E:/Projects/megamek/megamek/src/megamek/common/units/Mek.java` lines
 * 2013–2098 (Front / Left / Right) and 2099–2160 (Rear). Per design D5,
 * we copy fixture VALUES, not algorithm — the table below is read once
 * from the canonical reference and pinned here so any drift in the
 * `getHitLocationTable()` mapping fires this test.
 *
 * Roll 2 ("through-armor critical") routes to the equivalent torso
 * location with rear flag in MegaMek; the MekStation `CombatLocation`
 * encoding folds the rear flag into the location string — Front roll 2
 * is `center_torso` (front TAC), Rear roll 2 is `center_torso_rear`,
 * etc. Front/Left/Right are non-rear; Rear's torso outcomes carry the
 * `_rear` suffix.
 *
 * **Determinism contract**: the test passes a `SeededD6Roller(seed)` to
 * `determineHitLocation` per the `add-combat-fidelity-suite` Phase 0
 * convention. We don't actually rely on the roller's value — the test
 * uses `determineHitLocationFromRoll(arc, dice)` for direct (roll →
 * location) verification — but the seeded variant exists as a smoke
 * check that the dice path round-trips identically.
 */

import { FiringArc } from '@/types/gameplay';
import { CombatLocation, IDiceRoll } from '@/types/gameplay';
import {
  determineHitLocation,
  determineHitLocationFromRoll,
} from '@/utils/gameplay/hitLocation';

import { SeededD6Roller } from '../core/SeededD6Roller';

// ---------------------------------------------------------------------------
// Golden oracle table (MegaMek `Mek.innerRollHitLocation` lines 2013-2160)
// ---------------------------------------------------------------------------

interface ICase {
  readonly arc: FiringArc;
  readonly roll: number;
  readonly expected: CombatLocation;
}

const FRONT_CASES: readonly ICase[] = [
  { arc: FiringArc.Front, roll: 2, expected: 'center_torso' }, // TAC trigger
  { arc: FiringArc.Front, roll: 3, expected: 'right_arm' },
  { arc: FiringArc.Front, roll: 4, expected: 'right_arm' },
  { arc: FiringArc.Front, roll: 5, expected: 'right_leg' },
  { arc: FiringArc.Front, roll: 6, expected: 'right_torso' },
  { arc: FiringArc.Front, roll: 7, expected: 'center_torso' },
  { arc: FiringArc.Front, roll: 8, expected: 'left_torso' },
  { arc: FiringArc.Front, roll: 9, expected: 'left_leg' },
  { arc: FiringArc.Front, roll: 10, expected: 'left_arm' },
  { arc: FiringArc.Front, roll: 11, expected: 'left_arm' },
  { arc: FiringArc.Front, roll: 12, expected: 'head' },
];

const LEFT_CASES: readonly ICase[] = [
  { arc: FiringArc.Left, roll: 2, expected: 'left_torso' }, // TAC trigger
  { arc: FiringArc.Left, roll: 3, expected: 'left_leg' },
  { arc: FiringArc.Left, roll: 4, expected: 'left_arm' },
  { arc: FiringArc.Left, roll: 5, expected: 'left_arm' },
  { arc: FiringArc.Left, roll: 6, expected: 'left_leg' },
  { arc: FiringArc.Left, roll: 7, expected: 'left_torso' },
  { arc: FiringArc.Left, roll: 8, expected: 'center_torso' },
  { arc: FiringArc.Left, roll: 9, expected: 'right_torso' },
  { arc: FiringArc.Left, roll: 10, expected: 'right_arm' },
  { arc: FiringArc.Left, roll: 11, expected: 'right_leg' },
  { arc: FiringArc.Left, roll: 12, expected: 'head' },
];

const RIGHT_CASES: readonly ICase[] = [
  { arc: FiringArc.Right, roll: 2, expected: 'right_torso' }, // TAC trigger
  { arc: FiringArc.Right, roll: 3, expected: 'right_leg' },
  { arc: FiringArc.Right, roll: 4, expected: 'right_arm' },
  { arc: FiringArc.Right, roll: 5, expected: 'right_arm' },
  { arc: FiringArc.Right, roll: 6, expected: 'right_leg' },
  { arc: FiringArc.Right, roll: 7, expected: 'right_torso' },
  { arc: FiringArc.Right, roll: 8, expected: 'center_torso' },
  { arc: FiringArc.Right, roll: 9, expected: 'left_torso' },
  { arc: FiringArc.Right, roll: 10, expected: 'left_arm' },
  { arc: FiringArc.Right, roll: 11, expected: 'left_leg' },
  { arc: FiringArc.Right, roll: 12, expected: 'head' },
];

const REAR_CASES: readonly ICase[] = [
  { arc: FiringArc.Rear, roll: 2, expected: 'center_torso_rear' }, // TAC trigger
  { arc: FiringArc.Rear, roll: 3, expected: 'right_arm' },
  { arc: FiringArc.Rear, roll: 4, expected: 'right_arm' },
  { arc: FiringArc.Rear, roll: 5, expected: 'right_leg' },
  { arc: FiringArc.Rear, roll: 6, expected: 'right_torso_rear' },
  { arc: FiringArc.Rear, roll: 7, expected: 'center_torso_rear' },
  { arc: FiringArc.Rear, roll: 8, expected: 'left_torso_rear' },
  { arc: FiringArc.Rear, roll: 9, expected: 'left_leg' },
  { arc: FiringArc.Rear, roll: 10, expected: 'left_arm' },
  { arc: FiringArc.Rear, roll: 11, expected: 'left_arm' },
  { arc: FiringArc.Rear, roll: 12, expected: 'head' },
];

const ALL_CASES: readonly ICase[] = [
  ...FRONT_CASES,
  ...LEFT_CASES,
  ...RIGHT_CASES,
  ...REAR_CASES,
];

/**
 * Build a synthetic IDiceRoll matching the runner's shape so we can
 * call the pure `determineHitLocationFromRoll(arc, roll)` path. The
 * dice tuple `[a, b]` is irrelevant to the location lookup — only
 * `total` is read — so we encode `[1, total - 1]` as a stable
 * representation. The flags reflect actual game contracts: snake-eyes
 * iff `total === 2`, boxcars iff `total === 12`.
 */
function makeRoll(total: number): IDiceRoll {
  return {
    dice: [1, total - 1],
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  };
}

// ---------------------------------------------------------------------------
// Tests — 44 total (11 rolls × 4 arcs), one per case.
// ---------------------------------------------------------------------------

describe('combat-fidelity / Hit Location table coverage (44 cases)', () => {
  describe('Front arc (MegaMek Mek.java:2013-2036)', () => {
    it.each(FRONT_CASES.map((c) => [c.roll, c.expected] as const))(
      'roll %i -> %s',
      (roll, expected) => {
        const result = determineHitLocationFromRoll(
          FiringArc.Front,
          makeRoll(roll),
        );
        expect(result.location).toBe(expected);
        expect(result.arc).toBe(FiringArc.Front);
        expect(result.roll.total).toBe(roll);
      },
    );
  });

  describe('Left arc (MegaMek Mek.java:2037-2067)', () => {
    it.each(LEFT_CASES.map((c) => [c.roll, c.expected] as const))(
      'roll %i -> %s',
      (roll, expected) => {
        const result = determineHitLocationFromRoll(
          FiringArc.Left,
          makeRoll(roll),
        );
        expect(result.location).toBe(expected);
        expect(result.arc).toBe(FiringArc.Left);
      },
    );
  });

  describe('Right arc (MegaMek Mek.java:2068-2098)', () => {
    it.each(RIGHT_CASES.map((c) => [c.roll, c.expected] as const))(
      'roll %i -> %s',
      (roll, expected) => {
        const result = determineHitLocationFromRoll(
          FiringArc.Right,
          makeRoll(roll),
        );
        expect(result.location).toBe(expected);
        expect(result.arc).toBe(FiringArc.Right);
      },
    );
  });

  describe('Rear arc (MegaMek Mek.java:2099-2160)', () => {
    it.each(REAR_CASES.map((c) => [c.roll, c.expected] as const))(
      'roll %i -> %s',
      (roll, expected) => {
        const result = determineHitLocationFromRoll(
          FiringArc.Rear,
          makeRoll(roll),
        );
        expect(result.location).toBe(expected);
        expect(result.arc).toBe(FiringArc.Rear);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Determinism smoke check: the SeededD6Roller path round-trips through
// the live `determineHitLocation` entry point with no Math.random()
// involvement (per Phase 0's `Math.random` audit guard).
// ---------------------------------------------------------------------------

describe('combat-fidelity / Hit Location determinism via SeededD6Roller', () => {
  it('produces identical (arc, location) sequence for two rollers seeded the same', () => {
    const arcs = [
      FiringArc.Front,
      FiringArc.Left,
      FiringArc.Right,
      FiringArc.Rear,
    ];
    const rollerA = new SeededD6Roller(42).asD6Roller();
    const rollerB = new SeededD6Roller(42).asD6Roller();
    const seqA: { arc: FiringArc; location: CombatLocation; total: number }[] =
      [];
    const seqB: { arc: FiringArc; location: CombatLocation; total: number }[] =
      [];
    for (let i = 0; i < 50; i++) {
      const arc = arcs[i % 4];
      const a = determineHitLocation(arc, rollerA);
      const b = determineHitLocation(arc, rollerB);
      seqA.push({ arc, location: a.location, total: a.roll.total });
      seqB.push({ arc, location: b.location, total: b.roll.total });
    }
    expect(seqA).toEqual(seqB);
  });

  it('every roll outcome (2..12) lands on a CombatLocation defined in ALL_CASES', () => {
    // Defense-in-depth: if the live table grows a new location string
    // that isn't in the golden oracle, we want the unit-test layer to
    // catch it before scenario / MC tiers do.
    const expectedSet = new Set<string>(ALL_CASES.map((c) => c.expected));
    expect(expectedSet.size).toBeGreaterThan(0);
    for (const c of ALL_CASES) {
      const result = determineHitLocationFromRoll(c.arc, makeRoll(c.roll));
      expect(expectedSet.has(result.location)).toBe(true);
    }
  });
});
