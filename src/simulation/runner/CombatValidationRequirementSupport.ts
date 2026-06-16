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

const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_SUPPORT_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS.map(
    (id) => `ruleSupport.physicalLegalityGates.${id}`,
  );

const DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_REFS =
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
  'c3-equipment-conservative-network-seeding',
  'c3-equipment-unambiguous-network-formation',
  'c3-equipment-independent-side-formation',
  'c3-equipment-denial-boundaries',
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
  'official-physical-weapons': integrated(
    'official-physical-weapons',
    'Catalog contracts enumerate official physical weapons, require construction definitions to match the official physical catalog, partition every row into either standalone runtime attacks or modifier-only equipment, and keep claws/talons out of selectable attack types',
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
  'official-ammo': integrated(
    'official-ammo',
    'Catalog contracts enumerate official ammo entries, require compatible rows to become consumable bins, close the generic standard/advanced missing-compatible bucket, split every remaining empty-compatible row through the ammo support map, and prove RAC/10 and RAC/20 ammo rows stay non-consumable without unofficial weapon, alias, ammo-id, or static-BV fallback',
    [
      'featureSupport.ammunitionCompatibility.battlemech-compatible-ammo',
      'featureSupport.ammunitionCompatibility.duplicate-runtime-id',
      'featureSupport.ammunitionCompatibility.battlemech-ammo-missing-compatible-weapon-refs',
      'featureSupport.ammunitionCompatibility.experimental-empty-compatible-row',
      'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
      'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
      'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
      'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
      'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
      'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
      'featureSupport.ammunitionCompatibility.unofficial-empty-compatible-row',
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
  'special-weapon-families': integrated(
    'special-weapon-families',
    'Special weapon family support catalogs UAC, RAC, LB-X, Streak, MML, NARC, AMS, TAG, Artemis, and plasma-cannon responsibilities, including source-backed compact official IS/Clan launcher id resolution, whole-catalog non-torpedo Artemis FCS allocation audit coverage, active-probe/BAP/CEWS equipment hydration, ECM suite mode import and runner Artemis suppression, BattleMech stealth armor plus ECM critical-damage lifecycle removal of stealth suppression, carrier-attached iNarc pod target identity and selected Brush-Off removal, and explicit out-of-scope accounting for producer-side C3 authoring, AMS bay authoring, optional multi-use AMS authoring, and plasma-cannon non-Mek/terrain/building side paths',
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
      'featureSupport.specialWeaponMechanics.inarc-pod-variants',
      'featureSupport.specialWeaponMechanics.inarc-pod-event-replay-lifecycle',
      'featureSupport.specialWeaponMechanics.inarc-pod-target-identity-lifecycle',
      'featureSupport.specialWeaponMechanics.inarc-pod-target-option-deduplication',
      'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-target-selection',
      'featureSupport.specialWeaponMechanics.inarc-pod-helper-removal-lifecycle',
      'featureSupport.specialWeaponMechanics.inarc-pod-turn-reset-lifecycle',
      'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-removal-lifecycle',
      'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
      'featureSupport.specialWeaponMechanics.inarc-ecm-sensor-effects',
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
      'featureSupport.specialWeaponMechanics.inarc-explosive-ammo-compatibility',
      'featureSupport.specialWeaponMechanics.ams-automatic-interception-assignment',
      'featureSupport.specialWeaponMechanics.ams-projectile-reduction',
      'featureSupport.specialWeaponMechanics.ams-streak-cluster-parity',
      'featureSupport.specialWeaponMechanics.ams-single-missile-parity',
      'featureSupport.specialWeaponMechanics.ams-ammo-consumption',
      'featureSupport.specialWeaponMechanics.ams-interception-events',
      'featureSupport.specialWeaponMechanics.ams-bay-authoring',
      'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
      'featureSupport.specialWeaponMechanics.tag-designation-hit',
      'featureSupport.specialWeaponMechanics.tag-marker-lifecycle-events',
      'featureSupport.specialWeaponMechanics.tag-semi-guided-to-hit',
      'featureSupport.specialWeaponMechanics.tag-intent-wire-state-replay',
      'featureSupport.specialWeaponMechanics.active-probe-counter-hydration',
      'featureSupport.specialWeaponMechanics.artemis-cluster-modifier',
      'featureSupport.specialWeaponMechanics.artemis-fcs-critical-lifecycle',
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
      'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
      'featureSupport.specialWeaponMechanics.artemis-active-probe-mode-authoring',
      'featureSupport.specialWeaponMechanics.artemis-ew-mode-authoring',
      'featureSupport.specialWeaponMechanics.artemis-stealth-mode-damage-lifecycle',
      'featureSupport.specialWeaponMechanics.artemis-ecm-suppression',
      'featureSupport.specialWeaponMechanics.artemis-ecm-suite-hydration',
      'featureSupport.specialWeaponMechanics.active-probe-critical-lifecycle',
      'featureSupport.specialWeaponMechanics.artemis-stealth-suppression',
      'featureSupport.specialWeaponMechanics.plasma-cannon-battlemech-target-heat',
      'featureSupport.specialWeaponMechanics.plasma-cannon-battlemech-heat-phase-pending-bucket',
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
  'movement-actions': integrated(
    'movement-actions',
    'Action and movement rule maps cover walk, run, source-backed TacOps sprint and evade, jump, same-hex facing rotation, stand/careful-stand, hull-down, source-backed voluntary go-prone including non-Mek/already-prone/stuck legality, hull-down zero-MP posture transition, represented BattleMech swarmer dislodgement, enemy-occupied-start follow-up blocking, explicit infernoBurning wash-off, source-backed MASC/Supercharger activation, named MASC/Supercharger failure trigger stamping, prone state, source-backed torso-twist exposure with replayed secondaryFacing consumption, local shell-row exclusions, sprint command/MovementType/wire/P2P/runner movement/normal-engine heat/spotter/ranged-to-hit state, and enemy-occupied-start go-prone follow-up rejection',
    [
      'actions.tacticalCommands.movement.walk',
      'actions.tacticalCommands.movement.run',
      'actions.tacticalCommands.movement.sprint',
      'actions.tacticalCommands.movement.evade',
      'actions.tacticalCommands.movement.jump',
      'actions.tacticalCommands.movement.stand',
      'actions.tacticalCommands.movement.carefulStand',
      'actions.tacticalCommands.movement.hullDown',
      'actions.tacticalCommands.movement.goProne',
      'actions.tacticalCommands.movement.activate-masc',
      'actions.tacticalCommands.movement.activate-supercharger',
      'actions.gameIntents.activateMovementEnhancement',
      'actions.wireIntents.ActivateMovementEnhancement',
      'actions.p2pIntents.activateMovementEnhancement',
      'actions.tacticalCommands.facing.rotate-left',
      'actions.tacticalCommands.facing.rotate-right',
      'actions.tacticalCommands.facing.torso-twist',
      'actions.gameIntents.torsoTwist',
      'actions.wireIntents.TorsoTwist',
      'actions.p2pIntents.torsoTwist',
      'ruleSupport.movementEnhancements.masc-side-paths',
      'ruleSupport.movementEnhancements.supercharger-side-paths',
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
  'movement-enhancements': integrated(
    'movement-enhancements',
    'Movement enhancement support catalogs integrated core MASC and Supercharger active-run/sprint, activation, named failure trigger stamping, standard plus alternate_masc and alternate_masc_enhanced failure-PSR target tables, Edge-reroll, failure-damage, prior-use lifecycle behavior, represented BattleMech MASC/Supercharger side-path accounting rows, source-backed active TSM movement validation, source-backed Partial Wing jump MP/heat validation, and split non-BattleMech Supercharger support-unit roll adjustment plus vehicle motive-damage branches to an out-of-scope support row',
    MOVEMENT_ENHANCEMENT_SUPPORT_REFS,
  ),
  'heat-generation': integrated(
    'heat-generation',
    'Heat rules cover movement heat, declared TacOps Sprint normal-engine heat, declared TacOps Evade heat, jump-distance heat, weapon heat, engine heat, environmental fire heat, and heat generated event emission',
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
  'heat-driven-modifiers': integrated(
    'heat-driven-modifiers',
    'Heat-driven modifier support covers source-backed Hot Dog heat roll relief, Some Like It Hot heat to-hit relief, and weapon cooling quirk heat changes while keeping local-only Cool Under Fire out-of-scope and unconsumed by BattleMech heat resolution',
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
  'to-hit-advanced-modifiers': integrated(
    'to-hit-advanced-modifiers',
    'To-hit helpers cover wounds, sensors, actuators, attacker prone, hull-down, secondary targets, called shots, explicit target evasion including 0..3 Skilled Evasion bonus state across ranged and physical to-hit, ECM, C3, terrain features, and source-backed TacOps Sprint/Evade movement creation, with C3 explicit-state consumption, attack-time lifecycle and critical-slot damage refresh, attacker-evading ranged invalidation, conservative runner plus pre-battle/GameCreated equipment seeding, unambiguous single-network formation, independent side-by-side formation/denial evaluation, and fail-closed denial boundaries; residual C3 authoring and same-side partitioning are split out of the BattleMech runtime to-hit validation blocker set',
    [
      ...TO_HIT_ADVANCED_MODIFIER_SUPPORT_REFS,
      'actions.tacticalCommands.movement.sprint',
      'actions.tacticalCommands.movement.evade',
    ],
  ),
  'terrain-movement-los-cover': integrated(
    'terrain-movement-los-cover',
    'Terrain matrices cover movement, MekStation direct and cumulative-density LOS blocking, source-backed land-to-depth-2+ water endpoint blocking, represented single-path pure elevation LOS blocking with direct-fire invalidation, represented divided-path pure elevation LOS blocking, represented underwater clear/non-water depth-0 LOS blocking, represented underwater endpoint-height/minimum-depth LOS metadata, represented same-building building-hex LOS blocking, represented same-building endpoint elevation-difference LOS counting, represented building-height LOS blocking, represented grounded DropShip level-10 entity LOS cover, represented fuel-tank elevation metadata, represented building/fuel-tank/grounded-DropShip damageable cover-provider metadata, represented divided LOS side-path blocking and modifier selection, represented TacOps heavy-industrial and planted-field LOS1 diagram density/elevation, partial-cover derivation for every TerrainType, and no exact terrain LOS leaf blocker remains in the current gap inventory',
    [
      'ruleSupport.terrainEnvironment.terrain-movement-costs',
      'ruleSupport.terrainEnvironment.terrain-los-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-water-endpoint-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-underwater-clear-hex-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-underwater-depth-height-side-paths',
      'ruleSupport.terrainEnvironment.terrain-los-same-building-hex-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-same-building-level-count',
      'ruleSupport.terrainEnvironment.terrain-los-building-height-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-divided-side-path-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-divided-elevation-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-intervening-elevation-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-side-paths',
      ...TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(
        (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
      ),
      'ruleSupport.terrainEnvironment.terrain-partial-cover',
      ...TERRAIN_TYPE_MOVEMENT_SUPPORT_REFS,
      ...TERRAIN_TYPE_LOS_SUPPORT_REFS,
    ],
  ),
  'terrain-environment-modifiers': integrated(
    'terrain-environment-modifiers',
    'Terrain/environment maps track woods, rubble, rough, water, ice, swamp, buildings, fire, smoke, fog, night, dust, mines, and extreme conditions, including explicit-load building-collapse PSR queueing, represented TerrainType.Mines BattleMech entry damage, represented encoded damage levels, represented entry side paths, represented battle-wide IGameState.minefields coordinate-state entry damage, represented minefield add/set/reset/remove/clear/detect/detonate lifecycle replay, represented explicit GameCreated/prebattle coordinate minefield authoring, represented manual conventional and command-detonated minefield detonation controls, represented clearing/sweeper/reset events, represented movement detonation event emission, represented hidden conventional minefield detection/reveal state, represented density trigger targets, represented conventional/inferno/active/EMP density-decrement behavior, represented EMP no-effect/interference/shutdown outcomes, represented active ground-entry suppression, represented active BattleMech jump-entry triggering, represented typed non-conventional minefield no-fallback guards with resulting damage PSR evidence, and no exact terrain LOS or minefield leaf blocker remains in the current gap inventory',
    [
      ...TERRAIN_ENVIRONMENT_SUPPORT_REFS,
      ...TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(
        (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
      ),
      ...TERRAIN_TYPE_ATTACK_MODIFIER_SUPPORT_REFS,
      ...TERRAIN_TYPE_HEAT_SUPPORT_REFS,
      ...TERRAIN_TYPE_PSR_SUPPORT_REFS,
    ],
  ),
  'physical-core-actions': integrated(
    'physical-core-actions',
    'Physical action maps, runner behavior tests, event-sourced physical resolution, the MegaMek physical action class scope catalog, and the source-checked legality gate catalog cover punch, kick, push, optional TacOps trip, source-backed thrash, optional TacOps jump-jet attacks, source-backed brush-off, normal TacOps grapple, source-backed normal break-grapple, charge, death from above, active TSM damage, underwater modifiers, source-backed target-evasion physical to-hit, the represented Environmental Specialist Light physical to-hit helper slice, successful push/charge/DFA hit displacement, occupied-hex domino positional displacement cascades with DominoEffect PSRs, represented domino step-out/CFR payload decisions with successful domino_step_out application and failed/declined/no-response forced fallback, represented minefield fallout when physical displacement lands a BattleMech in existing TerrainType.Mines or represented conventional coordinate-state minefields, represented detonated coordinate suppression and typed non-conventional no-fallback guards for domino mine destinations, DFA-miss friendly occupied displacement avoidance, runtime-hydrated grounded DropShip radius-two DFA hit displacement search, source-backed two-level BattleMech displacement elevation caps, source-backed impassable-terrain and overgrown woods/jungle displacement rejection, runner same-phase displacement grid occupancy refresh, blocked successful-charge displacement no-op/no-PSR semantics, charge/DFA miss displacement, runner automatic charge/DFA selection from movement state, shared same-board rejection, shared retreated/ejected targetability removal/rejection, shared evading-attacker rejection, shared cargo-interaction attacker rejection, represented carried-cargo arm-dependent lockout, shared transported-passenger target rejection, shared swarming-target rejection, shared target-making-DFA rejection, shared airborne-target rejection, shared building-occupancy rejection, explicit non-unit invalid hex target rejection, source-backed gun-emplacement automatic success for punch/kick/DFA/melee targets, source-backed selected-arm-missing punch rejection, source-backed missing-leg kick rejection, source-backed prone charge-attacker rejection, source-backed stuck charge/DFA attacker rejection, source-backed BattleMech charge gun-emplacement target-class rejection, push attacker/target Mek unit-type rejection, push quad BattleMech rejection, push airborne-attacker rejection, push rear-flipped-arm rejection, push displacement-state/counter-push rejection, push building/fuel-tank explicit target rejection, charge/DFA building and fuel-tank explicit target rejection, charge standing-Mek target rejection, charge non-Mek-to-infantry/ProtoMech target rejection, charge elevation-overlap rejection, charge/DFA target movement-complete/immobile rejection, charge/DFA displacement-state rejection, DFA mechanical jump booster movement-step rejection, DFA infantry-family attacker rejection, DFA DropShip target rejection, DFA VTOL/WIGE elevation reach with hydrated jump MP/elevation context plus combat motion type in eligibility, event-sourced declaration/resolution, runner resolution, automatic runner selection, DFA target-inside-building rejection, push both-arms-present rejection, push arm-fired helper/session/runner weapon-location rejection, source-backed explicit scope splits for extra MegaMek physical classes, and out-of-scope splits for non-BattleMech or construction-authoring-only physical weapon surfaces',
    [
      'actions.physicalAttackCommands.punch',
      'actions.physicalAttackCommands.kick',
      'actions.physicalAttackCommands.push',
      'actions.physicalAttackCommands.trip',
      'actions.physicalAttackCommands.thrash',
      'actions.physicalAttackCommands.jump-jet-attack',
      'actions.physicalAttackCommands.grapple',
      'actions.physicalAttackCommands.break-grapple',
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
  'physical-weapon-actions': outOfScope(
    'physical-weapon-actions',
    'Runtime physical weapon actions cover player commands, wire intents, runner resolution, active TSM damage context, source-backed melee damage/to-hit modifiers for hatchet, sword, mace, lance, retractable blade, flail, and wrecking ball, plus source-backed claw punch and talon kick/DFA damage modifiers including destroyed physical-equipment critical production, destroyed/missing/breached represented equipment critical events, and represented destroyed-location replay',
    'The remaining physical-weapon residual is outside this BattleMech runtime validation matrix: source-construction/editor authoring of automatic claw/talon mounted-equipment lifecycle events when no represented CriticalHitResolved payload, physical critical-manifest entry, or destroyed-location event exists; full physical weapon mount authoring/mode state beyond represented attack declarations; and non-BattleMech physical weapon families that require separate validation matrices',
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
      'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
      'ruleSupport.physicalDamageModifiers.claw-physical-critical-production',
      'ruleSupport.physicalDamageModifiers.claw-represented-equipment-cleanup',
      'ruleSupport.physicalDamageModifiers.claws',
      'ruleSupport.physicalDamageModifiers.tsm',
      'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
      'ruleSupport.physicalDamageModifiers.talon-physical-critical-production',
      'ruleSupport.physicalDamageModifiers.talon-represented-equipment-cleanup',
      'ruleSupport.physicalDamageModifiers.talons',
      'ruleSupport.physicalDamageModifiers.underwater',
    ],
  ),
  'physical-self-risk': integrated(
    'physical-self-risk',
    'Runner and event-sourced physical behavior cover charge/DFA target damage, self-damage, represented push/charge/DFA/charge-miss target-displacement legality, occupied-hex domino positional displacement cascades with DominoEffect PSRs, represented domino step-out/CFR decisions that move successful blockers without forced DominoEffect PSRs and fall back to forced domino on invalid/failed/declined/no-response decisions, represented TerrainType.Mines destination fallout during physical displacement with GamePhase.PhysicalAttack mine damage and damage PSR side effects, represented conventional coordinate-state minefield damage plus density reduction/MinefieldChanged fallout, already-detonated coordinate suppression, typed non-conventional no-fallback guards, DFA-miss friendly occupied displacement avoidance, runtime-hydrated grounded DropShip radius-two DFA hit displacement search, same-phase runner occupancy refresh after displacement, blocked successful-charge displacement no-op/no-PSR semantics, source-backed immediate DFA miss fall damage/prone timing and pilot-damage avoidance, DFA impossible-displacement destruction, source-backed successful-DFA attacker PSR +4, miss consequences, PSR queueing, and out-of-scope splits for DropShip footprint/secondary-hex consequences beyond the BattleMech matrix',
    [
      'lifecycleAndPsr.psrTriggers.charged',
      'lifecycleAndPsr.psrTriggers.charge_miss',
      'lifecycleAndPsr.psrTriggers.dfa_target',
      'lifecycleAndPsr.psrTriggers.dfa_miss',
      'lifecycleAndPsr.psrTriggers.domino_effect',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-positional-chain',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-minefield-fallout',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-chain',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
      ...DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_SUPPORT_REFS,
      ...DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_REFS,
      'ruleSupport.physicalLegalityGates.shared.displacement-friendly-avoidance',
      'ruleSupport.physicalLegalityGates.shared.displacement-dropship-radius',
    ],
  ),
  'pilot-skills': integrated(
    'pilot-skills',
    'Pilot skill support covers gunnery, piloting, indirect-fire spotter gunnery, wound penalties, PSR resolution, source-backed Command Mech/Battle Computer force initiative bonuses, explicit HQ/command equipment initiative bonuses, represented HQ/command-console initiative equipment gates, exact official command-console producer id hydration, represented Triple-Core Processor initiative components, represented Triple-Core Processor called-shot Targeting Computer -1 aimed-shot relief, represented Heavy Lifter carry-object capacity checks, represented Heavy Lifter ground-object weight gates, represented Heavy Lifter pickup/drop lifecycle, represented Heavy Lifter throw-release action resolution, and Tactical Genius reroll requests; name-only command-console or communications-equipment prose intentionally fails closed without represented eligibility gates, and full thrown-object attack range, damage, displacement, target interaction, and UI targeting parity remain outside this represented action-resolution slice',
    [
      ...PILOT_SKILL_SUPPORT_REFS,
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
    ],
  ),
  'spa-quirk-catalog': integrated(
    'spa-quirk-catalog',
    'SPA and quirk support maps cover the combat SPA helper catalog, the canonical SPA catalog boundary, Maneuvering Ace skidding relief, Animal Mimicry quad-Mek PSR relief, represented Environmental Specialist Fog/Snow/Rain/Wind/Light ranged and Light physical to-hit behavior, represented Comm Implant and Boosted Comm Implant indirect-fire LOS spotter relief, represented Boosted Comm Implant C3i network state, represented BattleMech neural-interface and processor implant slices, and every mech or weapon quirk in the local catalogs. Edge support is integrated for generic point state plus represented BattleMech trigger behavior, non-LRM artillery spotting is split to artillery scope, Infantry-only minefield relief is split outside the BattleMech SPA resolver scope, and no mech-quirk or combat-active BattleMech SPA row is currently an unresolved objective blocker',
    [
      ...PILOT_ABILITY_SUPPORT_REFS,
      ...CANONICAL_SPA_SUPPORT_REFS,
      ...MECH_QUIRK_SUPPORT_REFS,
    ],
  ),
  'spa-quirk-resolver-application': integrated(
    'spa-quirk-resolver-application',
    'Pilot modifier resolver support maps every SPA and quirk to the combat resolver family that applies or should apply it, with ranged to-hit state, physical to-hit helper state, weapon to-hit quirks, represented Environmental Specialist Fog/Snow/Rain/Wind/Light ranged and Light physical to-hit behavior, represented PSR target-number rows for Maneuvering Ace skidding, Animal Mimicry quad-Mek relief, Terrain Master Frogman/Mountaineer/Swamp Beast relief, V.D.N.I. piloting relief, represented Triple-Core Processor initiative components, represented Triple-Core Processor called-shot Targeting Computer -1 aimed-shot relief, represented active-probe ECM-counter range slice and represented minefield detonation target-number relief for Eagle Eyes, Maneuvering Ace BattleMech lateral movement, Nightwalker represented low-light movement, Heavy Lifter lift-capacity, carry-object capacity-check helper math, ground-object weight gates, pickup/drop lifecycle, and bounded throw-object action resolution through throw-release lifecycle, represented initiativeEquipment gates, and exact official command-console producer ids now hydrated by attack, movement, PSR, or initiative paths; full thrown-object attack range, damage, displacement, target interaction, and UI targeting parity remain outside this represented action-resolution slice',
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
  'critical-effects': integrated(
    'critical-effects',
    'Critical component support covers engine, gyro, cockpit, sensors, life support, actuators, ammo, heat sinks, jump jets, weapons, represented empty tracked ammo-bin no-explosion handling, shield preserved-function replay, SCM six-slot critical lifecycle replay, Emergency Coolant System damaged-state plus 5-point explosion replay, PLAYTEST_3 autocannon first-hit and follow-up critical replay including official RAC/HVAC names, represented HarJel, represented explicit explosion-damage equipment replay, represented hot-loaded weapon replay including source HotLoad mode-state hydration with explicit explosionDamage, represented RISC Laser Pulse Module linked-laser and ambiguous-link no-fallback replay, represented PPC Capacitor, Prototype Improved Jump Jet, and Extended Fuel Tank explosion replay, represented Artemis FCS critical-damage guidance removal replay, represented active-probe critical replay, and generic equipment-destroyed replay through row-backed sibling slices; LAM/non-BattleMech fuel equipment, bomb bays, Blue Shield non-critical special rules, and incendiary ammo lifecycle branches remain explicit out-of-scope rows rather than BattleMech equipment-critical blockers',
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
  'psr-trigger-catalog': integrated(
    'psr-trigger-catalog',
    'PSR trigger support catalogs damage, leg/actuator/gyro/engine, kicked, charged, DFA, pushed, shutdown, standing, terrain, skid, source-backed explicit-load building collapse, swamp bog-down stuck outcomes, MASC, and Supercharger triggers, including named active run/sprint trigger stamping, source-backed standard, alternate_masc, and alternate_masc_enhanced MASC/Supercharger fixed failure target numbers plus automatic prior-use counter advance/decay at runner turn reset',
    [
      ...PSR_TRIGGER_SUPPORT_REFS,
      'ruleSupport.movementEnhancements.masc-side-paths',
      'ruleSupport.movementEnhancements.supercharger-side-paths',
    ],
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
  'event-stream': integrated(
    'event-stream',
    'Event stream support catalogs integrated BattleMech combat events, including runner-backed TurnStarted turn-boundary production',
    BATTLEMECH_EVENT_SUPPORT_REFS,
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
