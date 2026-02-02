/**
 * Tests for WeightedTable
 * Validates weighted random selection with statistical validation
 */

import { WeightedTable } from '../core/WeightedTable';
import { SeededRandom } from '../core/SeededRandom';

describe('WeightedTable', () => {
  describe('basic functionality', () => {
    it('should select items based on weights', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'rare');
      table.add(9, 'common');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      const result = table.select(randomFn);
      expect(['rare', 'common']).toContain(result);
    });

    it('should return null for empty table', () => {
      const table = new WeightedTable<string>();
      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      const result = table.select(randomFn);
      expect(result).toBeNull();
    });

    it('should handle single item', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'only');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      const result = table.select(randomFn);
      expect(result).toBe('only');
    });

    it('should handle zero weights by excluding them', () => {
      const table = new WeightedTable<string>();
      table.add(0, 'impossible');
      table.add(1, 'possible');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      // Run multiple times to ensure zero-weight item never appears
      for (let i = 0; i < 100; i++) {
        const result = table.select(randomFn);
        expect(result).toBe('possible');
      }
    });

    it('should return null if all weights are zero', () => {
      const table = new WeightedTable<string>();
      table.add(0, 'item1');
      table.add(0, 'item2');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      const result = table.select(randomFn);
      expect(result).toBeNull();
    });
  });

  describe('determinism', () => {
    it('should produce same results with same seed', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'A');
      table.add(2, 'B');
      table.add(3, 'C');

      const seed = 12345;
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      const results1 = Array.from({ length: 100 }, () => table.select(() => rng1.next()));
      const results2 = Array.from({ length: 100 }, () => table.select(() => rng2.next()));

      expect(results1).toEqual(results2);
    });

    it('should produce different results with different seeds', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'A');
      table.add(2, 'B');
      table.add(3, 'C');

      const rng1 = new SeededRandom(11111);
      const rng2 = new SeededRandom(22222);

      const results1 = Array.from({ length: 100 }, () => table.select(() => rng1.next()));
      const results2 = Array.from({ length: 100 }, () => table.select(() => rng2.next()));

      expect(results1).not.toEqual(results2);
    });
  });

  describe('statistical validation', () => {
    it('should respect weight distribution over many samples', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'rare');      // 10% (1/10)
      table.add(3, 'uncommon');  // 30% (3/10)
      table.add(6, 'common');    // 60% (6/10)

      const rng = new SeededRandom(999);
      const randomFn = () => rng.next();

      const counts = { rare: 0, uncommon: 0, common: 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const result = table.select(randomFn);
        if (result) {
          counts[result as keyof typeof counts]++;
        }
      }

      // Expected: rare=1000, uncommon=3000, common=6000
      // Allow 15% deviation
      expect(counts.rare).toBeGreaterThan(1000 * 0.85);
      expect(counts.rare).toBeLessThan(1000 * 1.15);

      expect(counts.uncommon).toBeGreaterThan(3000 * 0.85);
      expect(counts.uncommon).toBeLessThan(3000 * 1.15);

      expect(counts.common).toBeGreaterThan(6000 * 0.85);
      expect(counts.common).toBeLessThan(6000 * 1.15);
    });

    it('should handle equal weights uniformly', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'A');
      table.add(1, 'B');
      table.add(1, 'C');
      table.add(1, 'D');

      const rng = new SeededRandom(777);
      const randomFn = () => rng.next();

      const counts = { A: 0, B: 0, C: 0, D: 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const result = table.select(randomFn);
        if (result) {
          counts[result as keyof typeof counts]++;
        }
      }

      // Each should be ~2500 (25% of 10000)
      // Allow 20% deviation (2000-3000)
      Object.values(counts).forEach(count => {
        expect(count).toBeGreaterThan(2000);
        expect(count).toBeLessThan(3000);
      });
    });

    it('should handle extreme weight ratios', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'very_rare');
      table.add(999, 'very_common');

      const rng = new SeededRandom(555);
      const randomFn = () => rng.next();

      const counts = { very_rare: 0, very_common: 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const result = table.select(randomFn);
        if (result) {
          counts[result as keyof typeof counts]++;
        }
      }

      // Expected: very_rare=10 (0.1%), very_common=9990 (99.9%)
      // very_rare should be < 1% of total
      expect(counts.very_rare).toBeLessThan(iterations * 0.015); // 1.5% tolerance
      expect(counts.very_common).toBeGreaterThan(iterations * 0.985); // 98.5% minimum
    });
  });

  describe('rollMod parameter', () => {
    it('should apply positive rollMod to bias selection', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'A');
      table.add(1, 'B');
      table.add(1, 'C');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      // Positive rollMod should bias toward later items
      const result = table.select(randomFn, 0.5);
      expect(['A', 'B', 'C']).toContain(result);
    });

    it('should apply negative rollMod to bias selection', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'A');
      table.add(1, 'B');
      table.add(1, 'C');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      // Negative rollMod should bias toward earlier items
      const result = table.select(randomFn, -0.5);
      expect(['A', 'B', 'C']).toContain(result);
    });

    it('should clamp rollMod to prevent out-of-bounds', () => {
      const table = new WeightedTable<string>();
      table.add(1, 'A');
      table.add(1, 'B');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      // Extreme rollMod should still return valid result
      const result1 = table.select(randomFn, 10.0);
      expect(['A', 'B']).toContain(result1);

      const result2 = table.select(randomFn, -10.0);
      expect(['A', 'B']).toContain(result2);
    });
  });

  describe('type safety', () => {
    it('should work with number types', () => {
      const table = new WeightedTable<number>();
      table.add(1, 100);
      table.add(1, 200);

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      const result = table.select(randomFn);
      expect([100, 200]).toContain(result);
    });

    it('should work with object types', () => {
      interface Item {
        id: string;
        value: number;
      }

      const table = new WeightedTable<Item>();
      table.add(1, { id: 'item1', value: 10 });
      table.add(1, { id: 'item2', value: 20 });

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      const result = table.select(randomFn);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('value');
    });
  });

  describe('integration with MekHQ pattern', () => {
    it('should match MekHQ behavior for selection algorithm', () => {
      // Replicate MekHQ test case
      const table = new WeightedTable<string>();
      table.add(2, 'Light');
      table.add(3, 'Medium');
      table.add(4, 'Heavy');
      table.add(1, 'Assault');

      const rng = new SeededRandom(12345);
      const randomFn = () => rng.next();

      // Should select based on cumulative weights: [0-2)=Light, [2-5)=Medium, [5-9)=Heavy, [9-10)=Assault
      const result = table.select(randomFn);
      expect(['Light', 'Medium', 'Heavy', 'Assault']).toContain(result);
    });

    it('should handle rollMod like MekHQ', () => {
      const table = new WeightedTable<string>();
      table.add(5, 'A');
      table.add(5, 'B');

      const rng = new SeededRandom(42);
      const randomFn = () => rng.next();

      // rollMod = 0.5 means add 50% of total (5) to roll
      // This should bias selection
      const result = table.select(randomFn, 0.5);
      expect(['A', 'B']).toContain(result);
    });
  });
});
