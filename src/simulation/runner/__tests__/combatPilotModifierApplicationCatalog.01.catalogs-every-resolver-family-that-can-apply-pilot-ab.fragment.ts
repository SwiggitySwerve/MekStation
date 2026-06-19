import type {
  CombatSupportSourceRef,
  ICombatFeatureSupportEntry,
} from './combatPilotModifierApplicationCatalog.test-helpers';

import {
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  INTEGRATED_RESOLVER_SPA_ASSIGNMENT_EXCEPTIONS,
  PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  QUIRK_CATALOG,
  QUIRK_COMBAT_SUPPORT,
  SPA_CATALOG,
  SPA_COMBAT_SUPPORT,
  assignedQuirkIds,
  assignedResolverIdsForSpaId,
  assignedSpaIds,
  canonicalSpaSourceCitations,
  helperOnlyCanonicalSpaAssignments,
  isAllowedIntegratedResolverSpaAssignment,
  nonIntegratedIdsAssignedToIntegratedResolvers,
  sortedKeys,
  sourceRefsFrom,
  supportGaps,
  supportIdsByLevel,
  uniqueSorted,
} from './combatPilotModifierApplicationCatalog.test-helpers';

it('catalogs every resolver family that can apply pilot abilities or quirks', () => {
  expect(sortedKeys(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT)).toEqual(
    [
      'anti-mek-actuator-application',
      'aerospace-maneuvering-ace-movement-application',
      'bvdni-critical-hit-neural-feedback-application',
      'called-shot-application',
      'campaign-maintenance-application',
      'cluster-hitter-application',
      'comm-implant-indirect-fire-spotter-application',
      'consciousness-application',
      'critical-prevention-application',
      'critical-prevention-edge-explosion-application',
      'dermal-armor-head-hit-pilot-damage-suppression',
      'dfa-miss-bioware-pilot-damage-avoidance',
      'eagle-eyes-active-probe-range-application',
      'eagle-eyes-minefield-detonation-application',
      'edge-application',
      'edge-head-hit-reroll-application',
      'edge-ko-consciousness-reroll-application',
      'edge-masc-supercharger-reroll-application',
      'edge-tac-reroll-application',
      'env-specialist-fog-ranged-to-hit-application',
      'env-specialist-light-physical-to-hit-application',
      'env-specialist-light-ranged-to-hit-application',
      'env-specialist-rain-ranged-to-hit-application',
      'env-specialist-snow-ranged-to-hit-application',
      'env-specialist-wind-ranged-to-hit-application',
      'heat-application',
      'heavy-lifter-carry-object-action-application',
      'heavy-lifter-carry-object-capacity-check-application',
      'heavy-lifter-ground-object-weight-gate-application',
      'heavy-lifter-lift-capacity-application',
      'heavy-lifter-throw-object-action-application',
      'heavy-lifter-throw-release-lifecycle-application',
      'indirect-fire-spa-application',
      'initiative-application',
      'initiative-command-console-hydration',
      'initiative-equipment-producer-hydration',
      'initiative-hq-equipment-hydration',
      'legacy-defensive-quirk-to-hit-application',
      'legacy-pain-resistance-to-hit-application',
      'low-arms-application',
      'maneuvering-ace-controlled-sideslip-producer-application',
      'maneuvering-ace-flanking-turning-producer-application',
      'maneuvering-ace-lateral-movement-application',
      'maneuvering-ace-out-of-control-producer-application',
      'movement-application',
      'multi-target-penalty-application',
      'nightwalker-light-movement-application',
      'physical-action-count-application',
      'physical-damage-application',
      'physical-restriction-application',
      'physical-to-hit-application',
      'proto-dni-piloting-target-number-application',
      'proto-dni-ranged-to-hit-application',
      'psr-application',
      'psr-spa-application',
      'psr-spa-target-number-application',
      'ranged-to-hit-calculation',
      'ranged-to-hit-state-hydration',
      'rpg-toughness-consciousness-application',
      'sandblaster-application',
      'sandblaster-rate-of-fire-application',
      'sandblaster-tacops-rapid-fire-application',
      'target-priority-application',
      'triple-core-processor-aimed-shot-application',
      'triple-core-processor-initiative-application',
      'vehicle-movement-application',
      'vdni-bvdni-ranged-to-hit-application',
      'vdni-internal-damage-neural-feedback-application',
      'vdni-piloting-target-number-application',
      'weapon-to-hit-quirk-application',
      'zweihander-punch-physical-application',
    ].sort(),
  );
  expect(supportGaps(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT)).toEqual([]);
});

it('assigns every combat-consumed SPA and quirk to at least one resolver family', () => {
  const unconsumedSpas = [
    'acrobat',
    'antagonizer',
    'combat-intuition',
    'cool-under-fire',
    'evasive',
    'iron-will',
    'marksman',
    'multi-target',
    'natural-grace',
    'sharpshooter',
    'speed-demon',
    'terrain-master',
    'toughness',
  ];
  const expectedAssignedSpas = uniqueSorted([
    ...sortedKeys(SPA_CATALOG).filter(
      (spaId) => !unconsumedSpas.includes(spaId),
    ),
    'bvdni',
    'artificial_pain_shunt',
    'boost_comm_implant',
    'comm_implant',
    'dermal_armor',
    'eagle_eyes',
    'env_specialist',
    'proto_dni',
    'tm_nightwalker',
    'triple_core_processor',
    'tsm_implant',
    'vdni',
    'zweihander',
  ]);

  expect(assignedSpaIds()).toEqual(expectedAssignedSpas);
  expect(assignedSpaIds()).toEqual(
    uniqueSorted([
      ...sortedKeys(SPA_COMBAT_SUPPORT).filter(
        (spaId) => !unconsumedSpas.includes(spaId),
      ),
      'bvdni',
      'artificial_pain_shunt',
      'boost_comm_implant',
      'comm_implant',
      'dermal_armor',
      'eagle_eyes',
      'env_specialist',
      'proto_dni',
      'tm_nightwalker',
      'triple_core_processor',
      'tsm_implant',
      'vdni',
      'zweihander',
    ]),
  );
  expect(assignedQuirkIds()).toEqual(sortedKeys(QUIRK_CATALOG));
  expect(assignedQuirkIds()).toEqual(sortedKeys(QUIRK_COMBAT_SUPPORT));
  expect(SPA_COMBAT_SUPPORT.marksman.level).toBe('out-of-scope');
  expect(SPA_COMBAT_SUPPORT['multi-target'].level).toBe('out-of-scope');
  expect(SPA_COMBAT_SUPPORT.sharpshooter.level).toBe('out-of-scope');
  expect(SPA_COMBAT_SUPPORT['cool-under-fire'].level).toBe('out-of-scope');
  expect(SPA_COMBAT_SUPPORT['iron-will'].level).toBe('out-of-scope');
  expect(SPA_COMBAT_SUPPORT['terrain-master'].level).toBe('out-of-scope');
});

