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

it('pins AMS helper boundaries and implemented mechanics to MegaMek refs', () => {
  const sourceRefsFor = (
    id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

  const amsFamilyRefs =
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.sourceRefs ?? [];
  const clusterCitations = [
    'MissileWeaponHandler applies assigned AMS counter equipment through getAMSHitsMod, rechecks firing arc and readiness, spends heat/ammo, and applies the standard -4 missile cluster modifier when AMS engages.',
    'MissileWeaponHandler adds AMS modifiers before missile cluster-table resolution and treats all-shots-hit/Streak attacks as cluster roll 11 so AMS can reduce them.',
  ];
  const singleMissileCitations = [
    'NarcHandler rolls one d6 for AMS/APDS interception and destroys the incoming pod on 1-3.',
    'ThunderBoltWeaponHandler rolls one d6 for AMS/APDS interception and destroys the incoming missile on 1-3.',
  ];

  expect(amsFamilyRefs.map(({ citation }) => citation)).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ...clusterCitations,
    ...singleMissileCitations,
    'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
  ]);
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.gap).toBeUndefined();
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
    'excludes already-fired standard AMS',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
    'PLAYTEST_3',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
    'amsMultiUse',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
    'automatically selects',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('selectedAMSWeaponIds'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-session-selected-defender-choice'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('selectedAMSWeaponMounts'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('selectedAMSWeaponIds'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('already-authored'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
      .evidence,
  ).toContain('same-phase AMS reuse');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
      .evidence,
  ).toContain('ammo consumption, heat generation, and fired-state accounting');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
      .gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'does not expose an AMS bay equipment entry',
    ),
    gap: expect.stringContaining(
      'outside the current BattleMech blocker matrix',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].evidence,
  ).toContain('AMS bay-shaped helper metadata');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'does not expose a multi-use AMS variant',
    ),
    gap: expect.stringContaining(
      'outside the current BattleMech blocker matrix',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
      .evidence,
  ).toContain('ams-authored-multi-use-lifecycle');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
      .evidence,
  ).toContain('same-phase AMS reuse');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
  ).not.toContain('Manual AMS defender choice');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
      .gap,
  ).toContain('runtime optionalRules consumption');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
  ).not.toContain('automatic firing-arc assignment');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
  ).not.toContain('assignment/enforcement');
  expect(
    sourceRefsFor('ams-manual-defender-choice').map(({ citation }) => citation),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    sourceRefsFor('ams-runner-selected-defender-choice').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    sourceRefsFor('ams-session-selected-defender-choice').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    sourceRefsFor('ams-bay-authoring').map(({ citation }) => citation),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    sourceRefsFor('ams-optional-multi-use-authoring').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
  ]);
  expect(
    sourceRefsFor('ams-authored-multi-use-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
  ]);
  expect(
    sourceRefsFor('ams-automatic-interception-assignment').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-automatic-interception-assignment'
    ].evidence,
  ).toContain('without requiring manual defender choice');
  expect(
    sourceRefsFor('ams-mounted-arc-enforcement').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-mounted-arc-enforcement']
      .evidence,
  ).toContain('mountingArc');
  expect(
    sourceRefsFor('ams-mounted-arc-hydration').map(({ citation }) => citation),
  ).toEqual([
    'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-mounted-arc-hydration']
      .evidence,
  ).toContain('isRearMounted');
  expect(
    sourceRefsFor('ams-projectile-reduction').map(({ citation }) => citation),
  ).toEqual(clusterCitations);
  expect(
    sourceRefsFor('ams-streak-cluster-parity').map(({ citation }) => citation),
  ).toEqual(clusterCitations);
  expect(
    sourceRefsFor('ams-single-missile-parity').map(({ citation }) => citation),
  ).toEqual(singleMissileCitations);
  expect(
    sourceRefsFor('ams-ammo-consumption').map(({ citation }) => citation),
  ).toEqual([
    'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
  ]);
  expect(
    sourceRefsFor('ams-interception-events').map(({ citation }) => citation),
  ).toEqual([...clusterCitations, ...singleMissileCitations]);

  const refs = [
    ...amsFamilyRefs,
    ...sourceRefsFor('ams-automatic-interception-assignment'),
    ...sourceRefsFor('ams-authored-multi-use-lifecycle'),
    ...sourceRefsFor('ams-mounted-arc-enforcement'),
    ...sourceRefsFor('ams-mounted-arc-hydration'),
    ...sourceRefsFor('ams-projectile-reduction'),
    ...sourceRefsFor('ams-streak-cluster-parity'),
    ...sourceRefsFor('ams-single-missile-parity'),
    ...sourceRefsFor('ams-ammo-consumption'),
    ...sourceRefsFor('ams-interception-events'),
    ...sourceRefsFor('ams-runner-selected-defender-choice'),
    ...sourceRefsFor('ams-session-selected-defender-choice'),
    ...sourceRefsFor('ams-manual-defender-choice'),
    ...sourceRefsFor('ams-bay-authoring'),
    ...sourceRefsFor('ams-optional-multi-use-authoring'),
  ];

  expect(
    refs.every(
      (sourceRef) =>
        sourceRef.kind === 'megamek-source' &&
        sourceRef.sourceVersion ===
          '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
        sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
        sourceRef.url.includes(sourceRef.sourceVersion) &&
        sourceRef.url.includes('#L'),
    ),
  ).toBe(true);
});

it('keeps AMS authoring-only residuals outside the BattleMech matrix when official catalogs do not expose them', () => {
  const officialEquipmentItems = [
    ...allWeaponCatalogItems,
    ...electronicsItems,
    ...miscellaneousItems,
  ];
  const amsBayCatalogItems = officialEquipmentItems.filter((item) =>
    /\b(?:ams|anti[-\s]?missile)\s*bay\b|amsbay/i.test(itemText(item)),
  );
  const multiUseAMSCatalogItems = officialEquipmentItems.filter((item) =>
    /multi[-\s]?use.*(?:ams|anti[-\s]?missile)|(?:ams|anti[-\s]?missile).*multi[-\s]?use|amsMultiUse/i.test(
      itemText(item),
    ),
  );

  expect(amsBayCatalogItems).toEqual([]);
  expect(multiUseAMSCatalogItems).toEqual([]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'does not expose an AMS bay equipment entry',
    ),
    gap: expect.stringContaining(
      'outside the current BattleMech blocker matrix',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'does not expose a multi-use AMS variant',
    ),
    gap: expect.stringContaining(
      'outside the current BattleMech blocker matrix',
    ),
  });
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.ams-bay-authoring',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponMechanics.ams-bay-authoring',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
});
