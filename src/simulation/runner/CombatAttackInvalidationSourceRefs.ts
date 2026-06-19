import {
  megamekSourceRefWithLineAnchor as megamekSourceRef,
  mekstationDeviationSourceRefWithLineAnchor as mekstationDeviationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

export const MEGAMEK_OUT_OF_AMMO_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible returns OutOfAmmo before ranged to-hit resolution when an ammo-fed weapon has no usable linked shots.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L160-L162',
  ),
  megamekSourceRef(
    'MegaMek Mounted.isAmmoUsable requires ammo to be present, not destroyed or missing, not dumping, not useless, and to have shots left.',
    'megamek/src/megamek/common/equipment/Mounted.java',
    'L1257-L1263',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_SAME_HEX_INVALIDATION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation runAttackPhase treats same-hex ranged declarations as a local AttackInvalid reason before to-hit, heat, ammo, fired-weapon, or damage side effects.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L754-L769',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_OUT_OF_RANGE_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek RangeType.calculateRangeBracket returns RANGE_OUT when ranges are missing or distance exceeds long/extreme range without the matching optional range mode.',
    'megamek/src/megamek/common/RangeType.java',
    'L137-L148',
  ),
  megamekSourceRef(
    'MegaMek Compute.getRangeMods computes weapon range from effective distance and returns automatic failure for RANGE_OUT direct-fire attacks.',
    'megamek/src/megamek/common/compute/Compute.java',
    'L1481-L1539',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_NO_LINE_OF_SIGHT_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible returns the LOS impossible description when LOS modifiers are impossible for non-artillery direct fire.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L475-L479',
  ),
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible rejects indirect fire without a spotter unless source-backed exceptions such as Oblique Attacker or mortar/artillery-cannon behavior apply.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L1657-L1664',
  ),
  megamekSourceRef(
    'MegaMek LosEffects.losModifiers returns impossible to-hit data for terrain, building, woods, smoke, planted fields, heavy industrial, screen, and mixed LOS blocks.',
    'megamek/src/megamek/common/LosEffects.java',
    'L825-L864',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ATTACKER_EVADING_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible prevents non-large-spacecraft evading attackers from firing ranged attacks.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L289-L292',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ATTACKER_SPRINTED_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ranged to-hit calculation makes attacks by sprinting attackers automatic failures.',
    'megamek/src/megamek/common/compute/Compute.java',
    'L2678-L2680',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MISSING_TARGET_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible returns NoTarget before ranged to-hit resolution when the target is null.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L136-L142',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ACTIVE_TARGET_FILTER_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek Game.getValidTargets only returns visible enemy entities that are targetable, deployed, on-board, non-hidden, and not the attacker.',
    'megamek/src/megamek/common/game/Game.java',
    'L701-L715',
  ),
  megamekSourceRef(
    'MegaMek Entity.isTargetable excludes destroyed, doomed, off-board, transported, captured, undeployed, and positionless entities from attack targetability.',
    'megamek/src/megamek/common/units/Entity.java',
    'L1963-L1975',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_DESTROYED_TARGETABILITY_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek Entity.isTargetable requires the target entity to be non-destroyed before it can be selected as an attack target.',
    'megamek/src/megamek/common/units/Entity.java',
    'L1963-L1975',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_FRIENDLY_TARGET_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible rejects friendly direct attack targets when friendly-fire is disabled, except explicit coolant/special-case paths.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L365-L374',
  ),
  megamekSourceRef(
    'MegaMek Entity.isEnemyOf treats an entity as never being an enemy of itself and delegates side hostility through owner/team relationships.',
    'megamek/src/megamek/common/units/Entity.java',
    'L1734-L1746',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RETREAT_TARGET_REMOVAL_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek TWGameManager marks a fleeing entity with its retreat direction and removes it from the active game with REMOVE_IN_RETREAT.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L5768-L5770',
  ),
  megamekSourceRef(
    'MegaMek Game.removeEntity removes the entity from active in-game objects, position lookup, and deployment processing before emitting a removal event.',
    'megamek/src/megamek/common/game/Game.java',
    'L1382-L1405',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EJECTION_TARGET_REMOVAL_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek TWGameManager.ejectEntity short-circuits repeat ejection, marks the crew ejected, destroys the original entity, and removes manual ejections with REMOVE_EJECTED.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L27130-L27367',
  ),
  megamekSourceRef(
    'MegaMek Game.removeEntity removes the ejected original unit from active in-game objects and position lookup.',
    'megamek/src/megamek/common/game/Game.java',
    'L1382-L1405',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_UNKNOWN_WEAPON_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek ComputeToHit.toHitCalc returns an impossible No weapon result when the requested mounted weapon cannot be found.',
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java',
    'L93-L99',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_WEAPON_READY_INVALIDATION_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek Mounted.isReady requires mounted equipment to be not destroyed, not missing, not jammed, not useless, and not already fired before it can fire.',
    'megamek/src/megamek/common/equipment/Mounted.java',
    'L591-L598',
  ),
  megamekSourceRef(
    'MegaMek Mounted.canFire returns false when mounted equipment is not ready, breached, missing, shut down, or crew-inactive.',
    'megamek/src/megamek/common/equipment/Mounted.java',
    'L1203-L1215',
  ),
  megamekSourceRef(
    'MegaMek ComputeToHitIsImpossible returns WeaponNotReady when the mounted weapon cannot fire.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java',
    'L1904-L1909',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ATTACK_INVALID_EVENT_SUPPRESSION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation runAttackPhase emits AttackInvalid and continues for invalid target, missing hydrated weapon, destroyed weapon, same-hex, and out-of-range declarations before AttackDeclared can be emitted.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L643-L803',
  ),
  mekstationDeviationRef(
    'MekStation runAttackPhase emits AttackInvalid and stops stale jammed or out-of-ammo declarations before entering the valid-shot AttackDeclared and AttackResolved sequence.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1006-L1208',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ATTACK_INVALID_HEAT_SUPPRESSION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation runAttackPhase only records fired weapon heat after invalidation gates and the valid-shot declaration path have passed.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1178-L1229',
  ),
  mekstationDeviationRef(
    'MekStation markWeaponFiredForHeat is the runner weapon-fire heat-accounting boundary because heat phase later derives weapon heat from weaponsFiredThisTurn.',
    'src/simulation/runner/phases/weaponAttackFiringModes.ts',
    'L117-L143',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ATTACK_INVALID_AMMO_SUPPRESSION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation runAttackPhase calls consumeWeaponAmmo only after invalidation gates and valid-shot miss or hit resolution have passed.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1212-L1221',
  ),
  mekstationDeviationRef(
    'MekStation consumeWeaponAmmo mutates ammoState and emits AmmoConsumed, so invalid attacks must not reach this helper.',
    'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts',
    'L110-L162',
  ),
  mekstationDeviationRef(
    'MekStation resolveWeaponHit emits AttackResolved and then consumes ammo only for valid hit-resolution paths.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L253-L306',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ATTACK_INVALID_DAMAGE_SUPPRESSION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation runAttackPhase calls resolveWeaponHit only after invalidation gates, valid declaration, and valid projectile resolution have passed.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1225-L1317',
  ),
  mekstationDeviationRef(
    'MekStation resolveWeaponHit increments damageThisPhase and emits AttackResolved only on valid hit-resolution paths.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L238-L306',
  ),
  mekstationDeviationRef(
    'MekStation emitDamageChainEvents is the runner DamageApplied and transfer side-effect boundary, so invalid attacks must not reach it.',
    'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts',
    'L182-L303',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ATTACK_INVALID_FIRED_WEAPON_SUPPRESSION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation runAttackPhase calls markWeaponFiredForHeat only after invalidation gates and valid attack resolution are in progress.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1178-L1229',
  ),
  mekstationDeviationRef(
    'MekStation markWeaponFiredForHeat appends the weapon id to weaponsFiredThisTurn, so invalid attacks must exit before this helper.',
    'src/simulation/runner/phases/weaponAttackFiringModes.ts',
    'L117-L143',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
