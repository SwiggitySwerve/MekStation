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
  it('threads secondary-facing torso twist into secondary target front-arc math', () => {
    const secondaryWeaponId = 'medium-laser-secondary';
    const state = createWeaponAttackState({
      attacker: {
        facing: Facing.North,
        secondaryFacing: Facing.Northeast,
      },
      target: {
        position: { q: 0, r: -2 },
      },
    });
    const multiTargetState: IGameState = {
      ...state,
      units: {
        ...state.units,
        'opponent-2': createUnit({
          id: 'opponent-2',
          side: GameSide.Opponent,
          position: { q: 2, r: -1 },
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
      toHitNumber: 5,
    });
    expectModifier(secondaryPayload!, {
      name: 'Secondary Target',
      value: 1,
      source: 'other',
    });
  });

  it('threads per-weapon called-shot intent into AttackDeclared to-hit math', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState();

    runAttackPhase({
      state,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID],
        undefined,
        { [MEDIUM_LASER_ID]: true },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        ['player-1', [createMediumLaser(MEDIUM_LASER_ID)]],
        ['opponent-1', []],
      ]),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(7);
    expectModifier(payload, {
      name: 'Called Shot',
      value: 3,
      source: 'other',
    });
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['called-shot']).toMatchObject({
      level: 'integrated',
    });
  });

  it('uses source-backed called-shot penalties without local Marksman reductions', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState({
      attacker: { abilities: ['marksman', 'sharpshooter'] },
    });

    runAttackPhase({
      state,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID],
        undefined,
        { [MEDIUM_LASER_ID]: true },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        ['player-1', [createMediumLaser(MEDIUM_LASER_ID)]],
        ['opponent-1', []],
      ]),
    });

    const payload = attackDeclaredPayload(events);
    const calledShotModifier = payload.modifiers.find(
      (modifier) => modifier.name === 'Called Shot',
    );

    expect(payload.toHitNumber).toBe(7);
    expect(calledShotModifier).toMatchObject({
      value: 3,
      source: 'other',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application'],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies represented Triple-Core Processor aimed-shot relief in runner to-hit', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState({
      attacker: { abilities: ['triple_core_processor', 'bvdni'] },
    });

    runAttackPhase({
      state,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID],
        undefined,
        { [MEDIUM_LASER_ID]: true },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        ['player-1', [createMediumLaser(MEDIUM_LASER_ID)]],
        ['opponent-1', []],
      ]),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(5);
    expectModifier(payload, {
      name: 'VDNI',
      value: -1,
      source: 'spa',
    });
    expectModifier(payload, {
      name: 'Called Shot',
      value: 3,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Targeting Computer',
      value: -1,
      source: 'equipment',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'triple-core-processor-aimed-shot-application'
      ],
    ).toMatchObject({
      level: 'integrated',
    });
  });
});
