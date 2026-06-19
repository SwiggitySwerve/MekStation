import {
  HEAT_THRESHOLDS,
  HEAT_TO_HIT_TABLE,
  ENGINE_HIT_HEAT,
  getShutdownTN,
  getStartupTN,
  getAmmoExplosionTN,
  getHeatMovementPenalty,
  getHeatToHitModifier,
  getMaxTechHeatCriticalDamageAvoidTN,
  getPilotHeatDamage,
  getMaxTechPilotHeatDamageAvoidTN,
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
  IAmmoExplosionPayload,
  IDamageAppliedPayload,
  IComponentDamageState,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IHeatPayload,
  PSRTrigger,
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

  // Advance through Initiative -> Movement -> WeaponAttack -> PhysicalAttack -> Heat
  session = advancePhase(session); // -> Movement
  session = advancePhase(session); // -> WeaponAttack
  session = advancePhase(session); // -> PhysicalAttack
  session = advancePhase(session); // -> Heat

  return session;
}

function setupGameAtHeatPhaseWithUnits(units: IGameUnit[]) {
  const config = {
    mapRadius: 10,
    turnLimit: 10,
    victoryConditions: ['destruction'],
    optionalRules: [],
  };

  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = advancePhase(session); // -> Movement
  session = advancePhase(session); // -> WeaponAttack
  session = advancePhase(session); // -> PhysicalAttack
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

function seedUnitArmorStructure(
  session: ReturnType<typeof setupGameAtHeatPhase>,
  unitId: string,
  armor: Record<string, number>,
  structure: Record<string, number>,
) {
  let currentSession = session;
  const { deriveState } = require('../gameState');
  const locations = new Set([...Object.keys(armor), ...Object.keys(structure)]);

  for (const location of Array.from(locations)) {
    const event: IGameEvent = {
      id: `seed-${unitId}-${location}`,
      gameId: currentSession.id,
      sequence: currentSession.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.DamageApplied,
      turn: currentSession.currentState.turn,
      phase: GamePhase.Heat,
      actorId: unitId,
      payload: {
        unitId,
        location,
        damage: 0,
        armorRemaining: armor[location] ?? 0,
        structureRemaining: structure[location] ?? 0,
        locationDestroyed: false,
      },
    };
    const events = [...currentSession.events, event];
    currentSession = {
      ...currentSession,
      events,
      currentState: deriveState(currentSession.id, events),
    };
  }

  return currentSession;
}

function createAmmoCookoffUnits(
  caseProtection?: Readonly<Record<string, 'case' | 'case_ii'>>,
): IGameUnit[] {
  return [
    {
      id: 'unit-1',
      name: 'Spotter',
      side: GameSide.Player,
      unitRef: 'spotter',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
      heatSinks: 0,
    },
    {
      id: 'unit-2',
      name: 'Ammo Subject',
      side: GameSide.Opponent,
      unitRef: 'ammo-subject',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
      heatSinks: 0,
      ammoConstruction: [
        {
          binId: 'rt-ac20-bin',
          weaponType: 'AC/20',
          location: 'right_torso',
          maxRounds: 5,
          damagePerRound: 20,
          isExplosive: true,
        },
      ],
      ...(caseProtection !== undefined ? { caseProtection } : {}),
    },
  ];
}

// =============================================================================
// constants/heat.ts Formula Tests
// =============================================================================

describe('Smoke: ShutdownCheck TN & Replay Fidelity (Tasks 14.5 / 14.6)', () => {
  it('heat 14 at start-of-heat → ShutdownCheck with TN 4', () => {
    // Task 14.5: fixture ramps unit to heat 14 BEFORE dissipation; this
    // must trigger a shutdown check with the canonical threshold TN.
    //
    // unit-2 has 10 HS. We want heat 14 AFTER dissipation so set to 24.
    // 24 - 10 = 14 → TN = 4.
    let session = setupGameAtHeatPhase();
    session = setUnitHeat(session, 'unit-2', 24);

    session = resolveHeatPhase(session, createDiceRoller(6));

    const shutdownEvents = session.events.filter(
      (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
    );
    expect(shutdownEvents).toHaveLength(1);
    const payload = shutdownEvents[0].payload as IShutdownCheckPayload;
    expect(payload.heatLevel).toBe(14);
    expect(payload.targetNumber).toBe(4);
    expect(payload.roll).toBe(6);
    expect(payload.shutdownOccurred).toBe(false);
  });

  it('replay fidelity: same seeded dice sequence produces identical shutdown outcome', () => {
    // Task 14.6: deterministic roller → identical shutdown roll outcome
    // when the same session is resolved twice under the same roller.
    const buildSession = () => {
      let session = setupGameAtHeatPhase();
      session = setUnitHeat(session, 'unit-2', 24);
      return session;
    };

    // Same fixed roll (total 3 → shutdown on TN 4)
    const sessionA = resolveHeatPhase(buildSession(), createDiceRoller(3));
    const sessionB = resolveHeatPhase(buildSession(), createDiceRoller(3));

    const shutdownsA = sessionA.events.filter(
      (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
    );
    const shutdownsB = sessionB.events.filter(
      (e) => e.type === GameEventType.ShutdownCheck && e.actorId === 'unit-2',
    );

    expect(shutdownsA).toHaveLength(1);
    expect(shutdownsB).toHaveLength(1);

    const payloadA = shutdownsA[0].payload as IShutdownCheckPayload;
    const payloadB = shutdownsB[0].payload as IShutdownCheckPayload;

    expect(payloadA.roll).toBe(payloadB.roll);
    expect(payloadA.targetNumber).toBe(payloadB.targetNumber);
    expect(payloadA.heatLevel).toBe(payloadB.heatLevel);
    expect(payloadA.shutdownOccurred).toBe(payloadB.shutdownOccurred);
    expect(payloadA.shutdownOccurred).toBe(true);

    // Final unit state also identical
    expect(sessionA.currentState.units['unit-2'].heat).toBe(
      sessionB.currentState.units['unit-2'].heat,
    );
    expect(sessionA.currentState.units['unit-2'].shutdown).toBe(
      sessionB.currentState.units['unit-2'].shutdown,
    );
  });
});
