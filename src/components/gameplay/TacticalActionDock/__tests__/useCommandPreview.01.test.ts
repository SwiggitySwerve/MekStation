import * as H from './useCommandPreview.test-helpers';

const {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  buildCommandPreview,
  buildMovementCommands,
  buildPhysicalAttackCommands,
  buildWeaponAttackCommands,
  charge,
  fire,
  makeCombatInfo,
  makeCtx,
  makePhysicalOption,
  makeWeapon,
  punch,
  walk,
} = H;

type ICombatRangeHex = H.ICombatRangeHex;
type IMovementRangeHex = H.IMovementRangeHex;
type IPhysicalAttackOption = H.IPhysicalAttackOption;
type ITacticalCommandContext = H.ITacticalCommandContext;
type IWeaponStatus = H.IWeaponStatus;
type PhysicalAttackInvalidReason = H.PhysicalAttackInvalidReason;
type PhysicalAttackType = H.PhysicalAttackType;
describe('buildCommandPreview', () => {
  it('returns null when no command is selected (cancel state)', () => {
    expect(buildCommandPreview(null, makeCtx(), {})).toBeNull();
  });

  it('returns null when movement command has no path yet', () => {
    expect(buildCommandPreview(walk, makeCtx(), {})).toBeNull();
  });

  it('movement preview reads path / mpCost / unreachable / finalFacing from inputs', () => {
    const preview = buildCommandPreview(walk, makeCtx(), {
      highlightPath: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
      hoverMpCost: 3,
      hoverUnreachable: false,
      movementMode: 'walk',
      previewFacing: 2,
    });
    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'movement') {
      expect(preview.path).toHaveLength(3);
      expect(preview.mpCost).toBe(3);
      expect(preview.unreachable).toBe(false);
      expect(preview.finalFacing).toBe(2);
      expect(preview.mode).toBe('walk');
    } else {
      throw new Error('expected movement preview');
    }
  });

  it('movement preview flags unreachable correctly', () => {
    const preview = buildCommandPreview(walk, makeCtx(), {
      highlightPath: [{ q: 0, r: 0 }],
      hoverMpCost: 99,
      hoverUnreachable: true,
    });
    if (preview && preview.kind === 'movement') {
      expect(preview.unreachable).toBe(true);
    } else {
      throw new Error('expected movement preview');
    }
  });

  it('movement preview preserves the shared rules-backed movement projection', () => {
    const movementInfo: IMovementRangeHex = {
      hex: { q: 2, r: 0 },
      mpCost: 5,
      terrainCost: 2,
      elevationDelta: 1,
      elevationCost: 1,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
      blockedReason: 'Destination hex is occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination hex is occupied',
      heatGenerated: 2,
      movementMode: 'tracked',
      reachable: false,
      movementType: MovementType.Run,
    };

    const preview = buildCommandPreview(walk, makeCtx(), {
      highlightPath: [{ q: 0, r: 0 }],
      hoverMpCost: 99,
      hoverUnreachable: false,
      movementMode: 'walk',
      movementInfo,
    });

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'movement') {
      expect(preview.path).toBe(movementInfo.path);
      expect(preview.mpCost).toBe(5);
      expect(preview.mode).toBe('run');
      expect(preview.movementMode).toBe('tracked');
      expect(preview.terrainCost).toBe(2);
      expect(preview.elevationDelta).toBe(1);
      expect(preview.elevationCost).toBe(1);
      expect(preview.heatGenerated).toBe(2);
      expect(preview.unreachable).toBe(true);
      expect(preview.blockedReason).toBe('Destination hex is occupied');
    } else {
      throw new Error('expected movement preview');
    }
  });

  it('movement preview explains blocked hovered destinations without a path', () => {
    const movementInfo: IMovementRangeHex = {
      hex: { q: 4, r: 0 },
      mpCost: 6,
      terrainCost: 1,
      elevationDelta: 2,
      elevationCost: 2,
      heatGenerated: 2,
      movementMode: 'walk',
      reachable: false,
      movementType: MovementType.Walk,
      blockedReason: 'Destination is 4 hexes away, but max range for walk is 2',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 4 hexes away, but max range for walk is 2',
    };

    const preview = buildCommandPreview(walk, makeCtx(), {
      movementInfo,
      hoverUnreachable: true,
    });

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'movement') {
      expect(preview.path).toEqual([{ q: 4, r: 0 }]);
      expect(preview.mpCost).toBe(6);
      expect(preview.unreachable).toBe(true);
      expect(preview.blockedReason).toBe(
        'Destination is 4 hexes away, but max range for walk is 2',
      );
      expect(preview.elevationDelta).toBe(2);
      expect(preview.elevationCost).toBe(2);
    } else {
      throw new Error('expected movement preview');
    }
  });

  it('weapon preview returns null without a target', () => {
    expect(
      buildCommandPreview(
        fire,
        makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: null }),
        { hitChance: 8 },
      ),
    ).toBeNull();
  });

  it('weapon preview includes target + to-hit when target is selected', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: 'enemy-x' }),
      { hitChance: 8, weaponRangeBand: 'medium' },
    );
    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackable).toBe(true);
      expect(preview.toHit).toBe(8);
      expect(preview.rangeBand).toBe('medium');
      expect(preview.heatCost).toBe(0);
      expect(preview.weaponIds).toEqual([]);
      expect(preview.weaponNames).toEqual([]);
      expect(preview.ammoUsage).toEqual({});
      expect(preview.expectedDamage).toBe(0);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });

  it('weapon preview can use a hovered combat projection before target selection', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: null }),
      {
        combatInfo: makeCombatInfo({
          validTargetUnitIds: ['enemy-x'],
          visibleTargetUnitIds: ['enemy-x'],
          toHitNumber: 8,
          rangeBracket: RangeBracket.Medium,
          weaponIdsAvailable: ['medium-laser'],
        }),
        weaponStatuses: [makeWeapon()],
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackable).toBe(true);
      expect(preview.toHit).toBe(8);
      expect(preview.rangeBand).toBe('medium');
      expect(preview.heatCost).toBe(3);
      expect(preview.weaponIds).toEqual(['medium-laser']);
      expect(preview.weaponNames).toEqual(['Medium Laser']);
      expect(preview.expectedDamage).toBeCloseTo(2.1, 2);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });
});
