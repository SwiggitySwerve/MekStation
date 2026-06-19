/* eslint-disable max-lines -- Requirement crosswalk intentionally catalogs the full active combat-validation scope. */

import {
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  GAME_INTENT_ACTION_SUPPORT,
  P2P_INTENT_TRANSLATION_SUPPORT,
  WIRE_INTENT_KIND_ACTION_SUPPORT,
} from './CombatActionSupport';
import { AMMUNITION_COMPATIBILITY_SUPPORT } from './CombatAmmunitionSupport';
import {
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
} from './CombatAttackInvalidationSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from './CombatCanonicalSpaSupport';
import { CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT } from './CombatCriticalSlotEffectSupport';
import { CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT } from './CombatCriticalSlotHydrationSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
} from './CombatDamageSupport';
import {
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
} from './CombatEventSupport';
import {
  PHYSICAL_WEAPON_COMBAT_SUPPORT,
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from './CombatIntegrationSupport';
import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
} from './CombatLifecycleSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from './CombatParitySupport';
import { PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT } from './CombatPhysicalActionClassScopeSupport';
import { PHYSICAL_ATTACK_ACTION_SUPPORT } from './CombatPhysicalActionSupport';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from './CombatPhysicalLegalityGateSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from './CombatPilotModifierApplicationSupport';
import { PILOT_SKILL_COMBAT_SUPPORT } from './CombatPilotSkillSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
} from './CombatRuleSupport';
import {
  remapMekStationSourceRef,
  remapMekStationSourceRefs,
} from './CombatSourceRefAnchorRemap';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
} from './CombatTerrainEnvironmentSupport';
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from './CombatValidationScopeSupport';

export const PHYSICAL_LEGALITY_GATE_SUPPORT_REFS = Object.keys(
  PHYSICAL_LEGALITY_GATE_SUPPORT,
).map((id) => `ruleSupport.physicalLegalityGates.${id}`);

export const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_SUPPORT_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS.map(
    (id) => `ruleSupport.physicalLegalityGates.${id}`,
  );

export const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS.map(
    (id) => `ruleSupport.physicalLegalityGates.${id}`,
  );

function supportRefs(
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.keys(support).map((id) => `${sectionId}.${mapId}.${id}`);
}

export const MOVEMENT_RULE_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'movementRules',
  MOVEMENT_RULE_COMBAT_SUPPORT,
);

export const MOVEMENT_ENHANCEMENT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'movementEnhancements',
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
);

export const TERRAIN_ENVIRONMENT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainEnvironment',
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
);

export const TERRAIN_TYPE_MOVEMENT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeMovement',
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
);

export const TERRAIN_TYPE_LOS_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeLos',
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
);

export const TERRAIN_TYPE_ATTACK_MODIFIER_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeAttackModifiers',
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
);

export const TERRAIN_TYPE_HEAT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeHeat',
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
);

export const TERRAIN_TYPE_PSR_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypePsr',
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
);

export const PILOT_SKILL_SUPPORT_REFS = supportRefs(
  'pilotSkills',
  'pilotSkillUse',
  PILOT_SKILL_COMBAT_SUPPORT,
);

export const PILOT_ABILITY_SUPPORT_REFS = supportRefs(
  'featureSupport',
  'pilotAbilities',
  SPA_COMBAT_SUPPORT,
);

export const CANONICAL_SPA_SUPPORT_REFS = supportRefs(
  'featureSupport',
  'canonicalPilotAbilityScope',
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
);

export const MECH_QUIRK_SUPPORT_REFS = supportRefs(
  'featureSupport',
  'mechQuirks',
  QUIRK_COMBAT_SUPPORT,
);

export const PILOT_MODIFIER_RESOLVER_SUPPORT_REFS = supportRefs(
  'pilotSkills',
  'pilotModifierResolvers',
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
);

export const HEAT_GENERATION_SUPPORT_REFS = [
  'weapon-heat',
  'movement-heat',
  'jump-distance-heat',
  'engine-heat',
  'fire-heat',
].map((id) => `ruleSupport.heatRules.${id}`);

