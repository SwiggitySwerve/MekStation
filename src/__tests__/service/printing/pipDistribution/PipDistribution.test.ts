/**
 * Pip Distribution Service Tests
 *
 * Tests for Poisson disk sampling-based pip distribution including:
 * - Point generation within polygon bounds
 * - Exact count matching
 * - Polygon utilities
 * - Lloyd's relaxation uniformity improvement
 */

import {
  distributePips,
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculateBoundingBox,
  distance,
  calculateUniformityMetric,
  filterPointsInRegion,
  isPointInRegion,
  createRectangleRegion,
} from '@/services/printing/pipDistribution';
import type { PolygonRegion, Point2D } from '@/services/printing/pipDistribution';


describe('PipDistribution', () => {
  describe('distributePips', () => {
    const squareRegion: PolygonRegion = {
      id: 'test-square',
      vertices: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0],
      ],
    };

    it('should generate exact target count of pips', () => {
      const result = distributePips(squareRegion, {
        targetCount: 15,
        seed: 12345,
      });

      expect(result.count).toBe(15);
      expect(result.positions).toHaveLength(15);
      expect(result.exactMatch).toBe(true);
    });

    it('should generate points within polygon bounds', () => {
      const result = distributePips(squareRegion, {
        targetCount: 20,
        seed: 12345,
      });

      for (const [x, y] of result.positions) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    });

    it('should handle single pip request', () => {
      const result = distributePips(squareRegion, {
        targetCount: 1,
        seed: 12345,
      });

      expect(result.count).toBe(1);
      expect(result.positions).toHaveLength(1);
    });

    it('should handle zero pip request', () => {
      const result = distributePips(squareRegion, {
        targetCount: 0,
      });

      expect(result.count).toBe(0);
      expect(result.positions).toHaveLength(0);
      expect(result.exactMatch).toBe(true);
    });

    it('should handle large pip counts', () => {
      const result = distributePips(squareRegion, {
        targetCount: 100,
        seed: 12345,
        relaxationIterations: 5,
      });

      // Should get close to target even if not exact
      expect(result.count).toBeGreaterThanOrEqual(90);
      expect(result.count).toBeLessThanOrEqual(110);
    });

    it('should produce consistent count with seed', () => {
      // Note: Full determinism is limited because poisson-disk-sampling
      // uses its own internal RNG. Seed affects count adjustment step.
      const result1 = distributePips(squareRegion, {
        targetCount: 10,
        seed: 42,
      });

      const result2 = distributePips(squareRegion, {
        targetCount: 10,
        seed: 42,
      });

      // Both should achieve the same count
      expect(result1.count).toBe(result2.count);
      expect(result1.exactMatch).toBe(result2.exactMatch);
    });

    it('should calculate appropriate pip radius', () => {
      const result = distributePips(squareRegion, {
        targetCount: 25,
        seed: 12345,
      });

      expect(result.pipRadius).toBeGreaterThan(0);
      expect(result.pipRadius).toBeLessThan(50); // Reasonable for 100x100 area
    });

    it('should include bounding box in result', () => {
      const result = distributePips(squareRegion, {
        targetCount: 10,
        seed: 12345,
      });

      expect(result.bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
      });
    });
  });

  describe('complex polygon regions', () => {
    const lShapedRegion: PolygonRegion = {
      id: 'l-shaped',
      vertices: [
        [0, 0],
        [50, 0],
        [50, 50],
        [100, 50],
        [100, 100],
        [0, 100],
        [0, 0],
      ],
    };

    it('should distribute pips in L-shaped polygon', () => {
      const result = distributePips(lShapedRegion, {
        targetCount: 20,
        seed: 12345,
      });

      // All points should be in the L-shaped region
      for (const point of result.positions) {
        expect(isPointInRegion(point, lShapedRegion)).toBe(true);
      }
    });

    it('should respect polygon holes', () => {
      const regionWithHole: PolygonRegion = {
        id: 'with-hole',
        vertices: [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
          [0, 0],
        ],
        holes: [
          [
            [40, 40],
            [60, 40],
            [60, 60],
            [40, 60],
            [40, 40],
          ],
        ],
      };

      const result = distributePips(regionWithHole, {
        targetCount: 30,
        seed: 12345,
      });

      // No points should be in the hole
      for (const [x, y] of result.positions) {
        const inHole = x > 40 && x < 60 && y > 40 && y < 60;
        expect(inHole).toBe(false);
      }
    });
  });

  describe('narrow regions', () => {
    const narrowHorizontal: PolygonRegion = {
      id: 'narrow-horizontal',
      vertices: [
        [0, 0],
        [100, 0],
        [100, 10],
        [0, 10],
        [0, 0],
      ],
    };

    it('should handle narrow horizontal regions', () => {
      const result = distributePips(narrowHorizontal, {
        targetCount: 5,
        seed: 12345,
      });

      expect(result.count).toBeGreaterThanOrEqual(3);
      // Points should be spread horizontally
      const xValues = result.positions.map(([x]) => x);
      const xRange = Math.max(...xValues) - Math.min(...xValues);
      expect(xRange).toBeGreaterThan(50);
    });

    const narrowVertical: PolygonRegion = {
      id: 'narrow-vertical',
      vertices: [
        [0, 0],
        [10, 0],
        [10, 100],
        [0, 100],
        [0, 0],
      ],
    };

    it('should handle narrow vertical regions', () => {
      const result = distributePips(narrowVertical, {
        targetCount: 5,
        seed: 12345,
      });

      expect(result.count).toBeGreaterThanOrEqual(3);
      // Points should be spread vertically
      const yValues = result.positions.map(([, y]) => y);
      const yRange = Math.max(...yValues) - Math.min(...yValues);
      expect(yRange).toBeGreaterThan(50);
    });
  });

  describe('PolygonUtils', () => {
    describe('calculatePolygonArea', () => {
      it('should calculate area of a square', () => {
        const vertices: Point2D[] = [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ];
        expect(calculatePolygonArea(vertices)).toBeCloseTo(100, 5);
      });

      it('should calculate area of a triangle', () => {
        const vertices: Point2D[] = [
          [0, 0],
          [10, 0],
          [5, 10],
          [0, 0],
        ];
        expect(calculatePolygonArea(vertices)).toBeCloseTo(50, 5);
      });

      it('should return 0 for degenerate polygons', () => {
        expect(calculatePolygonArea([])).toBe(0);
        expect(calculatePolygonArea([[0, 0]])).toBe(0);
        expect(calculatePolygonArea([[0, 0], [1, 1]])).toBe(0);
      });
    });

    describe('calculatePolygonCentroid', () => {
      it('should calculate centroid of a square', () => {
        const vertices: Point2D[] = [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ];
        const [cx, cy] = calculatePolygonCentroid(vertices);
        expect(cx).toBeCloseTo(5, 5);
        expect(cy).toBeCloseTo(5, 5);
      });

      it('should handle empty polygon', () => {
        const [cx, cy] = calculatePolygonCentroid([]);
        expect(cx).toBe(0);
        expect(cy).toBe(0);
      });
    });

    describe('calculateBoundingBox', () => {
      it('should calculate bounding box correctly', () => {
        const vertices: Point2D[] = [
          [5, 10],
          [20, 5],
          [15, 25],
        ];
        const bbox = calculateBoundingBox(vertices);
        expect(bbox).toEqual({
          minX: 5,
          minY: 5,
          maxX: 20,
          maxY: 25,
        });
      });
    });

    describe('distance', () => {
      it('should calculate Euclidean distance', () => {
        expect(distance([0, 0], [3, 4])).toBe(5);
        expect(distance([0, 0], [0, 0])).toBe(0);
        expect(distance([1, 1], [4, 5])).toBe(5);
      });
    });
  });

  describe('Point containment', () => {
    const region: PolygonRegion = {
      id: 'test',
      vertices: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0],
      ],
    };

    describe('isPointInRegion', () => {
      it('should return true for points inside', () => {
        expect(isPointInRegion([50, 50], region)).toBe(true);
        expect(isPointInRegion([1, 1], region)).toBe(true);
        expect(isPointInRegion([99, 99], region)).toBe(true);
      });

      it('should return false for points outside', () => {
        expect(isPointInRegion([-1, 50], region)).toBe(false);
        expect(isPointInRegion([101, 50], region)).toBe(false);
        expect(isPointInRegion([50, -1], region)).toBe(false);
        expect(isPointInRegion([50, 101], region)).toBe(false);
      });
    });

    describe('filterPointsInRegion', () => {
      it('should filter points to those inside polygon', () => {
        const points: Point2D[] = [
          [50, 50], // inside
          [-10, 50], // outside
          [99, 99], // inside
          [150, 50], // outside
        ];
        const filtered = filterPointsInRegion(points, region);
        expect(filtered).toHaveLength(2);
        expect(filtered).toContainEqual([50, 50]);
        expect(filtered).toContainEqual([99, 99]);
      });
    });
  });

  describe('Uniformity metrics', () => {
    it('should calculate lower uniformity metric for regular grid', () => {
      // Regular grid should have low coefficient of variation
      const gridPoints: Point2D[] = [];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          gridPoints.push([x * 10, y * 10]);
        }
      }
      const uniformity = calculateUniformityMetric(gridPoints);
      expect(uniformity).toBeLessThan(0.5);
    });

    it('should return 0 for single point', () => {
      expect(calculateUniformityMetric([[0, 0]])).toBe(0);
    });

    it('should return 0 for empty set', () => {
      expect(calculateUniformityMetric([])).toBe(0);
    });
  });

  describe('createRectangleRegion', () => {
    it('should create a valid polygon from rectangle parameters', () => {
      const region = createRectangleRegion('test', 10, 20, 30, 40);

      expect(region.id).toBe('test');
      expect(region.vertices).toHaveLength(5); // Closed ring
      expect(region.vertices[0]).toEqual([10, 20]);
      expect(region.vertices[1]).toEqual([40, 20]);
      expect(region.vertices[2]).toEqual([40, 60]);
      expect(region.vertices[3]).toEqual([10, 60]);
      expect(region.vertices[4]).toEqual([10, 20]); // Closed
    });
  });

  describe('createRectangleRegion integration', () => {
    it('should create usable region for pip distribution', () => {
      const region = createRectangleRegion('test', 10, 20, 80, 60);

      const result = distributePips(region, {
        targetCount: 10,
        seed: 12345,
      });

      // Should generate pips within the rectangle bounds
      expect(result.count).toBe(10);
      for (const [x, y] of result.positions) {
        expect(x).toBeGreaterThanOrEqual(10);
        expect(x).toBeLessThanOrEqual(90);
        expect(y).toBeGreaterThanOrEqual(20);
        expect(y).toBeLessThanOrEqual(80);
      }
    });
  });
});
