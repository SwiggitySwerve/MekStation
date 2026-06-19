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

it('pins every canonical SPA scope row to anchored source refs', () => {
  const invalidRefs = Object.entries(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)
    .flatMap(([id, entry]) => {
      const sourceRefs = entry.sourceRefs ?? [];
      if (sourceRefs.length === 0) return [`${id}: missing sourceRefs`];

      return sourceRefs.flatMap((sourceRef, index) => {
        const refId = `${id}.sourceRefs[${index}]`;
        const failures: string[] = [];

        if (sourceRef.citation.trim().length === 0) {
          failures.push(`${refId}: missing citation`);
        }
        if (!sourceRef.url.includes('#L')) {
          failures.push(`${refId}: missing line anchor`);
        }
        if (sourceRef.sourceVersion.trim().length === 0) {
          failures.push(`${refId}: missing sourceVersion`);
        }
        if (
          sourceRef.kind === 'megamek-source' &&
          (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/') ||
            !sourceRef.url.includes(sourceRef.sourceVersion))
        ) {
          failures.push(`${refId}: MegaMek ref is not commit-pinned`);
        }

        return failures;
      });
    })
    .sort();

  expect(invalidRefs).toEqual([]);
  expect(
    Object.entries(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)
      .filter(
        ([, entry]) =>
          !(entry.sourceRefs ?? []).some(
            (sourceRef) => sourceRef.kind === 'mekstation-deviation',
          ),
      )
      .map(([id]) => id),
  ).toEqual([]);
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_masc_fails.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
      'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
    ]),
  );
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.artificial_pain_shunt.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      'MegaMek TWGameManager suppresses BattleMech ammunition-explosion crew hits when the pilot has Artificial Pain Shunt.',
      'MekStation resolveBattleMechAmmoExplosionPilotDamage returns zero for artificial_pain_shunt before applying Pain Resistance, Iron Man, or CASE relief.',
      'MekStation applyAmmoExplosionPilotDamage routes heat-induced and critical-induced ammo explosions through the shared pilot-damage resolver and emits no PilotHit when the resolver returns zero wounds.',
      'MekStation heat event coverage proves artificial_pain_shunt suppresses HeatInduced ammo-explosion PilotHit emission and leaves pilot wounds unchanged.',
      'MekStation bioware SPA table defines Manei Domini neural, comm, dermal, myomer, sensory, prosthetic, gas-effuser, proto-DNI, and suicide-implant rows; canonicalPilotAbilityScope keeps unresolved BattleMech-relevant source-boundary rows as explicit unsupported gaps and splits infantry/personnel-only implant rows out of the BattleMech matrix.',
    ]),
  );
  for (const spaId of ['dermal_armor', 'tsm_implant'] as const) {
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MekStation resolveDfaMissFallPilotDamageAvoidance consumes dermal_armor and tsm_implant pilot ability ids as missed-DFA fall pilot-damage immunity only.',
        'MekStation physical attack helper coverage proves dermal_armor and tsm_implant suppress missed-DFA fall pilot damage without rolling a pilot-damage avoidance check.',
        'MekStation event-sourced physical combat coverage proves a passed missed-DFA fall pilot-damage avoidance emits UnitFell without PilotHit or pilot wounds.',
        'MekStation bioware SPA table defines Manei Domini neural, comm, dermal, myomer, sensory, prosthetic, gas-effuser, proto-DNI, and suicide-implant rows; canonicalPilotAbilityScope keeps unresolved BattleMech-relevant source-boundary rows as explicit unsupported gaps and splits infantry/personnel-only implant rows out of the BattleMech matrix.',
      ]),
    );
  }
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_headhit.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
      'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
      'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
      'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
      'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
    ]),
  );
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_tac.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
      'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
      'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
      'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
      'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
    ]),
  );
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_ko.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
      'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids, partitions represented BattleMech triggers from out-of-scope aerospace triggers, deriveEdgePointCountFromPilotAbilities models the generic Edge point producer, and createEdgeState/canUseEdge/useEdge model trigger point consumption.',
      'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
    ]),
  );
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_explosion.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
      'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
      'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
      'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
      'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
      'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
    ]),
  );
});

it('tracks ejection as UI-visible with lifecycle event and network intent support', () => {
  const ejectCommand = buildUtilityCommands().find(
    (command) => command.id === 'utility.eject',
  );
  const event = createUnitEjectedEvent(
    'catalog-ejection',
    1,
    1,
    GamePhase.Movement,
    'player-1',
    'player_declared',
  );

  expect(ejectCommand?.commit({} as never).actionId).toBe('eject');
  expect(event.type).toBe(GameEventType.UnitEjected);
  expect(event.payload).toMatchObject({
    unitId: 'player-1',
    reason: 'player_declared',
  });
  expect(GAME_INTENT_TYPES).toContain('eject');
  expect(
    isKnownLimitation({
      invariant: 'combat-ejection',
      severity: 'warning',
      message: 'ejection network intent not implemented',
      context: {},
    }),
  ).toBe(false);
});

