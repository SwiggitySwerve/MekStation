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
  it('accounts represented C3 state and conservative equipment seeding while splitting broad authoring out of scope', () => {
    const explicitStateRow = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.c3;
    const conservativeSeedingRow =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-conservative-network-seeding'
      ];
    const unambiguousFormationRow =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-unambiguous-network-formation'
      ];
    const independentSideFormationRow =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-independent-side-formation'
      ];
    const denialBoundaryRow =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-denial-boundaries'];
    const broadFormationRow =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation'];

    expect(explicitStateRow).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('explicit IGameState.c3Network state'),
    });
    expect(conservativeSeedingRow).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'seed unambiguous per-side C3 master/slave and C3i equipment',
      ),
    });
    expect(unambiguousFormationRow).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'forms only unambiguous per-side single C3 master/slave and C3i networks',
      ),
    });
    expect(independentSideFormationRow).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'evaluates mounted C3 equipment independently per side',
      ),
    });
    expect(denialBoundaryRow).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'explicitly denies ambiguous multi-role equipment',
      ),
    });
    expect(broadFormationRow).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'represented BattleMech C3 runtime behavior is covered by explicit session-authored IGameState.c3Network consumption, mounted equipment role hydration, conservative single-network seeding, unambiguous per-side C3/C3i formation, independent side-by-side formation/denial evaluation, and fail-closed denial boundaries',
      ),
      gap: expect.stringContaining('Manual C3 network authoring UI'),
    });
    expect(broadFormationRow.gap).toEqual(
      expect.stringContaining('manual C3 assignment controls'),
    );
    expect(broadFormationRow.gap).toEqual(
      expect.stringContaining(
        'automatic same-side multiple-network partitioning',
      ),
    );
    expect(broadFormationRow.gap).toEqual(
      expect.stringContaining('ambiguous multiple-master partitioning'),
    );
    expect(broadFormationRow.gap).toEqual(
      expect.stringContaining('mixed C3i/master-slave family selection'),
    );
    expect(broadFormationRow.gap).toEqual(
      expect.stringContaining('authoritative oversized network splitting'),
    );
  });

  it('does not require C3 spotter line of sight for default range sharing', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-no-los', [
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

    const events = runModifierScenario({ state: c3State, grid });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
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
});
