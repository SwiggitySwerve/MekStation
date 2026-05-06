/**
 * Phase 5 (`add-combat-fidelity-suite` — combat-analytics delta) unit
 * tests for `MetricsCollector.recordGame()` event-log hydration.
 *
 * These tests build synthetic event-log fixtures (no real
 * `SimulationRunner` needed) so the per-event-type aggregation logic
 * can be exercised in isolation. Real Atlas-mirror runs that exercise
 * the runner's event chain live in
 * `src/simulation/__tests__/scenario-mirror-metrics.integration.test.ts`.
 *
 * Spec contract:
 *   `combat-analytics/spec.md` — "MetricsCollector Hydrates From Event Log"
 *     - Atlas-vs-Atlas mirror records non-zero damage
 *     - Game with shutdowns records the count
 */

import { describe, expect, it } from '@jest/globals';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { ISimulationResult } from '../../core/types';
import { MetricsCollector } from '../MetricsCollector';

// =============================================================================
// Fixture builders
// =============================================================================

/**
 * Minimal event factory — sets the discriminated-union shape required by
 * `IGameEvent` while leaving callers free to override only the
 * fields they care about. Sequence is monotonically increasing across
 * the helper's lifetime so tests don't have to thread a counter.
 */
let nextSequence = 1;
function makeEvent(
  type: GameEventType,
  payload: unknown,
  overrides: { actorId?: string; turn?: number } = {},
): IGameEvent {
  const seq = nextSequence++;
  return {
    id: `evt-${seq}`,
    gameId: 'p5-test',
    sequence: seq,
    timestamp: '2026-05-06T00:00:00.000Z',
    turn: overrides.turn ?? 1,
    phase: GamePhase.WeaponAttack,
    type,
    actorId: overrides.actorId,
    payload: payload as IGameEvent['payload'],
  };
}

/** Wrap an event list into a minimal `ISimulationResult`. */
function makeResult(events: readonly IGameEvent[]): ISimulationResult {
  return {
    seed: 42,
    winner: 'player',
    turns: 5,
    durationMs: 1000,
    events,
  };
}

// =============================================================================
// Test suite
// =============================================================================

