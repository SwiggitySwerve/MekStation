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

it('covers every official ranged weapon, physical weapon, and ammo entry', () => {
  expect(rangedWeaponItems).toHaveLength(officialIndex.totalItems.weapons);
  expect(ammoItems).toHaveLength(officialIndex.totalItems.ammunition);
  expect(physicalWeaponItems).toHaveLength(9);

  const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
  const physicalIds = new Set(physicalWeaponItems.map((item) => item.id));
  const ammoIds = new Set(ammoItems.map((item) => item.id));

  expect(rangedIds.size).toBe(rangedWeaponItems.length);
  expect(physicalIds.size).toBe(physicalWeaponItems.length);
  expect(ammoIds.size).toBe(ammoItems.length);
});

it('maps every official ranged weapon into a non-synthetic AI weapon', () => {
  const failures: string[] = [];

  for (const item of rangedWeaponItems) {
    const catalogWeapon = weaponLookup(item.id);
    if (!catalogWeapon) {
      failures.push(`${item.id}: missing from combat weapon lookup`);
      continue;
    }

    const aiWeapon = toAIWeapon(catalogWeapon, 0);
    if (aiWeapon.name === 'Medium Laser' && item.id !== 'medium-laser') {
      failures.push(`${item.id}: mapped to synthetic medium laser`);
    }
    if (!Number.isFinite(aiWeapon.damage)) {
      failures.push(`${item.id}: non-finite damage ${aiWeapon.damage}`);
    }
    if (typeof item.damage === 'number' && aiWeapon.damage !== item.damage) {
      failures.push(
        `${item.id}: numeric damage drift ${item.damage} -> ${aiWeapon.damage}`,
      );
    }
    if (typeof item.damage === 'string' && aiWeapon.damage <= 0) {
      failures.push(`${item.id}: parsed string damage to ${aiWeapon.damage}`);
    }
    if (typeof item.damage === 'number' && aiWeapon.damage <= 0) {
      const classification = zeroDamageClassification(item);
      if (!classification) {
        failures.push(`${item.id}: zero damage without explicit gap class`);
      }
    }
    if (!Number.isFinite(aiWeapon.heat) || aiWeapon.heat < 0) {
      failures.push(`${item.id}: invalid heat ${aiWeapon.heat}`);
    }
    if (
      catalogWeapon.ranges.minimum < 0 ||
      aiWeapon.shortRange > aiWeapon.mediumRange ||
      aiWeapon.mediumRange > aiWeapon.longRange
    ) {
      failures.push(`${item.id}: non-monotonic range brackets`);
    }
    if (aiWeapon.minRange !== catalogWeapon.ranges.minimum) {
      failures.push(
        `${item.id}: minimum range drift ${catalogWeapon.ranges.minimum} -> ${aiWeapon.minRange}`,
      );
    }
  }

  expect(failures).toEqual([]);
});

it('resolves official compact launcher ids before auditing Artemis FCS allocation', () => {
  expect(weaponLookup('1-islrm15')?.id).toBe('lrm-15');
  expect(weaponLookup('ISLRM15')?.id).toBe('lrm-15');
  expect(weaponLookup('1-clsrm6')?.id).toBe('clan-srm-6');
  expect(weaponLookup('CLLRM15')?.id).toBe('clan-lrm-15');
  expect(weaponLookup('ISMML7')?.id).toBe('mml-7');

  const audit = officialUnitArtemisAllocationAudit();

  expect(audit.nonTorpedoFailures).toEqual([]);
  expect(getCombatValidationOutOfScopeRefs()).toContain(
    'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
  );
});

it('keeps the static engine weapon database a legacy subset of the official ranged catalog', () => {
  const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
  const staticIds = Object.keys(WEAPON_DATABASE).sort();

  expect(staticIds.filter((id) => !rangedIds.has(id))).toEqual([]);
  expect(rangedIds.size).toBeGreaterThan(staticIds.length);
  expect(staticIds).not.toContain('uac-5');
  expect(staticIds).not.toContain('mml-9');
  expect(rangedIds.has('uac-5')).toBe(true);
  expect(rangedIds.has('mml-9')).toBe(true);
});

