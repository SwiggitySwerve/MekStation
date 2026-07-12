/**
 * Explicit support matrix for combat-active pilot SPAs and mech quirks.
 *
 * The catalog validation suite uses this as the line between implemented
 * behavior and known feature gaps. Adding a combat-active SPA or quirk without
 * updating this file should fail fast instead of letting a broad
 * known-limitation filter hide the missing rule.
 */

import {
  integrated,
  outOfScope,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport.core';
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
  MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
  MEGAMEK_MULTI_TRAC_SOURCE_REFS,
  MEKSTATION_DISTRACTING_TO_HIT_DEVIATION_SOURCE_REFS,
  MEKSTATION_LOW_PROFILE_TO_HIT_DEVIATION_SOURCE_REFS,
  MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
  MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

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
