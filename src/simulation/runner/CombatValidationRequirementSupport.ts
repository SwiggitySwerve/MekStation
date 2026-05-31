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
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from './CombatValidationScopeSupport';

export type CombatRequirementAuthorityKind =
  | 'rulebook'
  | 'megamek-source'
  | 'mekhq-behavior'
  | 'mekstation-deviation';

export interface ICombatRequirementPrimaryAuthority {
  readonly kind: CombatRequirementAuthorityKind;
  readonly citation: string;
  readonly rationale: string;
}

export interface ICombatRequirementSupportEntry extends ICombatFeatureSupportEntry {
  readonly primaryAuthority: ICombatRequirementPrimaryAuthority;
  readonly supportMapRefs: readonly string[];
}

const MEGAMEK_EQUIPMENT_DATA_AUTHORITY = {
  kind: 'megamek-source',
  citation:
    'MegaMek/mm-data equipment records plus MekStation catalog import contracts',
  rationale:
    'Official equipment coverage is a data-provenance requirement before combat rules can be applied.',
} satisfies ICombatRequirementPrimaryAuthority;

const MEGAMEK_TACTICAL_SOURCE_AUTHORITY = {
  kind: 'megamek-source',
  citation:
    'MegaMek tactical source and API behavior used as executable BattleTech oracle',
  rationale:
    'The mechanic is pinned to executable MegaMek behavior where MekStation needs parity rather than product-only semantics.',
} satisfies ICombatRequirementPrimaryAuthority;

const MEKHQ_CAMPAIGN_BEHAVIOR_AUTHORITY = {
  kind: 'mekhq-behavior',
  citation: 'MekHQ campaign maintenance and repair-cycle behavior',
  rationale:
    'Campaign quirks such as Rugged are MekHQ campaign behavior, not tabletop combat critical-hit prevention rules.',
} satisfies ICombatRequirementPrimaryAuthority;

const RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY = {
  kind: 'rulebook',
  citation:
    'BattleTech Total Warfare / BattleMech Manual core BattleMech combat rules',
  rationale:
    'Canonical tabletop BattleMech rules define the combat behavior; implementation evidence proves local wiring only.',
} satisfies ICombatRequirementPrimaryAuthority;

const MEKSTATION_VALIDATION_CONTRACT_AUTHORITY = {
  kind: 'mekstation-deviation',
  citation: 'MekStation combat-validation suite and OpenSpec scope contracts',
  rationale:
    'This row governs local catalog hygiene, product wiring, parity, or scope partitioning rather than a tabletop combat rule.',
} satisfies ICombatRequirementPrimaryAuthority;

const MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation interactive/runner lifecycle semantics layered over tabletop outcomes',
  rationale:
    'The tabletop outcome exists, but target filtering, event emission, turn rotation, objectives, and network parity are MekStation product contracts.',
} satisfies ICombatRequirementPrimaryAuthority;

const MEGAMEK_EJECTION_LIFECYCLE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MovePathHandler routes manual EJECT movement into ejectEntity handling.',
    url: 'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L177-L215',
    sourceVersion: '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
  },
  {
    kind: 'megamek-source',
    citation:
      'TWGameManager.ejectEntity marks crew ejected, creates the ejected crew entity, destroys the original unit, and removes it with REMOVE_EJECTED for manual ejection.',
    url: 'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L28991-L29232',
    sourceVersion: '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
  },
  {
    kind: 'megamek-source',
    citation:
      'ServerReportsHelper separates active unit, ejected unit, and ejected crew counts after combat.',
    url: 'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/ServerReportsHelper.java#L46-L89',
    sourceVersion: '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES = {
  'official-ranged-weapons': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'official-physical-weapons': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'official-ammo': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'weapon-stat-mapping': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'special-weapon-families': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'fallback-prevention': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'damage-string-hazards': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'movement-actions': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'movement-validation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'movement-enhancements': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-generation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-dissipation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-lifecycle': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-driven-modifiers': MEGAMEK_TACTICAL_SOURCE_AUTHORITY,
  'range-validation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'attack-invalidation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'to-hit-core-modifiers': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'to-hit-advanced-modifiers': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'terrain-movement-los-cover': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'terrain-environment-modifiers': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'physical-core-actions': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'physical-weapon-actions': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'physical-self-risk': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'pilot-skills': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'spa-quirk-catalog': MEGAMEK_TACTICAL_SOURCE_AUTHORITY,
  'spa-quirk-resolver-application': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'campaign-quirk-behavior': MEKHQ_CAMPAIGN_BEHAVIOR_AUTHORITY,
  'damage-resolution': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'critical-effects': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'pilot-damage-death': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'psr-resolution': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'psr-trigger-catalog': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'turn-rotation-removal': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'targetability-lifecycle': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'ejection-lifecycle': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'retreat-withdrawal': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'objective-terminal-state': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'runner-interactive-parity': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'event-stream': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'critical-slot-hydration': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'known-limitation-audit': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'non-battlemech-scope': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
} satisfies Record<string, ICombatRequirementPrimaryAuthority>;

type CombatRequirementId = keyof typeof COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES;

const PHYSICAL_LEGALITY_GATE_SUPPORT_REFS = Object.keys(
  PHYSICAL_LEGALITY_GATE_SUPPORT,
).map((id) => `ruleSupport.physicalLegalityGates.${id}`);

function supportRefs(
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.keys(support).map((id) => `${sectionId}.${mapId}.${id}`);
}

const MOVEMENT_RULE_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'movementRules',
  MOVEMENT_RULE_COMBAT_SUPPORT,
);

const MOVEMENT_ENHANCEMENT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'movementEnhancements',
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
);

const TERRAIN_ENVIRONMENT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainEnvironment',
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
);

const TERRAIN_TYPE_MOVEMENT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeMovement',
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
);

const TERRAIN_TYPE_LOS_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeLos',
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
);

const TERRAIN_TYPE_ATTACK_MODIFIER_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeAttackModifiers',
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
);

