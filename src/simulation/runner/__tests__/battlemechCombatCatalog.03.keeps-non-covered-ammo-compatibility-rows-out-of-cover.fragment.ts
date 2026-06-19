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

it('keeps non-covered ammo compatibility rows out of covered ammo coverage', () => {
  const compatibleAmmoIds = new Set(
    ammoItems
      .filter((ammo) => ammoCompatibilityGapClass(ammo) === null)
      .map((ammo) => ammo.id),
  );
  const emptyCompatibleClassifications = [
    {
      classification: 'experimental-empty-compatible-row',
      expectedIds: EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS,
      rulesLevel: 'EXPERIMENTAL',
    },
    {
      classification: 'unofficial-empty-compatible-row',
      expectedIds: EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS,
      rulesLevel: 'UNOFFICIAL',
    },
  ] satisfies readonly {
    readonly classification:
      | 'experimental-empty-compatible-row'
      | 'unofficial-empty-compatible-row';
    readonly expectedIds: readonly string[];
    readonly rulesLevel: string;
  }[];

  expect(Array.from(compatibleAmmoIds).sort()).toEqual(
    EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS,
  );

  for (const {
    classification,
    expectedIds,
    rulesLevel,
  } of emptyCompatibleClassifications) {
    const supportEntry = AMMUNITION_COMPATIBILITY_SUPPORT[classification];
    const rows = ammoItems
      .filter((ammo) => ammoCompatibilityGapClass(ammo) === classification)
      .sort((left, right) => left.id.localeCompare(right.id));

    expect(supportEntry).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('official compatible BattleMech ammo'),
      gap: expect.stringContaining('separate validation matrix'),
    });
    expect(supportEntry.sourceRefs?.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('guards empty-compatible non-official rows'),
      ]),
    );
    expect(rows.map((ammo) => ammo.id)).toEqual(expectedIds);
    expect(
      rows.map((ammo) => ({
        id: ammo.id,
        compatibleWeaponIds: ammo.compatibleWeaponIds,
        coveredAmmo: compatibleAmmoIds.has(ammo.id),
        rulesLevel: ammo.rulesLevel,
      })),
    ).toEqual(
      expectedIds.map((id) => ({
        id,
        compatibleWeaponIds: [],
        coveredAmmo: false,
        rulesLevel,
      })),
    );
  }

  const unsupportedRotaryAmmo = ammoItems
    .filter(
      (ammo) =>
        ammoCompatibilityGapClass(ammo) === 'unsupported-rotary-ac-10-20-ammo',
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const unsupportedRotaryEntry =
    AMMUNITION_COMPATIBILITY_SUPPORT['unsupported-rotary-ac-10-20-ammo'];
  const unsupportedRotarySourceRefs = unsupportedRotaryEntry.sourceRefs ?? [];
  const unsupportedRotaryMegaMekRefs = unsupportedRotarySourceRefs.filter(
    (sourceRef) => sourceRef.kind === 'megamek-source',
  );
  const unsupportedRotaryDecisionText = [
    unsupportedRotaryEntry.evidence,
    unsupportedRotaryEntry.gap,
    ...unsupportedRotarySourceRefs.map(({ citation }) => citation),
  ].join('\n');

  expect(unsupportedRotaryEntry).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('empty compatibleWeaponIds'),
  });
  expect(unsupportedRotaryEntry.gap).toBeUndefined();
  expect(unsupportedRotaryEntry.evidence).toEqual(
    expect.stringContaining('without deriving compatibility'),
  );
  expect(unsupportedRotarySourceRefs.map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('guards empty-compatible non-official rows'),
      expect.stringContaining('official autocannon ammo catalog'),
      expect.stringContaining('official ballistic-autocannon weapon catalog'),
    ]),
  );
  expectPinnedMegaMekRefs(unsupportedRotaryMegaMekRefs);
  expect(unsupportedRotaryDecisionText).toEqual(
    expect.stringMatching(/MegaMek/i),
  );
  expect(unsupportedRotaryDecisionText).toEqual(
    expect.stringMatching(/unofficial/i),
  );
  expect(unsupportedRotaryDecisionText).toEqual(
    expect.stringMatching(/RAC\/10/i),
  );
  expect(unsupportedRotaryDecisionText).toEqual(
    expect.stringMatching(/RAC\/20/i),
  );
  expect(unsupportedRotaryDecisionText).toEqual(
    expect.stringMatching(/unofficial clan package|weapon package/i),
  );
  expect(unsupportedRotaryDecisionText).toEqual(
    expect.stringMatching(
      /(?:class.*register|register.*class|WeaponType registers)/i,
    ),
  );
  expect(
    EXPECTED_BATTLEMECH_AMMO_GAP_IDS['unsupported-rotary-ac-10-20-ammo'],
  ).toBe(UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS);
  expect(
    unsupportedRotaryAmmo.map((ammo) => ({
      id: ammo.id,
      compatibleWeaponIds: ammo.compatibleWeaponIds,
      coveredAmmo: compatibleAmmoIds.has(ammo.id),
      rulesLevel: ammo.rulesLevel,
      weaponLookup: weaponLookup(ammo.id),
    })),
  ).toEqual([
    {
      id: 'rotaryac10',
      compatibleWeaponIds: [],
      coveredAmmo: false,
      rulesLevel: 'STANDARD',
      weaponLookup: null,
    },
    {
      id: 'rotaryac20',
      compatibleWeaponIds: [],
      coveredAmmo: false,
      rulesLevel: 'STANDARD',
      weaponLookup: null,
    },
  ]);
  expect(
    UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS.map((weaponId) => ({
      weaponId,
      equipmentBvResolved: resolveEquipmentBV(weaponId).resolved,
      weaponLookup: weaponLookup(weaponId),
    })),
  ).toEqual(
    UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS.map((weaponId) => ({
      weaponId,
      equipmentBvResolved: false,
      weaponLookup: null,
    })),
  );
});
