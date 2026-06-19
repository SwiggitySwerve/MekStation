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
import { combatFeatureSourceRef as pilotModifierApplicationSourceRef } from './CombatFeatureSourceReference';
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

export const MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_ENV_SPECIALIST_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Snow Environmental Specialist as a -1 ranged to-hit modifier under represented snow weather branches.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L209-L224`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit snow designation only for represented snow precipitation ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L366',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads attacker abilities and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_FOG_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Fog Environmental Specialist as a -1 ranged to-hit modifier for energy weapons against non-spaceborne targets in heavy fog.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L171-L179`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit fog designation only for represented heavy_fog energy-weapon ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L392',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads weapon energy classification, attacker abilities, and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_RAIN_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Rain Environmental Specialist as a -1 ranged to-hit modifier for moderate-or-heavier rain, while light rain is conventional-infantry-only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L195-L207`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit rain designation only for represented heavy_rain ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L381',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads attacker abilities and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_WIND_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Wind Environmental Specialist as ranged to-hit relief for missile weapons in moderate gale, with stronger-wind branches requiring additional weapon-category or storm-state gates.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L227-L244`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit wind designation only for represented moderate wind missile-weapon ranged to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L344-L405',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads weapon missile classification, attacker abilities, and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_LIGHT_RANGED_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Light Environmental Specialist as ranged to-hit relief for unilluminated targets in dusk, full moon, glare, moonless, solar flare, or pitch black light, and for illuminated targets in pitch black light.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L182-L191`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit Light designation only when represented target illumination state is present.',
    'src/utils/gameplay/environmentalModifiers.ts#L364-L391',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runAttackPhase threads explicit target illumination state into the environmental ranged to-hit modifier calculation.',
    'src/simulation/runner/phases/weaponAttack.ts#L1072-L1082',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENV_SPECIALIST_PHYSICAL_TO_HIT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek physical attack modifiers consume Light Environmental Specialist for unilluminated targets in moonless, solar-flare, or pitch-black light.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2731-L2742`,
    MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculateEnvironmentalSpecialistPhysicalToHitModifier consumes env_specialist plus explicit Light designation, dark environmental light, and target illumination state for represented physical to-hit relief.',
    'src/utils/gameplay/environmentalModifiers.ts#L375-L399',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculatePhysicalToHit threads the represented Environmental Specialist Light physical modifier through physical attack helper paths without claiming movement, PSR, or full designation hydration parity.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L178-L1037',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ZWEIHANDER_PUNCH_SOURCE_REFS = [
  ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.sourceRefs ?? []),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculatePunchDamage and supported physical-weapon damage helpers consume canonical zweihander plus explicit two-handed declaration state for represented bonus damage.',
    'src/utils/gameplay/physicalAttacks/damage.ts#L98-L230',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation canPunch and canMeleeWeapon reject explicit two-handed Zweihander declarations unless the represented SPA, non-prone, both-arm-present, represented per-arm hand-actuator, selected-arm physical-weapon, and represented arm-fire prerequisites pass.',
    'src/utils/gameplay/physicalAttacks/restrictions.ts#L666-L751',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation calculatePunchToHit and calculateMeleeWeaponToHit consume represented per-location off-arm upper and lower actuator damage as two-handed Zweihander to-hit penalties.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L178-L454',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation getPhysicalMissConsequences queues the represented Zweihander punch and supported physical-weapon miss PSR plus represented self-critical side-effect consequences only when the explicit two-handed declaration and canonical SPA are present.',
    'src/utils/gameplay/physicalAttacks/damage.ts#L789-L799',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation interactive physical declaration planning exposes the represented two-handed Zweihander prompt for punch and supported physical weapons and carries twoHandedZweihander into physical resolution.',
    'src/utils/gameplay/gameSessionPhysical.ts#L585-L990',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation PhysicalAttackForecastModal renders the represented two-handed Zweihander checkbox and threads the selected declaration state through the physical attack plan store.',
    'src/components/gameplay/PhysicalAttackForecastModal.tsx#L49-L195',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation physical attack plan state stores explicit two-handed Zweihander declarations for represented physical attack types and resets the flag for unsupported physical attack types.',
    'src/stores/useGameplayStore.physicalAttackPlan.ts#L56-L111',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runner physical attack declarations carry selected physical-weapon limbs and twoHandedZweihander into represented punch and supported physical-weapon legality, damage, declared-event, and selected-arm self-critical resolution.',
    'src/simulation/runner/phases/physicalAttack.ts#L532-L871',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation physical combat tests prove represented Zweihander punch and supported physical-weapon bonus damage, selected-arm physical-weapon declaration legality, off-arm actuator to-hit penalties, per-arm hand-actuator gates, miss PSR behavior, represented self-critical side-effect behavior, and invalid declaration no-side-effect gating without claiming non-catalog improvised club or breakage fidelity.',
    'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L846-L5639',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