it('resolves every official ranged weapon through engine lookup without static fallback drift', () => {
  const failures: string[] = [];

  for (const item of rangedWeaponItems) {
    const weaponData = getWeaponData(item.id);
    if (!weaponData) {
      failures.push(`${item.id}: engine lookup returned undefined`);
      continue;
    }

    const expectedDamage = resolveCatalogDamage(item.damage, item.id);
    const expectedAmmoPerTon =
      typeof item.ammoPerTon === 'number' ? item.ammoPerTon : -1;

    if (weaponData.id !== item.id) {
      failures.push(`${item.id}: engine lookup id drifted to ${weaponData.id}`);
    }
    if (weaponData.damage !== expectedDamage) {
      failures.push(
        `${item.id}: engine damage drift ${expectedDamage} -> ${weaponData.damage}`,
      );
    }
    if (weaponData.heat !== item.heat) {
      failures.push(
        `${item.id}: engine heat drift ${item.heat} -> ${weaponData.heat}`,
      );
    }
    if (weaponData.minRange !== item.ranges.minimum) {
      failures.push(
        `${item.id}: engine min range drift ${item.ranges.minimum} -> ${weaponData.minRange}`,
      );
    }
    if (weaponData.shortRange !== item.ranges.short) {
      failures.push(
        `${item.id}: engine short range drift ${item.ranges.short} -> ${weaponData.shortRange}`,
      );
    }
    if (weaponData.mediumRange !== item.ranges.medium) {
      failures.push(
        `${item.id}: engine medium range drift ${item.ranges.medium} -> ${weaponData.mediumRange}`,
      );
    }
    if (weaponData.longRange !== item.ranges.long) {
      failures.push(
        `${item.id}: engine long range drift ${item.ranges.long} -> ${weaponData.longRange}`,
      );
    }
    if (weaponData.ammoPerTon !== expectedAmmoPerTon) {
      failures.push(
        `${item.id}: engine ammo-per-ton drift ${expectedAmmoPerTon} -> ${weaponData.ammoPerTon}`,
      );
    }
  }

  expect(failures).toEqual([]);
});

it('classifies zero-damage official ranged weapons as explicit non-damage behavior or data gaps', () => {
  const zeroDamageItems = rangedWeaponItems.filter((item) => item.damage === 0);
  const unclassified = zeroDamageItems
    .filter((item) => !zeroDamageClassification(item))
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string')
    .sort();

  // 279 -> 280: the Vehicular Grenade Launcher (ADVANCED, zero direct
  // damage — one-shot smoke effect) joined the official catalog with the
  // MTF-converter data-gap fixes; it classifies as nonstandard-data-gap.
  expect(zeroDamageItems).toHaveLength(280);
  expect(unclassified).toEqual([]);
  expect(
    ids(
      zeroDamageItems.filter(
        (item) => zeroDamageClassification(item) === 'defensive-system',
      ),
    ),
  ).toEqual(EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS['defensive-system']);
  expect(
    ids(
      zeroDamageItems.filter(
        (item) => zeroDamageClassification(item) === 'standard-special-effect',
      ),
    ),
  ).toEqual(EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS['standard-special-effect']);
  expect(
    ids(zeroDamageItems.filter((item) => item.rulesLevel === 'STANDARD')),
  ).toEqual(EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS['standard-rows']);
});

it('keeps variable missile damage from mapping to zero', () => {
  const stringDamageEntries: Array<[string, number]> = rangedWeaponItems
    .filter(isStringDamageWeapon)
    .map((item) => [item.id, resolveCatalogDamage(item.damage, item.id)]);
  const stringDamageResolutions: Record<string, number> = Object.fromEntries(
    stringDamageEntries.sort(([leftId], [rightId]) =>
      leftId.localeCompare(rightId),
    ),
  );

  expect(stringDamageResolutions).toEqual(EXPECTED_STRING_DAMAGE_RESOLUTIONS);
  expect(
    Object.values(stringDamageResolutions).every((damage) => damage > 0),
  ).toBe(true);
  expect(resolveCatalogDamage('1/missile', 'lrm-20')).toBe(20);
  expect(resolveCatalogDamage('2/missile', 'srm-6')).toBe(12);
  expect(resolveCatalogDamage('1-2/missile', 'mml-9')).toBe(18);
});

it('does not let AI unit conversion hide missing hydration with fallback weapons', () => {
  const unit = createMinimalUnitState('player-1', GameSide.Player, {
    q: 0,
    r: 0,
  });
  const hydrated = rangedWeaponItems.map((item, index) => {
    const catalogWeapon = weaponLookup(item.id);
    expect(catalogWeapon).not.toBeNull();
    return toAIWeapon(catalogWeapon as ICatalogWeaponStats, index);
  });
  const syntheticFallback = toAIUnitState(unit, []).weapons[0];

  expect(toCatalogAIUnitState(unit, hydrated).weapons).toEqual(hydrated);
  expect(toCatalogAIUnitState(unit, hydrated).weapons).toHaveLength(
    rangedWeaponItems.length,
  );
  expect(() => toCatalogAIUnitState(unit, [])).toThrow(
    'refusing synthetic Medium Laser fallback',
  );
  expect(toAIUnitState(unit, []).weapons).toHaveLength(1);
  expect(syntheticFallback.id).toBe('player-1-weapon-1');
  expect(syntheticFallback.name).toBe('Medium Laser');
  expect(hydrated.map((weapon) => weapon.id)).not.toContain(
    syntheticFallback.id,
  );
});

