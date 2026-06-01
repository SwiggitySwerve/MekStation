import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
  MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
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
  MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
  MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
  MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
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
  MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
  MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
  MEGAMEK_MULTI_TRAC_SOURCE_REFS,
  MEGAMEK_PSR_SPA_SOURCE_REFS,
  MEKSTATION_DEFENSIVE_QUIRK_TO_HIT_DEVIATION_SOURCE_REFS,
  MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  MEGAMEK_SANDBLASTER_SOURCE_REFS,
  MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
  MEGAMEK_SHAKY_STICK_SOURCE_REFS,
  MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
  MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

const MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/MovePath.java#L252-L266`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ManeuverStep reduces aerospace maneuver thrust cost by 1 for Maneuvering Ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/ManeuverStep.java#L60-L66`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

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

function unsupported(
  id: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  const entry: ICombatFeatureSupportEntry = {
    id,
    level: 'unsupported',
    evidence: 'No combat resolver consumes this modifier family',
    gap,
  };

  return sourceRefs ? { ...entry, sourceRefs } : entry;
}

export interface IPilotModifierResolverAssignment {
  readonly spaIds: readonly string[];
  readonly quirkIds: readonly string[];
}

const RANGED_TO_HIT_SPA_IDS = [
  'weapon-specialist',
  'gunnery-specialist',
  'sniper',
  'blood-stalker',
  'multi-tasker',
  'range-master',
  'hopping-jack',
  'jumping-jack',
  'dodge-maneuver',
  'shaky_stick',
  'tm_forest_ranger',
  'tm_swamp_beast',
] as const;

const RANGED_TO_HIT_QUIRK_IDS = [
  'improved_targeting_short',
  'improved_targeting_medium',
  'improved_targeting_long',
  'poor_targeting_short',
  'poor_targeting_medium',
  'poor_targeting_long',
  'sensor_ghosts',
  'multi_trac',
] as const;

