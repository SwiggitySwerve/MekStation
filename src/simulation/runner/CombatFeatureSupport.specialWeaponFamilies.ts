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
  helperOnly,
  integrated,
  outOfScope,
  unsupported,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport.core';
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

const MEGAMEK_325B_ARTEMIS_CLUSTER_MODIFIERS = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek MissileWeaponHandler applies Artemis IV +2, prototype Artemis IV +1, and Artemis V +3 cluster modifiers while suppressing ECM and stealth',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L144-L188',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_LRM_ARTEMIS_INDIRECT_GUARD = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek LRMHandler skips Artemis cluster modifiers when the weapon mode is Indirect and includes prototype Artemis IV in the same modifier chain',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/lrm/LRMHandler.java#L159-L207',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

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
