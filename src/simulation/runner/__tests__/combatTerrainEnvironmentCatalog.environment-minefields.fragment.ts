import { TERRAIN_ENVIRONMENT_COMBAT_SUPPORT } from './combatTerrainEnvironmentCatalog.test-helpers';

describe('BattleMech terrain and environment combat support catalog', () => {
  it('keeps represented minefield state rows explicitly cataloged', () => {
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/simulation/runner/phases/movementMines.ts#L38-L199',
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
          url: 'src/utils/gameplay/gameState/terrainReducer.ts#L40-L216',
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
  });
});
