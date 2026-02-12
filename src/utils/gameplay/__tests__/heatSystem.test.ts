import {
  HEAT_THRESHOLDS,
  HEAT_TO_HIT_TABLE,
  ENGINE_HIT_HEAT,
  getShutdownTN,
  getStartupTN,
  getAmmoExplosionTN,
  getHeatMovementPenalty,
  getHeatToHitModifier,
  getPilotHeatDamage,
} from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  Facing,
  MovementType,
  LockState,
  IGameEvent,
  IGameUnit,
  IComponentDamageState,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IHeatPayload,
} from '@/types/gameplay';

import {
  createGameSession,
  startGame,
  advancePhase,
  resolveHeatPhase,
  DiceRoller,
} from '../gameSession';

// =============================================================================
// Test Helpers
// =============================================================================

function createDiceRoller(total: number): DiceRoller {
  return () => ({
    dice: [Math.ceil(total / 2), Math.floor(total / 2)] as readonly number[],
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  });
}

function createSequentialDiceRoller(totals: number[]): DiceRoller {
  let idx = 0;
  return () => {
    const total = totals[idx % totals.length];
    idx++;
    return {
      dice: [Math.ceil(total / 2), Math.floor(total / 2)] as readonly number[],
      total,
      isSnakeEyes: total === 2,
      isBoxcars: total === 12,
    };
  };
}

function createTestUnits(): IGameUnit[] {
  return [
    {
      id: 'unit-1',
      name: 'Atlas AS7-D',
      side: GameSide.Player,
      unitRef: 'atlas',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
      heatSinks: 20,
    },
    {
      id: 'unit-2',
      name: 'Hunchback HBK-4G',
      side: GameSide.Opponent,
      unitRef: 'hunchback',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
      heatSinks: 10,
    },
  ];
}

function setupGameAtHeatPhase() {
  const config = {
    mapRadius: 10,
    turnLimit: 10,
    victoryConditions: ['destruction'],
    optionalRules: [],
  };

  let session = createGameSession(config, createTestUnits());
  session = startGame(session, GameSide.Player);

  // Advance through Initiative -> Movement -> WeaponAttack -> Heat
  session = advancePhase(session); // -> Movement
  session = advancePhase(session); // -> WeaponAttack
  session = advancePhase(session); // -> Heat

  return session;
}

/**
 * Injects heat into a unit by appending a HeatGenerated event.
 * This survives deriveState replay (unlike direct state mutation).
 */
function setUnitHeat(
  session: ReturnType<typeof setupGameAtHeatPhase>,
  unitId: string,
  targetHeat: number,
) {
  const currentHeat = session.currentState.units[unitId]?.heat ?? 0;
  const delta = targetHeat - currentHeat;
  if (delta <= 0) return session;

  const event: IGameEvent = {
    id: `heat-inject-${unitId}`,
    gameId: session.id,
    sequence: session.events.length,
    timestamp: new Date().toISOString(),
    type: GameEventType.HeatGenerated,
    turn: session.currentState.turn,
    phase: GamePhase.Heat,
    actorId: unitId,
    payload: {
      unitId,
      amount: delta,
      source: 'external' as const,
      newTotal: targetHeat,
    },
  };

  const events = [...session.events, event];
  const { deriveState } = require('../gameState');
  const currentState = deriveState(session.id, events);

  return { ...session, events, currentState };
}

/**
 * Injects component damage into a unit by appending CriticalHitResolved events.
 * This survives deriveState replay.
 */
function setComponentDamage(
  session: ReturnType<typeof setupGameAtHeatPhase>,
  unitId: string,
  damage: Partial<IComponentDamageState>,
) {
  let currentSession = session;

  const damageEntries: Array<{ componentType: string; count: number }> = [];
  if (damage.engineHits)
    damageEntries.push({ componentType: 'engine', count: damage.engineHits });
  if (damage.heatSinksDestroyed)
    damageEntries.push({
      componentType: 'heat_sink',
      count: damage.heatSinksDestroyed,
    });
  if (damage.lifeSupport)
    damageEntries.push({
      componentType: 'life_support',
      count: damage.lifeSupport,
    });
  if (damage.gyroHits)
    damageEntries.push({ componentType: 'gyro', count: damage.gyroHits });
  if (damage.sensorHits)
    damageEntries.push({ componentType: 'sensor', count: damage.sensorHits });

  for (const entry of damageEntries) {
    for (let i = 0; i < entry.count; i++) {
      const event: IGameEvent = {
        id: `crit-inject-${unitId}-${entry.componentType}-${i}`,
        gameId: currentSession.id,
        sequence: currentSession.events.length,
        timestamp: new Date().toISOString(),
        type: GameEventType.CriticalHitResolved,
        turn: currentSession.currentState.turn,
        phase: GamePhase.Heat,
        actorId: unitId,
        payload: {
          unitId,
          location: 'center_torso',
          slotIndex: i,
          componentType: entry.componentType,
          componentName: entry.componentType,
          effect: `${entry.componentType}_hit`,
          destroyed: false,
        },
      };
      const events = [...currentSession.events, event];
      const { deriveState } = require('../gameState');
      const currentState = deriveState(currentSession.id, events);
      currentSession = { ...currentSession, events, currentState };
    }
  }

  return currentSession;
}

