import type {
  AmmoCompatibilityGapClass,
  AmmoCompatibilitySupportId,
  ArtemisFcsKind,
  IAmmoCatalogEntry,
  IBattleMechUnitIndexEntry,
  IBattleMechUnitIndexFile,
  ICatalogFile,
  ICatalogWeaponStats,
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
  IFullUnit,
  IUnitEquipmentEntry,
  IViolation,
  PinnedBattleMechAmmoGapClass,
  PinnedScopeSplitAmmoGapClass,
} from './battlemechCombatCatalog.test-helpers';

import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  AMMUNITION_CATALOG_FILES,
  AMMUNITION_COMPATIBILITY_SUPPORT,
  BATTLEMECH_COMBAT_VALIDATION_INVARIANT,
  CANONICAL_SPA_CATALOG,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  ELECTRONICS_CATALOG_FILES,
  EXPECTED_BATTLEMECH_AMMO_GAP_IDS,
  EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS,
  EXPECTED_DESIGNATOR_DEFENSIVE_SPECIAL_FAMILY_IDS,
  EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS,
  EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS,
  EXPECTED_SCOPE_SPLIT_AMMO_GAP_IDS,
  EXPECTED_STREAK_WEAPON_FAMILY_IDS,
  EXPECTED_STRING_DAMAGE_RESOLUTIONS,
  EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS,
  EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS,
  GAME_INTENT_TYPES,
  GameEventType,
  GamePhase,
  GameSide,
  HEAT_RULE_COMBAT_SUPPORT,
  KNOWN_LIMITATION_CATEGORY_IDS,
  KNOWN_LIMITATION_VALIDATION_TRAPS,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  MISCELLANEOUS_CATALOG_FILES,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_DEFINITIONS,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  MovementEnhancementType,
  PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
  PHYSICAL_WEAPON_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  PINNED_MEGAMEK_CATALOG_SOURCE_VERSIONS,
  PROTOMECH_PROTO_MACHINE_GUN_AMMO_IDS,
  PSRTrigger,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  QUIRK_CATALOG,
  QUIRK_COMBAT_SUPPORT,
  RUNNER_INTERACTIVE_PARITY_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  SPA_CATALOG,
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_TYPE_MOVEMENT_COVERAGE,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS,
  UNSUPPORTED_ROTARY_AC_10_20_AMMO_ID_SET,
  UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS,
  WEAPON_CATALOG_FILES,
  WEAPON_DATABASE,
  allWeaponCatalogItems,
  ammoCompatibilityGapClass,
  ammoIdsByGapClass,
  ammoItems,
  ammunitionCatalogFiles,
  artemisFcsCountAtLocation,
  artemisFcsKindFromCatalogText,
  artemisFcsSystemCount,
  auditOfficialUnitArtemisLocation,
  buildUtilityCommands,
  buildWeaponLookupFromCatalogFiles,
  consumeAmmo,
  countBy,
  countCompatibleArtemisLaunchersAtLocation,
  createMinimalUnitState,
  createUnitEjectedEvent,
  criticalSlotTextsForLocation,
  electronicsCatalogFiles,
  electronicsItems,
  equipmentArtemisFcsCountAtLocation,
  expectHeatRuleSourceRefsPinned,
  expectPinnedMegaMekRefs,
  expectSourceBackedToHitModifiersPinned,
  familyItems,
  flattenItems,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
  getLimitationPatternCategory,
  getSPADefinition,
  getTotalAmmo,
  getWeaponData,
  hasAmmoForWeapon,
  hasArtemisCapableAmmo,
  hasSupportedArtemisAllocation,
  hydrateAmmoStateFromFullUnit,
  ids,
  initializeAmmoState,
  isAMS,
  isAmmoEntry,
  isArtemisCompatibleWeapon,
  isKnownLimitation,
  isLBXAC,
  isNarc,
  isPhysicalWeapon,
  isPinnedCatalogSourceRef,
  isRangedWeapon,
  isRotaryAC,
  isStreakSRM,
  isStringDamageWeapon,
  isTAG,
  isTorpedoSlotText,
  isUltraAC,
  itemText,
  join,
  miscellaneousCatalogFiles,
  miscellaneousItems,
  normalizeCriticalSlotTextForCatalogTest,
  normalizeEquipmentLocationForCatalogTest,
  officialBattleMechDataPath,
  officialIndex,
  officialUnitArtemisAllocationAudit,
  officialUnitCatalogLocations,
  officialUnitCriticalSlots,
  officialUnitEquipmentEntries,
  physicalWeaponItems,
  rangedWeaponItems,
  readFileSync,
  readOfficialBattleMechUnit,
  readOfficialBattleMechUnitIndex,
  resolveAmmoBV,
  resolveCatalogDamage,
  resolveEquipmentBV,
  resolveSpecialProjectileHit,
  selectWeaponMode,
  shouldSpendAmmoAndHeatOnMiss,
  sortedKeys,
  sourceRefsForHeatRule,
  sourceRefsForToHitModifier,
  supportGaps,
  supportIdsByLevel,
  toAIUnitState,
  toAIWeapon,
  toCatalogAIUnitState,
  verifyStreakBehavior,
  weaponCatalogFiles,
  weaponCatalogIds,
  weaponLookup,
  zeroDamageClassification,
} from './battlemechCombatCatalog.test-helpers';

