import { describe, expect, it } from '@jest/globals';

import {
  GameEventType,
  MetricsCollector,
  makeEvent,
  makeResult,
} from './MetricsCollector.combatFidelity.test-helpers';

describe('MetricsCollector — combat-fidelity hydration (Phase 5)', () => {
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
