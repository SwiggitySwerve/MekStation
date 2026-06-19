import {
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
} from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('keeps residual dust, wind, and LOS terrain environment rows explicit', () => {
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
