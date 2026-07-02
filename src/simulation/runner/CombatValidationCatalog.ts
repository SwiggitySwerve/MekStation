import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

import {
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  GAME_INTENT_ACTION_SUPPORT,
  GM_COMMAND_EXCLUSION_SUPPORT,
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
import { PHYSICAL_LEGALITY_GATE_SUPPORT } from './CombatPhysicalLegalityGateSupport';
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
} from './CombatRuleSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
} from './CombatTerrainEnvironmentSupport';
import { BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT } from './CombatValidationRequirementSupport';
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from './CombatValidationScopeSupport';

export type CombatValidationSupportMap = Readonly<
  Record<string, ICombatFeatureSupportEntry>
>;

export type CombatValidationCatalogSection = Readonly<
  Record<string, CombatValidationSupportMap>
>;

export const BATTLEMECH_COMBAT_VALIDATION_CATALOG = {
  actions: {
    tacticalCommands: COMBAT_COMMAND_ACTION_SUPPORT,
    composerMovementModes: COMBAT_COMPOSER_MOVEMENT_ACTION_SUPPORT,
    absentActionSurfaces: BATTLEMECH_ABSENT_ACTION_SUPPORT,
    directUiActions: COMBAT_DIRECT_UI_ACTION_SUPPORT,
    gmCommandExclusions: GM_COMMAND_EXCLUSION_SUPPORT,
    gameIntents: GAME_INTENT_ACTION_SUPPORT,
    wireIntents: WIRE_INTENT_KIND_ACTION_SUPPORT,
    p2pIntents: P2P_INTENT_TRANSLATION_SUPPORT,
    physicalAttackCommands: PHYSICAL_ATTACK_ACTION_SUPPORT,
    physicalActionClassScope: PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT,
  },
  invalidation: {
    attackReasons: ATTACK_INVALIDATION_REASON_SUPPORT,
    invalidTargetStates: INVALID_TARGET_STATE_SUPPORT,
    invalidAttackSideEffects: ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  },
  eventStream: {
    battleMechCombatEvents: BATTLEMECH_COMBAT_EVENT_SUPPORT,
    nonBattleMechEventScope: NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
  },
  featureSupport: {
    pilotAbilities: SPA_COMBAT_SUPPORT,
    canonicalPilotAbilityScope: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
    mechQuirks: QUIRK_COMBAT_SUPPORT,
    ammunitionCompatibility: AMMUNITION_COMPATIBILITY_SUPPORT,
    specialWeaponFamilies: SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
    specialWeaponMechanics: SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    physicalWeapons: PHYSICAL_WEAPON_COMBAT_SUPPORT,
  },
  ruleSupport: {
    rangeBrackets: RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
    toHitModifiers: RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
    physicalLegalityGates: PHYSICAL_LEGALITY_GATE_SUPPORT,
    physicalDamageModifiers: PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
    movementRules: MOVEMENT_RULE_COMBAT_SUPPORT,
    movementEnhancements: MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
    terrainEnvironment: TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
    terrainTypeMovement: TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
    terrainTypeLos: TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
    terrainTypeAttackModifiers: TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
    terrainTypeHeat: TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
    terrainTypePsr: TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
    heatRules: HEAT_RULE_COMBAT_SUPPORT,
  },
  damageAndDeath: {
    damageResolution: DAMAGE_RESOLUTION_COMBAT_SUPPORT,
    pilotDamage: PILOT_DAMAGE_COMBAT_SUPPORT,
    criticalComponents: CRITICAL_COMPONENT_COMBAT_SUPPORT,
    criticalSlotEffects: CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
    criticalSlotHydration: CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
    destructionCauses: DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  },
  lifecycleAndPsr: {
    actionEligibility: ACTION_ELIGIBILITY_COMBAT_SUPPORT,
    psrResolution: PSR_RESOLUTION_COMBAT_SUPPORT,
    psrTriggers: RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
  },
  parityAndIntegration: {
    runnerInteractiveParity: RUNNER_INTERACTIVE_PARITY_SUPPORT,
    representativeScenarios: COMBAT_INTEGRATION_SCENARIO_SUPPORT,
  },
  pilotSkills: {
    pilotSkillUse: PILOT_SKILL_COMBAT_SUPPORT,
    pilotModifierResolvers: PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  },
  validationScope: {
    objectiveRequirements: BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    knownLimitationsAndScope: BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  },
} satisfies Readonly<Record<string, CombatValidationCatalogSection>>;
