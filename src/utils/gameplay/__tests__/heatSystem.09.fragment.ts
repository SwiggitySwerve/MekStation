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

describe('Heat System Constants', () => {
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

  describe('getMaxTechPilotHeatDamageAvoidTN', () => {
    it('tracks optional MaxTech high-heat pilot damage avoidance TNs', () => {
      expect(getMaxTechPilotHeatDamageAvoidTN(31)).toBe(0);
      expect(getMaxTechPilotHeatDamageAvoidTN(32)).toBe(8);
      expect(getMaxTechPilotHeatDamageAvoidTN(39)).toBe(10);
      expect(getMaxTechPilotHeatDamageAvoidTN(47)).toBe(12);
    });

    it('applies Hot Dog-style target-number relief without shifting default heat damage thresholds', () => {
      expect(getMaxTechPilotHeatDamageAvoidTN(32, -1)).toBe(7);
      expect(getMaxTechPilotHeatDamageAvoidTN(39, -1)).toBe(9);
      expect(getMaxTechPilotHeatDamageAvoidTN(47, -1)).toBe(11);
      expect(getPilotHeatDamage(15, 1)).toBe(1);
      expect(getPilotHeatDamage(25, 1)).toBe(2);
    });
  });

  describe('getMaxTechHeatCriticalDamageAvoidTN', () => {
    it('tracks optional MaxTech critical damage avoidance TNs', () => {
      expect(getMaxTechHeatCriticalDamageAvoidTN(35)).toBe(0);
      expect(getMaxTechHeatCriticalDamageAvoidTN(36)).toBe(8);
      expect(getMaxTechHeatCriticalDamageAvoidTN(43)).toBe(8);
      expect(getMaxTechHeatCriticalDamageAvoidTN(44)).toBe(10);
    });

    it('applies Hot Dog-style target-number relief', () => {
      expect(getMaxTechHeatCriticalDamageAvoidTN(36, -1)).toBe(7);
      expect(getMaxTechHeatCriticalDamageAvoidTN(44, -1)).toBe(9);
    });
  });

  describe('ENGINE_HIT_HEAT', () => {
    it('should be 5 heat per engine hit', () => {
      expect(ENGINE_HIT_HEAT).toBe(5);
    });
  });
});
