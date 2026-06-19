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
  it('applies actual Targeting Computer equipment in runner to-hit without Triple-Core Processor', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState({
      attacker: { targetingComputerEquipment: true },
    });

    runAttackPhase({
      state,
      botPlayer: new DeclaresWeaponAttackAI(MEDIUM_LASER_ID),
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

    expect(payload.toHitNumber).toBe(3);
    expectModifier(payload, {
      name: 'Targeting Computer',
      value: -1,
      source: 'equipment',
    });
  });

  it('does not double-apply actual Targeting Computer equipment with TCP aimed-shot relief', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState({
      attacker: {
        abilities: ['triple_core_processor', 'bvdni'],
        targetingComputerEquipment: true,
      },
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
    const targetingComputerModifiers = payload.modifiers.filter(
      (modifier) => modifier.name === 'Targeting Computer',
    );

    expect(payload.toHitNumber).toBe(5);
    expect(targetingComputerModifiers).toHaveLength(1);
  });

  it('suppresses represented Triple-Core Processor aimed-shot relief when neural interface is disconnected', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState({
      attacker: {
        abilities: ['triple_core_processor', 'bvdni'],
        neuralInterfaceActive: false,
      },
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

    expect(payload.toHitNumber).toBe(7);
    expect(payload.modifiers.some((modifier) => modifier.name === 'VDNI')).toBe(
      false,
    );
    expectModifier(payload, {
      name: 'Called Shot',
      value: 3,
      source: 'other',
    });
    expect(
      payload.modifiers.some(
        (modifier) => modifier.name === 'Targeting Computer',
      ),
    ).toBe(false);
  });

  it('threads attacker gunnery, movement, and heat into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          gunnery: 3,
          movementThisTurn: MovementType.Run,
          heat: 8,
        },
      }),
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
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Gunnery Skill',
      value: 3,
      source: 'base',
    });
    expectModifier(payload, {
      name: 'Attacker Movement',
      value: 2,
      source: 'attacker_movement',
    });
    expectModifier(payload, { name: 'Heat', value: 1, source: 'heat' });
  });

  it('applies Some Like It Hot heat to-hit relief in AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          heat: 17,
          abilities: ['some-like-it-hot'],
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(6);
    expectModifier(payload, { name: 'Heat', value: 2, source: 'heat' });
    expect(SPA_COMBAT_SUPPORT['some-like-it-hot']).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Some Like It Hot'),
    });
  });
});
