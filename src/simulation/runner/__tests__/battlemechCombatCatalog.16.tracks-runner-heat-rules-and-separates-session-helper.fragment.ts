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

it('tracks runner heat rules and separates session/helper-only heat mechanics', () => {
  expect(supportGaps(HEAT_RULE_COMBAT_SUPPORT)).toEqual([]);
  expect(supportIdsByLevel(HEAT_RULE_COMBAT_SUPPORT, 'integrated')).toEqual([
    'ammo-explosion-risk',
    'auto-shutdown',
    'dissipation',
    'engine-heat',
    'environmental-heat',
    'fire-heat',
    'heat-induced-ammo-explosion',
    'heat-sink-damage',
    'jump-distance-heat',
    'maxtech-heat-critical-damage',
    'maxtech-pilot-heat-damage',
    'movement-heat',
    'pilot-heat-damage',
    'shutdown-check',
    'startup',
    'threshold-effects',
    'water-cooling',
    'weapon-heat',
  ]);
  expect(supportIdsByLevel(HEAT_RULE_COMBAT_SUPPORT, 'helper-only')).toEqual(
    [],
  );

  expectHeatRuleSourceRefsPinned();

  const weaponHeatRefs = sourceRefsForHeatRule('weapon-heat');
  const movementHeatRefs = sourceRefsForHeatRule('movement-heat');
  const jumpHeatRefs = sourceRefsForHeatRule('jump-distance-heat');
  const engineHeatRefs = sourceRefsForHeatRule('engine-heat');
  const dissipationRefs = sourceRefsForHeatRule('dissipation');
  const heatSinkDamageRefs = sourceRefsForHeatRule('heat-sink-damage');
  const thresholdEffectRefs = sourceRefsForHeatRule('threshold-effects');
  const heatAmmoExplosionRefs = sourceRefsForHeatRule(
    'heat-induced-ammo-explosion',
  );
  const heatStartupRefs = sourceRefsForHeatRule('startup');
  const heatShutdownRefs = sourceRefsForHeatRule('shutdown-check');
  const autoShutdownRefs = sourceRefsForHeatRule('auto-shutdown');
  const heatRiskRefs = sourceRefsForHeatRule('ammo-explosion-risk');
  const pilotHeatRefs = sourceRefsForHeatRule('pilot-heat-damage');
  const maxTechPilotHeatRefs = sourceRefsForHeatRule(
    'maxtech-pilot-heat-damage',
  );
  const maxTechCriticalHeatRefs = sourceRefsForHeatRule(
    'maxtech-heat-critical-damage',
  );
  const waterCoolingRefs = sourceRefsForHeatRule('water-cooling');
  const fireHeatRefs = sourceRefsForHeatRule('fire-heat');
  const environmentalHeatRefs = sourceRefsForHeatRule('environmental-heat');

  expect(weaponHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('WeaponHandler.addHeat'),
  ]);
  expect(movementHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('addMovementHeat adds heat'),
    expect.stringContaining('getStandingHeat and getWalkHeat'),
    expect.stringContaining('getRunHeat and getSprintHeat'),
    expect.stringContaining('Engine.getRunHeat and getSprintHeat'),
  ]);
  expect(jumpHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('addMovementHeat adds heat'),
    expect.stringContaining('Mek.getJumpHeat'),
  ]);
  expect(engineHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('getEngineCritHeat adds 5 heat'),
  ]);
  expect(dissipationRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('sinks heat with getHeatCapacityWithWater'),
    expect.stringContaining('getHeatCapacity counts active heat sinks'),
  ]);
  expect(heatSinkDamageRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('getHeatCapacity counts active heat sinks'),
  ]);
  expect(thresholdEffectRefs.map((sourceRef) => sourceRef.citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('getHeatFiringModifier applies heat'),
      expect.stringContaining('getHeatMPReduction implements'),
      expect.stringContaining('avoidable shutdown checks'),
      expect.stringContaining('heat >= 19'),
      expect.stringContaining('pilot damage at heat 15/25+'),
    ]),
  );
  expect(heatAmmoExplosionRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('HeatResolver checks heat >= 19'),
    expect.stringContaining('explodeAmmoFromHeat selects'),
  ]);
  expect(heatStartupRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('automatically restarts'),
  ]);
  expect(heatShutdownRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('avoidable shutdown checks'),
  ]);
  expect(autoShutdownRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('automatic shutdown'),
  ]);
  expect(heatRiskRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('heat >= 19'),
  ]);
  expect(pilotHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('pilot damage at heat 15/25+'),
  ]);
  expect(maxTechPilotHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('optional MaxTech heat-scale'),
  ]);
  expect(
    maxTechCriticalHeatRefs.map((sourceRef) => sourceRef.citation),
  ).toEqual([expect.stringContaining('critical damage avoid rolls')]);
  expect(waterCoolingRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('sinks heat with getHeatCapacityWithWater'),
    expect.stringContaining('getHeatCapacityWithWater adds'),
  ]);
  expect(fireHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('spending a full round in fire terrain'),
    expect.stringContaining('caps external heat'),
  ]);
  expect(environmentalHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
    expect.stringContaining('adjustHeatExtremeTemp'),
    expect.stringContaining('caps external heat'),
    expect.stringContaining('local atmosphere heat-dissipation'),
  ]);
});

