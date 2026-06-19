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

it('backs critical-effect requirements with every critical support row', () => {
  const criticalEffectsRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['critical-effects'];

  expect(criticalEffectsRequirement.level).toBe('integrated');
  expect(criticalEffectsRequirement.gap).toBeUndefined();
  expect(criticalEffectsRequirement.evidence).toContain(
    'empty tracked ammo-bin no-explosion',
  );
  expect(criticalEffectsRequirement.evidence).toContain(
    'generic equipment-destroyed replay',
  );
  expect(criticalEffectsRequirement.evidence).toContain(
    'represented active-probe critical replay',
  );
  expect(criticalEffectsRequirement.evidence).toContain(
    'represented Artemis FCS critical-damage guidance removal replay',
  );
  expect(criticalEffectsRequirement.evidence).toContain(
    'Extended Fuel Tank explosion replay',
  );
  expect(criticalEffectsRequirement.evidence).toContain(
    'out-of-scope rows rather than BattleMech equipment-critical blockers',
  );
  expect(criticalEffectsRequirement.supportMapRefs).toEqual(
    expect.arrayContaining([
      'damageAndDeath.criticalComponents.equipment',
      'damageAndDeath.criticalSlotEffects.equipment',
      ...UNRESOLVED_EQUIPMENT_CRITICAL_COMPONENT_REFS,
      ...UNRESOLVED_EQUIPMENT_CRITICAL_SLOT_EFFECT_REFS,
      'damageAndDeath.criticalComponents.equipment-active-probe',
      'damageAndDeath.criticalSlotEffects.equipment-active-probe',
      'damageAndDeath.criticalComponents.equipment-explosive-equipment',
      'damageAndDeath.criticalSlotEffects.equipment-explosive-equipment',
      'damageAndDeath.criticalComponents.equipment-blue-shield-explosion',
      'damageAndDeath.criticalSlotEffects.equipment-blue-shield-explosion',
      'damageAndDeath.criticalComponents.equipment-prototype-improved-jump-jet-explosion',
      'damageAndDeath.criticalSlotEffects.equipment-prototype-improved-jump-jet-explosion',
      'damageAndDeath.criticalComponents.equipment-extended-fuel-tank-explosion',
      'damageAndDeath.criticalSlotEffects.equipment-extended-fuel-tank-explosion',
      'damageAndDeath.criticalComponents.equipment-artemis-fcs-critical-lifecycle',
      'damageAndDeath.criticalSlotEffects.equipment-artemis-fcs-critical-lifecycle',
    ]),
  );
  expect(blockingSupportRefsForRequirement(criticalEffectsRequirement)).toEqual(
    [],
  );
  expect(
    missingRefsForRequirement(
      'critical-effects',
      'damageAndDeath',
      'criticalComponents',
      CRITICAL_COMPONENT_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'critical-effects',
      'damageAndDeath',
      'criticalSlotEffects',
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'critical-slot-hydration',
      'damageAndDeath',
      'criticalSlotHydration',
      CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs PSR requirements with every PSR support row', () => {
  const psrTriggerRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['psr-trigger-catalog'];

  expect(psrTriggerRequirement).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('named active run/sprint'),
  });
  expect(psrTriggerRequirement.evidence).toContain(
    'standard, alternate_masc, and alternate_masc_enhanced',
  );
  expect(psrTriggerRequirement.gap).toBeUndefined();
  expect(
    missingRefsForRequirement(
      'psr-resolution',
      'lifecycleAndPsr',
      'psrResolution',
      PSR_RESOLUTION_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'psr-trigger-catalog',
      'lifecycleAndPsr',
      'psrTriggers',
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs lifecycle requirements with every action-eligibility support row', () => {
  expect(
    missingRefsAcrossRequirements(
      [
        'turn-rotation-removal',
        'targetability-lifecycle',
        'ejection-lifecycle',
        'retreat-withdrawal',
        'objective-terminal-state',
      ],
      'lifecycleAndPsr',
      'actionEligibility',
      ACTION_ELIGIBILITY_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs lifecycle, PSR, objective, and parity claims with every representative scenario row', () => {
  expect(
    missingRefsAcrossRequirements(
      [
        'turn-rotation-removal',
        'targetability-lifecycle',
        'ejection-lifecycle',
        'psr-resolution',
        'objective-terminal-state',
        'runner-interactive-parity',
      ],
      'parityAndIntegration',
      'representativeScenarios',
      COMBAT_INTEGRATION_SCENARIO_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs runner-interactive parity claims with every parity support row', () => {
  expect(
    missingRefsForRequirement(
      'runner-interactive-parity',
      'parityAndIntegration',
      'runnerInteractiveParity',
      RUNNER_INTERACTIVE_PARITY_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['runner-interactive-parity']
      .supportMapRefs,
  ).toEqual([
    ...supportRefs(
      'parityAndIntegration',
      'runnerInteractiveParity',
      RUNNER_INTERACTIVE_PARITY_SUPPORT,
    ),
    'parityAndIntegration.representativeScenarios.runner-terminal-game-ended-event',
  ]);
});

it('backs event-stream scope with every BattleMech event row', () => {
  expect(
    missingRefsForRequirement(
      'event-stream',
      'eventStream',
      'battleMechCombatEvents',
      BATTLEMECH_COMBAT_EVENT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs non-BattleMech event scope with every out-of-scope event row', () => {
  expect(
    missingRefsForRequirement(
      'non-battlemech-scope',
      'eventStream',
      'nonBattleMechEventScope',
      NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs validation-scope requirements with every scope support row', () => {
  expect(
    missingRefsAcrossRequirements(
      [
        'official-ranged-weapons',
        'official-physical-weapons',
        'official-ammo',
        'fallback-prevention',
        'damage-string-hazards',
        'known-limitation-audit',
        'non-battlemech-scope',
      ],
      'validationScope',
      'knownLimitationsAndScope',
      BATTLEMECH_VALIDATION_SCOPE_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs physical-core claims with every source-checked physical legality gate row', () => {
  const physicalCoreRefs = new Set(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['physical-core-actions']
      .supportMapRefs,
  );
  const missingLegalityGateRefs = Object.keys(
    PHYSICAL_LEGALITY_GATE_SUPPORT,
  ).flatMap((id) => {
    const ref = `ruleSupport.physicalLegalityGates.${id}`;
    return physicalCoreRefs.has(ref) ? [] : [ref];
  });

  expect(missingLegalityGateRefs).toEqual([]);
});

it('does not mark requirements integrated when their evidence refs are still gaps', () => {
  const overclaims = Object.values(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  ).flatMap((requirement) =>
    requirement.level === 'integrated'
      ? requirement.supportMapRefs.flatMap((ref: string) => {
          const support = resolveSupportRef(ref);
          return support &&
            support.level !== 'integrated' &&
            support.level !== 'out-of-scope'
            ? [`${requirement.id} -> ${ref} (${support.level})`]
            : [];
        })
      : [],
  );

  expect(overclaims).toEqual([]);
});

it('pins the aggregate helper-only requirements that still represent broad gaps', () => {
  const helperOnlyRequirementIds = Object.values(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  )
    .filter((entry) => entry.level === 'helper-only')
    .map((entry) => entry.id)
    .sort();

  expect(helperOnlyRequirementIds).toEqual(
    [...EXPECTED_HELPER_ONLY_REQUIREMENT_IDS].sort(),
  );
});

it('keeps requirements helper-only while referenced support rows still block completion', () => {
  const overclaims = Object.values(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
  ).flatMap((requirement) => {
    const blockingRefs = blockingSupportRefsForRequirement(requirement);

    return blockingRefs.length > 0 && requirement.level !== 'helper-only'
      ? [`${requirement.id} -> ${blockingRefs.join(', ')}`]
      : [];
  });

  expect(overclaims).toEqual([]);
});

it('anchors every exported helper-only objective gap to concrete support blockers', () => {
  const objectiveRequirementIds = getCombatValidationUnresolvedRefs()
    .filter((ref) => ref.startsWith(OBJECTIVE_REQUIREMENT_REF_PREFIX))
    .map(
      (ref) =>
        ref.slice(
          OBJECTIVE_REQUIREMENT_REF_PREFIX.length,
        ) as keyof typeof BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT,
    );

  const unanchoredObjectiveGaps = objectiveRequirementIds.flatMap(
    (requirementId) => {
      const requirement =
        BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId];
      const blockingRefs = blockingSupportRefsForRequirement(requirement);

      return requirement.level === 'helper-only' && blockingRefs.length === 0
        ? [`${requirement.id} -> no helper-only/unsupported supportMapRefs`]
        : [];
    },
  );
  const blockersByRequirement = Object.fromEntries(
    objectiveRequirementIds.map((requirementId) => {
      const requirement =
        BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT[requirementId];

      return [requirementId, blockingSupportRefsForRequirement(requirement)];
    }),
  );

  expect(unanchoredObjectiveGaps).toEqual([]);
  expect(blockersByRequirement).toEqual({});
});
