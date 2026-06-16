/**
 * Explicit support matrix for combat-active pilot SPAs and mech quirks.
 *
 * The catalog validation suite uses this as the line between implemented
 * behavior and known feature gaps. Adding a combat-active SPA or quirk without
 * updating this file should fail fast instead of letting a broad
 * known-limitation filter hide the missing rule.
 */

import type {
  CombatFeatureSourceKind,
  ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

import {
  MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS,
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
  MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
  MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
} from './CombatConsciousnessSourceRefs';
import {
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
} from './CombatHeavyLifterSourceRefs';
import {
  MEGAMEK_BLOOD_STALKER_SOURCE_REFS,
  MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
  MEGAMEK_GUNNERY_SPECIALIST_SOURCE_REFS,
  MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
  MEGAMEK_RANGE_MASTER_SOURCE_REFS,
  MEGAMEK_SNIPER_SOURCE_REFS,
  MEGAMEK_TERRAIN_MASTER_GAP_SOURCE_REFS,
  MEGAMEK_WEAPON_SPECIALIST_SOURCE_REFS,
  MEKSTATION_MARKSMAN_CALLED_SHOT_SOURCE_REFS,
  MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
  MEKSTATION_SHARPSHOOTER_CALLED_SHOT_SOURCE_REFS,
} from './CombatLegacyPilotAbilitySourceRefs';
import {
  MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  MEGAMEK_BATTLE_FISTS_SOURCE_REFS,
  MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
  MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
  MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
  MEGAMEK_LOW_ARMS_GAP_SOURCE_REFS,
  MEGAMEK_NO_ARMS_SOURCE_REFS,
  MEGAMEK_STABLE_PSR_SOURCE_REFS,
  MEGAMEK_UNBALANCED_SOURCE_REFS,
  MEKHQ_RUGGED_SOURCE_REFS,
} from './CombatLegacyQuirkSourceRefs';
import {
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
  MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
  MEGAMEK_MULTI_TRAC_SOURCE_REFS,
  MEKSTATION_DISTRACTING_TO_HIT_DEVIATION_SOURCE_REFS,
  MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  MEKSTATION_LOW_PROFILE_TO_HIT_DEVIATION_SOURCE_REFS,
  MEGAMEK_SANDBLASTER_SOURCE_REFS,
  MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
  MEGAMEK_SHAKY_STICK_SOURCE_REFS,
  MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';
import {
  MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
  MEGAMEK_AMS_SOURCE_REFS,
  MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  MEGAMEK_ECM_SUITE_SOURCE_REFS,
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_NARC_FAMILY_SOURCE_REFS,
  MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  MEGAMEK_PLASMA_CANNON_SOURCE_REFS,
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_TAG_FAMILY_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatSpecialWeaponSourceRefs';

export type {
  CombatFeatureSourceKind,
  ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

export type CombatFeatureSupportLevel =
  | 'integrated'
  | 'helper-only'
  | 'unsupported'
  | 'out-of-scope';

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

function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'out-of-scope', evidence, gap, sourceRefs }
    : { id, level: 'out-of-scope', evidence, gap };
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
    'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
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
    'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on biped legs plus non-biped leg and arm-location paths',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MOUNTED_READY_DAMAGED_GATE = {
  kind: 'megamek-source',
  citation:
    'MegaMek Mounted.isReady excludes destroyed, missing, and breached/useless mounts from working equipment checks',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/Mounted.java#L590-L632',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_DESTROY_LOCATION_MISSING_MOUNT_GATE = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L11864-L11939',
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
    'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
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

const MEGAMEK_325B_MOUNTAINEER_TERRAIN_MOVEMENT_COST = {
  kind: 'megamek-source',
  citation:
    'MegaMek Terrain.movementCost applies -1 MP for Mountaineer in rough/rubble movement-cost branches.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Terrain.java#L404-L584',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MOUNTAINEER_ELEVATION_MOVEMENT_COST = {
  kind: 'megamek-source',
  citation:
    'MegaMek MoveStep applies Mountaineer as one MP less for upward elevation changes.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L2828-L2841',
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
  MEGAMEK_325B_MOUNTAINEER_TERRAIN_MOVEMENT_COST,
  MEGAMEK_325B_MOUNTAINEER_ELEVATION_MOVEMENT_COST,
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

const MEGAMEK_325B_MANEUVERING_ACE_LATERAL_SHIFT = {
  kind: 'megamek-source',
  citation:
    'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MovePath.java#L252-L266',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MANEUVERING_ACE_QUAD_SIDE_STEP_COST = {
  kind: 'megamek-source',
  citation:
    'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MANEUVERING_ACE_OUT_OF_CONTROL = {
  kind: 'megamek-source',
  citation:
    'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16908-L16920',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MANEUVERING_ACE_OPTION = {
  kind: 'megamek-source',
  citation:
    'MegaMek OptionsConstants defines the source-backed Maneuvering Ace SPA id as maneuvering_ace.',
  url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180',
  sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
} satisfies ICombatFeatureSourceReference;

const MEKSTATION_MANEUVERING_ACE_LATERAL_SHIFT = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
  url: 'src/utils/gameplay/movement/validation.ts#L50',
  sourceVersion: 'MekStation working-tree',
} satisfies ICombatFeatureSourceReference;

const MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation createOutOfControlPSR plus runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
  url: 'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L111',
  sourceVersion: 'MekStation working-tree',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_325B_MANEUVERING_ACE_BATTLEMECH_SOURCE_REFS = [
  MEGAMEK_325B_MANEUVERING_ACE_SKID,
  MEGAMEK_325B_MANEUVERING_ACE_LATERAL_SHIFT,
  MEGAMEK_325B_MANEUVERING_ACE_QUAD_SIDE_STEP_COST,
  MEGAMEK_325B_MANEUVERING_ACE_OUT_OF_CONTROL,
  MEGAMEK_325B_MANEUVERING_ACE_OPTION,
  MEKSTATION_MANEUVERING_ACE_LATERAL_SHIFT,
  MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR,
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
    MEGAMEK_WEAPON_SPECIALIST_SOURCE_REFS,
  ),
  'gunnery-specialist': integrated(
    'gunnery-specialist',
    'calculateGunnerySpecialistModifier + calculateAttackerSPAModifiers',
    MEGAMEK_GUNNERY_SPECIALIST_SOURCE_REFS,
  ),
  marksman: outOfScope(
    'marksman',
    'getSharpshooterBonus plus calculateCalledShotModifier reduce called-shot penalties for the local Marksman helper',
    'Marksman is a local called-shot helper, not a source-backed official BattleMech combat SPA; source-backed BattleMech called shots use TacOps +3 penalties without this local reduction',
    MEKSTATION_MARKSMAN_CALLED_SHOT_SOURCE_REFS,
  ),
  sniper: integrated(
    'sniper',
    'calculateSniperModifier + calculateToHit',
    MEGAMEK_SNIPER_SOURCE_REFS,
  ),
  'blood-stalker': integrated(
    'blood-stalker',
    'calculateBloodStalkerModifier + calculateAttackerSPAModifiers',
    MEGAMEK_BLOOD_STALKER_SOURCE_REFS,
  ),
  'cluster-hitter': integrated(
    'cluster-hitter',
    'getClusterHitterBonus plus runAttackPhase clusterContext and resolveSpecialProjectileHit missile cluster table shift',
    MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  ),
  'multi-tasker': integrated(
    'multi-tasker',
    'Source-backed calculateMultiTaskerModifier + calculateToHit secondary-target penalty reduction',
    MEGAMEK_325B_MULTI_TASKER_SOURCE_REFS,
  ),
  'range-master': integrated(
    'range-master',
    'calculateRangeMasterModifier + calculateAttackerSPAModifiers',
    MEGAMEK_RANGE_MASTER_SOURCE_REFS,
  ),
  sandblaster: integrated(
    'sandblaster',
    'Source-backed getSandblasterClusterModifier, resolveSpecialProjectileHit, UnitHydration catalog authoring, and runner rate-of-fire expansion apply +4/+3/+2 range-based cluster-table modifiers for designated LB-X, missile cluster-table, selected UAC/RAC rate-of-fire paths, and official ordinary AC rapid-fire modes',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'oblique-attacker': integrated(
    'oblique-attacker',
    'getObliqueAttackerBonus plus resolveIndirectFire attackerPilotSpas reduces runner and interactive indirect-fire penalties',
    MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
  ),
  forward_observer: integrated(
    'forward_observer',
    'computeIndirectFireContext hydrates spotter abilities into resolveIndirectFire, cancels walked-spotter penalties, and emits IndirectFireForwardObserver audit events',
    MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
  ),
  sharpshooter: outOfScope(
    'sharpshooter',
    'getSharpshooterBonus plus calculateCalledShotModifier preserve the local legacy Sharpshooter alias for called-shot penalty reduction',
    'Sharpshooter is a local legacy called-shot helper alias, not a source-backed official BattleMech combat SPA; MegaMek keeps the Sharpshooter constant commented out and source-backed BattleMech called shots use TacOps +3 penalties',
    MEKSTATION_SHARPSHOOTER_CALLED_SHOT_SOURCE_REFS,
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
    'calculateMeleeSpecialistModifier and getMeleeSpecialistDamageBonus plus physical attack input pilotAbilities reduce helper, runner, and interactive physical to-hit TNs and add source-backed physical damage',
    MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  ),
  'melee-master': integrated(
    'melee-master',
    'getAllowedPhysicalAttackCount plus declarePhysicalAttack enforce the source-backed Melee Master two-physical-attacks allowance while getMeleeMasterDamageBonus preserves the no-flat-damage boundary',
    MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
  ),
  'maneuvering-ace': integrated(
    'maneuvering-ace',
    'getManeuveringAceSkidModifier plus resolveAllPSRs apply source-backed Maneuvering Ace -1 to BattleMech skidding PSRs, createOutOfControlPSR plus runPSRPhase apply source-backed Maneuvering Ace -1 to represented out-of-control pending PSRs, and validateMovement plus runMovementPhase validate source-backed BattleMech biped lateral shifts and QuadMek lateral-step MP relief',
    MEGAMEK_325B_MANEUVERING_ACE_BATTLEMECH_SOURCE_REFS,
  ),
  'terrain-master': outOfScope(
    'terrain-master',
    'MegaMek registers Terrain Master as source-backed variant ids rather than a generic terrain_master combat option; MekStation keeps terrain-master as a legacy local helper row',
    'The legacy generic terrain-master row is excluded from the official BattleMech blocker inventory; source-backed variants stay tracked separately as tm_frogman, tm_mountaineer, tm_forest_ranger, tm_swamp_beast, and canonical tm_nightwalker',
    MEGAMEK_TERRAIN_MASTER_GAP_SOURCE_REFS,
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
  tm_mountaineer: integrated(
    'tm_mountaineer',
    'Source-backed getMountaineerRubblePSRModifier plus calculatePSRModifiers apply Mountaineer rubble-entry relief as -1 to entering-rubble PSR target numbers; getHexMovementCost, validateMovement, pathfinding, reachable movement previews, runner movement, interactive movement, and P2P movement validation apply rough/rubble and upward-elevation MP relief from unit pilot abilities',
    MEGAMEK_325B_MOUNTAINEER_SOURCE_REFS,
  ),
  tm_swamp_beast: integrated(
    'tm_swamp_beast',
    'Source-backed calculateTerrainMasterDefensiveToHitModifier plus calculateToHit and runner target terrain hydration apply +1 to-hit against running targets in mud or swamp; calculatePSRModifiers applies Swamp Beast bog-down relief as -1 to swamp bog-down PSRs',
    MEGAMEK_325B_SWAMP_BEAST_SOURCE_REFS,
  ),
  acrobat: outOfScope(
    'acrobat',
    'MekStation local SPA catalog defines Acrobat as a DFA PSR helper, but the pinned MegaMek pilot option registry does not identify Acrobat as an official BattleMech combat SPA',
    'Local Acrobat behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority is identified',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'cross-country': outOfScope(
    'cross-country',
    'MegaMek Cross-Country is a combat-vehicle terrain movement-cost/passability modifier for the separate vehicle combat matrix',
    'Cross-Country is combat-vehicle movement/passability behavior, not a BattleMech terrain PSR modifier, and is excluded from BattleMech runner validation until vehicle movement/passability coverage consumes it',
    MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  ),
  'dodge-maneuver': integrated(
    'dodge-maneuver',
    'Source-backed calculateDodgeManeuverModifier + calculateToHit applies +2 only for explicit dodging Mek targets',
    MEGAMEK_325B_DODGE_MANEUVER_SOURCE_REFS,
  ),
  shaky_stick: integrated(
    'shaky_stick',
    'Source-backed calculateShakyStickModifier + calculateToHit applies +1 only for ground-to-air attacks when an airborne target is attacked by a non-airborne attacker',
    MEGAMEK_SHAKY_STICK_SOURCE_REFS,
  ),
  evasive: outOfScope(
    'evasive',
    'MekStation local SPA catalog defines Evasive as a target-movement-modifier helper, but the pinned MegaMek pilot option registry does not identify Evasive as an official BattleMech combat SPA',
    'Local Evasive behavior is excluded from the official BattleMech validation blocker inventory; source-backed evasion remains covered by the integrated optional TacOps Evade movement action row',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'natural-grace': outOfScope(
    'natural-grace',
    'MekStation local SPA catalog defines Natural Grace as a fall PSR helper, but the pinned MegaMek pilot option registry does not identify Natural Grace as an official BattleMech combat SPA',
    'Local Natural Grace behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority is identified',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'iron-man': integrated(
    'iron-man',
    'resolveBattleMechAmmoExplosionPilotDamage reduces ammunition-explosion pilot damage for source-backed Iron Man ids, while consciousness checks no longer apply Iron Man or Iron Will as target-number relief',
    [
      ...MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'pain-resistance': integrated(
    'pain-resistance',
    'resolveBattleMechAmmoExplosionPilotDamage reduces ammunition-explosion pilot damage, getConsciousnessCheckModifier applies source-backed Pain Resistance target-number relief, resolvePilotWakeUpCheck applies Pain Resistance wake-up relief during runner heat recovery, and ranged to-hit wound penalties remain unchanged',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  edge: integrated(
    'edge',
    'Source-backed Edge trigger ids, not the generic edge SPA alias by itself, are represented by deriveEdgePointCountFromPilotAbilities/createEdgeState/canUseEdge/useEdge generic helper state; UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state; represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS; hit-location resolution consumes edge_when_headhit and edge_when_tac, runPSRPhase consumes edge_when_masc_fails, resolvePilotConsciousnessCheck consumes edge_when_ko, and criticalHitResolution consumes edge_when_explosion for their proven BattleMech trigger paths',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  toughness: outOfScope(
    'toughness',
    'Legacy pilotAbilities.toughness ability strings are local alias data, not source-backed BattleMech SPA relief; force and skirmish preBattleSessionBuilder paths instead map explicit assigned-pilot rpgToughness/RPG Toughness snapshots into GameCreated pilotToughness seeds, and resolvePilotConsciousnessCheck, applyPilotDamage, runner pilot-damage phases, and interactive PSR/heat/physical/ammo-explosion paths consume explicit numeric pilotToughness state without treating legacy toughness ability strings as relief',
    'Legacy toughness ability aliases are excluded from the official BattleMech blocker inventory; automatic RPG Toughness game-option hydration and MUL crew toughness import remain future producer work, while explicit assigned-pilot rpgToughness/pilotToughness is tracked by pilotSkills.pilotModifierResolvers.rpg-toughness-consciousness-application',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'tactical-genius': integrated(
    'tactical-genius',
    'rollInitiative accepts a source-backed Tactical Genius reroll request, requires an active conscious unit with tactical_genius, replaces only that side raw 2d6 roll, and records original raw rolls separately',
    MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  ),
  'speed-demon': outOfScope(
    'speed-demon',
    'MekStation local SPA catalog defines Speed Demon as a run-distance and heat tradeoff helper, but the pinned MegaMek pilot option registry does not identify Speed Demon as an official BattleMech combat SPA',
    'Local Speed Demon behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority is identified',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'combat-intuition': outOfScope(
    'combat-intuition',
    'MekStation local SPA catalog defines Combat Intuition as a round-one initiative sequencing helper, but the pinned MegaMek pilot option registry does not identify Combat Intuition as an official BattleMech combat SPA',
    'Local Combat Intuition behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority is identified',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'hot-dog': integrated(
    'hot-dog',
    'getHotDogHeatTargetNumberModifier plus runHeatPhase and resolveHeatPhase apply source-backed -1 startup/shutdown, heat-induced ammo-explosion, opt-in MaxTech pilot heat-damage, and opt-in MaxTech critical-damage avoid-number relief while preserving default life-support heat damage thresholds',
    MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  ),
  'cool-under-fire': outOfScope(
    'cool-under-fire',
    'getCoolUnderFireHeatReduction exposes the local generated-heat helper without being consumed by BattleMech heat resolution',
    'No MegaMek source-backed Cool Under Fire ability id or generated-heat reduction path was found in commit 325b2504; keep this local helper behavior outside the official BattleMech validation blocker inventory until an authority is identified',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'some-like-it-hot': integrated(
    'some-like-it-hot',
    'calculateToHit consumes getSomeLikeItHotHeatPenaltyReduction so runner AttackDeclared heat modifiers are reduced by 1',
    MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  ),
  'multi-target': outOfScope(
    'multi-target',
    'MekStation local SPA catalog defines Multi-Target as a secondary-target penalty helper, but the pinned MegaMek pilot option registry identifies the official source-backed SPA as Multi-Tasker/multi_tasker instead',
    'Local Multi-Target behavior is excluded from the official BattleMech validation blocker inventory; source-backed secondary-target penalty reduction remains covered by Multi-Tasker/multi_tasker',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'iron-will': outOfScope(
    'iron-will',
    'MekStation local SPA catalog defines Iron Will as a legacy Iron Man-style alias, but the pinned MegaMek pilot option registry identifies source-backed Iron Man instead and no separate Iron Will combat option id',
    'Local Iron Will behavior is excluded from the official BattleMech validation blocker inventory; source-backed Iron Man remains covered as ammunition-explosion-only support, not generic consciousness relief',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
  'heavy-lifter': integrated(
    'heavy-lifter',
    'calculateGroundObjectLiftCapacity applies source-backed 5 percent per available hand lift capacity, canonical hvy_lifter and legacy heavy-lifter 1.5 multipliers, and the active TSM pickup multiplier',
    [
      ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
      ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
    ],
  ),
  'animal-mimicry': integrated(
    'animal-mimicry',
    'getAnimalMimicryPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs and stand-up PSR paths apply the source-backed Animal Mimicry -1 modifier to explicit quad Mek PSRs',
    MEGAMEK_325B_ANIMAL_MIMICRY_SOURCE_REFS,
  ),
  antagonizer: outOfScope(
    'antagonizer',
    'MekStation local SPA catalog defines Antagonizer as target-priority enforcement, but the pinned MegaMek pilot option registry does not identify Antagonizer as an official BattleMech combat SPA',
    'Local Antagonizer behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority is identified',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const QUIRK_COMBAT_SUPPORT = {
  improved_targeting_short: integrated(
    'improved_targeting_short',
    'calculateTargetingQuirkModifier plus calculateToHit apply MekStation local improved_targeting_short as the source-backed short-range Improved Targeting quirk family',
    [
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
    ],
  ),
  improved_targeting_medium: integrated(
    'improved_targeting_medium',
    'calculateTargetingQuirkModifier plus calculateToHit apply MekStation local improved_targeting_medium as the source-backed medium-range Improved Targeting quirk family',
    [
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
    ],
  ),
  improved_targeting_long: integrated(
    'improved_targeting_long',
    'calculateTargetingQuirkModifier plus calculateToHit apply MekStation local improved_targeting_long as the source-backed long-range Improved Targeting quirk family',
    [
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
    ],
  ),
  poor_targeting_short: integrated(
    'poor_targeting_short',
    'calculateTargetingQuirkModifier plus calculateToHit apply MekStation local poor_targeting_short as the source-backed short-range Poor Targeting quirk family',
    [
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
    ],
  ),
  poor_targeting_medium: integrated(
    'poor_targeting_medium',
    'calculateTargetingQuirkModifier plus calculateToHit apply MekStation local poor_targeting_medium as the source-backed medium-range Poor Targeting quirk family',
    [
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
    ],
  ),
  poor_targeting_long: integrated(
    'poor_targeting_long',
    'calculateTargetingQuirkModifier plus calculateToHit apply MekStation local poor_targeting_long as the source-backed long-range Poor Targeting quirk family',
    [
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
    ],
  ),
  distracting: integrated(
    'distracting',
    'calculateDistractingModifier is consumed by calculateAttackerQuirkModifiers/calculateToHit after runAttackPhase and declareAttack hydrate target unitQuirks, exposing the accepted MekStation local +1 target to-hit deviation in runner and interactive BattleMech attack declaration behavior',
    [
      ...MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
      ...MEKSTATION_DISTRACTING_TO_HIT_DEVIATION_SOURCE_REFS,
    ],
  ),
  low_profile: integrated(
    'low_profile',
    'isLowProfileGlancingBlow plus runner resolveWeaponHit and interactive resolveAttack implement the source-backed Low Profile glancing-blow path by halving normal single-hit weapon damage when a Low Profile target is hit on the final target number or target number plus one, applying the source-backed -2 glancing critical-hit-table modifier to represented damage/critical resolution, and consuming Low Profile as a -4 cluster-table modifier for represented missile and LB-X cluster paths; the legacy local +1 target to-hit helper remains documented as deviation coverage',
    [
      ...MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
      ...MEKSTATION_LOW_PROFILE_TO_HIT_DEVIATION_SOURCE_REFS,
    ],
  ),
  easy_to_pilot: integrated(
    'easy_to_pilot',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply piloting-skill-gated Easy Pilot relief to difficult-terrain PSRs and the source-backed 20+ phase-damage BattleMech PSR',
    MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
  ),
  stable: integrated(
    'stable',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply source-backed Stable target-number relief only to Kick/Push PSRs',
    MEGAMEK_STABLE_PSR_SOURCE_REFS,
  ),
  hard_to_pilot: integrated(
    'hard_to_pilot',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply all-PSR target-number penalties',
    MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
  ),
  unbalanced: integrated(
    'unbalanced',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply terrain-only PSR target-number penalties',
    MEGAMEK_UNBALANCED_SOURCE_REFS,
  ),
  cramped_cockpit: integrated(
    'cramped_cockpit',
    'calculatePilotingQuirkPSRModifier plus resolveAllPSRs/runPSRPhase/resolvePendingPSRs apply the all-PSR Cramped Cockpit target-number penalty and suppress it for pilots with Small Pilot',
    MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
  ),
  battle_fists_la: integrated(
    'battle_fists_la',
    'getBattleFistPunchToHitModifier plus physical attack input unitQuirks applies the source-backed matching-arm punch to-hit relief when the hand actuator is working',
    MEGAMEK_BATTLE_FISTS_SOURCE_REFS,
  ),
  battle_fists_ra: integrated(
    'battle_fists_ra',
    'getBattleFistPunchToHitModifier plus physical attack input unitQuirks applies the source-backed matching-arm punch to-hit relief when the hand actuator is working in helper and runner resolution',
    MEGAMEK_BATTLE_FISTS_SOURCE_REFS,
  ),
  no_arms: integrated(
    'no_arms',
    'hasNoArms plus physical attack input unitQuirks rejects punch, push, and arm-mounted melee attacks, and calculatePilotingQuirkPSRModifier plus runner/session stand-up paths apply the source-backed +2 stand-up PSR penalty',
    MEGAMEK_NO_ARMS_SOURCE_REFS,
  ),
  low_arms: outOfScope(
    'low_arms',
    'Pinned MegaMek source search finds only Low Arms option registration, and MekStation intentionally leaves the helper no-op instead of enforcing a local elevation rule',
    'Low Arms remains registry-only out-of-scope audit evidence until a pinned MegaMek or MekHQ authority exposes combat resolver semantics',
    MEGAMEK_LOW_ARMS_GAP_SOURCE_REFS,
  ),
  command_mech: integrated(
    'command_mech',
    'calculateInitiativeQuirkModifier plus rollInitiative apply the source-backed +1 force initiative bonus from active conscious units alongside explicit HQ/command equipment initiative fields and represented initiativeEquipment gates; broad producer hydration remains tracked under initiative-equipment-producer-hydration',
    MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  ),
  battle_computer: integrated(
    'battle_computer',
    'calculateInitiativeQuirkModifier plus rollInitiative apply the source-backed +2 force initiative bonus from active conscious units, keep it non-cumulative with Command Mech/HQ, and stack explicit/represented command equipment bonus separately; broad producer hydration remains tracked under initiative-equipment-producer-hydration',
    MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  ),
  sensor_ghosts: integrated(
    'sensor_ghosts',
    'calculateSensorGhostsModifier plus calculateToHit apply the source-backed +1 attacker to-hit penalty',
    MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
  ),
  multi_trac: integrated(
    'multi_trac',
    'calculateMultiTracModifier plus calculateToHit suppress the source-backed secondary-target penalty for Multi-Trac front-arc attacks',
    MEGAMEK_MULTI_TRAC_SOURCE_REFS,
  ),
  rugged_1: outOfScope(
    'rugged_1',
    'getRuggedMaintenanceMultiplier models the MekHQ maintenance-cycle multiplier',
    'Rugged is a MekHQ campaign maintenance quirk, not a BattleMech combat critical-hit prevention or runner modifier row',
    MEKHQ_RUGGED_SOURCE_REFS,
  ),
  rugged_2: outOfScope(
    'rugged_2',
    'getRuggedMaintenanceMultiplier models the MekHQ maintenance-cycle multiplier',
    'Rugged is a MekHQ campaign maintenance quirk, not a BattleMech combat critical-hit prevention or runner modifier row',
    MEKHQ_RUGGED_SOURCE_REFS,
  ),
  protected_actuators: outOfScope(
    'protected_actuators',
    'getAntiMekActuatorTargetModifier exposes the anti-Mek Leg/Swarm target-number modifier for the separate infantry and battle-armor combat matrix',
    'Anti-Mek Leg/Swarm attack paths are non-BattleMech attacker actions and are excluded from BattleMech runner validation until the battle-armor/infantry matrix consumes them',
    MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  ),
  exposed_actuators: outOfScope(
    'exposed_actuators',
    'getAntiMekActuatorTargetModifier exposes the anti-Mek Leg/Swarm target-number modifier for the separate infantry and battle-armor combat matrix',
    'Anti-Mek Leg/Swarm attack paths are non-BattleMech attacker actions and are excluded from BattleMech runner validation until the battle-armor/infantry matrix consumes them',
    MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  ),
  accurate: integrated(
    'accurate',
    'buildWeaponAttackAttackerToHitState hydrates weaponQuirks, runAttackPhase passes the firing weapon id into calculateToHit, and calculateAttackerQuirkModifiers applies calculateAccurateWeaponModifier',
    MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  ),
  inaccurate: integrated(
    'inaccurate',
    'buildWeaponAttackAttackerToHitState hydrates weaponQuirks, runAttackPhase passes the firing weapon id into calculateToHit, and calculateAttackerQuirkModifiers applies calculateInaccurateWeaponModifier',
    MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  ),
  stable_weapon: integrated(
    'stable_weapon',
    'buildWeaponAttackAttackerToHitState hydrates weaponQuirks, runAttackPhase passes the firing weapon id into calculateToHit, and calculateAttackerQuirkModifiers applies calculateStableWeaponModifier',
    MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  ),
  improved_cooling: integrated(
    'improved_cooling',
    'runHeatPhase and resolveHeatPhase consume getWeaponCoolingHeatModifier while summing fired weapon heat, applying source-backed Improved Cooling max(1, heat - 1) semantics',
    MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  ),
  poor_cooling: integrated(
    'poor_cooling',
    'runHeatPhase and resolveHeatPhase consume getWeaponCoolingHeatModifier while summing fired weapon heat, applying source-backed Poor Cooling +1 heat semantics',
    MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  ),
  no_cooling: integrated(
    'no_cooling',
    'runHeatPhase and resolveHeatPhase consume getWeaponCoolingHeatModifier while summing fired weapon heat, applying source-backed No Cooling +2 heat semantics',
    MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT = {
  'ultra-ac': integrated(
    'ultra-ac',
    'Exact official UAC ids feed UnitHydration.buildCatalogFiringModes + expandSelectedModeIntoShots + shouldJamOnNaturalTwo + markWeaponJammed + AIWeaponModeSelector',
    MEGAMEK_UAC_SOURCE_REFS,
  ),
  'rotary-ac': integrated(
    'rotary-ac',
    'Exact official RAC ids feed UnitHydration.buildCatalogFiringModes + expandSelectedModeIntoShots + shouldJamOnNaturalTwo + markWeaponJammed + AIWeaponModeSelector',
    MEGAMEK_RAC_SOURCE_REFS,
  ),
  'lb-x-ac': integrated(
    'lb-x-ac',
    'Exact official LB-X ids feed UnitHydration.buildCatalogFiringModes + selectedModeToHitModifier + resolveClusterModeHit + weaponAttackEvents LB-X cluster coverage',
    MEGAMEK_LBX_SOURCE_REFS,
  ),
  'streak-srm': integrated(
    'streak-srm',
    'Exact damage-capable official Streak SRM ids feed shouldSpendAmmoAndHeatOnMiss + resolveSpecialProjectileHit rack-size derivation while zero-damage Streak LRM/OS/prototype catalog rows stay pinned as data gaps',
    MEGAMEK_STREAK_SRM_SOURCE_REFS,
  ),
  mml: integrated(
    'mml',
    'Exact official MML ids feed resolveCatalogDamage variable 1-2/missile descriptors, UnitHydration SRM/LRM modes, and selected-mode SRM/LRM ammo-bin consumption',
    MEGAMEK_MML_SOURCE_REFS,
  ),
  narc: integrated(
    'narc',
    'isNarc + getNarcBonus + runner NARC hits attach narcedBy + runner iNarc selected-ammo hits attach Homing/ECM/Haywire/Nemesis iNarcPods + DesignatorMarkerApplied replay rehydrates typed iNarcPods + source-backed same-team/same-type iNarc pod target identity helpers and deduped carrier-level Brush-Off target options + indirect-fire NARC/iNARC basis helpers consume canonical marker state + runner direct NARC-compatible missile cluster, iNarc Homing to-hit, iNarc Haywire to-hit, iNarc ECM attacker flight-path Artemis suppression, iNarc ECM C3 disruption, iNarc ECM tactical sensor-contact bracket penalties, explicit C3 range-bracket math, iNarc Nemesis redirect, and carrier-attached iNarc pod-object target selection/removal lifecycle consume marker state; producer-side C3 authoring remains separated, and ambiguous C3 network assignment stays tracked under C3 network formation',
    [
      ...MEGAMEK_NARC_FAMILY_SOURCE_REFS,
      ...MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
    ],
  ),
  ams: integrated(
    'ams',
    'isAMS + runAttackPhase automatically selects an operational defender AMS for missile interception, resolveAMSInterception applies the MegaMek/TW -4 cluster-table modifier, filters mounted AMS by incoming firing arc when mountingArc or multi-arc mountingArcs state is available, UnitHydration maps canonical isRearMounted equipment into explicit Front/Rear mountingArc state and biped arm mounts into front+side mountingArcs coverage, resolveSingleMissileAMSInterception handles NARC/Thunderbolt-style single missiles, consumes defender AMS ammo, emits AMSInterception events, marks ammo-fed or Laser AMS as fired for heat accounting, excludes already-fired standard AMS from later same-phase automatic interception, allows explicit PLAYTEST_3 optional-rule or amsMultiUse mount state to reuse AMS while preserving ammo/heat/fired accounting, and handles Streak as cluster-roll 11',
    MEGAMEK_AMS_SOURCE_REFS,
  ),
  tag: integrated(
    'tag',
    'isTAG + generic Attack game/wire intent support + runner TAG hits attach tagDesignated and emit DesignatorMarkerApplied + replay reducer reapplies tagDesignated + turn lifecycle clears tagDesignated + source-backed semi-guided TAG target-movement cancellation and indirect-fire to-hit relief are wired through runner/session to-hit resolution while official cluster totals ignore the legacy non-parity helper',
    MEGAMEK_TAG_FAMILY_SOURCE_REFS,
  ),
  artemis: integrated(
    'artemis',
    'Represented BattleMech Artemis family support covers explicit linkedEquipment FCS allocation when present, unambiguous single-launcher or exact-cardinality same-location Artemis IV/prototype IV/V FCS critical-slot hydration fallback, explicit linked FCS critical damage guidance removal, unambiguous same-location Artemis FCS critical damage guidance removal fallback when no explicit link exists, Artemis IV/prototype IV/V cluster-table modifiers, indirect-fire suppression, target/flight-path ECM suppression, represented ECM mode consumption for Artemis suppression, active-probe ECM countering from source-backed BAP/CEWS equipment state, ECM-suite and active-probe critical replay lifecycle, bounded Nova CEWS C3-style range sharing, active attacker-stealth suppression from runner electronic-warfare state, and ECM-linked stealth damage lifecycle suppression removal; mixed-kind, mismatched-count, or otherwise ambiguous multi-launcher/FCS allocation authoring without explicit metadata remains explicit under the Artemis residual leaf row',
    [
      ...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
      ...MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
      ...MEGAMEK_ECM_SUITE_SOURCE_REFS,
      ...MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
      ...MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
      MEGAMEK_325B_ARTEMIS_CLUSTER_MODIFIERS,
      MEGAMEK_325B_LRM_ARTEMIS_INDIRECT_GUARD,
    ],
  ),
  'plasma-cannon': outOfScope(
    'plasma-cannon',
    'Exact official Clan Plasma Cannon id is pinned as a standard zero-damage plasma weapon; runner hits emit zero BattleMech damage, queue source-backed 2d6 external target heat into a Heat Phase pending bucket, apply capped external HeatGenerated target heat in Heat Phase through externalHeatThisTurn and turn-boundary reset lifecycle, halve heat through hydrated or explicit reflective/heat-dissipating armor state outside PLAYTEST_3, apply PLAYTEST_3 reflective full-heat and heat-dissipating zero-heat behavior, hydrate source-backed plasma ammo bins, and consume plasma ammunition despite MegaMek energy flags',
    'Remaining Plasma Cannon residual is limited to non-Mek special damage paths plus terrain/building special damage paths, outside the BattleMech runtime validation scope',
    MEGAMEK_PLASMA_CANNON_SOURCE_REFS,
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
  talons: integrated(
    'talons',
    'Official physical catalog entry Talons is represented as source-backed kick and DFA modifier equipment, not as a standalone runtime PhysicalAttackType; damage helpers apply the +50% talon modifier from explicit biped leg or quad/non-biped arm-location state, UnitHydration critical-slot state, destroyed/missing/breached equipment critical events, or destroyed location state, while remaining mounted-equipment lifecycle gaps are tracked under talon-equipment-lifecycle',
    [
      MEGAMEK_325B_TALON_KICK_DAMAGE,
      MEGAMEK_325B_TALON_DFA_DAMAGE,
      MEGAMEK_325B_TALON_DFA_LEG_GATE,
      MEGAMEK_325B_MOUNTED_READY_DAMAGED_GATE,
      MEGAMEK_325B_DESTROY_LOCATION_MISSING_MOUNT_GATE,
    ],
  ),
  claws: integrated(
    'claws',
    'Official physical catalog entry Claws is represented as source-backed punch modifier equipment, not as a standalone runtime PhysicalAttackType; punch damage/to-hit helpers apply claw modifiers from explicit state, UnitHydration arm critical-slot state, destroyed/missing/breached equipment critical events, or destroyed arm location state, PLAYTEST_3 removes only the claw punch to-hit penalty while preserving claw punch damage, and remaining mounted-equipment lifecycle gaps are tracked under claw-equipment-lifecycle',
    [
      MEGAMEK_325B_CLAW_PUNCH_DAMAGE,
      MEGAMEK_325B_CLAW_PUNCH_TO_HIT,
      MEGAMEK_325B_CLAW_EQUIPMENT_GATE,
      MEGAMEK_325B_DESTROY_LOCATION_MISSING_MOUNT_GATE,
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
