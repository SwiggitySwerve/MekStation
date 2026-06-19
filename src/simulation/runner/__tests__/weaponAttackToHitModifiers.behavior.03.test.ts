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
  it('requires C3 spotter line of sight when PLAYTEST_3 is enabled', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-playtest3-los', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 1 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });
    const grid = createGrid(TerrainType.Clear, [
      {
        q: 1,
        r: 1,
        terrain: JSON.stringify([
          { type: TerrainType.HeavyWoods, level: 1 },
          { type: TerrainType.LightWoods, level: 1 },
        ]),
      },
    ]);

    expect(network).not.toBeNull();
    expect(
      calculateLOS(state.units['player-1'].position, { q: 0, r: 0 }, grid)
        .hasLOS,
    ).toBe(true);
    expect(calculateLOS({ q: 2, r: 1 }, { q: 0, r: 0 }, grid).hasLOS).toBe(
      false,
    );

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 1 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({
        state: c3State,
        grid,
        optionalRules: ['PLAYTEST_3'],
      }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('keeps C3 range sharing under PLAYTEST_3 when the spotter has line of sight', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-playtest3-clear', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({
        state: c3State,
        optionalRules: ['PLAYTEST_3'],
      }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 4,
    });
    expectModifier(payload, {
      name: 'Range (short)',
      value: 0,
      source: 'range',
    });
    expectModifier(payload, {
      name: 'C3 Network',
      value: 0,
      source: 'equipment',
    });
  });

  it('hydrates iNARC ECM pod disruption before runner C3 range math', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-ecm', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: {
        position: { q: 5, r: 0 },
        iNarcPods: [{ teamId: GameSide.Opponent, podType: 'ecm' }],
      },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({ state: c3State }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('does not add a generic ECM to-hit penalty for Artemis guidance', () => {
    const baseState = createWeaponAttackState();
    const state: IGameState = {
      ...baseState,
      electronicWarfare: {
        ecmSuites: [
          {
            type: 'guardian',
            mode: 'ecm',
            operational: true,
            entityId: 'opponent-ecm-suite',
            teamId: GameSide.Opponent,
            position: baseState.units['opponent-1'].position,
          },
        ],
        activeProbes: [],
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({
        state,
        weapon: { ...createLrm(), hasArtemisIV: true },
      }),
    );

    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: expect.stringContaining('ECM') }),
    );
  });
});