// =============================================================================
// constants/heat.ts Formula Tests
// =============================================================================

describe('Heat System Constants', () => {
  describe('getShutdownTN', () => {
    it('returns 0 below heat 14', () => {
      expect(getShutdownTN(0)).toBe(0);
      expect(getShutdownTN(13)).toBe(0);
    });

    it('returns TN 4 at heat 14', () => {
      expect(getShutdownTN(14)).toBe(4);
    });

    it('follows formula TN = 4 + floor((heat-14)/4)*2', () => {
      expect(getShutdownTN(14)).toBe(4); // 4 + 0
      expect(getShutdownTN(15)).toBe(4); // 4 + 0
      expect(getShutdownTN(17)).toBe(4); // 4 + 0
      expect(getShutdownTN(18)).toBe(6); // 4 + 2
      expect(getShutdownTN(21)).toBe(6); // 4 + 2
      expect(getShutdownTN(22)).toBe(8); // 4 + 4
      expect(getShutdownTN(25)).toBe(8); // 4 + 4
      expect(getShutdownTN(26)).toBe(10); // 4 + 6
      expect(getShutdownTN(29)).toBe(10); // 4 + 6
    });

    it('returns Infinity at heat 30+', () => {
      expect(getShutdownTN(30)).toBe(Infinity);
      expect(getShutdownTN(50)).toBe(Infinity);
    });

    it('applies Hot Dog SPA +3 threshold shift', () => {
      expect(getShutdownTN(14, 3)).toBe(0);
      expect(getShutdownTN(16, 3)).toBe(0);
      expect(getShutdownTN(17, 3)).toBe(4);
      expect(getShutdownTN(21, 3)).toBe(6);
    });
  });

  describe('getStartupTN', () => {
    it('returns base TN 4 below threshold', () => {
      expect(getStartupTN(5)).toBe(4);
      expect(getStartupTN(13)).toBe(4);
    });

    it('uses same formula as shutdown at threshold', () => {
      expect(getStartupTN(14)).toBe(4);
      expect(getStartupTN(18)).toBe(6);
      expect(getStartupTN(22)).toBe(8);
    });

    it('returns valid TN even at 30+ (startup is always possible)', () => {
      const tn = getStartupTN(30);
      expect(tn).toBe(12);
      expect(isFinite(tn)).toBe(true);
    });
  });

  describe('getAmmoExplosionTN', () => {
    it('returns 0 below heat 19', () => {
      expect(getAmmoExplosionTN(0)).toBe(0);
      expect(getAmmoExplosionTN(18)).toBe(0);
    });

    it('returns TN 4 at heat 19-22', () => {
      expect(getAmmoExplosionTN(19)).toBe(4);
      expect(getAmmoExplosionTN(20)).toBe(4);
      expect(getAmmoExplosionTN(22)).toBe(4);
    });

    it('returns TN 6 at heat 23-27', () => {
      expect(getAmmoExplosionTN(23)).toBe(6);
      expect(getAmmoExplosionTN(25)).toBe(6);
      expect(getAmmoExplosionTN(27)).toBe(6);
    });

    it('returns TN 8 at heat 28-29', () => {
      expect(getAmmoExplosionTN(28)).toBe(8);
      expect(getAmmoExplosionTN(29)).toBe(8);
    });

    it('returns Infinity at heat 30+', () => {
      expect(getAmmoExplosionTN(30)).toBe(Infinity);
      expect(getAmmoExplosionTN(35)).toBe(Infinity);
    });
  });

  describe('getHeatMovementPenalty', () => {
    it('returns 0 below heat 5', () => {
      expect(getHeatMovementPenalty(0)).toBe(0);
      expect(getHeatMovementPenalty(4)).toBe(0);
    });

    it('applies floor(heat/5) formula', () => {
      expect(getHeatMovementPenalty(5)).toBe(1);
      expect(getHeatMovementPenalty(9)).toBe(1);
      expect(getHeatMovementPenalty(10)).toBe(2);
      expect(getHeatMovementPenalty(14)).toBe(2);
      expect(getHeatMovementPenalty(15)).toBe(3);
      expect(getHeatMovementPenalty(20)).toBe(4);
      expect(getHeatMovementPenalty(25)).toBe(5);
      expect(getHeatMovementPenalty(29)).toBe(5);
      expect(getHeatMovementPenalty(30)).toBe(6);
    });
  });

  describe('getHeatToHitModifier', () => {
    it('returns correct modifiers at boundary values', () => {
      expect(getHeatToHitModifier(0)).toBe(0);
      expect(getHeatToHitModifier(7)).toBe(0);
      expect(getHeatToHitModifier(8)).toBe(1);
      expect(getHeatToHitModifier(12)).toBe(1);
      expect(getHeatToHitModifier(13)).toBe(2);
      expect(getHeatToHitModifier(16)).toBe(2);
      expect(getHeatToHitModifier(17)).toBe(3);
      expect(getHeatToHitModifier(23)).toBe(3);
      expect(getHeatToHitModifier(24)).toBe(4);
      expect(getHeatToHitModifier(30)).toBe(4);
    });
  });

  describe('getPilotHeatDamage', () => {
    it('returns 0 with functional life support at any heat', () => {
      expect(getPilotHeatDamage(30, 0)).toBe(0);
    });

    it('returns 0 below heat 15 with damaged life support', () => {
      expect(getPilotHeatDamage(14, 1)).toBe(0);
    });

    it('returns 1 at heat 15-24 with damaged life support', () => {
      expect(getPilotHeatDamage(15, 1)).toBe(1);
      expect(getPilotHeatDamage(20, 1)).toBe(1);
      expect(getPilotHeatDamage(24, 2)).toBe(1);
    });

    it('returns 2 at heat 25+ with damaged life support', () => {
      expect(getPilotHeatDamage(25, 1)).toBe(2);
      expect(getPilotHeatDamage(30, 2)).toBe(2);
    });
  });

  describe('ENGINE_HIT_HEAT', () => {
    it('should be 5 heat per engine hit', () => {
      expect(ENGINE_HIT_HEAT).toBe(5);
    });
  });
});

