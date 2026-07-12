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
  integrated,
  outOfScope,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport.core';
import {
  MEGAMEK_325B_MULTI_TASKER_SOURCE_REFS,
  MEGAMEK_325B_JUMP_ATTACKER_SOURCE_REFS,
  MEGAMEK_325B_FROGMAN_SOURCE_REFS,
  MEGAMEK_325B_TERRAIN_MASTER_DEFENSIVE_SOURCE_REFS,
  MEGAMEK_325B_SWAMP_BEAST_SOURCE_REFS,
  MEGAMEK_325B_MOUNTAINEER_SOURCE_REFS,
  MEGAMEK_325B_DODGE_MANEUVER_SOURCE_REFS,
  MEGAMEK_325B_MANEUVERING_ACE_BATTLEMECH_SOURCE_REFS,
  MEGAMEK_325B_ANIMAL_MIMICRY_SOURCE_REFS,
} from './CombatFeatureSupport.spaSourceRefs';
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
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  MEGAMEK_SANDBLASTER_SOURCE_REFS,
  MEGAMEK_SHAKY_STICK_SOURCE_REFS,
  MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

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
