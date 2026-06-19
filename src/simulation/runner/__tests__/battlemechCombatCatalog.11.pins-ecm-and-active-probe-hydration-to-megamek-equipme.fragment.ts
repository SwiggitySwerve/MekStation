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

it('pins ECM and active-probe hydration to MegaMek equipment refs', () => {
  const sourceRefsFor = (
    id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

  expect(
    sourceRefsFor('artemis-ecm-suite-hydration').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MiscType defines Guardian, Clan, and Angel ECM suites with ECM flags and ECM modes.',
    'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
  ]);
  expect(
    sourceRefsFor('active-probe-counter-hydration').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MiscType defines Beagle, Bloodhound, and Clan active probes with BAP flags.',
    'MiscType defines Light Active Probe with a BAP flag.',
    'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
    'Entity.getBAPRange gives Clan Active Probe, Watchdog, and Nova CEWS a 5-hex BAP range and adds +1 range for Eagle Eyes.',
  ]);
  expect(
    sourceRefsFor('artemis-cews-ecm-probe-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    ...sourceRefsFor('artemis-ecm-suite-hydration').map(
      ({ citation }) => citation,
    ),
    ...sourceRefsFor('active-probe-counter-hydration').map(
      ({ citation }) => citation,
    ),
  ]);

  const refs = [
    ...sourceRefsFor('artemis-ecm-suite-hydration'),
    ...sourceRefsFor('active-probe-counter-hydration'),
    ...sourceRefsFor('artemis-cews-ecm-probe-lifecycle'),
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

it('pins Artemis cluster, ECM, and stealth suppression to MegaMek refs', () => {
  const sourceRefsFor = (
    id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

  expect(
    sourceRefsFor('artemis-cluster-modifier').map(({ citation }) => citation),
  ).toEqual([
    'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
    'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
  ]);
  expect(
    sourceRefsFor('artemis-fcs-critical-slot-hydration').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek MiscType.createISArtemisIV defines Artemis IV FCS with F_ARTEMIS.',
    'MegaMek MiscType.createISProtoArtemis defines Prototype Artemis IV FCS with F_ARTEMIS_PROTO.',
    'MegaMek MiscType.createISArtemisV defines Artemis V FCS with F_ARTEMIS_V.',
  ]);
  expect(
    sourceRefsFor('artemis-fcs-critical-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    sourceRefsFor('artemis-fcs-critical-slot-hydration').map(
      ({ citation }) => citation,
    ),
  );
  expect(
    sourceRefsFor('artemis-explicit-fcs-link-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    sourceRefsFor('artemis-fcs-critical-slot-hydration').map(
      ({ citation }) => citation,
    ),
  );
  expect(
    sourceRefsFor('artemis-ecm-suppression').map(({ citation }) => citation),
  ).toEqual(
    sourceRefsFor('artemis-cluster-modifier').map(({ citation }) => citation),
  );
  expect(
    sourceRefsFor('artemis-stealth-suppression').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
    'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
    'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
  ]);
  expect(
    sourceRefsFor('plasma-cannon-battlemech-target-heat').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'CLPlasmaCannon declares variable damage, heat 7, plasma/energy flags, plasma ammunition, and routes attacks to PlasmaCannonHandler.',
    'MegaMek plasma rifle and Clan plasma cannon ammunition rows use AmmoTypeEnum.PLASMA, ten shots per ton, and non-explosive ammo state.',
    'PlasmaCannonHandler applies external target heat on heat-tracking entities, including reflective, heat-dissipating, and PLAYTEST_3 armor-specific adjustments.',
    'MegaMek HeatResolver caps external heat at the configured/default 15 points before adding heat buildup.',
  ]);
  expect(
    sourceRefsFor('plasma-cannon-battlemech-target-heat').map(
      ({ citation }) => citation,
    ),
  ).not.toContain(
    'PlasmaCannonHandler keeps plasma-cannon BattleMech damage at zero while applying non-Mek/terrain/building special damage paths.',
  );
  expect(
    sourceRefsFor('plasma-cannon-battlemech-heat-phase-pending-bucket').map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    sourceRefsFor('plasma-cannon-battlemech-target-heat').map(
      ({ citation }) => citation,
    ),
  );

  const refs = [
    ...sourceRefsFor('artemis-cluster-modifier'),
    ...sourceRefsFor('artemis-explicit-fcs-link-lifecycle'),
    ...sourceRefsFor('artemis-fcs-critical-lifecycle'),
    ...sourceRefsFor('artemis-fcs-critical-slot-hydration'),
    ...sourceRefsFor('artemis-ecm-suppression'),
    ...sourceRefsFor('artemis-stealth-suppression'),
    ...sourceRefsFor('plasma-cannon-battlemech-target-heat'),
    ...sourceRefsFor('plasma-cannon-battlemech-heat-phase-pending-bucket'),
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

it('classifies every combat-active SPA and quirk as integrated, helper-only, unsupported, or out-of-scope', () => {
  expect(sortedKeys(SPA_COMBAT_SUPPORT)).toEqual(sortedKeys(SPA_CATALOG));
  expect(sortedKeys(QUIRK_COMBAT_SUPPORT)).toEqual(sortedKeys(QUIRK_CATALOG));

  expect(supportGaps(SPA_COMBAT_SUPPORT)).toEqual([]);
  expect(supportGaps(QUIRK_COMBAT_SUPPORT)).toEqual([]);
  expect(getSPADefinition('forward_observer')).not.toBeNull();
  expect(SPA_CATALOG.forward_observer).toBeDefined();
  expect(SPA_COMBAT_SUPPORT.forward_observer.level).toBe('integrated');
  expect(SPA_CATALOG.sandblaster).toMatchObject({
    combatEffect: expect.stringContaining('+4/+3/+2'),
    requiresDesignation: true,
    designationType: 'weapon_type',
  });
  expect(getSPADefinition('sandblaster')).toMatchObject({
    requiresDesignation: true,
    designationType: 'weapon_type',
  });

  expect(
    Object.values(SPA_COMBAT_SUPPORT).filter(
      (entry) => entry.level === 'unsupported',
    ),
  ).toHaveLength(0);
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('represented environmental light state'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence).toContain(
    'prohibits run-derived',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence).toContain(
    'airborne LAM',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.gap).toBeUndefined();
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence).toContain(
    'no Nightwalker to-hit modifier is claimed',
  );
  expect(
    supportIdsByLevel(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(supportIdsByLevel(QUIRK_COMBAT_SUPPORT, 'helper-only')).toEqual([]);
  expect(QUIRK_COMBAT_SUPPORT.distracting).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'accepted MekStation local +1 target to-hit deviation',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-defensive-quirk-to-hit-application'
    ],
  ).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('deviation-only'),
  });
});
