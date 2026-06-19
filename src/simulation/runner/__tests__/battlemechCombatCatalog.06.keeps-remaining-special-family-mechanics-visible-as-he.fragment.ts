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

it('keeps remaining special-family mechanics visible as helper-only or unsupported gaps', () => {
  const mmlLaunchers = familyItems(/\bMML\b/i);
  const narcLaunchers = familyItems(/\bNARC\b|\biNARC\b|\bNarc\b/i);
  const amsSystems = familyItems(/\bAnti-Missile System\b|\bAMS\b/i);
  const plasmaCannons = familyItems(/\bPlasma Cannon\b/i);
  const tagDesignators = electronicsItems.filter((item) =>
    /\bTAG\b/i.test(itemText(item)),
  );
  const artemisFcs = miscellaneousItems.filter((item) =>
    /\bArtemis\b/i.test(itemText(item)),
  );

  for (const item of mmlLaunchers) {
    const catalogWeapon = weaponLookup(item.id as string);
    expect(catalogWeapon).not.toBeNull();
    if (!catalogWeapon) continue;

    const aiWeapon = toAIWeapon(catalogWeapon, 0);
    expect(aiWeapon.damage).toBeGreaterThan(0);
    expect(aiWeapon.firingModes).toMatchObject({
      kind: 'ammo-mode',
      defaultModeId: 'srm',
    });
    expect(aiWeapon.firingModes?.modes.map((mode) => mode.id)).toEqual([
      'srm',
      'lrm',
    ]);
  }

  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.mml.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.evidence).toContain(
    'carrier-attached iNarc pod-object target selection/removal lifecycle',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].level).toBe(
    'out-of-scope',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.evidence).toContain(
    'official cluster totals ignore',
  );
  expect(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT).not.toHaveProperty(
    'tag-semi-guided-cluster-bonus',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].level).toBe(
    'integrated',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.evidence).toContain(
    'Represented BattleMech Artemis family support',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.evidence).toContain(
    'unambiguous single-launcher or exact-cardinality same-location Artemis IV/prototype IV/V FCS critical-slot hydration',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-fcs-critical-slot-hydration'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-fcs-critical-slot-hydration'
    ].evidence,
  ).toContain('explicit linkedEquipment FCS allocation when present');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-explicit-fcs-link-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'strips guidance only from that explicitly linked launcher',
    ),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-fcs-critical-lifecycle']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-fcs-critical-lifecycle']
      .evidence,
  ).toContain('unambiguous same-location weapon guidance flags');
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-fcs-critical-slot-hydration',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-explicit-fcs-link-lifecycle',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-fcs-critical-lifecycle',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponFamilies.artemis',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ].evidence,
  ).toContain('whole-catalog non-torpedo audit coverage');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ].evidence,
  ).toContain(
    'represented by BAP/CEWS equipment hydration and operational lifecycle rather than a separate probe mode surface',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring']
      .evidence,
  ).toContain(
    'imports ECM suite currentMode/mode/activeMode/modeName authoring',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].evidence,
  ).toContain('represented ECM equipment critical replay disables');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-link-network-lifecycle'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining([
      'ComputeC3Spotter treats Nova as a C3-type network for range calculation when the attacker has active Nova CEWS.',
      'Entity places active Nova CEWS units on C3Nova network ids and matches Nova network membership through C3 network state.',
    ]),
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['mml-variable-damage'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['mml-srm-lrm-ammo-compatibility']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-designation-hit'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-intent-wire-state-replay']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-projectile-reduction'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-interception-events'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-session-selected-defender-choice'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].level,
  ).toBe('out-of-scope');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
      .level,
  ).toBe('out-of-scope');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .level,
  ).toBe('integrated');
  expect([...UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS]).toEqual(
    [],
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-fcs-critical-slot-hydration'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-fcs-critical-lifecycle']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['active-probe-critical-lifecycle']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cews-ecm-probe-lifecycle']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cews-ecm-probe-lifecycle']
      .evidence,
  ).toContain(
    'without promoting Nova CEWS C3-style network behavior into Artemis FCS support',
  );
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(
    typeof SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap ===
      'string' &&
      SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap.length > 0,
  ).toBe(true);
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
  ).not.toContain('heatFromExternal Heat Phase pending-bucket timing');
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
  ).not.toContain('timing/caps/lifecycle');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
    'non-Mek special damage paths',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
    'terrain/building special damage paths',
  );

  expect(ids(narcLaunchers)).toContain('narc');
  expect(ids(amsSystems)).toContain('ams');
  expect(ids(plasmaCannons)).toEqual(['clan-plasma-cannon']);
  expect(ids(tagDesignators)).toContain('tag');
  expect(ids(artemisFcs)).toEqual(['artemisiv', 'artemisivproto', 'artemisv']);
});
