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

it('keeps source-backed movement action support explicit with remaining side-path gaps', () => {
  const evadeRefs =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
      'movement.evade'
    ].sourceRefs ?? [];
  const sprintRefs =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
      'movement.sprint'
    ].sourceRefs ?? [];
  const torsoTwistActionRefs =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.actions.tacticalCommands[
      'facing.torso-twist'
    ].sourceRefs ?? [];
  const torsoTwistRuleRefs =
    BATTLEMECH_COMBAT_VALIDATION_CATALOG.ruleSupport.movementRules[
      'torso-twist'
    ].sourceRefs ?? [];

  expect(evadeRefs.map((sourceRef) => sourceRef.citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('TacOps Evade'),
      expect.stringContaining('MoveStepType defines EVADE'),
      expect.stringContaining('getEvasionBonus'),
      expect.stringContaining('target evasion bonus'),
      expect.stringContaining('evading attackers from firing'),
    ]),
  );
  expect(sprintRefs.map((sourceRef) => sourceRef.citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('MoveStep.canUseSprint'),
      expect.stringContaining('Mek.getSprintMP'),
      expect.stringContaining('Mek.getSprintHeat'),
      expect.stringContaining('attacks by sprinting attackers'),
      expect.stringContaining('target sprinted'),
    ]),
  );
  expect(torsoTwistActionRefs.map((sourceRef) => sourceRef.citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('TorsoTwistAction'),
      expect.stringContaining('secondary facing'),
      expect.stringContaining('ComputeArc'),
    ]),
  );
  expect(torsoTwistRuleRefs.map((sourceRef) => sourceRef.citation)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Entity.setSecondaryFacing'),
      expect.stringContaining('Mek.canChangeSecondaryFacing'),
      expect.stringContaining('Mek.isValidSecondaryFacing'),
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
      .supportMapRefs,
  ).toContain('actions.tacticalCommands.movement.evade');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
      .supportMapRefs,
  ).not.toContain('actions.absentActionSurfaces.movement.evade');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
      .supportMapRefs,
  ).toContain('actions.tacticalCommands.movement.sprint');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
      .supportMapRefs,
  ).not.toContain('actions.absentActionSurfaces.movement.sprint');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
      .supportMapRefs,
  ).toContain('actions.tacticalCommands.facing.torso-twist');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions']
      .supportMapRefs,
  ).toEqual(
    expect.arrayContaining([
      'actions.gameIntents.torsoTwist',
      'actions.wireIntents.TorsoTwist',
      'actions.p2pIntents.torsoTwist',
    ]),
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].evidence,
  ).toContain('named MASC/Supercharger failure trigger stamping');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['movement-actions'].gap,
  ).toBeUndefined();
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .supportMapRefs,
  ).toContain('actions.tacticalCommands.movement.evade');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .supportMapRefs,
  ).toContain('actions.tacticalCommands.movement.sprint');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .supportMapRefs,
  ).toContain('ruleSupport.toHitModifiers.c3-equipment-denial-boundaries');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .supportMapRefs,
  ).toContain(
    'ruleSupport.toHitModifiers.c3-equipment-independent-side-formation',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .supportMapRefs,
  ).not.toContain('actions.absentActionSurfaces.movement.evade');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .supportMapRefs,
  ).not.toContain('actions.absentActionSurfaces.movement.sprint');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .evidence,
  ).toContain('ranged and physical to-hit');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .evidence,
  ).toContain(
    'split out of the BattleMech runtime to-hit validation blocker set',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers'].gap,
  ).toBeUndefined();
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain('target-evasion physical to-hit');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions'].evidence,
  ).toContain('represented Environmental Specialist Light physical to-hit');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
      .supportMapRefs,
  ).toContain(
    'ruleSupport.physicalLegalityGates.shared.carried-cargo-arm-lockout',
  );
});
