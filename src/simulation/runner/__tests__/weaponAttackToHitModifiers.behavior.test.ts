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
  it('threads wounds, sensor hits, actuator damage, and attacker prone into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          pilotWounds: 1,
          prone: true,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            sensorHits: 1,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
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
      toHitNumber: 9,
    });
    expectModifier(payload, {
      name: 'Pilot Wounds',
      value: 1,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Sensor Damage',
      value: 1,
      source: 'damage',
    });
    expectModifier(payload, {
      name: 'Actuator Damage',
      value: 1,
      source: 'damage',
    });
    expectModifier(payload, {
      name: 'Attacker Prone',
      value: 2,
      source: 'other',
    });
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['pilot-wounds']).toMatchObject(
      { level: 'integrated' },
    );
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['sensor-damage'],
    ).toMatchObject({ level: 'integrated' });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['actuator-damage'],
    ).toMatchObject({ level: 'integrated' });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['attacker-prone'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('keeps Pain Resistance from reducing ranged wound penalties in AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          abilities: ['pain-resistance'],
          pilotWounds: 2,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);
    expect(payload.toHitNumber).toBe(6);
    expectModifier(payload, {
      name: 'Pilot Wounds',
      value: 2,
      source: 'other',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'legacy-pain-resistance-to-hit-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('preserve raw pilot wound penalties'),
    });
  });

  it('threads non-blocking intervening terrain features into AttackDeclared', () => {
    const clearEvents = runModifierScenario();
    const terrainEvents = runModifierScenario({
      grid: createGrid(TerrainType.Clear, [
        { q: 1, r: 0, terrain: TerrainType.LightWoods },
        { q: 2, r: 0, terrain: TerrainType.Smoke },
      ]),
    });

    expect(
      terrainEvents.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const clearPayload = attackDeclaredPayload(clearEvents);
    const terrainPayload = attackDeclaredPayload(terrainEvents);
    const helperTerrainModifier = getTerrainToHitModifier(
      [],
      [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.Smoke, level: 1 }],
      ],
    );

    expect(helperTerrainModifier).toBe(2);
    expect(clearPayload.toHitNumber).toBe(4);
    expect(terrainPayload.toHitNumber).toBe(
      clearPayload.toHitNumber + helperTerrainModifier,
    );
    expectModifier(terrainPayload, {
      name: 'Intervening Terrain',
      value: helperTerrainModifier,
      source: 'terrain',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['terrain-features'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-to-hit-features'],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads explicit C3 network state into AttackDeclared range math', () => {
    const network = createC3MasterSlaveNetwork('runner-c3', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 0, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 5, r: 0 },
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
      runModifierScenario({ state: c3State }),
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
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.c3).toMatchObject({
      level: 'integrated',
    });
  });
});
