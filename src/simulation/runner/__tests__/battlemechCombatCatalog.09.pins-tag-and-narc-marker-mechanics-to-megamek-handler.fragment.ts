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

it('pins TAG and NARC marker mechanics to MegaMek handler refs', () => {
  const sourceRefsFor = (
    id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

  expect(
    sourceRefsFor('narc-marker-attachment').map(({ citation }) => citation),
  ).toEqual([
    'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-variants').map(({ citation }) => citation),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-object-lifecycle').map(({ citation }) => citation),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
    'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-target-identity-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
    'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-target-option-deduplication').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
    'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-helper-removal-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
    'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-event-replay-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
  ]);
  expect(
    sourceRefsFor('inarc-ecm-sensor-effects').map(({ citation }) => citation),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
    'MissileWeaponHandler suppresses Artemis, prototype Artemis, and Artemis V cluster guidance when the attacker-to-target missile path is ECM affected.',
    'MegaMek sensor range-bracket checks add active sensor ECM modifiers for the detecting unit and target ECM modifiers for the detected entity.',
    'MegaMek Sensor.getModForECM and getModForTargetECM route sensor-check ECM penalties through ComputeECM effects.',
  ]);
  expect(
    sourceRefsFor('inarc-producer-c3-authoring').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
    'ComputeC3Spotter rejects C3 node paths when ComputeECM reports ECM effects on either leg of the network connection.',
  ]);
  expect(
    sourceRefsFor('inarc-pod-brush-off-removal-lifecycle').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
    'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
    'MekStation runner physical Brush-Off removes the selected same-team same-type iNarc pod, preserving legacy first-pod removal when no selector is present.',
    'MekStation interactive physical declarations and resolutions carry Brush-Off selectedINarcPod state from the context or first attached pod.',
    'MekStation physical attack events persist selectedINarcPod identity on declared and resolved Brush-Off payloads.',
    'MekStation runner tests prove selected Brush-Off declaration and resolution remove the matching iNarc pod while preserving nonmatching pods.',
  ]);
  expect(
    sourceRefsFor('inarc-explosive-ammo-compatibility').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'AmmoType defines iNarc Explosive Pods as INARC explosive ammo with 6 damage and rack size 1.',
    'NarcWeapon routes NARC/iNARC explosive munition attacks through NarcExplosiveHandler instead of the marker-attachment handler.',
    'NarcExplosiveHandler resolves iNarc explosive pod hits as one pod and 6 damage per hit.',
  ]);
  expect(
    sourceRefsFor('inarc-variant-ammo-attachment').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
  ]);
  expect(
    sourceRefsFor('inarc-ecm-attacker-flight-path-suppression').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
    'MissileWeaponHandler suppresses Artemis, prototype Artemis, and Artemis V cluster guidance when the attacker-to-target missile path is ECM affected.',
  ]);
  expect(
    sourceRefsFor('inarc-ecm-c3-disruption').map(({ citation }) => citation),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
    'ComputeC3Spotter rejects C3 node paths when ComputeECM reports ECM effects on either leg of the network connection.',
  ]);
  expect(
    sourceRefsFor('inarc-nemesis-redirect').map(({ citation }) => citation),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'MissileWeaponHandler redirects iNarc Nemesis-confusable missiles to friendly intervening Nemesis pod carriers before returning to the original target on misses.',
    'MissileWeaponHandler scopes iNarc Nemesis confusion to direct ATM, Artemis-linked, NARC-capable, or Listen-Kill LRM/SRM missile attacks.',
    'Game.getNemesisTargets returns friendly entities with iNarc Nemesis pods attached in intervening hexes between attacker and original target.',
  ]);
  expect(
    sourceRefsFor('inarc-homing-to-hit-modifier').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'Entity.isINarcedBy returns true only for Homing iNarc pods from the firing team.',
    'ComputeToHit marks NARC-capable LRM/SRM/MML attacks as iNarc-guided when the target carries a Homing iNarc pod and target ECM does not suppress it.',
    'ComputeToHit applies the -1 iNarc Homing to-hit modifier to iNarc-guided missile attacks.',
    'MissileWeaponHandler applies the NARC cluster modifier to direct NARC-capable missiles when the target is NARCed or iNARC Homing-marked and target ECM does not suppress it.',
  ]);
  expect(
    sourceRefsFor('inarc-haywire-to-hit-modifier').map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    'Entity.isINarcedWith checks attached iNarc pod type from any team.',
    'ComputeToHit derives isHaywireINarced from the attacker entity before compiling attacker to-hit modifiers.',
    'ComputeAttackerToHitMods applies the +1 iNarc Haywire attacker to-hit modifier.',
  ]);
  expect(
    sourceRefsFor('tag-designation-hit').map(({ citation }) => citation),
  ).toEqual([
    'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
  ]);
  expect(
    sourceRefsFor('tag-turn-lifecycle-clear').map(({ citation }) => citation),
  ).toEqual([
    'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
    'Game.resetTagInfo clears the tagInfoForTurn collection.',
  ]);

  const refs = [
    ...sourceRefsFor('narc-marker-attachment'),
    ...sourceRefsFor('inarc-pod-variants'),
    ...sourceRefsFor('inarc-pod-event-replay-lifecycle'),
    ...sourceRefsFor('inarc-pod-target-identity-lifecycle'),
    ...sourceRefsFor('inarc-pod-target-option-deduplication'),
    ...sourceRefsFor('inarc-variant-ammo-attachment'),
    ...sourceRefsFor('inarc-ecm-attacker-flight-path-suppression'),
    ...sourceRefsFor('inarc-nemesis-redirect'),
    ...sourceRefsFor('inarc-homing-marker-attachment'),
    ...sourceRefsFor('inarc-homing-cluster-modifier'),
    ...sourceRefsFor('inarc-homing-to-hit-modifier'),
    ...sourceRefsFor('inarc-haywire-to-hit-modifier'),
    ...sourceRefsFor('tag-designation-hit'),
    ...sourceRefsFor('tag-turn-lifecycle-clear'),
    ...sourceRefsFor('tag-marker-lifecycle-events'),
    ...sourceRefsFor('narc-marker-lifecycle-events'),
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
