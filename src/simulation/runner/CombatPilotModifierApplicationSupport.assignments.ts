import type { IPilotModifierResolverAssignment } from './CombatPilotModifierApplicationSupport.types';

import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from './CombatPilotModifierApplicationSupport.support';

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

export const PILOT_MODIFIER_RESOLVER_ASSIGNMENTS = {
  'ranged-to-hit-calculation': {
    spaIds: RANGED_TO_HIT_SPA_IDS,
    quirkIds: RANGED_TO_HIT_QUIRK_IDS,
  },
  'ranged-to-hit-state-hydration': {
    spaIds: RANGED_TO_HIT_SPA_IDS,
    quirkIds: RANGED_TO_HIT_QUIRK_IDS,
  },
  'vdni-bvdni-ranged-to-hit-application': {
    spaIds: ['vdni', 'bvdni'],
    quirkIds: [],
  },
  'proto-dni-ranged-to-hit-application': {
    spaIds: ['proto_dni'],
    quirkIds: [],
  },
  'vdni-internal-damage-neural-feedback-application': {
    spaIds: ['vdni', 'artificial_pain_shunt'],
    quirkIds: [],
  },
  'bvdni-critical-hit-neural-feedback-application': {
    spaIds: ['bvdni', 'artificial_pain_shunt'],
    quirkIds: [],
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
  'comm-implant-indirect-fire-spotter-application': {
    spaIds: ['comm_implant', 'boost_comm_implant'],
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
  'sandblaster-rate-of-fire-application': {
    spaIds: ['sandblaster'],
    quirkIds: [],
  },
  'sandblaster-tacops-rapid-fire-application': {
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
  'zweihander-punch-physical-application': {
    spaIds: ['zweihander'],
    quirkIds: [],
  },
  'dfa-miss-bioware-pilot-damage-avoidance': {
    spaIds: ['dermal_armor', 'tsm_implant'],
    quirkIds: [],
  },
  'dermal-armor-head-hit-pilot-damage-suppression': {
    spaIds: ['dermal_armor'],
    quirkIds: [],
  },
  'eagle-eyes-active-probe-range-application': {
    spaIds: ['eagle_eyes'],
    quirkIds: [],
  },
  'eagle-eyes-minefield-detonation-application': {
    spaIds: ['eagle_eyes'],
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
      'tm_frogman',
      'tm_mountaineer',
      'tm_swamp_beast',
      'animal-mimicry',
    ],
    quirkIds: [],
  },
  'psr-spa-target-number-application': {
    spaIds: [
      'maneuvering-ace',
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
  'triple-core-processor-initiative-application': {
    spaIds: ['triple_core_processor', 'vdni', 'bvdni'],
    quirkIds: [],
  },
  'triple-core-processor-aimed-shot-application': {
    spaIds: ['triple_core_processor', 'vdni', 'bvdni'],
    quirkIds: [],
  },
  'initiative-hq-equipment-hydration': { spaIds: [], quirkIds: [] },
  'initiative-command-console-hydration': { spaIds: [], quirkIds: [] },
  'initiative-equipment-producer-hydration': { spaIds: [], quirkIds: [] },
  'heat-application': {
    spaIds: ['hot-dog', 'some-like-it-hot'],
    quirkIds: ['improved_cooling', 'poor_cooling', 'no_cooling'],
  },
  'consciousness-application': {
    spaIds: ['iron-man', 'pain-resistance'],
    quirkIds: [],
  },
  'rpg-toughness-consciousness-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-application': { spaIds: ['edge'], quirkIds: [] },
  'edge-head-hit-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-tac-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-ko-consciousness-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-masc-supercharger-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'critical-prevention-application': { spaIds: ['edge'], quirkIds: [] },
  'critical-prevention-edge-explosion-application': {
    spaIds: [],
    quirkIds: [],
  },
  'campaign-maintenance-application': {
    spaIds: [],
    quirkIds: ['rugged_1', 'rugged_2'],
  },
  'vehicle-movement-application': {
    spaIds: ['cross-country'],
    quirkIds: [],
  },
  'aerospace-maneuvering-ace-movement-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'movement-application': {
    spaIds: ['maneuvering-ace', 'heavy-lifter'],
    quirkIds: [],
  },
  'maneuvering-ace-controlled-sideslip-producer-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'maneuvering-ace-flanking-turning-producer-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'maneuvering-ace-out-of-control-producer-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'heavy-lifter-carry-object-action-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-throw-release-lifecycle-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-carry-object-capacity-check-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-ground-object-weight-gate-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-throw-object-action-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-lift-capacity-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'maneuvering-ace-lateral-movement-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'nightwalker-light-movement-application': {
    spaIds: ['tm_nightwalker'],
    quirkIds: [],
  },
  'env-specialist-snow-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-fog-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-rain-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-light-physical-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-light-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-wind-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'vdni-piloting-target-number-application': {
    spaIds: ['vdni'],
    quirkIds: [],
  },
  'proto-dni-piloting-target-number-application': {
    spaIds: ['proto_dni'],
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
