import type {
  CatalogMapRow,
  CombatValidationCatalogSection,
  CombatValidationSourceRef,
  CombatValidationSupportEntry,
  CombatValidationSupportMap,
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
} from './combatValidationCatalog.test-helpers';

import {
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  CLOSED_EJECTION_COVERAGE_REFS,
  COMBAT_CATALOG_TRIAD_EVIDENCE,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  VALID_SOURCE_KINDS,
  catalogEntryRef,
  catalogMaps,
  entryNeedsEvidenceOrGap,
  entrySourceRefFailures,
  existsSync,
  fileLineCount,
  filterCombatValidationGapRowsByScope,
  findMissingEvidenceOrGapRefs,
  findMissingSourceRefRefs,
  findTriadEvidenceFailures,
  findTriadSectionKeyFailures,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
  hasIntegratedRows,
  isCombatValidationAggregateGapRow,
  join,
  parseLocalSourceAnchor,
  readFileSync,
  sortedKeys,
  sourceRefAnchorFailures,
  sourceRefAuthorityFailures,
  sourceRefMetadataFailures,
  spawnSync,
  supportIds,
  triadEvidenceFailuresForMap,
  triadEvidenceMaps,
  triadSectionMapMatches,
  triadTestRefFailures,
  validateSourceRef,
} from './combatValidationCatalog.test-helpers';

it('classifies source-backed canonical comm implant rows as represented BattleMech behavior', () => {
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.comm_implant',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.boost_comm_implant',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.boost_comm_implant).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented BattleMech C3i network state',
    ),
  });
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.boost_comm_implant.gap,
  ).toBeUndefined();
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.comm_implant).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('represented LOS spotter'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.comm_implant.gap).toBeUndefined();
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.proto_dni',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.proto_dni).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('without inferring VDNI'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.proto_dni.gap).toBeUndefined();
  for (const ref of ['comm_implant', 'boost_comm_implant'] as const) {
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[ref].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
        'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
      ]),
    );
  }
});

it('keeps unresolved leaf mechanic blockers and objective rollups closed', () => {
  const unresolvedRows = getCombatValidationUnresolvedRows();
  const allRows = filterCombatValidationGapRowsByScope(unresolvedRows, 'all');
  const leafRows = filterCombatValidationGapRowsByScope(unresolvedRows, 'leaf');
  const aggregateRows = filterCombatValidationGapRowsByScope(
    unresolvedRows,
    'aggregate',
  );

  expect(allRows).toEqual(unresolvedRows);
  expect(leafRows).toHaveLength(0);
  expect(aggregateRows).toHaveLength(0);
  expect(leafRows.some(isCombatValidationAggregateGapRow)).toBe(false);
  expect(aggregateRows.every(isCombatValidationAggregateGapRow)).toBe(true);
  expect(leafRows.map((row) => row.ref)).toEqual(
    expect.arrayContaining([
      ...UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
      ...UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
      ...UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
      ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
    ]),
  );
  expect(leafRows.map((row) => row.ref)).not.toContain(
    'ruleSupport.terrainEnvironment.terrain-los-side-paths',
  );
  expect(leafRows.map((row) => row.ref)).not.toContain(
    'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
  );
  expect(leafRows.map((row) => row.ref)).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
  );
  expect(leafRows.map((row) => row.ref)).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
  );
  expect(leafRows.map((row) => row.ref)).not.toContain(
    'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
  );
  expect(aggregateRows.map((row) => row.ref)).toEqual([]);
});
