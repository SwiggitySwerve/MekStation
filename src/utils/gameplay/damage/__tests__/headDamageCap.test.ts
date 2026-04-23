/**
 * Unit tests for the head-damage cap inside `resolveDamage`.
 *
 * Canonical OpenSpec change: `integrate-damage-pipeline` tasks 5.1–5.4.
 * Total Warfare p. 41: any single hit landing on the head is capped at
 * 3 points of applied damage; overflow is discarded (not transferred).
 * Cluster weapons invoke `resolveDamage` once per cluster group, so the
 * per-call cap also satisfies the per-cluster-group independent cap.
 *
 * @spec openspec/changes/integrate-damage-pipeline/specs/damage-system/spec.md
 */

import type { CombatLocation } from '@/types/gameplay';

import {
  IUnitDamageState,
  resolveDamage,
  HEAD_DAMAGE_CAP_PER_HIT,
} from '../../damage';
import * as hitLocation from '../../hitLocation';

jest.mock('../../hitLocation', () => {
  const actual =
    jest.requireActual<typeof import('../../hitLocation')>('../../hitLocation');
  return {
    ...actual,
    roll2d6: jest.fn().mockReturnValue({
      dice: [6, 6],
      total: 12,
      isSnakeEyes: false,
      isBoxcars: true,
    }),
  };
});

function freshState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    armor: {
      head: 9,
      center_torso: 20,
      left_torso: 15,
      right_torso: 15,
      left_arm: 10,
      right_arm: 10,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: {
      center_torso: 8,
      left_torso: 6,
      right_torso: 6,
    },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 16,
      left_torso_rear: 12,
      right_torso_rear: 12,
    },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    ...overrides,
  };
}

describe('resolveDamage — head damage cap (task 5.1–5.4)', () => {
  it('exports the cap constant as 3', () => {
    expect(HEAD_DAMAGE_CAP_PER_HIT).toBe(3);
  });

  it('caps an AC/20 hit (20 damage) at 3 damage applied; discards 17', () => {
    const state = freshState();
    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      20,
    );

    // Only the first 3 damage reaches the head: 3 armor, 0 structure.
    expect(result.locationDamages).toHaveLength(1);
    const [headResult] = result.locationDamages;
    expect(headResult.location).toBe('head');
    expect(headResult.damage).toBe(3);
    expect(headResult.armorDamage).toBe(3);
    expect(headResult.structureDamage).toBe(0);
    expect(headResult.armorRemaining).toBe(6);
    expect(headResult.structureRemaining).toBe(3);

    // Overflow is DISCARDED — no transfer event to any other location.
    expect(headResult.transferredDamage).toBe(0);
    expect(headResult.transferLocation).toBeUndefined();

    // Head armor dropped by exactly 3, no structure loss.
    expect(after.armor.head).toBe(6);
    expect(after.structure.head).toBe(3);
    expect(after.destroyedLocations).toEqual([]);
  });

  it('does not cap a hit at or below the threshold', () => {
    const state = freshState();
    const { result } = resolveDamage(state, 'head' as CombatLocation, 2);
    const [headResult] = result.locationDamages;
    expect(headResult.damage).toBe(2);
    expect(headResult.armorDamage).toBe(2);
  });

  it('caps each cluster-group call independently (LRM-20, 6 hits of 1 damage each to head)', () => {
    // Cluster weapons invoke resolveDamage once per cluster group.
    // Fire six single-point calls, each resolving to head. None should
    // be capped because each call is under the 3-point threshold. The
    // cap only kicks in when a SINGLE hit exceeds 3.
    let state = freshState();
    for (let i = 0; i < 6; i++) {
      const { state: next, result } = resolveDamage(
        state,
        'head' as CombatLocation,
        1,
      );
      expect(result.locationDamages[0].damage).toBe(1);
      state = next;
    }
    expect(state.armor.head).toBe(3); // 9 - 6
  });

  it('caps cluster hits with a single high-damage group (SRM/LB-X cluster of 5 to head)', () => {
    // When a cluster group delivers more than 3 to head, THAT group is
    // capped at 3 and the rest of the volley continues in separate calls.
    const state = freshState({ armor: { ...freshState().armor, head: 4 } });
    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      5,
    );
    expect(result.locationDamages[0].damage).toBe(3);
    expect(after.armor.head).toBe(1);
  });

  it('still applies pilot damage once when armor is penetrated even if capped', () => {
    // Start with 2 armor on head so a capped 3-point hit strips armor
    // and puts 1 point into structure.
    const state = freshState({ armor: { ...freshState().armor, head: 2 } });
    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      20,
    );

    expect(result.locationDamages[0].damage).toBe(3);
    expect(result.locationDamages[0].armorDamage).toBe(2);
    expect(result.locationDamages[0].structureDamage).toBe(1);
    expect(after.structure.head).toBe(2);
    expect(result.pilotDamage?.woundsInflicted).toBe(1);
  });
});
