import type { IAttackInvalidPayload } from '@/types/gameplay/GameSessionAttackEvents';

import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

export type InvalidTargetState =
  | 'missing-target'
  | 'destroyed-target'
  | 'same-side-target'
  | 'retreated-target'
  | 'ejected-target';

export type AttackInvalidationSideEffectGuard =
  | 'no-attack-declared'
  | 'no-attack-resolved'
  | 'no-heat-spent'
  | 'no-ammo-consumed'
  | 'no-damage-applied'
  | 'no-fired-weapon-state';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

export const ATTACK_INVALIDATION_REASON_SUPPORT = {
  OutOfAmmo: integrated(
    'OutOfAmmo',
    'runAttackPhase emits AttackInvalid before heat, ammo, or damage side effects when ammo bins are empty',
  ),
  SameHex: integrated(
    'SameHex',
    'runAttackPhase emits AttackInvalid before firing-arc/to-hit resolution when attacker and target share a hex',
  ),
  OutOfRange: integrated(
    'OutOfRange',
    'runAttackPhase emits AttackInvalid when getWeaponRangeBracket returns out_of_range',
  ),
  NoLineOfSight: integrated(
    'NoLineOfSight',
    'validateLineOfSightForAttack emits AttackInvalid for blocked direct fire and indirect fire without a spotter',
  ),
  InvalidTarget: integrated(
    'InvalidTarget',
    'validateDeclaredAttackTarget and declareAttack emit AttackInvalid for missing, destroyed, same-side, retreated, or ejected targets',
  ),
  UnknownWeapon: integrated(
    'UnknownWeapon',
    'runAttackPhase emits AttackInvalid when a hydrated declaration names no weapon in the unit weapon map',
  ),
  WeaponDestroyed: integrated(
    'WeaponDestroyed',
    'toAIUnitState marks critical-destroyed weapon mounts unavailable and runAttackPhase rejects stale declarations before heat, ammo, fired-weapon, or damage side effects',
  ),
  WeaponJammed: integrated(
    'WeaponJammed',
    'runAttackPhase emits AttackInvalid before heat, ammo, fired-weapon, or damage side effects when a persisted UAC/RAC jam blocks the declared mount',
  ),
} satisfies Record<IAttackInvalidPayload['reason'], ICombatFeatureSupportEntry>;

export const INVALID_TARGET_STATE_SUPPORT = {
  'missing-target': integrated(
    'missing-target',
    'validateDeclaredAttackTarget and declareAttack report a target id that does not exist',
  ),
  'destroyed-target': integrated(
    'destroyed-target',
    'validateDeclaredAttackTarget and declareAttack reject target.destroyed',
  ),
  'same-side-target': integrated(
    'same-side-target',
    'validateDeclaredAttackTarget and declareAttack reject targets on the attacker side',
  ),
  'retreated-target': integrated(
    'retreated-target',
    'validateDeclaredAttackTarget and declareAttack reject target.hasRetreated',
  ),
  'ejected-target': integrated(
    'ejected-target',
    'validateDeclaredAttackTarget and declareAttack reject target.hasEjected and preserve ejection targetability removal',
  ),
} satisfies Record<InvalidTargetState, ICombatFeatureSupportEntry>;

export const ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT = {
  'no-attack-declared': integrated(
    'no-attack-declared',
    'invalid ranged attacks emit only AttackInvalid and skip AttackDeclared',
  ),
  'no-attack-resolved': integrated(
    'no-attack-resolved',
    'invalid ranged attacks emit only AttackInvalid and skip AttackResolved',
  ),
  'no-heat-spent': integrated(
    'no-heat-spent',
    'invalid ranged attacks leave attacker heat unchanged',
  ),
  'no-ammo-consumed': integrated(
    'no-ammo-consumed',
    'invalid ranged attacks leave attacker ammoState unchanged',
  ),
  'no-damage-applied': integrated(
    'no-damage-applied',
    'invalid ranged attacks leave target armor, structure, and damageThisPhase unchanged',
  ),
  'no-fired-weapon-state': integrated(
    'no-fired-weapon-state',
    'invalid ranged attacks do not append to weaponsFiredThisTurn',
  ),
} satisfies Record<
  AttackInvalidationSideEffectGuard,
  ICombatFeatureSupportEntry
>;