it('keeps ammunition compatibility references tied to official ranged weapons', () => {
  const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
  const missingRefs: string[] = [];

  for (const ammo of ammoItems) {
    for (const weaponId of ammo.compatibleWeaponIds) {
      if (!rangedIds.has(weaponId)) {
        missingRefs.push(`${ammo.id} -> ${weaponId}`);
      }
    }
  }

  expect(missingRefs).toEqual([]);
});

it('resolves every official non-duplicate ammo row through the equipment BV catalog', () => {
  const failures: string[] = [];

  for (const ammo of ammoItems) {
    const resolution = resolveAmmoBV(ammo.id);
    if (weaponCatalogIds.has(ammo.id)) {
      expect(ammoCompatibilityGapClass(ammo)).toBe('duplicate-runtime-id');
      continue;
    }

    if (!resolution.resolved) {
      failures.push(`${ammo.id}: did not resolve`);
      continue;
    }
    if (resolution.battleValue !== ammo.battleValue) {
      failures.push(
        `${ammo.id}: resolved BV ${resolution.battleValue} !== catalog BV ${ammo.battleValue}`,
      );
    }
    if (resolution.weaponType.length === 0) {
      failures.push(`${ammo.id}: resolved with empty weapon type`);
    }
    if (ammo.shotsPerTon <= 0) {
      failures.push(`${ammo.id}: invalid shotsPerTon ${ammo.shotsPerTon}`);
    }
  }

  expect(failures).toEqual([]);
});

it('turns every compatible official ammo row into a consumable combat ammo bin', () => {
  const failures: string[] = [];
  const compatibleAmmoIds = ammoItems
    .filter((ammo) => ammoCompatibilityGapClass(ammo) === null)
    .map((ammo) => ammo.id)
    .sort();

  expect(compatibleAmmoIds).toEqual(EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS);

  for (const ammo of ammoItems) {
    for (const weaponId of ammo.compatibleWeaponIds) {
      const ammoState = initializeAmmoState([
        {
          binId: `${ammo.id}-${weaponId}-bin`,
          weaponType: weaponId,
          location: 'center_torso',
          maxRounds: ammo.shotsPerTon,
          damagePerRound: 1,
          isExplosive: ammo.isExplosive,
        },
      ]);

      if (!hasAmmoForWeapon(ammoState, weaponId)) {
        failures.push(`${ammo.id} -> ${weaponId}: not available to fire`);
        continue;
      }
      if (getTotalAmmo(ammoState, weaponId) !== ammo.shotsPerTon) {
        failures.push(`${ammo.id} -> ${weaponId}: total ammo mismatch`);
        continue;
      }

      const result = consumeAmmo(ammoState, 'catalog-test-unit', weaponId);
      if (!result?.success) {
        failures.push(`${ammo.id} -> ${weaponId}: could not consume`);
        continue;
      }
      if (result.event.roundsRemaining !== ammo.shotsPerTon - 1) {
        failures.push(
          `${ammo.id} -> ${weaponId}: remaining rounds ${result.event.roundsRemaining}`,
        );
      }
    }
  }

  expect(failures).toEqual([]);
});

it('keeps unsupported RAC/10 and RAC/20 ammo out of runtime ammo bins', () => {
  const unsupportedFullUnit = {
    criticalSlots: {
      RIGHT_TORSO: ['Rotary AC/10 Ammo', 'Rotary AC/20 Ammo'],
    },
  } as unknown as IFullUnit;
  const mixedFullUnit = {
    criticalSlots: {
      RIGHT_TORSO: ['Rotary AC/10 Ammo', 'AC/10 Ammo'],
    },
  } as unknown as IFullUnit;

  expect(hydrateAmmoStateFromFullUnit(unsupportedFullUnit)).toBeUndefined();

  const mixedAmmoState = hydrateAmmoStateFromFullUnit(mixedFullUnit);
  expect(Object.values(mixedAmmoState ?? {})).toEqual([
    expect.objectContaining({
      binId: 'right_torso-1-ac-10-ammo',
      weaponType: 'ac-10',
    }),
  ]);
  expect(hasAmmoForWeapon(mixedAmmoState ?? {}, 'rac-10')).toBe(false);
  expect(hasAmmoForWeapon(mixedAmmoState ?? {}, 'rac-20')).toBe(false);
  expect(hasAmmoForWeapon(mixedAmmoState ?? {}, 'ac-10')).toBe(true);
});
