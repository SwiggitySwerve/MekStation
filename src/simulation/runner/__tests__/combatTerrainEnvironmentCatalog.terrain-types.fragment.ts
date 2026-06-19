import {
  TERRAIN_PROPERTIES,
  TerrainType,
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_COMBAT_COVERAGE,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  sortedKeys,
  supportGaps,
  supportIdsByLevel,
  expectLineAnchoredSourceRef,
} from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('indexes every TerrainType across movement, LOS, attack modifier, heat, and PSR responsibilities', () => {
    const terrainTypes = Object.values(TerrainType).sort();

    expect([...TERRAIN_TYPE_COMBAT_COVERAGE].sort()).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_PROPERTIES)).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT)).toEqual(
      terrainTypes,
    );
    expect(sortedKeys(TERRAIN_TYPE_LOS_COMBAT_SUPPORT)).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT)).toEqual(
      terrainTypes,
    );
    expect(sortedKeys(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT)).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_TYPE_PSR_COMBAT_SUPPORT)).toEqual(terrainTypes);

    expect(supportGaps(TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(TERRAIN_TYPE_LOS_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT)).toEqual(
      [],
    );
    expect(supportGaps(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(TERRAIN_TYPE_PSR_COMBAT_SUPPORT)).toEqual([]);
  });

  it('source-pins every TerrainType movement row', () => {
    const localOnlyMovementTerrains = [TerrainType.Building, TerrainType.Water];
    const megaMekBackedTerrains = Object.values(TerrainType).filter(
      (terrain) => !localOnlyMovementTerrains.includes(terrain),
    );

    Object.values(TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT).forEach((entry) => {
      const sourceRefs = entry.sourceRefs ?? [];

      expect(sourceRefs).not.toHaveLength(0);
      sourceRefs.forEach(expectLineAnchoredSourceRef);
      expect(sourceRefs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/types/gameplay/TerrainProperties.ts#L9-L424',
          }),
        ]),
      );
    });

    expect(
      megaMekBackedTerrains.filter(
        (terrain) =>
          !TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT[terrain].sourceRefs?.some(
            (ref) => ref.kind === 'megamek-source',
          ),
      ),
    ).toEqual([]);
    expect(
      localOnlyMovementTerrains.flatMap(
        (terrain) =>
          TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT[terrain].sourceRefs?.filter(
            (ref) => ref.kind === 'megamek-source',
          ) ?? [],
      ),
    ).toEqual([]);
    expect(
      TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT[TerrainType.Water].sourceRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('walk and run entry'),
        }),
      ]),
    );
    expect(
      TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT[TerrainType.Building].sourceRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('flat local'),
        }),
      ]),
    );
  });

  it('source-pins every TerrainType LOS row', () => {
    const megaMekComparedLosTerrains = [
      TerrainType.Building,
      TerrainType.HeavyIndustrial,
      TerrainType.HeavyWoods,
      TerrainType.LightWoods,
      TerrainType.PlantedField,
      TerrainType.Smoke,
      TerrainType.Water,
    ];
    Object.values(TERRAIN_TYPE_LOS_COMBAT_SUPPORT).forEach((entry) => {
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
            url: 'src/utils/gameplay/lineOfSight.ts#L65-L69',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/lineOfSight.traceEvaluation.ts#L123-L287',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/simulation/runner/phases/weaponAttackLineOfSight.ts#L48-L88',
          }),
        ]),
      );
    });

    expect(
      megaMekComparedLosTerrains.filter(
        (terrain) =>
          !TERRAIN_TYPE_LOS_COMBAT_SUPPORT[terrain].sourceRefs?.some(
            (ref) => ref.kind === 'megamek-source',
          ),
      ),
    ).toEqual([]);
    expect(
      Object.values(TerrainType)
        .filter((terrain) => !megaMekComparedLosTerrains.includes(terrain))
        .flatMap(
          (terrain) =>
            TERRAIN_TYPE_LOS_COMBAT_SUPPORT[terrain].sourceRefs?.filter(
              (ref) => ref.kind === 'megamek-source',
            ) ?? [],
        ),
    ).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_TYPE_LOS_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(TERRAIN_TYPE_LOS_COMBAT_SUPPORT[TerrainType.Water]).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('land-to-underwater endpoint'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L763-L768'),
        }),
      ]),
    });
    expect(TERRAIN_TYPE_LOS_COMBAT_SUPPORT[TerrainType.Water].evidence).toEqual(
      expect.stringContaining(
        'represented underwater clear/non-water depth-0 intervening sightlines',
      ),
    );
    expect(TERRAIN_TYPE_LOS_COMBAT_SUPPORT[TerrainType.Water].evidence).toEqual(
      expect.stringContaining('minimumWaterDepth metadata'),
    );
    expect(
      TERRAIN_TYPE_LOS_COMBAT_SUPPORT[TerrainType.LightWoods],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('cumulative density exceeds 2'),
    });
    expect(TERRAIN_TYPE_LOS_COMBAT_SUPPORT[TerrainType.Smoke]).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('cumulative density exceeds 2'),
    });
  });
});
