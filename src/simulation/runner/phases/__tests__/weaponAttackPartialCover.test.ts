/**
 * Partial-cover leg-hit conversion — `resolveWeaponHit` tests.
 *
 * Per Total Warfare p. 53, a hit on a partial-cover target whose hit-location
 * roll lands on a leg is absorbed by the cover and resolves as a miss. These
 * tests drive `resolveWeaponHit` with a scripted `d6Roller` so the
 * hit-location roll is deterministic:
 *
 *   FRONT hit-location table — 2d6 total 5 → right_leg, 9 → left_leg,
 *   7 → center_torso.
 *
 * @spec openspec/changes/complete-partial-cover-rules/specs/to-hit-resolution/spec.md
 *        Requirement: Partial Cover Leg-Hit Conversion
 */

import type { ILOSDamageableCoverProvider } from '@/utils/gameplay/lineOfSight';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHexGrid,
  IUnitGameState,
  LockState,
  MovementType,
  TerrainType,
} from '@/types/gameplay';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  terrainFeaturesFromString,
  terrainStringFromFeatures,
} from '@/utils/gameplay/terrainEncoding';

import type { IWeapon } from '../../../ai/types';

import { DEFAULT_COMPONENT_DAMAGE } from '../../SimulationRunnerConstants';
import { resolveWeaponHit } from '../weaponAttackHitResolution';

// =============================================================================
// Fixtures
// =============================================================================

/** A scripted d6 roller that dequeues `queue`, then yields 1 forever. */
function scriptedRoller(queue: readonly number[]): () => number {
  let i = 0;
  return () => queue[i++] ?? 1;
}

/** Minimal medium-laser stand-in (5 damage, energy). */
function makeWeapon(): IWeapon {
  return {
    id: 'weapon-1',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeDamageableCoverGrid(options: {
  readonly constructionFactor: number;
  readonly fuelTank?: boolean;
}): IHexGrid {
  const coord = { q: 0, r: 1 };
  const terrain = terrainStringFromFeatures([
    {
      type: TerrainType.Building,
      level: 1,
      constructionFactor: options.constructionFactor,
      ...(options.fuelTank
        ? { fuelTankId: 'fuel-tank-a', fuelTankElevation: 1 }
        : { buildingId: 'building-a' }),
    },
  ]);

  return {
    config: { radius: 2 },
    hexes: new Map([
      [
        coordToKey(coord),
        {
          coord,
          occupantId: null,
          terrain,
          elevation: 0,
        },
      ],
    ]),
  };
}

function makeDamageableCoverProvider(
  fuelTank = false,
): ILOSDamageableCoverProvider {
  return {
    coord: { q: 0, r: 1 },
    kind: fuelTank ? 'fuel-tank' : 'building',
    side: 'target',
    terrain: TerrainType.Building,
    height: 1,
    totalElevation: 1,
    constructionFactor: fuelTank ? 4 : 12,
    buildingClass: 'soft',
    ...(fuelTank
      ? { fuelTankId: 'fuel-tank-a' }
      : { buildingId: 'building-a' }),
  };
}

/** Build a full-health `IUnitGameState`. */
function makeUnit(id: string, side: GameSide): IUnitGameState {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: 0 } : { q: 1, r: 0 },
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 41,
      right_leg: 41,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
  };
}

/** A 1v1 game state in the Weapon Attack phase. */
function makeState(): IGameState {
  return {
    gameId: 'pc-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      attacker: makeUnit('attacker', GameSide.Player),
      target: makeUnit('target', GameSide.Opponent),
    },
    turnEvents: [],
  };
}

