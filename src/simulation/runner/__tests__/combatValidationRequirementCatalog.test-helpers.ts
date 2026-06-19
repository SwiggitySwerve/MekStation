import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';
import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
} from '../CombatValidationCatalog';

import { AMMUNITION_COMPATIBILITY_SUPPORT } from '../CombatAmmunitionSupport';
import {
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
} from '../CombatAttackInvalidationSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
} from '../CombatCriticalSlotEffectSupport';
import { CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT } from '../CombatCriticalSlotHydrationSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
} from '../CombatDamageSupport';
import {
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
} from '../CombatEventSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from '../CombatIntegrationSupport';
import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
} from '../CombatLifecycleSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from '../CombatPhysicalLegalityGateSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import { PILOT_SKILL_COMBAT_SUPPORT } from '../CombatPilotSkillSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
} from '../CombatRuleSupport';
import { UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS } from '../CombatSpecialWeaponSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
} from '../CombatTerrainEnvironmentSupport';
import { BATTLEMECH_COMBAT_VALIDATION_CATALOG } from '../CombatValidationCatalog';
import { getCombatValidationUnresolvedRefs } from '../CombatValidationGapInventory';
import {
  BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES,
  type ICombatRequirementSupportEntry,
} from '../CombatValidationRequirementSupport';
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from '../CombatValidationScopeSupport';

const EXPECTED_REQUIREMENT_IDS = [
  'attack-invalidation',
  'campaign-quirk-behavior',
  'critical-effects',
  'critical-slot-hydration',
  'damage-resolution',
  'damage-string-hazards',
  'ejection-lifecycle',
  'event-stream',
  'fallback-prevention',
  'heat-dissipation',
  'heat-driven-modifiers',
  'heat-generation',
  'heat-lifecycle',
  'known-limitation-audit',
  'movement-actions',
  'movement-enhancements',
  'movement-validation',
  'non-battlemech-scope',
  'objective-terminal-state',
  'official-ammo',
  'official-physical-weapons',
  'official-ranged-weapons',
  'physical-core-actions',
  'physical-self-risk',
  'physical-weapon-actions',
  'pilot-damage-death',
  'pilot-skills',
  'psr-resolution',
  'psr-trigger-catalog',
  'range-validation',
  'retreat-withdrawal',
  'runner-interactive-parity',
  'spa-quirk-catalog',
  'spa-quirk-resolver-application',
  'special-weapon-families',
  'targetability-lifecycle',
  'terrain-environment-modifiers',
  'terrain-movement-los-cover',
  'to-hit-advanced-modifiers',
  'to-hit-core-modifiers',
  'turn-rotation-removal',
  'weapon-stat-mapping',
] as const;

const EXPECTED_HELPER_ONLY_REQUIREMENT_IDS = [] as const;

const UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_BLOCKERS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS.map(
    (supportId) =>
      `ruleSupport.physicalLegalityGates.${supportId} (unsupported)`,
  );

const UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.physicalLegalityGates.${supportId}`,
  );

const OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS =
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS.map(
    (supportId) => `ruleSupport.physicalLegalityGates.${supportId}`,
  );

const UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS =
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
  ).sort();

const UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_BLOCKERS =
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.terrainEnvironment.${supportId} (unsupported)`,
  );

const UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS =
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS.map(
    (supportId) => `ruleSupport.terrainEnvironment.${supportId}`,
  );

const UNRESOLVED_TERRAIN_LOS_SIDE_PATH_BLOCKERS =
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS.map((ref) => `${ref} (unsupported)`);

const OBJECTIVE_REQUIREMENT_REF_PREFIX =
  'validationScope.objectiveRequirements.';

const UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS =
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
    (supportId) => `damageAndDeath.criticalComponents.${supportId}`,
  );

const UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS =
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS.map(
    (supportId) => `damageAndDeath.criticalSlotEffects.${supportId}`,
  );

const UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BLOCKERS = [
  ...UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS.map(
    (ref) => `${ref} (unsupported)`,
  ),
  ...UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS.map(
    (ref) => `${ref} (unsupported)`,
  ),
];

const UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS =
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS.map(
    (supportId) => `featureSupport.specialWeaponMechanics.${supportId}`,
  );

const UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_BLOCKERS =
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS.map(
    (ref) => `${ref} (unsupported)`,
  );

