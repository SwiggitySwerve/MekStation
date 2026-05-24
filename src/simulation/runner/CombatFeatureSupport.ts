/**
 * Explicit support matrix for combat-active pilot SPAs and mech quirks.
 *
 * The catalog validation suite uses this as the line between implemented
 * behavior and known feature gaps. Adding a combat-active SPA or quirk without
 * updating this file should fail fast instead of letting a broad
 * known-limitation filter hide the missing rule.
 */

import {
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_SANDBLASTER_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

export type CombatFeatureSupportLevel =
  | 'integrated'
  | 'helper-only'
  | 'unsupported';

export type CombatFeatureSourceKind =
  | 'rulebook'
  | 'megamek-source'
  | 'mekhq-behavior'
  | 'mekstation-deviation';

export interface ICombatFeatureSourceReference {
  readonly kind: CombatFeatureSourceKind;
  readonly citation: string;
  readonly url: string;
  readonly sourceVersion: string;
}

export interface ICombatFeatureSupportEntry {
  readonly id: string;
  readonly level: CombatFeatureSupportLevel;
  readonly evidence: string;
  readonly gap?: string;
  readonly sourceRefs?: readonly ICombatFeatureSourceReference[];
}

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, level: 'helper-only', evidence, gap };
}

function unsupported(
  id: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  const entry: ICombatFeatureSupportEntry = {
    id,
    level: 'unsupported',
    evidence: 'No combat behavior wired',
    gap,
  };

  return sourceRefs ? { ...entry, sourceRefs } : entry;
}