// =============================================================================
// resolveHeatPhase Integration Tests
// =============================================================================

describe('resolveHeatPhase', () => {
  describe('basic heat dissipation', () => {
    it('dissipates heat using unit heat sinks', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-1', 15);

      session = resolveHeatPhase(session);

      // unit-1 has 20 heat sinks, so 15 - 20 = 0 (clamped)
      expect(session.currentState.units['unit-1'].heat).toBe(0);
    });

    it('does not go below 0 heat', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-1', 5);

      session = resolveHeatPhase(session);

      expect(session.currentState.units['unit-1'].heat).toBe(0);
    });
  });

  describe('engine critical hit heat generation (Task 7.9)', () => {
    it('adds +5 heat per engine hit', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-1', 0);
      session = setComponentDamage(session, 'unit-1', { engineHits: 1 });

      session = resolveHeatPhase(session);

      // 0 + 5 engine heat - 20 dissipation = 0 (clamped)
      // But heat generated event should show 5
      const heatGenEvents = session.events.filter(
        (e) => e.type === GameEventType.HeatGenerated && e.actorId === 'unit-1',
      );
      expect(heatGenEvents.length).toBeGreaterThanOrEqual(1);
      const lastHeatGen = heatGenEvents[heatGenEvents.length - 1];
      expect((lastHeatGen.payload as IHeatPayload).amount).toBe(5);
    });

    it('adds +10 heat for 2 engine hits', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 0);
      session = setComponentDamage(session, 'unit-2', { engineHits: 2 });

      session = resolveHeatPhase(session);

      // unit-2 has 10 heat sinks: 0 + 10 engine heat - 10 dissipation = 0
      const heatGenEvents = session.events.filter(
        (e) => e.type === GameEventType.HeatGenerated && e.actorId === 'unit-2',
      );
      expect(heatGenEvents.length).toBeGreaterThanOrEqual(1);
      const payload = heatGenEvents[heatGenEvents.length - 1]
        .payload as IHeatPayload;
      expect(payload.amount).toBe(10);
    });
  });

  describe('heat sink critical hit reduction (Task 7.10)', () => {
    it('reduces dissipation by destroyed heat sinks', () => {
      let session = setupGameAtHeatPhase();
      // unit-2 has 10 HS. Destroy 3, leaving 7. With 20 heat: 20 - 7 = 13
      session = setUnitHeat(session, 'unit-2', 20);
      session = setComponentDamage(session, 'unit-2', {
        heatSinksDestroyed: 3,
      });

      session = resolveHeatPhase(session);

      expect(session.currentState.units['unit-2'].heat).toBe(13);
    });

    it('does not let dissipation go negative', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 20);
      session = setComponentDamage(session, 'unit-2', {
        heatSinksDestroyed: 15,
      });

      session = resolveHeatPhase(session);

      // 10 HS - 15 destroyed = 0 dissipation. Heat stays 20.
      expect(session.currentState.units['unit-2'].heat).toBe(20);
    });
  });

  describe('shutdown checks (Task 7.4)', () => {
    it('does not trigger shutdown check below heat 14', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 23); // After 10 HS dissipation = 13

      session = resolveHeatPhase(session);

      const shutdownEvents = session.events.filter(
        (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
      );
      expect(shutdownEvents).toHaveLength(0);
      expect(session.currentState.units['unit-2'].heat).toBe(13);
    });

    it('triggers shutdown check at heat 14+', () => {
      let session = setupGameAtHeatPhase();
      // unit-2 has 10 HS. Set to 25 -> 25-10=15, TN=4
      session = setUnitHeat(session, 'unit-2', 25);

      // Roll high to avoid shutdown
      session = resolveHeatPhase(session, createDiceRoller(10));

      const shutdownEvents = session.events.filter(
        (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
      );
      expect(shutdownEvents).toHaveLength(1);
      const payload = shutdownEvents[0].payload as IShutdownCheckPayload;
      expect(payload.heatLevel).toBe(15);
      expect(payload.targetNumber).toBe(4);
      expect(payload.shutdownOccurred).toBe(false);
    });

    it('shuts down when roll fails', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 25); // After dissipation: 15, TN=4

      // Roll 3 — fails TN 4
      session = resolveHeatPhase(session, createDiceRoller(3));

      const shutdownEvents = session.events.filter(
        (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
      );
      expect(shutdownEvents).toHaveLength(1);
      expect(
        (shutdownEvents[0].payload as IShutdownCheckPayload).shutdownOccurred,
      ).toBe(true);
      expect(session.currentState.units['unit-2'].shutdown).toBe(true);
    });

    it('emits PSR on shutdown', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 25);

      session = resolveHeatPhase(session, createDiceRoller(3));

      const psrEvents = session.events.filter(
        (e) => e.type === GameEventType.PSRTriggered && e.actorId === 'unit-2',
      );
      expect(psrEvents.length).toBeGreaterThanOrEqual(1);
      expect((psrEvents[0].payload as IPSRTriggeredPayload).reason).toBe(
        'Reactor shutdown',
      );
    });
  });

  describe('automatic shutdown at heat 30+ (Task 7.5)', () => {
    it('auto-shuts down at heat 30 with no roll', () => {
      let session = setupGameAtHeatPhase();
      // unit-2 has 10 HS. Set to 40 -> 40-10 = 30 (auto shutdown)
      session = setUnitHeat(session, 'unit-2', 40);

      session = resolveHeatPhase(session);

      const shutdownEvents = session.events.filter(
        (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
      );
      expect(shutdownEvents).toHaveLength(1);
      const payload = shutdownEvents[0].payload as IShutdownCheckPayload;
      expect(payload.targetNumber).toBe(Infinity);
      expect(payload.shutdownOccurred).toBe(true);
      expect(session.currentState.units['unit-2'].shutdown).toBe(true);
    });
  });

  describe('pilot heat damage (Task 7.8/7.11)', () => {
    it('does not deal pilot damage with functional life support', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 35); // After 10 HS: 25

      session = resolveHeatPhase(session, createDiceRoller(12));

      const pilotEvents = session.events.filter(
        (e) =>
          e.type === GameEventType.PilotHit &&
          e.actorId === 'unit-2' &&
          e.phase === GamePhase.Heat,
      );
      expect(pilotEvents).toHaveLength(0);
    });

    it('deals 1 point pilot damage at heat 15-24 with damaged life support', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 25); // After 10 HS: 15
      session = setComponentDamage(session, 'unit-2', { lifeSupport: 1 });

      session = resolveHeatPhase(session, createDiceRoller(12));

      const pilotEvents = session.events.filter(
        (e) =>
          e.type === GameEventType.PilotHit &&
          e.actorId === 'unit-2' &&
          e.phase === GamePhase.Heat,
      );
      expect(pilotEvents).toHaveLength(1);
      expect((pilotEvents[0].payload as IPilotHitPayload).wounds).toBe(1);
    });

    it('deals 2 points pilot damage at heat 25+ with damaged life support', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 35); // After 10 HS: 25
      session = setComponentDamage(session, 'unit-2', { lifeSupport: 1 });

      session = resolveHeatPhase(session, createDiceRoller(12));

      const pilotEvents = session.events.filter(
        (e) =>
          e.type === GameEventType.PilotHit &&
          e.actorId === 'unit-2' &&
          e.phase === GamePhase.Heat,
      );
      expect(pilotEvents).toHaveLength(1);
      expect((pilotEvents[0].payload as IPilotHitPayload).wounds).toBe(2);
    });
  });

  describe('skips destroyed units', () => {
    it('does not process destroyed units', () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 50);

      const destroyEvent: IGameEvent = {
        id: 'destroy-unit-2',
        gameId: session.id,
        sequence: session.events.length,
        timestamp: new Date().toISOString(),
        type: GameEventType.UnitDestroyed,
        turn: session.currentState.turn,
        phase: GamePhase.Heat,
        actorId: 'unit-2',
        payload: { unitId: 'unit-2', cause: 'damage' },
      };
      const events = [...session.events, destroyEvent];
      const { deriveState } = require('../gameState');
      session = {
        ...session,
        events,
        currentState: deriveState(session.id, events),
      };

      const eventCountBefore = session.events.length;
      session = resolveHeatPhase(session);

      const unit2Events = session.events
        .slice(eventCountBefore)
        .filter((e) => e.actorId === 'unit-2');
      expect(unit2Events).toHaveLength(0);
    });
  });
});

