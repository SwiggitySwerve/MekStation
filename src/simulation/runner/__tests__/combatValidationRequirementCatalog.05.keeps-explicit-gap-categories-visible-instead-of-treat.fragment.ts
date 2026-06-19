import type {
  CombatValidationCatalogSection,
  CombatValidationSupportMap,
  ICombatFeatureSupportEntry,
  ICombatRequirementSupportEntry,
} from './combatValidationRequirementCatalog.test-helpers';

import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  AMMUNITION_COMPATIBILITY_SUPPORT,
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  BATTLEMECH_COMBAT_VALIDATION_CATALOG,
  BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  COMBAT_INTEGRATION_SCENARIO_SUPPORT,
  COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES,
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  EXPECTED_HELPER_ONLY_REQUIREMENT_IDS,
  EXPECTED_REQUIREMENT_IDS,
  HEAT_RULE_COMBAT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
  OBJECTIVE_REQUIREMENT_REF_PREFIX,
  OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  PILOT_SKILL_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  QUIRK_COMBAT_SUPPORT,
  RUNNER_INTERACTIVE_PARITY_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_BLOCKERS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_BLOCKERS,
  UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BLOCKERS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_BLOCKERS,
  UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_BLOCKERS,
  UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
  VALID_AUTHORITY_KINDS,
  blockingSupportRefsForRequirement,
  catalogMaps,
  getCombatValidationUnresolvedRefs,
  missingRefsAcrossRequirements,
  missingRefsForRequirement,
  refsFor,
  resolveSupportRef,
  sortedKeys,
  sourceBackedFeatureRows,
  supportGaps,
  supportRefs,
} from './combatValidationRequirementCatalog.test-helpers';

