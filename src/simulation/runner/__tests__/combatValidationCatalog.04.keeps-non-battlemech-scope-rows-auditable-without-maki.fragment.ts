import type {
  CatalogMapRow,
  CombatValidationCatalogSection,
  CombatValidationSourceRef,
  CombatValidationSupportEntry,
  CombatValidationSupportMap,
  ICombatCatalogTriadEvidence,
  ICombatCatalogTriadTestReference,
} from './combatValidationCatalog.test-helpers';

import {
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  CLOSED_EJECTION_COVERAGE_REFS,
  COMBAT_CATALOG_TRIAD_EVIDENCE,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  VALID_SOURCE_KINDS,
  catalogEntryRef,
  catalogMaps,
  entryNeedsEvidenceOrGap,
  entrySourceRefFailures,
  existsSync,
  fileLineCount,
  filterCombatValidationGapRowsByScope,
  findMissingEvidenceOrGapRefs,
  findMissingSourceRefRefs,
  findTriadEvidenceFailures,
  findTriadSectionKeyFailures,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRefs,
  getCombatValidationUnresolvedRows,
  hasIntegratedRows,
  isCombatValidationAggregateGapRow,
  join,
  parseLocalSourceAnchor,
  readFileSync,
  sortedKeys,
  sourceRefAnchorFailures,
  sourceRefAuthorityFailures,
  sourceRefMetadataFailures,
  spawnSync,
  supportIds,
  triadEvidenceFailuresForMap,
  triadEvidenceMaps,
  triadSectionMapMatches,
  triadTestRefFailures,
  validateSourceRef,
} from './combatValidationCatalog.test-helpers';

