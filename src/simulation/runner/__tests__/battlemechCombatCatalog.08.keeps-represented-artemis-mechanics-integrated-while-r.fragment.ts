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

it('keeps represented Artemis mechanics integrated while residual mechanics stay explicit', () => {
  const representedArtemisMechanicIds = [
    'artemis-cluster-modifier',
    'artemis-cews-ecm-probe-lifecycle',
    'artemis-link-network-lifecycle',
    'artemis-explicit-fcs-link-lifecycle',
    'artemis-fcs-critical-lifecycle',
    'artemis-fcs-critical-slot-hydration',
    'artemis-ecm-suppression',
    'artemis-ecm-suite-hydration',
    'active-probe-counter-hydration',
    'active-probe-critical-lifecycle',
    'artemis-stealth-suppression',
    'artemis-stealth-mode-damage-lifecycle',
    'artemis-ambiguous-fcs-allocation-authoring',
  ] as const satisfies readonly (keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)[];
  const unresolvedArtemisMechanicIds =
    [] as const satisfies readonly (keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)[];
  const unresolvedRefs = getCombatValidationUnresolvedRefs();

  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponFamilies.artemis',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
  );
  expect([...unresolvedArtemisMechanicIds]).toEqual([]);
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-ew-mode-authoring',
  );
  expect(unresolvedRefs).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-active-probe-mode-authoring',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'],
  ).toMatchObject({
    level: 'integrated',
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].gap,
  ).toBeUndefined();
  expect(
    representedArtemisMechanicIds.map(
      (id) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].level,
    ),
  ).toEqual(representedArtemisMechanicIds.map(() => 'integrated'));
  for (const id of representedArtemisMechanicIds) {
    expect(unresolvedRefs).not.toContain(
      `featureSupport.specialWeaponMechanics.${id}`,
    );
    expect(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].gap).toBeUndefined();
  }

  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Represented BattleMech Artemis family'),
  });
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.gap).toBeUndefined();
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
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toContain(
    'unambiguous single-launcher and exact-cardinality same-location Artemis IV/prototype IV/V FCS critical-slot hydration',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toMatch(/same-location .*FCS critical damage guidance removal/);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toContain('target/flight-path ECM suppression');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toContain('active-probe ECM countering');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toContain('active-probe critical replay lifecycle');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toContain('CEWS as ECM/probe equipment');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
      .evidence,
  ).toContain('active attacker-stealth suppression');
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
    ].evidence,
  ).toContain(
    'operational lifecycle rather than a separate probe mode surface',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-active-probe-mode-authoring'
    ].gap,
  ).toBeUndefined();
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
    ].evidence,
  ).toContain('own ECM state');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'artemis-stealth-mode-damage-lifecycle'
    ].gap,
  ).toBeUndefined();
});

it('pins special weapon family rows to MegaMek source refs', () => {
  const sourceRefsFor = (
    id: keyof typeof SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  ) => SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT[id].sourceRefs ?? [];

  expect(
    Object.values(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT).flatMap((entry) =>
      entry.level !== 'unsupported' && (entry.sourceRefs?.length ?? 0) === 0
        ? [entry.id]
        : [],
    ),
  ).toEqual([]);

  expect(sourceRefsFor('ultra-ac').map(({ citation }) => citation)).toEqual([
    'UACWeapon declares Ultra AC ammo, Single/Ultra firing modes, and the UltraWeaponHandler path.',
    'UltraWeaponHandler derives one or two shots from firing mode, resolves cluster hits, and jams two-shot Ultra fire on a natural 2.',
  ]);
  expect(sourceRefsFor('rotary-ac').map(({ citation }) => citation)).toEqual([
    'RACWeapon declares Rotary AC ammo, Single/2-6 shot modes, explosive-on-jam behavior, and RACHandler versus UltraWeaponHandler routing.',
    'RACHandler maps selected RAC mode to shot count and applies rate-dependent jam thresholds before reducing ammo.',
  ]);
  expect(sourceRefsFor('lb-x-ac').map(({ citation }) => citation)).toEqual([
    'LBXACWeapon routes cluster ammunition to LBXHandler, routes slug fire to ACWeaponHandler, and declares AC_LBX ammo/class metadata.',
    'LBXHandler resolves cluster pellet damage, cluster-table hit counts, and cluster-ammo table usage.',
  ]);
  expect(sourceRefsFor('streak-srm').map(({ citation }) => citation)).toEqual([
    'StreakSRMWeapon declares Streak SRM ammo, removes Artemis compatibility, and routes attacks to StreakHandler.',
    'StreakHandler suppresses hits/AMS on missed locks, resolves rack-size all-hit behavior, and spends ammo/heat only after a successful lock.',
  ]);
  expect(sourceRefsFor('mml').map(({ citation }) => citation)).toEqual([
    'MMLWeapon declares MML ammo/class metadata and routes linked LRM-mode ammo to LRM handlers and other MML ammo to SRM handlers.',
    'MMLWeapon exposes indirect-fire modes when the base indirect-fire option is enabled.',
    'AmmoType creates paired MML LRM and SRM ammo entries with MML ammo type and distinct LRM/SRM flags.',
  ]);
  expect(sourceRefsFor('narc').map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'MissileWeaponHandler redirects iNarc Nemesis-confusable missiles to friendly intervening Nemesis pod carriers before returning to the original target on misses.',
    ]),
  );
  expect(sourceRefsFor('tag').map(({ citation }) => citation)).toEqual([
    'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
    'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
    'Game.resetTagInfo clears the tagInfoForTurn collection.',
    'ComputeTargetToHitMods cancels positive target-movement modifiers for TAG-guided semi-guided LRM/MML/NLRM/mortar ammunition.',
    'ComputeToHit applies a -1 semi-guided indirect-fire modifier when qualifying missile or mortar ammunition attacks a TAG-designated target.',
  ]);
  expect(sourceRefsFor('artemis').map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
      'MegaMek MiscType.createISArtemisIV defines Artemis IV FCS with F_ARTEMIS.',
      'MegaMek MiscType.createISProtoArtemis defines Prototype Artemis IV FCS with F_ARTEMIS_PROTO.',
      'MegaMek MiscType.createISArtemisV defines Artemis V FCS with F_ARTEMIS_V.',
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
      'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
      'MegaMek MissileWeaponHandler applies Artemis IV +2, prototype Artemis IV +1, and Artemis V +3 cluster modifiers while suppressing ECM and stealth',
      'MegaMek LRMHandler skips Artemis cluster modifiers when the weapon mode is Indirect and includes prototype Artemis IV in the same modifier chain',
    ]),
  );
  expect(
    sourceRefsFor('plasma-cannon').map(({ citation }) => citation),
  ).toEqual([
    'CLPlasmaCannon declares variable damage, heat 7, plasma/energy flags, plasma ammunition, and routes attacks to PlasmaCannonHandler.',
    'MegaMek plasma rifle and Clan plasma cannon ammunition rows use AmmoTypeEnum.PLASMA, ten shots per ton, and non-explosive ammo state.',
    'PlasmaCannonHandler applies external target heat on heat-tracking entities, including reflective, heat-dissipating, and PLAYTEST_3 armor-specific adjustments.',
    'MegaMek HeatResolver caps external heat at the configured/default 15 points before adding heat buildup.',
    'PlasmaCannonHandler keeps plasma-cannon BattleMech damage at zero while applying non-Mek/terrain/building special damage paths.',
  ]);

  for (const entry of Object.values(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)) {
    if (entry.level !== 'unsupported') {
      expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
    }
  }
});

