import {
  CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS,
  CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
} from './CombatCanonicalSpaSupport';
import {
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
  MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
  MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
} from './CombatConsciousnessSourceRefs';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_KO_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_CAPACITY_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_ACTION_SOURCE_REFS,
  MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_GROUND_OBJECT_WEIGHT_GATE_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_THROW_RELEASE_SOURCE_REFS,
} from './CombatHeavyLifterSourceRefs';
import {
  MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
  MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  MEGAMEK_NIGHTWALKER_SOURCE_REFS,
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
  MEGAMEK_EAGLE_EYES_SOURCE_VERSION,
  MEKSTATION_EAGLE_EYES_ACTIVE_PROBE_RANGE_SOURCE_REFS,
  MEKSTATION_EAGLE_EYES_MINEFIELD_DETONATION_SOURCE_REFS,
  MEKSTATION_TRIPLE_CORE_PROCESSOR_AIMED_SHOT_SOURCE_REFS,
  MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
} from './CombatPilotModifierApplicationSupport.sourceRefs.eagleEyes';
import {
  MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  MEGAMEK_ENV_SPECIALIST_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_FOG_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_RAIN_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_WIND_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_LIGHT_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_PHYSICAL_TO_HIT_SOURCE_REFS,
  MEKSTATION_ZWEIHANDER_PUNCH_SOURCE_REFS,
} from './CombatPilotModifierApplicationSupport.sourceRefs.environment';
import {
  MEGAMEK_MANEUVERING_ACE_LATERAL_MOVEMENT_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_FLANKING_TURNING_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_OUT_OF_CONTROL_PRODUCER_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_AEROSPACE_MOVEMENT_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS,
  MEKSTATION_NIGHTWALKER_LIGHT_MOVEMENT_SOURCE_REFS,
} from './CombatPilotModifierApplicationSupport.sourceRefs.movement';
import {
  MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  MEGAMEK_COMM_IMPLANT_INDIRECT_FIRE_SOURCE_REFS,
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
  MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
  MEGAMEK_BVDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS,
  MEGAMEK_VDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

const CRITICAL_PREVENTION_EDGE_EXPLOSION_SOURCE_REFS = [
  ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  ...MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PILOT_MODIFIER_RESOLVER_RANGED_PHYSICAL_SUPPORT = {
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
  'vdni-bvdni-ranged-to-hit-application': integrated(
    'vdni-bvdni-ranged-to-hit-application',
    'calculateAttackerSPAModifiers consumes canonical vdni and bvdni pilot ability ids as the source-backed -1 ranged attack to-hit modifier, runAttackPhase/declareAttack hydrate attacker abilities plus explicit neuralInterfaceActive false state into ranged to-hit state, and featureSupport.canonicalPilotAbilityScope.vdni plus featureSupport.canonicalPilotAbilityScope.bvdni integrate represented jack-in/jack-out neural-interface state transitions',
    MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS,
  ),
  'proto-dni-ranged-to-hit-application': integrated(
    'proto-dni-ranged-to-hit-application',
    'calculateAttackerSPAModifiers consumes canonical proto_dni as the current source-backed -2 ranged/gunnery target-number relief, and runAttackPhase/declareAttack hydrate attacker abilities plus explicit neuralInterfaceActive false state into ranged to-hit state',
    MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS,
  ),
  'vdni-internal-damage-neural-feedback-application': integrated(
    'vdni-internal-damage-neural-feedback-application',
    'resolveDamage consumes canonical vdni and artificial_pain_shunt for the represented unbuffered VDNI internal-structure damage feedback slice: VDNI rolls 2d6 after internal damage, wounds the pilot on 8+, emits neural_feedback PilotHit in the runner, excludes bvdni from this VDNI branch, suppresses the feedback for artificial_pain_shunt, and shares represented neural-interface state transitions with featureSupport.canonicalPilotAbilityScope.vdni',
    MEGAMEK_VDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  ),
  'bvdni-critical-hit-neural-feedback-application': integrated(
    'bvdni-critical-hit-neural-feedback-application',
    'resolveDamage consumes canonical bvdni and artificial_pain_shunt for the represented Buffered VDNI critical-hit feedback slice: BVDNI rolls 2d6 after a resolved critical hit, wounds the pilot on 8+, emits neural_feedback PilotHit in the runner through the shared damage result, suppresses the feedback for artificial_pain_shunt, and shares represented neural-interface state transitions with featureSupport.canonicalPilotAbilityScope.bvdni',
    MEGAMEK_BVDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  ),
  'weapon-to-hit-quirk-application': integrated(
    'weapon-to-hit-quirk-application',
    'runAttackPhase passes the firing weapon id into calculateToHit so calculateAttackerQuirkModifiers applies Accurate, Inaccurate, and Stable Weapon when unit state carries weaponQuirks',
    MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  ),
  'legacy-defensive-quirk-to-hit-application': outOfScope(
    'legacy-defensive-quirk-to-hit-application',
    'calculateAttackerQuirkModifiers calls calculateDistractingModifier and calculateLowProfileModifier, and runAttackPhase/declareAttack hydrate target unitQuirks into that local target to-hit helper/deviation path; Low Profile glancing-blow damage handling is tracked by featureSupport.mechQuirks.low_profile instead of this resolver row',
    'No source-backed producer/resolver maps Distracting or Low Profile to target to-hit in the source snapshot; the local target to-hit helper is deviation-only, while source-backed Low Profile is represented as glancing-blow damage, critical-hit-table, and cluster-table handling rather than a to-hit modifier',
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
  'comm-implant-indirect-fire-spotter-application': integrated(
    'comm-implant-indirect-fire-spotter-application',
    'computeIndirectFireContext hydrates spotter abilities for Cybernetic Comm Implant and Boosted Comm Implant into resolveIndirectFire so represented LOS spotters receive the current MegaMek -1 indirect LRM spotter target-number relief; boosted C3i pilot-implant network state remains tracked on the parent canonical SPA row',
    MEGAMEK_COMM_IMPLANT_INDIRECT_FIRE_SOURCE_REFS,
  ),
  'cluster-hitter-application': integrated(
    'cluster-hitter-application',
    'runAttackPhase hydrates attacker abilities into missile clusterContext, and resolveSpecialProjectileHit applies Cluster Hitter as a +1 cluster table shift',
    MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  ),
  'sandblaster-application': integrated(
    'sandblaster-application',
    'Source-backed resolveSpecialProjectileHit consumes Sandblaster state, designated weapon type, and attack range for representable LB-X and missile cluster-table resolution',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'sandblaster-rate-of-fire-application': integrated(
    'sandblaster-rate-of-fire-application',
    'runAttackPhase consumes Sandblaster state, designated autocannon weapon type, and attack range before expanding selected UAC/RAC or explicitly authored ordinary AC rate-of-fire modes so runner shot counts follow the source-backed cluster table while non-Sandblaster rate-of-fire modes keep independent selected shots',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'sandblaster-tacops-rapid-fire-application': integrated(
    'sandblaster-tacops-rapid-fire-application',
    'Sandblaster source refs are pinned to include TacOps rapid-fire AC as a legal designation family, UnitHydration authors official ordinary ac-2/ac-5/ac-10/ac-20 catalog rows with single/rapid-fire modes, and represented runner rate-of-fire integration consumes those catalog-authored ordinary AC rapid-fire modes without static fallback',
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
  'zweihander-punch-physical-application': integrated(
    'zweihander-punch-physical-application',
    'canPunch, canMeleeWeapon, calculatePunchToHit, calculateMeleeWeaponToHit, calculatePunchDamage, supported physical-weapon damage helpers, getPhysicalMissConsequences, interactive physical planning/resolution, and runPhysicalAttackPhase consume canonical zweihander only when explicit twoHandedZweihander declaration state is present, representing the two-handed punch and every official standalone physical-weapon prompt, SPA/non-prone/both-arm/represented per-arm hand-actuator/represented-arm-fire declaration gates, selected-arm physical-weapon limb/location declarations, represented off-arm upper/lower actuator to-hit penalties, bonus damage, miss PSR, and represented self-critical side-effect slices while excluding non-catalog improvised club, breakage, and broader mounted physical-weapon mode authoring from the official BattleMech SPA blocker',
    MEKSTATION_ZWEIHANDER_PUNCH_SOURCE_REFS,
  ),
  'dermal-armor-head-hit-pilot-damage-suppression': integrated(
    'dermal-armor-head-hit-pilot-damage-suppression',
    'resolveDamage consumes canonical dermal_armor as the represented head-hit pilot-damage suppression slice for BattleMech units while preserving head armor and structure damage; featureSupport.canonicalPilotAbilityScope.dermal_armor is integrated for the BattleMech matrix while non-BattleMech implant branches remain split out of this scope',
    [
      ...CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS,
      ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor.sourceRefs ?? []),
    ],
  ),
  'dfa-miss-bioware-pilot-damage-avoidance': integrated(
    'dfa-miss-bioware-pilot-damage-avoidance',
    'resolveDfaMissFallPilotDamageAvoidance consumes canonical dermal_armor and tsm_implant as the represented missed-DFA fall pilot-damage immunity slice for BattleMech units; featureSupport.canonicalPilotAbilityScope.dermal_armor and featureSupport.canonicalPilotAbilityScope.tsm_implant are integrated for the BattleMech matrix while non-BattleMech implant branches remain split out of this scope',
    [
      ...CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
      ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor.sourceRefs ?? []),
      ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tsm_implant.sourceRefs ?? []),
    ],
  ),
  'eagle-eyes-active-probe-range-application': integrated(
    'eagle-eyes-active-probe-range-application',
    'createInitialState consumes hydrated canonical eagle_eyes pilot ability state for the represented active-probe ECM-counter range slice, getProbeECMCounterRange adds one hex to the represented active probe range, and canBAPCounterECM uses that adjusted range during Guardian ECM countering; featureSupport.canonicalPilotAbilityScope.eagle_eyes is integrated for the canonical parent row',
    MEKSTATION_EAGLE_EYES_ACTIVE_PROBE_RANGE_SOURCE_REFS,
  ),
  'eagle-eyes-minefield-detonation-application': integrated(
    'eagle-eyes-minefield-detonation-application',
    'applyMovementMinefieldEffects and applyRepresentedMinefieldEntryDamage consume canonical eagle_eyes pilot ability state for the represented BattleMech TerrainType.Mines detonation roll, adding MegaMek-aligned +2 target-number relief before leg damage and PSR fallout; featureSupport.canonicalPilotAbilityScope.eagle_eyes is integrated for the canonical parent row',
    MEKSTATION_EAGLE_EYES_MINEFIELD_DETONATION_SOURCE_REFS,
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
} satisfies Record<string, ICombatFeatureSupportEntry>;
