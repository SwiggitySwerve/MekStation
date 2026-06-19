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

it('pins source-backed to-hit modifiers to MegaMek refs', () => {
  expectSourceBackedToHitModifiersPinned();

  const gunneryRefs = sourceRefsForToHitModifier('gunnery');
  const attackerMovementRefs = sourceRefsForToHitModifier('attacker-movement');
  const targetMovementRefs = sourceRefsForToHitModifier('target-movement');
  const targetEvasionRefs = sourceRefsForToHitModifier('target-evasion');
  const heatRefs = sourceRefsForToHitModifier('heat');
  const partialCoverRefs = sourceRefsForToHitModifier('partial-cover');
  const pilotWoundsRefs = sourceRefsForToHitModifier('pilot-wounds');
  const ecmRefs = sourceRefsForToHitModifier('ecm');
  const secondaryTargetRefs = sourceRefsForToHitModifier('secondary-target');
  const calledShotRefs = sourceRefsForToHitModifier('called-shot');
  const c3Refs = sourceRefsForToHitModifier('c3');
  const c3EquipmentConservativeNetworkSeedingRefs = sourceRefsForToHitModifier(
    'c3-equipment-conservative-network-seeding',
  );
  const c3EquipmentUnambiguousNetworkFormationRefs = sourceRefsForToHitModifier(
    'c3-equipment-unambiguous-network-formation',
  );
  const c3EquipmentDenialBoundaryRefs = sourceRefsForToHitModifier(
    'c3-equipment-denial-boundaries',
  );
  const c3EquipmentIndependentSideFormationRefs = sourceRefsForToHitModifier(
    'c3-equipment-independent-side-formation',
  );
  const c3EquipmentFormationRefs = sourceRefsForToHitModifier(
    'c3-equipment-network-formation',
  );
  const hullDownRefs = sourceRefsForToHitModifier('hull-down');
  const physicalDfaTargetClassRefs = sourceRefsForToHitModifier(
    'physical-dfa-target-class',
  );
  const physicalDfaPilotingDifferentialRefs = sourceRefsForToHitModifier(
    'physical-dfa-piloting-differential',
  );
  const minimumRangeRefs = sourceRefsForToHitModifier('minimum-range');

  expect(gunneryRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining('starts normal weapon attacks'),
  ]);
  expect(attackerMovementRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining("attacker's movement modifier"),
    expect.stringContaining('walk +1, run +2, jump +3'),
  ]);
  expect(targetMovementRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining('appends target movement modifiers'),
    expect.stringContaining('standard TMM brackets'),
  ]);
  expect(targetEvasionRefs.map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('getEvasionBonus'),
      expect.stringContaining('target evasion bonus'),
    ]),
  );
  expect(
    RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-evasion'].evidence,
  ).toContain('calculatePhysicalToHit');
  expect(heatRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining("attacker's heat firing modifier"),
    expect.stringContaining('standard heat firing thresholds'),
  ]);
  expect(partialCoverRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining('target partial cover'),
    expect.stringContaining('partial-cover hit-table'),
  ]);
  expect(pilotWoundsRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining('crew gunnery skill'),
    expect.stringContaining('unit-class scoped'),
  ]);
  expect(ecmRefs.map(({ citation }) => citation)).toEqual([
    expect.stringContaining('isAffectedByECM'),
    expect.stringContaining('gates Artemis V and NARC/iNARC'),
    expect.stringContaining('targeting-computer'),
    expect.stringContaining('suppress Artemis and NARC-capable'),
  ]);
  expect(secondaryTargetRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
    'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
  ]);
  expect(calledShotRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
  ]);
  expect(c3Refs.map(({ citation }) => citation)).toEqual([
    'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
    'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
    'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
  ]);
  expect(
    c3EquipmentConservativeNetworkSeedingRefs.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
    'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
    'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
    'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
    'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
    'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
    'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
    'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
  ]);
  expect(
    c3EquipmentUnambiguousNetworkFormationRefs.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
    'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
    'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
    'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
    'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
    'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
    'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
    'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
  ]);
  expect(c3EquipmentDenialBoundaryRefs.map(({ citation }) => citation)).toEqual(
    [
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ],
  );
  expect(
    c3EquipmentIndependentSideFormationRefs.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
    'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
    'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
    'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
    'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
    'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
    'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
    'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
  ]);
  expect(c3EquipmentFormationRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
    'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
    'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
    'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
    'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
    'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
    'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
    'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
  ]);
  expect(hullDownRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek ComputeTerrainMods applies WeaponAttackAction.HullDown as a +2 terrain modifier for hull-down Mek targets with LOS cover.',
  ]);
  expect(physicalDfaTargetClassRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek DfaAttackAction.toHit applies +3 for Infantry targets and +1 for Battle Armor targets.',
  ]);
  expect(
    physicalDfaPilotingDifferentialRefs.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek DfaAttackAction.toHit applies attacker piloting minus target piloting as the piloting skill differential.',
  ]);
  expect(minimumRangeRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
    'MegaMek Compute.getRangeMods adds the ground-to-ground minimum range penalty as minRange - distance + 1.',
  ]);
});

it('tracks physical damage modifiers separately from helper-only environment inputs', () => {
  expect(supportGaps(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'claw-physical-critical-production',
    'claw-represented-equipment-cleanup',
    'claw-source-mount-missing-breached-cleanup',
    'claws',
    'talon-physical-critical-production',
    'talon-represented-equipment-cleanup',
    'talon-source-mount-missing-breached-cleanup',
    'talons',
    'tsm',
    'underwater',
  ]);
  expect(
    supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'out-of-scope'),
  ).toEqual(['claw-equipment-lifecycle', 'talon-equipment-lifecycle']);
  expect(
    PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT['claw-equipment-lifecycle'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'Represented runtime claw lifecycle paths are covered',
    ),
    gap: expect.stringContaining(
      'must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
    ),
  });
  expect(
    PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT['talon-equipment-lifecycle'],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'Represented runtime talon lifecycle paths are covered',
    ),
    gap: expect.stringContaining(
      'must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
    ),
  });
});

it('pins physical damage modifier rows to MegaMek source refs', () => {
  Object.values(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT).forEach((entry) => {
    expectPinnedMegaMekRefs(
      (entry.sourceRefs ?? []).filter(
        (sourceRef) => sourceRef.kind === 'megamek-source',
      ),
    );
  });

  expect(
    PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.tsm.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek KickAttackAction.getDamageFor doubles kick damage with active TSM before talon, melee-specialist, underwater, and infantry adjustments.',
    'MegaMek PunchAttackAction.getDamageFor doubles punch damage with active TSM before melee-specialist, underwater, and infantry adjustments.',
    'MegaMek ClubAttackAction.getDamageFor doubles active-TSM club damage while explicitly excluding saws, pile drivers, shields, wrecking balls, flails, active vibroblades, and other fixed-damage tools.',
  ]);

  expect(
    PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.claws.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek PunchAttackAction.getDamageFor uses ceil(weight / 7) when the punching arm has working claws',
    'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
    'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
  ]);

  expect(
    PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.talons.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
    'MegaMek DfaAttackAction.getDamageFor and hasTalons apply 1.5 DFA damage when a qualifying talon leg has a working foot actuator',
    'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
    'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
  ]);

  expect(
    PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.underwater.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek KickAttackAction.getDamageFor halves wet-location kick damage and rounds up.',
    'MegaMek PunchAttackAction.getDamageFor halves wet-location punch damage and rounds up.',
    'MegaMek ClubAttackAction.getDamageFor halves wet-location club damage after resolving the mounted club location.',
  ]);
});
