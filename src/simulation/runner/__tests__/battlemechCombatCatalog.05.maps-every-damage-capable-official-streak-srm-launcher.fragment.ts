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

it('maps every damage-capable official Streak SRM launcher to runner all-or-none semantics', () => {
  const failures: string[] = [];

  for (const weaponId of EXPECTED_STREAK_WEAPON_FAMILY_IDS['damage-capable']) {
    const catalogWeapon = weaponLookup(weaponId);
    if (!catalogWeapon) {
      failures.push(`${weaponId}: missing from combat weapon lookup`);
      continue;
    }

    const aiWeapon = toAIWeapon(catalogWeapon, 0);
    const resolved = resolveSpecialProjectileHit({
      baseWeapon: aiWeapon,
      shotWeapon: aiWeapon,
      selectedMode: undefined,
      d6Roller: () => 6,
    });

    if (shouldSpendAmmoAndHeatOnMiss(aiWeapon)) {
      failures.push(`${weaponId}: failed lock would spend ammo or heat`);
    }
    if (aiWeapon.damage <= 0) {
      failures.push(`${weaponId}: damage-capable Streak mapped to zero`);
    }
    if (
      resolved.projectileCount === undefined ||
      resolved.projectileCount <= 0
    ) {
      failures.push(`${weaponId}: runner could not derive rack size`);
    }
  }

  expect(failures).toEqual([]);
});

it('keeps zero-damage Streak variants as catalog-visible data gaps', () => {
  const zeroDamageStreakLaunchers = familyItems(/\bStreak\b/i).filter(
    (item) => item.damage === 0,
  );

  expect(ids(zeroDamageStreakLaunchers)).toEqual(
    EXPECTED_STREAK_WEAPON_FAMILY_IDS['zero-damage-data-gap'],
  );
  expect(
    zeroDamageStreakLaunchers.map((item) => zeroDamageClassification(item)),
  ).toEqual(
    Array.from(
      {
        length:
          EXPECTED_STREAK_WEAPON_FAMILY_IDS['zero-damage-data-gap'].length,
      },
      () => 'nonstandard-data-gap',
    ),
  );
});

it('maps official ordinary AC, UAC, RAC, LB-X, and MML catalog weapons into AI firing modes', () => {
  const multiModeFamilies = [
    {
      ids: ['ac-2', 'ac-5', 'ac-10', 'ac-20'],
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modeIds: ['single', 'rapid-fire'],
    },
    {
      ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS['ultra-ac'],
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modeIds: ['single', 'double'],
    },
    {
      ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS['rotary-ac'],
      kind: 'rate-of-fire',
      defaultModeId: 'rof-1',
      modeIds: ['rof-1', 'rof-2', 'rof-3', 'rof-4', 'rof-5', 'rof-6'],
    },
    {
      ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS['lb-x-ac'],
      kind: 'cluster-slug',
      defaultModeId: 'slug',
      modeIds: ['slug', 'cluster'],
    },
    {
      ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS.mml,
      kind: 'ammo-mode',
      defaultModeId: 'srm',
      modeIds: ['srm', 'lrm'],
    },
  ] as const;

  for (const family of multiModeFamilies) {
    for (const weaponId of family.ids) {
      const catalogWeapon = weaponLookup(weaponId);
      expect(catalogWeapon).not.toBeNull();
      if (!catalogWeapon) continue;

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      expect(aiWeapon.firingModes?.kind).toBe(family.kind);
      expect(aiWeapon.firingModes?.defaultModeId).toBe(family.defaultModeId);
      expect(aiWeapon.firingModes?.modes.map((mode) => mode.id)).toEqual(
        family.modeIds,
      );
    }
  }
});

it('authors ordinary AC catalog rows with represented TacOps rapid-fire modes', () => {
  for (const weaponId of ['ac-2', 'ac-5', 'ac-10', 'ac-20']) {
    const catalogWeapon = weaponLookup(weaponId);
    expect(catalogWeapon).not.toBeNull();
    if (!catalogWeapon) continue;

    const aiWeapon = toAIWeapon(catalogWeapon, 0);
    expect(aiWeapon.firingModes).toMatchObject({
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modes: [
        {
          id: 'single',
          damage: aiWeapon.damage,
          heat: aiWeapon.heat,
          shotsPerTurn: 1,
        },
        {
          id: 'rapid-fire',
          damage: aiWeapon.damage * 2,
          heat: aiWeapon.heat * 2,
          shotsPerTurn: 2,
        },
      ],
    });
  }
});

it('lets hydrated special-mode weapons participate in AI mode selection', () => {
  const uac = toAIWeapon(weaponLookup('uac-5') as ICatalogWeaponStats, 0);
  const rac = toAIWeapon(weaponLookup('rac-5') as ICatalogWeaponStats, 0);
  const lbx = toAIWeapon(weaponLookup('lb-10-x-ac') as ICatalogWeaponStats, 0);
  const mml = toAIWeapon(weaponLookup('mml-9') as ICatalogWeaponStats, 0);

  expect(
    selectWeaponMode(
      uac,
      {
        distance: 5,
        heatHeadroom: 99,
        ammoTurnsRemaining: 40,
      },
      true,
    ),
  ).toMatchObject({
    modeId: 'double',
    effectiveDamage: 10,
    effectiveHeat: 2,
    effectiveShots: 2,
  });

  expect(
    selectWeaponMode(
      rac,
      {
        distance: 5,
        heatHeadroom: 99,
        ammoTurnsRemaining: 60,
      },
      true,
    ),
  ).toMatchObject({
    modeId: 'rof-6',
    effectiveDamage: 30,
    effectiveHeat: 6,
    effectiveShots: 6,
  });

  expect(
    selectWeaponMode(
      lbx,
      {
        distance: 5,
        heatHeadroom: 99,
        ammoTurnsRemaining: 20,
        targetEvading: true,
      },
      true,
    ).modeId,
  ).toBe('cluster');

  expect(
    selectWeaponMode(
      mml,
      {
        distance: 2,
        heatHeadroom: 99,
        ammoTurnsRemaining: 20,
      },
      true,
    ),
  ).toMatchObject({
    modeId: 'srm',
    effectiveDamage: 18,
    effectiveHeat: 5,
    effectiveShots: 1,
  });

  expect(
    selectWeaponMode(
      mml,
      {
        distance: 5,
        heatHeadroom: 99,
        ammoTurnsRemaining: 20,
      },
      true,
    ),
  ).toMatchObject({
    modeId: 'lrm',
    effectiveDamage: 9,
    effectiveHeat: 5,
    effectiveShots: 1,
  });
});