it('pins special weapon mechanic rows to row-level MegaMek refs', () => {
  const sourceRefsFor = (
    id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

  expect(
    Object.values(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT).flatMap((entry) =>
      entry.level !== 'unsupported' && (entry.sourceRefs?.length ?? 0) === 0
        ? [entry.id]
        : [],
    ),
  ).toEqual([]);

  expect(
    sourceRefsFor('uac-rate-of-fire').map(({ citation }) => citation),
  ).toEqual([
    'UACWeapon declares Ultra AC ammo, Single/Ultra firing modes, and the UltraWeaponHandler path.',
    'UltraWeaponHandler derives one or two shots from firing mode, resolves cluster hits, and jams two-shot Ultra fire on a natural 2.',
  ]);
  expect(
    sourceRefsFor('rac-rate-of-fire').map(({ citation }) => citation),
  ).toEqual([
    'RACWeapon declares Rotary AC ammo, Single/2-6 shot modes, explosive-on-jam behavior, and RACHandler versus UltraWeaponHandler routing.',
    'RACHandler maps selected RAC mode to shot count and applies rate-dependent jam thresholds before reducing ammo.',
  ]);
  expect(
    sourceRefsFor('lbx-slug-cluster-modes').map(({ citation }) => citation),
  ).toEqual([
    'LBXACWeapon routes cluster ammunition to LBXHandler, routes slug fire to ACWeaponHandler, and declares AC_LBX ammo/class metadata.',
    'LBXHandler resolves cluster pellet damage, cluster-table hit counts, and cluster-ammo table usage.',
  ]);
  expect(
    sourceRefsFor('streak-lock-no-spend-on-miss').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'StreakSRMWeapon declares Streak SRM ammo, removes Artemis compatibility, and routes attacks to StreakHandler.',
    'StreakHandler suppresses hits/AMS on missed locks, resolves rack-size all-hit behavior, and spends ammo/heat only after a successful lock.',
  ]);
  expect(
    sourceRefsFor('mml-srm-lrm-ammo-compatibility').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MMLWeapon declares MML ammo/class metadata and routes linked LRM-mode ammo to LRM handlers and other MML ammo to SRM handlers.',
    'MMLWeapon exposes indirect-fire modes when the base indirect-fire option is enabled.',
    'AmmoType creates paired MML LRM and SRM ammo entries with MML ammo type and distinct LRM/SRM flags.',
  ]);
  expect(
    sourceRefsFor('narc-cluster-modifier').map(({ citation }) => citation),
  ).toEqual([
    'Entity.isNarcedBy detects attached standard NARC pods from the firing team.',
    'MissileWeaponHandler applies the NARC/iNARC Homing cluster modifier to direct NARC-capable LRM/SRM/MML/NLRM fire when target ECM does not suppress it.',
  ]);
  expect(
    sourceRefsFor('tag-semi-guided-to-hit').map(({ citation }) => citation),
  ).toEqual([
    'ComputeTargetToHitMods cancels positive target-movement modifiers for TAG-guided semi-guided LRM/MML/NLRM/mortar ammunition.',
    'ComputeToHit applies a -1 semi-guided indirect-fire modifier when qualifying missile or mortar ammunition attacks a TAG-designated target.',
  ]);

  for (const entry of Object.values(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)) {
    if (entry.level !== 'unsupported') {
      expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
    }
  }
});
