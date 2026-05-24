import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

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

const MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2494-L2615`,
    sourceVersion: MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L192-L200`,
    sourceVersion: MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_CALLED_SHOT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L108-L138`,
    sourceVersion: MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export interface IPilotModifierResolverAssignment {
  readonly spaIds: readonly string[];
  readonly quirkIds: readonly string[];
}

export const PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT = {
  'ranged-to-hit-calculation': integrated(
    'ranged-to-hit-calculation',
    'calculateToHit calls calculateAttackerSPAModifiers and calculateAttackerQuirkModifiers when attacker/target state includes abilities or unit quirks',
  ),
  'ranged-to-hit-state-hydration': integrated(
    'ranged-to-hit-state-hydration',
    'runAttackPhase and declareAttack hydrate pilot abilities, SPA designations, unit quirks, weapon quirks, target unit type, target dodge state, wounds, sensor hits, attacker prone state, secondary-target state, and coarse arm-actuator damage into ranged to-hit state',
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
    'resolvePhysicalAttack, runPhysicalAttackPhase, and interactive declaration contexts pass pilot ability state into physical to-hit helpers so Melee Specialist modifies TNs',
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
  'psr-spa-application': unsupported(
    'psr-spa-application',
    'Maneuvering Ace, Terrain Master, Acrobat, Cross-Country, Natural Grace, and Animal Mimicry PSR modifiers are not wired into calculatePSRModifiers or runner PSR resolution',
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
    'Evasive TMM, Speed Demon run-distance/heat tradeoff, and Heavy Lifter carry/throw movement effects are not wired',
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
      'jumping-jack',
      'dodge-maneuver',
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
      'jumping-jack',
      'dodge-maneuver',
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
    spaIds: ['melee-specialist'],
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
      'acrobat',
      'cross-country',
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
    spaIds: ['evasive', 'speed-demon', 'heavy-lifter'],
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
