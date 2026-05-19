/**
 * Tests for the AI Difficulty Tier Registry.
 *
 * Covers the `AI Difficulty Tier Registry` requirement of
 * `add-ai-terrain-aware-movement` — scenarios "Every tier resolves to a
 * parameter record", "Unknown tier name throws", "Default tier is Regular",
 * and the registry shape from design D3.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: AI Difficulty Tier Registry
 */

import type { AITierName } from '../ai/AITierRegistry';

import {
  AI_TIER_REGISTRY,
  DEFAULT_TIER_NAME,
  getTierParameters,
  resolveTierParameters,
} from '../ai/AITierRegistry';

const ALL_TIERS: AITierName[] = ['Green', 'Regular', 'Veteran', 'Elite'];

describe('AITierRegistry', () => {
  describe('getTierParameters — every tier resolves', () => {
    it.each(ALL_TIERS)(
      'tier %s resolves to a record with a populated movement block',
      (tier) => {
        const params = getTierParameters(tier);
        expect(params.tier).toBe(tier);
        expect(params.movement).toBeDefined();
        expect(typeof params.movement.pathfinderEnabled).toBe('boolean');
        expect(typeof params.movement.coverWeight).toBe('number');
        expect(typeof params.movement.losDenialWeight).toBe('number');
        expect(typeof params.movement.terrainCostWeight).toBe('number');
      },
    );
  });

  describe('getTierParameters — unknown tier throws', () => {
    it('throws an error naming the invalid tier and the valid tiers', () => {
      expect(() => getTierParameters('Legendary' as AITierName)).toThrow(
        /Legendary/,
      );
      expect(() => getTierParameters('Legendary' as AITierName)).toThrow(
        /Green/,
      );
      expect(() => getTierParameters('Legendary' as AITierName)).toThrow(
        /Regular/,
      );
      expect(() => getTierParameters('Legendary' as AITierName)).toThrow(
        /Veteran/,
      );
      expect(() => getTierParameters('Legendary' as AITierName)).toThrow(
        /Elite/,
      );
    });
  });

  describe('resolveTierParameters — default tier', () => {
    it('falls back to Regular when no tier name is supplied', () => {
      expect(resolveTierParameters(undefined).tier).toBe('Regular');
    });

    it('DEFAULT_TIER_NAME is Regular', () => {
      expect(DEFAULT_TIER_NAME).toBe('Regular');
    });

    it('returns the named tier when one is supplied', () => {
      expect(resolveTierParameters('Veteran').tier).toBe('Veteran');
      expect(resolveTierParameters('Elite').tier).toBe('Elite');
    });
  });

  describe('legacy tiers disable the pathfinder (design D4)', () => {
    it('Green has pathfinderEnabled false and zeroed weights', () => {
      const m = getTierParameters('Green').movement;
      expect(m.pathfinderEnabled).toBe(false);
      expect(m.coverWeight).toBe(0);
      expect(m.losDenialWeight).toBe(0);
      expect(m.terrainCostWeight).toBe(0);
    });

    it('Regular has pathfinderEnabled false and zeroed weights', () => {
      const m = getTierParameters('Regular').movement;
      expect(m.pathfinderEnabled).toBe(false);
      expect(m.coverWeight).toBe(0);
      expect(m.losDenialWeight).toBe(0);
      expect(m.terrainCostWeight).toBe(0);
    });
  });

  describe('pathfinder tiers enable the pathfinder (design D4)', () => {
    it('Veteran has pathfinderEnabled true with non-zero weights', () => {
      const m = getTierParameters('Veteran').movement;
      expect(m.pathfinderEnabled).toBe(true);
      expect(m.coverWeight).toBeGreaterThan(0);
      expect(m.losDenialWeight).toBeGreaterThan(0);
      expect(m.terrainCostWeight).toBeGreaterThan(0);
    });

    it('Elite has pathfinderEnabled true with non-zero weights', () => {
      const m = getTierParameters('Elite').movement;
      expect(m.pathfinderEnabled).toBe(true);
      expect(m.coverWeight).toBeGreaterThan(0);
      expect(m.losDenialWeight).toBeGreaterThan(0);
      expect(m.terrainCostWeight).toBeGreaterThan(0);
    });

    it('Elite weights every new term at least as heavily as Veteran', () => {
      const v = getTierParameters('Veteran').movement;
      const e = getTierParameters('Elite').movement;
      expect(e.coverWeight).toBeGreaterThanOrEqual(v.coverWeight);
      expect(e.losDenialWeight).toBeGreaterThanOrEqual(v.losDenialWeight);
      expect(e.terrainCostWeight).toBeGreaterThanOrEqual(v.terrainCostWeight);
    });
  });

  describe('registry is complete and frozen-shaped', () => {
    it('contains exactly the four canonical tiers', () => {
      expect(Object.keys(AI_TIER_REGISTRY).sort()).toEqual(
        ['Elite', 'Green', 'Regular', 'Veteran'].sort(),
      );
    });
  });
});
