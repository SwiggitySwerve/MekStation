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
  INERT_ADVANCED_PARAMETERS,
  INERT_COORDINATION_PARAMETERS,
  INERT_RESOURCE_PARAMETERS,
  getTierParameters,
  resolveAdvancedParameters,
  resolveCoordinationParameters,
  resolveResourceParameters,
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

  // ===========================================================================
  // `add-ai-resource-planning` (A2) — Requirement: Resource-Planning Tier
  // Parameters. Scenarios "Every tier resolves a resource block" and
  // "Lower tiers disable resource planning".
  // ===========================================================================
  describe('resource block — every tier resolves a populated record', () => {
    it.each(ALL_TIERS)('tier %s resolves to a resource block', (tier) => {
      const params = getTierParameters(tier);
      const resource = resolveResourceParameters(params);
      expect(resource).toBeDefined();
      expect(typeof resource.heatLookaheadTurns).toBe('number');
      expect(typeof resource.ammoConservationWeight).toBe('number');
      expect(typeof resource.critSeekingWeight).toBe('number');
      expect(typeof resource.weaponModeSelection).toBe('boolean');
    });

    it('every registry entry populates the resource field directly', () => {
      for (const tier of ALL_TIERS) {
        expect(AI_TIER_REGISTRY[tier].resource).toBeDefined();
      }
    });
  });

  describe('resource block — lower tiers disable resource planning', () => {
    it.each(['Green', 'Regular'] as const)(
      'tier %s is fully inert (zeroed weights, no lookahead, no modes)',
      (tier) => {
        const r = resolveResourceParameters(getTierParameters(tier));
        expect(r.heatLookaheadTurns).toBe(0);
        expect(r.ammoConservationWeight).toBe(0);
        expect(r.critSeekingWeight).toBe(0);
        expect(r.weaponModeSelection).toBe(false);
      },
    );
  });

  describe('resource block — Veteran/Elite are populated and active', () => {
    it.each(['Veteran', 'Elite'] as const)(
      'tier %s has an active resource block',
      (tier) => {
        const r = resolveResourceParameters(getTierParameters(tier));
        expect(r.heatLookaheadTurns).toBeGreaterThan(0);
        expect(r.ammoConservationWeight).toBeGreaterThan(0);
        expect(r.critSeekingWeight).toBeGreaterThan(0);
        expect(r.weaponModeSelection).toBe(true);
      },
    );

    it('Elite weights every resource term at least as heavily as Veteran', () => {
      const v = resolveResourceParameters(getTierParameters('Veteran'));
      const e = resolveResourceParameters(getTierParameters('Elite'));
      expect(e.heatLookaheadTurns).toBeGreaterThanOrEqual(v.heatLookaheadTurns);
      expect(e.ammoConservationWeight).toBeGreaterThanOrEqual(
        v.ammoConservationWeight,
      );
      expect(e.critSeekingWeight).toBeGreaterThanOrEqual(v.critSeekingWeight);
    });
  });

  describe('resolveResourceParameters — fallback for pre-A2 records', () => {
    it('returns the inert block when a record has no resource field', () => {
      const legacyRecord = { tier: 'Veteran', movement: {} } as never;
      const r = resolveResourceParameters(legacyRecord);
      expect(r).toBe(INERT_RESOURCE_PARAMETERS);
      expect(r.heatLookaheadTurns).toBe(0);
      expect(r.weaponModeSelection).toBe(false);
    });
  });

  describe('A2 registration is additive — movement block untouched', () => {
    it.each(ALL_TIERS)(
      'tier %s movement block matches its A1 values',
      (tier) => {
        // The movement block must be byte-identical to A1 — A2 only ADDs
        // the `resource` block.
        const m = getTierParameters(tier).movement;
        const pathfinderTier = tier === 'Veteran' || tier === 'Elite';
        expect(m.pathfinderEnabled).toBe(pathfinderTier);
      },
    );
  });

  // ===========================================================================
  // `add-ai-coordination-tactics` (A3a) — Requirement: Coordination Tier
  // Parameters. Scenarios "Every tier resolves a coordination block" and
  // "Veteran tier excludes coordination".
  // ===========================================================================
  describe('coordination block — every tier resolves a populated record', () => {
    it.each(ALL_TIERS)('tier %s resolves to a coordination block', (tier) => {
      const c = resolveCoordinationParameters(getTierParameters(tier));
      expect(c).toBeDefined();
      expect(typeof c.lanceCoordination).toBe('boolean');
      expect(typeof c.cohesionRadius).toBe('number');
      expect(typeof c.cohesionWeight).toBe('number');
      expect(typeof c.focusFireWeight).toBe('number');
    });

    it('every registry entry populates the coordination field directly', () => {
      for (const tier of ALL_TIERS) {
        expect(AI_TIER_REGISTRY[tier].coordination).toBeDefined();
      }
    });
  });

  describe('coordination block — Green/Regular/Veteran are fully inert', () => {
    it.each(['Green', 'Regular', 'Veteran'] as const)(
      'tier %s disables coordination with zeroed weights',
      (tier) => {
        const c = resolveCoordinationParameters(getTierParameters(tier));
        expect(c.lanceCoordination).toBe(false);
        expect(c.cohesionRadius).toBe(0);
        expect(c.cohesionWeight).toBe(0);
        expect(c.focusFireWeight).toBe(0);
      },
    );

    it('Veteran stays exactly A1+A2 depth — coordination disabled', () => {
      // Per design D5: `Veteran` must remain exactly the depth of the
      // movement + resource blocks, with no coordination behavior.
      const veteran = getTierParameters('Veteran');
      expect(resolveCoordinationParameters(veteran).lanceCoordination).toBe(
        false,
      );
      // A1 + A2 blocks are still active on Veteran (proves "A1+A2 depth").
      expect(veteran.movement.pathfinderEnabled).toBe(true);
      expect(resolveResourceParameters(veteran).heatLookaheadTurns).toBe(3);
    });
  });

  describe('coordination block — Elite is populated and active', () => {
    it('Elite enables lance coordination with active weights', () => {
      const c = resolveCoordinationParameters(getTierParameters('Elite'));
      expect(c.lanceCoordination).toBe(true);
      expect(c.cohesionRadius).toBeGreaterThan(0);
      expect(c.cohesionWeight).toBeGreaterThan(0);
      expect(c.focusFireWeight).toBeGreaterThan(0);
    });
  });

  describe('resolveCoordinationParameters — fallback for pre-A3a records', () => {
    it('returns the inert block when a record has no coordination field', () => {
      const legacyRecord = { tier: 'Elite', movement: {} } as never;
      const c = resolveCoordinationParameters(legacyRecord);
      expect(c).toBe(INERT_COORDINATION_PARAMETERS);
      expect(c.lanceCoordination).toBe(false);
    });
  });

  describe('A3a registration is additive — movement/resource untouched', () => {
    it.each(ALL_TIERS)(
      'tier %s movement and resource blocks match their A1/A2 values',
      (tier) => {
        // A3a only ADDs the `coordination` block — the movement and resource
        // blocks must be byte-identical to A1 / A2.
        const params = getTierParameters(tier);
        const pathfinderTier = tier === 'Veteran' || tier === 'Elite';
        expect(params.movement.pathfinderEnabled).toBe(pathfinderTier);
        const resourceActive = tier === 'Veteran' || tier === 'Elite';
        expect(resolveResourceParameters(params).heatLookaheadTurns > 0).toBe(
          resourceActive,
        );
      },
    );
  });

  // ===========================================================================
  // `add-ai-advanced-systems` (A4) — Requirement: Advanced-Systems Tier
  // Parameters. Scenarios "Every tier resolves an advanced block" and
  // "Lower tiers ignore advanced systems".
  // ===========================================================================
  describe('advanced block — every tier resolves a populated record', () => {
    it.each(ALL_TIERS)('tier %s resolves to an advanced block', (tier) => {
      const a = resolveAdvancedParameters(getTierParameters(tier));
      expect(a).toBeDefined();
      expect(typeof a.advancedSystems).toBe('boolean');
      expect(typeof a.jumpTacticsWeight).toBe('number');
      expect(typeof a.ecmAvoidanceWeight).toBe('number');
      expect(typeof a.ecmCoverageWeight).toBe('number');
      expect(typeof a.visionWeight).toBe('number');
    });

    it('every registry entry populates the advanced field directly', () => {
      for (const tier of ALL_TIERS) {
        expect(AI_TIER_REGISTRY[tier].advanced).toBeDefined();
      }
    });
  });

  describe('advanced block — Green/Regular/Veteran are fully inert', () => {
    it.each(['Green', 'Regular', 'Veteran'] as const)(
      'tier %s disables advanced systems with zeroed weights',
      (tier) => {
        const a = resolveAdvancedParameters(getTierParameters(tier));
        expect(a.advancedSystems).toBe(false);
        expect(a.jumpTacticsWeight).toBe(0);
        expect(a.ecmAvoidanceWeight).toBe(0);
        expect(a.ecmCoverageWeight).toBe(0);
        expect(a.visionWeight).toBe(0);
      },
    );

    it('Veteran keeps the flat-roll jump behavior — advanced disabled', () => {
      const veteran = getTierParameters('Veteran');
      expect(resolveAdvancedParameters(veteran).advancedSystems).toBe(false);
    });
  });

  describe('advanced block — Elite is populated and active', () => {
    it('Elite enables advanced systems with non-zero weights', () => {
      const a = resolveAdvancedParameters(getTierParameters('Elite'));
      expect(a.advancedSystems).toBe(true);
      expect(a.jumpTacticsWeight).toBeGreaterThan(0);
      expect(a.ecmAvoidanceWeight).toBeGreaterThan(0);
      expect(a.ecmCoverageWeight).toBeGreaterThan(0);
      expect(a.visionWeight).toBeGreaterThan(0);
    });
  });

  describe('resolveAdvancedParameters — fallback for pre-A4 records', () => {
    it('returns the inert block when a record has no advanced field', () => {
      const legacyRecord = { tier: 'Elite', movement: {} } as never;
      const a = resolveAdvancedParameters(legacyRecord);
      expect(a).toBe(INERT_ADVANCED_PARAMETERS);
      expect(a.advancedSystems).toBe(false);
    });
  });

  describe('A4 registration is additive — earlier blocks untouched', () => {
    it.each(ALL_TIERS)(
      'tier %s movement/resource/coordination blocks are unchanged',
      (tier) => {
        // A4 only ADDs the `advanced` block — the movement, resource, and
        // coordination blocks must be byte-identical to A1 / A2 / A3a.
        const params = getTierParameters(tier);
        const pathfinderTier = tier === 'Veteran' || tier === 'Elite';
        expect(params.movement.pathfinderEnabled).toBe(pathfinderTier);
        const resourceActive = tier === 'Veteran' || tier === 'Elite';
        expect(resolveResourceParameters(params).heatLookaheadTurns > 0).toBe(
          resourceActive,
        );
        const coordinationActive = tier === 'Elite';
        expect(resolveCoordinationParameters(params).lanceCoordination).toBe(
          coordinationActive,
        );
      },
    );
  });
});
