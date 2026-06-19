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
  it('attaches combat LOS blocker references to the intervening blocker hex', () => {
    const projectionLookup = buildTacticalMapHexProjectionLookup({
      hexes: [
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
      terrainLookup: new Map([['1,0', terrain(2, TerrainType.Clear)]]),
      movementRangeLookup: new Map(),
      combatRangeLookup: new Map([
        [
          '2,0',
          combat({
            hex: { q: 2, r: 0 },
            distance: 2,
            losState: 'blocked',
            attackable: false,
            attackInvalidReason: 'NoLineOfSight',
            attackInvalidDetails: 'Blocked by elevation +2 at (1, 0)',
            blockedReason: 'Blocked by elevation +2 at (1, 0)',
            lineOfSightBlockerReason: 'Blocked by elevation +2 at (1, 0)',
            lineOfSightBlocker: {
              hex: { q: 1, r: 0 },
              kind: 'elevation',
              reason: 'Blocked by elevation +2 at (1, 0)',
            },
          }),
        ],
      ]),
    });

    const blocker = projectionLookup.get('1,0');

    expect(blocker?.combatLosBlockerFor).toMatchObject([
      {
        targetHex: { q: 2, r: 0 },
        targetUnitIds: ['enemy'],
        losState: 'blocked',
        blocker: {
          hex: { q: 1, r: 0 },
          kind: 'elevation',
          reason: 'Blocked by elevation +2 at (1, 0)',
        },
      },
    ]);
    expect(blocker?.explanation).toContain(
      'LOS blocker for 2,0: Blocked by elevation +2 at (1, 0)',
    );
    expect(blocker?.sourceReferences).toEqual([
      {
        channel: 'terrain-elevation',
        kind: 'mekstation',
        label: 'Rendered map terrain/elevation grid',
        detail: 'clear elevation 2',
        ruleReferences: TERRAIN_RULE_REFERENCES,
      },
      {
        channel: 'los-blocker',
        kind: 'megamek',
        label: 'MegaMek LOS blocker projection',
        detail: 'elevation for 2,0 Blocked by elevation +2 at (1, 0)',
        ruleReferences: LOS_BLOCKER_RULE_REFERENCES,
      },
    ]);
  });
});
