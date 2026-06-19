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

it('classifies every official special combat family in the catalog', () => {
  const ultraACs = familyItems(/\bUltra AC\b/i);
  const rotaryACs = familyItems(/\bRotary AC\b/i);
  const lbxACs = familyItems(/\bLB-X AC\b|\bLB \d+-X AC\b/i);
  const streakLaunchers = familyItems(/\bStreak\b/i);
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

  expect(ultraACs).toHaveLength(8);
  expect(rotaryACs).toHaveLength(4);
  expect(lbxACs).toHaveLength(8);
  expect(streakLaunchers).toHaveLength(61);
  expect(mmlLaunchers).toHaveLength(4);
  expect(narcLaunchers).toHaveLength(10);
  expect(amsSystems).toHaveLength(4);
  expect(plasmaCannons).toHaveLength(1);
  expect(tagDesignators).toHaveLength(4);
  expect(artemisFcs).toHaveLength(3);
  expect({
    'lb-x-ac': ids(lbxACs),
    mml: ids(mmlLaunchers),
    'rotary-ac': ids(rotaryACs),
    'ultra-ac': ids(ultraACs),
  }).toEqual(EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS);
  expect({
    'damage-capable': ids(streakLaunchers.filter((item) => item.damage !== 0)),
    'zero-damage-data-gap': ids(
      streakLaunchers.filter((item) => item.damage === 0),
    ),
  }).toEqual(EXPECTED_STREAK_WEAPON_FAMILY_IDS);
  expect({
    ams: ids(amsSystems),
    artemis: ids(artemisFcs),
    narc: ids(narcLaunchers),
    'plasma-cannon': ids(plasmaCannons),
    tag: ids(tagDesignators),
  }).toEqual({
    ...EXPECTED_DESIGNATOR_DEFENSIVE_SPECIAL_FAMILY_IDS,
    'plasma-cannon': ['clan-plasma-cannon'],
  });

  expect(ids(ultraACs).every(isUltraAC)).toBe(true);
  expect(ids(rotaryACs).every(isRotaryAC)).toBe(true);
  expect(ids(lbxACs).every(isLBXAC)).toBe(true);
  expect(
    EXPECTED_STREAK_WEAPON_FAMILY_IDS['damage-capable'].every(isStreakSRM),
  ).toBe(true);
  expect(
    EXPECTED_STREAK_WEAPON_FAMILY_IDS['damage-capable'].every(
      verifyStreakBehavior,
    ),
  ).toBe(true);
  expect(ids(narcLaunchers).every(isNarc)).toBe(true);
  expect(ids(amsSystems).every(isAMS)).toBe(true);
  expect(ids(tagDesignators).every(isTAG)).toBe(true);

  expect(sortedKeys(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)).toEqual([
    'ams',
    'artemis',
    'lb-x-ac',
    'mml',
    'narc',
    'plasma-cannon',
    'rotary-ac',
    'streak-srm',
    'tag',
    'ultra-ac',
  ]);
  expect(supportGaps(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'ams',
    'artemis',
    'lb-x-ac',
    'mml',
    'narc',
    'rotary-ac',
    'streak-srm',
    'tag',
    'ultra-ac',
  ]);
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'out-of-scope'),
  ).toEqual(['plasma-cannon']);

  expect(supportGaps(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'active-probe-counter-hydration',
    'active-probe-critical-lifecycle',
    'ams-ammo-consumption',
    'ams-authored-multi-use-lifecycle',
    'ams-automatic-interception-assignment',
    'ams-interception-events',
    'ams-manual-defender-choice',
    'ams-mounted-arc-enforcement',
    'ams-mounted-arc-hydration',
    'ams-projectile-reduction',
    'ams-runner-selected-defender-choice',
    'ams-session-selected-defender-choice',
    'ams-single-missile-parity',
    'ams-streak-cluster-parity',
    'artemis-active-probe-mode-authoring',
    'artemis-ambiguous-fcs-allocation-authoring',
    'artemis-cews-ecm-probe-lifecycle',
    'artemis-cluster-modifier',
    'artemis-ecm-mode-lifecycle',
    'artemis-ecm-suite-hydration',
    'artemis-ecm-suppression',
    'artemis-ew-mode-authoring',
    'artemis-explicit-fcs-link-lifecycle',
    'artemis-fcs-critical-lifecycle',
    'artemis-fcs-critical-slot-hydration',
    'artemis-link-network-lifecycle',
    'artemis-stealth-mode-damage-lifecycle',
    'artemis-stealth-suppression',
    'inarc-ecm-attacker-flight-path-suppression',
    'inarc-ecm-c3-disruption',
    'inarc-ecm-sensor-effects',
    'inarc-explosive-ammo-compatibility',
    'inarc-haywire-to-hit-modifier',
    'inarc-homing-cluster-modifier',
    'inarc-homing-marker-attachment',
    'inarc-homing-to-hit-modifier',
    'inarc-nemesis-redirect',
    'inarc-pod-brush-off-removal-lifecycle',
    'inarc-pod-brush-off-target-selection',
    'inarc-pod-event-replay-lifecycle',
    'inarc-pod-helper-removal-lifecycle',
    'inarc-pod-object-lifecycle',
    'inarc-pod-target-identity-lifecycle',
    'inarc-pod-target-option-deduplication',
    'inarc-pod-turn-reset-lifecycle',
    'inarc-pod-variants',
    'inarc-variant-ammo-attachment',
    'lbx-cluster-to-hit',
    'lbx-slug-cluster-modes',
    'mml-srm-lrm-ammo-compatibility',
    'mml-srm-lrm-mode-damage',
    'mml-variable-damage',
    'narc-cluster-modifier',
    'narc-marker-attachment',
    'narc-marker-lifecycle-events',
    'nova-cews-c3-network-lifecycle',
    'plasma-cannon-battlemech-heat-phase-pending-bucket',
    'plasma-cannon-battlemech-target-heat',
    'rac-jam-on-natural-two',
    'rac-rate-of-fire',
    'streak-lock-no-spend-on-miss',
    'streak-rack-projectiles',
    'tag-designation-hit',
    'tag-intent-wire-state-replay',
    'tag-marker-lifecycle-events',
    'tag-semi-guided-to-hit',
    'tag-turn-lifecycle-clear',
    'uac-jam-on-natural-two',
    'uac-rate-of-fire',
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier'].evidence,
  ).toEqual(expect.stringContaining('prototype IV/V'));
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier'].evidence,
  ).toEqual(expect.stringContaining('indirect-fire state'));
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'unsupported'),
  ).toEqual([...UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS].sort());
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'out-of-scope'),
  ).toEqual(
    expect.arrayContaining([
      'ams-bay-authoring',
      'ams-optional-multi-use-authoring',
      'inarc-producer-c3-authoring',
    ]),
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Homing, ECM, Haywire, and Nemesis'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
  ).toContain('source-backed executable rows');
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
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
      .evidence,
  ).toContain('selectedINarcPod');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
      .evidence,
  ).toContain(
    'producer-side C3 authoring remains separated under inarc-producer-c3-authoring',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-pod-brush-off-removal-lifecycle'
    ].evidence,
  ).toContain('selectedINarcPod');
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
    evidence: expect.stringContaining('removes exactly one matching'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-event-replay-lifecycle'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('rehydrates typed iNarcPods'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
      .evidence,
  ).toContain('producer-side C3 authoring remains separated');
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
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].evidence,
  ).toContain('sensorRangeBrackets');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].evidence,
  ).toContain('Artemis/prototype Artemis/Artemis V suppression');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('iNarc ECM C3 disruption'),
    gap: expect.stringContaining('Producer-side C3 membership'),
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring']
      .evidence,
  ).toContain('Residual row only');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring']
      .evidence,
  ).toContain('conservative unambiguous C3 equipment seeding');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
  ).toContain('C3 assignment UI/editor');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
  ).toContain('equipment seeding');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
  ).toContain('iNarc ECM disruption alone');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-pod-brush-off-removal-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'carrier-level attached iNarc pod removal',
    ),
  });
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
  expect(
    supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'unsupported'),
  ).toEqual([...UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS].sort());
});
