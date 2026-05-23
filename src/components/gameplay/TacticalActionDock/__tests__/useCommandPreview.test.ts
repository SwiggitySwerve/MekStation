/**
 * useCommandPreview / buildCommandPreview — pure projection tests.
 *
 * Verifies the spec's `Command Preview Lifecycle` requirement:
 *   - Movement preview reads from the existing path/MP projection.
 *   - Attack preview surfaces the targetUnitId + to-hit when a target
 *     is selected.
 *   - Cancel (passing null command) clears the preview.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import type {
  IPhysicalAttackOption,
  PhysicalAttackInvalidReason,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  type ITacticalCommandContext,
  type ICombatRangeHex,
  type IMovementRangeHex,
  type IWeaponStatus,
} from '@/types/gameplay';

import { buildMovementCommands } from '../commands/movementCommands';
import { buildPhysicalAttackCommands } from '../commands/physicalAttackCommands';
import { buildWeaponAttackCommands } from '../commands/weaponAttackCommands';
import { buildCommandPreview } from '../useCommandPreview';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

function makeCombatInfo(
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex: { q: 2, r: 0 },
    distance: 2,
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
    visibleTargetUnitIds: ['enemy-x'],
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
    targetUnitIds: ['enemy-x'],
    validTargetUnitIds: ['enemy-x'],
    ...overrides,
  };
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  };
}

function makePhysicalOption(
  overrides: Partial<IPhysicalAttackOption> = {},
): IPhysicalAttackOption {
  return {
    attackType: 'punch',
    limb: 'rightArm',
    toHit: {
      baseToHit: 4,
      finalToHit: 6,
      modifiers: [],
      allowed: true,
    },
    damage: {
      targetDamage: 7,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      hitTable: 'punch',
      targetDisplaced: false,
    },
    selfRisk: {
      damageToAttacker: 0,
      legDamagePerLeg: 0,
      pilotingSkillRoll: null,
      onMiss: null,
    },
    restrictionsFailed: [],
    ...overrides,
  };
}

describe('buildCommandPreview', () => {
  const walk = buildMovementCommands().find((c) => c.id === 'movement.walk')!;
  const fire = buildWeaponAttackCommands().find(
    (c) => c.id === 'weapon.fire-volley',
  )!;
  const punch = buildPhysicalAttackCommands().find(
    (c) => c.id === 'physical.punch',
  )!;
  const charge = buildPhysicalAttackCommands().find(
    (c) => c.id === 'physical.charge',
  )!;

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

  it('weapon preview preserves the shared combat projection attack envelope', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: 'enemy-x' }),
      {
        hitChance: 10,
        weaponRangeBand: 'long',
        combatInfo: makeCombatInfo({
          rangeBracket: RangeBracket.Medium,
          toHitNumber: 8,
          weaponIdsAvailable: ['medium-laser', 'ac-5'],
          availableWeaponImpacts: [
            {
              weaponId: 'medium-laser',
              weaponName: 'Medium Laser',
              heat: 3,
              damage: 5,
              ammoConsumed: 0,
            },
            {
              weaponId: 'ac-5',
              weaponName: 'AC/5',
              heat: 1,
              damage: 5,
              ammoConsumed: 1,
              ammoRemaining: 20,
            },
          ],
          availableWeaponHeat: 4,
          availableWeaponDamage: 10,
          expectedDamage: 7.25,
        }),
        weaponStatuses: [
          makeWeapon({ heat: 12 }),
          makeWeapon({
            id: 'ac-5',
            name: 'AC/5',
            heat: 8,
            damage: '5',
            ammoRemaining: 20,
          }),
          makeWeapon({
            id: 'out-of-arc-ppc',
            name: 'PPC',
            heat: 10,
            damage: 10,
          }),
        ],
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackable).toBe(true);
      expect(preview.toHit).toBe(8);
      expect(preview.rangeBand).toBe('medium');
      expect(preview.heatCost).toBe(4);
      expect(preview.weaponIds).toEqual(['medium-laser', 'ac-5']);
      expect(preview.weaponNames).toEqual(['Medium Laser', 'AC/5']);
      expect(preview.ammoUsage).toEqual({ 'AC/5': 1 });
      expect(preview.expectedDamage).toBeCloseTo(7.25, 2);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });

  it('weapon preview explains blocked projected attacks without spending heat or ammo', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: 'enemy-x' }),
      {
        combatInfo: makeCombatInfo({
          attackable: false,
          validTargetUnitIds: [],
          attackInvalidReason: 'NoLineOfSight',
          attackInvalidDetails: 'Blocked by building at (1, 0)',
          blockedReason: 'Blocked by building at (1, 0)',
          toHitNumber: undefined,
          weaponIdsAvailable: ['medium-laser'],
          availableWeaponHeat: 3,
        }),
        weaponStatuses: [makeWeapon()],
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackable).toBe(false);
      expect(preview.blockedReason).toBe('Blocked by building at (1, 0)');
      expect(preview.attackInvalidReason).toBe('NoLineOfSight');
      expect(preview.attackInvalidDetails).toBe(
        'Blocked by building at (1, 0)',
      );
      expect(preview.toHit).toBeNull();
      expect(preview.heatCost).toBe(0);
      expect(preview.weaponIds).toEqual([]);
      expect(preview.weaponNames).toEqual([]);
      expect(preview.ammoUsage).toEqual({});
      expect(preview.expectedDamage).toBe(0);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });

  it('physical preview mirrors the shared physical attack option projection', () => {
    const option = makePhysicalOption({
      attackType: 'punch',
      toHit: {
        baseToHit: 4,
        finalToHit: 7,
        modifiers: [{ name: 'Target movement', value: 1, source: 'target' }],
        allowed: true,
      },
      damage: {
        targetDamage: 8,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      },
    });

    const preview = buildCommandPreview(
      punch,
      makeCtx({ phase: GamePhase.PhysicalAttack, targetUnitId: null }),
      {
        physicalTargetUnitId: 'enemy-x',
        physicalAttackOption: option,
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'physical-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackType).toBe('punch');
      expect(preview.limb).toBe('rightArm');
      expect(preview.attackable).toBe(true);
      expect(preview.toHit).toBe(7);
      expect(preview.damage).toBe(8);
      expect(preview.selfDamage).toBe(0);
      expect(preview.requiresPSR).toBe(false);
      expect(preview.restrictionReasonCodes).toEqual([]);
    } else {
      throw new Error('expected physical-attack preview');
    }
  });

  it('physical preview explains restricted projection rows', () => {
    const option = makePhysicalOption({
      attackType: 'charge' as PhysicalAttackType,
      toHit: {
        baseToHit: 5,
        finalToHit: Number.POSITIVE_INFINITY,
        modifiers: [],
        allowed: false,
        restrictionReasonCode: 'NoRunThisTurn',
      },
      damage: {
        targetDamage: 13,
        attackerDamage: 3,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: 'kick',
        targetDisplaced: false,
      },
      selfRisk: {
        damageToAttacker: 3,
        legDamagePerLeg: 0,
        pilotingSkillRoll: { trigger: 'ChargeCompleted', required: true },
        onMiss: 'None',
      },
      restrictionsFailed: ['NoRunThisTurn' as PhysicalAttackInvalidReason],
    });

    const preview = buildCommandPreview(
      charge,
      makeCtx({ phase: GamePhase.PhysicalAttack, targetUnitId: null }),
      {
        physicalTargetUnitId: 'enemy-x',
        physicalAttackOption: option,
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'physical-attack') {
      expect(preview.attackType).toBe('charge');
      expect(preview.attackable).toBe(false);
      expect(preview.toHit).toBeNull();
      expect(preview.damage).toBe(13);
      expect(preview.selfDamage).toBe(3);
      expect(preview.requiresPSR).toBe(true);
      expect(preview.restrictionReasonCodes).toEqual(['NoRunThisTurn']);
      expect(preview.blockedReasons).toEqual([
        'Charge requires running this turn',
      ]);
    } else {
      throw new Error('expected physical-attack preview');
    }
  });
});