it('tracks damage, pilot injury, critical components, and destruction causes', () => {
  expect(supportGaps(DAMAGE_RESOLUTION_COMBAT_SUPPORT)).toEqual([]);
  expect(supportGaps(PILOT_DAMAGE_COMBAT_SUPPORT)).toEqual([]);
  expect(supportGaps(CRITICAL_COMPONENT_COMBAT_SUPPORT)).toEqual([]);
  expect(supportGaps(DESTRUCTION_CAUSE_COMBAT_SUPPORT)).toEqual([]);

  expect(
    supportIdsByLevel(DAMAGE_RESOLUTION_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'armor-damage',
    'case-ammo-explosion-containment',
    'damage-transfer',
    'destruction-cause-state-persistence',
    'head-full-damage',
    'heat-ammo-explosion-damage-cascade',
    'internal-structure-damage',
    'location-destroyed-events',
    'rear-armor-damage',
    'side-torso-arm-cascade',
    'transfer-damage-events',
    'twenty-plus-damage-psr',
  ]);
  expect(
    supportIdsByLevel(DAMAGE_RESOLUTION_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);

  expect(supportIdsByLevel(PILOT_DAMAGE_COMBAT_SUPPORT, 'integrated')).toEqual([
    'ammo-explosion-pilot-damage',
    'cockpit-crit-pilot-death',
    'consciousness-check',
    'fall-pilot-damage',
    'head-hit-pilot-event',
    'head-hit-wound',
    'heat-pilot-damage',
    'maxtech-heat-critical-damage',
    'maxtech-heat-pilot-damage',
    'pilot-death',
    'unconsciousness',
  ]);
  expect(supportIdsByLevel(PILOT_DAMAGE_COMBAT_SUPPORT, 'helper-only')).toEqual(
    [],
  );
  expect(
    PILOT_DAMAGE_COMBAT_SUPPORT['ammo-explosion-pilot-damage'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
    'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
    'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
    'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
    'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
  ]);

  expect(
    supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'actuator',
    'ammo',
    'cockpit',
    'engine',
    'equipment',
    'equipment-ac-playtest',
    'equipment-active-probe',
    'equipment-ammo-exhaustion-no-explosion',
    'equipment-artemis-fcs-critical-lifecycle',
    'equipment-blue-shield-explosion',
    'equipment-charged-capacitors',
    'equipment-emergency-coolant',
    'equipment-explosive-equipment',
    'equipment-extended-fuel-tank-explosion',
    'equipment-generic-destroyed-name-replay',
    'equipment-harjel',
    'equipment-hot-load-linked-ammo-inference',
    'equipment-hot-load-mode-state-inference',
    'equipment-hot-loaded-weapons',
    'equipment-partial-wing',
    'equipment-physical-modifiers',
    'equipment-prototype-improved-jump-jet-explosion',
    'equipment-risc-laser-pulse-module-ambiguous-link',
    'equipment-risc-laser-pulse-module-inoperable-linked-module',
    'equipment-risc-laser-pulse-module-linked-laser',
    'equipment-scm',
    'equipment-shields',
    'equipment-stealth-linked-ecm',
    'gyro',
    'heat_sink',
    'jump_jet',
    'life_support',
    'sensor',
    'weapon',
  ]);
  expect(
    supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'unsupported'),
  ).toEqual([...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS].sort());
  expect(
    Object.values(CRITICAL_COMPONENT_COMBAT_SUPPORT)
      .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
      .map((entry) => entry.id),
  ).toEqual([]);
  expect(CRITICAL_COMPONENT_COMBAT_SUPPORT.equipment.gap).toBeUndefined();
  expect(CRITICAL_COMPONENT_COMBAT_SUPPORT.equipment.evidence).toContain(
    'split-accounted',
  );

  expect(
    supportIdsByLevel(DESTRUCTION_CAUSE_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'ammo_explosion',
    'ct_destroyed',
    'damage',
    'engine_destroyed',
    'head_destroyed',
    'impossible_displacement',
    'pilot_death',
  ]);
  expect(
    supportIdsByLevel(DESTRUCTION_CAUSE_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);

  expect(
    DESTRUCTION_CAUSE_COMBAT_SUPPORT.impossible_displacement.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek resolveDfaAttack destroys the attacker on a missed DFA when the target cannot be displaced.',
    'MegaMek resolveDfaAttack destroys the target on a successful DFA when the target cannot be displaced.',
  ]);
});
