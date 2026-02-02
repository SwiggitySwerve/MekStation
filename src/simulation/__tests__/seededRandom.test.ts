/**
 * Tests for SeededRandom (Mulberry32 PRNG)
 * Validates deterministic behavior and sequence reproducibility
 */

import { SeededRandom } from '../core/SeededRandom';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('should produce the same sequence for the same seed', () => {
      const seed = 12345;
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      const sequence1 = Array.from({ length: 100 }, () => rng1.next());
      const sequence2 = Array.from({ length: 100 }, () => rng2.next());

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const sequence1 = Array.from({ length: 100 }, () => rng1.next());
      const sequence2 = Array.from({ length: 100 }, () => rng2.next());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should produce values in range [0, 1)', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 1000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should handle seed value 0', () => {
      const rng = new SeededRandom(0);
      const value = rng.next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });

    it('should handle negative seed values', () => {
      const rng = new SeededRandom(-12345);
      const value = rng.next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });

    it('should produce uniform distribution (statistical test)', () => {
      const rng = new SeededRandom(999);
      const buckets = Array(10).fill(0);
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const value = rng.next();
        const bucket = Math.floor(value * 10);
        buckets[bucket]++;
      }

      // Each bucket should have roughly 1000 values (10% of 10000)
      // Allow 20% deviation (800-1200)
      const expectedPerBucket = iterations / 10;
      const tolerance = expectedPerBucket * 0.2;

       buckets.forEach((count) => {
         expect(count).toBeGreaterThan(expectedPerBucket - tolerance);
         expect(count).toBeLessThan(expectedPerBucket + tolerance);
       });
    });
  });

  describe('nextInt', () => {
    it('should produce integers in range [0, max)', () => {
      const rng = new SeededRandom(42);
      const max = 10;

      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(max);
      }
    });

    it('should be deterministic for nextInt', () => {
      const seed = 777;
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      const sequence1 = Array.from({ length: 50 }, () => rng1.nextInt(100));
      const sequence2 = Array.from({ length: 50 }, () => rng2.nextInt(100));

      expect(sequence1).toEqual(sequence2);
    });

    it('should handle max = 1', () => {
      const rng = new SeededRandom(42);
      const value = rng.nextInt(1);
      expect(value).toBe(0);
    });
  });

  describe('nextRange', () => {
    it('should produce values in range [min, max)', () => {
      const rng = new SeededRandom(42);
      const min = 5;
      const max = 15;

      for (let i = 0; i < 100; i++) {
        const value = rng.nextRange(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should handle negative ranges', () => {
      const rng = new SeededRandom(42);
      const min = -10;
      const max = -5;

      for (let i = 0; i < 100; i++) {
        const value = rng.nextRange(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should be deterministic for nextRange', () => {
      const seed = 888;
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      const sequence1 = Array.from({ length: 50 }, () => rng1.nextRange(10, 20));
      const sequence2 = Array.from({ length: 50 }, () => rng2.nextRange(10, 20));

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('integration with simulation', () => {
    it('should allow creating a random function compatible with existing code', () => {
      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      // Simulate usage like in acar.ts:distributeDamage
      const severity = 0.8;
      const damage = Math.min(severity * (0.5 + randomFn() * 0.5) * 100, 100);

      expect(damage).toBeGreaterThanOrEqual(0);
      expect(damage).toBeLessThanOrEqual(100);
    });

    it('should produce identical results when used as injectable random', () => {
      const seed = 12345;
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      const randomFn1 = () => rng1.next();
      const randomFn2 = () => rng2.next();

      const results1 = Array.from({ length: 10 }, () => {
        const severity = 0.8;
        return Math.min(severity * (0.5 + randomFn1() * 0.5) * 100, 100);
      });

      const results2 = Array.from({ length: 10 }, () => {
        const severity = 0.8;
        return Math.min(severity * (0.5 + randomFn2() * 0.5) * 100, 100);
      });

      expect(results1).toEqual(results2);
    });
  });
});
