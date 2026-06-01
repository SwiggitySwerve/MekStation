import type { IAttackInvalidPayload } from '@/types/gameplay/GameSessionAttackEvents';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
  MEGAMEK_ATTACKER_EVADING_INVALIDATION_SOURCE_REFS,
  MEGAMEK_ATTACKER_SPRINTED_INVALIDATION_SOURCE_REFS,
  MEGAMEK_DESTROYED_TARGETABILITY_SOURCE_REFS,
  MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS,
  MEGAMEK_FRIENDLY_TARGET_INVALIDATION_SOURCE_REFS,
  MEGAMEK_MISSING_TARGET_INVALIDATION_SOURCE_REFS,
  MEGAMEK_NO_LINE_OF_SIGHT_INVALIDATION_SOURCE_REFS,
  MEGAMEK_OUT_OF_AMMO_INVALIDATION_SOURCE_REFS,
  MEGAMEK_OUT_OF_RANGE_INVALIDATION_SOURCE_REFS,
  MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS,
  MEGAMEK_UNKNOWN_WEAPON_INVALIDATION_SOURCE_REFS,
  MEGAMEK_WEAPON_READY_INVALIDATION_SOURCE_REFS,
  MEKSTATION_ATTACK_INVALID_AMMO_SUPPRESSION_SOURCE_REFS,
  MEKSTATION_ATTACK_INVALID_DAMAGE_SUPPRESSION_SOURCE_REFS,
  MEKSTATION_ATTACK_INVALID_EVENT_SUPPRESSION_SOURCE_REFS,
  MEKSTATION_ATTACK_INVALID_FIRED_WEAPON_SUPPRESSION_SOURCE_REFS,
  MEKSTATION_ATTACK_INVALID_HEAT_SUPPRESSION_SOURCE_REFS,
  MEKSTATION_SAME_HEX_INVALIDATION_SOURCE_REFS,
} from './CombatAttackInvalidationSourceRefs';

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

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

export const ATTACK_INVALIDATION_REASON_SUPPORT = {
  OutOfAmmo: integrated(
    'OutOfAmmo',
    'runAttackPhase emits AttackInvalid before heat, ammo, or damage side effects when ammo bins are empty',
    MEGAMEK_OUT_OF_AMMO_INVALIDATION_SOURCE_REFS,
  ),
  SameHex: integrated(
    'SameHex',
    'runAttackPhase emits AttackInvalid before firing-arc/to-hit resolution when attacker and target share a hex',
    MEKSTATION_SAME_HEX_INVALIDATION_SOURCE_REFS,
  ),
  OutOfRange: integrated(
    'OutOfRange',
    'runAttackPhase emits AttackInvalid when getWeaponRangeBracket returns out_of_range',
    MEGAMEK_OUT_OF_RANGE_INVALIDATION_SOURCE_REFS,
  ),
  NoLineOfSight: integrated(
    'NoLineOfSight',
    'validateLineOfSightForAttack emits AttackInvalid for blocked direct fire and indirect fire without a spotter',
    MEGAMEK_NO_LINE_OF_SIGHT_INVALIDATION_SOURCE_REFS,
  ),
  AttackerEvading: integrated(
    'AttackerEvading',
    'validateDeclaredAttackTarget and declareAttack emit AttackInvalid for evading attackers before ranged AttackDeclared, heat, ammo, fired-weapon, or damage side effects',
    MEGAMEK_ATTACKER_EVADING_INVALIDATION_SOURCE_REFS,
  ),
  AttackerSprinted: integrated(
    'AttackerSprinted',
    'validateDeclaredAttackTarget and declareAttack emit AttackInvalid for explicit sprinting attackers before ranged AttackDeclared, heat, ammo, fired-weapon, or damage side effects',
    MEGAMEK_ATTACKER_SPRINTED_INVALIDATION_SOURCE_REFS,
  ),
  InvalidTarget: integrated(
    'InvalidTarget',
    'validateDeclaredAttackTarget and declareAttack emit AttackInvalid for missing, destroyed, same-side, retreated, or ejected targets',
    [
      ...MEGAMEK_MISSING_TARGET_INVALIDATION_SOURCE_REFS,
      ...MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
      ...MEGAMEK_DESTROYED_TARGETABILITY_SOURCE_REFS,
      ...MEGAMEK_FRIENDLY_TARGET_INVALIDATION_SOURCE_REFS,
      ...MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS,
      ...MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS,
    ],
  ),
  UnknownWeapon: integrated(
    'UnknownWeapon',
    'runAttackPhase emits AttackInvalid when a hydrated declaration names no weapon in the unit weapon map',
    MEGAMEK_UNKNOWN_WEAPON_INVALIDATION_SOURCE_REFS,
  ),
  WeaponDestroyed: integrated(
    'WeaponDestroyed',
    'toAIUnitState marks critical-destroyed weapon mounts unavailable and runAttackPhase rejects stale declarations before heat, ammo, fired-weapon, or damage side effects',
    MEGAMEK_WEAPON_READY_INVALIDATION_SOURCE_REFS,
  ),
  WeaponJammed: integrated(
    'WeaponJammed',
    'runAttackPhase emits AttackInvalid before heat, ammo, fired-weapon, or damage side effects when a persisted UAC/RAC jam blocks the declared mount',
    MEGAMEK_WEAPON_READY_INVALIDATION_SOURCE_REFS,
  ),
} satisfies Record<IAttackInvalidPayload['reason'], ICombatFeatureSupportEntry>;

