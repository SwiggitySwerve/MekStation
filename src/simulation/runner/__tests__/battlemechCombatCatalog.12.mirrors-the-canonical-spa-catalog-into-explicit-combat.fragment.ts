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

it('mirrors the canonical SPA catalog into explicit combat scope support', () => {
  expect(sortedKeys(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)).toEqual(
    sortedKeys(CANONICAL_SPA_CATALOG),
  );
  expect(supportGaps(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)).toEqual([]);

  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.forward_observer.level).toBe(
    'integrated',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.weapon_specialist.level).toBe(
    'integrated',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.oblique_artillery.level).toBe(
    'out-of-scope',
  );
  expect(
    Object.fromEntries(
      [
        'eagle_eyes',
        'env_specialist',
        'golden_goose',
        'human_tro',
        'oblique_artillery',
        'dermal_armor',
        'vdni',
        'boost_comm_implant',
        'tsm_implant',
        'pl_enhanced',
        'cyber_imp_laser',
        'gas_effuser_toxin',
        'suicide_implants',
        'zweihander',
      ].map((spaId) => {
        const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
        return [
          spaId,
          {
            level: support.level,
            evidence: support.evidence,
            gap: support.gap,
            sourceRefCount: support.sourceRefs?.length ?? 0,
          },
        ];
      }),
    ),
  ).toEqual({
    eagle_eyes: {
      level: 'integrated',
      evidence: expect.stringContaining('detonation target-number relief'),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
    env_specialist: {
      level: 'integrated',
      evidence: expect.stringContaining('source-backed runtime branches'),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
    golden_goose: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('bombing to-hit and scatter'),
      gap: expect.stringContaining('aerospace/bombing validation matrix'),
      sourceRefCount: expect.any(Number),
    },
    human_tro: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('battle armor leg-attack helpers'),
      gap: expect.stringContaining('BattleMech pilot combat SPA hydration'),
      sourceRefCount: expect.any(Number),
    },
    oblique_artillery: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('reduced artillery scatter'),
      gap: expect.stringContaining('artillery/scatter validation matrix'),
      sourceRefCount: expect.any(Number),
    },
    dermal_armor: {
      level: 'integrated',
      evidence: expect.stringContaining('entity fall pilot-damage immunity'),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
    vdni: {
      level: 'integrated',
      evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
    boost_comm_implant: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented BattleMech C3i network state',
      ),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
    tsm_implant: {
      level: 'integrated',
      evidence: expect.stringContaining('entity fall pilot-damage immunity'),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
    pl_enhanced: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('personnel equipment'),
      gap: expect.stringContaining('infantry/personnel'),
      sourceRefCount: expect.any(Number),
    },
    cyber_imp_laser: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('personnel equipment'),
      gap: expect.stringContaining('infantry/personnel'),
      sourceRefCount: expect.any(Number),
    },
    gas_effuser_toxin: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('personnel equipment'),
      gap: expect.stringContaining('infantry/personnel'),
      sourceRefCount: expect.any(Number),
    },
    suicide_implants: {
      level: 'out-of-scope',
      evidence: expect.stringContaining('personnel equipment'),
      gap: expect.stringContaining('campaign-capture validation matrix'),
      sourceRefCount: expect.any(Number),
    },
    zweihander: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'every official standalone physical-weapon declaration',
      ),
      gap: undefined,
      sourceRefCount: expect.any(Number),
    },
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.evidence).toContain(
    'represented self-critical side effects',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.gap).toBeUndefined();
  for (const spaId of [
    'eagle_eyes',
    'env_specialist',
    'golden_goose',
    'human_tro',
    'oblique_artillery',
    'dermal_armor',
    'vdni',
    'boost_comm_implant',
    'tsm_implant',
    'pl_enhanced',
    'cyber_imp_laser',
    'gas_effuser_toxin',
    'suicide_implants',
    'zweihander',
  ]) {
    const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
    if (support.gap !== undefined) {
      expect(support.gap).not.toContain(
        'No combat support entry or resolver consumes this canonical SPA id yet',
      );
    }
    expect(support.sourceRefs?.length ?? 0).toBeGreaterThan(0);
  }
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'eagle-eyes-active-probe-range-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented active-probe ECM-counter range slice',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('adds a +1 active-probe range bonus'),
      }),
    ]),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.aptitude_gunnery).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('ATOW/origin-level'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.aptitude_piloting).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('ATOW/origin-level'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.atow_g_tolerance).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('aerospace-control'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.foot_cav.level).toBe(
    'out-of-scope',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_headhit).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('hit-location'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_tac).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('TAC hit-location'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_ko).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('resolvePilotConsciousnessCheck'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_explosion).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('resolveCriticalHits'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_masc_fails.level).toBe(
    'integrated',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_aero_alt_loss.level).toBe(
    'out-of-scope',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.animal_mimic).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('quad Mek PSRs'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.sandblaster).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('official ordinary AC rapid-fire modes'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.sandblaster.gap).toBeUndefined();
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'dermal-armor-head-hit-pilot-damage-suppression'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('dermal_armor'),
  });
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'pilotSkills.pilotModifierResolvers.dermal-armor-head-hit-pilot-damage-suppression',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'dfa-miss-bioware-pilot-damage-avoidance'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('dermal_armor and tsm_implant'),
  });
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'pilotSkills.pilotModifierResolvers.dfa-miss-bioware-pilot-damage-avoidance',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'pilotSkills.pilotModifierResolvers.env-specialist-snow-ranged-to-hit-application',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'pilotSkills.pilotModifierResolvers.env-specialist-wind-ranged-to-hit-application',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'pilotSkills.pilotModifierResolvers.zweihander-punch-physical-application',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.dermal_armor',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.tsm_implant',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.comm_implant',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.boost_comm_implant',
  );
  expect(getCombatValidationUnresolvedRefs()).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.proto_dni',
  );
  expect(getCombatValidationOutOfScopeRefs()).not.toEqual(
    expect.arrayContaining([
      'featureSupport.canonicalPilotAbilityScope.boost_comm_implant',
      'featureSupport.canonicalPilotAbilityScope.comm_implant',
      'featureSupport.canonicalPilotAbilityScope.proto_dni',
    ]),
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.cluster_master.level).toBe(
    'out-of-scope',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('ground-to-air'),
  });
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.artificial_pain_shunt,
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'BattleMech ammunition-explosion pilot damage',
    ),
  });
  const shakyStickRefs =
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick.sourceRefs ?? [];
  const shakyStickCitations = shakyStickRefs.map(({ citation }) => citation);
  expect(shakyStickCitations).toEqual(
    expect.arrayContaining([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
      'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
      'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
    ]),
  );
  expect(
    shakyStickRefs.some(
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