const VALID_AUTHORITY_KINDS = new Set([
  'rulebook',
  'megamek-source',
  'mekhq-behavior',
  'mekstation-deviation',
]);

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function catalogMaps(): readonly {
  readonly sectionId: string;
  readonly mapId: string;
  readonly support: CombatValidationSupportMap;
}[] {
  const rows: {
    sectionId: string;
    mapId: string;
    support: CombatValidationSupportMap;
  }[] = [];

  for (const [sectionId, section] of Object.entries(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  ) as readonly [string, CombatValidationCatalogSection][]) {
    for (const [mapId, support] of Object.entries(section)) {
      rows.push({ sectionId, mapId, support });
    }
  }

  return rows;
}

function resolveSupportRef(
  ref: string,
): ICombatFeatureSupportEntry | undefined {
  const [sectionId, mapId, ...entryParts] = ref.split('.');
  const entryId = entryParts.join('.');
  const catalog: Readonly<Record<string, CombatValidationCatalogSection>> =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG;
  const section = catalog[sectionId];
  const support = section?.[mapId];
  return support?.[entryId];
}

function blockingSupportRefsForRequirement(
  requirement: ICombatRequirementSupportEntry,
): readonly string[] {
  return Array.from(
    new Set(
      requirement.supportMapRefs.flatMap((ref) => {
        const support = resolveSupportRef(ref);

        return support?.level === 'helper-only' ||
          support?.level === 'unsupported'
          ? [`${ref} (${support.level})`]
          : [];
      }),
    ),
  );
}

function refsFor(
  support: Record<string, ICombatRequirementSupportEntry>,
): readonly string[] {
  return Object.values(support).flatMap((entry) => [...entry.supportMapRefs]);
}

function supportRefs(
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.keys(support).map((id) => `${sectionId}.${mapId}.${id}`);
}

function sourceBackedFeatureRows(): readonly {
  readonly ref: string;
  readonly entry: ICombatFeatureSupportEntry;
}[] {
  return catalogMaps()
    .filter(({ sectionId }) => sectionId === 'featureSupport')
    .flatMap(({ sectionId, mapId, support }) =>
      Object.entries(support).flatMap(([entryId, entry]) =>
        /source-backed/i.test(entry.evidence)
          ? [{ ref: `${sectionId}.${mapId}.${entryId}`, entry }]
          : [],
      ),
    );
}

function missingRefsForRequirement(
  requirementId: keyof typeof BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  const requirementRefs = new Set(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId].supportMapRefs,
  );

  return Object.keys(support)
    .map((id) => `${sectionId}.${mapId}.${id}`)
    .filter((ref) => !requirementRefs.has(ref))
    .sort();
}

function missingRefsAcrossRequirements(
  requirementIds: readonly (keyof typeof BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)[],
  sectionId: string,
  mapId: string,
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  const requirementRefs = new Set(
    requirementIds.flatMap((requirementId) => [
      ...BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId]
        .supportMapRefs,
    ]),
  );

  return Object.keys(support)
    .map((id) => `${sectionId}.${mapId}.${id}`)
    .filter((ref) => !requirementRefs.has(ref))
    .sort();
}

export {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  AMMUNITION_COMPATIBILITY_SUPPORT,
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  COMBAT_INTEGRATION_SCENARIO_SUPPORT,
  COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES,
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  EXPECTED_HELPER_ONLY_REQUIREMENT_IDS,
  EXPECTED_REQUIREMENT_IDS,
  HEAT_RULE_COMBAT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
  OBJECTIVE_REQUIREMENT_REF_PREFIX,
  OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  PILOT_SKILL_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  QUIRK_COMBAT_SUPPORT,
  RUNNER_INTERACTIVE_PARITY_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_BLOCKERS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_BLOCKERS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BLOCKERS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_BLOCKERS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_BLOCKERS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  VALID_AUTHORITY_KINDS,
  blockingSupportRefsForRequirement,
  catalogMaps,
  getCombatValidationUnresolvedRefs,
  missingRefsAcrossRequirements,
  missingRefsForRequirement,
  refsFor,
  resolveSupportRef,
  sortedKeys,
  sourceBackedFeatureRows,
  supportGaps,
  supportRefs,
};
export type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
  ICombatFeatureSupportEntry,
  ICombatRequirementSupportEntry,
};
