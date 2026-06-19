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

it('backs movement requirements with every movement and movement-enhancement support row', () => {
  expect(
    missingRefsForRequirement(
      'movement-actions',
      'ruleSupport',
      'movementRules',
      MOVEMENT_RULE_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'movement-enhancements',
      'ruleSupport',
      'movementEnhancements',
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs terrain requirements with every terrain support row', () => {
  expect(
    missingRefsForRequirement(
      'terrain-movement-los-cover',
      'ruleSupport',
      'terrainTypeMovement',
      TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'terrain-movement-los-cover',
      'ruleSupport',
      'terrainTypeLos',
      TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'terrain-environment-modifiers',
      'ruleSupport',
      'terrainEnvironment',
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'terrain-environment-modifiers',
      'ruleSupport',
      'terrainTypeAttackModifiers',
      TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'terrain-environment-modifiers',
      'ruleSupport',
      'terrainTypeHeat',
      TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'terrain-environment-modifiers',
      'ruleSupport',
      'terrainTypePsr',
      TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs pilot skill requirements with every pilot skill support row', () => {
  const pilotSkillRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['pilot-skills'];

  expect(pilotSkillRequirement).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'exact official command-console producer id hydration',
    ),
  });
  expect(pilotSkillRequirement.gap).toBeUndefined();
  expect(pilotSkillRequirement.evidence).toContain(
    'represented Heavy Lifter carry-object capacity checks',
  );
  expect(pilotSkillRequirement.evidence).toContain(
    'represented Heavy Lifter throw-release action resolution',
  );
  expect(pilotSkillRequirement.evidence).toContain(
    'represented Heavy Lifter ground-object weight gates',
  );
  expect(pilotSkillRequirement.evidence).toContain(
    'represented Heavy Lifter pickup/drop lifecycle',
  );
  expect(pilotSkillRequirement.supportMapRefs).toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
  );
  expect(pilotSkillRequirement.supportMapRefs).toContain(
    'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
  );
  expect(
    missingRefsForRequirement(
      'pilot-skills',
      'pilotSkills',
      'pilotSkillUse',
      PILOT_SKILL_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs SPA and quirk requirements with every support row', () => {
  const catalogRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['spa-quirk-catalog'];
  const resolverRequirement =
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['spa-quirk-resolver-application'];

  expect(catalogRequirement).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('canonical SPA catalog boundary'),
  });
  expect(catalogRequirement.gap).toBeUndefined();
  expect(catalogRequirement.evidence).toContain(
    'represented Comm Implant and Boosted Comm Implant indirect-fire LOS spotter relief',
  );
  expect(catalogRequirement.evidence).toContain(
    'represented Boosted Comm Implant C3i network state',
  );
  expect(catalogRequirement.supportMapRefs).toEqual(
    expect.arrayContaining([
      'featureSupport.canonicalPilotAbilityScope.eagle_eyes',
      'featureSupport.canonicalPilotAbilityScope.env_specialist',
      'featureSupport.canonicalPilotAbilityScope.tm_nightwalker',
      'featureSupport.canonicalPilotAbilityScope.dermal_armor',
      'featureSupport.canonicalPilotAbilityScope.tsm_implant',
      'featureSupport.canonicalPilotAbilityScope.vdni',
      'featureSupport.canonicalPilotAbilityScope.bvdni',
    ]),
  );
  expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.zweihander (helper-only)',
  );
  expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.triple_core_processor (helper-only)',
  );
  expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.vdni (helper-only)',
  );
  expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.bvdni (helper-only)',
  );
  expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.tm_nightwalker (helper-only)',
  );
  expect(blockingSupportRefsForRequirement(catalogRequirement)).not.toContain(
    'featureSupport.canonicalPilotAbilityScope.proto_dni (unsupported)',
  );
  expect(resolverRequirement).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'exact official command-console producer ids',
    ),
  });
  expect(resolverRequirement.gap).toBeUndefined();
  expect(resolverRequirement.evidence).toContain(
    'Maneuvering Ace BattleMech lateral movement',
  );
  expect(resolverRequirement.evidence).toContain(
    'Nightwalker represented low-light movement',
  );
  expect(resolverRequirement.evidence).toContain(
    'Heavy Lifter lift-capacity, carry-object capacity-check helper math, ground-object weight gates, pickup/drop lifecycle, and bounded throw-object action resolution through throw-release lifecycle',
  );
  expect(resolverRequirement.evidence).toContain(
    'represented active-probe ECM-counter range slice',
  );
  expect(resolverRequirement.evidence).toContain(
    'represented minefield detonation target-number relief for Eagle Eyes',
  );
  expect(resolverRequirement.evidence).toContain(
    'represented PSR target-number rows',
  );
  expect(resolverRequirement.evidence).toContain(
    'represented Environmental Specialist Fog/Snow/Rain/Wind/Light ranged and Light physical to-hit behavior',
  );
  expect(resolverRequirement.evidence).toContain('V.D.N.I. piloting relief');
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.evidence).toContain(
    'represented minefield entry rolls apply the Eagle Eyes +2 detonation target-number relief',
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.gap).toBeUndefined();
  expect(
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.sourceRefs?.map(
      (sourceRef) => sourceRef.citation,
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('prevents represented minefield detonation'),
    ]),
  );
  expect(resolverRequirement.supportMapRefs).toEqual(
    expect.arrayContaining([
      'pilotSkills.pilotModifierResolvers.initiative-application',
      'pilotSkills.pilotModifierResolvers.initiative-hq-equipment-hydration',
      'pilotSkills.pilotModifierResolvers.initiative-command-console-hydration',
      'pilotSkills.pilotModifierResolvers.initiative-equipment-producer-hydration',
      'pilotSkills.pilotModifierResolvers.triple-core-processor-aimed-shot-application',
      'pilotSkills.pilotModifierResolvers.triple-core-processor-initiative-application',
      'pilotSkills.pilotModifierResolvers.physical-to-hit-application',
      'pilotSkills.pilotModifierResolvers.movement-application',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-controlled-sideslip-producer-application',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-object-action-application',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-lift-capacity-application',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-lateral-movement-application',
      'pilotSkills.pilotModifierResolvers.vehicle-movement-application',
      'pilotSkills.pilotModifierResolvers.eagle-eyes-active-probe-range-application',
      'pilotSkills.pilotModifierResolvers.eagle-eyes-minefield-detonation-application',
      'pilotSkills.pilotModifierResolvers.nightwalker-light-movement-application',
      'pilotSkills.pilotModifierResolvers.dermal-armor-head-hit-pilot-damage-suppression',
      'pilotSkills.pilotModifierResolvers.dfa-miss-bioware-pilot-damage-avoidance',
      'pilotSkills.pilotModifierResolvers.vdni-bvdni-ranged-to-hit-application',
      'pilotSkills.pilotModifierResolvers.vdni-piloting-target-number-application',
      'pilotSkills.pilotModifierResolvers.proto-dni-ranged-to-hit-application',
      'pilotSkills.pilotModifierResolvers.proto-dni-piloting-target-number-application',
      'pilotSkills.pilotModifierResolvers.psr-spa-target-number-application',
      'pilotSkills.pilotModifierResolvers.sandblaster-application',
      'pilotSkills.pilotModifierResolvers.sandblaster-rate-of-fire-application',
      'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application',
    ]),
  );
  expect(blockingSupportRefsForRequirement(resolverRequirement)).toEqual([]);
  expect(blockingSupportRefsForRequirement(resolverRequirement)).toEqual(
    expect.not.arrayContaining([
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application (helper-only)',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application (integrated)',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application (out-of-scope)',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-capacity-check-application (integrated)',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-carry-object-action-application (integrated)',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-ground-object-weight-gate-application (integrated)',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-throw-release-lifecycle-application (integrated)',
      'pilotSkills.pilotModifierResolvers.heavy-lifter-lift-capacity-application (integrated)',
      'pilotSkills.pilotModifierResolvers.maneuvering-ace-lateral-movement-application (integrated)',
      'pilotSkills.pilotModifierResolvers.nightwalker-light-movement-application (integrated)',
      'pilotSkills.pilotModifierResolvers.psr-spa-target-number-application (integrated)',
      'pilotSkills.pilotModifierResolvers.vdni-piloting-target-number-application (integrated)',
      'pilotSkills.pilotModifierResolvers.proto-dni-piloting-target-number-application (integrated)',
      'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application (integrated)',
    ]),
  );
  expect(
    missingRefsForRequirement(
      'spa-quirk-catalog',
      'featureSupport',
      'pilotAbilities',
      SPA_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'spa-quirk-catalog',
      'featureSupport',
      'canonicalPilotAbilityScope',
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'spa-quirk-catalog',
      'featureSupport',
      'mechQuirks',
      QUIRK_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'spa-quirk-resolver-application',
      'pilotSkills',
      'pilotModifierResolvers',
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});

it('backs damage and death requirements with every damage support row', () => {
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['damage-resolution'].level,
  ).toBe('integrated');
  expect(
    BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['pilot-damage-death'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('ammo-explosion pilot damage'),
  });
  expect(
    missingRefsForRequirement(
      'damage-resolution',
      'damageAndDeath',
      'damageResolution',
      DAMAGE_RESOLUTION_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'damage-resolution',
      'damageAndDeath',
      'destructionCauses',
      DESTRUCTION_CAUSE_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
  expect(
    missingRefsForRequirement(
      'pilot-damage-death',
      'damageAndDeath',
      'pilotDamage',
      PILOT_DAMAGE_COMBAT_SUPPORT,
    ),
  ).toEqual([]);
});
