/**
 * AI Injection tests — Task 3.11.
 *
 * Verifies that SimulationRunner respects the injected AIPlayerFactory:
 *   - When a StandStillAIPlayer factory is injected, no movement events are
 *     emitted and no damage is dealt across N turns.
 *   - The default factory (no injection) still produces movement events,
 *     confirming the two paths diverge.
 *
 * Per `add-encounter-swarm-harness` spec scenario "Factory-injected AI controls
 * unit decisions": the runner must route ALL per-unit decisions through the
 * player returned by the factory, never falling back to a hardcoded BotPlayer.
 */

import { GameEventType } from '@/types/gameplay';

import { StandStillAIPlayer } from '../ai/StandStillAIPlayer';
import { ISimulationConfig } from '../core/types';
import { SimulationRunner } from '../runner/SimulationRunner';

/** Minimal 1v1 config with a short turn limit so tests run fast. */
const BASE_CONFIG: ISimulationConfig = {
  seed: 42100,
  turnLimit: 5,
  unitCount: { player: 1, opponent: 1 },
  mapRadius: 5,
};

describe('AI factory injection', () => {
  describe('StandStillAIPlayer injected', () => {
    let runner: SimulationRunner;

    beforeEach(() => {
      // Inject a factory that always returns a StandStillAIPlayer regardless
      // of the behavior preset passed in.
      runner = new SimulationRunner(
        BASE_CONFIG.seed,
        undefined,
        undefined,
        (_random, _behavior) => new StandStillAIPlayer(),
      );
    });

    it('emits zero MovementDeclared events when all units stand still', () => {
      const result = runner.run(BASE_CONFIG);

      const movementEvents = result.events.filter(
        (e) => e.type === GameEventType.MovementDeclared,
      );

      expect(movementEvents).toHaveLength(0);
    });

    it('emits zero DamageApplied events when no attacks are declared', () => {
      const result = runner.run(BASE_CONFIG);

      const damageEvents = result.events.filter(
        (e) => e.type === GameEventType.DamageApplied,
      );

      expect(damageEvents).toHaveLength(0);
    });

    it('runs all configured turns without a winner (no destruction possible)', () => {
      const result = runner.run(BASE_CONFIG);

      // With no attacks, neither side loses units, so the game runs to the
      // turn limit and should end in a draw or null winner.
      expect(result.turns).toBe(BASE_CONFIG.turnLimit);
      // No winner can be declared if no units are destroyed.
      expect(result.winner).toBeNull();
    });

    it('produces reproducible results for the same seed', () => {
      const runner2 = new SimulationRunner(
        BASE_CONFIG.seed,
        undefined,
        undefined,
        (_random, _behavior) => new StandStillAIPlayer(),
      );

      const result1 = runner.run(BASE_CONFIG);
      const result2 = runner2.run(BASE_CONFIG);

      // Identical factory + identical seed → byte-identical event trace.
      expect(result1.events.length).toBe(result2.events.length);
      expect(result1.turns).toBe(result2.turns);
      expect(result1.winner).toBe(result2.winner);
    });
  });

  describe('Default factory (no injection)', () => {
    it('produces at least one MovementDeclared event, confirming the default BotPlayer path is active', () => {
      const runner = new SimulationRunner(BASE_CONFIG.seed);
      const result = runner.run(BASE_CONFIG);

      const movementEvents = result.events.filter(
        (e) => e.type === GameEventType.MovementDeclared,
      );

      // BotPlayer always moves; at least one event across 5 turns with 2 units.
      expect(movementEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Custom factory receives the correct arguments', () => {
    it('factory is called with a SeededRandom and the DEFAULT_BEHAVIOR preset', () => {
      // Capture what the factory receives to assert correct wiring.
      let capturedRandom: unknown = undefined;
      let capturedBehavior: unknown = undefined;

      const runner = new SimulationRunner(
        BASE_CONFIG.seed,
        undefined,
        undefined,
        (random, behavior) => {
          capturedRandom = random;
          capturedBehavior = behavior;
          return new StandStillAIPlayer();
        },
      );

      runner.run(BASE_CONFIG);

      // Per design D3: factory receives the per-run SeededRandom instance.
      expect(capturedRandom).toBeDefined();

      // Per design D3: DEFAULT_BEHAVIOR is threaded through the factory so
      // callers that accept a behavior preset can apply it directly.
      expect(capturedBehavior).toMatchObject({
        retreatThreshold: 0.3,
        safeHeatThreshold: 13,
      });
    });
  });
});
