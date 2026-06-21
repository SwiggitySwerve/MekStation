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

import type { IGameEvent } from '@/types/gameplay';

import { GameEventType, TerrainType } from '@/types/gameplay';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

import { resolveWeaponHit } from '../weaponAttackHitResolution';
import {
  makeDamageableCoverGrid,
  makeDamageableCoverProvider,
  resolveArgs,
} from './weaponAttackPartialCover.fixtures';

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

  it('applies a TAC critical on natural hit-location roll 2 even when armor absorbs damage', () => {
    const events: IGameEvent[] = [];
    const result = resolveWeaponHit(resolveArgs(events, false, [1, 1, 1, 1]));

    const resolved = events.find(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved?.payload).toMatchObject({
      hit: true,
      location: 'center_torso',
      damage: 5,
    });
    expect(result.units.target.armor.center_torso).toBe(42);
    expect(result.units.target.structure.center_torso).toBe(31);
    expect(result.units.target.componentDamage?.engineHits).toBe(1);
    expect(
      events.some((event) => event.type === GameEventType.CriticalHitResolved),
    ).toBe(true);
  });
});
