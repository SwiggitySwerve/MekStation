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
  it('applies source-backed Shaky Stick only for ground-to-air attacks', () => {
    const groundToAirPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['shaky_stick'],
            isAirborne: true,
          },
        }),
      }),
    );
    const airToAirPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          attacker: { isAirborne: true },
          target: {
            abilities: ['shaky_stick'],
            isAirborne: true,
          },
        }),
      }),
    );
    const groundedTargetPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['shaky_stick'],
            isAirborne: false,
          },
        }),
      }),
    );

    expect(groundToAirPayload.toHitNumber).toBe(5);
    expectModifier(groundToAirPayload, {
      name: 'Shaky Stick',
      value: 1,
      source: 'spa',
    });
    expect(airToAirPayload.toHitNumber).toBe(4);
    expect(groundedTargetPayload.toHitNumber).toBe(4);
    expect(
      airToAirPayload.modifiers.some(
        (modifier) => modifier.name === 'Shaky Stick',
      ),
    ).toBe(false);
    expect(
      groundedTargetPayload.modifiers.some(
        (modifier) => modifier.name === 'Shaky Stick',
      ),
    ).toBe(false);
    expect(SPA_COMBAT_SUPPORT.shaky_stick).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('airborne target'),
    });
  });

  it.each<readonly [string, string, number, number, string]>([
    ['vdni', 'VDNI', -1, 3, 'vdni-bvdni-ranged-to-hit-application'],
    ['bvdni', 'VDNI', -1, 3, 'vdni-bvdni-ranged-to-hit-application'],
    [
      'proto_dni',
      'Prototype DNI',
      -2,
      2,
      'proto-dni-ranged-to-hit-application',
    ],
  ])(
    'applies source-backed %s ranged to-hit relief',
    (abilityId, modifierName, modifierValue, toHitNumber, supportRef) => {
      const payload = attackDeclaredPayload(
        runModifierScenario({
          state: createWeaponAttackState({
            attacker: {
              abilities: [abilityId],
            },
          }),
        }),
      );

      expect(payload.toHitNumber).toBe(toHitNumber);
      expectModifier(payload, {
        name: modifierName,
        value: modifierValue,
        source: 'spa',
      });
      expect(
        PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
          supportRef as keyof typeof PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT
        ],
      ).toMatchObject({
        level: 'integrated',
        evidence: expect.stringContaining(abilityId),
      });
    },
  );

  it.each<readonly [string, string]>([
    ['vdni', 'VDNI'],
    ['bvdni', 'VDNI'],
    ['proto_dni', 'Prototype DNI'],
  ])(
    'suppresses source-backed %s ranged to-hit relief when neural interface is disconnected',
    (abilityId, modifierName) => {
      const payload = attackDeclaredPayload(
        runModifierScenario({
          state: createWeaponAttackState({
            attacker: {
              abilities: [abilityId],
              neuralInterfaceActive: false,
            },
          }),
        }),
      );

      expect(payload.toHitNumber).toBe(4);
      expect(
        payload.modifiers.some((modifier) => modifier.name === modifierName),
      ).toBe(false);
    },
  );

  it('hydrates target terrain for source-backed Terrain Master defender to-hit variants', () => {
    const forestRangerPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['tm_forest_ranger'],
            movementThisTurn: MovementType.Walk,
          },
        }),
        grid: createGrid(TerrainType.LightWoods),
      }),
    );
    const swampBeastPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['tm_swamp_beast'],
            movementThisTurn: MovementType.Run,
          },
        }),
        grid: createGrid(TerrainType.Mud),
      }),
    );
    const wrongMovementPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['tm_forest_ranger'],
            movementThisTurn: MovementType.Run,
          },
        }),
        grid: createGrid(TerrainType.LightWoods),
      }),
    );

    expect(forestRangerPayload.toHitNumber).toBe(6);
    expectModifier(forestRangerPayload, {
      name: 'Forest Ranger',
      value: 1,
      source: 'spa',
    });
    expectModifier(forestRangerPayload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
    expect(swampBeastPayload.toHitNumber).toBe(5);
    expectModifier(swampBeastPayload, {
      name: 'Swamp Beast',
      value: 1,
      source: 'spa',
    });
    expect(
      wrongMovementPayload.modifiers.some(
        (modifier) => modifier.name === 'Forest Ranger',
      ),
    ).toBe(false);
    expect(SPA_COMBAT_SUPPORT.tm_forest_ranger).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT.tm_swamp_beast).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('to-hit'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration'],
    ).toMatchObject({
      level: 'integrated',
    });
  });
});
