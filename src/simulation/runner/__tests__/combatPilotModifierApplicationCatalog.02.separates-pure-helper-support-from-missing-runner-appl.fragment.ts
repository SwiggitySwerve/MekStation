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

it('separates pure helper support from missing runner/application plumbing', () => {
  expect(
    supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'integrated'),
  ).toEqual(
    [
      'called-shot-application',
      'bvdni-critical-hit-neural-feedback-application',
      'cluster-hitter-application',
      'comm-implant-indirect-fire-spotter-application',
      'consciousness-application',
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
      'legacy-pain-resistance-to-hit-application',
      'maneuvering-ace-controlled-sideslip-producer-application',
      'maneuvering-ace-flanking-turning-producer-application',
      'maneuvering-ace-lateral-movement-application',
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
      'triple-core-processor-aimed-shot-application',
      'triple-core-processor-initiative-application',
      'vdni-bvdni-ranged-to-hit-application',
      'vdni-internal-damage-neural-feedback-application',
      'vdni-piloting-target-number-application',
      'weapon-to-hit-quirk-application',
      'zweihander-punch-physical-application',
    ].sort(),
  );
  expect(
    supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'unsupported'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'helper-only'),
  ).toEqual([]);
  expect(
    supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'helper-only'),
  ).not.toContain('maneuvering-ace-flanking-turning-producer-application');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-defensive-quirk-to-hit-application'
    ],
  ).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('deviation-only'),
  });
  expect(
    supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'out-of-scope'),
  ).toEqual([
    'aerospace-maneuvering-ace-movement-application',
    'anti-mek-actuator-application',
    'campaign-maintenance-application',
    'critical-prevention-application',
    'legacy-defensive-quirk-to-hit-application',
    'low-arms-application',
    'maneuvering-ace-out-of-control-producer-application',
    'target-priority-application',
    'vehicle-movement-application',
  ]);
});

it('keeps ranged to-hit feature support distinct from ranged attack state hydration', () => {
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
  ).toEqual(
    expect.arrayContaining([
      'weapon-specialist',
      'gunnery-specialist',
      'sniper',
      'blood-stalker',
      'multi-tasker',
      'range-master',
      'hopping-jack',
      'jumping-jack',
      'dodge-maneuver',
      'shaky_stick',
      'tm_forest_ranger',
      'tm_swamp_beast',
    ]),
  );
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].quirkIds,
  ).toEqual(
    expect.arrayContaining([
      'improved_targeting_short',
      'poor_targeting_long',
      'sensor_ghosts',
      'multi_trac',
    ]),
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration']
      .level,
  ).toBe('integrated');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'legacy-pain-resistance-to-hit-application'
    ],
  ).toEqual({ spaIds: [], quirkIds: [] });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-pain-resistance-to-hit-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('preserve raw pilot wound penalties'),
  });
});

it('keeps source-backed Multi-Tasker distinct from local Multi-Target', () => {
  expect(SPA_COMBAT_SUPPORT['multi-tasker']).toMatchObject({
    level: 'integrated',
  });
  expect(SPA_COMBAT_SUPPORT['multi-target']).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('source-backed secondary-target penalty'),
  });
  expect(SPA_COMBAT_SUPPORT['multi-target'].gap).toContain(
    'Multi-Tasker/multi_tasker',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['multi-target-penalty-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Multi-Tasker/multi_tasker'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['multi-target-penalty-application']
      .evidence,
  ).toContain('leaving the out-of-scope local Multi-Target row unconsumed');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['multi-target-penalty-application'],
  ).toEqual({ spaIds: ['multi-tasker'], quirkIds: [] });

  const multiTaskerRefs = SPA_COMBAT_SUPPORT['multi-tasker'].sourceRefs ?? [];
  expect(multiTaskerRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker',
    'MegaMek OptionsConstants defines the source-backed Multi-Tasker SPA id as multi_tasker',
  ]);
  expect(SPA_COMBAT_SUPPORT['multi-target'].sourceRefs).not.toEqual(
    multiTaskerRefs,
  );
  expect(
    SPA_COMBAT_SUPPORT['multi-target'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
  ).toEqual([
    'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
    'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
    'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'multi-target-penalty-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
    'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
  ]);
});

it('pins Multi-Trac to MegaMek secondary-target suppression semantics', () => {
  const multiTracRefs = QUIRK_COMBAT_SUPPORT.multi_trac.sourceRefs ?? [];

  expect(QUIRK_COMBAT_SUPPORT.multi_trac).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('secondary-target penalty'),
  });
  expect(multiTracRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Compute.getSecondaryTargetMod suppresses the secondary-target modifier for Multi-Trac attackers when the current target is not in the rear arc.',
    'MegaMek OptionsConstants defines QUIRK_POS_MULTI_TRAC as multi_trac.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'ranged-to-hit-calculation'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual(
    expect.arrayContaining(multiTracRefs.map(({ citation }) => citation)),
  );
});

