import type { IAttackInvalidPayload } from '@/types/gameplay/GameSessionAttackEvents';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
  type AttackInvalidationSideEffectGuard,
  type InvalidTargetState,
} from '../CombatAttackInvalidationSupport';

const ATTACK_INVALID_REASONS = [
  'InvalidTarget',
  'NoLineOfSight',
  'OutOfAmmo',
  'OutOfRange',
  'SameHex',
  'UnknownWeapon',
  'WeaponDestroyed',
  'WeaponJammed',
] as const satisfies readonly IAttackInvalidPayload['reason'][];

const INVALID_TARGET_STATES = [
  'destroyed-target',
  'ejected-target',
  'missing-target',
  'retreated-target',
  'same-side-target',
] as const satisfies readonly InvalidTargetState[];

const NO_SIDE_EFFECT_GUARDS = [
  'no-ammo-consumed',
  'no-attack-declared',
  'no-attack-resolved',
  'no-damage-applied',
  'no-fired-weapon-state',
  'no-heat-spent',
] as const satisfies readonly AttackInvalidationSideEffectGuard[];

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

describe('BattleMech attack invalidation support catalog', () => {
  it('catalogs every AttackInvalid reason emitted by runner weapon attacks', () => {
    expect(sortedKeys(ATTACK_INVALIDATION_REASON_SUPPORT)).toEqual([
      ...ATTACK_INVALID_REASONS,
    ]);
    expect(supportGaps(ATTACK_INVALIDATION_REASON_SUPPORT)).toEqual([]);
    expect(
      Object.values(ATTACK_INVALIDATION_REASON_SUPPORT).every(
        (entry) => entry.level === 'integrated',
      ),
    ).toBe(true);
  });

  it('catalogs targetability-removal states that invalidate ranged attacks', () => {
    expect(sortedKeys(INVALID_TARGET_STATE_SUPPORT)).toEqual([
      ...INVALID_TARGET_STATES,
    ]);
    expect(supportGaps(INVALID_TARGET_STATE_SUPPORT)).toEqual([]);
  });

  it('catalogs the no-side-effects contract for invalid ranged attacks', () => {
    expect(sortedKeys(ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT)).toEqual([
      ...NO_SIDE_EFFECT_GUARDS,
    ]);
    expect(supportGaps(ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT)).toEqual([]);
  });
});
