import { describe, expect, it } from '@jest/globals';

import {
  COMBAT_RULE_REFERENCES,
  CoverLevel,
  LOS_BLOCKER_RULE_REFERENCES,
  MOVEMENT_RULE_REFERENCES,
  MovementType,
  REPRESENTED_MINEFIELD_RULE_REFERENCES,
  RangeBracket,
  TERRAIN_RULE_REFERENCES,
  TerrainType,
  WATER_ENVIRONMENT_RULE_REFERENCES,
  buildTacticalMapHexProjection,
  buildTacticalMapHexProjectionLookup,
  combat,
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
  movement,
  terrain,
} from './tacticalMapProjection.test-helpers';

describe('tacticalMapProjection', () => {
  it('includes same-hex movement mode options in the shared projection explanation', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: movement({
        movementModeOptions: [
          {
            movementType: MovementType.Walk,
            movementMode: 'tracked',
            reachable: true,
            mpCost: 3,
            heatGenerated: 0,
          },
          {
            movementType: MovementType.Run,
            movementMode: 'tracked',
            reachable: true,
            mpCost: 3,
            heatGenerated: 2,
          },
          {
            movementType: MovementType.Jump,
            movementMode: 'jump',
            reachable: false,
            mpCost: 4,
            heatGenerated: 1,
            blockedReason: 'Jump elevation rise of 4 exceeds jump MP 3',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails:
              'Jump elevation rise of 4 exceeds jump MP 3',
          },
        ],
      }),
      combat: undefined,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.status).toBe('mixed');
    expect(projection.movementStatus).toBe('mixed');
    expect(projection.combatStatus).toBe('none');
    expect(projection.blockedReasons).toEqual([
      'Jump elevation rise of 4 exceeds jump MP 3',
      'TerrainBlocked',
    ]);
    expect(projection.explanation).toContain(
      'movement options walk via tracked reachable 3 MP heat +0, run via tracked reachable 3 MP heat +2, jump blocked 4 MP heat +1: Jump elevation rise of 4 exceeds jump MP 3',
    );
    expect(projection.explanation).toContain(
      'blocked Jump elevation rise of 4 exceeds jump MP 3; TerrainBlocked',
    );
    expect(projection.sourceReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'movement',
          detail:
            'walk/tracked,run/tracked,jump projection: walk via tracked reachable 3 MP heat +0, run via tracked reachable 3 MP heat +2, jump blocked 4 MP heat +1: Jump elevation rise of 4 exceeds jump MP 3',
        }),
      ]),
    );
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toContain(
      'movement:megamek:MegaMek movement rules projection:walk/tracked,run/tracked,jump projection: walk via tracked reachable 3 MP heat +0, run via tracked reachable 3 MP heat +2, jump blocked 4 MP heat +1: Jump elevation rise of 4 exceeds jump MP 3',
    );
  });

  it('includes per-option terrain and elevation costs in same-hex movement explanations', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(2, TerrainType.Rough),
      movement: movement({
        movementModeOptions: [
          {
            movementType: MovementType.Walk,
            movementMode: 'tracked',
            reachable: true,
            mpCost: 4,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 0,
          },
          {
            movementType: MovementType.Run,
            movementMode: 'tracked',
            reachable: true,
            mpCost: 5,
            terrainCost: 2,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 2,
          },
          {
            movementType: MovementType.Jump,
            movementMode: 'jump',
            reachable: true,
            mpCost: 2,
            terrainCost: 0,
            elevationDelta: 2,
            elevationCost: 0,
            heatGenerated: 1,
          },
        ],
      }),
      combat: undefined,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.explanation).toContain(
      'movement options walk via tracked reachable 4 MP terrain +1 elevation delta +1 cost +1 heat +0, run via tracked reachable 5 MP terrain +2 elevation delta +1 cost +1 heat +2, jump reachable 2 MP terrain +0 elevation delta +2 cost +0 heat +1',
    );
  });

  it('includes combat modifier details in the shared projection explanation', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(1, TerrainType.LightWoods),
      movement: movement(),
      combat: combat({
        targetCoverLevel: CoverLevel.Partial,
        targetPartialCover: true,
        targetCoverModifier: 1,
        targetCoverReason: 'Light woods partial cover +1',
        minimumRangePenalty: 2,
        minimumRangeWeaponIds: ['medium-laser'],
        minimumRangeReason: 'Minimum range penalty +2 for medium-laser',
        toHitNumber: 8,
        toHitReason: 'Target number 8 from engine preview',
        indirectFireAvailable: true,
        indirectFireSpotterId: 'spotter-1',
        indirectFireBasis: 'los',
        indirectFireToHitPenalty: 1,
        indirectFireReason: 'Indirect fire via spotter-1 adds +1',
      }),
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.explanation).toContain('combat short 1 hexes LOS clear');
    expect(projection.explanation).toContain('arc front');
    expect(projection.explanation).toContain('targets enemy');
    expect(projection.explanation).toContain('visibility visible');
    expect(projection.explanation).toContain('weapons medium-laser');
    expect(projection.explanation).toContain('Light woods partial cover +1');
    expect(projection.explanation).toContain(
      'Minimum range penalty +2 for medium-laser',
    );
    expect(projection.explanation).toContain(
      'Target number 8 from engine preview',
    );
    expect(projection.explanation).toContain(
      'Indirect fire via spotter-1 adds +1',
    );
    expect(projection.explanation).toContain('Walk reachable 2 MP');
    expect(projection.explanation).toContain('elevation 1');
  });
});
