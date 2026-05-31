import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from '../CombatFeatureSupport';

import { TERRAIN_ENVIRONMENT_COMBAT_SUPPORT } from '../CombatRuleSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_COMBAT_COVERAGE,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  TERRAIN_TYPES_WITH_PSR_GAPS,
} from '../CombatTerrainEnvironmentSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function expectLineAnchoredSourceRef(ref: ICombatFeatureSourceReference): void {
  expect(ref.citation.length).toBeGreaterThan(0);
  expect(ref.url).toContain('#L');
  expect(ref.sourceVersion.length).toBeGreaterThan(0);
}

function terrainTypesWithAttackModifiers(): readonly string[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(
      ([, properties]) =>
        properties.toHitInterveningModifier !== 0 ||
        properties.toHitTargetInModifier !== 0,
    )
    .map(([terrain]) => terrain)
    .sort();
}

function terrainTypesWithHeatEffects(): readonly string[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(([, properties]) => properties.heatEffect !== 0)
    .map(([terrain]) => terrain)
    .sort();
}

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
            url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
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
      TerrainType.HeavyWoods,
      TerrainType.LightWoods,
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
            url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/lineOfSight.ts#L50-L70',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/lineOfSight.ts#L193-L334',
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
      evidence: expect.stringContaining('land-to-depth-2+ water'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L763-L768'),
        }),
      ]),
    });
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

  it('treats non-zero terrain attack modifiers as integrated runner to-hit behavior', () => {
    expect(terrainTypesWithAttackModifiers()).toEqual(
      [
        TerrainType.Building,
        TerrainType.HeavyWoods,
        TerrainType.LightWoods,
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
      TerrainType.HeavyWoods,
      TerrainType.LightWoods,
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
              url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
            }),
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/utils/gameplay/toHit/environmentModifiers.ts#L65-L88',
            }),
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/simulation/runner/phases/weaponAttackTerrainModifiers.ts#L13-L63',
            }),
            expect.objectContaining({
              kind: 'mekstation-deviation',
              url: 'src/simulation/runner/phases/weaponAttack.ts#L969-L1004',
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
            url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/heat.ts#L23-L68',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/simulation/runner/phases/postCombat.ts#L340-L376',
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
    expect([...TERRAIN_TYPES_WITH_PSR_GAPS].sort()).toEqual([
      TerrainType.Building,
    ]);
    expect(
      supportIdsByLevel(TERRAIN_TYPE_PSR_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([...TERRAIN_TYPES_WITH_PSR_GAPS].sort());
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
            url: 'src/simulation/runner/phases/movementTerrainPsr.ts#L37-L231',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/pilotingSkillRolls/environmentFactories.ts#L94-L232',
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

  it('keeps environment requirements without TerrainType enum values explicitly cataloged', () => {
    expect(supportGaps(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(
      expect.arrayContaining(['dust', 'mines', 'terrain-los-side-paths']),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-blocking'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('cumulative woods/smoke density'),
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
  });
});