it('classifies official ammo rows without compatible weapon refs as explicit gaps', () => {
  const ammoClasses: AmmoCompatibilitySupportId[] = ammoItems.map(
    (ammo) => ammoCompatibilityGapClass(ammo) ?? 'battlemech-compatible-ammo',
  );
  const gapClasses = ammoClasses.filter(
    (classification): classification is AmmoCompatibilityGapClass =>
      classification !== 'battlemech-compatible-ammo',
  );
  const ammoCompatibilitySupport: Record<
    AmmoCompatibilitySupportId,
    ICombatFeatureSupportEntry
  > = AMMUNITION_COMPATIBILITY_SUPPORT;
  const untrackedClasses = ammoClasses.filter(
    (classification, index) =>
      ammoClasses.indexOf(classification) === index &&
      ammoCompatibilitySupport[classification] === undefined,
  );

  expect(untrackedClasses).toEqual([]);
  expect(supportGaps(ammoCompatibilitySupport)).toEqual([]);
  expect(ammoCompatibilitySupport['battlemech-compatible-ammo'].level).toBe(
    'integrated',
  );
  expect(
    ammoCompatibilitySupport['battlemech-ammo-missing-compatible-weapon-refs']
      .level,
  ).toBe('integrated');
  expect(
    ammoCompatibilitySupport['unsupported-rotary-ac-10-20-ammo'].level,
  ).toBe('integrated');
  expect({
    'battlemech-ammo-missing-compatible-weapon-refs': ammoIdsByGapClass(
      'battlemech-ammo-missing-compatible-weapon-refs',
    ),
    'unsupported-rotary-ac-10-20-ammo': ammoIdsByGapClass(
      'unsupported-rotary-ac-10-20-ammo',
    ),
    'duplicate-runtime-id': ammoIdsByGapClass('duplicate-runtime-id'),
  }).toEqual(EXPECTED_BATTLEMECH_AMMO_GAP_IDS);
  expect({
    'non-battlemech-aerospace-capital-ammo': ammoIdsByGapClass(
      'non-battlemech-aerospace-capital-ammo',
    ),
    'non-battlemech-battle-armor': ammoIdsByGapClass(
      'non-battlemech-battle-armor',
    ),
    'non-battlemech-protomech': ammoIdsByGapClass('non-battlemech-protomech'),
    'unsupported-aquatic-torpedo-ammo': ammoIdsByGapClass(
      'unsupported-aquatic-torpedo-ammo',
    ),
    'unsupported-artillery-ammo': ammoIdsByGapClass(
      'unsupported-artillery-ammo',
    ),
  }).toEqual(EXPECTED_SCOPE_SPLIT_AMMO_GAP_IDS);
  expect(ammoIdsByGapClass('experimental-empty-compatible-row')).toEqual(
    EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS,
  );
  expect(ammoIdsByGapClass('unofficial-empty-compatible-row')).toEqual(
    EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS,
  );
  const experimentalEmptyCompatibleAmmo = ammoItems.filter(
    (ammo) =>
      ammoCompatibilityGapClass(ammo) === 'experimental-empty-compatible-row',
  );
  const unofficialEmptyCompatibleAmmo = ammoItems.filter(
    (ammo) =>
      ammoCompatibilityGapClass(ammo) === 'unofficial-empty-compatible-row',
  );
  const nonstandardEmptyCompatibleAmmo = [
    ...experimentalEmptyCompatibleAmmo,
    ...unofficialEmptyCompatibleAmmo,
  ];

  expect(experimentalEmptyCompatibleAmmo).toHaveLength(
    EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS.length,
  );
  expect(unofficialEmptyCompatibleAmmo).toHaveLength(
    EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS.length,
  );
  expect(
    nonstandardEmptyCompatibleAmmo.filter(
      (ammo) => ammo.compatibleWeaponIds.length > 0,
    ),
  ).toEqual([]);
  expect(
    experimentalEmptyCompatibleAmmo.every(
      (ammo) => ammo.rulesLevel === 'EXPERIMENTAL',
    ),
  ).toBe(true);
  expect(
    unofficialEmptyCompatibleAmmo.every(
      (ammo) => ammo.rulesLevel === 'UNOFFICIAL',
    ),
  ).toBe(true);
  expect(
    countBy(nonstandardEmptyCompatibleAmmo.map((ammo) => ammo.rulesLevel)),
  ).toEqual({
    EXPERIMENTAL: 39,
    UNOFFICIAL: 101,
  });
  expect(countBy(gapClasses)).toEqual({
    'duplicate-runtime-id': 12,
    'experimental-empty-compatible-row': 39,
    'non-battlemech-aerospace-capital-ammo': 8,
    'non-battlemech-battle-armor': 17,
    'non-battlemech-protomech': 38,
    'unsupported-aquatic-torpedo-ammo': 11,
    'unsupported-artillery-ammo': 9,
    'unsupported-rotary-ac-10-20-ammo': 2,
    'unofficial-empty-compatible-row': 101,
  });
  expect(supportIdsByLevel(ammoCompatibilitySupport, 'helper-only')).toEqual(
    [],
  );
  expect(
    ammoCompatibilitySupport['experimental-empty-compatible-row'].level,
  ).toBe('out-of-scope');
  expect(
    ammoCompatibilitySupport['unofficial-empty-compatible-row'].level,
  ).toBe('out-of-scope');
  expect(
    ammoCompatibilitySupport['experimental-empty-compatible-row'].gap,
  ).toContain('Experimental ammo rules need a separate validation matrix');
  expect(
    ammoCompatibilitySupport['unofficial-empty-compatible-row'].gap,
  ).toContain('Unofficial ammo rules need a separate validation matrix');
  expect(supportIdsByLevel(ammoCompatibilitySupport, 'unsupported')).toEqual(
    [],
  );
  expect(supportIdsByLevel(ammoCompatibilitySupport, 'out-of-scope')).toEqual(
    [
      'non-battlemech-aerospace-capital-ammo',
      'non-battlemech-battle-armor',
      'non-battlemech-protomech',
      'experimental-empty-compatible-row',
      'unsupported-aquatic-torpedo-ammo',
      'unsupported-artillery-ammo',
      'unofficial-empty-compatible-row',
    ].sort(),
  );
  for (const entry of Object.values(ammoCompatibilitySupport)) {
    const sourceRefs = entry.sourceRefs ?? [];

    expect(sourceRefs).not.toHaveLength(0);
    expect(
      sourceRefs.every((sourceRef) => isPinnedCatalogSourceRef(sourceRef)),
    ).toBe(true);
  }
  expect(
    ammoCompatibilitySupport['battlemech-compatible-ammo'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('official ammunition category JSON file'),
      expect.stringContaining('buildAmmoLookupFromCatalogFiles'),
      expect.stringContaining('ammoTracking initializes ammo bin state'),
      expect.stringContaining('pins exact compatible BattleMech ammo ids'),
    ]),
  );
  expect(
    ammoCompatibilitySupport[
      'battlemech-ammo-missing-compatible-weapon-refs'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('pins exact BattleMech ammo gap ids'),
      expect.stringContaining('classifies every official ammo row'),
    ]),
  );
  expect(
    ammoCompatibilitySupport[
      'unsupported-rotary-ac-10-20-ammo'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('pins exact BattleMech ammo gap ids'),
      expect.stringContaining('classifies every official ammo row'),
    ]),
  );
  const officialRotaryACWeaponIds = ids(familyItems(/\bRotary AC\b/i));
  const officialRotaryAC10Or20WeaponIds = ids(
    familyItems(/\bRotary AC\/(?:10|20)\b/i),
  );
  const unsupportedRotaryAmmo = ammoItems.filter(
    (ammo) =>
      ammoCompatibilityGapClass(ammo) === 'unsupported-rotary-ac-10-20-ammo',
  );

  expect(officialRotaryACWeaponIds).toEqual([
    'clan-rac-2',
    'clan-rac-5',
    'rac-2',
    'rac-5',
  ]);
  expect(officialRotaryACWeaponIds).not.toEqual(
    expect.arrayContaining(['rac-10', 'rac-20']),
  );
  expect(officialRotaryAC10Or20WeaponIds).toEqual([]);
  expect(
    unsupportedRotaryAmmo.map((ammo) => ({
      id: ammo.id,
      name: ammo.name,
      compatibleWeaponIds: ammo.compatibleWeaponIds,
      rulesLevel: ammo.rulesLevel,
    })),
  ).toEqual([
    {
      id: 'rotaryac10',
      name: 'Rotary AC/10 Ammo',
      compatibleWeaponIds: [],
      rulesLevel: 'STANDARD',
    },
    {
      id: 'rotaryac20',
      name: 'Rotary AC/20 Ammo',
      compatibleWeaponIds: [],
      rulesLevel: 'STANDARD',
    },
  ]);
});