it('tracks official physical catalog entries against runtime attack support', () => {
  expect(sortedKeys(PHYSICAL_WEAPON_COMBAT_SUPPORT)).toEqual(
    ids(physicalWeaponItems),
  );
  expect(supportGaps(PHYSICAL_WEAPON_COMBAT_SUPPORT)).toEqual([]);

  const integrated = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
    .filter((entry) => entry.level === 'integrated')
    .map((entry) => entry.id)
    .sort();
  const unsupported = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
    .filter((entry) => entry.level === 'unsupported')
    .map((entry) => entry.id)
    .sort();
  const helperOnly = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
    .filter((entry) => entry.level === 'helper-only')
    .map((entry) => entry.id)
    .sort();

  expect(integrated).toEqual(ids(physicalWeaponItems));
  expect([...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES].sort()).toEqual(
    ids(physicalWeaponItems).filter((id) => id !== 'claws' && id !== 'talons'),
  );
  expect(
    Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'integrated')
      .flatMap((entry) =>
        (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
      ),
  ).toEqual([]);
  expect(helperOnly).toEqual([]);
  expect(
    physicalWeaponItems
      .filter((item) => item.id === 'claws' || item.id === 'talons')
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        evidence:
          PHYSICAL_WEAPON_COMBAT_SUPPORT[item.id as 'claws' | 'talons']
            .evidence,
        level:
          PHYSICAL_WEAPON_COMBAT_SUPPORT[item.id as 'claws' | 'talons'].level,
      }))
      .sort((left, right) => String(left.id).localeCompare(String(right.id))),
  ).toEqual([
    {
      id: 'claws',
      name: 'Claws',
      type: 'Claws',
      evidence: expect.stringContaining(
        'not as a standalone runtime PhysicalAttackType',
      ),
      level: 'integrated',
    },
    {
      id: 'talons',
      name: 'Talons',
      type: 'Talons',
      evidence: expect.stringContaining(
        'not as a standalone runtime PhysicalAttackType',
      ),
      level: 'integrated',
    },
  ]);
  expect(unsupported).toEqual([]);
});

it('tracks runner range brackets including extreme range support', () => {
  expect(sortedKeys(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT)).toEqual([
    'extreme',
    'long',
    'medium',
    'out_of_range',
    'short',
  ]);
  expect(supportGaps(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT, 'integrated'),
  ).toEqual(['extreme', 'long', 'medium', 'out_of_range', 'short']);
  expect(
    supportIdsByLevel(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  Object.values(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT).forEach((entry) => {
    expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
  });
  expect(
    RUNNER_RANGE_BRACKET_COMBAT_SUPPORT.short.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
    'MegaMek Compute.getRangeMods applies attacker short, medium, long, and extreme range modifiers after resolving the active range bracket.',
  ]);
  expect(
    RUNNER_RANGE_BRACKET_COMBAT_SUPPORT.extreme.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
    'MegaMek Compute.getRangeMods reads the TacOps extreme-range option before classifying attack range.',
    'MegaMek Compute.getRangeMods applies attacker short, medium, long, and extreme range modifiers after resolving the active range bracket.',
  ]);
  expect(
    RUNNER_RANGE_BRACKET_COMBAT_SUPPORT.out_of_range.sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
    'MegaMek Compute.getRangeMods converts out-of-range attacks into automatic failure before normal attack resolution.',
  ]);
});

it('tracks runner to-hit modifiers separately from helper-only modifier math', () => {
  expect(supportGaps(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT)).toEqual([]);
  expect(
    supportIdsByLevel(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT, 'integrated'),
  ).toEqual([
    'actuator-damage',
    'attacker-movement',
    'attacker-prone',
    'c3',
    'c3-equipment-conservative-network-seeding',
    'c3-equipment-denial-boundaries',
    'c3-equipment-independent-side-formation',
    'c3-equipment-unambiguous-network-formation',
    'called-shot',
    'ecm',
    'environmental-conditions',
    'gunnery',
    'heat',
    'hull-down',
    'indirect-fire',
    'minimum-range',
    'partial-cover',
    'physical-dfa-piloting-differential',
    'physical-dfa-target-class',
    'pilot-wounds',
    'range',
    'secondary-target',
    'sensor-damage',
    'target-evasion',
    'target-immobile',
    'target-movement',
    'target-prone',
    'terrain-features',
  ]);
  expect(
    supportIdsByLevel(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation']
      .level,
  ).toBe('out-of-scope');
});