export const INVALID_TARGET_STATE_SUPPORT = {
  'missing-target': integrated(
    'missing-target',
    'validateDeclaredAttackTarget and declareAttack report a target id that does not exist',
    MEGAMEK_MISSING_TARGET_INVALIDATION_SOURCE_REFS,
  ),
  'destroyed-target': integrated(
    'destroyed-target',
    'validateDeclaredAttackTarget and declareAttack reject target.destroyed',
    [
      ...MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
      ...MEGAMEK_DESTROYED_TARGETABILITY_SOURCE_REFS,
    ],
  ),
  'same-side-target': integrated(
    'same-side-target',
    'validateDeclaredAttackTarget and declareAttack reject targets on the attacker side',
    MEGAMEK_FRIENDLY_TARGET_INVALIDATION_SOURCE_REFS,
  ),
  'retreated-target': integrated(
    'retreated-target',
    'validateDeclaredAttackTarget and declareAttack reject target.hasRetreated',
    [
      ...MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
      ...MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS,
    ],
  ),
  'ejected-target': integrated(
    'ejected-target',
    'validateDeclaredAttackTarget and declareAttack reject target.hasEjected and preserve ejection targetability removal',
    [
      ...MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS,
      ...MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS,
    ],
  ),
} satisfies Record<InvalidTargetState, ICombatFeatureSupportEntry>;

export const ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT = {
  'no-attack-declared': integrated(
    'no-attack-declared',
    'invalid ranged attacks emit only AttackInvalid and skip AttackDeclared',
    MEKSTATION_ATTACK_INVALID_EVENT_SUPPRESSION_SOURCE_REFS,
  ),
  'no-attack-resolved': integrated(
    'no-attack-resolved',
    'invalid ranged attacks emit only AttackInvalid and skip AttackResolved',
    MEKSTATION_ATTACK_INVALID_EVENT_SUPPRESSION_SOURCE_REFS,
  ),
  'no-heat-spent': integrated(
    'no-heat-spent',
    'invalid ranged attacks leave attacker heat unchanged',
    MEKSTATION_ATTACK_INVALID_HEAT_SUPPRESSION_SOURCE_REFS,
  ),
  'no-ammo-consumed': integrated(
    'no-ammo-consumed',
    'invalid ranged attacks leave attacker ammoState unchanged',
    MEKSTATION_ATTACK_INVALID_AMMO_SUPPRESSION_SOURCE_REFS,
  ),
  'no-damage-applied': integrated(
    'no-damage-applied',
    'invalid ranged attacks leave target armor, structure, and damageThisPhase unchanged',
    MEKSTATION_ATTACK_INVALID_DAMAGE_SUPPRESSION_SOURCE_REFS,
  ),
  'no-fired-weapon-state': integrated(
    'no-fired-weapon-state',
    'invalid ranged attacks do not append to weaponsFiredThisTurn',
    MEKSTATION_ATTACK_INVALID_FIRED_WEAPON_SUPPRESSION_SOURCE_REFS,
  ),
} satisfies Record<
  AttackInvalidationSideEffectGuard,
  ICombatFeatureSupportEntry
>;
