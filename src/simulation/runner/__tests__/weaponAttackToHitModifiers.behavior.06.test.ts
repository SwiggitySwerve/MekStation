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
  it('applies Environmental Specialist rain relief to represented heavy rain ranged conditions', () => {
    const environmentalConditions = createEnvironmentalConditions({
      precipitation: 'heavy_rain',
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
            designatedEnvironment: 'rain',
          },
        }),
      }),
    );
    const lightRainSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions: createEnvironmentalConditions({
          precipitation: 'light_rain',
        }),
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'rain',
          },
        }),
      }),
    );

    expect(withoutSpecialist.toHitNumber).toBe(6);
    expect(withSpecialist.toHitNumber).toBe(5);
    expect(lightRainSpecialist.toHitNumber).toBe(5);
    expectModifier(withSpecialist, {
      name: 'Environmental Specialist (Rain)',
      value: -1,
      source: 'spa',
    });
    expect(
      withSpecialist.modifiers.filter(
        (modifier) => modifier.name === 'Environmental Specialist (Rain)',
      ),
    ).toHaveLength(1);
    expect(
      lightRainSpecialist.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Rain)',
      ),
    ).toBe(false);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'env-specialist-rain-ranged-to-hit-application'
      ],
    ).toMatchObject({ level: 'integrated' });
  });

  it('applies Environmental Specialist fog relief to represented heavy-fog energy ranged conditions', () => {
    const environmentalConditions = createEnvironmentalConditions({
      fog: 'heavy_fog',
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
            designatedEnvironment: 'fog',
          },
        }),
      }),
    );
    const nonEnergySpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'fog',
          },
        }),
        weapon: createLrm(),
      }),
    );
    const lightFogSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions: createEnvironmentalConditions({
          fog: 'light_fog',
        }),
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'fog',
          },
        }),
      }),
    );

    expect(withoutSpecialist.toHitNumber).toBe(6);
    expect(withSpecialist.toHitNumber).toBe(5);
    expect(nonEnergySpecialist.toHitNumber).toBe(6);
    expect(lightFogSpecialist.toHitNumber).toBe(5);
    expectModifier(withSpecialist, {
      name: 'Environmental Specialist (Fog)',
      value: -1,
      source: 'spa',
    });
    expect(
      withSpecialist.modifiers.filter(
        (modifier) => modifier.name === 'Environmental Specialist (Fog)',
      ),
    ).toHaveLength(1);
    expect(
      nonEnergySpecialist.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Fog)',
      ),
    ).toBe(false);
    expect(
      lightFogSpecialist.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Fog)',
      ),
    ).toBe(false);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'env-specialist-fog-ranged-to-hit-application'
      ],
    ).toMatchObject({ level: 'integrated' });
  });

  it('applies Environmental Specialist wind relief to represented moderate-wind missile ranged conditions', () => {
    const environmentalConditions = createEnvironmentalConditions({
      wind: 'moderate',
    });
    const missileWeapon = createLrm();
    const withoutSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        weapon: missileWeapon,
      }),
    );
    const withSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'wind',
          },
        }),
        weapon: missileWeapon,
      }),
    );
    const nonMissileSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'wind',
          },
        }),
      }),
    );
    const strongWindSpecialist = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions: createEnvironmentalConditions({
          wind: 'strong',
        }),
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'wind',
          },
        }),
        weapon: missileWeapon,
      }),
    );

    expect(withoutSpecialist.toHitNumber).toBe(5);
    expect(withSpecialist.toHitNumber).toBe(4);
    expect(nonMissileSpecialist.toHitNumber).toBe(4);
    expect(strongWindSpecialist.toHitNumber).toBe(6);
    expectModifier(withSpecialist, {
      name: 'Environmental Specialist (Wind)',
      value: -1,
      source: 'spa',
    });
    expect(
      withSpecialist.modifiers.filter(
        (modifier) => modifier.name === 'Environmental Specialist (Wind)',
      ),
    ).toHaveLength(1);
    expect(
      nonMissileSpecialist.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Wind)',
      ),
    ).toBe(false);
    expect(
      strongWindSpecialist.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Wind)',
      ),
    ).toBe(false);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'env-specialist-wind-ranged-to-hit-application'
      ],
    ).toMatchObject({ level: 'integrated' });
  });
});
