import {
  TerrainType,
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  TERRAIN_TYPES_WITH_PSR_GAPS,
  supportIdsByLevel,
  expectLineAnchoredSourceRef,
  terrainTypesWithAttackModifiers,
  terrainTypesWithHeatEffects,
} from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('treats non-zero terrain attack modifiers as integrated runner to-hit behavior', () => {
    expect(terrainTypesWithAttackModifiers()).toEqual(
      [
        TerrainType.Building,
        TerrainType.HeavyIndustrial,
        TerrainType.HeavyWoods,
        TerrainType.LightWoods,
        TerrainType.PlantedField,
        TerrainType.Smoke,
        TerrainType.Swamp,
        TerrainType.Water,
      ].sort(),
    );
    expect(
      supportIdsByLevel(
        TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
        'helper-only',
      ),
    ).toEqual([]);
    expect(
      supportIdsByLevel(
        TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
        'integrated',
      ),
    ).toEqual(Object.values(TerrainType).sort());
  });

  it('source-pins every TerrainType attack modifier row', () => {
    const megaMekBackedModifierTerrains = [
      TerrainType.Building,
      TerrainType.HeavyIndustrial,
      TerrainType.HeavyWoods,
      TerrainType.LightWoods,
      TerrainType.PlantedField,
      TerrainType.Smoke,
    ];
    const localOnlyModifierTerrains = [TerrainType.Swamp, TerrainType.Water];

    Object.values(TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT).forEach(
      (entry) => {
        const sourceRefs = entry.sourceRefs ?? [];

        expect(sourceRefs).not.toHaveLength(0);
        sourceRefs.forEach(expectLineAnchoredSourceRef);
        expect(sourceRefs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/types/gameplay/TerrainProperties.ts#L9-L424',
            }),
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/utils/gameplay/toHit/environmentModifiers.ts#L65-L88',
            }),
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/simulation/runner/phases/weaponAttackTerrainModifiers.ts#L13-L55',
            }),
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/simulation/runner/phases/weaponAttackModifierPayload.ts#L97-L118',
            }),
          ]),
        );
      },
    );

    expect(
      megaMekBackedModifierTerrains.filter(
        (terrain) =>
          !TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT[
            terrain
          ].sourceRefs?.some((ref) => ref.kind === 'megamek-source'),
      ),
    ).toEqual([]);
    expect(
      Object.values(TerrainType)
        .filter((terrain) => !megaMekBackedModifierTerrains.includes(terrain))
        .flatMap(
          (terrain) =>
            TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT[
              terrain
            ].sourceRefs?.filter((ref) => ref.kind === 'megamek-source') ?? [],
        ),
    ).toEqual([]);
    expect(
      localOnlyModifierTerrains.map(
        (terrain) =>
          TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT[terrain].evidence,
      ),
    ).toEqual([
      expect.stringContaining('MekStation applies a local target-in'),
      expect.stringContaining('MekStation applies a local target-in'),
    ]);
  });

  it('tracks terrain heat effects as integrated runner occupied-terrain heat behavior', () => {
    expect(terrainTypesWithHeatEffects()).toEqual(
      [TerrainType.Fire, TerrainType.Water].sort(),
    );
    expect(
      supportIdsByLevel(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(Object.values(TerrainType).sort());
  });

  it('source-pins every TerrainType heat row', () => {
    const heatEffectTerrains = [TerrainType.Fire, TerrainType.Water];

    Object.values(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT).forEach((entry) => {
      const sourceRefs = entry.sourceRefs ?? [];

      expect(sourceRefs).not.toHaveLength(0);
      sourceRefs.forEach(expectLineAnchoredSourceRef);
      expect(sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/types/gameplay/TerrainProperties.ts#L9-L424',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/heat.ts#L23-L68',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/simulation/runner/phases/postCombatHeatAccounting.ts#L103-L193',
          }),
        ]),
      );
    });

    expect(
      heatEffectTerrains.filter(
        (terrain) =>
          !TERRAIN_TYPE_HEAT_COMBAT_SUPPORT[terrain].sourceRefs?.some(
            (ref) => ref.kind === 'megamek-source',
          ),
      ),
    ).toEqual([]);
    expect(
      Object.values(TerrainType)
        .filter((terrain) => !heatEffectTerrains.includes(terrain))
        .flatMap(
          (terrain) =>
            TERRAIN_TYPE_HEAT_COMBAT_SUPPORT[terrain].sourceRefs?.filter(
              (ref) => ref.kind === 'megamek-source',
            ) ?? [],
        ),
    ).toEqual([]);
    expect(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT[TerrainType.Water]).toMatchObject({
      evidence: expect.stringContaining('waterBonus'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('getHeatCapacityWithWater'),
        }),
      ]),
    });
    expect(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT[TerrainType.Fire]).toMatchObject({
      evidence: expect.stringContaining('HeatGenerated'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('5 external heat'),
        }),
      ]),
    });
  });

  it('keeps source-backed terrain PSR gaps visible without inventing non-BattleMech gaps', () => {
    expect([...TERRAIN_TYPES_WITH_PSR_GAPS].sort()).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_TYPE_PSR_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([...TERRAIN_TYPES_WITH_PSR_GAPS].sort());
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Building]).toMatchObject(
      {
        level: 'integrated',
        evidence: expect.stringContaining('constructionFactor'),
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({ kind: 'megamek-source' }),
        ]),
      },
    );
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Swamp]).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('UnitStuck'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      [TerrainType.Mud, TerrainType.Sand, TerrainType.Snow].map(
        (terrain) => TERRAIN_TYPE_PSR_COMBAT_SUPPORT[terrain].level,
      ),
    ).toEqual(['integrated', 'integrated', 'integrated']);
  });

  it('source-pins every TerrainType PSR row', () => {
    const megaMekComparedTerrains = [
      TerrainType.Building,
      TerrainType.Ice,
      TerrainType.Pavement,
      TerrainType.Rubble,
      TerrainType.Swamp,
      TerrainType.Water,
    ];

    Object.values(TERRAIN_TYPE_PSR_COMBAT_SUPPORT).forEach((entry) => {
      const sourceRefs = entry.sourceRefs ?? [];

      expect(sourceRefs).not.toHaveLength(0);
      sourceRefs.forEach(expectLineAnchoredSourceRef);
      expect(sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/simulation/runner/phases/movementTerrainPsr.ts#L75-L325',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/pilotingSkillRolls/environmentFactories.ts#L94-L245',
          }),
        ]),
      );
    });

    expect(
      megaMekComparedTerrains.filter(
        (terrain) =>
          !TERRAIN_TYPE_PSR_COMBAT_SUPPORT[terrain].sourceRefs?.some(
            (ref) => ref.kind === 'megamek-source',
          ),
      ),
    ).toEqual([]);
    expect(
      Object.values(TerrainType)
        .filter((terrain) => !megaMekComparedTerrains.includes(terrain))
        .flatMap(
          (terrain) =>
            TERRAIN_TYPE_PSR_COMBAT_SUPPORT[terrain].sourceRefs?.filter(
              (ref) => ref.kind === 'megamek-source',
            ) ?? [],
        ),
    ).toEqual([]);
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Rubble]).toMatchObject({
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('checkRubbleMove'),
        }),
      ]),
    });
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Water]).toMatchObject({
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('checkWaterMove'),
        }),
      ]),
    });
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Pavement]).toMatchObject(
      {
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({
            kind: 'megamek-source',
            citation: expect.stringContaining('checkSkid'),
          }),
        ]),
      },
    );
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Rough]).toMatchObject({
      evidence: expect.stringContaining('local running-through-rough-terrain'),
    });
  });
});
