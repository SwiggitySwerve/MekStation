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

it('splits represented VDNI target-number slices from broad neural-interface hydration', () => {
  const rangedResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'vdni-bvdni-ranged-to-hit-application'
    ];
  const pilotingResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'vdni-piloting-target-number-application'
    ];
  const vdniFeedbackResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'vdni-internal-damage-neural-feedback-application'
    ];
  const bvdniFeedbackResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'bvdni-critical-hit-neural-feedback-application'
    ];
  const rangedCitations = rangedResolver.sourceRefs?.map(
    ({ citation }) => citation,
  );
  const pilotingCitations = pilotingResolver.sourceRefs?.map(
    ({ citation }) => citation,
  );

  expect(rangedResolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'source-backed -1 ranged attack to-hit modifier',
    ),
  });
  expect(rangedResolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.vdni',
  );
  expect(rangedResolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.bvdni',
  );
  expect(rangedResolver.evidence).toContain('neuralInterfaceActive false');
  expect(rangedResolver.evidence).toContain(
    'neural-interface state transitions',
  );
  expect(rangedResolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['vdni-bvdni-ranged-to-hit-application']
      .spaIds,
  ).toEqual(['vdni', 'bvdni']);

  expect(pilotingResolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'source-backed -1 BattleMech piloting-roll modifier',
    ),
  });
  expect(pilotingResolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.vdni',
  );
  expect(pilotingResolver.evidence).toContain(
    'explicitly leaving bvdni out of the piloting bonus',
  );
  expect(pilotingResolver.evidence).toContain('neuralInterfaceActive');
  expect(pilotingResolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'vdni-piloting-target-number-application'
    ].spaIds,
  ).toEqual(['vdni']);

  expect(vdniFeedbackResolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'unbuffered VDNI internal-structure damage feedback slice',
    ),
  });
  expect(vdniFeedbackResolver.evidence).toContain('neural_feedback PilotHit');
  expect(vdniFeedbackResolver.evidence).toContain('artificial_pain_shunt');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'vdni-internal-damage-neural-feedback-application'
    ].spaIds,
  ).toEqual(['vdni', 'artificial_pain_shunt']);

  expect(bvdniFeedbackResolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Buffered VDNI critical-hit feedback slice',
    ),
  });
  expect(bvdniFeedbackResolver.evidence).toContain('neural_feedback PilotHit');
  expect(bvdniFeedbackResolver.evidence).toContain('artificial_pain_shunt');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'bvdni-critical-hit-neural-feedback-application'
    ].spaIds,
  ).toEqual(['bvdni', 'artificial_pain_shunt']);

  expect(rangedCitations).toEqual([
    'MegaMek ComputeAttackerToHitMods applies -1 ranged attack to-hit for VDNI and Buffered VDNI.',
    'MegaMek Mek.addEntityBonuses applies -1 piloting-roll modifier for VDNI only when Buffered VDNI is absent.',
    'MegaMek OptionsConstants defines the Manei Domini VDNI and Buffered VDNI ids as vdni and bvdni.',
  ]);
  expect(pilotingCitations).toEqual(rangedCitations);
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.vdni).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.vdni.gap).toBeUndefined();
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.bvdni).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.bvdni.gap).toBeUndefined();
});
