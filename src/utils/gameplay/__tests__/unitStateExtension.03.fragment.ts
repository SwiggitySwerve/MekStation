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
  describe('DamageApplied physical equipment lifecycle', () => {
    it('removes claw punch modifiers when an arm location is destroyed', () => {
      const state = createStateWithUnit({
        leftArmHasClaw: true,
        rightArmHasClaw: true,
      });
      const event = makeEvent(GameEventType.DamageApplied, {
        unitId: 'unit-1',
        location: 'left_arm',
        damage: 12,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } satisfies IDamageAppliedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftArmHasClaw).toBe(false);
      expect(result.units['unit-1'].rightArmHasClaw).toBe(true);
    });

    it('removes cascaded claw modifiers when side torso destruction destroys the arm', () => {
      const state = createStateWithUnit({
        leftArmHasClaw: true,
        rightArmHasClaw: true,
      });
      const event = makeEvent(GameEventType.DamageApplied, {
        unitId: 'unit-1',
        location: 'left_torso',
        damage: 30,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } satisfies IDamageAppliedPayload);

      const result = applyEvent(state, event);
      const unit = result.units['unit-1'];
      expect(unit.destroyedLocations).toEqual(['left_torso', 'left_arm']);
      expect(unit.leftArmHasClaw).toBe(false);
      expect(unit.rightArmHasClaw).toBe(true);
    });

    it('removes talon kick modifiers when a leg location is destroyed', () => {
      const state = createStateWithUnit({
        leftLegHasTalons: true,
        rightLegHasTalons: true,
      });
      const event = makeEvent(GameEventType.DamageApplied, {
        unitId: 'unit-1',
        location: 'right_leg',
        damage: 18,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } satisfies IDamageAppliedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftLegHasTalons).toBe(true);
      expect(result.units['unit-1'].rightLegHasTalons).toBe(false);
    });

    it('removes quad front-leg talon modifiers when an arm location is destroyed', () => {
      const state = createStateWithUnit({
        isQuad: true,
        rightArmHasTalons: true,
      });
      const event = makeEvent(GameEventType.DamageApplied, {
        unitId: 'unit-1',
        location: 'right_arm',
        damage: 18,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } satisfies IDamageAppliedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].rightArmHasTalons).toBe(false);
    });
  });

  describe('PSRTriggered reducer', () => {
    it('adds pending PSR', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.PSRTriggered, {
        unitId: 'unit-1',
        reason: '20+ damage this phase',
        additionalModifier: 0,
        triggerSource: 'damage',
      } satisfies IPSRTriggeredPayload);

      const result = applyEvent(state, event);
      const psrs = result.units['unit-1'].pendingPSRs ?? [];
      expect(psrs).toHaveLength(1);
      expect(psrs[0].reason).toBe('20+ damage this phase');
    });

    it('preserves canonical PSR reason codes on pending PSRs', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.PSRTriggered, {
        unitId: 'unit-1',
        reason: 'Reactor shutdown',
        additionalModifier: 0,
        triggerSource: 'heat_shutdown',
        reasonCode: PSRTrigger.Shutdown,
      } satisfies IPSRTriggeredPayload);

      const result = applyEvent(state, event);
      const psrs = result.units['unit-1'].pendingPSRs ?? [];

      expect(psrs).toHaveLength(1);
      expect(psrs[0]).toMatchObject({
        entityId: 'unit-1',
        reason: 'Reactor shutdown',
        reasonCode: PSRTrigger.Shutdown,
      });
    });

    it('preserves fixed PSR target numbers on pending PSRs', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.PSRTriggered, {
        unitId: 'unit-1',
        reason: 'MASC failure check',
        additionalModifier: 0,
        triggerSource: PSRTrigger.MASCFailure,
        reasonCode: PSRTrigger.MASCFailure,
        fixedTargetNumber: 7,
      } satisfies IPSRTriggeredPayload);

      const result = applyEvent(state, event);
      const psrs = result.units['unit-1'].pendingPSRs ?? [];

      expect(psrs).toHaveLength(1);
      expect(psrs[0]).toMatchObject({
        entityId: 'unit-1',
        reason: 'MASC failure check',
        reasonCode: PSRTrigger.MASCFailure,
        fixedTargetNumber: 7,
      });
    });

    it('accumulates multiple PSRs', () => {
      const initial = createStateWithUnit();

      const afterFirst = applyEvent(
        initial,
        makeEvent(GameEventType.PSRTriggered, {
          unitId: 'unit-1',
          reason: '20+ damage this phase',
          additionalModifier: 0,
          triggerSource: 'damage',
        } satisfies IPSRTriggeredPayload),
      );

      const afterSecond = applyEvent(
        afterFirst,
        makeEvent(GameEventType.PSRTriggered, {
          unitId: 'unit-1',
          reason: 'gyro hit',
          additionalModifier: 3,
          triggerSource: 'critical_hit',
        } satisfies IPSRTriggeredPayload),
      );

      const psrs = afterSecond.units['unit-1']?.pendingPSRs ?? [];
      expect(psrs).toHaveLength(2);
    });
  });

  describe('PSRResolved reducer', () => {
    it('removes resolved PSR from pending list', () => {
      const state = createStateWithUnit({
        pendingPSRs: [
          {
            entityId: 'unit-1',
            reason: '20+ damage',
            additionalModifier: 0,
            triggerSource: 'damage',
          },
          {
            entityId: 'unit-1',
            reason: 'gyro hit',
            additionalModifier: 3,
            triggerSource: 'critical_hit',
          },
        ],
      });

      const event = makeEvent(GameEventType.PSRResolved, {
        unitId: 'unit-1',
        targetNumber: 5,
        roll: 8,
        modifiers: 0,
        passed: true,
        reason: '20+ damage',
      } satisfies IPSRResolvedPayload);

      const result = applyEvent(state, event);
      const psrs = result.units['unit-1'].pendingPSRs ?? [];
      expect(psrs).toHaveLength(1);
      expect(psrs[0].reason).toBe('gyro hit');
    });
  });

  describe('UnitFell reducer', () => {
    it('sets unit prone with new facing and clears pending PSRs', () => {
      const state = createStateWithUnit({
        pendingPSRs: [
          {
            entityId: 'unit-1',
            reason: 'test',
            additionalModifier: 0,
            triggerSource: 'test',
          },
        ],
      });

      const event = makeEvent(GameEventType.UnitFell, {
        unitId: 'unit-1',
        fallDamage: 5,
        newFacing: Facing.Southeast,
        pilotDamage: 1,
      } satisfies IUnitFellPayload);

      const result = applyEvent(state, event);
      const unit = result.units['unit-1'];
      expect(unit.prone).toBe(true);
      expect(unit.facing).toBe(Facing.Southeast);
      expect(unit.pendingPSRs).toEqual([]);
    });
  });

  describe('UnitStuck reducer', () => {
    it('sets unit stuck and clears pending PSRs without changing prone state', () => {
      const state = createStateWithUnit({
        pendingPSRs: [
          {
            entityId: 'unit-1',
            reason: 'Avoid bogging down',
            reasonCode: PSRTrigger.SwampBogDown,
            additionalModifier: 0,
            triggerSource: PSRTrigger.SwampBogDown,
          },
        ],
        prone: false,
      });

      const event = makeEvent(GameEventType.UnitStuck, {
        unitId: 'unit-1',
        reason: 'Avoid bogging down',
        reasonCode: PSRTrigger.SwampBogDown,
      } satisfies IUnitStuckPayload);

      const result = applyEvent(state, event);
      const unit = result.units['unit-1'];
      expect(unit.isStuck).toBe(true);
      expect(unit.prone).toBe(false);
      expect(unit.pendingPSRs).toEqual([]);
    });
  });

  describe('ShutdownCheck reducer', () => {
    it('sets shutdown when check fails', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.ShutdownCheck, {
        unitId: 'unit-1',
        heatLevel: 18,
        targetNumber: 6,
        roll: 4,
        shutdownOccurred: true,
      } satisfies IShutdownCheckPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].shutdown).toBe(true);
    });

    it('does not set shutdown when check passes', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.ShutdownCheck, {
        unitId: 'unit-1',
        heatLevel: 18,
        targetNumber: 6,
        roll: 8,
        shutdownOccurred: false,
      } satisfies IShutdownCheckPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].shutdown).toBe(false);
    });
  });
});