it('does not assign unknown SPA or quirk ids to resolver families', () => {
  const unknownAssignments = Object.entries(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
  ).flatMap(([resolverId, assignment]) => [
    ...assignment.spaIds
      .filter(
        (spaId) =>
          SPA_CATALOG[spaId] === undefined &&
          CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId] === undefined,
      )
      .map((spaId) => `${resolverId}.spa.${spaId}`),
    ...assignment.quirkIds
      .filter((quirkId) => QUIRK_CATALOG[quirkId] === undefined)
      .map((quirkId) => `${resolverId}.quirk.${quirkId}`),
  ]);

  expect(unknownAssignments).toEqual([]);
});

it('does not hide non-integrated SPA or quirk gaps behind integrated resolver families', () => {
  expect(nonIntegratedIdsAssignedToIntegratedResolvers()).toEqual([]);
});

it('limits helper-only canonical SPA assignments to explicit partial-slice resolvers', () => {
  expect(helperOnlyCanonicalSpaAssignments()).toEqual([]);
});

it('pins every legacy pilot ability support row to anchored source refs', () => {
  const pilotAbilityRows = Object.values(SPA_COMBAT_SUPPORT);
  const missingRefs = pilotAbilityRows.flatMap((entry) =>
    (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
  );
  const unanchoredRefs = pilotAbilityRows.flatMap((entry) =>
    (entry.sourceRefs ?? []).flatMap((sourceRef) =>
      sourceRef.url.includes('#L') ? [] : [`${entry.id}: ${sourceRef.url}`],
    ),
  );

  expect(missingRefs).toEqual([]);
  expect(unanchoredRefs).toEqual([]);
  expect(SPA_COMBAT_SUPPORT['melee-specialist']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('physical damage'),
  });
  expect(SPA_COMBAT_SUPPORT['melee-master']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('two-physical-attacks allowance'),
  });
});

it('pins every legacy quirk support row to anchored source refs', () => {
  const quirkRows = Object.values(QUIRK_COMBAT_SUPPORT);
  const missingRefs = quirkRows.flatMap((entry) =>
    (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
  );
  const unanchoredRefs = quirkRows.flatMap((entry) =>
    (entry.sourceRefs ?? []).flatMap((sourceRef) =>
      sourceRef.url.includes('#L') ? [] : [`${entry.id}: ${sourceRef.url}`],
    ),
  );

  expect(missingRefs).toEqual([]);
  expect(unanchoredRefs).toEqual([]);
  expect(QUIRK_COMBAT_SUPPORT.easy_to_pilot).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('piloting-skill-gated'),
  });
  expect(QUIRK_COMBAT_SUPPORT.stable).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Kick/Push PSRs'),
  });
  expect(QUIRK_COMBAT_SUPPORT.cramped_cockpit).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Small Pilot'),
  });
  expect(QUIRK_COMBAT_SUPPORT.battle_fists_la).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('punch to-hit'),
  });
  expect(QUIRK_COMBAT_SUPPORT.battle_fists_ra).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('punch to-hit'),
  });
  expect(QUIRK_COMBAT_SUPPORT.no_arms).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('stand-up PSR'),
  });
  expect(QUIRK_COMBAT_SUPPORT.low_arms).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('registry-only out-of-scope audit evidence'),
  });
  expect(QUIRK_COMBAT_SUPPORT.rugged_1).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('campaign maintenance quirk'),
  });
  expect(QUIRK_COMBAT_SUPPORT.rugged_2).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('campaign maintenance quirk'),
  });
  expect(QUIRK_COMBAT_SUPPORT.rugged_1.sourceRefs).toEqual(
    QUIRK_COMBAT_SUPPORT.rugged_2.sourceRefs,
  );
  expect(QUIRK_COMBAT_SUPPORT.protected_actuators).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('non-BattleMech attacker actions'),
  });
  expect(QUIRK_COMBAT_SUPPORT.exposed_actuators).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('non-BattleMech attacker actions'),
  });
  expect(QUIRK_COMBAT_SUPPORT.protected_actuators.sourceRefs).toEqual(
    QUIRK_COMBAT_SUPPORT.exposed_actuators.sourceRefs,
  );
  expect(QUIRK_COMBAT_SUPPORT.distracting).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runAttackPhase and declareAttack'),
  });
  expect(QUIRK_COMBAT_SUPPORT.distracting.evidence).toContain(
    'local +1 target to-hit deviation',
  );
  expect(QUIRK_COMBAT_SUPPORT.distracting.evidence).toContain(
    'runner and interactive BattleMech attack declaration behavior',
  );
});
