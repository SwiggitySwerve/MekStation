import {
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('keeps minefield variant and special-effect rows explicitly cataloged', () => {
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
        }),
      ]),
    );
  });
});
