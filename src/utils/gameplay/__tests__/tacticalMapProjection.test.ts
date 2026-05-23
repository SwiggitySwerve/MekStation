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
} from '@/utils/gameplay/tacticalMapProjection';

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
      blockedReasons: [],
    });
    expect(projection.terrain.elevation).toBe(2);
    expect(projection.movement?.mpCost).toBe(2);
    expect(projection.combat?.weaponIdsAvailable).toEqual(['medium-laser']);
    expect(projection.explanation).toContain('terrain rough');
    expect(projection.explanation).toContain('Walk reachable 2 MP');
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
    expect(projection.blockedReasons).toEqual([
      'Rubble cliff blocks path',
      'No legal walk path within 4 MP',
      'NoLegalPath',
    ]);
    expect(projection.explanation).toContain(
      'blocked Rubble cliff blocks path',
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
    });
    expect(blockedTarget.blockedReasons).toEqual([
      'LOS blocked by heavy woods at 0,0',
      'Line of sight blocked',
      'NoLineOfSight',
    ]);
    expect(emptyRange).toMatchObject({
      intent: 'combat',
      status: 'legal',
      blockedReasons: [],
    });
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
      status: 'legal',
      isHovered: true,
      pathIndex: 1,
      inAttackRange: true,
    });
  });
});
