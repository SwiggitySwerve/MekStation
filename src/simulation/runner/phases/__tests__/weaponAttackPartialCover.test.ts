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

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

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
  options: { hullDown?: boolean } = {},
) {
  return {
    currentState: makeState(),
    events,
    gameId: 'pc-test',
    unitId: 'attacker',
    targetId: 'target',
    weaponId: 'weapon-1',
    weapon: makeWeapon(),
    attackRoll: 8,
    toHitNumber: 6,
    firingArc: 'front' as const,
    partialCover,
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
});