const TERRAIN_TYPE_HEAT_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypeHeat',
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
);

const TERRAIN_TYPE_PSR_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'terrainTypePsr',
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
);

const PILOT_SKILL_SUPPORT_REFS = supportRefs(
  'pilotSkills',
  'pilotSkillUse',
  PILOT_SKILL_COMBAT_SUPPORT,
);

const PILOT_ABILITY_SUPPORT_REFS = supportRefs(
  'featureSupport',
  'pilotAbilities',
  SPA_COMBAT_SUPPORT,
);

const CANONICAL_SPA_SUPPORT_REFS = supportRefs(
  'featureSupport',
  'canonicalPilotAbilityScope',
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
);

const MECH_QUIRK_SUPPORT_REFS = supportRefs(
  'featureSupport',
  'mechQuirks',
  QUIRK_COMBAT_SUPPORT,
);

const PILOT_MODIFIER_RESOLVER_SUPPORT_REFS = supportRefs(
  'pilotSkills',
  'pilotModifierResolvers',
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
);

const HEAT_GENERATION_SUPPORT_REFS = [
  'weapon-heat',
  'movement-heat',
  'jump-distance-heat',
  'engine-heat',
  'fire-heat',
].map((id) => `ruleSupport.heatRules.${id}`);

const HEAT_DISSIPATION_SUPPORT_REFS = [
  'dissipation',
  'heat-sink-damage',
  'water-cooling',
  'environmental-heat',
].map((id) => `ruleSupport.heatRules.${id}`);

const HEAT_LIFECYCLE_SUPPORT_REFS = [
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

const HEAT_DRIVEN_MODIFIER_SUPPORT_REFS = [
  'featureSupport.pilotAbilities.hot-dog',
  'featureSupport.pilotAbilities.some-like-it-hot',
  'featureSupport.pilotAbilities.cool-under-fire',
  'featureSupport.mechQuirks.improved_cooling',
  'featureSupport.mechQuirks.poor_cooling',
  'featureSupport.mechQuirks.no_cooling',
  'pilotSkills.pilotModifierResolvers.heat-application',
];

const RANGE_BRACKET_SUPPORT_REFS = supportRefs(
  'ruleSupport',
  'rangeBrackets',
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
);

const ATTACK_INVALIDATION_REASON_SUPPORT_REFS = supportRefs(
  'invalidation',
  'attackReasons',
  ATTACK_INVALIDATION_REASON_SUPPORT,
);

const INVALID_TARGET_STATE_SUPPORT_REFS = supportRefs(
  'invalidation',
  'invalidTargetStates',
  INVALID_TARGET_STATE_SUPPORT,
);

const ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT_REFS = supportRefs(
  'invalidation',
  'invalidAttackSideEffects',
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
);

const TO_HIT_CORE_MODIFIER_SUPPORT_REFS = [
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

const TO_HIT_ADVANCED_MODIFIER_SUPPORT_REFS = [
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
  'c3-equipment-network-formation',
].map((id) => `ruleSupport.toHitModifiers.${id}`);

const DAMAGE_RESOLUTION_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'damageResolution',
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
);

const DESTRUCTION_CAUSE_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'destructionCauses',
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
);

const CRITICAL_COMPONENT_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'criticalComponents',
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
);

const CRITICAL_SLOT_EFFECT_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'criticalSlotEffects',
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
);

const PILOT_DAMAGE_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'pilotDamage',
  PILOT_DAMAGE_COMBAT_SUPPORT,
);

const PSR_RESOLUTION_SUPPORT_REFS = supportRefs(
  'lifecycleAndPsr',
  'psrResolution',
  PSR_RESOLUTION_COMBAT_SUPPORT,
);

const PSR_TRIGGER_SUPPORT_REFS = supportRefs(
  'lifecycleAndPsr',
  'psrTriggers',
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
);

const CRITICAL_SLOT_HYDRATION_SUPPORT_REFS = supportRefs(
  'damageAndDeath',
  'criticalSlotHydration',
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
);

const RUNNER_INTERACTIVE_PARITY_SUPPORT_REFS = supportRefs(
  'parityAndIntegration',
  'runnerInteractiveParity',
  RUNNER_INTERACTIVE_PARITY_SUPPORT,
);

const BATTLEMECH_EVENT_SUPPORT_REFS = supportRefs(
  'eventStream',
  'battleMechCombatEvents',
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
);

const NON_BATTLEMECH_EVENT_SCOPE_SUPPORT_REFS = supportRefs(
  'eventStream',
  'nonBattleMechEventScope',
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
);

type CombatRequirementSupportMapRegistry = Readonly<
  Record<
    string,
    Readonly<
      Record<string, Readonly<Record<string, ICombatFeatureSupportEntry>>>
    >
  >
>;

const SUPPORT_MAP_REGISTRY: CombatRequirementSupportMapRegistry = {
  actions: {
    tacticalCommands: COMBAT_COMMAND_ACTION_SUPPORT,
    absentActionSurfaces: BATTLEMECH_ABSENT_ACTION_SUPPORT,
    directUiActions: COMBAT_DIRECT_UI_ACTION_SUPPORT,
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
    knownLimitationsAndScope: BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  },
};

function resolveSupportRef(
  ref: string,
): ICombatFeatureSupportEntry | undefined {
  const [sectionId, mapId, ...entryParts] = ref.split('.');
  const entryId = entryParts.join('.');
  return SUPPORT_MAP_REGISTRY[sectionId]?.[mapId]?.[entryId];
}

function sourceRefsFromSupportMapRefs(
  supportMapRefs: readonly string[],
): readonly ICombatFeatureSourceReference[] {
  const sourceRefsByKey = new Map<string, ICombatFeatureSourceReference>();

  for (const ref of supportMapRefs) {
    const entry = resolveSupportRef(ref);
    for (const sourceRef of entry?.sourceRefs ?? []) {
      const key = `${sourceRef.kind}|${sourceRef.sourceVersion}|${sourceRef.url}|${sourceRef.citation}`;
      sourceRefsByKey.set(key, sourceRef);
    }
  }

  return Array.from(sourceRefsByKey.values());
}