/** Common `resolveWeaponHit` arguments shared by every test. */
function resolveArgs(
  events: IGameEvent[],
  partialCover: boolean,
  rollQueue: readonly number[],
  options: {
    hullDown?: boolean;
    targetQuirks?: readonly string[];
    targetAbilities?: readonly string[];
    targetEdgePointsRemaining?: number;
    attackRoll?: number;
    toHitNumber?: number;
    projectileCount?: number;
    targetArmor?: Readonly<Record<string, number>>;
  } = {},
) {
  const currentState = makeState();
  const target = currentState.units.target;

  return {
    currentState: {
      ...currentState,
      units: {
        ...currentState.units,
        target: {
          ...target,
          ...(options.targetArmor
            ? { armor: { ...target.armor, ...options.targetArmor } }
            : {}),
          ...(options.targetQuirks ? { unitQuirks: options.targetQuirks } : {}),
          ...(options.targetAbilities
            ? { abilities: options.targetAbilities }
            : {}),
          ...(options.targetEdgePointsRemaining !== undefined
            ? { edgePointsRemaining: options.targetEdgePointsRemaining }
            : {}),
        },
      },
    },
    events,
    gameId: 'pc-test',
    unitId: 'attacker',
    targetId: 'target',
    weaponId: 'weapon-1',
    weapon: makeWeapon(),
    attackRoll: options.attackRoll ?? 8,
    toHitNumber: options.toHitNumber ?? 6,
    firingArc: 'front' as const,
    partialCover,
    ...(options.projectileCount !== undefined
      ? { projectileCount: options.projectileCount }
      : {}),
    ...(options.hullDown !== undefined ? { hullDown: options.hullDown } : {}),
    d6Roller: scriptedRoller(rollQueue),
    getOrSeedManifest: () => buildDefaultCriticalSlotManifest(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('resolveWeaponHit — partial cover leg-hit conversion', () => {
  it('converts a leg hit on a covered target to a miss', () => {
    // Roll [2,3] → 2d6 total 5 → FRONT table → right_leg.
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(resolveArgs(events, true, [2, 3]));

    const resolved = events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(1);
    expect((resolved[0].payload as { hit: boolean }).hit).toBe(false);
    expect(
      (resolved[0].payload as { location?: string }).location,
    ).toBeUndefined();

    // No damage applied — cover absorbed the shot.
    expect(events.some((e) => e.type === GameEventType.DamageApplied)).toBe(
      false,
    );
    // Target armor untouched.
    expect(result.units.target.armor.right_leg).toBe(41);
  });

  it('routes a covered leg hit into represented building cover state', () => {
    const events: IGameEvent[] = [];
    const grid = makeDamageableCoverGrid({ constructionFactor: 12 });
    const result = resolveWeaponHit({
      ...resolveArgs(events, true, [2, 3]),
      grid,
      damageableCoverProvider: makeDamageableCoverProvider(),
    });

    const terrainChanged = events.find(
      (event) => event.type === GameEventType.TerrainChanged,
    );
    expect(terrainChanged?.payload).toMatchObject({
      reason: 'damageable_cover_hit',
      previousTerrain: expect.any(String),
      sourceUnitId: 'attacker',
    });
    const terrain = (terrainChanged?.payload as { terrain: string }).terrain;
    const features = terrainFeaturesFromString(terrain);
    expect(features[0]).toMatchObject({
      type: TerrainType.Building,
      buildingId: 'building-a',
      constructionFactor: 7,
    });
    expect(result.terrainOverrides?.['0,1']?.terrain).toBe(terrain);
    expect(grid.hexes.get('0,1')?.terrain).toBe(terrain);
    expect(result.units.target.armor.right_leg).toBe(41);
    expect(
      events.some((event) => event.type === GameEventType.DamageApplied),
    ).toBe(false);
  });

  it('removes represented fuel-tank cover when absorbed damage exhausts its construction factor', () => {
    const events: IGameEvent[] = [];
    const grid = makeDamageableCoverGrid({
      constructionFactor: 4,
      fuelTank: true,
    });
    const result = resolveWeaponHit({
      ...resolveArgs(events, true, [2, 3]),
      grid,
      damageableCoverProvider: makeDamageableCoverProvider(true),
    });

    const terrainChanged = events.find(
      (event) => event.type === GameEventType.TerrainChanged,
    );
    expect(terrainChanged?.payload).toMatchObject({
      terrain: TerrainType.Clear,
      reason: 'damageable_cover_hit',
      previousTerrain: expect.any(String),
      sourceUnitId: 'attacker',
    });
    expect(result.terrainOverrides?.['0,1']?.terrain).toBe(TerrainType.Clear);
    expect(grid.hexes.get('0,1')?.terrain).toBe(TerrainType.Clear);
    expect(result.units.target.armor.right_leg).toBe(41);
  });

  it('applies damage on a leg hit when the target is NOT in partial cover', () => {
    // Same right_leg roll, but partialCover false → normal hit.
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(resolveArgs(events, false, [2, 3]));

    const resolved = events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(1);
    expect((resolved[0].payload as { hit: boolean }).hit).toBe(true);
    expect(events.some((e) => e.type === GameEventType.DamageApplied)).toBe(
      true,
    );
    // 5 damage landed on the right leg armor (41 → 36).
    expect(result.units.target.armor.right_leg).toBe(36);
  });

  it('applies damage on a non-leg hit even when the target is in partial cover', () => {
    // Roll [3,4] → total 7 → FRONT table → center_torso (not a leg).
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(resolveArgs(events, true, [3, 4]));

    const resolved = events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(1);
    expect((resolved[0].payload as { hit: boolean }).hit).toBe(true);
    expect(events.some((e) => e.type === GameEventType.DamageApplied)).toBe(
      true,
    );
    expect(result.units.target.armor.center_torso).toBe(42);
  });

  it('redirects a front-arc hull-down leg hit to center torso damage', () => {
    // Roll [2,3] is a front-table right_leg hit before hull-down redirect.
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(
      resolveArgs(events, false, [2, 3], { hullDown: true }),
    );

    const resolved = events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );

    expect(resolved).toHaveLength(1);
    expect((resolved[0].payload as { hit: boolean }).hit).toBe(true);
    expect((resolved[0].payload as { location?: string }).location).toBe(
      'center_torso',
    );
    expect(result.units.target.armor.center_torso).toBe(42);
    expect(result.units.target.armor.right_leg).toBe(41);
  });

  it('halves normal weapon damage for a Low Profile glancing blow', () => {
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(
      resolveArgs(events, false, [3, 4], {
        targetQuirks: ['low_profile'],
        attackRoll: 7,
        toHitNumber: 6,
      }),
    );

    const resolved = events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toHaveLength(1);
    expect(
      resolved[0].payload as { hit: boolean; damage?: number },
    ).toMatchObject({
      hit: true,
      damage: 2,
    });
    expect(events.some((e) => e.type === GameEventType.DamageApplied)).toBe(
      true,
    );
    expect(result.units.target.armor.center_torso).toBe(45);
  });

  it('applies the Low Profile glancing critical-hit-table penalty', () => {
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(
      resolveArgs(events, false, [3, 4, 4, 5, 1], {
        targetArmor: { center_torso: 1 },
        targetQuirks: ['low_profile'],
        attackRoll: 7,
        toHitNumber: 6,
      }),
    );

    const resolved = events.find(
      (e) => e.type === GameEventType.AttackResolved,
    );

    expect(
      resolved?.payload as { hit: boolean; damage?: number },
    ).toMatchObject({
      hit: true,
      damage: 2,
    });
    expect(result.units.target.armor.center_torso).toBe(0);
    expect(result.units.target.structure.center_torso).toBe(30);
    expect(events.some((e) => e.type === GameEventType.CriticalHit)).toBe(
      false,
    );
    expect(
      events.some((e) => e.type === GameEventType.CriticalHitResolved),
    ).toBe(false);
  });

  it('keeps unmodified critical-hit-table rolls for non-Low Profile hits', () => {
    const events: IGameEvent[] = [];
    resolveWeaponHit(
      resolveArgs(events, false, [3, 4, 4, 5, 1], {
        targetArmor: { center_torso: 1 },
        attackRoll: 8,
        toHitNumber: 6,
      }),
    );

    expect(events.some((e) => e.type === GameEventType.CriticalHit)).toBe(true);
    expect(
      events.some((e) => e.type === GameEventType.CriticalHitResolved),
    ).toBe(true);
  });

  it('leaves projectile-count Low Profile hits unhalved after cluster-table handling', () => {
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(
      resolveArgs(events, false, [3, 4], {
        targetQuirks: ['low_profile'],
        attackRoll: 7,
        toHitNumber: 6,
        projectileCount: 4,
      }),
    );

    const resolved = events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );

    expect(resolved).toHaveLength(1);
    expect(
      resolved[0].payload as {
        hit: boolean;
        damage?: number;
        projectileCount?: number;
      },
    ).toMatchObject({
      hit: true,
      damage: 5,
      projectileCount: 4,
    });
    expect(result.units.target.armor.center_torso).toBe(42);
  });

  it('spends target Edge to replace a head-hit location result', () => {
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(
      resolveArgs(events, false, [6, 6, 3, 4], {
        targetAbilities: ['edge_when_headhit'],
        targetEdgePointsRemaining: 1,
      }),
    );

    const resolved = events.find(
      (e) => e.type === GameEventType.AttackResolved,
    );

    expect(resolved?.payload).toMatchObject({
      hit: true,
      location: 'center_torso',
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_headhit',
      edgePointsRemaining: 0,
      edgeSupersededLocation: 'head',
      edgeSupersededRoll: 12,
    });
    expect(result.units.target.edgePointsRemaining).toBe(0);
    expect(result.units.target.armor.head).toBe(9);
    expect(result.units.target.armor.center_torso).toBe(42);
  });

  it('spends target Edge to replace a TAC hit-location result before damage', () => {
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(
      resolveArgs(events, false, [1, 1, 3, 3], {
        targetAbilities: ['edge_when_tac'],
        targetEdgePointsRemaining: 1,
      }),
    );

    const resolved = events.find(
      (e) => e.type === GameEventType.AttackResolved,
    );

    expect(resolved?.payload).toMatchObject({
      hit: true,
      location: 'right_torso',
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_tac',
      edgePointsRemaining: 0,
      edgeSupersededLocation: 'center_torso',
      edgeSupersededRoll: 2,
    });
    expect(result.units.target.edgePointsRemaining).toBe(0);
    expect(result.units.target.armor.center_torso).toBe(47);
    expect(result.units.target.armor.right_torso).toBe(27);
  });
});
