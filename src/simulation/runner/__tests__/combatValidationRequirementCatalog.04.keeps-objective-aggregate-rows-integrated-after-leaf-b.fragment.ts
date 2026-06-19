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

it('keeps objective aggregate rows integrated after leaf blockers close', () => {
  const aggregateGapText = Object.values(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  )
    .filter((entry) => entry.level === 'helper-only')
    .map((entry) => `${entry.id}: ${entry.gap}`)
    .join('\n');

  expect(aggregateGapText).toBe('');
  expect(aggregateGapText).not.toContain(
    'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
  );
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers']
      .level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['to-hit-advanced-modifiers'].gap,
  ).toBeUndefined();
  expect(aggregateGapText).not.toContain('terrain LOS leaf blocker');
  expect(aggregateGapText).not.toContain('explicit minefield branch rows');
  expect(aggregateGapText).not.toContain('and exact minefield branch rows');
  expect(aggregateGapText).not.toContain(
    'blocked by exactly ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
  );
  expect(aggregateGapText).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.displacement-domino-step-out-cfr',
  );
  expect(aggregateGapText).not.toContain('forced domino fallback helper chain');
  expect(aggregateGapText).not.toContain(
    'ruleSupport.physicalLegalityGates.shared.displacement-domino-terrain-building-environment-fallout',
  );
  expect(aggregateGapText).not.toContain('explicit equipment branch rows');
  expect(aggregateGapText).not.toContain(
    'one explicit Artemis residual leaf row',
  );
  for (const ref of UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS) {
    expect(aggregateGapText).not.toContain(ref);
  }
  expect(aggregateGapText).not.toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle is now a split-accounting row',
  );
  expect(aggregateGapText).not.toContain(
    'remaining non-Extended-Fuel-Tank fuel/incendiary branches',
  );
  expect(aggregateGapText).not.toContain('engine-variant/coolant sprint heat');
  expect(aggregateGapText).not.toContain('full minefield variant modifiers');
  expect(aggregateGapText).not.toContain(
    'Remaining movement-related blocker is the aggregate movement-application row',
  );
  expect(aggregateGapText).not.toContain('non-initiative helper-only');
  expect(aggregateGapText).not.toContain('Several family-specific mechanics');
});

it('keeps special weapon family aggregate blockers scoped to live unsupported rows', () => {
  const specialWeaponFamiliesRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['special-weapon-families'];

  expect(specialWeaponFamiliesRequirement.level).toBe('integrated');
  expect(specialWeaponFamiliesRequirement.evidence).toContain(
    'whole-catalog non-torpedo Artemis FCS allocation audit coverage',
  );
  expect(
    blockingSupportRefsForRequirement(specialWeaponFamiliesRequirement),
  ).toEqual([]);
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.artemis-fcs-critical-lifecycle',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
  );
  for (const ref of UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS) {
    expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(ref);
  }
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-target-identity-lifecycle',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-target-option-deduplication',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-target-selection',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-helper-removal-lifecycle',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-turn-reset-lifecycle',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-brush-off-removal-lifecycle',
  );
  expect(specialWeaponFamiliesRequirement.supportMapRefs).toContain(
    'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
  );
  expect(
    resolveSupportRef(
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    )?.level,
  ).toBe('out-of-scope');
  expect(
    resolveSupportRef(
      'featureSupport.specialWeaponMechanics.inarc-pod-object-lifecycle',
    )?.level,
  ).toBe('integrated');
  expect(specialWeaponFamiliesRequirement.gap).toBeUndefined();
});
