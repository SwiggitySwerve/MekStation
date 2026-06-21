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
  it('composes terrain, movement, combat, path, and selected state into one legal projection', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(2, TerrainType.Rough),
      movement: movement(),
      combat: combat(),
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      key: '1,0',
      inAttackRange: true,
      intent: 'movement-combat',
      status: 'legal',
      movementStatus: 'legal',
      movementCostStatus: 'costly',
      movementCostReasons: ['terrain +1', 'elevation delta +1 cost +1'],
      movementHazardStatus: 'none',
      movementHazardReasons: [],
      combatStatus: 'attackable',
      blockedReasons: [],
    });
    expect(projection.terrain.elevation).toBe(2);
    expect(projection.movement?.mpCost).toBe(2);
    expect(projection.combat?.weaponIdsAvailable).toEqual(['medium-laser']);
    expect(projection.explanation).toContain('terrain rough');
    expect(projection.explanation).toContain('movement status legal');
    expect(projection.explanation).toContain('movement cost status costly');
    expect(projection.explanation).toContain(
      'movement cost consequences terrain +1; elevation delta +1 cost +1',
    );
    expect(projection.explanation).toContain('combat status attackable');
    expect(projection.explanation).toContain('Walk reachable 2 MP');
    expect(projection.explanation).toContain(
      'weapon options medium-laser short range in arc available',
    );
    expect(projection.explanation).toContain('weapon heat +3');
    expect(projection.explanation).toContain('damage 5 listed');
    expect(projection.explanation).toContain('expected damage 2.1');
    expect(projection.sourceReferences).toEqual([
      {
        channel: 'terrain-elevation',
        kind: 'mekstation',
        label: 'Rendered map terrain/elevation grid',
        detail: 'rough level 1 elevation 2',
        ruleReferences: TERRAIN_RULE_REFERENCES,
      },
      {
        channel: 'movement',
        kind: 'megamek',
        label: 'MegaMek movement rules projection',
        detail:
          'walk projection: walk reachable 2 MP terrain +1 elevation delta +1 cost +1',
        ruleReferences: MOVEMENT_RULE_REFERENCES,
      },
      {
        channel: 'combat',
        kind: 'megamek',
        label: 'MegaMek combat target projection',
        detail: 'target short 1 hexes LOS clear',
        ruleReferences: COMBAT_RULE_REFERENCES,
      },
    ]);
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toBe(
      'terrain-elevation:mekstation:Rendered map terrain/elevation grid:rough level 1 elevation 2|movement:megamek:MegaMek movement rules projection:walk projection: walk reachable 2 MP terrain +1 elevation delta +1 cost +1|combat:megamek:MegaMek combat target projection:target short 1 hexes LOS clear',
    );
    expect(
      formatTacticalProjectionRuleReferences(projection.sourceReferences),
    ).toContain(
      'movement:megamek:MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
    );
    expect(
      formatTacticalProjectionRuleReferences(projection.sourceReferences),
    ).toContain(
      'combat:megamek:MegaMek RangeType.java:95-151 range bracket classification',
    );
    expect(projection.explanation).toContain(
      'sources terrain/elevation: Rendered map terrain/elevation grid; movement: MegaMek movement rules projection; combat: MegaMek combat target projection',
    );
  });

  it('includes represented building identity in terrain source detail', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: {
        coordinate: { q: 1, r: 0 },
        elevation: 1,
        features: [
          { type: TerrainType.LightWoods, level: 1 },
          {
            type: TerrainType.Building,
            level: 2,
            buildingId: 'warehouse-a',
            constructionFactor: 30,
          },
        ],
      },
      movement: undefined,
      combat: undefined,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.sourceReferences).toEqual([
      {
        channel: 'terrain-elevation',
        kind: 'mekstation',
        label: 'Rendered map terrain/elevation grid',
        detail:
          'light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
        ruleReferences: TERRAIN_RULE_REFERENCES,
      },
    ]);
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toBe(
      'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
    );
  });

  it('preserves layered terrain levels in source metadata and explanations', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: {
        coordinate: { q: 1, r: 0 },
        elevation: 2,
        features: [
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Smoke, level: 2 },
          { type: TerrainType.Building, level: 3 },
        ],
      },
      movement: undefined,
      combat: undefined,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.sourceReferences).toEqual([
      {
        channel: 'terrain-elevation',
        kind: 'mekstation',
        label: 'Rendered map terrain/elevation grid',
        detail: 'water depth 2,smoke intensity 2,building level 3 elevation 2',
        ruleReferences: TERRAIN_RULE_REFERENCES,
      },
    ]);
    expect(projection.explanation).toContain(
      'terrain water depth 2,smoke intensity 2,building level 3',
    );
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toBe(
      'terrain-elevation:mekstation:Rendered map terrain/elevation grid:water depth 2,smoke intensity 2,building level 3 elevation 2',
    );
  });

  it('preserves movement and combat blocked reasons as a mixed projection', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: movement({
        reachable: false,
        blockedReason: 'No legal walk path within 4 MP',
        movementInvalidReason: 'NoLegalPath',
        movementInvalidDetails: 'Rubble cliff blocks path',
      }),
      combat: combat({
        attackable: true,
      }),
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.status).toBe('mixed');
    expect(projection.intent).toBe('movement-combat');
    expect(projection.movementStatus).toBe('blocked');
    expect(projection.combatStatus).toBe('attackable');
    expect(projection.blockedReasons).toEqual([
      'Rubble cliff blocks path',
      'No legal walk path within 4 MP',
      'NoLegalPath',
    ]);
    expect(projection.explanation).toContain(
      'blocked Rubble cliff blocks path',
    );
  });
});