it('keeps non-BattleMech scope rows auditable without making them BattleMech blockers', () => {
  const outOfScopeRows = getCombatValidationOutOfScopeRows();
  const outOfScopeRefs = getCombatValidationOutOfScopeRefs();

  expect(outOfScopeRefs).toEqual(outOfScopeRows.map((row) => row.ref));
  expect(outOfScopeRefs).toEqual(
    expect.arrayContaining([
      'damageAndDeath.criticalComponents.equipment-bomb-bays',
      'damageAndDeath.criticalComponents.equipment-blue-shield-special-rules',
      'damageAndDeath.criticalSlotEffects.equipment-bomb-bays',
      'damageAndDeath.criticalSlotEffects.equipment-blue-shield-special-rules',
      'eventStream.nonBattleMechEventScope.leg_attack',
      'ruleSupport.toHitModifiers.c3-equipment-network-formation',
      'eventStream.nonBattleMechEventScope.motive_damaged',
      'eventStream.nonBattleMechEventScope.swarm_damage',
      'eventStream.nonBattleMechEventScope.vtol_crash_check',
      'actions.physicalActionClassScope.airmek-ram',
      'actions.physicalActionClassScope.battle-armor-vibro-claw',
      'actions.physicalActionClassScope.lay-explosives',
      'actions.physicalActionClassScope.protomek-physical',
      'actions.physicalActionClassScope.ram',
      'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
      'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
      'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
      'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
      'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
      'featureSupport.pilotAbilities.acrobat',
      'featureSupport.pilotAbilities.antagonizer',
      'featureSupport.pilotAbilities.combat-intuition',
      'featureSupport.pilotAbilities.cool-under-fire',
      'featureSupport.pilotAbilities.evasive',
      'featureSupport.pilotAbilities.multi-target',
      'featureSupport.canonicalPilotAbilityScope.aptitude_gunnery',
      'featureSupport.canonicalPilotAbilityScope.aptitude_piloting',
      'featureSupport.canonicalPilotAbilityScope.atow_combat_paralysis',
      'featureSupport.canonicalPilotAbilityScope.atow_combat_sense',
      'featureSupport.canonicalPilotAbilityScope.atow_g_tolerance',
      'featureSupport.canonicalPilotAbilityScope.cross_country',
      'featureSupport.canonicalPilotAbilityScope.dermal_camo_armor',
      'featureSupport.canonicalPilotAbilityScope.edge_when_aero_alt_loss',
      'featureSupport.canonicalPilotAbilityScope.foot_cav',
      'featureSupport.canonicalPilotAbilityScope.gunnery_laser',
      'featureSupport.canonicalPilotAbilityScope.weathered',
      'featureSupport.pilotAbilities.cross-country',
      'featureSupport.pilotAbilities.marksman',
      'featureSupport.pilotAbilities.natural-grace',
      'featureSupport.pilotAbilities.sharpshooter',
      'featureSupport.pilotAbilities.speed-demon',
      'featureSupport.mechQuirks.rugged_1',
      'featureSupport.mechQuirks.rugged_2',
      'lifecycleAndPsr.psrTriggers.charge_miss',
      'lifecycleAndPsr.psrTriggers.dfa_miss',
      'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
      'pilotSkills.pilotModifierResolvers.target-priority-application',
      'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
      'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
      'validationScope.objectiveRequirements.campaign-quirk-behavior',
      'validationScope.objectiveRequirements.physical-weapon-actions',
      'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
      'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
      'validationScope.objectiveRequirements.non-battlemech-scope',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-dropship-secondary-hex',
      'actions.gmCommandExclusions.gm.advance-phase',
      'actions.gmCommandExclusions.gm.correct-attack',
      'actions.gmCommandExclusions.gm.grant-resource',
      'actions.gmCommandExclusions.gm.reload-unit',
      'actions.gmCommandExclusions.gm.set-damage',
      'actions.gmCommandExclusions.gm.set-heat-ammo',
      'actions.gmCommandExclusions.gm.set-initiative',
      'actions.gmCommandExclusions.gm.set-lifecycle',
      'actions.gmCommandExclusions.gm.set-objective',
      'actions.gmCommandExclusions.gm.set-position-facing',
      'actions.tacticalCommands.movement.cancel',
      'actions.tacticalCommands.movement.stabilize',
      'actions.tacticalCommands.utility.withdraw',
      'actions.tacticalCommands.weapon.clear-attacks',
      'actions.tacticalCommands.weapon.declare-attack',
      'actions.wireIntents.ForfeitMatch',
      'actions.wireIntents.LaunchMatch',
      'actions.wireIntents.LeaveSeat',
      'actions.wireIntents.MarkSeatAi',
      'actions.wireIntents.OccupySeat',
      'actions.wireIntents.ReassignSeat',
      'actions.wireIntents.SetAiSlot',
      'actions.wireIntents.SetHumanSlot',
      'actions.wireIntents.SetReady',
    ]),
  );
  expect(outOfScopeRows).toHaveLength(148);
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
    ),
  ).toBeUndefined();
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref === 'ruleSupport.toHitModifiers.c3-equipment-network-formation',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'represented BattleMech C3 runtime behavior is covered by explicit session-authored IGameState.c3Network consumption, mounted equipment role hydration, conservative single-network seeding, unambiguous per-side C3/C3i formation, independent side-by-side formation/denial evaluation, and fail-closed denial boundaries',
    ),
    gap: expect.stringContaining('Manual C3 network authoring UI'),
  });
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref === 'ruleSupport.toHitModifiers.c3-equipment-network-formation',
    ),
  ).toMatchObject({
    gap: expect.stringContaining(
      'automatic same-side multiple-network partitioning',
    ),
  });
  expect(outOfScopeRefs).toContain(
    'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
  );
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('sea/depth state'),
    gap: expect.stringContaining('outside this BattleMech suite'),
  });
  expect(outOfScopeRefs).toContain(
    'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
  );
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence:
      'MegaMek Supercharger has explicit Tank, SupportTank, SupportVTOL, and non-Mek failure-damage branches, but this catalog is scoped to BattleMech combat validation',
    gap: 'Non-BattleMech Supercharger support-unit roll adjustment and vehicle motive-damage branches stay outside this BattleMech suite instead of being counted as BattleMech movement-enhancement blockers',
  });
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('actions.physicalActionClassScope.'),
    ),
  ).toEqual([
    'actions.physicalActionClassScope.airmek-ram',
    'actions.physicalActionClassScope.battle-armor-vibro-claw',
    'actions.physicalActionClassScope.lay-explosives',
    'actions.physicalActionClassScope.protomek-physical',
    'actions.physicalActionClassScope.ram',
  ]);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('featureSupport.ammunitionCompatibility.'),
    ),
  ).toEqual([
    'featureSupport.ammunitionCompatibility.experimental-empty-compatible-row',
    'featureSupport.ammunitionCompatibility.non-battlemech-aerospace-capital-ammo',
    'featureSupport.ammunitionCompatibility.non-battlemech-battle-armor',
    'featureSupport.ammunitionCompatibility.non-battlemech-protomech',
    'featureSupport.ammunitionCompatibility.unofficial-empty-compatible-row',
    'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
    'featureSupport.ammunitionCompatibility.unsupported-artillery-ammo',
  ]);
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'featureSupport.ammunitionCompatibility.experimental-empty-compatible-row',
    ),
  ).toMatchObject({
    evidence: expect.stringContaining('Experimental BattleMech-family ammo'),
    gap: expect.stringContaining('separate validation matrix'),
  });
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'featureSupport.ammunitionCompatibility.unofficial-empty-compatible-row',
    ),
  ).toMatchObject({
    evidence: expect.stringContaining('Unofficial BattleMech-family ammo'),
    gap: expect.stringContaining('separate validation matrix'),
  });
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('featureSupport.canonicalPilotAbilityScope.'),
    ),
  ).toEqual([
    'featureSupport.canonicalPilotAbilityScope.allweather',
    'featureSupport.canonicalPilotAbilityScope.aptitude_gunnery',
    'featureSupport.canonicalPilotAbilityScope.aptitude_piloting',
    'featureSupport.canonicalPilotAbilityScope.atow_combat_paralysis',
    'featureSupport.canonicalPilotAbilityScope.atow_combat_sense',
    'featureSupport.canonicalPilotAbilityScope.atow_g_tolerance',
    'featureSupport.canonicalPilotAbilityScope.blind_fighter',
    'featureSupport.canonicalPilotAbilityScope.clan_pilot_training',
    'featureSupport.canonicalPilotAbilityScope.cluster_master',
    'featureSupport.canonicalPilotAbilityScope.cross_country',
    'featureSupport.canonicalPilotAbilityScope.cyber_imp_audio',
    'featureSupport.canonicalPilotAbilityScope.cyber_imp_laser',
    'featureSupport.canonicalPilotAbilityScope.cyber_imp_visual',
    'featureSupport.canonicalPilotAbilityScope.dermal_camo_armor',
    'featureSupport.canonicalPilotAbilityScope.edge_when_aero_alt_loss',
    'featureSupport.canonicalPilotAbilityScope.edge_when_aero_explosion',
    'featureSupport.canonicalPilotAbilityScope.edge_when_aero_ko',
    'featureSupport.canonicalPilotAbilityScope.edge_when_aero_lucky_crit',
    'featureSupport.canonicalPilotAbilityScope.edge_when_aero_nuke_crit',
    'featureSupport.canonicalPilotAbilityScope.edge_when_aero_unit_cargo_lost',
    'featureSupport.canonicalPilotAbilityScope.ei_implant',
    'featureSupport.canonicalPilotAbilityScope.enh_mm_implants',
    'featureSupport.canonicalPilotAbilityScope.filtration_implants',
    'featureSupport.canonicalPilotAbilityScope.foot_cav',
    'featureSupport.canonicalPilotAbilityScope.gas_effuser_pheromone',
    'featureSupport.canonicalPilotAbilityScope.gas_effuser_toxin',
    'featureSupport.canonicalPilotAbilityScope.golden_goose',
    'featureSupport.canonicalPilotAbilityScope.gunnery_ballistic',
    'featureSupport.canonicalPilotAbilityScope.gunnery_laser',
    'featureSupport.canonicalPilotAbilityScope.gunnery_missile',
    'featureSupport.canonicalPilotAbilityScope.human_tro',
    'featureSupport.canonicalPilotAbilityScope.mm_implants',
    'featureSupport.canonicalPilotAbilityScope.oblique_artillery',
    'featureSupport.canonicalPilotAbilityScope.pl_enhanced',
    'featureSupport.canonicalPilotAbilityScope.pl_extra_limbs',
    'featureSupport.canonicalPilotAbilityScope.pl_flight',
    'featureSupport.canonicalPilotAbilityScope.pl_glider',
    'featureSupport.canonicalPilotAbilityScope.pl_ienhanced',
    'featureSupport.canonicalPilotAbilityScope.pl_masc',
    'featureSupport.canonicalPilotAbilityScope.pl_tail',
    'featureSupport.canonicalPilotAbilityScope.sensor_geek',
    'featureSupport.canonicalPilotAbilityScope.small_pilot',
    'featureSupport.canonicalPilotAbilityScope.suicide_implants',
    'featureSupport.canonicalPilotAbilityScope.urban_guerrilla',
    'featureSupport.canonicalPilotAbilityScope.weathered',
  ]);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('featureSupport.specialWeaponFamilies.'),
    ),
  ).toEqual(['featureSupport.specialWeaponFamilies.plasma-cannon']);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('featureSupport.specialWeaponMechanics.'),
    ),
  ).toEqual([
    'featureSupport.specialWeaponMechanics.ams-bay-authoring',
    'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  ]);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('featureSupport.mechQuirks.'),
    ),
  ).toEqual([
    'featureSupport.mechQuirks.exposed_actuators',
    'featureSupport.mechQuirks.low_arms',
    'featureSupport.mechQuirks.protected_actuators',
    'featureSupport.mechQuirks.rugged_1',
    'featureSupport.mechQuirks.rugged_2',
  ]);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('featureSupport.pilotAbilities.'),
    ),
  ).toEqual([
    'featureSupport.pilotAbilities.acrobat',
    'featureSupport.pilotAbilities.antagonizer',
    'featureSupport.pilotAbilities.combat-intuition',
    'featureSupport.pilotAbilities.cool-under-fire',
    'featureSupport.pilotAbilities.cross-country',
    'featureSupport.pilotAbilities.evasive',
    'featureSupport.pilotAbilities.iron-will',
    'featureSupport.pilotAbilities.marksman',
    'featureSupport.pilotAbilities.multi-target',
    'featureSupport.pilotAbilities.natural-grace',
    'featureSupport.pilotAbilities.sharpshooter',
    'featureSupport.pilotAbilities.speed-demon',
    'featureSupport.pilotAbilities.terrain-master',
    'featureSupport.pilotAbilities.toughness',
  ]);
  expect(
    outOfScopeRows.find(
      (row) => row.ref === 'featureSupport.pilotAbilities.toughness',
    ),
  ).toMatchObject({
    evidence: expect.stringContaining(
      'Legacy pilotAbilities.toughness ability strings',
    ),
    gap: expect.stringContaining(
      'explicit assigned-pilot rpgToughness/pilotToughness',
    ),
  });
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('ruleSupport.physicalDamageModifiers.'),
    ),
  ).toEqual([
    'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
    'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
  ]);
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
    ),
  ).toMatchObject({
    evidence: expect.stringContaining(
      'Represented runtime claw lifecycle paths are covered',
    ),
    gap: expect.stringContaining(
      'outside the BattleMech combat runtime validation matrix',
    ),
  });
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
    ),
  ).toMatchObject({
    evidence: expect.stringContaining(
      'Represented runtime talon lifecycle paths are covered',
    ),
    gap: expect.stringContaining(
      'outside the BattleMech combat runtime validation matrix',
    ),
  });
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('lifecycleAndPsr.psrTriggers.'),
    ),
  ).toEqual([
    'lifecycleAndPsr.psrTriggers.charge_miss',
    'lifecycleAndPsr.psrTriggers.dfa_miss',
  ]);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('pilotSkills.pilotModifierResolvers.'),
    ),
  ).toEqual([
    'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
    'pilotSkills.pilotModifierResolvers.anti-mek-actuator-application',
    'pilotSkills.pilotModifierResolvers.campaign-maintenance-application',
    'pilotSkills.pilotModifierResolvers.critical-prevention-application',
    'pilotSkills.pilotModifierResolvers.legacy-defensive-quirk-to-hit-application',
    'pilotSkills.pilotModifierResolvers.low-arms-application',
    'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
    'pilotSkills.pilotModifierResolvers.target-priority-application',
    'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
  ]);
  expect(outOfScopeRefs).toContain(
    'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
  );
  expect(outOfScopeRefs).toContain(
    'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
  );
  expect(
    outOfScopeRows.find(
      (row) =>
        row.ref ===
        'pilotSkills.pilotModifierResolvers.aerospace-maneuvering-ace-movement-application',
    ),
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('aerospace maneuver-thrust relief'),
    gap: expect.stringContaining('separate aerospace movement matrix'),
  });
  expect(outOfScopeRefs).toContain(
    'pilotSkills.pilotModifierResolvers.critical-prevention-application',
  );
  expect(outOfScopeRefs).not.toContain(
    'pilotSkills.pilotModifierResolvers.movement-application',
  );
  expect(
    outOfScopeRefs.filter((ref) => ref.startsWith('validationScope.')),
  ).toEqual([
    'validationScope.knownLimitationsAndScope.non-battlemech-ammo-scope',
    'validationScope.knownLimitationsAndScope.non-battlemech-combat-system-split',
    'validationScope.objectiveRequirements.campaign-quirk-behavior',
    'validationScope.objectiveRequirements.non-battlemech-scope',
    'validationScope.objectiveRequirements.physical-weapon-actions',
  ]);
  expect(
    outOfScopeRefs.filter((ref) =>
      ref.startsWith('actions.gmCommandExclusions.'),
    ),
  ).toEqual([
    'actions.gmCommandExclusions.gm.advance-phase',
    'actions.gmCommandExclusions.gm.correct-attack',
    'actions.gmCommandExclusions.gm.grant-resource',
    'actions.gmCommandExclusions.gm.reload-unit',
    'actions.gmCommandExclusions.gm.set-damage',
    'actions.gmCommandExclusions.gm.set-heat-ammo',
    'actions.gmCommandExclusions.gm.set-initiative',
    'actions.gmCommandExclusions.gm.set-lifecycle',
    'actions.gmCommandExclusions.gm.set-objective',
    'actions.gmCommandExclusions.gm.set-position-facing',
  ]);
  expect(
    outOfScopeRefs.filter((ref) => ref.startsWith('actions.tacticalCommands.')),
  ).toEqual([
    'actions.tacticalCommands.movement.cancel',
    'actions.tacticalCommands.movement.stabilize',
    'actions.tacticalCommands.utility.withdraw',
    'actions.tacticalCommands.weapon.clear-attacks',
    'actions.tacticalCommands.weapon.declare-attack',
  ]);
  expect(
    outOfScopeRefs.filter((ref) => ref.startsWith('actions.wireIntents.')),
  ).toEqual([
    'actions.wireIntents.ForfeitMatch',
    'actions.wireIntents.LaunchMatch',
    'actions.wireIntents.LeaveSeat',
    'actions.wireIntents.MarkSeatAi',
    'actions.wireIntents.OccupySeat',
    'actions.wireIntents.ReassignSeat',
    'actions.wireIntents.SetAiSlot',
    'actions.wireIntents.SetHumanSlot',
    'actions.wireIntents.SetReady',
  ]);
  expect(
    outOfScopeRows.filter(
      (row) =>
        row.level !== 'out-of-scope' ||
        row.gap.length === 0 ||
        row.evidence.length === 0 ||
        row.sourceRefs.length === 0,
    ),
  ).toEqual([]);
});
