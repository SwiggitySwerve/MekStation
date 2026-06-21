/**
 * Head damage parity tests for `resolveDamage`.
 *
 * MegaMek routes normal-cockpit BattleMech head hits through the same armor
 * and internal-structure damage path as other locations. The head hit wounds
 * the pilot once, but incoming damage is not capped to 3.
 *
 * @spec openspec/changes/fix-combat-damage-crit-parity/specs/combat-resolution/spec.md
 */

import type { CombatLocation } from '@/types/gameplay';

import { IUnitDamageState, resolveDamage } from '../../damage';

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

describe('resolveDamage head damage parity', () => {
  it('applies full AC/20 damage to head armor/internal structure without a 3-point cap', () => {
    const state = freshState();
    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      20,
    );

    expect(result.locationDamages).toHaveLength(1);
    const [headResult] = result.locationDamages;
    expect(headResult.location).toBe('head');
    expect(headResult.damage).toBe(20);
    expect(headResult.armorDamage).toBe(9);
    expect(headResult.structureDamage).toBe(3);
    expect(headResult.armorRemaining).toBe(0);
    expect(headResult.structureRemaining).toBe(0);
    expect(headResult.destroyed).toBe(true);
    expect(headResult.transferredDamage).toBe(0);
    expect(headResult.transferLocation).toBeUndefined();

    expect(after.armor.head).toBe(0);
    expect(after.structure.head).toBe(0);
    expect(after.destroyedLocations).toContain('head');
    expect(result.unitDestroyed).toBe(true);
    expect(result.destructionCause).toBe('head_destroyed');
  });

  it('applies low-damage head hits normally', () => {
    const state = freshState();
    const { result } = resolveDamage(state, 'head' as CombatLocation, 2);
    const [headResult] = result.locationDamages;
    expect(headResult.damage).toBe(2);
    expect(headResult.armorDamage).toBe(2);
  });

  it('applies cluster-group calls independently without a head-specific cap', () => {
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
    expect(state.armor.head).toBe(3);
  });

  it('lets a high-damage cluster group penetrate head structure', () => {
    const state = freshState({ armor: { ...freshState().armor, head: 4 } });
    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      5,
    );
    expect(result.locationDamages[0].damage).toBe(5);
    expect(result.locationDamages[0].armorDamage).toBe(4);
    expect(result.locationDamages[0].structureDamage).toBe(1);
    expect(after.armor.head).toBe(0);
    expect(after.structure.head).toBe(2);
  });

  it('still applies pilot damage once when armor is penetrated', () => {
    const state = freshState({ armor: { ...freshState().armor, head: 2 } });
    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      20,
    );

    expect(result.locationDamages[0].damage).toBe(20);
    expect(result.locationDamages[0].armorDamage).toBe(2);
    expect(result.locationDamages[0].structureDamage).toBe(3);
    expect(after.structure.head).toBe(0);
    expect(result.pilotDamage?.woundsInflicted).toBe(1);
  });

  it('suppresses head-hit pilot damage for Dermal Armor without suppressing full damage', () => {
    const state = freshState({
      armor: { ...freshState().armor, head: 2 },
      pilotAbilities: ['dermal_armor'],
    });

    const { state: after, result } = resolveDamage(
      state,
      'head' as CombatLocation,
      20,
    );

    expect(result.locationDamages[0]).toMatchObject({
      location: 'head',
      damage: 20,
      armorDamage: 2,
      structureDamage: 3,
    });
    expect(after.structure.head).toBe(0);
    expect(result.pilotDamage).toBeUndefined();
    expect(after.pilotWounds).toBe(0);
  });
});
