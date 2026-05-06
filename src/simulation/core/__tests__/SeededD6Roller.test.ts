/**
 * Tests for SeededD6Roller — determinism + distribution invariants.
 *
 * The roller is the foundation of the combat-fidelity test pyramid
 * (Phases 3, 4, 6 of `add-combat-fidelity-suite`). If the roller is
 * non-deterministic OR its distribution drifts from the analytic 2d6
 * triangle, every downstream scenario test inherits the bug.
 */

import { SeededD6Roller } from '../SeededD6Roller';
import { SeededRandom } from '../SeededRandom';

describe('SeededD6Roller', () => {
  describe('determinism', () => {
    it('produces byte-identical 1000-call sequences when constructed with the same seed', () => {
      // Spec scenario: "Two rollers seeded with the same value produce identical sequences."
      const rollerA = new SeededD6Roller(42);
      const rollerB = new SeededD6Roller(42);

      const sequenceA = Array.from({ length: 1000 }, () => rollerA.roll2d6());
      const sequenceB = Array.from({ length: 1000 }, () => rollerB.roll2d6());

      expect(sequenceA).toEqual(sequenceB);
    });

    it('produces byte-identical rollD6 sequences when constructed with the same seed', () => {
      const rollerA = new SeededD6Roller(42);
      const rollerB = new SeededD6Roller(42);

      const sequenceA = Array.from({ length: 1000 }, () => rollerA.rollD6());
      const sequenceB = Array.from({ length: 1000 }, () => rollerB.rollD6());

      expect(sequenceA).toEqual(sequenceB);
    });

    it('produces different sequences for different seeds', () => {
      const rollerA = new SeededD6Roller(42);
      const rollerB = new SeededD6Roller(43);

      const sequenceA = Array.from({ length: 100 }, () => rollerA.roll2d6());
      const sequenceB = Array.from({ length: 100 }, () => rollerB.roll2d6());

      expect(sequenceA).not.toEqual(sequenceB);
    });

    it('accepts an existing SeededRandom and shares its stream', () => {
      // Caller-controlled PRNG state is important for replays / P2P sync
      // where the engine PRNG advances before dice need to be rolled.
      const sharedRandom = new SeededRandom(42);
      sharedRandom.next(); // advance one float
      sharedRandom.next(); // advance another float

      const rollerFromShared = new SeededD6Roller(sharedRandom);
      const rollerFromSeed = new SeededD6Roller(42);

      // After advancing the shared PRNG twice, its sequence should
      // diverge from a fresh roller seeded the same way.
      const fromShared = Array.from({ length: 50 }, () =>
        rollerFromShared.roll2d6(),
      );
      const fromSeed = Array.from({ length: 50 }, () =>
        rollerFromSeed.roll2d6(),
      );

      expect(fromShared).not.toEqual(fromSeed);
    });
  });

  describe('range guarantees', () => {
    it('rollD6 always returns an integer in [1, 6]', () => {
      const roller = new SeededD6Roller(42);
      for (let i = 0; i < 10000; i++) {
        const value = roller.rollD6();
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
    });

    it('roll2d6 always returns an integer in [2, 12]', () => {
      const roller = new SeededD6Roller(42);
      for (let i = 0; i < 10000; i++) {
        const value = roller.roll2d6();
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThanOrEqual(12);
      }
    });
  });

  describe('distribution', () => {
    it('rollD6 is uniform within ±5% over 60000 calls', () => {
      const roller = new SeededD6Roller(42);
      const histogram = new Array<number>(7).fill(0); // index 0 unused
      const total = 60000;

      for (let i = 0; i < total; i++) {
        histogram[roller.rollD6()]!++;
      }

      // Expected count per face = total / 6 = 10000.
      const expectedPerFace = total / 6;
      const tolerance = expectedPerFace * 0.05;

      for (let face = 1; face <= 6; face++) {
        const count = histogram[face]!;
        expect(count).toBeGreaterThanOrEqual(expectedPerFace - tolerance);
        expect(count).toBeLessThanOrEqual(expectedPerFace + tolerance);
      }
    });

    it('roll2d6 matches the analytic 2d6 triangle within ±5% over 100000 calls', () => {
      // Spec scenario: "Roller distribution matches analytic 2d6 CDF."
      // Analytic 2d6 PMF (numerator over 36):
      //   2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:5, 9:4, 10:3, 11:2, 12:1
      const roller = new SeededD6Roller(42);
      const total = 100000;
      const histogram = new Array<number>(13).fill(0); // indices 2..12 used

      for (let i = 0; i < total; i++) {
        histogram[roller.roll2d6()]!++;
      }

      const analyticNumerators: Record<number, number> = {
        2: 1,
        3: 2,
        4: 3,
        5: 4,
        6: 5,
        7: 6,
        8: 5,
        9: 4,
        10: 3,
        11: 2,
        12: 1,
      };

      for (const [sumStr, numerator] of Object.entries(analyticNumerators)) {
        const sum = Number(sumStr);
        const expected = (numerator / 36) * total;
        const tolerance = expected * 0.05;
        const observed = histogram[sum]!;
        expect(observed).toBeGreaterThanOrEqual(expected - tolerance);
        expect(observed).toBeLessThanOrEqual(expected + tolerance);
      }
    });
  });

  describe('asD6Roller adapter', () => {
    it('returns a function-shape D6Roller compatible with diceTypes.roll2d6', () => {
      const roller = new SeededD6Roller(42);
      const fn = roller.asD6Roller();
      expect(typeof fn).toBe('function');
      const sample = fn();
      expect(Number.isInteger(sample)).toBe(true);
      expect(sample).toBeGreaterThanOrEqual(1);
      expect(sample).toBeLessThanOrEqual(6);
    });

    it('shares state with the originating roller', () => {
      // The adapter is a bound method, so calls through the adapter
      // advance the same underlying PRNG as direct method calls.
      const roller = new SeededD6Roller(42);
      const fn = roller.asD6Roller();

      const a = fn();
      const b = roller.rollD6();
      const c = fn();

      // With seed 42, the first three rolls of a fresh roller should
      // equal [a, b, c] when sampled in order from a single roller.
      const reference = new SeededD6Roller(42);
      expect(a).toBe(reference.rollD6());
      expect(b).toBe(reference.rollD6());
      expect(c).toBe(reference.rollD6());
    });
  });
});
