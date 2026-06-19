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
  it('does not add a generic ECM to-hit penalty for NARC guidance', () => {
    const baseState = createWeaponAttackState({
      target: { narcedBy: [GameSide.Player] },
    });
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
      runModifierScenario({ state, weapon: createLrm() }),
    );

    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: expect.stringContaining('ECM') }),
    );
  });

  it('does not add runner ECM to-hit modifiers for unguided weapon attacks', () => {
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

    const payload = attackDeclaredPayload(runModifierScenario({ state }));

    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: expect.stringContaining('ECM') }),
    );
  });

  it('refreshes C3 member lifecycle state before runner range math', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-lifecycle', [
      createC3Unit({
        entityId: 'master-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'slave',
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
        'master-1': createUnit({
          id: 'master-1',
          side: GameSide.Player,
          position: { q: 5, r: 0 },
          overrides: { destroyed: true },
        }),
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

  it('suppresses C3 range sharing when mounted C3 equipment is critically destroyed', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-damaged-equipment', [
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
        c3Equipment: [
          {
            role: 'master',
            sourceEquipmentId: 'C3 Master Computer',
            sourceLocation: 'CENTER_TORSO',
          },
        ],
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
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'player-1',
        {
          center_torso: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'C3 Master Computer',
              destroyed: true,
            },
          ],
        },
      ],
    ]);

    const payload = attackDeclaredPayload(
      runModifierScenario({ state: c3State, manifestsByUnit }),
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
});
