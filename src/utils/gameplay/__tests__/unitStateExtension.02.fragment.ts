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
  describe('CriticalHitResolved reducer', () => {
    it('increments engine hits', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'center_torso',
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Fusion Engine',
        effect: '+5 heat per turn',
        destroyed: false,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.engineHits).toBe(1);
    });

    it('increments gyro hits', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'center_torso',
        slotIndex: 2,
        componentType: 'gyro',
        componentName: 'Standard Gyro',
        effect: '+3 PSR modifier',
        destroyed: false,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.gyroHits).toBe(1);
    });

    it('increments sensor hits', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'head',
        slotIndex: 1,
        componentType: 'sensor',
        componentName: 'Sensors',
        effect: '+1 to-hit',
        destroyed: false,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.sensorHits).toBe(1);
    });

    it('tracks cockpit hit', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'head',
        slotIndex: 0,
        componentType: 'cockpit',
        componentName: 'Cockpit',
        effect: 'pilot killed',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.cockpitHit).toBe(true);
    });

    it('tracks destroyed weapons', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'right_arm',
        slotIndex: 4,
        componentType: 'weapon',
        componentName: 'Medium Laser',
        effect: 'weapon destroyed',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(
        result.units['unit-1'].componentDamage?.weaponsDestroyed,
      ).toContain('Medium Laser');
    });

    it('tracks heat sink destruction', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'left_torso',
        slotIndex: 3,
        componentType: 'heat_sink',
        componentName: 'Heat Sink',
        effect: '-1 dissipation',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.heatSinksDestroyed).toBe(
        1,
      );
    });

    it('tracks jump jet destruction', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'right_torso',
        slotIndex: 5,
        componentType: 'jump_jet',
        componentName: 'Jump Jet',
        effect: '-1 jump MP',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.jumpJetsDestroyed).toBe(1);
    });

    it('tracks actuator destruction', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'left_arm',
        slotIndex: 0,
        componentType: 'actuator',
        componentName: 'Shoulder',
        effect: 'cannot punch',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(
        result.units['unit-1'].componentDamage?.actuators['Shoulder'],
      ).toBe(true);
    });

    it('handles life support hits', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'head',
        slotIndex: 2,
        componentType: 'life_support',
        componentName: 'Life Support',
        effect: 'pilot vulnerable to heat',
        destroyed: false,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].componentDamage?.lifeSupport).toBe(1);
    });

    it('removes claw punch modifiers when a claw critical slot is destroyed', () => {
      const state = createStateWithUnit({
        leftArmHasClaw: true,
        rightArmHasClaw: true,
      });
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'left_arm',
        slotIndex: 4,
        componentType: 'equipment',
        componentName: 'Claw',
        effect: 'Equipment destroyed: Claw',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftArmHasClaw).toBe(false);
      expect(result.units['unit-1'].rightArmHasClaw).toBe(true);
    });

    it('removes claw punch modifiers when a claw critical slot is marked missing', () => {
      const state = createStateWithUnit({
        leftArmHasClaw: true,
        rightArmHasClaw: true,
      });
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'right_arm',
        slotIndex: 4,
        componentType: 'equipment',
        componentName: 'Claw',
        effect: 'Equipment missing: Claw',
        destroyed: false,
        missing: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftArmHasClaw).toBe(true);
      expect(result.units['unit-1'].rightArmHasClaw).toBe(false);
    });

    it('removes talon kick modifiers when a talons critical slot is destroyed', () => {
      const state = createStateWithUnit({
        leftLegHasTalons: true,
        rightLegHasTalons: true,
      });
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'right_leg',
        slotIndex: 4,
        componentType: 'equipment',
        componentName: 'Talons',
        effect: 'Equipment destroyed: Talons',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftLegHasTalons).toBe(true);
      expect(result.units['unit-1'].rightLegHasTalons).toBe(false);
    });

    it('removes talon kick modifiers when a talons critical slot is breached', () => {
      const state = createStateWithUnit({
        leftLegHasTalons: true,
        rightLegHasTalons: true,
      });
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'left_leg',
        slotIndex: 4,
        componentType: 'equipment',
        componentName: 'Talons',
        effect: 'Equipment breached: Talons',
        destroyed: false,
        breached: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftLegHasTalons).toBe(false);
      expect(result.units['unit-1'].rightLegHasTalons).toBe(true);
    });

    it('removes quad front-leg talon modifiers when an arm-location talons critical is destroyed', () => {
      const state = createStateWithUnit({
        isQuad: true,
        leftArmHasTalons: true,
        rightArmHasTalons: true,
      });
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'right_arm',
        slotIndex: 4,
        componentType: 'equipment',
        componentName: 'Talons',
        effect: 'Equipment destroyed: Talons',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftArmHasTalons).toBe(true);
      expect(result.units['unit-1'].rightArmHasTalons).toBe(false);
    });

    it('does not remove physical modifiers for unrelated equipment criticals', () => {
      const state = createStateWithUnit({
        leftArmHasClaw: true,
        rightLegHasTalons: true,
      });
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'unit-1',
        location: 'right_torso',
        slotIndex: 4,
        componentType: 'equipment',
        componentName: 'CASE',
        effect: 'Equipment destroyed: CASE',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result.units['unit-1'].leftArmHasClaw).toBe(true);
      expect(result.units['unit-1'].rightLegHasTalons).toBe(true);
    });

    it('ignores events for non-existent units', () => {
      const state = createStateWithUnit();
      const event = makeEvent(GameEventType.CriticalHitResolved, {
        unitId: 'nonexistent',
        location: 'head',
        slotIndex: 0,
        componentType: 'cockpit',
        componentName: 'Cockpit',
        effect: 'pilot killed',
        destroyed: true,
      } satisfies ICriticalHitResolvedPayload);

      const result = applyEvent(state, event);
      expect(result).toBe(state);
    });
  });
});