it('keeps legacy defensive to-hit aggregate separate from the promoted Distracting deviation', () => {
  const distractingRefs = QUIRK_COMBAT_SUPPORT.distracting.sourceRefs ?? [];
  const lowProfileRefs = QUIRK_COMBAT_SUPPORT.low_profile.sourceRefs ?? [];
  const legacyResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-defensive-quirk-to-hit-application'
    ];

  expect(QUIRK_COMBAT_SUPPORT.distracting).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('local +1 target to-hit deviation'),
  });
  expect(QUIRK_COMBAT_SUPPORT.distracting.evidence).toContain(
    'runner and interactive BattleMech attack declaration behavior',
  );
  expect(distractingRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek OptionsConstants defines QUIRK_POS_DISTRACTING as distracting.',
    'MegaMek Quirks registers Distracting as a positive unit quirk option without a combat to-hit resolver in this source snapshot.',
    'MekStation calculateDistractingModifier currently applies Distracting as a local +1 target to-hit helper.',
  ]);

  expect(QUIRK_COMBAT_SUPPORT.low_profile).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('glancing-blow path'),
  });
  expect(QUIRK_COMBAT_SUPPORT.low_profile.evidence).toContain(
    'normal single-hit weapon damage',
  );
  expect(QUIRK_COMBAT_SUPPORT.low_profile.evidence).toContain(
    'resolveWeaponHit',
  );
  expect(QUIRK_COMBAT_SUPPORT.low_profile.evidence).toContain('resolveAttack');
  expect(QUIRK_COMBAT_SUPPORT.low_profile.evidence).toContain(
    '-4 cluster-table modifier',
  );
  expect(QUIRK_COMBAT_SUPPORT.low_profile.evidence).toContain(
    '-2 glancing critical-hit-table modifier',
  );
  expect(lowProfileRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek WeaponHandler.isLowProfileGlancingBlow applies Low Profile as glancing-blow handling when the attack roll equals the target number or target number plus one.',
    'MegaMek HitData.makeGlancingBlow records glancing critical-hit-table modifiers as -2.',
    'MegaMek TWDamageManager applies hit.glancingMod() to normal critical-hit table rolls.',
    'MegaMek OptionsConstants defines QUIRK_POS_LOW_PROFILE as low_profile and notes the BMM Low Profile behavior changed.',
    'MekStation calculateLowProfileModifier currently applies Low Profile as a local +1 target to-hit helper when partial cover is absent.',
  ]);

  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'legacy-defensive-quirk-to-hit-application'
    ],
  ).toEqual({ spaIds: [], quirkIds: ['distracting', 'low_profile'] });
  expect(legacyResolver).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('No source-backed producer/resolver'),
  });
  expect(legacyResolver.evidence).toContain(
    'local target to-hit helper/deviation path',
  );
  expect(legacyResolver.evidence).toContain(
    'featureSupport.mechQuirks.low_profile',
  );
  expect(legacyResolver).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('deviation-only'),
  });
  expect(legacyResolver.gap).toContain('represented as glancing-blow damage');
  expect(legacyResolver.sourceRefs?.map(({ citation }) => citation)).toEqual([
    'MegaMek OptionsConstants defines QUIRK_POS_DISTRACTING as distracting.',
    'MegaMek Quirks registers Distracting as a positive unit quirk option without a combat to-hit resolver in this source snapshot.',
    'MegaMek WeaponHandler.isLowProfileGlancingBlow applies Low Profile as glancing-blow handling when the attack roll equals the target number or target number plus one.',
    'MegaMek HitData.makeGlancingBlow records glancing critical-hit-table modifiers as -2.',
    'MegaMek TWDamageManager applies hit.glancingMod() to normal critical-hit table rolls.',
    'MegaMek OptionsConstants defines QUIRK_POS_LOW_PROFILE as low_profile and notes the BMM Low Profile behavior changed.',
    'MekStation calculateDistractingModifier currently applies Distracting as a local +1 target to-hit helper.',
    'MekStation calculateLowProfileModifier currently applies Low Profile as a local +1 target to-hit helper when partial cover is absent.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].quirkIds,
  ).not.toEqual(expect.arrayContaining(['distracting', 'low_profile']));
});

it('pins Dodge Maneuver to MegaMek target dodging semantics', () => {
  const dodgeRefs = SPA_COMBAT_SUPPORT['dodge-maneuver'].sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT['dodge-maneuver']).toMatchObject({
    level: 'integrated',
  });
  expect(dodgeRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Compute applies +2 when the target is a Mek with Dodge Maneuver and target.dodging is true',
    'MegaMek OptionsConstants defines the source-backed Dodge Maneuver SPA id as dodge_maneuver',
  ]);
});