function primaryAuthorityFor(
  id: CombatRequirementId,
): ICombatRequirementPrimaryAuthority {
  return COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES[id];
}

function integrated(
  id: CombatRequirementId,
  evidence: string,
  supportMapRefs: readonly string[],
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatRequirementSupportEntry {
  const entry: ICombatRequirementSupportEntry = {
    id,
    level: 'integrated',
    evidence,
    primaryAuthority: primaryAuthorityFor(id),
    supportMapRefs,
    sourceRefs: sourceRefs ?? sourceRefsFromSupportMapRefs(supportMapRefs),
  };

  return entry;
}

function helperOnly(
  id: CombatRequirementId,
  evidence: string,
  gap: string,
  supportMapRefs: readonly string[],
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatRequirementSupportEntry {
  return {
    id,
    level: 'helper-only',
    evidence,
    gap,
    primaryAuthority: primaryAuthorityFor(id),
    supportMapRefs,
    sourceRefs: sourceRefs ?? sourceRefsFromSupportMapRefs(supportMapRefs),
  };
}

function outOfScope(
  id: CombatRequirementId,
  evidence: string,
  gap: string,
  supportMapRefs: readonly string[],
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatRequirementSupportEntry {
  return {
    id,
    level: 'out-of-scope',
    evidence,
    gap,
    primaryAuthority: primaryAuthorityFor(id),
    supportMapRefs,
    sourceRefs: sourceRefs ?? sourceRefsFromSupportMapRefs(supportMapRefs),
  };
}

export const BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT = {
  'official-ranged-weapons': integrated(
    'official-ranged-weapons',
    'Catalog contracts enumerate every official ranged weapon and require non-synthetic AI weapon mapping',
    [
      'validationScope.knownLimitationsAndScope.battlemech-official-catalog-scope',
    ],
  ),
  'official-physical-weapons': helperOnly(
    'official-physical-weapons',
    'Catalog contracts enumerate official physical weapons, require construction definitions to match the official physical catalog, partition every row into either standalone runtime attacks or modifier-only helper equipment, and keep claws/talons out of selectable attack types',
    'Automatic claw/talon missing/breached event production beyond represented destroyed-location replay is not wired from mounted-equipment state, and full mounted physical-weapon mode/location lifecycle remains partial',
    [
      'validationScope.knownLimitationsAndScope.battlemech-official-catalog-scope',
      'featureSupport.physicalWeapons.hatchet',
      'featureSupport.physicalWeapons.sword',
      'featureSupport.physicalWeapons.mace',
      'featureSupport.physicalWeapons.lance',
      'featureSupport.physicalWeapons.retractable-blade',
      'featureSupport.physicalWeapons.claws',
      'featureSupport.physicalWeapons.flail',
      'featureSupport.physicalWeapons.talons',
      'featureSupport.physicalWeapons.wrecking-ball',
    ],
  ),
  'official-ammo': helperOnly(
    'official-ammo',
    'Catalog contracts enumerate official ammo entries, require compatible rows to become consumable bins, and classify every empty-compatible row through the ammo support map',
    'Some official ammo rows are non-BattleMech scope and need separate aerospace, vehicle, battle armor, artillery, or aquatic matrices',
    [
      'featureSupport.ammunitionCompatibility.battlemech-compatible-ammo',
      'featureSupport.ammunitionCompatibility.duplicate-runtime-id',
      'featureSupport.ammunitionCompatibility.battlemech-ammo-missing-compatible-weapon-refs',
      'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
      'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
      'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
      'featureSupport.ammunitionCompatibility.nonstandard-empty-compatible-row',
      'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
      'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
      'validationScope.knownLimitationsAndScope.battlemech-official-catalog-scope',
      'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
    ],
  ),
  'weapon-stat-mapping': integrated(
    'weapon-stat-mapping',
    'Weapon catalog contracts and runner rule maps cover damage, heat, range, minimum range, ammo, and hydrated mount conversion',
    [
      'ruleSupport.heatRules.weapon-heat',
      'ruleSupport.rangeBrackets.short',
      'ruleSupport.toHitModifiers.minimum-range',
    ],
  ),
  'special-weapon-families': helperOnly(
    'special-weapon-families',
    'Special weapon family support catalogs UAC, RAC, LB-X, Streak, MML, NARC, AMS, TAG, Artemis, and plasma-cannon responsibilities',
    'Several family-specific mechanics are helper-only until remaining iNarc ECM sensor effects, ambiguous/player-authored C3 network assignment, AMS defender choice/arc rules, Artemis exact-link/Nova-network/damage-lifecycle edges, or plasma-cannon external-heat timing/cap and non-Mek edges are wired',
    [
      'featureSupport.specialWeaponFamilies.ultra-ac',
      'featureSupport.specialWeaponFamilies.rotary-ac',
      'featureSupport.specialWeaponFamilies.lb-x-ac',
      'featureSupport.specialWeaponFamilies.streak-srm',
      'featureSupport.specialWeaponFamilies.narc',
      'featureSupport.specialWeaponFamilies.ams',
      'featureSupport.specialWeaponFamilies.tag',
      'featureSupport.specialWeaponFamilies.artemis',
      'featureSupport.specialWeaponFamilies.plasma-cannon',
      'featureSupport.specialWeaponMechanics.mml-variable-damage',
      'featureSupport.specialWeaponMechanics.mml-srm-lrm-ammo-compatibility',
      'featureSupport.specialWeaponMechanics.narc-marker-attachment',
      'featureSupport.specialWeaponMechanics.narc-marker-lifecycle-events',
      'featureSupport.specialWeaponMechanics.inarc-variant-ammo-attachment',
      'featureSupport.specialWeaponMechanics.inarc-ecm-attacker-flight-path-suppression',
      'featureSupport.specialWeaponMechanics.inarc-ecm-c3-disruption',
      'featureSupport.specialWeaponMechanics.inarc-nemesis-redirect',
      'featureSupport.specialWeaponMechanics.inarc-homing-marker-attachment',
      'featureSupport.specialWeaponMechanics.inarc-homing-cluster-modifier',
      'featureSupport.specialWeaponMechanics.inarc-homing-to-hit-modifier',
      'featureSupport.specialWeaponMechanics.inarc-haywire-to-hit-modifier',
      'featureSupport.specialWeaponMechanics.ams-projectile-reduction',
      'featureSupport.specialWeaponMechanics.ams-streak-cluster-parity',
      'featureSupport.specialWeaponMechanics.ams-single-missile-parity',
      'featureSupport.specialWeaponMechanics.ams-ammo-consumption',
      'featureSupport.specialWeaponMechanics.ams-interception-events',
      'featureSupport.specialWeaponMechanics.tag-designation-hit',
      'featureSupport.specialWeaponMechanics.tag-marker-lifecycle-events',
      'featureSupport.specialWeaponMechanics.tag-semi-guided-to-hit',
      'featureSupport.specialWeaponMechanics.tag-intent-wire-state-replay',
      'featureSupport.specialWeaponMechanics.active-probe-counter-hydration',
      'featureSupport.specialWeaponMechanics.artemis-cluster-modifier',
      'featureSupport.specialWeaponMechanics.artemis-ecm-suppression',
      'featureSupport.specialWeaponMechanics.artemis-ecm-suite-hydration',
      'featureSupport.specialWeaponMechanics.artemis-stealth-suppression',
    ],
  ),
  'fallback-prevention': integrated(
    'fallback-prevention',
    'Catalog contracts reject static weapon database drift and synthetic Medium Laser fallback hiding hydration failures',
    [
      'validationScope.knownLimitationsAndScope.static-weapon-database-subset',
      'validationScope.knownLimitationsAndScope.synthetic-medium-laser-fallback-ban',
    ],
  ),
  'damage-string-hazards': integrated(
    'damage-string-hazards',
    'Catalog contracts pin variable damage strings such as MML 1-2/missile so they do not collapse to zero damage; MML firing modes split SRM/LRM damage and consume distinct SRM/LRM ammo-bin families',
    [
      'validationScope.knownLimitationsAndScope.variable-damage-string-guard',
      'featureSupport.specialWeaponFamilies.mml',
      'featureSupport.specialWeaponMechanics.mml-variable-damage',
      'featureSupport.specialWeaponMechanics.mml-srm-lrm-mode-damage',
      'featureSupport.specialWeaponMechanics.mml-srm-lrm-ammo-compatibility',
    ],
  ),
  'movement-actions': helperOnly(
    'movement-actions',
    'Action and movement rule maps cover walk, run, jump, same-hex facing rotation, stand, source-backed voluntary go-prone, source-backed MASC/Supercharger activation, prone state, source-backed torso-twist exposure with replayed secondaryFacing consumption, and source-backed first-class absent-action rows for optional TacOps sprint and evade',
    'Sprint and evade action creation remain absent, even though explicit sprint/evasion state can be consumed by to-hit, indirect-fire spotter rejection, and runner movement heat; torso-twist lower-level UI direction/reset refinements remain outside the authoritative action path',
    [
      'actions.tacticalCommands.movement.walk',
      'actions.tacticalCommands.movement.stand',
      'actions.tacticalCommands.movement.go-prone',
      'actions.tacticalCommands.movement.activate-masc',
      'actions.tacticalCommands.movement.activate-supercharger',
      'actions.absentActionSurfaces.movement.evade',
      'actions.absentActionSurfaces.movement.sprint',
      'actions.gameIntents.activateMovementEnhancement',
      'actions.wireIntents.ActivateMovementEnhancement',
      'actions.p2pIntents.activateMovementEnhancement',
      'actions.tacticalCommands.facing.rotate-left',
      'actions.tacticalCommands.facing.rotate-right',
      'actions.tacticalCommands.facing.torso-twist',
      'actions.gameIntents.torsoTwist',
      'actions.wireIntents.TorsoTwist',
      'actions.p2pIntents.torsoTwist',
      ...MOVEMENT_RULE_SUPPORT_REFS,
    ],
  ),
  'movement-validation': integrated(
    'movement-validation',
    'Movement rule and terrain type matrices cover MP cost, heat MP penalties, terrain blocking, elevation, and occupancy',
    [
      'ruleSupport.movementRules.occupancy',
      'ruleSupport.movementRules.elevation',
      'ruleSupport.movementRules.heat-mp-penalty',
      'ruleSupport.terrainEnvironment.terrain-movement-costs',
      'ruleSupport.terrainEnvironment.water-ground-disallow',
    ],
  ),
  'movement-enhancements': helperOnly(
    'movement-enhancements',
    'Movement enhancement support catalogs MASC, supercharger, source-backed replayable activation, source-backed active TSM movement validation, source-backed standard MASC/Supercharger fixed failure target numbers, automatic prior-use counter advance/decay at runner turn reset, and source-backed Partial Wing jump MP/heat validation against combat movement behavior',
    'MASC and supercharger remain helper-only until MovementType.Sprint, alternate MASC option tables, IndustrialMek/support-unit supercharger roll adjustment, separate first-step equipment-check timing, and non-BattleMech Supercharger motive-damage branches are wired; Partial Wing atmosphere and damaged critical-slot lifecycle refinements remain explicit gaps until combat state hydrates them',
    MOVEMENT_ENHANCEMENT_SUPPORT_REFS,
  ),
  'heat-generation': integrated(
    'heat-generation',
    'Heat rules cover movement heat, explicit optional TacOps sprint/evade state heat, jump-distance heat, weapon heat, engine heat, environmental fire heat, and heat generated event emission',
    HEAT_GENERATION_SUPPORT_REFS,
  ),
  'heat-dissipation': integrated(
    'heat-dissipation',
    'Heat rules cover heat sink count, double sink rating, destroyed heat sink dissipation loss, water cooling, and environmental dissipation modifiers',
    HEAT_DISSIPATION_SUPPORT_REFS,
  ),
  'heat-lifecycle': integrated(
    'heat-lifecycle',
    'Heat rules cover threshold effects, shutdown checks, auto-shutdown, startup, heat pilot damage, optional MaxTech heat critical damage, and runner/event-sourced heat-induced ammo explosion selection plus CASE-aware damage cascade',
    HEAT_LIFECYCLE_SUPPORT_REFS,
  ),
  'heat-driven-modifiers': helperOnly(
    'heat-driven-modifiers',
    'Heat-driven modifier support separates source-backed Hot Dog heat roll relief, Some Like It Hot heat to-hit relief, and weapon cooling quirk heat changes from local-only Cool Under Fire generated-heat relief',
    'Cool Under Fire source authority is unresolved, so generated-heat relief remains helper-only and cannot be counted as complete heat-modifier parity',
    HEAT_DRIVEN_MODIFIER_SUPPORT_REFS,
  ),
  'range-validation': integrated(
    'range-validation',
    'Range support covers short, medium, long, extreme, out-of-range invalidation, and minimum range penalties',
    [...RANGE_BRACKET_SUPPORT_REFS, 'ruleSupport.toHitModifiers.minimum-range'],
  ),
  'attack-invalidation': integrated(
    'attack-invalidation',
    'Invalidation support covers range, LOS, target state, attacker evasion, ammo, same-hex, unknown weapon, destroyed weapon, jammed weapon, and no-side-effect guarantees',
    [
      ...ATTACK_INVALIDATION_REASON_SUPPORT_REFS,
      ...INVALID_TARGET_STATE_SUPPORT_REFS,
      ...ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT_REFS,
    ],
  ),
  'to-hit-core-modifiers': integrated(
    'to-hit-core-modifiers',
    'Runner to-hit support covers gunnery, range, minimum range, movement including explicit target-sprinted relief, heat, environment, target state, DFA target class, DFA piloting differential, partial cover, terrain features, and indirect fire',
    TO_HIT_CORE_MODIFIER_SUPPORT_REFS,
  ),
  'to-hit-advanced-modifiers': helperOnly(
    'to-hit-advanced-modifiers',
    'To-hit helpers cover wounds, sensors, actuators, attacker prone, hull-down, secondary targets, called shots, explicit target evasion including 0..3 Skilled Evasion bonus state across ranged and physical to-hit, ECM, C3, terrain features, and a source-backed absent-action row for optional TacOps Evade movement creation, with C3 explicit-state consumption, attack-time lifecycle and critical-slot damage refresh, attacker-evading ranged invalidation, and conservative runner initial network seeding separated from ambiguous battle-wide assignment gaps',
    'Runner attack state now hydrates wounds, sensor hits, coarse arm-actuator damage, attacker prone state, target hull-down state, target evasion/evasionBonus state, secondary-target state, called-shot state, explicit C3 network state with current positions/lifecycle/ECM disruption and matching C3 critical-slot damage suppression, mounted C3 equipment roles, conservative unambiguous runner C3/C3i initial networks, non-blocking intervening terrain, evading-attacker ranged invalidation, explicit sprinting-attacker ranged invalidation, explicit sprinting/evading spotter rejection for indirect fire, and explicit sprint/evade heat consumption, but ECM inputs, session/player-authored C3 network assignment, multiple or oversized C3 networks, and Evade/Sprint movement-step state creation remain helper-only or absent',
    [
      ...TO_HIT_ADVANCED_MODIFIER_SUPPORT_REFS,
      'actions.absentActionSurfaces.movement.evade',
    ],
  ),
  'terrain-movement-los-cover': helperOnly(
    'terrain-movement-los-cover',
    'Terrain matrices cover movement, MekStation simplified LOS blocking, and partial-cover derivation for every TerrainType',
    'Full MegaMek LOS parity remains helper-only because cumulative woods/smoke blocking, land-to-underwater sightline blocking, divided/diagram LOS, and richer building-level handling are not fully modeled',
    [
      'ruleSupport.terrainEnvironment.terrain-movement-costs',
      'ruleSupport.terrainEnvironment.terrain-los-blocking',
      'ruleSupport.terrainEnvironment.terrain-partial-cover',
      ...TERRAIN_TYPE_MOVEMENT_SUPPORT_REFS,
      ...TERRAIN_TYPE_LOS_SUPPORT_REFS,
    ],
  ),
  'terrain-environment-modifiers': helperOnly(
    'terrain-environment-modifiers',
    'Terrain/environment maps track woods, rubble, rough, water, ice, swamp, buildings, fire, smoke, fog, night, dust, mines, and extreme conditions',
    'Building-collapse, source-backed swamp bog-down/stuck state, dust, and minefield modifiers remain helper-only until runner phases consume those battlefield conditions',
    [
      ...TERRAIN_ENVIRONMENT_SUPPORT_REFS,
      ...TERRAIN_TYPE_ATTACK_MODIFIER_SUPPORT_REFS,
      ...TERRAIN_TYPE_HEAT_SUPPORT_REFS,
      ...TERRAIN_TYPE_PSR_SUPPORT_REFS,
    ],
  ),
  'physical-core-actions': helperOnly(
    'physical-core-actions',
    'Physical action maps, runner behavior tests, event-sourced physical resolution, the MegaMek physical action class scope catalog, and the source-checked legality gate catalog cover punch, kick, push, charge, death from above, active TSM damage, underwater modifiers, source-backed target-evasion physical to-hit, successful push/charge/DFA hit displacement, occupied-hex domino positional displacement cascades with DominoEffect PSRs, DFA-miss friendly occupied displacement avoidance, runtime-hydrated grounded DropShip radius-two DFA hit displacement search, source-backed two-level BattleMech displacement elevation caps, source-backed impassable-terrain and overgrown woods/jungle displacement rejection, runner same-phase displacement grid occupancy refresh, blocked successful-charge displacement no-op/no-PSR semantics, charge/DFA miss displacement, runner automatic charge/DFA selection from movement state, shared same-board rejection, shared retreated/ejected targetability removal/rejection, shared evading-attacker rejection, shared cargo-interaction attacker rejection, shared transported-passenger target rejection, shared swarming-target rejection, shared target-making-DFA rejection, shared airborne-target rejection, shared building-occupancy rejection, explicit non-unit invalid hex target rejection, source-backed gun-emplacement automatic success for punch/kick/DFA/melee targets, source-backed selected-arm-missing punch rejection, source-backed missing-leg kick rejection, source-backed prone charge-attacker rejection, source-backed BattleMech charge gun-emplacement target-class rejection, push attacker/target Mek unit-type rejection, push quad BattleMech rejection, push airborne-attacker rejection, push rear-flipped-arm rejection, push displacement-state/counter-push rejection, push building/fuel-tank explicit target rejection, charge/DFA building and fuel-tank explicit target rejection, charge standing-Mek target rejection, charge non-Mek-to-infantry/ProtoMech target rejection, charge elevation-overlap rejection, charge/DFA target movement-complete/immobile rejection, charge/DFA displacement-state rejection, DFA mechanical jump booster movement-step rejection, DFA infantry-family attacker rejection, DFA DropShip target rejection, DFA VTOL/WIGE elevation reach with hydrated jump MP/elevation context plus combat motion type in eligibility, event-sourced declaration/resolution, runner resolution, and automatic runner selection, DFA target-inside-building rejection, push both-arms-present rejection, push arm-fired helper/session/runner weapon-location rejection, and source-backed explicit scope splits for extra MegaMek physical classes',
    'BattleMech-applicable MegaMek classes such as brush-off, thrash, trip, grapple, break grapple, and jump-jet attacks remain unsupported; non-unit building/fuel-tank damage resolution, domino step-out and broader displacement terrain/building/environment fallout, broader DropShip footprint/secondary-hex consequences, and remaining stricter push/charge/DFA legality gates are cataloged but not runtime-integrated',
    [
      'actions.physicalAttackCommands.punch',
      'actions.physicalAttackCommands.kick',
      'actions.physicalAttackCommands.push',
      'actions.physicalAttackCommands.charge',
      'actions.physicalAttackCommands.dfa',
      'actions.physicalActionClassScope.punch',
      'actions.physicalActionClassScope.kick',
      'actions.physicalActionClassScope.push',
      'actions.physicalActionClassScope.charge',
      'actions.physicalActionClassScope.dfa',
      'actions.physicalActionClassScope.club',
      'actions.physicalActionClassScope.brush-off',
      'actions.physicalActionClassScope.thrash',
      'actions.physicalActionClassScope.trip',
      'actions.physicalActionClassScope.grapple',
      'actions.physicalActionClassScope.break-grapple',
      'actions.physicalActionClassScope.jump-jet-attack',
      'actions.physicalActionClassScope.airmek-ram',
      'actions.physicalActionClassScope.battle-armor-vibro-claw',
      'actions.physicalActionClassScope.lay-explosives',
      'actions.physicalActionClassScope.protomek-physical',
      'actions.physicalActionClassScope.ram',
      'lifecycleAndPsr.actionEligibility.retreated-targetability',
      'lifecycleAndPsr.actionEligibility.ejected-targetability',
      ...PHYSICAL_LEGALITY_GATE_SUPPORT_REFS,
      'ruleSupport.physicalDamageModifiers.tsm',
      'ruleSupport.physicalDamageModifiers.underwater',
    ],
  ),
  'physical-weapon-actions': helperOnly(
    'physical-weapon-actions',
    'Runtime physical weapon actions cover player commands, wire intents, runner resolution, active TSM damage context, source-backed melee damage/to-hit modifiers for hatchet, sword, mace, lance, retractable blade, flail, and wrecking ball, plus source-backed claw punch and talon kick/DFA damage modifiers including destroyed/missing/breached equipment critical events and represented destroyed-location replay',
    'Automatic claw/talon missing/breached event production beyond represented destroyed-location replay, full physical weapon mount location/mode state, and non-BattleMech physical weapon families remain out of scope',
    [
      'actions.physicalAttackCommands.hatchet',
      'actions.physicalAttackCommands.sword',
      'actions.physicalAttackCommands.mace',
      'actions.physicalAttackCommands.lance',
      'actions.physicalAttackCommands.retractable-blade',
      'actions.physicalAttackCommands.flail',
      'actions.physicalAttackCommands.wrecking-ball',
      'featureSupport.physicalWeapons.hatchet',
      'featureSupport.physicalWeapons.sword',
      'featureSupport.physicalWeapons.mace',
      'featureSupport.physicalWeapons.lance',
      'featureSupport.physicalWeapons.retractable-blade',
      'featureSupport.physicalWeapons.claws',
      'featureSupport.physicalWeapons.flail',
      'featureSupport.physicalWeapons.talons',
      'featureSupport.physicalWeapons.wrecking-ball',
      'ruleSupport.physicalDamageModifiers.claws',
      'ruleSupport.physicalDamageModifiers.tsm',
      'ruleSupport.physicalDamageModifiers.talons',
      'ruleSupport.physicalDamageModifiers.underwater',
    ],
  ),
  'physical-self-risk': helperOnly(
    'physical-self-risk',
    'Runner and event-sourced physical behavior cover charge/DFA target damage, self-damage, successful push/charge/DFA displacement, occupied-hex domino positional displacement cascades with DominoEffect PSRs, DFA-miss friendly occupied displacement avoidance, runtime-hydrated grounded DropShip radius-two DFA hit displacement search, same-phase runner occupancy refresh after displacement, blocked successful-charge displacement no-op/no-PSR semantics, charge/DFA miss displacement, source-backed immediate DFA miss fall damage/prone timing and pilot-damage avoidance, DFA impossible-displacement destruction, source-backed successful-DFA attacker PSR +4, miss consequences, and PSR queueing',
    'Legacy/local ChargeMiss and DFAMiss PSR factories plus domino step-out and broader displacement terrain/building/environment fallout and broader DropShip footprint/secondary-hex consequences remain visible helper or unsupported boundaries',
    [
      'lifecycleAndPsr.psrTriggers.charged',
      'lifecycleAndPsr.psrTriggers.charge_miss',
      'lifecycleAndPsr.psrTriggers.dfa_target',
      'lifecycleAndPsr.psrTriggers.dfa_miss',
      'lifecycleAndPsr.psrTriggers.domino_effect',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-chain',
      'ruleSupport.physicalLegalityGates.shared.displacement-friendly-avoidance',
      'ruleSupport.physicalLegalityGates.shared.displacement-dropship-radius',
    ],
  ),
  'pilot-skills': helperOnly(
    'pilot-skills',
    'Pilot skill support covers gunnery, piloting, indirect-fire spotter gunnery, wound penalties, PSR resolution, source-backed Command Mech/Battle Computer force initiative bonuses, explicit HQ/command equipment initiative bonuses, and Tactical Genius reroll requests',
    'Combat Intuition first-round sequencing and automatic command-console/HQ initiative equipment hydration are still helper-only; equipment-derived initiative bonuses require complete eligibility state before they can be promoted from explicit-only inputs',
    PILOT_SKILL_SUPPORT_REFS,
  ),
  'spa-quirk-catalog': helperOnly(
    'spa-quirk-catalog',
    'SPA and quirk support maps cover the combat SPA helper catalog, the canonical SPA catalog boundary, Maneuvering Ace skidding relief, Animal Mimicry quad-Mek PSR relief, and every mech or weapon quirk in the local catalogs',
    'Several canonical SPA, SPA-helper, and quirk entries remain helper-only or unsupported until runner/application plumbing exists; Maneuvering Ace terrain PSRs beyond skidding and Animal Mimicry terrain-designation movement effects remain explicit gaps',
    [
      ...PILOT_ABILITY_SUPPORT_REFS,
      ...CANONICAL_SPA_SUPPORT_REFS,
      ...MECH_QUIRK_SUPPORT_REFS,
    ],
  ),
  'spa-quirk-resolver-application': helperOnly(
    'spa-quirk-resolver-application',
    'Pilot modifier resolver support maps every SPA and quirk to the combat resolver family that applies or should apply it, with ranged to-hit state, weapon to-hit quirks, Maneuvering Ace skidding PSR relief, and Animal Mimicry quad-Mek PSR relief now hydrated by attack or PSR paths',
    'Most remaining non-ranged-to-hit resolver families are still helper-only until their phases consume hydrated ability and quirk state',
    PILOT_MODIFIER_RESOLVER_SUPPORT_REFS,
  ),
  'campaign-quirk-behavior': outOfScope(
    'campaign-quirk-behavior',
    'Rugged quirk support exposes MekHQ-style maintenance-cycle multipliers and keeps that behavior separate from combat critical-hit prevention',
    'Campaign maintenance-cycle behavior is source-pinned audit evidence outside BattleMech combat runner validation scope',
    [
      'featureSupport.mechQuirks.rugged_1',
      'featureSupport.mechQuirks.rugged_2',
      'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
    ],
  ),
  'damage-resolution': integrated(
    'damage-resolution',
    'Damage support covers armor, internal structure, rear armor, transfer, location destruction, heat/crit ammo explosion cascades, CASE containment, 20+ damage PSRs, and the canonical destruction-cause taxonomy; shutdown remains modeled by lifecycle support rather than UnitDestroyed',
    [...DAMAGE_RESOLUTION_SUPPORT_REFS, ...DESTRUCTION_CAUSE_SUPPORT_REFS],
  ),
  'critical-effects': helperOnly(
    'critical-effects',
    'Critical component support covers engine, gyro, cockpit, sensors, life support, actuators, ammo, heat sinks, jump jets, and weapons, with a generic equipment-destroyed helper boundary',
    'Special ammo and generic equipment lifecycle effects remain incomplete because not every MegaMek equipment-specific critical branch cascades through combat state',
    [...CRITICAL_COMPONENT_SUPPORT_REFS, ...CRITICAL_SLOT_EFFECT_SUPPORT_REFS],
  ),
  'pilot-damage-death': integrated(
    'pilot-damage-death',
    'Pilot damage support covers head hits, cockpit crit death, heat pilot damage, fall pilot damage, ammo-explosion pilot damage, unconsciousness, lethal wound destruction, and source-backed Pain Resistance / Iron Man ammo-explosion damage reduction',
    PILOT_DAMAGE_SUPPORT_REFS,
  ),
  'psr-resolution': integrated(
    'psr-resolution',
    'PSR support covers pending PSR resolution, reason-code preservation, falls, pilot wounds, pilot death, and pending clear',
    [
      ...PSR_RESOLUTION_SUPPORT_REFS,
      'parityAndIntegration.representativeScenarios.phase-psr-queue-lifecycle',
    ],
  ),
  'psr-trigger-catalog': helperOnly(
    'psr-trigger-catalog',
    'PSR trigger support catalogs damage, leg/actuator/gyro/engine, kicked, charged, DFA, pushed, shutdown, standing, terrain, skid, MASC, and supercharger triggers, including source-backed standard MASC/Supercharger fixed failure target numbers plus automatic prior-use counter advance/decay at runner turn reset',
    'Building-collapse remains helper-only; swamp bog-down is tracked as a terrain/stuck-state gap rather than a fall PSR; MASC and supercharger still lack alternate MASC option tables, IndustrialMek/support-unit supercharger roll adjustment, separate first-step equipment-check timing, and non-BattleMech Supercharger motive-damage branches after runner movement queues explicit active-run triggers',
    PSR_TRIGGER_SUPPORT_REFS,
  ),
  'turn-rotation-removal': integrated(
    'turn-rotation-removal',
    'Integration support and behavior tests cover destroyed, shutdown, unconscious, retreated, and ejected actors leaving normal turn queues',
    [
      'lifecycleAndPsr.actionEligibility.destroyed',
      'lifecycleAndPsr.actionEligibility.shutdown',
      'lifecycleAndPsr.actionEligibility.unconscious',
      'lifecycleAndPsr.actionEligibility.retreated',
      'lifecycleAndPsr.actionEligibility.ejected',
      'parityAndIntegration.representativeScenarios.turn-rotation-lifecycle-removal',
      'parityAndIntegration.representativeScenarios.interactive-actor-lifecycle-removal',
    ],
  ),
  'targetability-lifecycle': integrated(
    'targetability-lifecycle',
    'Lifecycle support tracks which terminal states remain targetable or are removed from target filters',
    [
      'lifecycleAndPsr.actionEligibility.shutdown-targetability',
      'lifecycleAndPsr.actionEligibility.retreated-targetability',
      'lifecycleAndPsr.actionEligibility.ejected-targetability',
      'parityAndIntegration.representativeScenarios.targetability-lifecycle-filter',
    ],
  ),
  'ejection-lifecycle': integrated(
    'ejection-lifecycle',
    'MegaMek backs original-unit removal on manual ejection; MekStation covers command/intent/wire routing, UnitEjected state, damage preservation, targetability removal, and terminal survivor counts',
    [
      'actions.tacticalCommands.utility.eject',
      'actions.gameIntents.eject',
      'actions.wireIntents.Eject',
      'actions.p2pIntents.eject',
      'eventStream.battleMechCombatEvents.unit_ejected',
      'lifecycleAndPsr.actionEligibility.ejection-damage-preservation',
      'parityAndIntegration.representativeScenarios.ejection-damage-preservation',
      'parityAndIntegration.representativeScenarios.ejection-command-intent-outcome',
    ],
    MEGAMEK_EJECTION_LIFECYCLE_SOURCE_REFS,
  ),
  'retreat-withdrawal': integrated(
    'retreat-withdrawal',
    'Retreat lifecycle support removes retreated units from actions, targets, survivor counts, and objectives; player withdrawal is integrated through the edge-selecting WithdrawControl plus game intent, wire payload, server dispatch, and P2P translation',
    [
      'actions.directUiActions.utility.withdraw-control',
      'actions.gameIntents.withdraw',
      'actions.wireIntents.Withdraw',
      'actions.p2pIntents.withdraw',
      'lifecycleAndPsr.actionEligibility.retreated',
      'lifecycleAndPsr.actionEligibility.retreated-targetability',
    ],
  ),
  'objective-terminal-state': integrated(
    'objective-terminal-state',
    'Integration support covers objective eligibility, survivor filters, terminal summary, and interactive plus runner terminal GameEnded events',
    [
      'parityAndIntegration.representativeScenarios.objective-control-lifecycle-filter',
      'parityAndIntegration.representativeScenarios.objective-outcome-precedence',
      'parityAndIntegration.representativeScenarios.terminal-survivor-filter',
      'parityAndIntegration.representativeScenarios.runner-terminal-summary',
      'parityAndIntegration.representativeScenarios.interactive-terminal-event',
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
      'lifecycleAndPsr.actionEligibility.force-survivor-counts',
    ],
  ),
  'runner-interactive-parity': integrated(
    'runner-interactive-parity',
    'Parity support covers movement, attack, physical, PSR, heat, objective, targetability, and terminal-state comparisons with matching terminal and heat-dissipation event semantics',
    [
      ...RUNNER_INTERACTIVE_PARITY_SUPPORT_REFS,
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
    ],
  ),
  'event-stream': helperOnly(
    'event-stream',
    'Event stream support catalogs BattleMech combat events and splits non-BattleMech event families out of scope',
    'Some event families are unsupported until their authoritative action paths exist',
    [
      ...BATTLEMECH_EVENT_SUPPORT_REFS,
      ...NON_BATTLEMECH_EVENT_SCOPE_SUPPORT_REFS,
    ],
  ),
  'critical-slot-hydration': integrated(
    'critical-slot-hydration',
    'Critical-slot hydration support maps catalog BattleMech system, ammo, weapon, heat sink, jump jet, and generic equipment slots into runner manifests with MegaMek source refs',
    CRITICAL_SLOT_HYDRATION_SUPPORT_REFS,
  ),
  'known-limitation-audit': integrated(
    'known-limitation-audit',
    'Validation scope support bypasses broad known-limitation filters, audits which broad pattern would have matched, forbids catalog filter gates, pins official BattleMech catalog scope, and exports unresolved catalog rows as machine-readable completion blockers',
    [
      'validationScope.knownLimitationsAndScope.known-limitation-bypass',
      'validationScope.knownLimitationsAndScope.known-limitation-pattern-audit',
      'validationScope.knownLimitationsAndScope.catalog-filter-gate-ban',
      'validationScope.knownLimitationsAndScope.battlemech-official-catalog-scope',
      'validationScope.knownLimitationsAndScope.unresolved-completion-blocker-inventory',
    ],
  ),
  'non-battlemech-scope': outOfScope(
    'non-battlemech-scope',
    'Validation scope support splits aerospace, vehicle, battle armor, infantry, protomech, and motive-system responsibilities out of this BattleMech suite',
    'Non-BattleMech systems need their own validation matrices rather than being treated as BattleMech coverage',
    [
      'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
      'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
      ...NON_BATTLEMECH_EVENT_SCOPE_SUPPORT_REFS,
    ],
  ),
} satisfies Record<string, ICombatRequirementSupportEntry>;
