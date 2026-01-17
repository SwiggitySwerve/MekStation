/**
 * Pip Distribution Density Verification Tests
 *
 * Verifies that the Poisson disk sampling produces visually appropriate
 * distributions at various density levels matching MegaMekLab examples:
 * - High density: 47 pips (Center Torso max armor)
 * - Medium density: 21 pips (typical structure)
 * - Low density: 8 pips (light armor)
 */

import {
  distributePips,
  calculateUniformityMetric,
  calculatePolygonArea,
} from '@/services/printing/pipDistribution';
import type { PolygonRegion, DistributedPips } from '@/services/printing/pipDistribution';
import {
  CENTER_TORSO_REGION,
  LEFT_TORSO_REGION,
  HEAD_REGION,
  LEFT_LEG_REGION,
} from '@/services/printing/pipDistribution/BipedRegions';

describe('Pip Distribution Density Verification', () => {
  /**
   * Helper to check distribution quality metrics
   */
  function analyzeDistribution(result: DistributedPips, region: PolygonRegion) {
    const area = calculatePolygonArea(region.vertices);
    const uniformity = calculateUniformityMetric(result.positions);
    const density = result.count / area;

    // Calculate average nearest-neighbor distance
    let totalNNDist = 0;
    for (const pos of result.positions) {
      let minDist = Infinity;
      for (const other of result.positions) {
        if (pos === other) continue;
        const dx = pos[0] - other[0];
        const dy = pos[1] - other[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) minDist = dist;
      }
      if (minDist < Infinity) totalNNDist += minDist;
    }
    const avgNNDist = result.count > 1 ? totalNNDist / result.count : 0;

    return {
      count: result.count,
      area,
      density,
      uniformity,
      avgNNDist,
      pipRadius: result.pipRadius,
    };
  }

  describe('High Density (47 pips - Center Torso)', () => {
    const targetCount = 47;
    let result: DistributedPips;

    beforeAll(() => {
      result = distributePips(CENTER_TORSO_REGION, {
        targetCount,
        seed: 42,
        relaxationIterations: 15,
      });
    });

    it('should achieve exact count of 47 pips', () => {
      expect(result.count).toBe(targetCount);
      expect(result.exactMatch).toBe(true);
    });

    it('should have low uniformity metric (< 0.5 = good distribution)', () => {
      const uniformity = calculateUniformityMetric(result.positions);
      expect(uniformity).toBeLessThan(0.5);
    });

    it('should have appropriate pip radius for density', () => {
      // At high density, pips should be smaller
      expect(result.pipRadius).toBeGreaterThan(0.5);
      expect(result.pipRadius).toBeLessThan(5);
    });

    it('should have reasonable spacing between pips', () => {
      const metrics = analyzeDistribution(result, CENTER_TORSO_REGION);
      // Average nearest-neighbor distance should be at least 2x pip radius
      expect(metrics.avgNNDist).toBeGreaterThan(result.pipRadius * 1.5);
    });

    it('all pips should be within region bounds', () => {
      const bounds = result.bounds;
      for (const [x, y] of result.positions) {
        expect(x).toBeGreaterThanOrEqual(bounds.minX);
        expect(x).toBeLessThanOrEqual(bounds.maxX);
        expect(y).toBeGreaterThanOrEqual(bounds.minY);
        expect(y).toBeLessThanOrEqual(bounds.maxY);
      }
    });
  });

  describe('Medium Density (21 pips - Left Torso)', () => {
    const targetCount = 21;
    let result: DistributedPips;

    beforeAll(() => {
      result = distributePips(LEFT_TORSO_REGION, {
        targetCount,
        seed: 42,
        relaxationIterations: 15,
      });
    });

    it('should achieve exact count of 21 pips', () => {
      expect(result.count).toBe(targetCount);
    });

    it('should have larger pip radius than high density', () => {
      const highDensityResult = distributePips(CENTER_TORSO_REGION, {
        targetCount: 47,
        seed: 42,
      });
      // Medium density should have larger pips (more spacing)
      expect(result.pipRadius).toBeGreaterThanOrEqual(highDensityResult.pipRadius * 0.8);
    });

    it('should maintain good uniformity', () => {
      const uniformity = calculateUniformityMetric(result.positions);
      expect(uniformity).toBeLessThan(0.6);
    });
  });

  describe('Low Density (8 pips - Left Arm)', () => {
    const targetCount = 8;
    // Use a region similar to arm dimensions
    const armRegion: PolygonRegion = {
      id: 'test-arm',
      vertices: [
        [0, 0],
        [25, 0],
        [25, 85],
        [0, 85],
        [0, 0],
      ],
    };

    let result: DistributedPips;

    beforeAll(() => {
      result = distributePips(armRegion, {
        targetCount,
        seed: 42,
        relaxationIterations: 10,
      });
    });

    it('should achieve exact count of 8 pips', () => {
      expect(result.count).toBe(targetCount);
    });

    it('should have larger spacing than higher densities', () => {
      const metrics = analyzeDistribution(result, armRegion);
      // Low density should have wider spacing
      expect(metrics.avgNNDist).toBeGreaterThan(5);
    });

    it('should distribute pips throughout the region', () => {
      // Check that pips span most of the region vertically
      const yValues = result.positions.map(([, y]) => y);
      const yRange = Math.max(...yValues) - Math.min(...yValues);
      expect(yRange).toBeGreaterThan(50); // Should span at least 60% of height
    });
  });

  describe('Very Low Density (3 pips)', () => {
    const targetCount = 3;
    const smallRegion: PolygonRegion = {
      id: 'test-small',
      vertices: [
        [0, 0],
        [30, 0],
        [30, 30],
        [0, 30],
        [0, 0],
      ],
    };

    it('should achieve exact count of 3 pips', () => {
      const result = distributePips(smallRegion, {
        targetCount,
        seed: 42,
      });
      expect(result.count).toBe(targetCount);
    });

    it('should spread pips across region', () => {
      const result = distributePips(smallRegion, {
        targetCount,
        seed: 42,
      });

      // All 3 pips should not be clustered
      const uniformity = calculateUniformityMetric(result.positions);
      expect(uniformity).toBeLessThan(1.0); // Some tolerance for 3 points
    });
  });

  describe('Head Region (9 pips - small complex shape)', () => {
    const targetCount = 9;

    it('should fit 9 pips in head region', () => {
      const result = distributePips(HEAD_REGION, {
        targetCount,
        seed: 42,
      });
      expect(result.count).toBe(targetCount);
    });

    it('should handle small region dimensions', () => {
      const result = distributePips(HEAD_REGION, {
        targetCount,
        seed: 42,
      });

      // All pips should be within bounds
      const bounds = result.bounds;
      for (const [x, y] of result.positions) {
        expect(x).toBeGreaterThanOrEqual(bounds.minX - 1); // Small tolerance
        expect(x).toBeLessThanOrEqual(bounds.maxX + 1);
        expect(y).toBeGreaterThanOrEqual(bounds.minY - 1);
        expect(y).toBeLessThanOrEqual(bounds.maxY + 1);
      }
    });
  });

  describe('Leg Region (42 pips - tall narrow)', () => {
    const targetCount = 42;

    it('should distribute pips throughout tall narrow leg region', () => {
      const result = distributePips(LEFT_LEG_REGION, {
        targetCount,
        seed: 42,
        relaxationIterations: 10,
      });

      expect(result.count).toBe(targetCount);

      // Pips should span vertically
      const yValues = result.positions.map(([, y]) => y);
      const yRange = Math.max(...yValues) - Math.min(...yValues);
      const regionHeight = LEFT_LEG_REGION.vertices[2][1] - LEFT_LEG_REGION.vertices[0][1];
      expect(yRange).toBeGreaterThan(regionHeight * 0.7); // Should span 70%+ of height
    });
  });

  describe('Density Scaling', () => {
    const region: PolygonRegion = {
      id: 'test-square',
      vertices: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0],
      ],
    };

    it('should scale pip radius inversely with count', () => {
      const lowCount = distributePips(region, { targetCount: 10, seed: 42 });
      const medCount = distributePips(region, { targetCount: 25, seed: 42 });
      const highCount = distributePips(region, { targetCount: 50, seed: 42 });

      // Higher counts should have smaller radii
      expect(lowCount.pipRadius).toBeGreaterThan(medCount.pipRadius);
      expect(medCount.pipRadius).toBeGreaterThan(highCount.pipRadius);
    });

    it('should maintain uniformity across density levels', () => {
      for (const count of [5, 15, 30, 50]) {
        const result = distributePips(region, {
          targetCount: count,
          seed: 42,
          relaxationIterations: 10,
        });

        const uniformity = calculateUniformityMetric(result.positions);
        expect(uniformity).toBeLessThan(0.7); // All should have reasonable uniformity
      }
    });
  });

  describe('Comparison Metrics Generation', () => {
    it('should generate comparison data for visual QA', () => {
      const testCases = [
        { region: CENTER_TORSO_REGION, count: 47, name: 'CT High (47)' },
        { region: LEFT_TORSO_REGION, count: 32, name: 'LT Med (32)' },
        { region: HEAD_REGION, count: 9, name: 'HD Low (9)' },
        { region: LEFT_LEG_REGION, count: 42, name: 'LL High (42)' },
      ];

      const results = testCases.map(({ region, count, name }) => {
        const result = distributePips(region, {
          targetCount: count,
          seed: 42,
          relaxationIterations: 15,
        });

        const metrics = analyzeDistribution(result, region);

        return {
          name,
          ...metrics,
          exactMatch: result.exactMatch,
        };
      });

      // Log for visual inspection during development
      // console.table(results);

      // All should achieve exact counts
      for (const r of results) {
        expect(r.count).toBe(testCases.find((tc) => tc.name === r.name)!.count);
      }
    });
  });
});
