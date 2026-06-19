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
  it('applies Environmental Specialist light relief to represented ranged light and illumination state', () => {
    const environmentalConditions = createEnvironmentalConditions({
      light: 'glare',
    });
    const withoutSpecialist = attackDeclaredPayload(
      runModifierScenario({ environmentalConditions }),
    );
    const withUnilluminatedTarget = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'light',
          },
          target: {
            isIlluminated: false,
          },
        }),
      }),
    );
    const withoutIlluminationState = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'light',
          },
        }),
      }),
    );
    const illuminatedGlareTarget = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions,
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'light',
          },
          target: {
            isIlluminated: true,
          },
        }),
      }),
    );
    const illuminatedPitchBlackTarget = attackDeclaredPayload(
      runModifierScenario({
        environmentalConditions: createEnvironmentalConditions({
          light: 'pitch_black',
        }),
        state: createWeaponAttackState({
          attacker: {
            abilities: ['env_specialist'],
            designatedEnvironment: 'light',
          },
          target: {
            isIlluminated: true,
          },
        }),
      }),
    );

    expect(withoutSpecialist.toHitNumber).toBe(6);
    expect(withUnilluminatedTarget.toHitNumber).toBe(5);
    expect(withoutIlluminationState.toHitNumber).toBe(6);
    expect(illuminatedGlareTarget.toHitNumber).toBe(6);
    expect(illuminatedPitchBlackTarget.toHitNumber).toBe(7);
    expectModifier(withUnilluminatedTarget, {
      name: 'Environmental Specialist (Light)',
      value: -1,
      source: 'spa',
    });
    expectModifier(illuminatedPitchBlackTarget, {
      name: 'Environmental Specialist (Light)',
      value: -1,
      source: 'spa',
    });
    expect(
      withoutIlluminationState.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Light)',
      ),
    ).toBe(false);
    expect(
      illuminatedGlareTarget.modifiers.some(
        (modifier) => modifier.name === 'Environmental Specialist (Light)',
      ),
    ).toBe(false);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'env-specialist-light-ranged-to-hit-application'
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

  it('threads pilot SPA and quirk to-hit state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          abilities: ['weapon-specialist'],
          designatedWeaponType: 'Medium Laser',
          unitQuirks: ['improved_targeting_short'],
          weaponQuirks: { [MEDIUM_LASER_ID]: ['accurate'] },
        },
        target: {
          abilities: ['dodge-maneuver'],
          isDodging: true,
          unitQuirks: ['distracting'],
        },
      }),
    });
    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(3);
    expectModifier(payload, {
      name: 'Weapon Specialist',
      value: -2,
      source: 'spa',
    });
    expectModifier(payload, {
      name: 'Dodge Maneuver',
      value: 2,
      source: 'spa',
    });
    expectModifier(payload, {
      name: 'Improved Targeting',
      value: -1,
      source: 'quirk',
    });
    expectModifier(payload, {
      name: 'Accurate Weapon',
      value: -1,
      source: 'quirk',
    });
    expectModifier(payload, {
      name: 'Distracting',
      value: 1,
      source: 'quirk',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['weapon-to-hit-quirk-application'],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies source-backed Dodge Maneuver only for explicit dodging Mek targets', () => {
    const dodgingMekPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            unitType: UnitType.BATTLEMECH,
            abilities: ['dodge_maneuver'],
            isDodging: true,
          },
        }),
      }),
    );
    const notDodgingPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            unitType: UnitType.BATTLEMECH,
            abilities: ['dodge_maneuver'],
            isDodging: false,
          },
        }),
      }),
    );
    const nonMekPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            unitType: UnitType.VEHICLE,
            abilities: ['dodge_maneuver'],
            isDodging: true,
          },
        }),
      }),
    );

    expect(dodgingMekPayload.toHitNumber).toBe(6);
    expectModifier(dodgingMekPayload, {
      name: 'Dodge Maneuver',
      value: 2,
      source: 'spa',
    });
    expect(notDodgingPayload.toHitNumber).toBe(4);
    expect(nonMekPayload.toHitNumber).toBe(4);
    expect(
      notDodgingPayload.modifiers.some(
        (modifier) => modifier.name === 'Dodge Maneuver',
      ),
    ).toBe(false);
    expect(
      nonMekPayload.modifiers.some(
        (modifier) => modifier.name === 'Dodge Maneuver',
      ),
    ).toBe(false);
  });
});
