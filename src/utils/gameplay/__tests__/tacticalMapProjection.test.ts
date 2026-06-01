import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

import {
  CoverLevel,
  MovementType,
  RangeBracket,
  TerrainType,
} from '@/types/gameplay';
import {
  buildTacticalMapHexProjection,
  buildTacticalMapHexProjectionLookup,
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

const TERRAIN_RULE_REFERENCES = [
  'MekStation terrain/elevation grid state; movement and combat channels own legality',
] as const;

const MOVEMENT_RULE_REFERENCES = [
  'MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
  'MegaMek common/moves/MoveStep.java:3135-3156 elevation change legality',
  'MegaMek common/moves/MovePath.java:1214-1218 MP-used accounting',
] as const;

const COMBAT_RULE_REFERENCES = [
  'MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
  'MegaMek RangeType.java:95-151 range bracket classification',
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
] as const;

const LOS_BLOCKER_RULE_REFERENCES = [
  'MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
  'MegaMek LosEffects.java:1322-1483 elevation/building blockers and cover',
] as const;

function terrain(elevation = 0, type = TerrainType.Clear): IHexTerrain {
  return {
    coordinate: { q: 1, r: 0 },
    elevation,
    features: [{ type, level: type === TerrainType.Clear ? 0 : 1 }],
  };
}

function movement(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 1, r: 0 },
    mpCost: 2,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    reachable: true,
    movementType: MovementType.Walk,
    movementMode: 'walk',
    ...overrides,
  };
}

function combat(overrides: Partial<ICombatRangeHex> = {}): ICombatRangeHex {
  return {
    hex: { q: 1, r: 0 },
    distance: 1,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy'],
    obscuredTargetUnitIds: [],
    attackable: true,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: ['medium-laser'],
    weaponRangeOptions: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
        rangeBracket: RangeBracket.Short,
        inRange: true,
        inArc: true,
        environmentLegal: true,
        available: true,
      },
    ],
    availableWeaponImpacts: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
      },
    ],
    availableWeaponHeat: 3,
    availableWeaponDamage: 5,
    expectedDamage: 2.1,
    targetUnitIds: ['enemy'],
    validTargetUnitIds: ['enemy'],
    ...overrides,
  };
}

