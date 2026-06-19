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
  it('threads target-hex terrain modifiers into AttackDeclared', () => {
    const clearEvents = runModifierScenario();
    const heavyWoodsEvents = runModifierScenario({
      grid: createGrid(TerrainType.HeavyWoods),
    });
    const waterEvents = runModifierScenario({
      grid: createGrid(TerrainType.Water),
    });
    const smokeEvents = runModifierScenario({
      grid: createGrid(TerrainType.Smoke),
    });

    const clearPayload = attackDeclaredPayload(clearEvents);
    const heavyWoodsPayload = attackDeclaredPayload(heavyWoodsEvents);
    const waterPayload = attackDeclaredPayload(waterEvents);
    const smokePayload = attackDeclaredPayload(smokeEvents);

    expect(clearPayload.toHitNumber).toBe(4);
    expect(heavyWoodsPayload.toHitNumber).toBe(6);
    expectModifier(heavyWoodsPayload, {
      name: 'Target Terrain',
      value: 2,
      source: 'terrain',
    });

    expect(waterPayload.toHitNumber).toBe(4);
    expectModifier(waterPayload, {
      name: 'Partial Cover',
      value: 1,
      source: 'terrain',
    });
    expectModifier(waterPayload, {
      name: 'Target Terrain',
      value: -1,
      source: 'terrain',
    });

    expect(smokePayload.toHitNumber).toBe(5);
    expect(smokePayload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Partial Cover' }),
    );
    expectModifier(smokePayload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['smoke-to-hit']).toMatchObject({
      level: 'integrated',
    });
  });

  it('grants no partial cover for a swamp target hex (audit 2026-06-09 C-7)', () => {
    // MegaMek grants no swamp partial cover: LosEffects has no swamp cover
    // source, so a swamp target hex must not produce the +1 Partial Cover
    // modifier (nor the downstream leg-hit conversion gated on it). The local
    // target-in swamp +1 Target Terrain modifier is a separate, documented
    // MekStation deviation and stays.
    const swampEvents = runModifierScenario({
      grid: createGrid(TerrainType.Swamp),
    });

    const swampPayload = attackDeclaredPayload(swampEvents);

    expect(swampPayload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Partial Cover' }),
    );
    expectModifier(swampPayload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
    expect(swampPayload.toHitNumber).toBe(5);
  });

  it('threads environmental light, weather, fog, and missile wind into AttackDeclared', () => {
    const environmentalConditions = createEnvironmentalConditions({
      light: 'night',
      precipitation: 'heavy_rain',
      fog: 'heavy_fog',
      blowingSand: true,
      wind: 'strong',
    });
    const laserEvents = runModifierScenario({ environmentalConditions });
    const missileEvents = runModifierScenario({
      environmentalConditions,
      weapon: createLrm(),
    });

    const laserPayload = attackDeclaredPayload(laserEvents);
    const missilePayload = attackDeclaredPayload(missileEvents);

    expect(laserPayload.toHitNumber).toBe(11);
    expectModifier(laserPayload, {
      name: 'Light Conditions',
      value: 2,
      source: 'environmental',
    });
    expectModifier(laserPayload, {
      name: 'Precipitation',
      value: 2,
      source: 'environmental',
    });
    expectModifier(laserPayload, {
      name: 'Fog',
      value: 2,
      source: 'environmental',
    });
    expectModifier(laserPayload, {
      name: 'Blowing Sand',
      value: 1,
      source: 'environmental',
    });
    expect(
      laserPayload.modifiers.some((modifier) =>
        modifier.name.startsWith('Wind'),
      ),
    ).toBe(false);

    expect(missilePayload.toHitNumber).toBe(12);
    expectModifier(missilePayload, {
      name: 'Wind (Missiles)',
      value: 2,
      source: 'environmental',
    });
    expect(
      missilePayload.modifiers.some(
        (modifier) => modifier.name === 'Blowing Sand',
      ),
    ).toBe(false);
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['environmental-conditions'],
    ).toMatchObject({ level: 'integrated' });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.fog).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.night).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.dust).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies Environmental Specialist snow relief to represented ranged snow conditions', () => {
    const environmentalConditions = createEnvironmentalConditions({
      precipitation: 'snow',
    });
    const withoutSpecialist = attackDeclaredPayload(
      runModifierScenario({ environmentalConditions }),
    );
    const withSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'snow',
          },
        }),
      }),
    );

    expect(withoutSpecialist.toHitNumber).toBe(5);
    expect(withSpecialist.toHitNumber).toBe(4);
    expectModifier(withSpecialist, {
      name: 'Environmental Specialist (Snow)',
      value: -1,
      source: 'spa',
    });
    expect(
      withSpecialist.modifiers.filter(
        (modifier) => modifier.name === 'Environmental Specialist (Snow)',
      ),
    ).toHaveLength(1);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'env-specialist-snow-ranged-to-hit-application'
      ],
    ).toMatchObject({ level: 'integrated' });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('source-backed runtime branches'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist.gap,
    ).toBeUndefined();
  });
});
