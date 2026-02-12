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
  IPSRTriggeredPayload,
  IPSRResolvedPayload,
  IUnitFellPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IAmmoConsumedPayload,
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
