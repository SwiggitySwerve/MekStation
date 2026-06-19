import { describe, expect, it } from '@jest/globals';

import {
  GameEventType,
  MetricsCollector,
  makeEvent,
  makeResult,
} from './MetricsCollector.combatFidelity.test-helpers';

describe('MetricsCollector — combat-fidelity hydration (Phase 5)', () => {
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
});
