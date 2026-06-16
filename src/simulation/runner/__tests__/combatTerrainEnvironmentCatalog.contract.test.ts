import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from '../CombatFeatureSupport';

import {
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_COMBAT_COVERAGE,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  TERRAIN_TYPES_WITH_PSR_GAPS,
} from '../CombatTerrainEnvironmentSupport';
import {
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
} from '../CombatValidationGapInventory';

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

function expectHelperOnlyRowPinsNamedGaps(
  entry: ICombatFeatureSupportEntry,
  namedGaps: readonly string[],
): void {
  expect(entry.level).toBe('helper-only');
  namedGaps.forEach((gap) => {
    expect(entry.gap).toEqual(expect.stringContaining(gap));
  });
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
            url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/lineOfSight.ts#L65-L69',
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            url: 'src/utils/gameplay/lineOfSight.ts#L451-L789',
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
              url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
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
            url: 'src/simulation/runner/phases/movementTerrainPsr.ts#L37-L352',
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

  it('keeps environment requirements without TerrainType enum values explicitly cataloged', () => {
    expect(supportGaps(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual(
      [
        ...MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
        ...TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
      ].sort(),
    );
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual(['minefield-non-battlemech-sea-variants']);
    const terrainLosSidePaths =
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-side-paths'];
    expect(terrainLosSidePaths).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Split-accounting row'),
    });
    expect(terrainLosSidePaths.gap).toBeUndefined();
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-same-building-hex-blocking'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-same-building-level-count'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-building-height-blocking'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-water-endpoint-blocking'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-underwater-clear-hex-blocking'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-underwater-depth-height-side-paths'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-intervening-elevation-blocking'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining('terrain-los-divided-elevation-blocking'),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining(
        'terrain-los-tacops-diagram-represented-pure-elevation',
      ),
    );
    expect(terrainLosSidePaths.evidence).toEqual(
      expect.stringContaining(
        'terrain-los-tacops-diagram-represented-terrain-effects',
      ),
    );
    const terrainEnvironmentSupportById =
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT as Record<
        string,
        ICombatFeatureSupportEntry
      >;
    const terrainLosResiduals = TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(
      (supportId) => terrainEnvironmentSupportById[supportId],
    );
    expect(terrainLosResiduals.map((entry) => entry.level)).toEqual(
      TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(() => 'unsupported'),
    );
    const terrainLosGapText = terrainLosResiduals
      .map((entry) => entry.gap)
      .join('\n');
    expect(terrainLosGapText).not.toEqual(
      expect.stringContaining(
        'industrial-zone side-path terrain density/elevation',
      ),
    );
    expect(terrainLosGapText).not.toEqual(
      expect.stringContaining(
        'planted-field side-path terrain density/elevation',
      ),
    );
    expect(terrainLosGapText).not.toEqual(
      expect.stringContaining('grounded DropShip level-10 cover'),
    );
    expect(
      (TERRAIN_ENVIRONMENT_COMBAT_SUPPORT as Record<string, unknown>)[
        'terrain-los-tacops-diagram-elevation-side-paths'
      ],
    ).toBeUndefined();
    const localTerrainTypes = new Set(Object.values(TerrainType));
    expect(localTerrainTypes.has(TerrainType.HeavyIndustrial)).toBe(true);
    expect(localTerrainTypes.has(TerrainType.PlantedField)).toBe(true);
    for (const [supportId, expectedEvidence] of [
      [
        'terrain-los-tacops-diagram-industrial-zone-side-paths',
        'HeavyIndustrial terrain',
      ],
      [
        'terrain-los-tacops-diagram-planted-field-side-paths',
        'PlantedField terrain',
      ],
    ] as const) {
      expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[supportId]).toMatchObject({
        level: 'integrated',
        evidence: expect.stringContaining(expectedEvidence),
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({
            kind: 'megamek-source',
            citation: expect.stringContaining('ADVANCED_COMBAT_TAC_OPS_LOS1'),
            url: expect.stringContaining('LosEffects.java#L783-L790'),
          }),
          expect.objectContaining({
            kind: 'megamek-source',
            citation: expect.stringContaining('totalEl >= losElevation'),
            url: expect.stringContaining('LosEffects.java#L1310-L1329'),
          }),
          expect.objectContaining({
            kind: 'mekstation-deviation',
            citation: expect.stringContaining('calculateLOS owns'),
          }),
        ]),
      });
      expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[supportId].gap).toBeUndefined();
    }
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-tacops-diagram-combat-caller-option-propagation'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('thread explicit optionalRules'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('ADVANCED_COMBAT_TAC_OPS_LOS1'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('runner weapon attack LOS'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('interactive attack declarations'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-tacops-diagram-combat-caller-option-propagation'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-tacops-diagram-represented-pure-elevation'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('clear-hex pure elevation'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L783-L790'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('TacOps diagram elevation'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-tacops-diagram-represented-terrain-effects'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('represented woods and smoke'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('ADVANCED_COMBAT_TAC_OPS_LOS1'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('totalEl >= losElevation'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/utils/gameplay/lineOfSight.ts#L1-L825',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-grounded-dropship-cover-providers'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('grounded DropShip occupants'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('grounded Dropship'),
          url: expect.stringContaining('LosEffects.java#L1264-L1293'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('damageable cover'),
          url: expect.stringContaining('LosEffects.java#L1488-L1502'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-grounded-dropship-cover-providers'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-fuel-tank-elevation'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('fuelTankElevation'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('FUEL_TANK_ELEV'),
          url: expect.stringContaining('LosEffects.java#L1264-L1293'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-fuel-tank-damageable-cover-providers'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('fuelTankElevation/fuelTankId'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('damageable cover'),
          url: expect.stringContaining('LosEffects.java#L1488-L1502'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-fuel-tank-damageable-cover-providers'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-hard-soft-building-cover-providers'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('constructionFactor metadata'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('BLDG_CF'),
          url: expect.stringContaining('LosEffects.java#L1331-L1339'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('damageable cover'),
          url: expect.stringContaining('LosEffects.java#L1488-L1502'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-hard-soft-building-cover-providers'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-damageable-cover-hit-resolution-routing'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('TerrainChanged'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('damageable cover'),
          url: expect.stringContaining('LosEffects.java#L1488-L1502'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-damageable-cover-hit-resolution-routing'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-underwater-depth-height-side-paths'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('minimumWaterDepth'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L1252-L1348'),
        }),
      ]),
    });
    expect(terrainLosGapText).not.toEqual(
      expect.stringContaining('local TerrainType LOS helper'),
    );
    expect(terrainLosGapText).not.toEqual(
      expect.stringContaining('degree % 60 == 30 divided LOS'),
    );
    expect(terrainLosGapText).not.toEqual(
      expect.stringContaining('left/right side-path resolution'),
    );
    expect(terrainLosSidePaths.gap).not.toEqual(
      expect.stringContaining('land-to-depth-2+ water endpoint'),
    );
    expect(terrainLosSidePaths.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L783-L790'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L993-L1040'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('underwater minimum-water depth'),
          url: expect.stringContaining('LosEffects.java#L1252-L1348'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    );
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('represented TerrainType.Mines'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-same-building-hex-blocking'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented same-building building hexes exceed two',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L1210-L1455'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-building-height-blocking'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Building terrain feature level'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L1210-L1455'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-building-height-blocking']
        .evidence,
    ).toEqual(expect.stringContaining('taller endpoint'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-building-height-blocking']
        .evidence,
    ).toEqual(expect.stringContaining('adjacent endpoint'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-same-building-level-count'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('explicit endpoint LOS-height'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('building hexes passed through'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-divided-side-path-blocking'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'defender-favorable blocker or intervening terrain modifier',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L783-L790'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L993-L1040'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-divided-elevation-blocking'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('blockingElevation'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L783-L790'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('TacOps diagram elevation'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-intervening-elevation-blocking'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('blockingElevation'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('TacOps diagram elevation'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-intervening-elevation-blocking'
      ].evidence,
    ).toEqual(expect.stringContaining('no-side-effect AttackInvalid events'));
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.evidence).toEqual(
      expect.stringContaining('represented TerrainType.Mines hex entry'),
    );
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.evidence).toEqual(
      expect.stringContaining('encoded feature-level BattleMech leg damage'),
    );
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.gap).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-entry-side-paths'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('same-hex non-entry suppression'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-entry-side-paths'
      ].evidence,
    ).toEqual(
      expect.stringContaining(
        'per-declaration duplicate-coordinate suppression',
      ),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-entry-side-paths'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-encoded-damage-levels'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('encoded level 6'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-encoded-damage-levels'
      ].evidence,
    ).toEqual(
      expect.stringContaining('without treating that marker as full MegaMek'),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-encoded-damage-levels'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-entry-damage'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('IGameState.minefields'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/types/gameplay/GameSessionStateTypes.ts#L720-L748',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-entry-damage'
      ].evidence,
    ).toEqual(expect.stringContaining('canonical coordToKey q,r lookup'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-entry-damage'
      ].evidence,
    ).toEqual(expect.stringContaining('explicit per-leg damage'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-entry-damage'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-conventional-detonated-state'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('conventional minefield state'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('Minefield.java#L47-L125'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/types/gameplay/GameSessionStateTypes.ts#L720-L748',
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-conventional-detonated-state'
      ].evidence,
    ).toEqual(expect.stringContaining('already-detonated suppression'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-conventional-detonated-state'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('event-sourced add'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/utils/gameplay/gameState/terrainReducer.ts#L35-L109',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-lifecycle'
      ].evidence,
    ).toEqual(expect.stringContaining('clear, reset, and detonate'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-lifecycle'
      ].evidence,
    ).toEqual(expect.stringContaining('density preservation'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-lifecycle'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-manual-conventional-detonation'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('manual_adjustment'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/minefieldActions.ts#L1-L234',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-manual-conventional-detonation'
      ].evidence,
    ).toEqual(
      expect.stringContaining('no damage or PSR side effects at command time'),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-manual-conventional-detonation'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-movement-detonation-event'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('movement_detonation'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('enterMinefield resolves'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-movement-detonation-event'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-density-trigger-target'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('density 20 uses target 8'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('Minefield.java#L47-L125'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-density-trigger-target'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-density-reduction'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'reduces represented conventional and inferno density',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('Minefield.java#L47-L125'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-density-reduction'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-non-conventional-type-guard'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('fail-closed'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('Minefield.java#L47-L125'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-non-conventional-type-guard'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-active-ground-suppression'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('active minefield'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('TWGameManager.java#L7348-L7590'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-active-ground-suppression'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths']
        .evidence,
    ).toEqual(expect.stringContaining('Split-accounting row'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths']
        .evidence,
    ).toEqual(expect.stringContaining('MINEFIELD modifier'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths']
        .evidence,
    ).toEqual(expect.stringContaining('source-pinned'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths']
        .evidence,
    ).toEqual(expect.stringContaining('movement detonation event emission'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths']
        .evidence,
    ).toEqual(expect.stringContaining('coordinate minefield authoring'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths'].gap,
    ).toBeUndefined();
    for (const supportId of MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS) {
      const branch = TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[supportId];
      expect(branch).toMatchObject({
        level: 'unsupported',
        gap: expect.stringContaining('Unsupported feature gap'),
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({
            kind: 'megamek-source',
            url: expect.stringContaining('Minefield.java#L47-L125'),
          }),
        ]),
      });
    }
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('detectedBySides'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection']
        .gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-campaign-placement-authoring'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('explicit coordinate-authored'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-campaign-placement-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-campaign-placement-authoring'
      ].sourceRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('GameCreated payloads seed'),
        }),
      ]),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-clearing-sweeper-collateral-reset'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('mine-sweeper events'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-clearing-sweeper-collateral-reset'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-non-conventional-type-semantics'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('GO_PRONE movement'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('inferno wash-off'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('clears infernoBurning'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls']
        .gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-vibrabomb-effects'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('BattleMech tonnage versus setting'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('checkVibraBombs'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('explodeVibrabomb'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-vibrabomb-effects'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-command-detonation'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('command-detonated'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining(
            'command-detonated mines as a TODO',
          ),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/minefieldActions.ts#L1-L234',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-command-detonation'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('EmpMinefieldEffectApplied'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('BattleMek EMP thresholds'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('+2 drone OS modifier'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-non-battlemech-sea-variants'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('sea/depth state'),
      gap: expect.stringContaining(
        'outside this BattleMech suite instead of being counted',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('Minefield.java#L47-L125'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('enterMinefield resolves'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths']
        .sourceRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('Minefield.java#L47-L125'),
        }),
        expect.objectContaining({
          kind: 'megamek-source',
          citation: expect.stringContaining('stores minefields by coordinate'),
          url: expect.stringContaining('Game.java#L178-L343'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/constants/scenario/modifiers/equipmentModifiers.ts#L5-L27',
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          url: 'src/simulation/runner/phases/movementMines.ts#L1-L1090',
        }),
      ]),
    );
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.dust).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('blowingSand'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-blocking'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('cumulative woods/smoke density'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-los-water-endpoint-blocking'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('land-to-depth-2+ water endpoint'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L763-L768'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('calculateLOS gates'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-underwater-clear-hex-blocking'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('underwater-to-underwater sightlines'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          kind: 'megamek-source',
          url: expect.stringContaining('LosEffects.java#L763-L768'),
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-underwater-clear-hex-blocking'
      ].evidence,
    ).toEqual(expect.stringContaining('clear/non-water depth-0'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-los-underwater-clear-hex-blocking'
      ].evidence,
    ).not.toEqual(expect.stringContaining('minimumWaterDepth'));
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
  });

  it('keeps represented terrain environment rows out of the residual export', () => {
    const unresolvedRefs = getCombatValidationUnresolvedRefs();
    const outOfScopeRefs = getCombatValidationOutOfScopeRefs();

    expect(
      unresolvedRefs.filter((ref) =>
        ref.startsWith('ruleSupport.terrainEnvironment.'),
      ),
    ).toEqual([
      ...MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS.map(
        (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
      ).sort(),
      ...TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(
        (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
      ).sort(),
    ]);
    expect(outOfScopeRefs).toContain(
      'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
    );
    expect(unresolvedRefs).not.toEqual(
      expect.arrayContaining([
        'ruleSupport.terrainEnvironment.mines',
        'ruleSupport.terrainEnvironment.minefield-represented-entry-side-paths',
        'ruleSupport.terrainEnvironment.minefield-represented-encoded-damage-levels',
        'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-entry-damage',
        'ruleSupport.terrainEnvironment.minefield-represented-conventional-detonated-state',
        'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-lifecycle',
        'ruleSupport.terrainEnvironment.minefield-represented-manual-conventional-detonation',
        'ruleSupport.terrainEnvironment.minefield-represented-movement-detonation-event',
        'ruleSupport.terrainEnvironment.minefield-represented-density-trigger-target',
        'ruleSupport.terrainEnvironment.minefield-represented-density-reduction',
        'ruleSupport.terrainEnvironment.minefield-represented-active-ground-suppression',
        'ruleSupport.terrainEnvironment.minefield-represented-inferno-entry-heat',
        'ruleSupport.terrainEnvironment.minefield-represented-non-conventional-type-guard',
        'ruleSupport.terrainEnvironment.minefield-represented-vibrabomb-effects',
        'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
        'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
        'ruleSupport.terrainEnvironment.terrain-los-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-building-height-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-same-building-level-count',
        'ruleSupport.terrainEnvironment.terrain-los-divided-elevation-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-divided-side-path-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-intervening-elevation-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-represented-pure-elevation',
        'ruleSupport.terrainEnvironment.terrain-los-tacops-diagram-represented-terrain-effects',
        'ruleSupport.terrainEnvironment.terrain-los-same-building-hex-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-underwater-clear-hex-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-water-endpoint-blocking',
        'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
      ]),
    );
  });
});
