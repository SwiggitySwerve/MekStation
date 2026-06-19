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

it('tracks movement action rules and terrain/environment rule gaps', () => {
  expect(supportGaps(MOVEMENT_RULE_COMBAT_SUPPORT)).toEqual([]);
  expect(supportIdsByLevel(MOVEMENT_RULE_COMBAT_SUPPORT, 'integrated')).toEqual(
    [
      'elevation',
      'facing',
      'go-prone-battlemech-swarmer-dislodgement',
      'go-prone-enemy-occupied-start-follow-up-block',
      'go-prone-hull-down-zero-mp-transition',
      'go-prone-side-paths',
      'heat-mp-penalty',
      'jump',
      'occupancy',
      'prone',
      'run',
      'stand',
      'torso-twist',
      'walk',
    ],
  );
  expect(
    supportIdsByLevel(MOVEMENT_RULE_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-battlemech-swarmer-dislodgement'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'emits replayable SwarmDismounted events',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('go_prone_dislodgement'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('clearGoProneSwarmers'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('applySwarmDismounted'),
      }),
    ]),
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-hull-down-zero-mp-transition'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('clears hull-down posture'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('GoProneStep'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('getGoProneMpCost'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('applyMovementEvent'),
      }),
    ]),
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT[
      'go-prone-enemy-occupied-start-follow-up-block'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'same-hex GO_PRONE posture remains legal',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining(
          'restricting follow-up moves after leaving and returning',
        ),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('validateMovement rejects'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining(
          'deriveMovementRangeHexForDestination',
        ),
      }),
    ]),
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
  ).toContain('represented BattleMech swarmer dislodgement is integrated');
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
  ).toContain('hull-down zero-MP posture transition is integrated');
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
  ).toContain('go-prone-enemy-occupied-start-follow-up-block');
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
  ).toContain('infernoBurning state');
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].gap,
  ).toBeUndefined();
  for (const sourcePath of ['src/types/gameplay/GameSessionStateTypes.ts']) {
    const stateText = readFileSync(join(process.cwd(), sourcePath), 'utf8');
    expect(stateText).toMatch(/\binfernoBurning\b/);
  }
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['torso-twist'].sourceRefs?.map(
      (sourceRef) => sourceRef.citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('TorsoTwistAction'),
      expect.stringContaining('Entity.setSecondaryFacing'),
      expect.stringContaining('Mek.canChangeSecondaryFacing'),
      expect.stringContaining('Mek.isValidSecondaryFacing'),
      expect.stringContaining('ComputeArc'),
    ]),
  );
  expect(MOVEMENT_RULE_COMBAT_SUPPORT['torso-twist'].gap).toBeUndefined();
  expect(
    Object.values(MOVEMENT_RULE_COMBAT_SUPPORT)
      .filter((entry) => entry.level !== 'unsupported')
      .flatMap((entry) =>
        (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
      ),
  ).toEqual([]);
  Object.values(MOVEMENT_RULE_COMBAT_SUPPORT).forEach((entry) => {
    if (entry.level !== 'unsupported') {
      expectPinnedMegaMekRefs(
        (entry.sourceRefs ?? []).filter(
          (sourceRef) => sourceRef.kind === 'megamek-source',
        ),
      );
    }
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT.walk.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek Entity.getWalkMP returns walking MP after heat, cargo, weather, and gravity adjustments.',
  ]);
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT.run.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek Entity.getRunMP derives standard run MP as ceil(adjusted walk MP * 1.5).',
    'MegaMek Mek.getRunMP delegates to armed MASC/Supercharger boosters when active, otherwise using the standard adjusted run MP.',
  ]);
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT.prone.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek MovePath allows GO_PRONE while restricting follow-up moves after leaving and returning to an enemy-occupied start hex.',
    'MegaMek GoProneStep assigns 1 MP when the entity is not hull-down, leaving hull-down go-prone as a zero-MP transition.',
    'MegaMek MoveStep marks GO_PRONE illegal for already-prone units, non-Meks, or stuck entities.',
    'MegaMek MoveStep updates GO_PRONE posture by setting prone state and clearing hull-down state.',
    'MegaMek MovePathHandler resolves GO_PRONE by setting the entity prone, with swarmer dislodge and inferno wash-off side paths.',
  ]);

  const movementEnhancementDefinitionTypes =
    MOVEMENT_ENHANCEMENT_DEFINITIONS.map(({ type }) => type).sort();
  expect(sortedKeys(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT)).toEqual(
    [
      ...movementEnhancementDefinitionTypes,
      'masc-battlemech-represented-side-paths',
      'masc-side-paths',
      'supercharger-battlemech-represented-side-paths',
      'supercharger-non-battlemech-side-paths',
      'supercharger-side-paths',
    ].sort(),
  );
  expect(supportGaps(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'integrated'),
  ).toEqual(
    [
      MovementEnhancementType.MASC,
      MovementEnhancementType.PARTIAL_WING,
      MovementEnhancementType.SUPERCHARGER,
      MovementEnhancementType.TSM,
      'masc-battlemech-represented-side-paths',
      'masc-side-paths',
      'supercharger-battlemech-represented-side-paths',
      'supercharger-side-paths',
    ].sort(),
  );
  expect(
    supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'out-of-scope'),
  ).toEqual(['supercharger-non-battlemech-side-paths']);
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
      'supercharger-non-battlemech-side-paths'
    ],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('Tank, SupportTank, SupportVTOL'),
    gap: expect.stringContaining('outside this BattleMech suite'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('SupportTank'),
        kind: 'megamek-source',
      }),
      expect.objectContaining({
        citation: expect.stringContaining('non-Mek Supercharger failure'),
        kind: 'megamek-source',
      }),
    ]),
  });

  expect(TERRAIN_TYPE_MOVEMENT_COVERAGE).toHaveLength(20);
  expect(TERRAIN_TYPE_MOVEMENT_COVERAGE).toContain('mines');
  expect(supportGaps(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'atmosphere',
    'dust',
    'extreme-temperature',
    'fire-heat',
    'fog',
    'minefield-active-non-ground-triggers',
    'minefield-campaign-placement-authoring',
    'minefield-clearing-sweeper-collateral-reset',
    'minefield-emp-effects',
    'minefield-hidden-reveal-detection',
    'minefield-inferno-residual-controls',
    'minefield-non-conventional-type-semantics',
    'minefield-represented-active-ground-suppression',
    'minefield-represented-command-detonation',
    'minefield-represented-conventional-detonated-state',
    'minefield-represented-coordinate-state-entry-damage',
    'minefield-represented-coordinate-state-lifecycle',
    'minefield-represented-density-reduction',
    'minefield-represented-density-trigger-target',
    'minefield-represented-encoded-damage-levels',
    'minefield-represented-entry-side-paths',
    'minefield-represented-inferno-entry-heat',
    'minefield-represented-manual-conventional-detonation',
    'minefield-represented-movement-detonation-event',
    'minefield-represented-non-conventional-type-guard',
    'minefield-represented-vibrabomb-effects',
    'minefield-variant-side-paths',
    'mines',
    'night',
    'smoke-to-hit',
    'terrain-los-blocking',
    'terrain-los-building-height-blocking',
    'terrain-los-damageable-cover-hit-resolution-routing',
    'terrain-los-divided-elevation-blocking',
    'terrain-los-divided-side-path-blocking',
    'terrain-los-fuel-tank-damageable-cover-providers',
    'terrain-los-fuel-tank-elevation',
    'terrain-los-grounded-dropship-cover-providers',
    'terrain-los-hard-soft-building-cover-providers',
    'terrain-los-intervening-elevation-blocking',
    'terrain-los-same-building-hex-blocking',
    'terrain-los-same-building-level-count',
    'terrain-los-side-paths',
    'terrain-los-tacops-diagram-combat-caller-option-propagation',
    'terrain-los-tacops-diagram-industrial-zone-side-paths',
    'terrain-los-tacops-diagram-planted-field-side-paths',
    'terrain-los-tacops-diagram-represented-pure-elevation',
    'terrain-los-tacops-diagram-represented-terrain-effects',
    'terrain-los-underwater-clear-hex-blocking',
    'terrain-los-underwater-depth-height-side-paths',
    'terrain-los-water-endpoint-blocking',
    'terrain-movement-costs',
    'terrain-partial-cover',
    'terrain-to-hit-features',
    'water-cooling',
    'water-ground-disallow',
    'wind',
  ]);
  expect(
    supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'unsupported'),
  ).toEqual(
    [
      ...MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
      ...TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
    ].sort(),
  );
  expect(
    supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'out-of-scope'),
  ).toEqual(['minefield-non-battlemech-sea-variants']);
  expect(
    Object.values(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)
      .filter((entry) => entry.level !== 'unsupported')
      .flatMap((entry) =>
        (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
      ),
  ).toEqual([]);
  Object.values(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT).forEach((entry) => {
    if (entry.level === 'unsupported') return;

    const sourceRefs = entry.sourceRefs ?? [];
    const megaMekRefs = sourceRefs.filter(
      (sourceRef) => sourceRef.kind === 'megamek-source',
    );
    if (megaMekRefs.length > 0) {
      expectPinnedMegaMekRefs(megaMekRefs);
    }
    expect(
      sourceRefs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' ||
          (sourceRef.kind === 'mekstation-deviation' &&
            sourceRef.sourceVersion === 'MekStation working-tree' &&
            sourceRef.url.includes('#L')),
      ),
    ).toBe(true);
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'terrain-movement-costs'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    expect.stringContaining('Terrains enumerates core terrain ids'),
    expect.stringContaining('Terrain.movementCost maps additional movement'),
  ]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['water-ground-disallow'].sourceRefs?.map(
      ({ kind, citation }) => `${kind}:${citation}`,
    ),
  ).toEqual([
    expect.stringContaining(
      'mekstation-deviation:MekStation getHexMovementCost',
    ),
  ]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.atmosphere.sourceRefs?.map(
      ({ kind }) => kind,
    ),
  ).toEqual(['mekstation-deviation']);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.dust.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('blowing sand'),
      expect.stringContaining('IEnvironmentalConditions'),
      expect.stringContaining('energy'),
    ]),
  );
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('TerrainType enum carries Mines'),
      expect.stringContaining('apply represented TerrainType.Mines'),
    ]),
  );
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-variant-side-paths'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Minefield represents minefield state'),
      expect.stringContaining('enterMinefield resolves minefield'),
      expect.stringContaining('MINEFIELD is scenario-generation modifier'),
      expect.stringContaining('TerrainType enum carries Mines'),
    ]),
  );
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-non-battlemech-sea-variants'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('sea/depth state'),
    gap: expect.stringContaining('outside this BattleMech suite'),
  });
});