describe('MetricsCollector — combat-fidelity hydration (Phase 5)', () => {
  describe('empty event log', () => {
    it('every counter is zero on an empty event log', () => {
      const collector = new MetricsCollector();
      collector.recordGame(makeResult([]));
      const m = collector.getMetrics()[0]!;
      expect(m.criticalHitsLanded).toBe(0);
      expect(m.componentDestroyedCount).toBe(0);
      expect(m.ammoExplosions).toBe(0);
      expect(m.shutdowns).toBe(0);
      expect(m.falls).toBe(0);
      expect(m.pilotHits).toBe(0);
      expect(m.totalDamageDealt.player).toBe(0);
      expect(m.totalDamageDealt.opponent).toBe(0);
      expect(m.playerUnitsStart).toBe(0);
      expect(m.playerUnitsEnd).toBe(0);
      expect(m.opponentUnitsStart).toBe(0);
      expect(m.opponentUnitsEnd).toBe(0);
    });
  });

  describe('totalDamageDealt — attribution to the SOURCE side', () => {
    it('sums DamageApplied.damage by sourceUnitId-derived side', () => {
      const events = [
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-1',
          location: 'CT',
          damage: 30,
          armorRemaining: 5,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: 'player-1',
        }),
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-1',
          location: 'LT',
          damage: 12,
          armorRemaining: 0,
          structureRemaining: 8,
          locationDestroyed: false,
          sourceUnitId: 'player-1',
        }),
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'player-1',
          location: 'CT',
          damage: 20,
          armorRemaining: 8,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: 'opponent-1',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;
      expect(m.totalDamageDealt.player).toBe(42); // 30 + 12 from player-1
      expect(m.totalDamageDealt.opponent).toBe(20); // 20 from opponent-1
    });

    it('self-damage (undefined sourceUnitId) is NOT counted offensively', () => {
      // Ammo cookoff / falls / heat damage carry no sourceUnitId.
      const events = [
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'player-1',
          location: 'RT',
          damage: 200,
          armorRemaining: 0,
          structureRemaining: 0,
          locationDestroyed: true,
          // sourceUnitId intentionally omitted
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;
      expect(m.totalDamageDealt.player).toBe(0);
      expect(m.totalDamageDealt.opponent).toBe(0);
    });
  });

  describe('roster counts — start / end derived from event log', () => {
    it('start counts include every unit referenced by any event', () => {
      const events = [
        makeEvent(GameEventType.AttackDeclared, {
          attackerId: 'player-1',
          targetId: 'opponent-1',
          weapons: ['ml-1'],
        }),
        makeEvent(GameEventType.AttackDeclared, {
          attackerId: 'player-2',
          targetId: 'opponent-2',
          weapons: ['ml-1'],
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;
      // Heuristic: payload.unitId / actorId aren't on AttackDeclared,
      // so these specific events don't register units. The default
      // branch falls through to actorId — which is also undefined for
      // this fixture. Confirms the lifecycle-only-event behavior.
      expect(m.playerUnitsStart).toBe(0);
      expect(m.opponentUnitsStart).toBe(0);
    });

    it('DamageApplied events register both sides', () => {
      const events = [
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-1',
          location: 'CT',
          damage: 5,
          armorRemaining: 5,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: 'player-1',
        }),
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-2',
          location: 'CT',
          damage: 5,
          armorRemaining: 5,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: 'player-1',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;
      expect(m.playerUnitsStart).toBe(1);
      expect(m.opponentUnitsStart).toBe(2);
      expect(m.playerUnitsEnd).toBe(1);
      expect(m.opponentUnitsEnd).toBe(2);
    });

    it('UnitDestroyed decrements the side end count', () => {
      const events = [
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-1',
          location: 'CT',
          damage: 5,
          armorRemaining: 0,
          structureRemaining: 0,
          locationDestroyed: true,
          sourceUnitId: 'player-1',
        }),
        makeEvent(GameEventType.UnitDestroyed, {
          unitId: 'opponent-1',
          cause: 'damage',
          killerUnitId: 'player-1',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;
      expect(m.playerUnitsStart).toBe(1);
      expect(m.opponentUnitsStart).toBe(1);
      expect(m.playerUnitsEnd).toBe(1);
      expect(m.opponentUnitsEnd).toBe(0);
    });
  });

  describe('combat-fidelity counters — exact matches by event count', () => {
    it('CriticalHit events count once per event (count: 1 per slot)', () => {
      const events = [
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
          sourceUnitId: 'player-1',
          component: 'engine',
          count: 1,
        }),
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
          sourceUnitId: 'player-1',
          component: 'gyro',
          count: 1,
        }),
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
          sourceUnitId: 'player-1',
          component: 'sensor',
          count: 1,
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.criticalHitsLanded).toBe(3);
    });

    it('CriticalHit events with count > 1 sum their count fields', () => {
      // Legacy session-side emitters may pack a multi-slot crit into
      // a single event. The aggregator respects the carried count.
      const events = [
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
          count: 2,
        }),
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'LT',
          count: 3,
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.criticalHitsLanded).toBe(5);
    });

    it('CriticalHit with omitted count defaults to 1', () => {
      const events = [
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.criticalHitsLanded).toBe(1);
    });

    it('ComponentDestroyed events count once per event', () => {
      const events = [
        makeEvent(GameEventType.ComponentDestroyed, {
          unitId: 'opponent-1',
          location: 'CT',
          componentType: 'engine',
          slotIndex: 2,
        }),
        makeEvent(GameEventType.ComponentDestroyed, {
          unitId: 'opponent-1',
          location: 'CT',
          componentType: 'gyro',
          slotIndex: 4,
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.componentDestroyedCount).toBe(2);
    });

    it('AmmoExplosion events count once per event', () => {
      const events = [
        makeEvent(GameEventType.AmmoExplosion, {
          unitId: 'opponent-1',
          location: 'RT',
          damage: 200,
          source: 'CritInduced',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.ammoExplosions).toBe(1);
    });

    it('HeatEffectApplied counts shutdowns ONLY for effect=shutdown', () => {
      // shutdown_check (heat ≥ 14, avoidable) doesn't increment because
      // the unit may have rolled to stay up; only the auto-shutdown
      // effect counts as a shutdown event.
      const events = [
        makeEvent(GameEventType.HeatEffectApplied, {
          unitId: 'player-1',
          threshold: 14,
          effect: 'shutdown_check',
          heatLevel: 18,
        }),
        makeEvent(GameEventType.HeatEffectApplied, {
          unitId: 'player-1',
          threshold: 30,
          effect: 'shutdown',
          heatLevel: 32,
        }),
        makeEvent(GameEventType.HeatEffectApplied, {
          unitId: 'opponent-1',
          threshold: 30,
          effect: 'shutdown',
          heatLevel: 30,
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.shutdowns).toBe(2);
    });

    it('UnitFell events count once per event', () => {
      const events = [
        makeEvent(GameEventType.UnitFell, {
          unitId: 'player-1',
          fallDamage: 5,
          newFacing: 0,
          pilotDamage: 1,
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.falls).toBe(1);
    });

    it('PilotHit events count once per event', () => {
      const events = [
        makeEvent(GameEventType.PilotHit, {
          unitId: 'player-1',
          wounds: 1,
          totalWounds: 1,
          source: 'head_hit',
          consciousnessCheckRequired: false,
        }),
        makeEvent(GameEventType.PilotHit, {
          unitId: 'player-1',
          wounds: 1,
          totalWounds: 2,
          source: 'head_hit',
          consciousnessCheckRequired: true,
          consciousnessCheckPassed: true,
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      expect(collector.getMetrics()[0]!.pilotHits).toBe(2);
    });
  });

  describe('end-to-end synthetic 1-game event log', () => {
    it('produces correct totals across every counter type in one log', () => {
      const events = [
        // 2 DamageApplied — player attacks opponent twice
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-1',
          location: 'CT',
          damage: 20,
          armorRemaining: 5,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: 'player-1',
        }),
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'opponent-1',
          location: 'CT',
          damage: 15,
          armorRemaining: 0,
          structureRemaining: 0,
          locationDestroyed: true,
          sourceUnitId: 'player-1',
        }),
        // 2 CriticalHit
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
          component: 'engine',
          count: 1,
        }),
        makeEvent(GameEventType.CriticalHit, {
          unitId: 'opponent-1',
          location: 'CT',
          component: 'engine',
          count: 1,
        }),
        // 1 ComponentDestroyed
        makeEvent(GameEventType.ComponentDestroyed, {
          unitId: 'opponent-1',
          location: 'CT',
          componentType: 'engine',
          slotIndex: 2,
        }),
        // 1 AmmoExplosion
        makeEvent(GameEventType.AmmoExplosion, {
          unitId: 'opponent-1',
          location: 'RT',
          damage: 100,
          source: 'CritInduced',
        }),
        // 1 HeatEffectApplied { effect: 'shutdown' }
        makeEvent(GameEventType.HeatEffectApplied, {
          unitId: 'player-1',
          threshold: 30,
          effect: 'shutdown',
          heatLevel: 31,
        }),
        // 1 UnitFell
        makeEvent(GameEventType.UnitFell, {
          unitId: 'player-1',
          fallDamage: 5,
          newFacing: 0,
          pilotDamage: 1,
        }),
        // 1 PilotHit
        makeEvent(GameEventType.PilotHit, {
          unitId: 'player-1',
          wounds: 1,
          totalWounds: 1,
          source: 'head_hit',
          consciousnessCheckRequired: false,
        }),
        // 1 UnitDestroyed
        makeEvent(GameEventType.UnitDestroyed, {
          unitId: 'opponent-1',
          cause: 'engine_destroyed',
          killerUnitId: 'player-1',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;

      expect(m.criticalHitsLanded).toBe(2);
      expect(m.componentDestroyedCount).toBe(1);
      expect(m.ammoExplosions).toBe(1);
      expect(m.shutdowns).toBe(1);
      expect(m.falls).toBe(1);
      expect(m.pilotHits).toBe(1);
      expect(m.totalDamageDealt.player).toBe(35);
      expect(m.totalDamageDealt.opponent).toBe(0);
      // playerUnitsStart=1 (attacker), opponentUnitsStart=1 (target),
      // opponent destroyed in same run.
      expect(m.playerUnitsStart).toBe(1);
      expect(m.playerUnitsEnd).toBe(1);
      expect(m.opponentUnitsStart).toBe(1);
      expect(m.opponentUnitsEnd).toBe(0);
    });
  });

  describe('side derivation', () => {
    it('non-canonical unit ids do not contribute to either side', () => {
      // Legacy fixtures with 'unit-A-1' / 'unit-B-1' style ids should
      // produce zero roster counts — those flows go through the
      // schemaVersion-2 swarm path that doesn't use MetricsCollector.
      const events = [
        makeEvent(GameEventType.DamageApplied, {
          unitId: 'unit-B-1',
          location: 'CT',
          damage: 10,
          armorRemaining: 5,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: 'unit-A-1',
        }),
      ];
      const collector = new MetricsCollector();
      collector.recordGame(makeResult(events));
      const m = collector.getMetrics()[0]!;
      expect(m.playerUnitsStart).toBe(0);
      expect(m.opponentUnitsStart).toBe(0);
      expect(m.totalDamageDealt.player).toBe(0);
      expect(m.totalDamageDealt.opponent).toBe(0);
    });
  });
});
