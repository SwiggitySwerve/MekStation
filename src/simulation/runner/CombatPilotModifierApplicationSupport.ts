import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_PSR_SPA_SOURCE_REFS,
  MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

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
    evidence: 'No combat resolver consumes this modifier family',
    gap,
  };

  return sourceRefs ? { ...entry, sourceRefs } : entry;
}

export interface IPilotModifierResolverAssignment {
  readonly spaIds: readonly string[];
  readonly quirkIds: readonly string[];
}

export const PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT = {
  'ranged-to-hit-calculation': integrated(
    'ranged-to-hit-calculation',
    'calculateToHit calls calculateAttackerSPAModifiers and calculateAttackerQuirkModifiers when attacker/target state includes abilities, target terrain features, or unit quirks',
    MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
  ),
  'ranged-to-hit-state-hydration': integrated(
    'ranged-to-hit-state-hydration',
    'runAttackPhase and declareAttack hydrate pilot abilities, SPA designations, unit quirks, weapon quirks, target unit type, target dodge state, wounds, sensor hits, attacker prone state, secondary-target state, and coarse arm-actuator damage into ranged to-hit state; runAttackPhase also hydrates target terrain features for source-backed Terrain Master defender to-hit variants',
    MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
  ),
  'weapon-to-hit-quirk-application': integrated(
    'weapon-to-hit-quirk-application',
    'runAttackPhase passes the firing weapon id into calculateToHit so calculateAttackerQuirkModifiers applies Accurate, Inaccurate, and Stable Weapon when unit state carries weaponQuirks',
  ),
  'called-shot-application': helperOnly(
    'called-shot-application',
    'Source-backed runAttackPhase and declareAttack pass calledShot intent into calculateCalledShotModifier for TacOps-style +3 called-shot penalties; local Marksman/legacy Sharpshooter helper reductions still exist',
    'MegaMek source validates called-shot penalties but not Marksman/Sharpshooter reduction',
    MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  ),
  'indirect-fire-spa-application': integrated(
    'indirect-fire-spa-application',
    'computeIndirectFireContext hydrates spotter abilities for Forward Observer and attacker abilities for Oblique Attacker into resolveIndirectFire penalty math',
  ),
  'cluster-hitter-application': integrated(
    'cluster-hitter-application',
    'runAttackPhase hydrates attacker abilities into missile clusterContext, and resolveSpecialProjectileHit applies Cluster Hitter as a +1 cluster table shift',
  ),
  'sandblaster-application': unsupported(
    'sandblaster-application',
    'Sandblaster Ultra/RAC cluster-hit damage modification is not represented in rate-of-fire resolution',
  ),
  'physical-to-hit-application': integrated(
    'physical-to-hit-application',
    'resolvePhysicalAttack, runPhysicalAttackPhase, and interactive declaration contexts pass pilot ability state plus attacker water depth into physical to-hit helpers so Melee Specialist and Terrain Master: Frogman modify TNs',
  ),
  'physical-damage-application': integrated(
    'physical-damage-application',
    'calculatePhysicalDamage and runPhysicalAttackPhase consume pilot abilities and unit quirks for Melee Master and Battle Fists physical damage bonuses',
  ),
  'physical-restriction-application': integrated(
    'physical-restriction-application',
    'canPunch, canMeleeWeapon, runPhysicalAttackPhase, and interactive declarations consume unit quirks plus elevation difference for No Arms and Low Arms restrictions',
  ),
  'psr-application': integrated(
    'psr-application',
    'calculatePSRModifiers consumes unit quirks through calculatePilotingQuirkPSRModifier; runPSRPhase, resolvePendingPSRs, and attemptStandUp pass unit quirk state into PSR target-number calculation',
  ),
  'psr-spa-application': helperOnly(
    'psr-spa-application',
    'calculatePSRModifiers, runPSRPhase, resolvePendingPSRs, and stand-up PSR paths apply source-backed Maneuvering Ace skidding relief, Animal Mimicry quad-Mek relief, Terrain Master: Frogman water-entry relief, and Terrain Master: Mountaineer rubble-entry relief to PSR target numbers',
    'Maneuvering Ace terrain PSRs beyond skidding, Animal Mimicry terrain-designation movement effects, Terrain Master variants beyond Frogman water-entry and Mountaineer rubble-entry, Swamp Beast bog-down relief, Acrobat, and Natural Grace PSR modifiers are not wired',
    MEGAMEK_PSR_SPA_SOURCE_REFS,
  ),
  'initiative-application': helperOnly(
    'initiative-application',
    'getTacticalGeniusBonus and calculateInitiativeQuirkModifier expose initiative modifiers',
    'rollInitiative does not consume pilot abilities or force-level unit quirks',
  ),
  'heat-application': integrated(
    'heat-application',
    'runHeatPhase and resolveHeatPhase consume Hot Dog shutdown-threshold relief, Cool Under Fire generated-heat relief, and weapon cooling quirks; calculateToHit consumes Some Like It Hot heat to-hit relief',
  ),
  'consciousness-application': integrated(
    'consciousness-application',
    'applyPilotDamage consumes pilotAbilities for head-hit consciousness checks; runPSRPhase, resolvePendingPSRs, runHeatPhase, and resolveHeatPhase consume unit abilities for fall and heat pilot-damage consciousness checks',
  ),
  'edge-application': helperOnly(
    'edge-application',
    'createEdgeState, canUseEdge, and useEdge model Edge trigger consumption',
    'Attack, PSR, consciousness, and trigger-specific TAC/head-hit/explosion resolvers do not consume Edge state',
  ),
  'critical-prevention-application': helperOnly(
    'critical-prevention-application',
    'MegaMek exposes Edge TAC/head-hit/explosion triggers, but no local critical-hit resolver consumes those trigger-specific Edge gates',
    'Generic critical-hit negation is not source-backed; Edge still needs TAC/head-hit/explosion mapping before wiring',
  ),
  'anti-mek-actuator-application': helperOnly(
    'anti-mek-actuator-application',
    'getAntiMekActuatorTargetModifier exposes Protected/Exposed Actuators as anti-Mek Leg/Swarm attack target-number modifiers',
    'Infantry and battle-armor anti-Mek Leg/Swarm attack paths are not implemented',
  ),
  'campaign-maintenance-application': helperOnly(
    'campaign-maintenance-application',
    'getRuggedMaintenanceMultiplier exposes MekHQ-style Rugged maintenance-cycle multipliers',
    'The combat runner has no campaign maintenance cycle subsystem',
  ),
  'movement-application': unsupported(
    'movement-application',
    'Evasive TMM, Speed Demon run-distance/heat tradeoff, Heavy Lifter carry/throw movement effects, and source-backed Cross-Country combat-vehicle movement/passability behavior are not wired in the BattleMech combat matrix',
    MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  ),
  'multi-target-penalty-application': unsupported(
    'multi-target-penalty-application',
    'The local Multi-Target SPA is not wired because the source-backed MegaMek secondary-target reducer is Multi-Tasker/multi_tasker, which is already handled through ranged to-hit calculation',
    MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  ),
  'target-priority-application': unsupported(
    'target-priority-application',
    'Antagonizer target-priority enforcement is not implemented in target selection or attack validation',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PILOT_MODIFIER_RESOLVER_ASSIGNMENTS = {
  'ranged-to-hit-calculation': {
    spaIds: [
      'weapon-specialist',
      'gunnery-specialist',
      'sniper',
      'blood-stalker',
      'multi-tasker',
      'range-master',
      'hopping-jack',
      'jumping-jack',
      'dodge-maneuver',
      'tm_forest_ranger',
      'tm_swamp_beast',
      'pain-resistance',
    ],
    quirkIds: [
      'improved_targeting_short',
      'improved_targeting_medium',
      'improved_targeting_long',
      'poor_targeting_short',
      'poor_targeting_medium',
      'poor_targeting_long',
      'distracting',
      'low_profile',
      'sensor_ghosts',
      'multi_trac',
    ],
  },
  'ranged-to-hit-state-hydration': {
    spaIds: [
      'weapon-specialist',
      'gunnery-specialist',
      'sniper',
      'blood-stalker',
      'multi-tasker',
      'range-master',
      'hopping-jack',
      'jumping-jack',
      'dodge-maneuver',
      'tm_forest_ranger',
      'tm_swamp_beast',
      'pain-resistance',
    ],
    quirkIds: [
      'improved_targeting_short',
      'improved_targeting_medium',
      'improved_targeting_long',
      'poor_targeting_short',
      'poor_targeting_medium',
      'poor_targeting_long',
      'distracting',
      'low_profile',
      'sensor_ghosts',
      'multi_trac',
    ],
  },
  'weapon-to-hit-quirk-application': {
    spaIds: [],
    quirkIds: ['accurate', 'inaccurate', 'stable_weapon'],
  },
  'called-shot-application': {
    spaIds: ['marksman', 'sharpshooter'],
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
    quirkIds: [],
  },
  'physical-damage-application': {
    spaIds: ['melee-master'],
    quirkIds: ['battle_fists_la', 'battle_fists_ra'],
  },
  'physical-restriction-application': {
    spaIds: [],
    quirkIds: ['no_arms', 'low_arms'],
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
    ],
  },
  'psr-spa-application': {
    spaIds: [
      'maneuvering-ace',
      'terrain-master',
      'tm_frogman',
      'tm_mountaineer',
      'tm_swamp_beast',
      'acrobat',
      'natural-grace',
      'animal-mimicry',
    ],
    quirkIds: [],
  },
  'initiative-application': {
    spaIds: ['tactical-genius', 'combat-intuition'],
    quirkIds: ['command_mech', 'battle_computer'],
  },
  'heat-application': {
    spaIds: ['hot-dog', 'cool-under-fire', 'some-like-it-hot'],
    quirkIds: ['improved_cooling', 'poor_cooling', 'no_cooling'],
  },
  'consciousness-application': {
    spaIds: ['iron-man', 'pain-resistance', 'toughness', 'iron-will'],
    quirkIds: [],
  },
  'edge-application': {
    spaIds: ['edge'],
    quirkIds: [],
  },
  'critical-prevention-application': {
    spaIds: ['edge'],
    quirkIds: [],
  },
  'campaign-maintenance-application': {
    spaIds: [],
    quirkIds: ['rugged_1', 'rugged_2'],
  },
  'movement-application': {
    spaIds: ['evasive', 'speed-demon', 'heavy-lifter', 'cross-country'],
    quirkIds: [],
  },
  'multi-target-penalty-application': {
    spaIds: ['multi-target'],
    quirkIds: [],
  },
  'target-priority-application': {
    spaIds: ['antagonizer'],
    quirkIds: [],
  },
} satisfies Record<
  keyof typeof PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  IPilotModifierResolverAssignment
>;
