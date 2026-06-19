import { TERRAIN_ENVIRONMENT_COMBAT_SUPPORT } from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('keeps represented minefield detonation and density rows explicitly cataloged', () => {
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
        }),
      ]),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-active-ground-suppression'
      ].gap,
    ).toBeUndefined();
  });
});
