import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
  ICombatFeatureSupportEntry,
  ICombatRequirementSupportEntry,
} from './combatValidationRequirementCatalog.test-helpers';

import {
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
} from './combatValidationRequirementCatalog.test-helpers';

it('turns the active goal requirements into an explicit checklist', () => {
  expect(sortedKeys(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)).toEqual(
    [...EXPECTED_REQUIREMENT_IDS].sort(),
  );
  expect(supportGaps(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT)).toEqual([]);
});

it('indexes the requirement crosswalk through the aggregate catalog', () => {
  expect(
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.validationScope.objectiveRequirements,
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
  const sourceRefs: NonNullable<ICombatRequirementSupportEntry['sourceRefs']> =
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
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].primaryAuthority
      .kind,
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
      Object.keys(support).map((entryId) => `${sectionId}.${mapId}.${entryId}`),
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
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-generation'].supportMapRefs,
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
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].supportMapRefs,
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
    ].supportMapRefs.filter(
      (ref: string) => resolveSupportRef(ref) === undefined,
    ),
  ).toEqual([]);
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].supportMapRefs,
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