export const HEAT_DISSIPATION_SUPPORT_REFS = [
  'dissipation',
  'heat-sink-damage',
  'water-cooling',
  'environmental-heat',
].map((id) => `ruleSupport.heatRules.${id}`);

export const HEAT_LIFECYCLE_SUPPORT_REFS = [
  'threshold-effects',
  'shutdown-check',
  'auto-shutdown',
  'startup',
  'ammo-explosion-risk',
  'heat-induced-ammo-explosion',
  'pilot-heat-damage',
  'maxtech-pilot-heat-damage',
  'maxtech-heat-critical-damage',
].map((id) => `ruleSupport.heatRules.${id}`);

export const HEAT_DRIVEN_MODIFIER_SUPPORT_REFS = [
  'featureSupport.pilotAbilities.hot-dog',
  'featureSupport.pilotAbilities.some-like-it-hot',
  'featureSupport.mechQuirks.improved_cooling',
  'featureSupport.mechQuirks.poor_cooling',
  'featureSupport.mechQuirks.no_cooling',
  'pilotSkills.pilotModifierResolvers.heat-application',
];

export const RANGE_BRACKET_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'rangeBrackets',
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
);

export const ATTACK_INVALIDATION_REASON_SUPPORT_REFS = supportRefs(
  'invalidation',
  'attackReasons',
  ATTACK_INVALIDATION_REASON_SUPPORT,
);

export const INVALID_TARGET_STATE_SUPPORT_REFS = supportRefs(
  'invalidation',
  'invalidTargetStates',
  INVALID_TARGET_STATE_SUPPORT,
);

export const ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT_REFS = supportRefs(
  'invalidation',
  'invalidAttackSideEffects',
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
);

export const TO_HIT_CORE_MODIFIER_SUPPORT_REFS = [
  'gunnery',
  'range',
  'minimum-range',
  'attacker-movement',
  'target-movement',
  'heat',
  'environmental-conditions',
  'partial-cover',
  'physical-dfa-piloting-differential',
  'physical-dfa-target-class',
  'target-prone',
  'target-immobile',
  'indirect-fire',
  'terrain-features',
].map((id) => `ruleSupport.toHitModifiers.${id}`);

export const TO_HIT_ADVANCED_MODIFIER_SUPPORT_REFS = [
  'pilot-wounds',
  'sensor-damage',
  'actuator-damage',
  'attacker-prone',
  'hull-down',
  'secondary-target',
  'called-shot',
  'target-evasion',
  'ecm',
  'c3',
  'c3-equipment-conservative-network-seeding',
  'c3-equipment-unambiguous-network-formation',
  'c3-equipment-independent-side-formation',
  'c3-equipment-denial-boundaries',
  'c3-equipment-network-formation',
].map((id) => `ruleSupport.toHitModifiers.${id}`);

export const DAMAGE_RESOLUTION_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'damageResolution',
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
);

export const DESTRUCTION_CAUSE_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'destructionCauses',
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
);

export const CRITICAL_COMPONENT_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'criticalComponents',
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
);

export const CRITICAL_SLOT_EFFECT_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'criticalSlotEffects',
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
);

export const PILOT_DAMAGE_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'pilotDamage',
  PILOT_DAMAGE_COMBAT_SUPPORT,
);

export const PSR_RESOLUTION_SUPPORT_REFS = supportRefs(
  'lifecycleAndPsr',
  'psrResolution',
  PSR_RESOLUTION_COMBAT_SUPPORT,
);

export const PSR_TRIGGER_SUPPORT_REFS = supportRefs(
  'lifecycleAndPsr',
  'psrTriggers',
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
);

export const CRITICAL_SLOT_HYDRATION_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'criticalSlotHydration',
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
);

export const RUNNER_INTERACTIVE_PARITY_SUPPORT_REFS = supportRefs(
  'parityAndIntegration',
  'runnerInteractiveParity',
  RUNNER_INTERACTIVE_PARITY_SUPPORT,
);

export const BATTLEMECH_EVENT_SUPPORT_REFS = supportRefs(
  'eventStream',
  'battleMechCombatEvents',
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
);

export const NON_BATTLEMECH_EVENT_SCOPE_SUPPORT_REFS = supportRefs(
  'eventStream',
  'nonBattleMechEventScope',
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
);
