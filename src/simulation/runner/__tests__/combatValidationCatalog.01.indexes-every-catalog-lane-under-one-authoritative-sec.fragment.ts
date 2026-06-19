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

it('indexes every catalog lane under one authoritative section map', () => {
  expect(sortedKeys(BATTLEMECH_COMBAT_VALIDATION_CATALOG)).toEqual([
    'actions',
    'damageAndDeath',
    'eventStream',
    'featureSupport',
    'invalidation',
    'lifecycleAndPsr',
    'parityAndIntegration',
    'pilotSkills',
    'ruleSupport',
    'validationScope',
  ]);

  expect(
    Object.values(BATTLEMECH_COMBAT_VALIDATION_CATALOG).every(
      (section) => sortedKeys(section).length > 0,
    ),
  ).toBe(true);
});

it('requires every indexed support entry to carry evidence and explicit gaps when not integrated', () => {
  expect(findMissingEvidenceOrGapRefs()).toEqual([]);
});

it('requires every indexed support entry to carry row-level source references', () => {
  expect(findMissingSourceRefRefs()).toEqual([]);
});
