import {
  ActuatorType,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  TerrainType,
  UnitType,
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
  createEnvironmentalConditions,
  calculateLOS,
  getTerrainToHitModifier,
  SeededRandom,
  InvariantRunner,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  SPA_COMBAT_SUPPORT,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  runAttackPhase,
  DEFAULT_COMPONENT_DAMAGE,
  IAttackDeclaredPayload,
  CriticalSlotManifest,
  IGameEvent,
  IGameState,
  IHexGrid,
  IEnvironmentalConditions,
  IMovementCapability,
  IUnitGameState,
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
  IWeapon,
  IViolation,
  MEDIUM_LASER_ID,
  LRM_ID,
  BASE_ARMOR,
  BASE_STRUCTURE,
  DeclaresWeaponAttackAI,
  createLrm,
  createMediumLaser,
  createUnit,
  createHex,
  createGrid,
  createWeaponAttackState,
  runModifierScenario,
  attackDeclaredPayload,
  attackDeclaredPayloads,
  expectModifier,
} from './weaponAttackToHitModifiers.behavior.test-helpers';

describe('runAttackPhase to-hit modifier integration', () => {
  it('threads target movement, prone, shutdown, and target terrain into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 5,
          prone: true,
          shutdown: true,
        },
      }),
      grid: createGrid(TerrainType.LightWoods),
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [MEDIUM_LASER_ID],
      range: 'short',
      toHitNumber: 5,
    });
    expectModifier(payload, {
      name: 'Target Movement (TMM)',
      value: 3,
      source: 'target_movement',
    });
    expectModifier(payload, {
      name: 'Target Prone',
      value: 1,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Target Immobile',
      value: -4,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Partial Cover' }),
    );
  });

  it('threads explicit target hull-down state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          hullDown: true,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(6);
    expectModifier(payload, {
      name: 'Hull-Down',
      value: 2,
      source: 'terrain',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Partial Cover' }),
    );
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['hull-down']).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads explicit target evasion state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          isEvading: true,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(5);
    expectModifier(payload, {
      name: 'Target Evasion',
      value: 1,
      source: 'target_movement',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-evasion'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('threads explicit Skilled Evasion target bonuses into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          isEvading: true,
          evasionBonus: 3,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(7);
    expectModifier(payload, {
      name: 'Target Evasion',
      value: 3,
      source: 'target_movement',
    });
  });

  it('threads explicit target sprinted state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          sprintedThisTurn: true,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(3);
    expectModifier(payload, {
      name: 'Target Sprinted',
      value: -1,
      source: 'target_movement',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-movement'],
    ).toMatchObject({ level: 'integrated' });
  });
});
