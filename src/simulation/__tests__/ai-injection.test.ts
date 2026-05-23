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

import { GameEventType, MovementType } from '@/types/gameplay';

import type { IAIPlayer, IAIUnitState, IMovementEvent } from '../ai/IAIPlayer';

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
  class IllegalMoveAIPlayer implements IAIPlayer {
    evaluateRetreat() {
      return null;
    }
    playMovementPhase(unit: IAIUnitState): IMovementEvent {
      return {
        type: GameEventType.MovementDeclared,
        payload: {
          unitId: unit.unitId,
          from: unit.position,
          to: { q: unit.position.q + 5, r: unit.position.r },
          facing: unit.facing,
          movementType: MovementType.Walk,
          mpUsed: 1,
          heatGenerated: 0,
        },
      };
    }
    playAttackPhase() {
      return null;
    }
    playPhysicalAttackPhase() {
      return null;
    }
  }

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

  describe('Injected movement proposals are engine-validated', () => {
    it('emits MovementInvalid instead of MovementDeclared for impossible movement', () => {
      const runner = new SimulationRunner(
        BASE_CONFIG.seed,
        undefined,
        undefined,
        () => new IllegalMoveAIPlayer(),
      );

      const result = runner.run({
        ...BASE_CONFIG,
        turnLimit: 1,
        unitCount: { player: 1, opponent: 0 },
      });

      const declared = result.events.filter(
        (event) => event.type === GameEventType.MovementDeclared,
      );
      const invalid = result.events.filter(
        (event) => event.type === GameEventType.MovementInvalid,
      );

      expect(declared).toHaveLength(0);
      expect(invalid).toHaveLength(1);
      expect(invalid[0].payload).toMatchObject({
        unitId: 'player-1',
        reason: 'InsufficientMP',
      });
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

  // ---------------------------------------------------------------------------
  // Spec Fix 2 — aiPlayerFactoryBySide constructor option
  //
  // Spec scenario "Side-keyed factory yields different AI per side": when the
  // runner is constructed with `aiPlayerFactoryBySide: { A, B }`, side A units
  // (`player-*`) MUST be driven by the A factory and side B units
  // (`opponent-*`) MUST be driven by the B factory. Implementation wraps the
  // two factories via `SideKeyedAIPlayer`.
  // ---------------------------------------------------------------------------
  describe('aiPlayerFactoryBySide constructor option', () => {
    /**
     * No-op IAIPlayer that records the unitId passed to playMovementPhase so
     * tests can assert which side-specific factory produced the player driving
     * each unit. All decision methods return null so the run is otherwise inert.
     */
    class RecordingAIPlayer implements IAIPlayer {
      constructor(private readonly recordTo: string[]) {}
      evaluateRetreat() {
        return null;
      }
      playMovementPhase(unit: IAIUnitState) {
        this.recordTo.push(unit.unitId);
        return null;
      }
      playAttackPhase() {
        return null;
      }
      playPhysicalAttackPhase() {
        return null;
      }
    }

    it('routes side A and side B units to their respective factories', () => {
      const sideACalls: string[] = [];
      const sideBCalls: string[] = [];

      const runner = new SimulationRunner(
        BASE_CONFIG.seed,
        undefined,
        undefined,
        undefined,
        {
          A: () => new RecordingAIPlayer(sideACalls),
          B: () => new RecordingAIPlayer(sideBCalls),
        },
      );

      runner.run(BASE_CONFIG);

      // Side A factory must have only seen "player-*" unit ids.
      expect(sideACalls.length).toBeGreaterThan(0);
      for (const id of sideACalls) {
        expect(id.startsWith('player-')).toBe(true);
      }
      // Side B factory must have only seen "opponent-*" unit ids.
      expect(sideBCalls.length).toBeGreaterThan(0);
      for (const id of sideBCalls) {
        expect(id.startsWith('opponent-')).toBe(true);
      }
    });

    it('aiPlayerFactoryBySide takes precedence over aiPlayerFactory when both supplied', () => {
      const sideACalls: string[] = [];
      const sideBCalls: string[] = [];
      const fallbackCalls: string[] = [];

      const runner = new SimulationRunner(
        BASE_CONFIG.seed,
        undefined,
        undefined,
        // Single-factory path — should be ignored when aiPlayerFactoryBySide is set.
        () => new RecordingAIPlayer(fallbackCalls),
        {
          A: () => new RecordingAIPlayer(sideACalls),
          B: () => new RecordingAIPlayer(sideBCalls),
        },
      );

      runner.run(BASE_CONFIG);

      // Single factory should never see calls — bySide wins.
      expect(fallbackCalls).toHaveLength(0);
      expect(sideACalls.length + sideBCalls.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Spec Fix 3 — schemaVersion: 1 stamped on the default (non-swarm) run path
  //
  // Spec scenario "Schema version preserved on existing path": SimulationRunner
  // SHALL stamp `schemaVersion: 1` on every result returned by `run()` when
  // no participants payload is present. BatchRunner.runBatch overrides this to
  // `schemaVersion: 2` when participants are supplied (Phase 4); that override
  // path is unchanged.
  // ---------------------------------------------------------------------------
  describe('schemaVersion stamp', () => {
    it('SimulationRunner.run() stamps schemaVersion: 1 on the result', () => {
      const runner = new SimulationRunner(BASE_CONFIG.seed);
      const result = runner.run(BASE_CONFIG);
      expect(result.schemaVersion).toBe(1);
    });
  });
});