// =============================================================================
// Startup Roll Tests (Task 7.6/7.8)
// =============================================================================

describe('startup system', () => {
  describe('getStartupTN formula', () => {
    it('matches shutdown TN for same heat level', () => {
      for (let heat = 14; heat < 30; heat++) {
        expect(getStartupTN(heat)).toBe(getShutdownTN(heat));
      }
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Heat System Edge Cases', () => {
  it('handles 0 heat with 0 heat sinks', () => {
    const config = {
      mapRadius: 10,
      turnLimit: 10,
      victoryConditions: ['destruction'],
      optionalRules: [],
    };
    const units: IGameUnit[] = [
      {
        id: 'unit-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas',
        pilotRef: 'p1',
        gunnery: 4,
        piloting: 5,
        heatSinks: 0,
      },
      {
        id: 'unit-2',
        name: 'Hunchback',
        side: GameSide.Opponent,
        unitRef: 'hbk',
        pilotRef: 'p2',
        gunnery: 4,
        piloting: 5,
        heatSinks: 0,
      },
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    session = advancePhase(session);
    session = advancePhase(session);
    session = advancePhase(session);
    session = setUnitHeat(session, 'unit-2', 10);
    session = resolveHeatPhase(session, createDiceRoller(12));

    expect(session.currentState.units['unit-2'].heat).toBe(10);
  });

  it('handles extreme heat values (100+)', () => {
    let session = setupGameAtHeatPhase();
    session = setUnitHeat(session, 'unit-2', 100);

    session = resolveHeatPhase(session, createDiceRoller(12));

    // After 10 HS dissipation: 90. Auto-shutdown at 30+.
    expect(session.currentState.units['unit-2'].heat).toBe(90);
    expect(session.currentState.units['unit-2'].shutdown).toBe(true);
  });

  it('consolidated dissipation = heat sinks - destroyed heat sinks', () => {
    let session = setupGameAtHeatPhase();
    session = setUnitHeat(session, 'unit-1', 30);
    session = setComponentDamage(session, 'unit-1', { heatSinksDestroyed: 5 });

    session = resolveHeatPhase(session, createDiceRoller(12));

    // 20 HS - 5 destroyed = 15 dissipation. 30 - 15 = 15.
    expect(session.currentState.units['unit-1'].heat).toBe(15);
  });
});