it('keeps explicit gap categories visible instead of treating the goal as complete', () => {
  expect(BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-ammo'].level).toBe(
    'integrated',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-physical-weapons']
      .level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['official-physical-weapons']
      .evidence,
  ).toContain('modifier-only equipment');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-string-hazards'].level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-lifecycle'].level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['heat-driven-modifiers'].level,
  ).toBe('integrated');
  const movementEnhancementRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-enhancements'];
  const movementEnhancementSidePathRefs = [
    'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
    'ruleSupport.movementEnhancements.masc-side-paths',
    'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
    'ruleSupport.movementEnhancements.supercharger-side-paths',
    'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
  ] as const;

  expect(movementEnhancementRequirement.level).toBe('integrated');
  expect(movementEnhancementRequirement.evidence).toContain(
    'represented BattleMech MASC/Supercharger side-path accounting rows',
  );
  expect(movementEnhancementRequirement.evidence).toContain(
    'standard plus alternate_masc and alternate_masc_enhanced',
  );
  expect(movementEnhancementRequirement.evidence).toContain(
    'named failure trigger stamping',
  );
  expect(movementEnhancementRequirement.evidence).toContain(
    'non-BattleMech Supercharger support-unit roll adjustment plus vehicle motive-damage branches',
  );
  expect(movementEnhancementRequirement.gap).toBeUndefined();
  expect(movementEnhancementRequirement.supportMapRefs).toEqual(
    expect.arrayContaining([
      'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths',
      'ruleSupport.movementEnhancements.masc-side-paths',
      'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths',
      'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths',
      'ruleSupport.movementEnhancements.supercharger-side-paths',
    ]),
  );
  expect(
    Object.fromEntries(
      movementEnhancementSidePathRefs.map((ref) => [
        ref,
        resolveSupportRef(ref)?.level,
      ]),
    ),
  ).toEqual({
    'ruleSupport.movementEnhancements.masc-battlemech-represented-side-paths':
      'integrated',
    'ruleSupport.movementEnhancements.masc-side-paths': 'integrated',
    'ruleSupport.movementEnhancements.supercharger-battlemech-represented-side-paths':
      'integrated',
    'ruleSupport.movementEnhancements.supercharger-side-paths': 'integrated',
    'ruleSupport.movementEnhancements.supercharger-non-battlemech-side-paths':
      'out-of-scope',
  });
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover'].gap,
  ).toBeUndefined();
  for (const ref of UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS) {
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
        .gap,
    ).toContain(ref);
  }
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented same-building building-hex LOS blocking');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented same-building endpoint elevation-difference');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented building-height LOS blocking');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented grounded DropShip level-10 entity LOS cover');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('no exact terrain LOS leaf blocker remains');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented underwater clear/non-water depth-0 LOS blocking');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented underwater endpoint-height/minimum-depth');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented single-path pure elevation LOS blocking');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented divided-path pure elevation LOS blocking');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .evidence,
  ).toContain('represented divided LOS side-path blocking');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-movement-los-cover']
      .supportMapRefs,
  ).toEqual(
    expect.arrayContaining([
      'ruleSupport.terrainEnvironment.terrain-los-same-building-hex-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-same-building-level-count',
      'ruleSupport.terrainEnvironment.terrain-los-building-height-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-underwater-clear-hex-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-divided-side-path-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-divided-elevation-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-intervening-elevation-blocking',
      'ruleSupport.terrainEnvironment.terrain-los-side-paths',
      ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain('represented TerrainType.Mines BattleMech entry damage');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain('represented battle-wide IGameState.minefields');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain(
    'represented minefield add/set/reset/remove/clear/detect/detonate',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain(
    'represented manual conventional and command-detonated minefield detonation controls',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain('represented clearing/sweeper/reset events');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain(
    'represented typed non-conventional minefield no-fallback guards',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain('represented EMP no-effect/interference/shutdown outcomes');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .gap,
  ).toBeUndefined();
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .gap,
  ).toBeUndefined();
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain('hidden conventional minefield detection/reveal state');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain(
    'represented typed non-conventional minefield no-fallback guards',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .evidence,
  ).toContain(
    'represented conventional/inferno/active/EMP density-decrement behavior',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['terrain-environment-modifiers']
      .supportMapRefs,
  ).toEqual(
    expect.arrayContaining([
      'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
      'ruleSupport.terrainEnvironment.terrain-los-side-paths',
      ...UNRESOLVED_TERRAIN_LOS_SIDE_PATH_REFS,
      ...UNRESOLVED_MINEFIELD_VARIANT_SIDE_PATH_REFS,
      'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-entry-damage',
      'ruleSupport.terrainEnvironment.minefield-represented-coordinate-state-lifecycle',
      'ruleSupport.terrainEnvironment.minefield-represented-manual-conventional-detonation',
      'ruleSupport.terrainEnvironment.minefield-clearing-sweeper-collateral-reset',
      'ruleSupport.terrainEnvironment.minefield-represented-movement-detonation-event',
      'ruleSupport.terrainEnvironment.minefield-represented-density-trigger-target',
      'ruleSupport.terrainEnvironment.minefield-represented-density-reduction',
      'ruleSupport.terrainEnvironment.minefield-represented-active-ground-suppression',
      'ruleSupport.terrainEnvironment.minefield-represented-inferno-entry-heat',
      'ruleSupport.terrainEnvironment.minefield-represented-non-conventional-type-guard',
      'ruleSupport.terrainEnvironment.minefield-non-battlemech-sea-variants',
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain(
    'represented minefield fallout when physical displacement lands a BattleMech in existing TerrainType.Mines',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain('represented detonated coordinate suppression');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain('represented Environmental Specialist Light physical to-hit');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain('represented carried-cargo arm-dependent lockout');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain('represented domino step-out/CFR payload decisions');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].gap,
  ).toBeUndefined();
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
      .supportMapRefs,
  ).toEqual(
    expect.arrayContaining([
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-minefield-fallout',
      'ruleSupport.physicalLegalityGates.shared.carried-cargo-arm-lockout',
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('occupied-hex domino positional displacement cascades');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('DominoEffect PSRs');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('DFA-miss friendly occupied displacement avoidance');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('runtime-hydrated grounded DropShip radius-two DFA hit');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('GamePhase.PhysicalAttack mine damage');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('already-detonated coordinate suppression');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].evidence,
  ).toContain('successful blockers without forced DominoEffect PSRs');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk'].gap,
  ).toBeUndefined();
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-self-risk']
      .supportMapRefs,
  ).toEqual(
    expect.arrayContaining([
      'lifecycleAndPsr.psrTriggers.domino_effect',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-positional-chain',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-minefield-fallout',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-chain',
      'ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
      ...UNRESOLVED_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
      ...OUT_OF_SCOPE_DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_REFS,
      'ruleSupport.physicalLegalityGates.shared.displacement-friendly-avoidance',
      'ruleSupport.physicalLegalityGates.shared.displacement-dropship-radius',
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions'].level,
  ).toBe('out-of-scope');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions'].gap,
  ).toContain('source-construction/editor authoring');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions'].gap,
  ).toContain('non-BattleMech physical weapon families');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-weapon-actions']
      .supportMapRefs,
  ).toEqual(
    expect.arrayContaining([
      'featureSupport.physicalWeapons.claws',
      'featureSupport.physicalWeapons.talons',
      'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
      'ruleSupport.physicalDamageModifiers.claw-physical-critical-production',
      'ruleSupport.physicalDamageModifiers.claw-represented-equipment-cleanup',
      'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
      'ruleSupport.physicalDamageModifiers.talon-physical-critical-production',
      'ruleSupport.physicalDamageModifiers.talon-represented-equipment-cleanup',
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['spa-quirk-resolver-application']
      .level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].level,
  ).toBe('out-of-scope');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['non-battlemech-scope'].gap,
  ).toContain('Non-BattleMech');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior'].level,
  ).toBe('out-of-scope');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['campaign-quirk-behavior'].gap,
  ).toContain('outside BattleMech combat runner validation scope');
});
