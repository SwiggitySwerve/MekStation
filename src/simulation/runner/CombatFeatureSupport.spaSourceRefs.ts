/**
 * Explicit support matrix for combat-active pilot SPAs and mech quirks.
 *
 * The catalog validation suite uses this as the line between implemented
 * behavior and known feature gaps. Adding a combat-active SPA or quirk without
 * updating this file should fail fast instead of letting a broad
 * known-limitation filter hide the missing rule.
 */

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
  combatFeatureSourceRef,
  type CombatFeatureSourceKind,
  ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
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
import { remapMekStationSourceRefs } from './CombatSourceRefAnchorRemap';
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

export const MEGAMEK_325B_SECONDARY_TARGET_MODIFIERS = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2494-L2615',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_MULTI_TASKER_OPTION = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines the source-backed Multi-Tasker SPA id as multi_tasker',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L192-L200',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_MULTI_TASKER_SOURCE_REFS = [
  MEGAMEK_325B_SECONDARY_TARGET_MODIFIERS,
  MEGAMEK_325B_MULTI_TASKER_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_JUMP_ATTACKER_MOVEMENT = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Compute.getAttackerMovementModifier applies +1 for Jumping Jack, +2 for Hopping Jack, and +3 for plain jump movement',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2670-L2677',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_JUMP_ATTACKER_OPTIONS = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines the source-backed Hopping Jack and Jumping Jack SPA ids as hopping_jack and jumping_jack',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L176-L178',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_JUMP_ATTACKER_SOURCE_REFS = [
  MEGAMEK_325B_JUMP_ATTACKER_MOVEMENT,
  MEGAMEK_325B_JUMP_ATTACKER_OPTIONS,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_FROGMAN_PHYSICAL_TO_HIT = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Compute.modifyPhysicalBTHForAdvantages applies -1 Frogman for Mek or ProtoMek attackers in water deeper than level 1',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2748-L2751',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_FROGMAN_WATER_PSR = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8324-L8352',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_FROGMAN_OPTION = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines the source-backed Terrain Master: Frogman SPA id as tm_frogman',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_FROGMAN_SOURCE_REFS = [
  MEGAMEK_325B_FROGMAN_PHYSICAL_TO_HIT,
  MEGAMEK_325B_FROGMAN_WATER_PSR,
  MEGAMEK_325B_FROGMAN_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_TO_HIT =
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L282-L293',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  );

export const MEGAMEK_325B_TERRAIN_MASTER_OPTIONS = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast SPA ids as tm_forest_ranger and tm_swamp_beast',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_SOURCE_REFS = [
  MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_TO_HIT,
  MEGAMEK_325B_TERRAIN_MASTER_OPTIONS,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_SWAMP_BEAST_BOG_DOWN_PSR = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8263-L8288',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_SWAMP_BEAST_SOURCE_REFS = [
  MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_TO_HIT,
  MEGAMEK_325B_SWAMP_BEAST_BOG_DOWN_PSR,
  MEGAMEK_325B_TERRAIN_MASTER_OPTIONS,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_MOUNTAINEER_RUBBLE_PSR = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8240-L8256',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_MOUNTAINEER_TERRAIN_MOVEMENT_COST =
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek Terrain.movementCost applies -1 MP for Mountaineer in rough/rubble movement-cost branches.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Terrain.java#L404-L584',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  );

export const MEGAMEK_325B_MOUNTAINEER_ELEVATION_MOVEMENT_COST =
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek MoveStep applies Mountaineer as one MP less for upward elevation changes.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MoveStep.java#L2828-L2841',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  );

export const MEGAMEK_325B_MOUNTAINEER_OPTION = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines Terrain Master: Mountaineer as tm_mountaineer.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_MOUNTAINEER_SOURCE_REFS = [
  MEGAMEK_325B_MOUNTAINEER_RUBBLE_PSR,
  MEGAMEK_325B_MOUNTAINEER_TERRAIN_MOVEMENT_COST,
  MEGAMEK_325B_MOUNTAINEER_ELEVATION_MOVEMENT_COST,
  MEGAMEK_325B_MOUNTAINEER_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_DODGE_MANEUVER_TO_HIT = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Compute applies +2 when the target is a Mek with Dodge Maneuver and target.dodging is true',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L2755-L2761',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_DODGE_MANEUVER_OPTION = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines the source-backed Dodge Maneuver SPA id as dodge_maneuver',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L169-L177',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_DODGE_MANEUVER_SOURCE_REFS = [
  MEGAMEK_325B_DODGE_MANEUVER_TO_HIT,
  MEGAMEK_325B_DODGE_MANEUVER_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_MANEUVERING_ACE_SKID = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8638-L8660',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_MANEUVERING_ACE_LATERAL_SHIFT =
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/MovePath.java#L252-L266',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  );

export const MEGAMEK_325B_MANEUVERING_ACE_QUAD_SIDE_STEP_COST =
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  );

export const MEGAMEK_325B_MANEUVERING_ACE_OUT_OF_CONTROL =
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16908-L16920',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  );

export const MEGAMEK_325B_MANEUVERING_ACE_OPTION = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines the source-backed Maneuvering Ace SPA id as maneuvering_ace.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEKSTATION_MANEUVERING_ACE_LATERAL_SHIFT = combatFeatureSourceRef(
  'mekstation-deviation',
  'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
  'src/utils/gameplay/movement/validation.ts#L50',
  'MekStation working-tree',
);

export const MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR =
  combatFeatureSourceRef(
    'mekstation-deviation',
    'MekStation createOutOfControlPSR plus runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
    'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L111',
    'MekStation working-tree',
  );

export const MEGAMEK_325B_MANEUVERING_ACE_BATTLEMECH_SOURCE_REFS = [
  MEGAMEK_325B_MANEUVERING_ACE_SKID,
  MEGAMEK_325B_MANEUVERING_ACE_LATERAL_SHIFT,
  MEGAMEK_325B_MANEUVERING_ACE_QUAD_SIDE_STEP_COST,
  MEGAMEK_325B_MANEUVERING_ACE_OUT_OF_CONTROL,
  MEGAMEK_325B_MANEUVERING_ACE_OPTION,
  MEKSTATION_MANEUVERING_ACE_LATERAL_SHIFT,
  MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_325B_ANIMAL_MIMICRY_QUAD_PSR = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek QuadMek.addEntityBonuses applies -1 Animal Mimicry to quad Mek piloting rolls.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/QuadMek.java#L460-L469',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_ANIMAL_MIMICRY_OPTION = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek OptionsConstants defines the source-backed Animal Mimicry SPA id as animal_mimic.',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/options/OptionsConstants.java#L171-L178',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const MEGAMEK_325B_ANIMAL_MIMICRY_SOURCE_REFS = [
  MEGAMEK_325B_ANIMAL_MIMICRY_QUAD_PSR,
  MEGAMEK_325B_ANIMAL_MIMICRY_OPTION,
] satisfies readonly ICombatFeatureSourceReference[];