export const PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT = {
  'ranged-to-hit-calculation': integrated(
    'ranged-to-hit-calculation',
    'calculateToHit calls calculateAttackerSPAModifiers and calculateAttackerQuirkModifiers when attacker/target state includes abilities, target terrain features, airborne state, or unit quirks',
    [
      ...MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_SHAKY_STICK_SOURCE_REFS,
      ...MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_MULTI_TRAC_SOURCE_REFS,
    ],
  ),
  'ranged-to-hit-state-hydration': integrated(
    'ranged-to-hit-state-hydration',
    'runAttackPhase and declareAttack hydrate pilot abilities, SPA designations, unit quirks, weapon quirks, target unit type, target dodge state, airborne attacker/target state, wounds, sensor hits, attacker prone state, secondary-target state, and coarse arm-actuator damage into ranged to-hit state; runAttackPhase also hydrates target terrain features for source-backed Terrain Master defender to-hit variants',
    [
      ...MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_SHAKY_STICK_SOURCE_REFS,
    ],
  ),
  'weapon-to-hit-quirk-application': integrated(
    'weapon-to-hit-quirk-application',
    'runAttackPhase passes the firing weapon id into calculateToHit so calculateAttackerQuirkModifiers applies Accurate, Inaccurate, and Stable Weapon when unit state carries weaponQuirks',
    MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  ),
  'legacy-defensive-quirk-to-hit-application': helperOnly(
    'legacy-defensive-quirk-to-hit-application',
    'calculateAttackerQuirkModifiers currently calls calculateDistractingModifier and calculateLowProfileModifier, and attack state hydration passes target unit quirks into that local to-hit helper path',
    'Distracting has no MegaMek combat to-hit resolver in the source snapshot, and source-backed Low Profile is glancing-blow handling rather than a to-hit modifier; local +1 target to-hit behavior remains explicit helper/deviation coverage',
    [
      ...MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
      ...MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
      ...MEKSTATION_DEFENSIVE_QUIRK_TO_HIT_DEVIATION_SOURCE_REFS,
    ],
  ),
  'legacy-pain-resistance-to-hit-application': integrated(
    'legacy-pain-resistance-to-hit-application',
    'MegaMek source uses Pain Resistance for consciousness/wake-up rolls and ammunition-explosion pilot-damage reduction, not ranged to-hit wound-penalty relief; calculateToHit, runAttackPhase, and declareAttack preserve raw pilot wound penalties when attackers have Pain Resistance',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'called-shot-application': integrated(
    'called-shot-application',
    'Source-backed runAttackPhase and declareAttack pass calledShot intent into calculateCalledShotModifier for TacOps-style +3 called-shot penalties and disable local Marksman/legacy Sharpshooter helper reductions for BattleMech combat',
    MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  ),
  'indirect-fire-spa-application': integrated(
    'indirect-fire-spa-application',
    'computeIndirectFireContext hydrates spotter abilities for Forward Observer and attacker abilities for Oblique Attacker into resolveIndirectFire penalty math',
    [
      ...MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
      ...MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
    ],
  ),
  'cluster-hitter-application': integrated(
    'cluster-hitter-application',
    'runAttackPhase hydrates attacker abilities into missile clusterContext, and resolveSpecialProjectileHit applies Cluster Hitter as a +1 cluster table shift',
    MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  ),
  'sandblaster-application': helperOnly(
    'sandblaster-application',
    'Source-backed resolveSpecialProjectileHit consumes Sandblaster state, designated weapon type, and attack range for representable LB-X and missile cluster-table resolution',
    'UAC/RAC and TacOps rapid-fire AC Sandblaster paths are still not represented in rate-of-fire resolution',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'physical-to-hit-application': integrated(
    'physical-to-hit-application',
    'resolvePhysicalAttack, runPhysicalAttackPhase, and interactive declaration contexts pass pilot ability, unit quirk, and attacker water depth into physical to-hit helpers so Melee Specialist, Battle Fists, and Terrain Master: Frogman modify TNs',
    [
      ...MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
      ...MEGAMEK_BATTLE_FISTS_SOURCE_REFS,
    ],
  ),
  'physical-damage-application': integrated(
    'physical-damage-application',
    'calculatePhysicalDamage and runPhysicalAttackPhase consume pilot abilities for source-backed Melee Specialist physical damage without applying Battle Fists as legacy flat damage',
    MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  ),
  'physical-action-count-application': integrated(
    'physical-action-count-application',
    'getAllowedPhysicalAttackCount and declarePhysicalAttack consume Melee Master to permit two accepted physical declarations per turn while rejecting third declarations and same-limb repeats',
    MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
  ),
  'physical-restriction-application': integrated(
    'physical-restriction-application',
    'canPunch, canPush, canMeleeWeapon, runPhysicalAttackPhase, and interactive declarations consume unit quirks for source-backed No Arms restrictions',
    MEGAMEK_NO_ARMS_SOURCE_REFS,
  ),
  'low-arms-application': outOfScope(
    'low-arms-application',
    'Pinned MegaMek source search finds only Low Arms option registration, so MekStation must not apply a local elevation gate as covered behavior',
    'Low Arms resolver assignment remains registry-only out-of-scope audit evidence until a pinned MegaMek or MekHQ authority exposes combat resolver semantics',
    MEGAMEK_LOW_ARMS_GAP_SOURCE_REFS,
  ),
  'psr-application': integrated(
    'psr-application',
    'calculatePSRModifiers consumes unit quirks through calculatePilotingQuirkPSRModifier; runPSRPhase, resolvePendingPSRs, and attemptStandUp pass unit quirk and pilot ability state into PSR target-number calculation, with Stable scoped to Kick/Push PSRs, Easy Pilot scoped to the MegaMek piloting-skill gate plus BattleMech terrain/20+ damage PSRs, Cramped Cockpit suppressed for Small Pilot, and No Arms scoped to stand-up PSRs',
    [
      ...MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
      ...MEGAMEK_STABLE_PSR_SOURCE_REFS,
      ...MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
      ...MEGAMEK_UNBALANCED_SOURCE_REFS,
      ...MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
      ...MEGAMEK_NO_ARMS_SOURCE_REFS,
    ],
  ),
  'psr-spa-application': helperOnly(
    'psr-spa-application',
    'calculatePSRModifiers, runPSRPhase, resolvePendingPSRs, and stand-up PSR paths apply source-backed Maneuvering Ace skidding relief, Animal Mimicry quad-Mek relief, Terrain Master: Frogman water-entry relief, Terrain Master: Mountaineer rubble-entry relief, and Swamp Beast bog-down relief to PSR target numbers',
    'Maneuvering Ace controlled-sideslip and out-of-control control-roll side paths beyond skidding and Terrain Master variants beyond Frogman water-entry, Mountaineer rubble-entry, and Swamp Beast bog-down relief are not wired',
    MEGAMEK_PSR_SPA_SOURCE_REFS,
  ),
  'initiative-application': helperOnly(
    'initiative-application',
    'rollInitiative consumes source-backed Command Mech/Battle Computer force-level quirk bonuses, explicit HQ/command equipment initiative bonuses, and Tactical Genius reroll requests while preserving raw 2d6 payload fields',
    'Automatic command-console/HQ initiative equipment hydration is not wired; equipment-derived initiative remains unsupported unless source-kind/rules-profile, working/default-mode communications tonnage, command-console crew, weight-class, IndustrialMek, and advanced-fire-control eligibility context exists',
    [
      ...MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
      ...MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
      ...MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
    ],
  ),
  'initiative-hq-equipment-hydration': unsupported(
    'initiative-hq-equipment-hydration',
    'Automatic HQ initiative hydration is unsupported until source-kind/rules-profile, working communications equipment, Default communications mode, and total working communications tonnage are represented; explicit initiativeHQBonus is the supported closed-world path',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'initiative-command-console-hydration': unsupported(
    'initiative-command-console-hydration',
    'Automatic command-console initiative hydration is unsupported until command-console cockpit type, active command-console crew, heavy-or-larger weight, IndustrialMek, and advanced-fire-control gates are represented; explicit initiativeCommandBonus is the supported closed-world path',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'heat-application': integrated(
    'heat-application',
    'runHeatPhase and resolveHeatPhase consume source-backed Hot Dog startup/shutdown plus heat-induced ammo-explosion, opt-in MaxTech pilot heat-damage, opt-in MaxTech critical-damage avoid-number relief, and weapon cooling quirks; calculateToHit consumes source-backed Some Like It Hot heat to-hit relief while leaving local Cool Under Fire unconsumed',
    [
      ...MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
      ...MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
    ],
  ),
  'consciousness-application': helperOnly(
    'consciousness-application',
    'applyPilotDamage consumes source-backed Pain Resistance ids for head-hit consciousness checks, and runPSRPhase, resolvePendingPSRs, runHeatPhase, and resolveHeatPhase consume unit abilities for fall and heat pilot-damage consciousness checks',
    'Pain Resistance wake-up rolls and RPG Toughness numeric crew toughness are not modeled; Iron Man and Iron Will no longer provide consciousness target-number relief',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'edge-application': helperOnly(
    'edge-application',
    'createEdgeState, canUseEdge, and useEdge model source-backed Edge point and trigger-id consumption as generic helper state, and runPSRPhase consumes edge_when_masc_fails for failed MASC/Supercharger rerolls',
    'No attack, non-booster PSR, consciousness, TAC, head-hit, or explosion resolver consumes trigger-specific Edge state',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  'critical-prevention-application': helperOnly(
    'critical-prevention-application',
    'MegaMek exposes Edge TAC/head-hit/explosion triggers and consumes TAC/head-hit Edge during Mek hit-location rerolls, but no local critical-hit resolver consumes those trigger-specific Edge gates',
    'Generic critical-hit negation is not source-backed; Edge still needs TAC, head-hit, and explosion mapping before wiring',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  'anti-mek-actuator-application': outOfScope(
    'anti-mek-actuator-application',
    'getAntiMekActuatorTargetModifier exposes Protected/Exposed Actuators as anti-Mek Leg/Swarm attack target-number modifiers for the separate infantry and battle-armor combat matrix',
    'Anti-Mek Leg/Swarm attack paths are non-BattleMech attacker actions and are excluded from BattleMech runner validation until the battle-armor/infantry matrix consumes them',
    MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  ),
  'campaign-maintenance-application': outOfScope(
    'campaign-maintenance-application',
    'getRuggedMaintenanceMultiplier exposes MekHQ-style Rugged maintenance-cycle multipliers',
    'Campaign maintenance-cycle application belongs to MekHQ campaign scope, not BattleMech combat runner modifier scope',
    MEKHQ_RUGGED_SOURCE_REFS,
  ),
  'vehicle-movement-application': outOfScope(
    'vehicle-movement-application',
    'MegaMek Cross-Country applies to combat-vehicle terrain movement-cost and passability gates for the separate vehicle combat matrix',
    'Vehicle movement/passability behavior is excluded from BattleMech runner validation until a vehicle combat matrix consumes it',
    MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  ),
  'movement-application': unsupported(
    'movement-application',
    'Maneuvering Ace lateral-shift movement and Heavy Lifter carry/throw actions are not wired in the BattleMech combat matrix even though Maneuvering Ace skidding relief and Heavy Lifter lift-capacity helper math exist',
    [
      ...MEGAMEK_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS,
      ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
      ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
    ],
  ),
  'multi-target-penalty-application': integrated(
    'multi-target-penalty-application',
    'calculateToHit applies source-backed secondary-target penalties and calculateMultiTaskerModifier reduces those penalties for Multi-Tasker/multi_tasker through ranged to-hit calculation while leaving the out-of-scope local Multi-Target row unconsumed',
    MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  ),
  'target-priority-application': outOfScope(
    'target-priority-application',
    'MekStation local Antagonizer target-priority enforcement has no identified source-backed MegaMek combat SPA authority',
    'Local Antagonizer target-priority behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority and executable resolver path exist',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PILOT_MODIFIER_RESOLVER_ASSIGNMENTS = {
  'ranged-to-hit-calculation': {
    spaIds: RANGED_TO_HIT_SPA_IDS,
    quirkIds: RANGED_TO_HIT_QUIRK_IDS,
  },
  'ranged-to-hit-state-hydration': {
    spaIds: RANGED_TO_HIT_SPA_IDS,
    quirkIds: RANGED_TO_HIT_QUIRK_IDS,
  },
  'weapon-to-hit-quirk-application': {
    spaIds: [],
    quirkIds: ['accurate', 'inaccurate', 'stable_weapon'],
  },
  'legacy-defensive-quirk-to-hit-application': {
    spaIds: [],
    quirkIds: ['distracting', 'low_profile'],
  },
  'legacy-pain-resistance-to-hit-application': {
    spaIds: [],
    quirkIds: [],
  },
  'called-shot-application': {
    spaIds: [],
    quirkIds: [],
  },
  'indirect-fire-spa-application': {
    spaIds: ['oblique-attacker', 'forward_observer'],
    quirkIds: [],
  },
  'cluster-hitter-application': {
    spaIds: ['cluster-hitter'],
    quirkIds: [],
  },
  'sandblaster-application': {
    spaIds: ['sandblaster'],
    quirkIds: [],
  },
  'physical-to-hit-application': {
    spaIds: ['melee-specialist', 'tm_frogman'],
    quirkIds: ['battle_fists_la', 'battle_fists_ra'],
  },
  'physical-damage-application': {
    spaIds: ['melee-specialist'],
    quirkIds: [],
  },
  'physical-action-count-application': {
    spaIds: ['melee-master'],
    quirkIds: [],
  },
  'physical-restriction-application': {
    spaIds: [],
    quirkIds: ['no_arms'],
  },
  'low-arms-application': {
    spaIds: [],
    quirkIds: ['low_arms'],
  },
  'anti-mek-actuator-application': {
    spaIds: [],
    quirkIds: ['protected_actuators', 'exposed_actuators'],
  },
  'psr-application': {
    spaIds: [],
    quirkIds: [
      'easy_to_pilot',
      'stable',
      'hard_to_pilot',
      'unbalanced',
      'cramped_cockpit',
      'no_arms',
    ],
  },
  'psr-spa-application': {
    spaIds: [
      'maneuvering-ace',
      'terrain-master',
      'tm_frogman',
      'tm_mountaineer',
      'tm_swamp_beast',
      'animal-mimicry',
    ],
    quirkIds: [],
  },
  'initiative-application': {
    spaIds: ['tactical-genius'],
    quirkIds: ['command_mech', 'battle_computer'],
  },
  'initiative-hq-equipment-hydration': { spaIds: [], quirkIds: [] },
  'initiative-command-console-hydration': { spaIds: [], quirkIds: [] },
  'heat-application': {
    spaIds: ['hot-dog', 'some-like-it-hot'],
    quirkIds: ['improved_cooling', 'poor_cooling', 'no_cooling'],
  },
  'consciousness-application': {
    spaIds: ['iron-man', 'pain-resistance', 'toughness', 'iron-will'],
    quirkIds: [],
  },
  'edge-application': { spaIds: ['edge'], quirkIds: [] },
  'critical-prevention-application': { spaIds: ['edge'], quirkIds: [] },
  'campaign-maintenance-application': {
    spaIds: [],
    quirkIds: ['rugged_1', 'rugged_2'],
  },
  'vehicle-movement-application': {
    spaIds: ['cross-country'],
    quirkIds: [],
  },
  'movement-application': {
    spaIds: ['maneuvering-ace', 'heavy-lifter'],
    quirkIds: [],
  },
  'multi-target-penalty-application': {
    spaIds: ['multi-tasker'],
    quirkIds: [],
  },
  'target-priority-application': {
    spaIds: [],
    quirkIds: [],
  },
} satisfies Record<
  keyof typeof PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  IPilotModifierResolverAssignment
>;
