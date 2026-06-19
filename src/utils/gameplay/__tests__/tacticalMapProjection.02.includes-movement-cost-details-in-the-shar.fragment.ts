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
  it('includes movement cost details in the shared projection explanation', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(-1, TerrainType.Rough),
      movement: movement({
        mpCost: 5,
        terrainCost: 2,
        elevationDelta: -1,
        elevationCost: 0,
        heatGenerated: 3,
        movementMode: 'tracked',
        path: [
          { q: 0, r: 0 },
          { q: 0, r: 1 },
          { q: 1, r: 0 },
        ],
        standUpRequired: true,
        standUpMode: 'careful',
        standUpCost: 1,
        standUpPsrRequired: true,
        standUpPsrReason: 'Careful stand',
        standUpPsrTargetNumber: 4,
        standUpPsrModifier: -2,
        standUpPsrModifierDetails: ['Careful stand -2'],
      }),
      combat: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.explanation).toContain('Walk reachable 5 MP');
    expect(projection.explanation).toContain('mode tracked');
    expect(projection.explanation).toContain('terrain cost +2');
    expect(projection.explanation).toContain('elevation delta -1 cost +0');
    expect(projection.explanation).toContain('heat +3');
    expect(projection.explanation).toContain('path 2 steps');
    expect(projection.explanation).toContain('stand-up careful +1 MP');
    expect(projection.explanation).toContain('stand-up PSR Careful stand TN 4');
    expect(projection.explanation).toContain('stand-up PSR modifier -2');
    expect(projection.explanation).toContain(
      'stand-up modifiers Careful stand -2',
    );
    expect(projection.explanation).toContain('terrain rough');
    expect(projection.explanation).toContain('elevation -1');
  });

  it('marks reachable movement with cost consequences as costly projection metadata', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(2, TerrainType.Rough),
      movement: movement({
        mpCost: 6,
        terrainCost: 2,
        elevationDelta: 1,
        elevationCost: 1,
        heatGenerated: 2,
        conversionStepCount: 1,
        conversionMpCost: 1,
        altitudeControlRequired: true,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
        automaticLandingRequired: true,
        automaticLandingReason: 'WiGE moved below minimum distance',
        automaticLandingDistance: 2,
        automaticLandingMinimumDistance: 3,
      }),
      combat: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.status).toBe('legal');
    expect(projection.movementStatus).toBe('legal');
    expect(projection.movementCostStatus).toBe('costly');
    expect(projection.movementCostReasons).toEqual([
      'terrain +2',
      'elevation delta +1 cost +1',
      'heat +2',
      'conversion 1 steps 1 MP',
      'altitude control 1 steps 1 MP',
      'automatic landing 2/3 hexes WiGE moved below minimum distance',
    ]);
    expect(projection.explanation).toContain('movement cost status costly');
    expect(projection.explanation).toContain(
      'movement cost consequences terrain +2; elevation delta +1 cost +1; heat +2; conversion 1 steps 1 MP; altitude control 1 steps 1 MP; automatic landing 2/3 hexes WiGE moved below minimum distance',
    );
  });

  it('explains represented hull-down exit MP before movement commitment', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: movement({
        mpCost: 3,
        terrainCost: 1,
        elevationDelta: 0,
        elevationCost: 0,
        heatGenerated: 0,
        hullDownExitRequired: true,
        hullDownExitCost: 2,
      }),
      combat: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      status: 'legal',
      movementStatus: 'legal',
      movementCostStatus: 'costly',
      movementCostReasons: ['terrain +1', 'hull-down exit 2 MP'],
    });
    expect(projection.explanation).toContain('hull-down exit +2 MP');
    expect(projection.explanation).toContain(
      'movement cost consequences terrain +1; hull-down exit 2 MP',
    );
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toContain('hull-down exit 2 MP');
  });

  it('keeps reachable clear movement ordinary when no cost consequences apply', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: movement({
        mpCost: 1,
        terrainCost: 0,
        elevationDelta: 0,
        elevationCost: 0,
        heatGenerated: 0,
      }),
      combat: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.status).toBe('legal');
    expect(projection.movementStatus).toBe('legal');
    expect(projection.movementCostStatus).toBe('ordinary');
    expect(projection.movementCostReasons).toEqual([]);
    expect(projection.explanation).toContain('movement cost status ordinary');
    expect(projection.explanation).not.toContain('movement cost consequences');
  });

  it('projects represented minefields as movement hazards with source-backed provenance', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(0, TerrainType.Mines),
      movement: movement({
        mpCost: 1,
        terrainCost: 0,
        elevationDelta: 0,
        elevationCost: 0,
        heatGenerated: 0,
      }),
      combat: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      status: 'legal',
      movementStatus: 'legal',
      movementCostStatus: 'ordinary',
      movementCostReasons: [],
      movementHazardStatus: 'represented-minefield',
      movementHazardReasons: [
        'reachable entry through represented mines can apply 10 damage to each leg',
        'mine leg structure damage can queue a leg-damage PSR',
        '20+ mine damage in the movement phase can queue a damage-threshold PSR',
      ],
      sourceReferences: expect.arrayContaining([
        expect.objectContaining({
          channel: 'movement',
          kind: 'mekstation',
          label: 'Represented minefield movement hazard projection',
          detail:
            'represented mines levels 1; reachable entry can apply 10 damage to each leg and queue PSRs',
          ruleReferences: REPRESENTED_MINEFIELD_RULE_REFERENCES,
        }),
      ]),
    });
    expect(projection.explanation).toContain(
      'movement hazard status represented-minefield',
    );
    expect(projection.explanation).toContain(
      'movement hazards reachable entry through represented mines can apply 10 damage to each leg; mine leg structure damage can queue a leg-damage PSR; 20+ mine damage in the movement phase can queue a damage-threshold PSR',
    );
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toContain(
      'movement:mekstation:Represented minefield movement hazard projection:represented mines levels 1; reachable entry can apply 10 damage to each leg and queue PSRs',
    );
    expect(
      formatTacticalProjectionRuleReferences(projection.sourceReferences),
    ).toContain(
      'movement:mekstation:MekStation src/simulation/runner/phases/movementMines.ts: represented TerrainType.Mines entry applies BattleMech leg damage and queues PSRs',
    );
  });
});
