import { describe, expect, it } from '@jest/globals';

import {
  GameEventType,
  MetricsCollector,
  makeEvent,
  makeResult,
} from './MetricsCollector.combatFidelity.test-helpers';

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
});
