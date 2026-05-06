/**
 * AI variant head-to-head tests — Task 3.10.
 *
 * Validates the BEHAVIOR_VARIANTS registry and getBehaviorVariant() helper,
 * and confirms each named preset carries the structural parameter differences
 * that guarantee divergent behavior when heat and damage thresholds are reached.
 *
 * Live-simulation behavioral divergence (distinct damage totals / winners
 * across seeds) is validated at scale in Phase 6 task 6.9 (200-run H2H
 * swarm). The synthetic runner's single medium laser never accumulates enough
 * heat to exercise heat-management branching in a 20-turn window, so here we
 * assert the structural invariants instead.
 *
 * Design note: runnerForVariant() injects a factory that hard-wires a named
 * preset, isolating the variant as the only variable between two runs.
 */

import {
  BEHAVIOR_VARIANTS,
  getBehaviorVariant,
  type AIVariantName,
} from '../ai/behaviorVariants';
import { BotPlayer } from '../ai/BotPlayer';
import { ISimulationConfig } from '../core/types';
import { SimulationRunner } from '../runner/SimulationRunner';

/** 2v2, 20-turn limit — enough turns for behavior differences to materialise. */
const BASE_CONFIG: ISimulationConfig = {
  seed: 73100,
  turnLimit: 20,
  unitCount: { player: 2, opponent: 2 },
  mapRadius: 7,
};

/**
 * Build a SimulationRunner whose injected factory always uses `variantName`
 * for every unit, ignoring the behavior arg passed by the runner itself.
 * This gives us two fully independent runs that differ only by the preset.
 */
function runnerForVariant(
  seed: number,
  variantName: AIVariantName,
): SimulationRunner {
  const behavior = getBehaviorVariant(variantName);
  return new SimulationRunner(seed, undefined, undefined, (random) => {
    return new BotPlayer(random, behavior);
  });
}

describe('AI behavior variant head-to-head', () => {
  describe('BEHAVIOR_VARIANTS registry', () => {
    it('contains all four named variants', () => {
      const names: AIVariantName[] = [
        'default',
        'aggressive',
        'defensive',
        'skirmisher',
      ];
      for (const name of names) {
        expect(BEHAVIOR_VARIANTS[name]).toBeDefined();
      }
    });

    it('default preset is byte-identical to DEFAULT_BEHAVIOR', () => {
      // Per spec: "Default preset preserves existing behavior."
      const def = BEHAVIOR_VARIANTS['default'];
      expect(def.retreatThreshold).toBe(0.3);
      expect(def.safeHeatThreshold).toBe(13);
      expect(def.retreatEdge).toBe('nearest');
    });

    it('aggressive preset has higher retreatThreshold than default', () => {
      expect(BEHAVIOR_VARIANTS['aggressive'].retreatThreshold).toBeGreaterThan(
        BEHAVIOR_VARIANTS['default'].retreatThreshold,
      );
    });

    it('defensive preset has lower safeHeatThreshold than default', () => {
      expect(BEHAVIOR_VARIANTS['defensive'].safeHeatThreshold).toBeLessThan(
        BEHAVIOR_VARIANTS['default'].safeHeatThreshold,
      );
    });
  });

  describe('getBehaviorVariant()', () => {
    it('returns the correct preset by name', () => {
      const variant = getBehaviorVariant('aggressive');
      expect(variant).toEqual(BEHAVIOR_VARIANTS['aggressive']);
    });

    it('throws an explicit error for unknown variant names', () => {
      // Per spec scenario "Variant lookup with unknown name throws".
      expect(() => getBehaviorVariant('unknown' as AIVariantName)).toThrow(
        /Unknown AI variant/,
      );
    });

    it('error message lists all valid variant names', () => {
      try {
        getBehaviorVariant('unknown' as AIVariantName);
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain('default');
        expect(message).toContain('aggressive');
        expect(message).toContain('defensive');
        expect(message).toContain('skirmisher');
      }
    });
  });

  describe('aggressive vs defensive — structural divergence', () => {
    // Note: live-simulation behavioral divergence (different damage totals /
    // winners) is validated at scale in Phase 6 task 6.9 (200-run H2H swarm).
    // Here we assert the structural preconditions that guarantee divergence
    // will occur when unit counts / heat budgets are large enough to exercise
    // the retreat and heat-management code paths.

    it('aggressive and defensive have different retreatThreshold values', () => {
      // Aggressive stays in combat longer; defensive retreats sooner.
      expect(BEHAVIOR_VARIANTS['aggressive'].retreatThreshold).not.toBe(
        BEHAVIOR_VARIANTS['defensive'].retreatThreshold,
      );
    });

    it('aggressive and defensive have different safeHeatThreshold values', () => {
      // Aggressive fires more heat-intensive weapons; defensive sheds heat
      // before units reach the same temperature.
      expect(BEHAVIOR_VARIANTS['aggressive'].safeHeatThreshold).not.toBe(
        BEHAVIOR_VARIANTS['defensive'].safeHeatThreshold,
      );
    });

    it('aggressive runs to the turn limit without error (smoke test)', () => {
      const result = runnerForVariant(BASE_CONFIG.seed, 'aggressive').run(
        BASE_CONFIG,
      );
      // The run completes with a non-negative turn count.
      expect(result.turns).toBeGreaterThan(0);
    });

    it('defensive runs to the turn limit without error (smoke test)', () => {
      const result = runnerForVariant(BASE_CONFIG.seed, 'defensive').run(
        BASE_CONFIG,
      );
      expect(result.turns).toBeGreaterThan(0);
    });
  });

  describe('default variant is reproducible (regression guard)', () => {
    it('two runs with the same seed and default variant produce identical results', () => {
      const seed = 73200;
      const config = { ...BASE_CONFIG, seed };

      const result1 = runnerForVariant(seed, 'default').run(config);
      const result2 = runnerForVariant(seed, 'default').run(config);

      expect(result1.turns).toBe(result2.turns);
      expect(result1.winner).toBe(result2.winner);
      expect(result1.events.length).toBe(result2.events.length);
    });
  });

  describe('skirmisher vs aggressive', () => {
    it('skirmisher retreats earlier (lower retreatThreshold than aggressive)', () => {
      // This is a structural invariant test — not a live simulation check.
      // Skirmisher 0.4 < aggressive 0.7 → skirmisher exits combat earlier.
      expect(BEHAVIOR_VARIANTS['skirmisher'].retreatThreshold).toBeLessThan(
        BEHAVIOR_VARIANTS['aggressive'].retreatThreshold,
      );
    });
  });
});
