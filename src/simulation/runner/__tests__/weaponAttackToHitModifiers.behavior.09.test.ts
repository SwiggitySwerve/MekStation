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
  it('threads per-weapon secondary target state and Multi-Tasker into AttackDeclared', () => {
    const secondaryWeaponId = 'medium-laser-secondary';
    const state = createWeaponAttackState({
      attacker: {
        abilities: ['multi-tasker'],
      },
      target: {
        position: { q: 0, r: 2 },
      },
    });
    const multiTargetState: IGameState = {
      ...state,
      units: {
        ...state.units,
        'opponent-2': createUnit({
          id: 'opponent-2',
          side: GameSide.Opponent,
          position: { q: 3, r: -1 },
        }),
      },
    };
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];

    runAttackPhase({
      state: multiTargetState,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID, secondaryWeaponId],
        {
          [MEDIUM_LASER_ID]: 'opponent-1',
          [secondaryWeaponId]: 'opponent-2',
        },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: multiTargetState.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        [
          'player-1',
          [
            createMediumLaser(MEDIUM_LASER_ID),
            createMediumLaser(secondaryWeaponId),
          ],
        ],
        ['opponent-1', []],
        ['opponent-2', []],
      ]),
    });

    const payloads = attackDeclaredPayloads(events);
    const primaryPayload = payloads.find(
      (payload) => payload.targetId === 'opponent-1',
    );
    const secondaryPayload = payloads.find(
      (payload) => payload.targetId === 'opponent-2',
    );

    expect(primaryPayload?.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Secondary Target' }),
    );
    expect(secondaryPayload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-2',
      weapons: [secondaryWeaponId],
      toHitNumber: 5,
    });
    expectModifier(secondaryPayload!, {
      name: 'Secondary Target',
      value: 2,
      source: 'other',
    });
    expectModifier(secondaryPayload!, {
      name: 'Multi-Tasker',
      value: -1,
      source: 'spa',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['secondary-target'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['multi-tasker']).toMatchObject({
      level: 'integrated',
    });
  });

  it('does not consume local Multi-Target as source-backed Multi-Tasker relief', () => {
    const secondaryWeaponId = 'medium-laser-secondary';
    const state = createWeaponAttackState({
      attacker: {
        abilities: ['multi-target'],
      },
      target: {
        position: { q: 0, r: 2 },
      },
    });
    const multiTargetState: IGameState = {
      ...state,
      units: {
        ...state.units,
        'opponent-2': createUnit({
          id: 'opponent-2',
          side: GameSide.Opponent,
          position: { q: 3, r: -1 },
        }),
      },
    };
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];

    runAttackPhase({
      state: multiTargetState,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID, secondaryWeaponId],
        {
          [MEDIUM_LASER_ID]: 'opponent-1',
          [secondaryWeaponId]: 'opponent-2',
        },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: multiTargetState.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        [
          'player-1',
          [
            createMediumLaser(MEDIUM_LASER_ID),
            createMediumLaser(secondaryWeaponId),
          ],
        ],
        ['opponent-1', []],
        ['opponent-2', []],
      ]),
    });

    const secondaryPayload = attackDeclaredPayloads(events).find(
      (payload) => payload.targetId === 'opponent-2',
    );

    expect(secondaryPayload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-2',
      weapons: [secondaryWeaponId],
      toHitNumber: 6,
    });
    expectModifier(secondaryPayload!, {
      name: 'Secondary Target',
      value: 2,
      source: 'other',
    });
    expect(
      secondaryPayload?.modifiers.some(
        (modifier) => modifier.name === 'Multi-Tasker',
      ),
    ).toBe(false);
    expect(SPA_COMBAT_SUPPORT['multi-target']).toMatchObject({
      level: 'out-of-scope',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ],
    ).toMatchObject({
      level: 'integrated',
    });
  });
});