const BMM_ERRATA_701_LANCE_TO_HIT = {
  kind: 'rulebook',
  citation:
    'BattleMech Manual Errata v7.01 Physical Weapon Attacks Table changes Lance to-hit modifier to +1',
  url: 'https://battletech.com/wp-content/uploads/2025/06/78_BattleMech-Manual-2023-09-17-v7.01-3.pdf',
  sourceVersion: 'v7.01',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE = {
  kind: 'megamek-source',
  citation:
    'MegaMek ClubAttackAction.getDamageFor applies physical weapon damage formulas including sword ceil(weight/10)+1, mace ceil(weight/4), and retractable blade ceil(weight/10)',
  url: 'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/common/actions/ClubAttackAction.java#L91-L182',
  sourceVersion: '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT = {
  kind: 'megamek-source',
  citation:
    'MegaMek ClubAttackAction.getHitModFor returns hatchet -1, sword -2, mace +1, lance +1, and retractable blade -2 physical weapon modifiers',
  url: 'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/common/actions/ClubAttackAction.java#L218-L251',
  sourceVersion: '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_6CA1867_RETRACTABLE_BLADE_MODE_GATE = {
  kind: 'megamek-source',
  citation:
    'MegaMek ClubAttackAction.toHit rejects retractable blade attacks unless the blade is extended',
  url: 'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/common/actions/ClubAttackAction.java#L329-L332',
  sourceVersion: '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_FLAIL_WRECKING_DAMAGE = {
  kind: 'megamek-source',
  citation:
    'MegaMek ClubAttackAction.getDamageFor applies constant 9 flail damage and constant 8 wrecking ball damage, and excludes both from active TSM doubling',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/ClubAttackAction.java#L112-L205',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_FLAIL_WRECKING_TO_HIT = {
  kind: 'megamek-source',
  citation:
    'MegaMek ClubAttackAction.getHitModFor returns flail +0 and wrecking ball +1 physical weapon modifiers',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/ClubAttackAction.java#L227-L245',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_FLAIL_WRECKING_LEGALITY = {
  kind: 'megamek-source',
  citation:
    'MegaMek ClubAttackAction.toHit lets flail and wrecking ball attacks avoid hand-actuator requirements, rejects flails on quads, and allows wrecking balls on quads',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/ClubAttackAction.java#L300-L520',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_TALON_KICK_DAMAGE = {
  kind: 'megamek-source',
  citation:
    'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/KickAttackAction.java#L95-L122',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_TALON_DFA_DAMAGE = {
  kind: 'megamek-source',
  citation:
    'MegaMek DfaAttackAction.getDamageFor multiplies DFA target damage by 1.5 when hasTalons is true, and hasTalons requires a working talon plus foot actuator on a qualifying leg',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L95-L104',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_TALON_DFA_LEG_GATE = {
  kind: 'megamek-source',
  citation:
    'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on biped legs, with a separate non-biped path',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_CLAW_PUNCH_DAMAGE = {
  kind: 'megamek-source',
  citation:
    'MegaMek PunchAttackAction.getDamageFor uses ceil(weight / 7) when the punching arm has working claws',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/PunchAttackAction.java#L390-L405',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_CLAW_PUNCH_TO_HIT = {
  kind: 'megamek-source',
  citation:
    'MegaMek PunchAttackAction.toHit adds the claw punch modifier and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/PunchAttackAction.java#L309-L333',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_CLAW_EQUIPMENT_GATE = {
  kind: 'megamek-source',
  citation:
    'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L6146-L6165',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_ARTEMIS_CLUSTER_MODIFIERS = {
  kind: 'megamek-source',
  citation:
    'MegaMek MissileWeaponHandler applies Artemis IV +2, prototype Artemis IV +1, and Artemis V +3 cluster modifiers while suppressing ECM and stealth',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L144-L188',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_LRM_ARTEMIS_INDIRECT_GUARD = {
  kind: 'megamek-source',
  citation:
    'MegaMek LRMHandler skips Artemis cluster modifiers when the weapon mode is Indirect and includes prototype Artemis IV in the same modifier chain',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/lrm/LRMHandler.java#L159-L207',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_PROTOTYPE_ARTEMIS_FCS = {
  kind: 'megamek-source',
  citation:
    'MegaMek MiscType.createISProtoArtemis defines Prototype Artemis IV FCS with F_ARTEMIS_PROTO',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L6276-L6295',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_SECONDARY_TARGET_MODIFIERS = {
  kind: 'megamek-source',
  citation:
    'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2494-L2615',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MULTI_TASKER_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Multi-Tasker SPA id as multi_tasker',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L192-L200',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MULTI_TASKER_SOURCE_REFS = [
  MEGAMEK_325B_SECONDARY_TARGET_MODIFIERS,
  MEGAMEK_325B_MULTI_TASKER_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_JUMP_ATTACKER_MOVEMENT = {
  kind: 'megamek-source',
  citation:
    'MegaMek Compute.getAttackerMovementModifier applies +1 for Jumping Jack, +2 for Hopping Jack, and +3 for plain jump movement',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2670-L2677',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_JUMP_ATTACKER_OPTIONS = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Hopping Jack and Jumping Jack SPA ids as hopping_jack and jumping_jack',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L176-L178',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_JUMP_ATTACKER_SOURCE_REFS = [
  MEGAMEK_325B_JUMP_ATTACKER_MOVEMENT,
  MEGAMEK_325B_JUMP_ATTACKER_OPTIONS,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_FROGMAN_PHYSICAL_TO_HIT = {
  kind: 'megamek-source',
  citation:
    'MegaMek Compute.modifyPhysicalBTHForAdvantages applies -1 Frogman for Mek or ProtoMek attackers in water deeper than level 1',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2748-L2751',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_FROGMAN_WATER_PSR = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8324-L8352',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_FROGMAN_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Terrain Master: Frogman SPA id as tm_frogman',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_FROGMAN_SOURCE_REFS = [
  MEGAMEK_325B_FROGMAN_PHYSICAL_TO_HIT,
  MEGAMEK_325B_FROGMAN_WATER_PSR,
  MEGAMEK_325B_FROGMAN_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_TO_HIT = {
  kind: 'megamek-source',
  citation:
    'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L282-L293',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_TERRAIN_MASTER_OPTIONS = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast SPA ids as tm_forest_ranger and tm_swamp_beast',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_SOURCE_REFS = [
  MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_TO_HIT,
  MEGAMEK_325B_TERRAIN_MASTER_OPTIONS,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_SWAMP_BEAST_BOG_DOWN_PSR = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8263-L8288',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_SWAMP_BEAST_SOURCE_REFS = [
  MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_TO_HIT,
  MEGAMEK_325B_SWAMP_BEAST_BOG_DOWN_PSR,
  MEGAMEK_325B_TERRAIN_MASTER_OPTIONS,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_MOUNTAINEER_RUBBLE_PSR = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8240-L8256',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MOUNTAINEER_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines Terrain Master: Mountaineer as tm_mountaineer.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MOUNTAINEER_SOURCE_REFS = [
  MEGAMEK_325B_MOUNTAINEER_RUBBLE_PSR,
  MEGAMEK_325B_MOUNTAINEER_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_DODGE_MANEUVER_TO_HIT = {
  kind: 'megamek-source',
  citation:
    'MegaMek Compute applies +2 when the target is a Mek with Dodge Maneuver and target.dodging is true',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2755-L2761',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_DODGE_MANEUVER_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Dodge Maneuver SPA id as dodge_maneuver',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L169-L177',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_DODGE_MANEUVER_SOURCE_REFS = [
  MEGAMEK_325B_DODGE_MANEUVER_TO_HIT,
  MEGAMEK_325B_DODGE_MANEUVER_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_MANEUVERING_ACE_SKID = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8638-L8660',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MANEUVERING_ACE_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Maneuvering Ace SPA id as maneuvering_ace.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MANEUVERING_ACE_SOURCE_REFS = [
  MEGAMEK_325B_MANEUVERING_ACE_SKID,
  MEGAMEK_325B_MANEUVERING_ACE_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_325B_ANIMAL_MIMICRY_QUAD_PSR = {
  kind: 'megamek-source',
  citation:
    'MegaMek QuadMek.addEntityBonuses applies -1 Animal Mimicry to quad Mek piloting rolls.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/QuadMek.java#L460-L469',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_ANIMAL_MIMICRY_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Animal Mimicry SPA id as animal_mimic.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L171-L178',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_ANIMAL_MIMICRY_SOURCE_REFS = [
  MEGAMEK_325B_ANIMAL_MIMICRY_QUAD_PSR,
  MEGAMEK_325B_ANIMAL_MIMICRY_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

export const SPA_COMBAT_SUPPORT = {
  'weapon-specialist': integrated(
    'weapon-specialist',
    'calculateWeaponSpecialistModifier + calculateAttackerSPAModifiers',
  ),
  'gunnery-specialist': integrated(
    'gunnery-specialist',
    'calculateGunnerySpecialistModifier + calculateAttackerSPAModifiers',
  ),
  marksman: helperOnly(
    'marksman',
    'getSharpshooterBonus plus calculateCalledShotModifier reduce called-shot penalties for the local Marksman helper',
    'MegaMek source cross-check found TacOps called shots but not Marksman as a called-shot SPA',
  ),
  sniper: integrated('sniper', 'calculateSniperModifier + calculateToHit'),
  'blood-stalker': integrated(
    'blood-stalker',
    'calculateBloodStalkerModifier + calculateAttackerSPAModifiers',
  ),
  'cluster-hitter': integrated(
    'cluster-hitter',
    'getClusterHitterBonus plus runAttackPhase clusterContext and resolveSpecialProjectileHit missile cluster table shift',
  ),
  'multi-tasker': integrated(
    'multi-tasker',
    'Source-backed calculateMultiTaskerModifier + calculateToHit secondary-target penalty reduction',
    MEGAMEK_325B_MULTI_TASKER_SOURCE_REFS,
  ),
  'range-master': integrated(
    'range-master',
    'calculateRangeMasterModifier + calculateAttackerSPAModifiers',
  ),
  sandblaster: helperOnly(
    'sandblaster',
    'Source-backed getSandblasterClusterModifier plus resolveSpecialProjectileHit apply +4/+3/+2 range-based cluster-table modifiers for designated LB-X and missile cluster-table paths',
    'Rate-of-fire UAC/RAC/rapid-fire AC Sandblaster resolution and full MegaMek eligible-weapon hydration are not wired',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'oblique-attacker': integrated(
    'oblique-attacker',
    'getObliqueAttackerBonus plus resolveIndirectFire attackerPilotSpas reduces runner and interactive indirect-fire penalties',
  ),
  forward_observer: integrated(
    'forward_observer',
    'computeIndirectFireContext hydrates spotter abilities into resolveIndirectFire, cancels walked-spotter penalties, and emits IndirectFireForwardObserver audit events',
  ),
  sharpshooter: helperOnly(
    'sharpshooter',
    'getSharpshooterBonus plus calculateCalledShotModifier preserve the local legacy Sharpshooter alias for called-shot penalty reduction',
    'Sharpshooter is not a canonical SPA id, and MegaMek keeps the Sharpshooter constant commented out',
  ),
  'jumping-jack': integrated(
    'jumping-jack',
    'Source-backed calculateJumpingJackModifier + calculateToHit reduce the attacker jump movement penalty from +3 to +1',
    MEGAMEK_325B_JUMP_ATTACKER_SOURCE_REFS,
  ),
  'hopping-jack': integrated(
    'hopping-jack',
    'Source-backed calculateJumpingJackModifier + calculateToHit reduce the attacker jump movement penalty from +3 to +2',
    MEGAMEK_325B_JUMP_ATTACKER_SOURCE_REFS,
  ),
  'melee-specialist': integrated(
    'melee-specialist',
    'calculateMeleeSpecialistModifier plus physical attack input pilotAbilities reduces helper, runner, and interactive physical to-hit TNs',
  ),
  'melee-master': integrated(
    'melee-master',
    'getMeleeMasterDamageBonus plus physical attack input pilotAbilities increases helper and runner physical target damage',
  ),
  'maneuvering-ace': helperOnly(
    'maneuvering-ace',
    'getManeuveringAceSkidModifier plus resolveAllPSRs apply source-backed Maneuvering Ace -1 to Skidding PSRs',
    'Terrain-specific Maneuvering Ace PSR modifiers beyond skidding are not wired',
    MEGAMEK_325B_MANEUVERING_ACE_SOURCE_REFS,
  ),
  'terrain-master': unsupported(
    'terrain-master',
    'Generic Terrain Master movement behavior and variants beyond Frogman/Mountaineer/Forest Ranger/Swamp Beast are not wired; source-backed Frogman physical to-hit relief, Frogman water-entry PSR relief, Mountaineer rubble-entry PSR relief, and Forest Ranger/Swamp Beast defensive to-hit variants are tracked separately as tm_frogman, tm_mountaineer, tm_forest_ranger, and tm_swamp_beast, while Swamp Beast bog-down relief remains a source-backed stuck-state gap',
  ),
  tm_frogman: integrated(
    'tm_frogman',
    'Source-backed calculateFrogmanPhysicalToHitModifier plus physical to-hit helper, runner, and interactive physical resolution apply -1 in depth-2+ attacker water; calculatePSRModifiers applies water-entry PSR relief for depth-2+ Mek/ProtoMek movement PSRs',
    MEGAMEK_325B_FROGMAN_SOURCE_REFS,
  ),
  tm_forest_ranger: integrated(
    'tm_forest_ranger',
    'Source-backed calculateTerrainMasterDefensiveToHitModifier plus calculateToHit and runner target terrain hydration apply +1 to-hit against walking targets in woods',
    MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_SOURCE_REFS,
  ),
  tm_mountaineer: helperOnly(
    'tm_mountaineer',
    'Source-backed getMountaineerRubblePSRModifier plus calculatePSRModifiers apply Mountaineer rubble-entry relief as -1 to entering-rubble PSR target numbers',
    'Terrain Master: Mountaineer movement-cost and elevation movement effects are not wired',
    MEGAMEK_325B_MOUNTAINEER_SOURCE_REFS,
  ),
  tm_swamp_beast: integrated(
    'tm_swamp_beast',
    'Source-backed calculateTerrainMasterDefensiveToHitModifier plus calculateToHit and runner target terrain hydration apply +1 to-hit against running targets in mud or swamp; source-backed bog-down relief is tracked under the PSR and terrain stuck-state gap rows',
    MEGAMEK_325B_SWAMP_BEAST_SOURCE_REFS,
  ),
  acrobat: unsupported('acrobat', 'DFA PSR modifier is not wired'),
  'cross-country': unsupported(
    'cross-country',
    'MegaMek Cross-Country is a combat-vehicle terrain movement-cost/passability modifier; no source-backed BattleMech terrain PSR modifier is represented in the BattleMech combat matrix',
    MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  ),
  'dodge-maneuver': integrated(
    'dodge-maneuver',
    'Source-backed calculateDodgeManeuverModifier + calculateToHit applies +2 only for explicit dodging Mek targets',
    MEGAMEK_325B_DODGE_MANEUVER_SOURCE_REFS,
  ),
  evasive: unsupported('evasive', 'TMM bonus is not wired'),
  'natural-grace': unsupported(
    'natural-grace',
    'Fall PSR modifier is not wired',
  ),
  'iron-man': integrated(
    'iron-man',
    'getConsciousnessCheckModifier plus applyPilotDamage, runPSRPhase, resolvePendingPSRs, runHeatPhase, and resolveHeatPhase lower consciousness TNs',
  ),
  'pain-resistance': integrated(
    'pain-resistance',
    'getEffectiveWounds plus calculateToHit; getConsciousnessCheckModifier plus pilot damage, fall, and heat consciousness checks',
  ),
  edge: helperOnly(
    'edge',
    'createEdgeState/canUseEdge/useEdge',
    'No attack/PSR/crit resolver consumes Edge state',
  ),
  toughness: integrated(
    'toughness',
    'getConsciousnessCheckModifier plus applyPilotDamage, runPSRPhase, resolvePendingPSRs, runHeatPhase, and resolveHeatPhase lower consciousness TNs',
  ),
  'tactical-genius': integrated(
    'tactical-genius',
    'rollInitiative accepts a source-backed Tactical Genius reroll request, requires an active conscious unit with tactical_genius, replaces only that side raw 2d6 roll, and records original raw rolls separately',
    MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  ),
  'speed-demon': unsupported(
    'speed-demon',
    'Run-distance and heat tradeoff is not wired',
  ),
  'combat-intuition': unsupported(
    'combat-intuition',
    'Round-one initiative override is not wired',
  ),
  'hot-dog': integrated(
    'hot-dog',
    'getHotDogShutdownThresholdBonus plus runHeatPhase and resolveHeatPhase shift avoidable shutdown/startup TN thresholds from heat 14 to heat 17',
  ),
  'cool-under-fire': integrated(
    'cool-under-fire',
    'runHeatPhase and resolveHeatPhase apply getCoolUnderFireHeatReduction as capped generated-heat relief in the HeatDissipated breakdown',
  ),
  'some-like-it-hot': integrated(
    'some-like-it-hot',
    'calculateToHit consumes getSomeLikeItHotHeatPenaltyReduction so runner AttackDeclared heat modifiers are reduced by 1',
  ),
  'multi-target': unsupported(
    'multi-target',
    'Local Multi-Target is not the MegaMek source-backed SPA; source-backed secondary-target penalty reduction is Multi-Tasker/multi_tasker',
    MEGAMEK_325B_MULTI_TASKER_SOURCE_REFS,
  ),
  'iron-will': integrated(
    'iron-will',
    'getConsciousnessCheckModifier plus applyPilotDamage, runPSRPhase, resolvePendingPSRs, runHeatPhase, and resolveHeatPhase lower consciousness TNs through the Iron Man alias',
  ),
  'heavy-lifter': unsupported(
    'heavy-lifter',
    'MegaMek Heavy Lifter increases ground-object lift capacity by 1.5, but MekStation has no carry/throw-object physical combat action path',
    MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  ),
  'animal-mimicry': helperOnly(
    'animal-mimicry',
    'getAnimalMimicryPSRModifier plus resolveAllPSRs/stand-up PSR paths apply source-backed Animal Mimicry -1 to quad Mek PSRs',
    'Animal Mimicry terrain-designation movement effects and broader terrain specialization are not wired',
    MEGAMEK_325B_ANIMAL_MIMICRY_SOURCE_REFS,
  ),
  antagonizer: unsupported(
    'antagonizer',
    'Target-priority enforcement is not wired',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const QUIRK_COMBAT_SUPPORT = {
  improved_targeting_short: integrated(
    'improved_targeting_short',
    'calculateTargetingQuirkModifier + calculateToHit',
  ),
  improved_targeting_medium: integrated(
    'improved_targeting_medium',
    'calculateTargetingQuirkModifier + calculateToHit',
  ),
  improved_targeting_long: integrated(
    'improved_targeting_long',
    'calculateTargetingQuirkModifier + calculateToHit',
  ),
  poor_targeting_short: integrated(
    'poor_targeting_short',
    'calculateTargetingQuirkModifier + calculateToHit',
  ),
  poor_targeting_medium: integrated(
    'poor_targeting_medium',
    'calculateTargetingQuirkModifier + calculateToHit',
  ),
  poor_targeting_long: integrated(
    'poor_targeting_long',
    'calculateTargetingQuirkModifier + calculateToHit',
  ),
  distracting: integrated(
    'distracting',
    'calculateDistractingModifier + calculateToHit',
  ),
  low_profile: integrated(
    'low_profile',
    'calculateLowProfileModifier + calculateToHit',
  ),
  easy_to_pilot: integrated(
    'easy_to_pilot',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply terrain-only PSR target-number relief',
  ),
  stable: integrated(
    'stable',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply all-PSR target-number relief',
  ),
  hard_to_pilot: integrated(
    'hard_to_pilot',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply all-PSR target-number penalties',
  ),
  unbalanced: integrated(
    'unbalanced',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply terrain-only PSR target-number penalties',
  ),
  cramped_cockpit: integrated(
    'cramped_cockpit',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply all-PSR target-number penalties',
  ),
  battle_fists_la: integrated(
    'battle_fists_la',
    'getBattleFistDamageBonus plus physical attack input unitQuirks increases matching-arm punch damage',
  ),
  battle_fists_ra: integrated(
    'battle_fists_ra',
    'getBattleFistDamageBonus plus physical attack input unitQuirks increases matching-arm punch damage in runner resolution',
  ),
  no_arms: integrated(
    'no_arms',
    'hasNoArms plus physical attack input unitQuirks rejects punch and arm-mounted melee attacks',
  ),
  low_arms: integrated(
    'low_arms',
    'isLowArmsRestricted plus physical attack elevationDifference rejects elevated punch and arm-mounted melee attacks',
  ),
  command_mech: helperOnly(
    'command_mech',
    'calculateInitiativeQuirkModifier plus rollInitiative apply the source-backed +1 force initiative bonus from active conscious units alongside explicit HQ/command equipment initiative fields',
    'Automatic command-console/HQ initiative equipment hydration is not wired',
    MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  ),
  battle_computer: helperOnly(
    'battle_computer',
    'calculateInitiativeQuirkModifier plus rollInitiative apply the source-backed +2 force initiative bonus from active conscious units, keep it non-cumulative with Command Mech/HQ, and stack explicit command equipment bonus separately',
    'Automatic command-console/HQ initiative equipment hydration is not wired',
    MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  ),
  sensor_ghosts: integrated(
    'sensor_ghosts',
    'calculateSensorGhostsModifier + calculateToHit',
  ),
  multi_trac: integrated(
    'multi_trac',
    'calculateMultiTracModifier + calculateToHit',
  ),
  rugged_1: helperOnly(
    'rugged_1',
    'getRuggedMaintenanceMultiplier models the MekHQ maintenance-cycle multiplier',
    'Rugged is a campaign maintenance quirk, not a combat critical-hit prevention rule',
  ),
  rugged_2: helperOnly(
    'rugged_2',
    'getRuggedMaintenanceMultiplier models the MekHQ maintenance-cycle multiplier',
    'Rugged is a campaign maintenance quirk, not a combat critical-hit prevention rule',
  ),
  protected_actuators: helperOnly(
    'protected_actuators',
    'getAntiMekActuatorTargetModifier exposes the anti-Mek Leg/Swarm target-number modifier',
    'Infantry and battle-armor anti-Mek Leg/Swarm attack paths do not consume actuator quirks',
  ),
  exposed_actuators: helperOnly(
    'exposed_actuators',
    'getAntiMekActuatorTargetModifier exposes the anti-Mek Leg/Swarm target-number modifier',
    'Infantry and battle-armor anti-Mek Leg/Swarm attack paths do not consume actuator quirks',
  ),
  accurate: integrated(
    'accurate',
    'buildWeaponAttackAttackerToHitState hydrates weaponQuirks, runAttackPhase passes the firing weapon id into calculateToHit, and calculateAttackerQuirkModifiers applies calculateAccurateWeaponModifier',
  ),
  inaccurate: integrated(
    'inaccurate',
    'buildWeaponAttackAttackerToHitState hydrates weaponQuirks, runAttackPhase passes the firing weapon id into calculateToHit, and calculateAttackerQuirkModifiers applies calculateInaccurateWeaponModifier',
  ),
  stable_weapon: integrated(
    'stable_weapon',
    'buildWeaponAttackAttackerToHitState hydrates weaponQuirks, runAttackPhase passes the firing weapon id into calculateToHit, and calculateAttackerQuirkModifiers applies calculateStableWeaponModifier',
  ),
  improved_cooling: integrated(
    'improved_cooling',
    'runHeatPhase and resolveHeatPhase consume getWeaponCoolingHeatModifier while summing fired weapon heat',
  ),
  poor_cooling: integrated(
    'poor_cooling',
    'runHeatPhase and resolveHeatPhase consume getWeaponCoolingHeatModifier while summing fired weapon heat',
  ),
  no_cooling: integrated(
    'no_cooling',
    'runHeatPhase and resolveHeatPhase consume getWeaponCoolingHeatModifier while summing fired weapon heat',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT = {
  'ultra-ac': integrated(
    'ultra-ac',
    'UnitHydration.buildCatalogFiringModes + expandSelectedModeIntoShots + shouldJamOnNaturalTwo + markWeaponJammed + AIWeaponModeSelector',
  ),
  'rotary-ac': integrated(
    'rotary-ac',
    'UnitHydration.buildCatalogFiringModes + expandSelectedModeIntoShots + shouldJamOnNaturalTwo + markWeaponJammed + AIWeaponModeSelector',
  ),
  'lb-x-ac': integrated(
    'lb-x-ac',
    'UnitHydration.buildCatalogFiringModes + selectedModeToHitModifier + resolveClusterModeHit + weaponAttackEvents LB-X cluster coverage',
  ),
  'streak-srm': integrated(
    'streak-srm',
    'shouldSpendAmmoAndHeatOnMiss + resolveSpecialProjectileHit rack-size derivation',
  ),
  mml: integrated(
    'mml',
    'resolveCatalogDamage handles variable 1-2/missile descriptors, UnitHydration exposes SRM/LRM modes, and selected modes consume distinct SRM/LRM ammo bins',
  ),
  narc: helperOnly(
    'narc',
    'isNarc + getNarcBonus + runner NARC hits attach narcedBy + runner iNarc selected-ammo hits attach Homing/ECM/Haywire/Nemesis iNarcPods + DesignatorMarkerApplied replay + indirect-fire NARC/iNARC basis helpers consume canonical marker state + runner direct NARC-compatible missile cluster, iNarc Homing to-hit, iNarc Haywire to-hit, iNarc ECM attacker flight-path Artemis suppression, iNarc ECM C3 disruption, explicit runner C3 range-bracket math, and iNarc Nemesis redirect consume marker state',
    'Remaining iNarc ECM sensor effects and automatic C3 network assembly from hydrated equipment are not wired into runner combat resolution',
  ),
  ams: helperOnly(
    'ams',
    'isAMS + resolveAMSInterception applies the MegaMek/TW -4 cluster-table modifier, resolveSingleMissileAMSInterception handles NARC/Thunderbolt-style single missiles, consumes defender AMS ammo, emits AMSInterception events, marks ammo-fed or Laser AMS as fired for heat accounting, and handles Streak as cluster-roll 11',
    'AMS defender choice, arc enforcement, and optional multi-use rules remain unverified',
  ),
  tag: integrated(
    'tag',
    'isTAG + generic Attack game/wire intent support + runner TAG hits attach tagDesignated and emit DesignatorMarkerApplied + replay reducer reapplies tagDesignated + turn lifecycle clears tagDesignated + runner semi-guided LRM cluster modifiers consume tagged targets + isTargetTAGDesignated + semi-guided LRM indirect-fire helpers',
  ),
  artemis: helperOnly(
    'artemis',
    'UnitHydration approximates source-backed Artemis IV/prototype IV/V flag discovery from critical-slot FCS plus Artemis-capable ammo; runner missile cluster resolution consumes those flags for direct fire, indirect-fire suppression, ECM suppression, active-probe ECM countering, and active attacker-stealth suppression from runner electronic-warfare state',
    'Exact multi-launcher FCS link allocation, Nova CEWS networking, and FCS/ECM/probe/stealth mode or damage lifecycle are not fully represented in runner missile resolution',
    [
      MEGAMEK_325B_ARTEMIS_CLUSTER_MODIFIERS,
      MEGAMEK_325B_LRM_ARTEMIS_INDIRECT_GUARD,
      MEGAMEK_325B_PROTOTYPE_ARTEMIS_FCS,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PHYSICAL_WEAPON_COMBAT_SUPPORT = {
  hatchet: integrated(
    'hatchet',
    'source-backed calculateHatchetDamage + -1 hatchet to-hit modifier',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  sword: integrated(
    'sword',
    'source-backed calculateSwordDamage + -2 sword to-hit modifier',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  mace: integrated(
    'mace',
    'source-backed calculateMaceDamage + +1 mace to-hit modifier',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  lance: integrated(
    'lance',
    'source-backed calculateLanceDamage + +1 lance to-hit modifier',
    [
      BMM_ERRATA_701_LANCE_TO_HIT,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  'retractable-blade': integrated(
    'retractable-blade',
    'source-backed calculateRetractableBladeDamage + -2 retractable blade to-hit modifier plus optional extended-mode legality gate',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
      MEGAMEK_6CA1867_RETRACTABLE_BLADE_MODE_GATE,
    ],
  ),
  talons: helperOnly(
    'talons',
    'source-backed kick and DFA damage helpers apply the +50% talon modifier from explicit state or UnitHydration leg critical-slot state',
    'Destroyed/missing/breached talon equipment lifecycle and non-biped talon arm-location behavior are not modeled',
    [
      MEGAMEK_325B_TALON_KICK_DAMAGE,
      MEGAMEK_325B_TALON_DFA_DAMAGE,
      MEGAMEK_325B_TALON_DFA_LEG_GATE,
    ],
  ),
  claws: helperOnly(
    'claws',
    'source-backed punch damage/to-hit helpers apply claw modifiers from explicit state or UnitHydration arm critical-slot state without exposing claws as a selectable attack type',
    'Destroyed/missing/breached claw equipment lifecycle, the PLAYTEST_3 no-modifier option, and claw club-with-hand interactions are not modeled',
    [
      MEGAMEK_325B_CLAW_PUNCH_DAMAGE,
      MEGAMEK_325B_CLAW_PUNCH_TO_HIT,
      MEGAMEK_325B_CLAW_EQUIPMENT_GATE,
    ],
  ),
  flail: integrated(
    'flail',
    'source-backed calculateFlailDamage + 0 flail to-hit modifier plus no-hand and quad legality gates',
    [
      MEGAMEK_325B_FLAIL_WRECKING_DAMAGE,
      MEGAMEK_325B_FLAIL_WRECKING_TO_HIT,
      MEGAMEK_325B_FLAIL_WRECKING_LEGALITY,
    ],
  ),
  'wrecking-ball': integrated(
    'wrecking-ball',
    'source-backed calculateWreckingBallDamage + +1 wrecking ball to-hit modifier plus torso-mounted arm/quad legality gates',
    [
      MEGAMEK_325B_FLAIL_WRECKING_DAMAGE,
      MEGAMEK_325B_FLAIL_WRECKING_TO_HIT,
      MEGAMEK_325B_FLAIL_WRECKING_LEGALITY,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
