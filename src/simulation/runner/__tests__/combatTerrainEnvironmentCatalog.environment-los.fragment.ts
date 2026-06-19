import type { ICombatFeatureSupportEntry } from './combatTerrainEnvironmentCatalog.test-helpers';

import {
  TerrainType,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  supportGaps,
  supportIdsByLevel,
} from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('keeps terrain LOS environment side-path rows explicitly cataloged', () => {
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
          url: 'src/utils/gameplay/lineOfSight.ts#L57-L125',
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
  });
});
