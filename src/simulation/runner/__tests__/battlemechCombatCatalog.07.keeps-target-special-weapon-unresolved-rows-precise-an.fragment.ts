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

it('keeps target special-weapon unresolved rows precise and authoring scope out-of-scope', () => {
  const targetUnresolvedRefs = UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS;
  const unresolvedRefs = getCombatValidationUnresolvedRefs();
  const specialWeaponUnresolvedRefs = unresolvedRefs.filter(
    (ref) =>
      ref.startsWith('featureSupport.specialWeaponFamilies.') ||
      ref.startsWith('featureSupport.specialWeaponMechanics.'),
  );

  expect(specialWeaponUnresolvedRefs).toEqual(targetUnresolvedRefs);
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.plasma-cannon',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponFamilies.plasma-cannon',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponMechanics.ams-bay-authoring',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
  );
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.ams-manual-defender-choice',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.artemis',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Split-accounted Artemis lifecycle row'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-ambiguous-fcs-allocation-authoring'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'whole-catalog non-torpedo audit coverage',
    ),
  });
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
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].gap,
  ).toBeUndefined();
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon']).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('zero BattleMech damage'),
    gap: expect.stringContaining('non-Mek special damage paths'),
  });
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].evidence,
  ).toContain('Heat Phase pending bucket');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
    'terrain/building special damage paths',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('selectedAMSWeaponIds'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice']
      .evidence,
  ).toContain('AttackInvalid before AttackDeclared');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('AMS bay-shaped helper metadata'),
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
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('selected-ammo attachment'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('carrier iNarcPods state'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
      .evidence,
  ).toContain('physical panel/store author selected pod identity');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-event-replay-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('deduplicates repeated team/pod events'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-pod-target-identity-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('same-team/same-type'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-pod-target-option-deduplication'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('target-option dedupe'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-pod-brush-off-target-selection'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('carrier-scoped attached iNarc pod rows'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-pod-helper-removal-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('leaves the original array untouched'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
  ).toContain('markerless unknown-ammo guard behavior');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
  ).not.toContain('Explosive');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('tactical sensor contacts'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-ecm-sensor-effects'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('sensor range-bracket checks'),
      expect.stringContaining('Sensor.getModForECM'),
    ]),
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('explicit C3 range sharing'),
    gap: expect.stringContaining('Producer-side C3 membership'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring']
      .evidence,
  ).toContain('to-hit C3 rows');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
  ).toContain('explicit or conservative C3 state consumption alone');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
  ).toContain('equipment seeding');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
  ).toContain('iNarc ECM disruption alone');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-explosive-ammo-compatibility'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('6-point impact damage'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-explosive-ammo-compatibility']
      .gap,
  ).toBeUndefined();
});
