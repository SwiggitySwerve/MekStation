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

export function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'integrated',
        evidence,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'integrated', evidence };
}

export function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'out-of-scope',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'out-of-scope', evidence, gap };
}

export function unsupported(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'unsupported',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'unsupported', evidence, gap };
}

export function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'helper-only',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'helper-only', evidence, gap };
}
