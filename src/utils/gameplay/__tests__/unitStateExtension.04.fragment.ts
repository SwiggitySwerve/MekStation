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
  describe('StartupAttempt reducer', () => {
    it('clears shutdown on successful startup', () => {
      const state = createStateWithUnit({ shutdown: true });
      const event = makeEvent(GameEventType.StartupAttempt, {
        unitId: 'unit-1',
        targetNumber: 6,
        roll: 9,
        success: true,
      } satisfies IStartupAttemptPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].shutdown).toBe(false);
    });

    it('keeps shutdown on failed startup', () => {
      const state = createStateWithUnit({ shutdown: true });
      const event = makeEvent(GameEventType.StartupAttempt, {
        unitId: 'unit-1',
        targetNumber: 6,
        roll: 3,
        success: false,
      } satisfies IStartupAttemptPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].shutdown).toBe(true);
    });
  });

  describe('AmmoConsumed reducer', () => {
    it('decrements ammo bin rounds', () => {
      const state = createStateWithUnit({
        ammoState: {
          'bin-1': {
            binId: 'bin-1',
            weaponType: 'SRM 6',
            location: 'left_torso',
            remainingRounds: 15,
            maxRounds: 15,
            isExplosive: true,
          },
        },
      });

      const event = makeEvent(GameEventType.AmmoConsumed, {
        unitId: 'unit-1',
        binId: 'bin-1',
        weaponType: 'SRM 6',
        roundsConsumed: 1,
        roundsRemaining: 14,
      } satisfies IAmmoConsumedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].ammoState?.['bin-1'].remainingRounds).toBe(
        14,
      );
    });

    it('handles non-existent bin gracefully', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.AmmoConsumed, {
        unitId: 'unit-1',
        binId: 'nonexistent',
        weaponType: 'SRM 6',
        roundsConsumed: 1,
        roundsRemaining: 14,
      } satisfies IAmmoConsumedPayload);

      const result = applyEvent(state, event);
      expect(result).toBe(state);
    });
  });

  describe('PhysicalAttack reducers', () => {
    it('PhysicalAttackDeclared sets attacker to Planning', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.PhysicalAttackDeclared, {
        attackerId: 'unit-1',
        targetId: 'unit-2',
        attackType: 'punch',
        toHitNumber: 7,
      });

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].lockState).toBe(LockState.Planning);
    });

    it('PhysicalAttackResolved accumulates damageThisPhase on target hit', () => {
      const state = {
        ...createStateWithUnit(),
        units: {
          ...createStateWithUnit().units,
          'unit-2': {
            ...createStateWithUnit().units['unit-1'],
            id: 'unit-2',
            damageThisPhase: 0,
          },
        },
      };
      const event = makeEvent(GameEventType.PhysicalAttackResolved, {
        attackerId: 'unit-1',
        targetId: 'unit-2',
        attackType: 'kick',
        roll: 8,
        toHitNumber: 7,
        hit: true,
        damage: 10,
        location: 'left_leg',
      });

      const result = applyEvent(state, event);
      expect(result.units['unit-2'].damageThisPhase).toBe(10);
    });

    it('PhysicalAttackResolved miss returns state unchanged', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.PhysicalAttackResolved, {
        attackerId: 'unit-1',
        targetId: 'unit-2',
        attackType: 'kick',
        roll: 3,
        toHitNumber: 7,
        hit: false,
      });

      const result = applyEvent(state, event);
      expect(result).toBe(state);
    });
  });

  describe('NeuralInterfaceStateChanged reducer', () => {
    it('records represented jack-out state for VDNI/BVDNI combat gates', () => {
      const state = createStateWithUnit({
        abilities: ['vdni'],
        neuralInterfaceActive: true,
      });
      const event = makeEvent(GameEventType.NeuralInterfaceStateChanged, {
        unitId: 'unit-1',
        active: false,
        turn: 1,
        reason: 'pilot_jacked_out',
      } satisfies INeuralInterfaceStateChangedPayload);

      const result = applyEvent(state, event);

      expect(result.units['unit-1'].neuralInterfaceActive).toBe(false);
    });

    it('records represented jack-in state after a disconnected seed', () => {
      const state = createStateWithUnit({
        abilities: ['bvdni'],
        neuralInterfaceActive: false,
      });
      const event = makeEvent(GameEventType.NeuralInterfaceStateChanged, {
        unitId: 'unit-1',
        active: true,
        turn: 1,
        reason: 'pilot_jacked_in',
      } satisfies INeuralInterfaceStateChangedPayload);

      const result = applyEvent(state, event);

      expect(result.units['unit-1'].neuralInterfaceActive).toBe(true);
    });

    it('records represented Prototype DNI jack-out state through the same active-DNI gate', () => {
      const state = createStateWithUnit({
        abilities: ['proto_dni'],
        neuralInterfaceActive: true,
      });
      const event = makeEvent(GameEventType.NeuralInterfaceStateChanged, {
        unitId: 'unit-1',
        active: false,
        turn: 1,
        reason: 'pilot_jacked_out',
      } satisfies INeuralInterfaceStateChangedPayload);

      const result = applyEvent(state, event);

      expect(result.units['unit-1'].neuralInterfaceActive).toBe(false);
    });

    it('ignores neural-interface state changes for unknown units', () => {
      const state = createStateWithUnit({ neuralInterfaceActive: true });
      const event = makeEvent(GameEventType.NeuralInterfaceStateChanged, {
        unitId: 'missing-unit',
        active: false,
        turn: 1,
        reason: 'test_fixture',
      } satisfies INeuralInterfaceStateChangedPayload);

      const result = applyEvent(state, event);

      expect(result).toBe(state);
    });
  });

  describe('weaponsFiredThisTurn reset', () => {
    it('resets on TurnStarted', () => {
      const state = createStateWithUnit({
        weaponsFiredThisTurn: ['medium_laser_1', 'ac20'],
      });

      const event = makeEvent(GameEventType.TurnStarted, {}, { turn: 2 });

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].weaponsFiredThisTurn).toEqual([]);
    });
  });

  describe('9 new GameEventType values exist', () => {
    const expectedTypes = [
      'critical_hit_resolved',
      'psr_triggered',
      'psr_resolved',
      'unit_fell',
      'physical_attack_declared',
      'physical_attack_resolved',
      'shutdown_check',
      'startup_attempt',
      'ammo_consumed',
    ];

    it.each(expectedTypes)('GameEventType includes %s', (typeValue) => {
      const allValues = Object.values(GameEventType);
      expect(allValues).toContain(typeValue);
    });
  });
});
