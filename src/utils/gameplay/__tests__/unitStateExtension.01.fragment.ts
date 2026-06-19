import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  LockState,
  IGameEvent,
  IGameState,
  IGameUnit,
  IUnitGameState,
  IComponentDamageState,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IPSRTriggeredPayload,
  IPSRResolvedPayload,
  IUnitFellPayload,
  IUnitStuckPayload,
  INeuralInterfaceStateChangedPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IAmmoConsumedPayload,
  PSRTrigger,
} from '@/types/gameplay';

import {
  createInitialUnitState,
  applyEvent,
  createInitialGameState,
} from '../gameState';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Atlas AS7-D',
    side: GameSide.Player,
    unitRef: 'atlas-as7d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeEvent(
  type: GameEventType,
  payload: Record<string, unknown>,
  overrides: Partial<IGameEvent> = {},
): IGameEvent {
  return {
    id: `evt-${Date.now()}`,
    gameId: 'game-1',
    sequence: 1,
    timestamp: new Date().toISOString(),
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
    ...overrides,
  } as IGameEvent;
}

function createStateWithUnit(unitOverrides: Partial<IUnitGameState> = {}) {
  const unit = createTestUnit();
  const unitState = createInitialUnitState(unit, { q: 0, r: 0 }, Facing.North);
  const state = createInitialGameState('game-1');
  return {
    ...state,
    units: {
      'unit-1': { ...unitState, ...unitOverrides },
    },
  };
}

// =============================================================================
// Backward Compatibility Tests
// =============================================================================

describe('Phase 4: IUnitGameState Extension', () => {
  describe('backward compatibility', () => {
    it('createInitialUnitState provides all new field defaults', () => {
      const unit = createTestUnit();
      const state = createInitialUnitState(unit, { q: 0, r: 0 });

      expect(state.componentDamage).toBeDefined();
      expect(state.componentDamage!.engineHits).toBe(0);
      expect(state.componentDamage!.gyroHits).toBe(0);
      expect(state.componentDamage!.sensorHits).toBe(0);
      expect(state.componentDamage!.lifeSupport).toBe(0);
      expect(state.componentDamage!.cockpitHit).toBe(false);
      expect(state.componentDamage!.actuators).toEqual({});
      expect(state.componentDamage!.weaponsDestroyed).toEqual([]);
      expect(state.componentDamage!.heatSinksDestroyed).toBe(0);
      expect(state.componentDamage!.jumpJetsDestroyed).toBe(0);

      expect(state.prone).toBe(false);
      expect(state.shutdown).toBe(false);
      expect(state.infernoBurning).toBe(false);
      expect(state.ammoState).toEqual({});
      expect(state.pendingPSRs).toEqual([]);
      expect(state.weaponsFiredThisTurn).toEqual([]);
    });

    it('old game state without new fields loads without errors', () => {
      const legacyUnitState: IUnitGameState = {
        id: 'unit-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        facing: Facing.North,
        heat: 5,
        movementThisTurn: MovementType.Walk,
        hexesMovedThisTurn: 3,
        armor: { center_torso: 30, left_arm: 10 },
        structure: { center_torso: 20, left_arm: 8 },
        destroyedLocations: [],
        destroyedEquipment: [],
        ammo: { srm6: 15 },
        pilotWounds: 1,
        pilotConscious: true,
        destroyed: false,
        lockState: LockState.Pending,
      };

      // Access new fields with defaults via ?? operator (the pattern used in reducers)
      expect(legacyUnitState.componentDamage ?? null).toBeNull();
      expect(legacyUnitState.prone ?? false).toBe(false);
      expect(legacyUnitState.shutdown ?? false).toBe(false);
      expect(legacyUnitState.infernoBurning ?? false).toBe(false);
      expect(legacyUnitState.ammoState ?? {}).toEqual({});
      expect(legacyUnitState.pendingPSRs ?? []).toEqual([]);
      expect(legacyUnitState.weaponsFiredThisTurn ?? []).toEqual([]);
    });

    it('unknown event types return state unchanged', () => {
      const state = createStateWithUnit();
      const unknownEvent = makeEvent('some_future_event' as GameEventType, {
        data: 'test',
      });

      const result = applyEvent(state, unknownEvent);
      expect(result).toBe(state);
    });

    it('existing reducers still work with extended state', () => {
      const state = createStateWithUnit({
        componentDamage: {
          engineHits: 1,
          gyroHits: 0,
          sensorHits: 0,
          lifeSupport: 0,
          cockpitHit: false,
          actuators: {},
          weaponsDestroyed: [],
          heatSinksDestroyed: 0,
          jumpJetsDestroyed: 0,
        },
        prone: false,
        shutdown: false,
      });

      const damageEvent = makeEvent(GameEventType.DamageApplied, {
        unitId: 'unit-1',
        location: 'center_torso',
        damage: 5,
        armorRemaining: 25,
        structureRemaining: 20,
        locationDestroyed: false,
      });

      const result = applyEvent(state, damageEvent);
      const unit = result.units['unit-1'];

      expect(unit.armor['center_torso']).toBe(25);
      expect(unit.componentDamage?.engineHits).toBe(1);
      expect(unit.prone).toBe(false);
    });
  });
});