describe('tacticalMapProjection', () => {
  it('composes terrain, movement, combat, path, and selected state into one legal projection', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(2, TerrainType.Rough),
      movement: movement(),
      combat: combat(),
      isSelected: false,
      isHovered: true,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      key: '1,0',
      isHovered: true,
      inAttackRange: true,
      intent: 'movement-combat',
      status: 'legal',
      movementStatus: 'legal',
      combatStatus: 'attackable',
      blockedReasons: [],
    });
    expect(projection.terrain.elevation).toBe(2);
    expect(projection.movement?.mpCost).toBe(2);
    expect(projection.combat?.weaponIdsAvailable).toEqual(['medium-laser']);
    expect(projection.explanation).toContain('terrain rough');
    expect(projection.explanation).toContain('movement status legal');
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
      isSelected: false,
      isHovered: false,
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
      isSelected: false,
      isHovered: false,
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
      isSelected: false,
      isHovered: false,
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
      isSelected: false,
      isHovered: false,
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
      isSelected: false,
      isHovered: false,
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
      isSelected: false,
      isHovered: false,
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

  it('includes per-weapon range and arc options in the shared projection explanation', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: undefined,
      combat: combat({
        weaponIdsInRange: ['front-laser', 'rear-laser'],
        weaponIdsInArc: ['front-laser', 'small-laser'],
        weaponIdsAvailable: ['front-laser'],
        weaponRangeOptions: [
          {
            weaponId: 'front-laser',
            weaponName: 'Front Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.Short,
            inRange: true,
            inArc: true,
            environmentLegal: true,
            available: true,
          },
          {
            weaponId: 'rear-laser',
            weaponName: 'Rear Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.Short,
            inRange: true,
            inArc: false,
            environmentLegal: true,
            available: false,
            blockedReason: 'out of front arc',
          },
          {
            weaponId: 'small-laser',
            weaponName: 'Small Laser',
            heat: 1,
            damage: 3,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.OutOfRange,
            inRange: false,
            inArc: true,
            environmentLegal: true,
            available: false,
            blockedReason: 'out of range',
          },
        ],
        availableWeaponImpacts: [
          {
            weaponId: 'front-laser',
            weaponName: 'Front Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
          },
        ],
        availableWeaponHeat: 3,
        availableWeaponDamage: 5,
      }),
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.explanation).toContain(
      'weapon options front-laser short range in arc available, rear-laser short range out of arc blocked: out of front arc, small-laser out_of_range range in arc blocked: out of range',
    );
  });

  it('marks blocked enemy targets without treating empty range hexes as blocked targets', () => {
    const blockedTarget = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      combat: combat({
        attackable: false,
        attackInvalidReason: 'NoLineOfSight',
        attackInvalidDetails: 'LOS blocked by heavy woods at 0,0',
        blockedReason: 'Line of sight blocked',
      }),
      movement: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });
    const emptyRange = buildTacticalMapHexProjection({
      hex: { q: 2, r: 0 },
      terrain: terrain(),
      combat: combat({
        hex: { q: 2, r: 0 },
        distance: 2,
        hasTarget: false,
        targetVisibilityState: 'none',
        visibleTargetUnitIds: [],
        attackable: false,
        targetUnitIds: [],
        validTargetUnitIds: [],
      }),
      movement: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(blockedTarget).toMatchObject({
      intent: 'combat',
      status: 'blocked',
      movementStatus: 'none',
      combatStatus: 'blocked',
    });
    expect(blockedTarget.blockedReasons).toEqual([
      'LOS blocked by heavy woods at 0,0',
      'Line of sight blocked',
      'NoLineOfSight',
    ]);
    expect(emptyRange).toMatchObject({
      intent: 'combat',
      status: 'legal',
      movementStatus: 'none',
      combatStatus: 'range-only',
      blockedReasons: [],
    });
  });

  it('preserves top-level legal status while marking mixed visible and obscured combat channels', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: undefined,
      combat: combat({
        targetUnitIds: ['visible-enemy', 'fog-contact'],
        visibleTargetUnitIds: ['visible-enemy'],
        obscuredTargetUnitIds: ['fog-contact'],
        validTargetUnitIds: ['visible-enemy'],
        targetVisibilityState: 'mixed',
        visibilityBlockedReason:
          'Some contacts are hidden or last-known and cannot be targeted',
        attackable: true,
      }),
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      intent: 'combat',
      status: 'legal',
      movementStatus: 'none',
      combatStatus: 'mixed',
    });
    expect(projection.explanation).toContain('combat status mixed');
    expect(projection.explanation).toContain('visibility mixed');
  });

  it('builds a lookup with default clear terrain and legacy attack-range fallback', () => {
    const projectionLookup = buildTacticalMapHexProjectionLookup({
      hexes: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      terrainLookup: new Map(),
      movementRangeLookup: new Map(),
      combatRangeLookup: new Map(),
      selectedHex: { q: 0, r: 0 },
      hoveredHex: { q: 1, r: 0 },
      highlightPathIndexLookup: new Map([['1,0', 1]]),
      legacyAttackRangeLookup: new Set(['1,0']),
    });

    expect(projectionLookup.get('0,0')).toMatchObject({
      intent: 'selected',
      status: 'neutral',
      isSelected: true,
      terrain: {
        elevation: 0,
        features: [{ type: TerrainType.Clear, level: 0 }],
      },
    });
    expect(projectionLookup.get('1,0')).toMatchObject({
      intent: 'path',
      status: 'neutral',
      combatStatus: 'range-only',
      isHovered: true,
      pathIndex: 1,
      inAttackRange: true,
      sourceReferences: expect.arrayContaining([
        expect.objectContaining({
          channel: 'legacy-attack-range',
          kind: 'mekstation',
          label: 'Legacy attackRange fallback',
          detail: 'caller-provided range envelope',
          ruleReferences: [
            'MekStation caller-provided compatibility range; not a rules-backed attack option',
          ],
        }),
      ]),
    });
    expect(
      formatTacticalProjectionRuleReferences(
        projectionLookup.get('1,0')?.sourceReferences ?? [],
      ),
    ).toContain(
      'legacy-attack-range:mekstation:MekStation caller-provided compatibility range; not a rules-backed attack option',
    );
  });

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
        detail: 'elevation for 2,0',
        ruleReferences: LOS_BLOCKER_RULE_REFERENCES,
      },
    ]);
  });
});
