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

describe('BattleMech combat validation requirement crosswalk', () => {
  it('turns the active goal requirements into an explicit checklist', () => {
    expect(sortedKeys(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)).toEqual(
      [...EXPECTED_REQUIREMENT_IDS].sort(),
    );
    expect(supportGaps(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)).toEqual([]);
  });

  it('indexes the requirement crosswalk through the aggregate catalog', () => {
    expect(
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.validationScope
        .objectiveRequirements,
    ).toBe(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT);
  });

  it('points every requirement at existing catalog evidence entries', () => {
    const missingRefs = refsFor(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)
      .filter((ref) => resolveSupportRef(ref) === undefined)
      .sort();

    expect(missingRefs).toEqual([]);
  });

  it('requires every requirement to name one primary source authority', () => {
    expect(sortedKeys(COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES)).toEqual(
      sortedKeys(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT),
    );

    const invalidAuthorities = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    ).flatMap((entry) => {
      const { primaryAuthority } = entry;

      return primaryAuthority.citation.length === 0 ||
        primaryAuthority.rationale.length === 0 ||
        !VALID_AUTHORITY_KINDS.has(primaryAuthority.kind)
        ? [entry.id]
        : [];
    });

    expect(invalidAuthorities).toEqual([]);
  });

  it('requires every requirement row to carry row-level source references', () => {
    const missingSourceRefs = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    )
      .filter((entry) => (entry.sourceRefs ?? []).length === 0)
      .map((entry) => entry.id)
      .sort();

    expect(missingSourceRefs).toEqual([]);
  });

  it('requires source-backed feature rows to carry pinned authority refs', () => {
    const sourceBackedRows = sourceBackedFeatureRows();

    expect(sourceBackedRows.map(({ ref }) => ref)).toContain(
      'featureSupport.physicalWeapons.lance',
    );
    expect(sourceBackedRows.map(({ ref }) => ref)).toContain(
      'featureSupport.physicalWeapons.retractable-blade',
    );

    const invalidSourceRefs = sourceBackedRows.flatMap(({ ref, entry }) => {
      const sourceRefs = entry.sourceRefs ?? [];
      if (sourceRefs.length === 0) return [`${ref}: missing sourceRefs`];

      return sourceRefs.flatMap((sourceRef, index) => {
        const sourceRefId = `${ref}.sourceRefs[${index}]`;
        const failures: string[] = [];

        if (!VALID_AUTHORITY_KINDS.has(sourceRef.kind)) {
          failures.push(`${sourceRefId}: invalid kind ${sourceRef.kind}`);
        }
        if (sourceRef.citation.trim().length === 0) {
          failures.push(`${sourceRefId}: missing citation`);
        }
        if (sourceRef.url.trim().length === 0) {
          failures.push(`${sourceRefId}: missing url`);
        }
        if (sourceRef.sourceVersion.trim().length === 0) {
          failures.push(`${sourceRefId}: missing sourceVersion`);
        }
        if (
          sourceRef.kind === 'megamek-source' &&
          (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/') ||
            !sourceRef.url.includes(sourceRef.sourceVersion))
        ) {
          failures.push(`${sourceRefId}: MegaMek ref is not commit-pinned`);
        }
        if (
          sourceRef.kind === 'rulebook' &&
          !sourceRef.url.includes('battletech.com/')
        ) {
          failures.push(`${sourceRefId}: rulebook ref is not official`);
        }

        return failures;
      });
    });

    expect(invalidSourceRefs).toEqual([]);
  });

  it('pins ejection lifecycle to MegaMek original-unit removal sources', () => {
    const sourceRefs =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['ejection-lifecycle']
        .sourceRefs ?? [];

    expect(sourceRefs).toHaveLength(3);
    expect(sourceRefs.map((sourceRef) => sourceRef.kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'megamek-source',
    ]);
    expect(sourceRefs.map(({ citation }) => citation)).toEqual([
      'MovePathHandler routes manual EJECT movement into ejectEntity handling.',
      'TWGameManager.ejectEntity marks crew ejected, creates the ejected crew entity, destroys the original unit, and removes it with REMOVE_EJECTED for manual ejection.',
      'ServerReportsHelper separates active unit, ejected unit, and ejected crew counts after combat.',
    ]);
    expect(sourceRefs.map(({ sourceVersion }) => sourceVersion)).toEqual([
      '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
      '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
      '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
    ]);
    expect(sourceRefs.map(({ url }) => url)).toEqual([
      'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L177-L215',
      'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L28991-L29232',
      'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/ServerReportsHelper.java#L46-L89',
    ]);
  });

  it('separates rules authorities from implementation evidence references', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-ranged-weapons']
        .primaryAuthority.kind,
    ).toBe('megamek-source');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle']
        .primaryAuthority.kind,
    ).toBe('rulebook');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['known-limitation-audit']
        .primaryAuthority.kind,
    ).toBe('mekstation-deviation');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['runner-interactive-parity']
        .primaryAuthority.kind,
    ).toBe('mekstation-deviation');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior']
        .primaryAuthority.kind,
    ).toBe('mekhq-behavior');
  });

  it('keeps every requirement support reference inside the aggregate catalog index', () => {
    const indexedRefs = new Set(
      catalogMaps().flatMap(({ sectionId, mapId, support }) =>
        Object.keys(support).map(
          (entryId) => `${sectionId}.${mapId}.${entryId}`,
        ),
      ),
    );

    expect(
      refsFor(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT).filter(
        (ref) => !indexedRefs.has(ref),
      ),
    ).toEqual([]);
  });

  it('backs heat requirements with every heat rule support row', () => {
    expect(
      missingRefsAcrossRequirements(
        ['heat-generation', 'heat-dissipation', 'heat-lifecycle'],
        'ruleSupport',
        'heatRules',
        HEAT_RULE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-generation']
        .supportMapRefs,
    ).toEqual([
      'ruleSupport.heatRules.weapon-heat',
      'ruleSupport.heatRules.movement-heat',
      'ruleSupport.heatRules.jump-distance-heat',
      'ruleSupport.heatRules.engine-heat',
      'ruleSupport.heatRules.fire-heat',
    ]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-dissipation']
        .supportMapRefs,
    ).toEqual([
      'ruleSupport.heatRules.dissipation',
      'ruleSupport.heatRules.heat-sink-damage',
      'ruleSupport.heatRules.water-cooling',
      'ruleSupport.heatRules.environmental-heat',
    ]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle']
        .supportMapRefs,
    ).toEqual([
      'ruleSupport.heatRules.threshold-effects',
      'ruleSupport.heatRules.shutdown-check',
      'ruleSupport.heatRules.auto-shutdown',
      'ruleSupport.heatRules.startup',
      'ruleSupport.heatRules.ammo-explosion-risk',
      'ruleSupport.heatRules.heat-induced-ammo-explosion',
      'ruleSupport.heatRules.pilot-heat-damage',
      'ruleSupport.heatRules.maxtech-pilot-heat-damage',
      'ruleSupport.heatRules.maxtech-heat-critical-damage',
    ]);
  });

  it('keeps heat-driven modifiers separate from core heat lifecycle coverage', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Some Like It Hot'),
    });
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers'].gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers']
        .supportMapRefs,
    ).toEqual([
      'featureSupport.pilotAbilities.hot-dog',
      'featureSupport.pilotAbilities.some-like-it-hot',
      'featureSupport.mechQuirks.improved_cooling',
      'featureSupport.mechQuirks.poor_cooling',
      'featureSupport.mechQuirks.no_cooling',
      'pilotSkills.pilotModifierResolvers.heat-application',
    ]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[
        'heat-driven-modifiers'
      ].supportMapRefs.filter((ref) => resolveSupportRef(ref) === undefined),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle']
        .supportMapRefs,
    ).not.toContain('pilotSkills.pilotModifierResolvers.heat-application');
  });

  it('backs range requirements with every range bracket support row', () => {
    expect(
      missingRefsForRequirement(
        'range-validation',
        'ruleSupport',
        'rangeBrackets',
        RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['range-validation']
        .supportMapRefs,
    ).toContain('ruleSupport.toHitModifiers.minimum-range');
  });

  it('backs attack invalidation requirements with every invalidation support row', () => {
    expect(
      missingRefsForRequirement(
        'attack-invalidation',
        'invalidation',
        'attackReasons',
        ATTACK_INVALIDATION_REASON_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'attack-invalidation',
        'invalidation',
        'invalidTargetStates',
        INVALID_TARGET_STATE_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'attack-invalidation',
        'invalidation',
        'invalidAttackSideEffects',
        ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs to-hit requirements with every to-hit modifier support row', () => {
    expect(
      missingRefsAcrossRequirements(
        ['to-hit-core-modifiers', 'to-hit-advanced-modifiers'],
        'ruleSupport',
        'toHitModifiers',
        RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs official-ammo claims with every ammunition compatibility support row', () => {
    const officialAmmoRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-ammo'];

    expect(officialAmmoRequirement).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'split every remaining empty-compatible row',
      ),
    });
    expect(officialAmmoRequirement.evidence).toContain(
      'without unofficial weapon, alias, ammo-id, or static-BV fallback',
    );
    expect(officialAmmoRequirement.gap).toBeUndefined();
    expect(officialAmmoRequirement.supportMapRefs).toEqual(
      expect.arrayContaining([
        'featureSupport.ammunitionCompatibility.battlemech-compatible-ammo',
        'featureSupport.ammunitionCompatibility.duplicate-runtime-id',
        'featureSupport.ammunitionCompatibility.battlemech-ammo-missing-compatible-weapon-refs',
        'featureSupport.ammunitionCompatibility.experimental-empty-compatible-row',
        'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
        'featureSupport.ammunitionCompatibility.unofficial-empty-compatible-row',
      ]),
    );
    expect(officialAmmoRequirement.supportMapRefs).not.toContain(
      'featureSupport.ammunitionCompatibility.nonstandard-empty-compatible-row',
    );
    expect(
      missingRefsForRequirement(
        'official-ammo',
        'featureSupport',
        'ammunitionCompatibility',
        AMMUNITION_COMPATIBILITY_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs movement requirements with every movement and movement-enhancement support row', () => {
    expect(
      missingRefsForRequirement(
        'movement-actions',
        'ruleSupport',
        'movementRules',
        MOVEMENT_RULE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'movement-enhancements',
        'ruleSupport',
        'movementEnhancements',
        MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs terrain requirements with every terrain support row', () => {
    expect(
      missingRefsForRequirement(
        'terrain-movement-los-cover',
        'ruleSupport',
        'terrainTypeMovement',
        TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-movement-los-cover',
        'ruleSupport',
        'terrainTypeLos',
        TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainEnvironment',
        TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainTypeAttackModifiers',
        TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainTypeHeat',
        TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'terrain-environment-modifiers',
        'ruleSupport',
        'terrainTypePsr',
        TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs pilot skill requirements with every pilot skill support row', () => {
    const pilotSkillRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['pilot-skills'];

    expect(pilotSkillRequirement).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'exact official command-console producer id hydration',
      ),
    });
    expect(pilotSkillRequirement.gap).toBeUndefined();
    expect(pilotSkillRequirement.evidence).toContain(
      'represented Heavy Lifter carry-object capacity checks',
    );
    expect(pilotSkillRequirement.evidence).toContain(
      'represented Heavy Lifter throw-release action resolution',
    );
    expect(pilotSkillRequirement.evidence).toContain(
      'represented Heavy Lifter ground-object weight gates',
    );
    expect(pilotSkillRequirement.evidence).toContain(
      'represented Heavy Lifter pickup/drop lifecycle',
    );
    expect(pilotSkillRequirement.supportMapRefs).toContain(
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
    );
    expect(pilotSkillRequirement.supportMapRefs).toContain(
      'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
    );
    expect(
      missingRefsForRequirement(
        'pilot-skills',
        'pilotSkills',
        'pilotSkillUse',
        PILOT_SKILL_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs SPA and quirk requirements with every support row', () => {
    const catalogRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['spa-quirk-catalog'];
    const resolverRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[
        'spa-quirk-resolver-application'
      ];

    expect(catalogRequirement).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('canonical SPA catalog boundary'),
    });
    expect(catalogRequirement.gap).toBeUndefined();
    expect(catalogRequirement.evidence).toContain(
      'represented Comm Implant and Boosted Comm Implant indirect-fire LOS spotter relief',
    );
    expect(catalogRequirement.evidence).toContain(
      'represented Boosted Comm Implant C3i network state',
    );
    expect(catalogRequirement.supportMapRefs).toEqual(
      expect.arrayContaining([
        'featureSupport.canonicalPilotAbilityScope.eagle_eyes',
        'featureSupport.canonicalPilotAbilityScope.env_specialist',
        'featureSupport.canonicalPilotAbilityScope.tm_nightwalker',
        'featureSupport.canonicalPilotAbilityScope.dermal_armor',
        'featureSupport.canonicalPilotAbilityScope.tsm_implant',
        'featureSupport.canonicalPilotAbilityScope.vdni',
        'featureSupport.canonicalPilotAbilityScope.bvdni',
      ]),
    );
    expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.zweihander (helper-only)',
    );
    expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.triple_core_processor (helper-only)',
    );
    expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.vdni (helper-only)',
    );
    expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.bvdni (helper-only)',
    );
    expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.tm_nightwalker (helper-only)',
    );
    expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.proto_dni (unsupported)',
    );
    expect(resolverRequirement).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'exact official command-console producer ids',
      ),
    });
    expect(resolverRequirement.gap).toBeUndefined();
    expect(resolverRequirement.evidence).toContain(
      'Maneuvering Ace BattleMech lateral movement',
    );
    expect(resolverRequirement.evidence).toContain(
      'Nightwalker represented low-light movement',
    );
    expect(resolverRequirement.evidence).toContain(
      'Heavy Lifter lift-capacity, carry-object capacity-check helper math, ground-object weight gates, pickup/drop lifecycle, and bounded throw-object action resolution through throw-release lifecycle',
    );
    expect(resolverRequirement.evidence).toContain(
      'represented active-probe ECM-counter range slice',
    );
    expect(resolverRequirement.evidence).toContain(
      'represented minefield detonation target-number relief for Eagle Eyes',
    );
    expect(resolverRequirement.evidence).toContain(
      'represented PSR target-number rows',
    );
    expect(resolverRequirement.evidence).toContain(
      'represented Environmental Specialist Fog/Snow/Rain/Wind/Light ranged and Light physical to-hit behavior',
    );
    expect(resolverRequirement.evidence).toContain('V.D.N.I. piloting relief');
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.evidence).toContain(
      'represented minefield entry rolls apply the Eagle Eyes +2 detonation target-number relief',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.gap).toBeUndefined();
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('prevents represented minefield detonation'),
      ]),
    );
    expect(resolverRequirement.supportMapRefs).toEqual(
      expect.arrayContaining([
        'pilotSkills.pilotModifierResolvers.initiative-application',
        'pilotSkills.pilotModifierResolvers.initiative-hq-equipment-hydration',
        'pilotSkills.pilotModifierResolvers.initiative-command-console-hydration',
        'pilotSkills.pilotModifierResolvers.initiative-equipment-producer-hydration',
        'pilotSkills.pilotModifierResolvers.triple-core-processor-aimed-shot-application',
        'pilotSkills.pilotModifierResolvers.triple-core-processor-initiative-application',
        'pilotSkills.pilotModifierResolvers.physical-to-hit-application',
        'pilotSkills.pilotModifierResolvers.movement-application',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-controlled-sideslip-producer-application',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-lift-capacity-application',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-lateral-movement-application',
        'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
        'pilotSkills.pilotModifierResolvers.eagle-eyes-active-probe-range-application',
        'pilotSkills.pilotModifierResolvers.eagle-eyes-minefield-detonation-application',
        'pilotSkills.pilotModifierResolvers.nightwalker-light-movement-application',
        'pilotSkills.pilotModifierResolvers.dermal-armor-head-hit-pilot-damage-suppression',
        'pilotSkills.pilotModifierResolvers.dfa-miss-bioware-pilot-damage-avoidance',
        'pilotSkills.pilotModifierResolvers.vdni-bvdni-ranged-to-hit-application',
        'pilotSkills.pilotModifierResolvers.vdni-piloting-target-number-application',
        'pilotSkills.pilotModifierResolvers.proto-dni-ranged-to-hit-application',
        'pilotSkills.pilotModifierResolvers.proto-dni-piloting-target-number-application',
        'pilotSkills.pilotModifierResolvers.psr-spa-target-number-application',
        'pilotSkills.pilotModifierResolvers.sandblaster-application',
        'pilotSkills.pilotModifierResolvers.sandblaster-rate-of-fire-application',
        'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application',
      ]),
    );
    expect(blockingSupportRefsForRequirement(resolverRequirement)).toEqual([]);
    expect(blockingSupportRefsForRequirement(resolverRequirement)).toEqual(
      expect.not.arrayContaining([
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application (helper-only)',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application (integrated)',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application (out-of-scope)',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application (integrated)',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application (integrated)',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application (integrated)',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application (integrated)',
        'pilotSkills.pilotModifierResolvers.heavy-lifter-lift-capacity-application (integrated)',
        'pilotSkills.pilotModifierResolvers.maneuvering-ace-lateral-movement-application (integrated)',
        'pilotSkills.pilotModifierResolvers.nightwalker-light-movement-application (integrated)',
        'pilotSkills.pilotModifierResolvers.psr-spa-target-number-application (integrated)',
        'pilotSkills.pilotModifierResolvers.vdni-piloting-target-number-application (integrated)',
        'pilotSkills.pilotModifierResolvers.proto-dni-piloting-target-number-application (integrated)',
        'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application (integrated)',
      ]),
    );
    expect(
      missingRefsForRequirement(
        'spa-quirk-catalog',
        'featureSupport',
        'pilotAbilities',
        SPA_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'spa-quirk-catalog',
        'featureSupport',
        'canonicalPilotAbilityScope',
        CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'spa-quirk-catalog',
        'featureSupport',
        'mechQuirks',
        QUIRK_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'spa-quirk-resolver-application',
        'pilotSkills',
        'pilotModifierResolvers',
        PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs damage and death requirements with every damage support row', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-resolution'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['pilot-damage-death'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ammo-explosion pilot damage'),
    });
    expect(
      missingRefsForRequirement(
        'damage-resolution',
        'damageAndDeath',
        'damageResolution',
        DAMAGE_RESOLUTION_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'damage-resolution',
        'damageAndDeath',
        'destructionCauses',
        DESTRUCTION_CAUSE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'pilot-damage-death',
        'damageAndDeath',
        'pilotDamage',
        PILOT_DAMAGE_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs critical-effect requirements with every critical support row', () => {
    const criticalEffectsRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['critical-effects'];

    expect(criticalEffectsRequirement.level).toBe('integrated');
    expect(criticalEffectsRequirement.gap).toBeUndefined();
    expect(criticalEffectsRequirement.evidence).toContain(
      'empty tracked ammo-bin no-explosion',
    );
    expect(criticalEffectsRequirement.evidence).toContain(
      'generic equipment-destroyed replay',
    );
    expect(criticalEffectsRequirement.evidence).toContain(
      'represented active-probe critical replay',
    );
    expect(criticalEffectsRequirement.evidence).toContain(
      'represented Artemis FCS critical-damage guidance removal replay',
    );
    expect(criticalEffectsRequirement.evidence).toContain(
      'Extended Fuel Tank explosion replay',
    );
    expect(criticalEffectsRequirement.evidence).toContain(
      'out-of-scope rows rather than BattleMech equipment-critical blockers',
    );
    expect(criticalEffectsRequirement.supportMapRefs).toEqual(
      expect.arrayContaining([
        'damageAndDeath.criticalComponents.equipment',
        'damageAndDeath.criticalSlotEffects.equipment',
        ...UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
        ...UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
        'damageAndDeath.criticalComponents.equipment-active-probe',
        'damageAndDeath.criticalSlotEffects.equipment-active-probe',
        'damageAndDeath.criticalComponents.equipment-explosive-equipment',
        'damageAndDeath.criticalSlotEffects.equipment-explosive-equipment',
        'damageAndDeath.criticalComponents.equipment-blue-shield-explosion',
        'damageAndDeath.criticalSlotEffects.equipment-blue-shield-explosion',
        'damageAndDeath.criticalComponents.equipment-prototype-improved-jump-jet-explosion',
        'damageAndDeath.criticalSlotEffects.equipment-prototype-improved-jump-jet-explosion',
        'damageAndDeath.criticalComponents.equipment-extended-fuel-tank-explosion',
        'damageAndDeath.criticalSlotEffects.equipment-extended-fuel-tank-explosion',
        'damageAndDeath.criticalComponents.equipment-artemis-fcs-critical-lifecycle',
        'damageAndDeath.criticalSlotEffects.equipment-artemis-fcs-critical-lifecycle',
      ]),
    );
    expect(
      blockingSupportRefsForRequirement(criticalEffectsRequirement),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'critical-effects',
        'damageAndDeath',
        'criticalComponents',
        CRITICAL_COMPONENT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'critical-effects',
        'damageAndDeath',
        'criticalSlotEffects',
        CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'critical-slot-hydration',
        'damageAndDeath',
        'criticalSlotHydration',
        CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs PSR requirements with every PSR support row', () => {
    const psrTriggerRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['psr-trigger-catalog'];

    expect(psrTriggerRequirement).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('named active run/sprint'),
    });
    expect(psrTriggerRequirement.evidence).toContain(
      'standard, alternate_masc, and alternate_masc_enhanced',
    );
    expect(psrTriggerRequirement.gap).toBeUndefined();
    expect(
      missingRefsForRequirement(
        'psr-resolution',
        'lifecycleAndPsr',
        'psrResolution',
        PSR_RESOLUTION_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      missingRefsForRequirement(
        'psr-trigger-catalog',
        'lifecycleAndPsr',
        'psrTriggers',
        RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs lifecycle requirements with every action-eligibility support row', () => {
    expect(
      missingRefsAcrossRequirements(
        [
          'turn-rotation-removal',
          'targetability-lifecycle',
          'ejection-lifecycle',
          'retreat-withdrawal',
          'objective-terminal-state',
        ],
        'lifecycleAndPsr',
        'actionEligibility',
        ACTION_ELIGIBILITY_COMBAT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs lifecycle, PSR, objective, and parity claims with every representative scenario row', () => {
    expect(
      missingRefsAcrossRequirements(
        [
          'turn-rotation-removal',
          'targetability-lifecycle',
          'ejection-lifecycle',
          'psr-resolution',
          'objective-terminal-state',
          'runner-interactive-parity',
        ],
        'parityAndIntegration',
        'representativeScenarios',
        COMBAT_INTEGRATION_SCENARIO_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs runner-interactive parity claims with every parity support row', () => {
    expect(
      missingRefsForRequirement(
        'runner-interactive-parity',
        'parityAndIntegration',
        'runnerInteractiveParity',
        RUNNER_INTERACTIVE_PARITY_SUPPORT,
      ),
    ).toEqual([]);
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['runner-interactive-parity']
        .supportMapRefs,
    ).toEqual([
      ...supportRefs(
        'parityAndIntegration',
        'runnerInteractiveParity',
        RUNNER_INTERACTIVE_PARITY_SUPPORT,
      ),
      'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
    ]);
  });

  it('backs event-stream scope with every BattleMech event row', () => {
    expect(
      missingRefsForRequirement(
        'event-stream',
        'eventStream',
        'battleMechCombatEvents',
        BATTLEMECH_COMBAT_EVENT_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs non-BattleMech event scope with every out-of-scope event row', () => {
    expect(
      missingRefsForRequirement(
        'non-battlemech-scope',
        'eventStream',
        'nonBattleMechEventScope',
        NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs validation-scope requirements with every scope support row', () => {
    expect(
      missingRefsAcrossRequirements(
        [
          'official-ranged-weapons',
          'official-physical-weapons',
          'official-ammo',
          'fallback-prevention',
          'damage-string-hazards',
          'known-limitation-audit',
          'non-battlemech-scope',
        ],
        'validationScope',
        'knownLimitationsAndScope',
        BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
      ),
    ).toEqual([]);
  });

  it('backs physical-core claims with every source-checked physical legality gate row', () => {
    const physicalCoreRefs = new Set(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .supportMapRefs,
    );
    const missingLegalityGateRefs = Object.keys(
      PHYSICAL_LEGALITY_GATE_SUPPORT,
    ).flatMap((id) => {
      const ref = `ruleSupport.physicalLegalityGates.${id}`;
      return physicalCoreRefs.has(ref) ? [] : [ref];
    });

    expect(missingLegalityGateRefs).toEqual([]);
  });

  it('does not mark requirements integrated when their evidence refs are still gaps', () => {
    const overclaims = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    ).flatMap((requirement) =>
      requirement.level === 'integrated'
        ? requirement.supportMapRefs.flatMap((ref) => {
            const support = resolveSupportRef(ref);
            return support &&
              support.level !== 'integrated' &&
              support.level !== 'out-of-scope'
              ? [`${requirement.id} -> ${ref} (${support.level})`]
              : [];
          })
        : [],
    );

    expect(overclaims).toEqual([]);
  });

  it('pins the aggregate helper-only requirements that still represent broad gaps', () => {
    const helperOnlyRequirementIds = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    )
      .filter((entry) => entry.level === 'helper-only')
      .map((entry) => entry.id)
      .sort();

    expect(helperOnlyRequirementIds).toEqual(
      [...EXPECTED_HELPER_ONLY_REQUIREMENT_IDS].sort(),
    );
  });

  it('keeps requirements helper-only while referenced support rows still block completion', () => {
    const overclaims = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    ).flatMap((requirement) => {
      const blockingRefs = blockingSupportRefsForRequirement(requirement);

      return blockingRefs.length > 0 && requirement.level !== 'helper-only'
        ? [`${requirement.id} -> ${blockingRefs.join(', ')}`]
        : [];
    });

    expect(overclaims).toEqual([]);
  });

  it('anchors every exported helper-only objective gap to concrete support blockers', () => {
    const objectiveRequirementIds = getCombatValidationUnresolvedRefs()
      .filter((ref) => ref.startsWith(OBJECTIVE_REQUIREMENT_REF_PREFIX))
      .map(
        (ref) =>
          ref.slice(
            OBJECTIVE_REQUIREMENT_REF_PREFIX.length,
          ) as keyof typeof BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
      );

    const unanchoredObjectiveGaps = objectiveRequirementIds.flatMap(
      (requirementId) => {
        const requirement =
          BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId];
        const blockingRefs = blockingSupportRefsForRequirement(requirement);

        return requirement.level === 'helper-only' && blockingRefs.length === 0
          ? [`${requirement.id} -> no helper-only/unsupported supportMapRefs`]
          : [];
      },
    );
    const blockersByRequirement = Object.fromEntries(
      objectiveRequirementIds.map((requirementId) => {
        const requirement =
          BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId];

        return [requirementId, blockingSupportRefsForRequirement(requirement)];
      }),
    );

    expect(unanchoredObjectiveGaps).toEqual([]);
    expect(blockersByRequirement).toEqual({});
  });

  it('keeps objective aggregate rows integrated after leaf blockers close', () => {
    const aggregateGapText = Object.values(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    )
      .filter((entry) => entry.level === 'helper-only')
      .map((entry) => `${entry.id}: ${entry.gap}`)
      .join('\n');

    expect(aggregateGapText).toBe('');
    expect(aggregateGapText).not.toContain(
      'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .gap,
    ).toBeUndefined();
    expect(aggregateGapText).not.toContain('terrain LOS leaf blocker');
    expect(aggregateGapText).not.toContain('explicit minefield branch rows');
    expect(aggregateGapText).not.toContain('and exact minefield branch rows');
    expect(aggregateGapText).not.toContain(
      'blocked by exactly ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
    );
    expect(aggregateGapText).not.toContain(
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-step-out-cfr',
    );
    expect(aggregateGapText).not.toContain(
      'forced domino fallback helper chain',
    );
    expect(aggregateGapText).not.toContain(
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-terrain-building-environment-fallout',
    );
    expect(aggregateGapText).not.toContain('explicit equipment branch rows');
    expect(aggregateGapText).not.toContain(
      'one explicit Artemis residual leaf row',
    );
    for (const ref of UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS) {
      expect(aggregateGapText).not.toContain(ref);
    }
    expect(aggregateGapText).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle is now a split-accounting row',
    );
    expect(aggregateGapText).not.toContain(
      'remaining non-Extended-Fuel-Tank fuel/incendiary branches',
    );
    expect(aggregateGapText).not.toContain(
      'engine-variant/coolant sprint heat',
    );
    expect(aggregateGapText).not.toContain('full minefield variant modifiers');
    expect(aggregateGapText).not.toContain(
      'Remaining movement-related blocker is the aggregate movement-application row',
    );
    expect(aggregateGapText).not.toContain('non-initiative helper-only');
    expect(aggregateGapText).not.toContain('Several family-specific mechanics');
  });

  it('keeps special weapon family aggregate blockers scoped to live unsupported rows', () => {
    const specialWeaponFamiliesRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['special-weapon-families'];

    expect(specialWeaponFamiliesRequirement.level).toBe('integrated');
    expect(specialWeaponFamiliesRequirement.evidence).toContain(
      'whole-catalog non-torpedo Artemis FCS allocation audit coverage',
    );
    expect(
      blockingSupportRefsForRequirement(specialWeaponFamiliesRequirement),
    ).toEqual([]);
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.artemis-fcs-critical-lifecycle',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
    );
    for (const ref of UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS) {
      expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(ref);
    }
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-target-identity-lifecycle',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-target-option-deduplication',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-target-selection',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-helper-removal-lifecycle',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-turn-reset-lifecycle',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-removal-lifecycle',
    );
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
      'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
    );
    expect(
      resolveSupportRef(
        'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
      )?.level,
    ).toBe('out-of-scope');
    expect(
      resolveSupportRef(
        'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
      )?.level,
    ).toBe('integrated');
    expect(specialWeaponFamiliesRequirement.gap).toBeUndefined();
  });

  it('keeps explicit gap categories visible instead of treating the goal as complete', () => {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-ammo'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-physical-weapons']
        .level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-physical-weapons']
        .evidence,
    ).toContain('modifier-only equipment');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-string-hazards'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers'].level,
    ).toBe('integrated');
    const movementEnhancementRequirement =
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-enhancements'];
    const movementEnhancementSidePathRefs = [
      'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
      'ruleSupport.movementEnhancements.masc-side-paths',
      'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
      'ruleSupport.movementEnhancements.supercharger-side-paths',
      'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
    ] as const;

    expect(movementEnhancementRequirement.level).toBe('integrated');
    expect(movementEnhancementRequirement.evidence).toContain(
      'represented BattleMech MASC/Supercharger side-path accounting rows',
    );
    expect(movementEnhancementRequirement.evidence).toContain(
      'standard plus alternate_masc and alternate_masc_enhanced',
    );
    expect(movementEnhancementRequirement.evidence).toContain(
      'named failure trigger stamping',
    );
    expect(movementEnhancementRequirement.evidence).toContain(
      'non-BattleMech Supercharger support-unit roll adjustment plus vehicle motive-damage branches',
    );
    expect(movementEnhancementRequirement.gap).toBeUndefined();
    expect(movementEnhancementRequirement.supportMapRefs).toEqual(
      expect.arrayContaining([
        'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
        'ruleSupport.movementEnhancements.masc-side-paths',
        'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
        'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
        'ruleSupport.movementEnhancements.supercharger-side-paths',
      ]),
    );
    expect(
      Object.fromEntries(
        movementEnhancementSidePathRefs.map((ref) => [
          ref,
          resolveSupportRef(ref)?.level,
        ]),
      ),
    ).toEqual({
      'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths':
        'integrated',
      'ruleSupport.movementEnhancements.masc-side-paths': 'integrated',
      'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths':
        'integrated',
      'ruleSupport.movementEnhancements.supercharger-side-paths': 'integrated',
      'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths':
        'out-of-scope',
    });
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .gap,
    ).toBeUndefined();
    for (const ref of UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS) {
      expect(
        BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
          .gap,
      ).toContain(ref);
    }
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented same-building building-hex LOS blocking');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented same-building endpoint elevation-difference');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented building-height LOS blocking');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented grounded DropShip level-10 entity LOS cover');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('no exact terrain LOS leaf blocker remains');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented underwater clear/non-water depth-0 LOS blocking');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented underwater endpoint-height/minimum-depth');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented single-path pure elevation LOS blocking');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented divided-path pure elevation LOS blocking');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .evidence,
    ).toContain('represented divided LOS side-path blocking');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'ruleSupport.terrainEnvironment.terrain-los-same-building-hex-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-same-building-level-count',
        'ruleSupport.terrainEnvironment.terrain-los-building-height-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-underwater-clear-hex-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-divided-side-path-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-divided-elevation-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-intervening-elevation-blocking',
        'ruleSupport.terrainEnvironment.terrain-los-side-paths',
        ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain('represented TerrainType.Mines BattleMech entry damage');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain('represented battle-wide IGameState.minefields');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain(
      'represented minefield add/set/reset/remove/clear/detect/detonate',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain(
      'represented manual conventional and command-detonated minefield detonation controls',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain('represented clearing/sweeper/reset events');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain(
      'represented typed non-conventional minefield no-fallback guards',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain('represented EMP no-effect/interference/shutdown outcomes');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain('hidden conventional minefield detection/reveal state');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain(
      'represented typed non-conventional minefield no-fallback guards',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .evidence,
    ).toContain(
      'represented conventional/inferno/active/EMP density-decrement behavior',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
        'ruleSupport.terrainEnvironment.terrain-los-side-paths',
        ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
        ...UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
        'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-entry-damage',
        'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-lifecycle',
        'ruleSupport.terrainEnvironment.minefield-represented-manual-conventional-detonation',
        'ruleSupport.terrainEnvironment.minefield-clearing-sweeper-collateral-reset',
        'ruleSupport.terrainEnvironment.minefield-represented-movement-detonation-event',
        'ruleSupport.terrainEnvironment.minefield-represented-density-trigger-target',
        'ruleSupport.terrainEnvironment.minefield-represented-density-reduction',
        'ruleSupport.terrainEnvironment.minefield-represented-active-ground-suppression',
        'ruleSupport.terrainEnvironment.minefield-represented-inferno-entry-heat',
        'ruleSupport.terrainEnvironment.minefield-represented-non-conventional-type-guard',
        'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain(
      'represented minefield fallout when physical displacement lands a BattleMech in existing TerrainType.Mines',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('represented detonated coordinate suppression');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('represented Environmental Specialist Light physical to-hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('represented carried-cargo arm-dependent lockout');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('represented domino step-out/CFR payload decisions');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-minefield-fallout',
        'ruleSupport.physicalLegalityGates.shared.carried-cargo-arm-lockout',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('occupied-hex domino positional displacement cascades');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('DominoEffect PSRs');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('DFA-miss friendly occupied displacement avoidance');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('runtime-hydrated grounded DropShip radius-two DFA hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('GamePhase.PhysicalAttack mine damage');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('already-detonated coordinate suppression');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
    ).toContain('successful blockers without forced DominoEffect PSRs');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'lifecycleAndPsr.psrTriggers.domino_effect',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-positional-chain',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-minefield-fallout',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-chain',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
        ...UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
        ...OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
        'ruleSupport.physicalLegalityGates.shared.displacement-friendly-avoidance',
        'ruleSupport.physicalLegalityGates.shared.displacement-dropship-radius',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions']
        .level,
    ).toBe('out-of-scope');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions'].gap,
    ).toContain('source-construction/editor authoring');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions'].gap,
    ).toContain('non-BattleMech physical weapon families');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'featureSupport.physicalWeapons.claws',
        'featureSupport.physicalWeapons.talons',
        'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
        'ruleSupport.physicalDamageModifiers.claw-physical-critical-production',
        'ruleSupport.physicalDamageModifiers.claw-represented-equipment-cleanup',
        'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
        'ruleSupport.physicalDamageModifiers.talon-physical-critical-production',
        'ruleSupport.physicalDamageModifiers.talon-represented-equipment-cleanup',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[
        'spa-quirk-resolver-application'
      ].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].level,
    ).toBe('out-of-scope');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].gap,
    ).toContain('Non-BattleMech');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior']
        .level,
    ).toBe('out-of-scope');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior'].gap,
    ).toContain('outside BattleMech combat runner validation scope');
  });

  it('keeps source-backed movement action support explicit with remaining side-path gaps', () => {
    const evadeRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
        'movement.evade'
      ].sourceRefs ?? [];
    const sprintRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
        'movement.sprint'
      ].sourceRefs ?? [];
    const torsoTwistActionRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
        'facing.torso-twist'
      ].sourceRefs ?? [];
    const torsoTwistRuleRefs =
      BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.movementRules[
        'torso-twist'
      ].sourceRefs ?? [];

    expect(evadeRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TacOps Evade'),
        expect.stringContaining('MoveStepType defines EVADE'),
        expect.stringContaining('getEvasionBonus'),
        expect.stringContaining('target evasion bonus'),
        expect.stringContaining('evading attackers from firing'),
      ]),
    );
    expect(sprintRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('MoveStep.canUseSprint'),
        expect.stringContaining('Mek.getSprintMP'),
        expect.stringContaining('Mek.getSprintHeat'),
        expect.stringContaining('attacks by sprinting attackers'),
        expect.stringContaining('target sprinted'),
      ]),
    );
    expect(torsoTwistActionRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TorsoTwistAction'),
        expect.stringContaining('secondary facing'),
        expect.stringContaining('ComputeArc'),
      ]),
    );
    expect(torsoTwistRuleRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entity.setSecondaryFacing'),
        expect.stringContaining('Mek.canChangeSecondaryFacing'),
        expect.stringContaining('Mek.isValidSecondaryFacing'),
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).not.toContain('actions.absentActionSurfaces.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.movement.sprint');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).not.toContain('actions.absentActionSurfaces.movement.sprint');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.facing.torso-twist');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
        .supportMapRefs,
    ).toEqual(
      expect.arrayContaining([
        'actions.gameIntents.torsoTwist',
        'actions.wireIntents.TorsoTwist',
        'actions.p2pIntents.torsoTwist',
      ]),
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].level,
    ).toBe('integrated');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].evidence,
    ).toContain('named MASC/Supercharger failure trigger stamping');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).toContain('actions.tacticalCommands.movement.sprint');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).toContain('ruleSupport.toHitModifiers.c3-equipment-denial-boundaries');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).toContain(
      'ruleSupport.toHitModifiers.c3-equipment-independent-side-formation',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).not.toContain('actions.absentActionSurfaces.movement.evade');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .supportMapRefs,
    ).not.toContain('actions.absentActionSurfaces.movement.sprint');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .evidence,
    ).toContain('ranged and physical to-hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .evidence,
    ).toContain(
      'split out of the BattleMech runtime to-hit validation blocker set',
    );
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
        .gap,
    ).toBeUndefined();
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('target-evasion physical to-hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .evidence,
    ).toContain('represented Environmental Specialist Light physical to-hit');
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
        .supportMapRefs,
    ).toContain(
      'ruleSupport.physicalLegalityGates.shared.carried-cargo-arm-lockout',
    );
  });
});
