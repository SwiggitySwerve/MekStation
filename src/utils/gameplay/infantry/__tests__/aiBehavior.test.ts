/**
 * Infantry AI adaptation helper tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §11 (AI Adaptations)
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import {
  coverSeekScore,
  shouldAvoidChargeMech,
  targetPriorityMultiplier,
} from '../aiBehavior';
import { InfantryCoverType } from '../cover';
import { createInfantryCombatState } from '../state';

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    ...createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: true,
    }),
    ...overrides,
  };
}

describe('shouldAvoidChargeMech', () => {
  it('true for healthy anti-mech platoon', () => {
    expect(shouldAvoidChargeMech(baseState())).toBe(true);
  });

  it('false when platoon has no training', () => {
    expect(
      shouldAvoidChargeMech(baseState({ hasAntiMechTraining: false })),
    ).toBe(false);
  });

  it('false when pinned', () => {
    expect(shouldAvoidChargeMech(baseState({ pinned: true }))).toBe(false);
  });

  it('false when routed', () => {
    expect(shouldAvoidChargeMech(baseState({ routed: true }))).toBe(false);
  });

  it('false when destroyed', () => {
    expect(
      shouldAvoidChargeMech(
        baseState({ destroyed: true, survivingTroopers: 0 }),
      ),
    ).toBe(false);
  });

  it('false when survivors reach 0 even without destroyed flag', () => {
    expect(shouldAvoidChargeMech(baseState({ survivingTroopers: 0 }))).toBe(
      false,
    );
  });
});

describe('coverSeekScore', () => {
  it('empty list = 0', () => {
    expect(coverSeekScore([])).toBe(0);
  });

  it('matches sum of modifiers', () => {
    expect(
      coverSeekScore([
        InfantryCoverType.BUILDING_HEAVY,
        InfantryCoverType.HULL_DOWN,
      ]),
    ).toBe(4);
  });
});

describe('targetPriorityMultiplier', () => {
  it('healthy platoon = 1', () => {
    expect(targetPriorityMultiplier(baseState())).toBe(1);
  });

  it('pinned platoon = 0.5', () => {
    expect(targetPriorityMultiplier(baseState({ pinned: true }))).toBe(0.5);
  });

  it('routed platoon = 0', () => {
    expect(targetPriorityMultiplier(baseState({ routed: true }))).toBe(0);
  });

  it('destroyed platoon = 0', () => {
    expect(
      targetPriorityMultiplier(
        baseState({ destroyed: true, survivingTroopers: 0 }),
      ),
    ).toBe(0);
  });
});
