import { QUIRK_CATALOG } from '@/utils/gameplay/quirkModifiers';
import { SPA_CATALOG } from '@/utils/gameplay/spaModifiers';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import {
  PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
} from '../CombatPilotModifierApplicationSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

function assignedSpaIds(): readonly string[] {
  return uniqueSorted(
    Object.values(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
      (assignment) => assignment.spaIds,
    ),
  );
}

function assignedQuirkIds(): readonly string[] {
  return uniqueSorted(
    Object.values(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
      (assignment) => assignment.quirkIds,
    ),
  );
}

function assignedResolverIdsForSpaId(spaId: string): readonly string[] {
  return Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS)
    .flatMap(([resolverId, assignment]) =>
      (assignment.spaIds as readonly string[]).includes(spaId)
        ? [resolverId]
        : [],
    )
    .sort();
}

function canonicalSpaSourceCitations(spaId: string): readonly string[] {
  return (
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].sourceRefs?.map(
      ({ citation }) => citation,
    ) ?? []
  );
}

function helperOnlyCanonicalSpaAssignments(): readonly string[] {
  return Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS)
    .flatMap(([resolverId, assignment]) =>
      assignment.spaIds
        .filter(
          (spaId) =>
            CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId]?.level === 'helper-only',
        )
        .map((spaId) => `${resolverId}.spa.${spaId}`),
    )
    .sort();
}

function nonIntegratedIdsAssignedToIntegratedResolvers(): readonly string[] {
  const resolverSupport = PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;
  const spaSupport = SPA_COMBAT_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;
  const canonicalSpaSupport = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;
  const quirkSupport = QUIRK_COMBAT_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;

  return Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS)
    .flatMap(([resolverId, assignment]) => {
      if (resolverSupport[resolverId]?.level !== 'integrated') return [];

      return [
        ...assignment.spaIds
          .filter((spaId) => {
            if (
              resolverId === 'nightwalker-light-movement-application' &&
              spaId === 'tm_nightwalker'
            ) {
              return false;
            }
            if (
              resolverId === 'dfa-miss-bioware-pilot-damage-avoidance' &&
              (spaId === 'dermal_armor' || spaId === 'tsm_implant')
            ) {
              return false;
            }
            if (
              resolverId === 'dermal-armor-head-hit-pilot-damage-suppression' &&
              spaId === 'dermal_armor'
            ) {
              return false;
            }
            if (
              resolverId === 'eagle-eyes-active-probe-range-application' &&
              spaId === 'eagle_eyes'
            ) {
              return false;
            }
            if (
              (resolverId ===
                'env-specialist-light-physical-to-hit-application' ||
                resolverId ===
                  'env-specialist-light-ranged-to-hit-application' ||
                resolverId === 'env-specialist-fog-ranged-to-hit-application' ||
                resolverId ===
                  'env-specialist-rain-ranged-to-hit-application' ||
                resolverId ===
                  'env-specialist-wind-ranged-to-hit-application' ||
                resolverId ===
                  'env-specialist-snow-ranged-to-hit-application') &&
              spaId === 'env_specialist'
            ) {
              return false;
            }
            if (
              (resolverId === 'triple-core-processor-aimed-shot-application' ||
                resolverId ===
                  'triple-core-processor-initiative-application') &&
              (spaId === 'triple_core_processor' ||
                spaId === 'vdni' ||
                spaId === 'bvdni')
            ) {
              return false;
            }
            if (
              resolverId === 'zweihander-punch-physical-application' &&
              spaId === 'zweihander'
            ) {
              return false;
            }
            if (
              (resolverId === 'vdni-bvdni-ranged-to-hit-application' &&
                (spaId === 'vdni' || spaId === 'bvdni')) ||
              (resolverId ===
                'vdni-internal-damage-neural-feedback-application' &&
                spaId === 'vdni') ||
              (resolverId ===
                'bvdni-critical-hit-neural-feedback-application' &&
                spaId === 'bvdni') ||
              (resolverId === 'vdni-piloting-target-number-application' &&
                spaId === 'vdni')
            ) {
              return false;
            }
            if (
              resolverId === 'comm-implant-indirect-fire-spotter-application' &&
              (spaId === 'comm_implant' || spaId === 'boost_comm_implant')
            ) {
              return false;
            }
            if (
              (resolverId === 'proto-dni-ranged-to-hit-application' ||
                resolverId ===
                  'proto-dni-piloting-target-number-application') &&
              spaId === 'proto_dni'
            ) {
              return false;
            }

            return (
              (spaSupport[spaId] ?? canonicalSpaSupport[spaId])?.level !==
              'integrated'
            );
          })
          .map((spaId) => `${resolverId}.spa.${spaId}`),
        ...assignment.quirkIds
          .filter((quirkId) => quirkSupport[quirkId]?.level !== 'integrated')
          .map((quirkId) => `${resolverId}.quirk.${quirkId}`),
      ];
    })
    .sort();
}

describe('BattleMech pilot SPA and quirk resolver application catalog', () => {
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
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ],
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
    expect(QUIRK_COMBAT_SUPPORT.low_profile.evidence).toContain(
      'resolveAttack',
    );
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

  it('pins Sensor Ghosts and weapon to-hit quirks to MegaMek attacker quirk semantics', () => {
    const sensorGhostRefs = QUIRK_COMBAT_SUPPORT.sensor_ghosts.sourceRefs ?? [];
    const weaponQuirkRefs = QUIRK_COMBAT_SUPPORT.accurate.sourceRefs ?? [];

    expect(QUIRK_COMBAT_SUPPORT.sensor_ghosts).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('+1 attacker to-hit penalty'),
    });
    expect(sensorGhostRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processAttackerQuirks applies +1 Sensor Ghosts to the attacker to-hit number.',
      'MegaMek OptionsConstants defines QUIRK_NEG_SENSOR_GHOSTS as sensor_ghosts.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'ranged-to-hit-calculation'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining(sensorGhostRefs.map(({ citation }) => citation)),
    );

    expect(weaponQuirkRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processAttackerQuirks applies Accurate -1, Inaccurate +1, and Stable Weapon -1 when the attacker ran.',
      'MegaMek OptionsConstants defines Accurate, Stable Weapon, and Inaccurate weapon quirk ids.',
    ]);
    expect(QUIRK_COMBAT_SUPPORT.inaccurate.sourceRefs).toEqual(weaponQuirkRefs);
    expect(QUIRK_COMBAT_SUPPORT.stable_weapon.sourceRefs).toEqual(
      weaponQuirkRefs,
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['weapon-to-hit-quirk-application']
        .sourceRefs,
    ).toEqual(weaponQuirkRefs);
  });

  it('pins range targeting quirk rows to MegaMek behavior while preserving MekStation aliases', () => {
    const targetingRefs =
      QUIRK_COMBAT_SUPPORT.improved_targeting_short.sourceRefs ?? [];
    const targetingCitations = targetingRefs.map(({ citation }) => citation);

    expect(QUIRK_COMBAT_SUPPORT.improved_targeting_short).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('short-range Improved Targeting'),
    });
    expect(targetingCitations).toEqual([
      'MegaMek Entity range modifier helpers apply Improved Targeting -1 and Poor Targeting +1 at short, medium, and long range.',
      'MegaMek OptionsConstants defines source-backed targeting quirk ids as imp_target_short/med/long and poor_target_short/med/long.',
      'MekStation QUIRK_CATALOG keeps local improved_targeting_* and poor_targeting_* aliases for the same range-targeting quirk family.',
      'MekStation calculateTargetingQuirkModifier applies local aliases as +/-1 at the matching range bracket.',
    ]);
    expect(targetingRefs.map(({ kind }) => kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'mekstation-deviation',
      'mekstation-deviation',
    ]);
    expect(QUIRK_COMBAT_SUPPORT.improved_targeting_medium.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.improved_targeting_long.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.poor_targeting_short.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.poor_targeting_medium.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.poor_targeting_long.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'ranged-to-hit-calculation'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(expect.arrayContaining(targetingCitations.slice(0, 2)));
  });

  it('pins Jumping Jack and Hopping Jack to MegaMek jump attacker penalties', () => {
    const jumpingRefs = SPA_COMBAT_SUPPORT['jumping-jack'].sourceRefs ?? [];
    const hoppingRefs = SPA_COMBAT_SUPPORT['hopping-jack'].sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['jumping-jack']).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['hopping-jack']).toMatchObject({
      level: 'integrated',
    });
    expect(jumpingRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getAttackerMovementModifier applies +1 for Jumping Jack, +2 for Hopping Jack, and +3 for plain jump movement',
      'MegaMek OptionsConstants defines the source-backed Hopping Jack and Jumping Jack SPA ids as hopping_jack and jumping_jack',
    ]);
    expect(hoppingRefs).toEqual(jumpingRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(expect.arrayContaining(['hopping-jack', 'jumping-jack']));
  });

  it('pins Terrain Master Frogman physical to-hit to MegaMek water-depth semantics', () => {
    const frogmanRefs = SPA_COMBAT_SUPPORT.tm_frogman.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.tm_frogman).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain('tm_frogman');
    expect(frogmanRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.modifyPhysicalBTHForAdvantages applies -1 Frogman for Mek or ProtoMek attackers in water deeper than level 1',
      'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water',
      'MegaMek OptionsConstants defines the source-backed Terrain Master: Frogman SPA id as tm_frogman',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['physical-to-hit-application'].spaIds,
    ).toEqual(expect.arrayContaining(['melee-specialist', 'tm_frogman']));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['physical-to-hit-application']
        .quirkIds,
    ).toEqual(expect.arrayContaining(['battle_fists_la', 'battle_fists_ra']));
  });

  it('pins represented Zweihander physical slices and canonical support', () => {
    const resolver =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'zweihander-punch-physical-application'
      ];
    const citations = resolver.sourceRefs?.map(({ citation }) => citation);

    expect(resolver).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'two-handed punch and every official standalone physical-weapon prompt',
      ),
    });
    expect(resolver.evidence).toContain(
      'represented self-critical side-effect slices',
    );
    expect(resolver.evidence).toContain(
      'selected-arm physical-weapon limb/location declarations',
    );
    expect(resolver.gap).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'zweihander-punch-physical-application'
      ].spaIds,
    ).toEqual(['zweihander']);
    expect(citations).toEqual(
      expect.arrayContaining([
        'MegaMek BipedMek.canZweihander requires the SPA, both hand actuators, both arms intact, no arm weapons fired, and not prone.',
        'MekStation canPunch and canMeleeWeapon reject explicit two-handed Zweihander declarations unless the represented SPA, non-prone, both-arm-present, represented per-arm hand-actuator, selected-arm physical-weapon, and represented arm-fire prerequisites pass.',
        'MekStation calculatePunchToHit and calculateMeleeWeaponToHit consume represented per-location off-arm upper and lower actuator damage as two-handed Zweihander to-hit penalties.',
        'MekStation physical combat tests prove represented Zweihander punch and supported physical-weapon bonus damage, selected-arm physical-weapon declaration legality, off-arm actuator to-hit penalties, per-arm hand-actuator gates, miss PSR behavior, represented self-critical side-effect behavior, and invalid declaration no-side-effect gating without claiming non-catalog improvised club or breakage fidelity.',
      ]),
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'every official standalone physical-weapon declaration',
      ),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.gap).toBeUndefined();
  });

  it('splits represented DFA-miss bioware pilot-damage avoidance from broad implant hydration', () => {
    const resolver =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'dfa-miss-bioware-pilot-damage-avoidance'
      ];
    const citations = resolver.sourceRefs?.map(({ citation }) => citation);

    expect(resolver).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented missed-DFA fall pilot-damage immunity slice',
      ),
    });
    expect(resolver.evidence).toContain(
      'featureSupport.canonicalPilotAbilityScope.dermal_armor',
    );
    expect(resolver.evidence).toContain(
      'featureSupport.canonicalPilotAbilityScope.tsm_implant',
    );
    expect(resolver.gap).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'dfa-miss-bioware-pilot-damage-avoidance'
      ].spaIds,
    ).toEqual(['dermal_armor', 'tsm_implant']);
    expect(citations).toEqual(
      expect.arrayContaining([
        'MekStation resolveDfaMissFallPilotDamageAvoidance consumes dermal_armor and tsm_implant pilot ability ids as missed-DFA fall pilot-damage immunity only.',
        'MekStation physical attack helper coverage proves dermal_armor and tsm_implant suppress missed-DFA fall pilot damage without rolling a pilot-damage avoidance check.',
        'MekStation event-sourced physical combat coverage proves a passed missed-DFA fall pilot-damage avoidance emits UnitFell without PilotHit or pilot wounds.',
        'MegaMek TWGameManager.checkPilotAvoidFallDamage skips fall pilot-damage avoidance rolls when the entity has Dermal Armor or TSM Implant.',
      ]),
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('non-BattleMech infantry'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tsm_implant).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'ordinary BattleMech physical-weapon TSM damage remains modeled by equipment heat state',
      ),
    });
  });

  it('splits represented Dermal Armor head-hit suppression from broad implant hydration', () => {
    const resolver =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'dermal-armor-head-hit-pilot-damage-suppression'
      ];
    const citations = resolver.sourceRefs?.map(({ citation }) => citation);

    expect(resolver).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented head-hit pilot-damage suppression slice',
      ),
    });
    expect(resolver.evidence).toContain(
      'featureSupport.canonicalPilotAbilityScope.dermal_armor',
    );
    expect(resolver.gap).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'dermal-armor-head-hit-pilot-damage-suppression'
      ].spaIds,
    ).toEqual(['dermal_armor']);
    expect(citations).toEqual(
      expect.arrayContaining([
        'MegaMek TWDamageManager suppresses BattleMech head-hit crew damage when the unit has MD_DERMAL_ARMOR.',
        'MegaMek TWDamageManagerModular suppresses BattleMech head-hit crew damage when the Mek has MD_DERMAL_ARMOR.',
        'MekStation resolveDamage consumes dermal_armor pilot ability state to suppress head-hit pilot damage while preserving head armor and structure damage.',
        'MekStation head-damage-cap coverage proves Dermal Armor head hits damage the head but emit no pilot damage and leave pilot wounds unchanged.',
      ]),
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'head-hit pilot-damage suppression slice',
      ),
    });
  });

  it('represents Eagle Eyes active-probe range and minefield detonation relief', () => {
    const activeProbeResolver =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'eagle-eyes-active-probe-range-application'
      ];
    const minefieldResolver =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'eagle-eyes-minefield-detonation-application'
      ];
    const activeProbeCitations = activeProbeResolver.sourceRefs?.map(
      ({ citation }) => citation,
    );
    const minefieldCitations = minefieldResolver.sourceRefs?.map(
      ({ citation }) => citation,
    );

    expect(activeProbeResolver).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('active-probe ECM-counter range slice'),
    });
    expect(activeProbeResolver.evidence).toContain(
      'featureSupport.canonicalPilotAbilityScope.eagle_eyes',
    );
    expect(activeProbeResolver.gap).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'eagle-eyes-active-probe-range-application'
      ].spaIds,
    ).toEqual(['eagle_eyes']);
    expect(activeProbeCitations).toEqual(
      expect.arrayContaining([
        'MegaMek Entity.getBAPRange adds a +1 active-probe range bonus when the pilot has MISC_EAGLE_EYES.',
        'MekStation represented active-probe ECM counter range accepts eagleEyesRangeBonus and adds one hex without changing base probe ranges.',
        'MekStation createInitialState seeds eagleEyesRangeBonus from hydrated fullUnit ability ids for represented active-probe state.',
        'MekStation electronic warfare coverage proves Eagle Eyes extends represented active-probe Guardian ECM countering by one hex.',
        'MekStation GameCreated coverage proves hydrated eagle_eyes ability state is projected onto active probes as eagleEyesRangeBonus.',
      ]),
    );
    expect(minefieldResolver).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('detonation roll'),
    });
    expect(minefieldResolver.evidence).toContain(
      'featureSupport.canonicalPilotAbilityScope.eagle_eyes',
    );
    expect(minefieldResolver.gap).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'eagle-eyes-minefield-detonation-application'
      ].spaIds,
    ).toEqual(['eagle_eyes']);
    expect(minefieldCitations).toEqual(
      expect.arrayContaining([
        'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
        'MekStation represented TerrainType.Mines entry damage resolves a deterministic minefield detonation target roll and applies Eagle Eyes +2 target-number relief before BattleMech leg damage.',
        'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
      ]),
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'active-probe ECM-counter range gains one hex',
      ),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.gap).toBeUndefined();
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.evidence).toContain(
      'detonation target-number relief',
    );
  });

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
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'vdni-bvdni-ranged-to-hit-application'
      ].spaIds,
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
    expect(bvdniFeedbackResolver.evidence).toContain(
      'neural_feedback PilotHit',
    );
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

  it('keeps unresolved canonical SPA rows visible unless a focused resolver consumes them', () => {
    const canonicalBoundaryRows = [
      'boost_comm_implant',
      'comm_implant',
      'proto_dni',
      'triple_core_processor',
      'zweihander',
    ] as const;

    expect(
      Object.fromEntries(
        canonicalBoundaryRows.map((spaId) => {
          const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
          return [
            spaId,
            {
              level: support.level,
              gap: support.gap,
              assignedResolvers: assignedResolverIdsForSpaId(spaId),
            },
          ];
        }),
      ),
    ).toEqual({
      boost_comm_implant: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
      },
      comm_implant: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
      },
      proto_dni: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: [
          'proto-dni-piloting-target-number-application',
          'proto-dni-ranged-to-hit-application',
        ],
      },
      triple_core_processor: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: [
          'triple-core-processor-aimed-shot-application',
          'triple-core-processor-initiative-application',
        ],
      },
      zweihander: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: ['zweihander-punch-physical-application'],
      },
    });
    for (const spaId of canonicalBoundaryRows) {
      expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].gap ?? '').not.toContain(
        'No combat support entry or resolver consumes this canonical SPA id yet',
      );
    }
    const representedImplantRows = {
      boost_comm_implant: {
        evidence: [
          'indirect-fire relief',
          'C3i access for any crewed unit',
          'represented BattleMech C3i network state',
        ],
        citations: ['ComputeToHit', 'Entity.hasC3i', 'GameCreated'],
      },
      comm_implant: {
        evidence: ['indirect-fire relief', 'Infantry-only'],
        citations: ['ComputeToHit', 'TWGameManager'],
      },
    } as const;

    for (const [spaId, expectations] of Object.entries(
      representedImplantRows,
    )) {
      const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
      const citations =
        support.sourceRefs?.map(({ citation }) => citation) ?? [];

      expect(support.level).toBe('integrated');
      expect(support.gap).toBeUndefined();
      expect(assignedResolverIdsForSpaId(spaId)).toEqual(
        spaId === 'comm_implant' || spaId === 'boost_comm_implant'
          ? ['comm-implant-indirect-fire-spotter-application']
          : [],
      );
      for (const text of expectations.evidence) {
        expect(support.evidence).toContain(text);
      }
      for (const text of expectations.citations) {
        expect(citations).toEqual(
          expect.arrayContaining([expect.stringContaining(text)]),
        );
      }
    }
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_camo_armor).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('Infantry armor/readout camo state'),
      gap: expect.stringContaining('infantry/personnel concealment'),
    });
    expect(assignedResolverIdsForSpaId('dermal_camo_armor')).toEqual([]);

    expect(
      Object.fromEntries(
        ['vdni', 'bvdni'].map((spaId) => {
          const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
          return [
            spaId,
            {
              level: support.level,
              gap: support.gap,
              assignedResolvers: assignedResolverIdsForSpaId(spaId),
            },
          ];
        }),
      ),
    ).toEqual({
      vdni: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: [
          'triple-core-processor-aimed-shot-application',
          'triple-core-processor-initiative-application',
          'vdni-bvdni-ranged-to-hit-application',
          'vdni-internal-damage-neural-feedback-application',
          'vdni-piloting-target-number-application',
        ],
      },
      bvdni: {
        level: 'integrated',
        gap: undefined,
        assignedResolvers: [
          'bvdni-critical-hit-neural-feedback-application',
          'triple-core-processor-aimed-shot-application',
          'triple-core-processor-initiative-application',
          'vdni-bvdni-ranged-to-hit-application',
        ],
      },
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('source-backed runtime branches'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist.gap,
    ).toBeUndefined();
    expect(assignedResolverIdsForSpaId('env_specialist')).toEqual([
      'env-specialist-fog-ranged-to-hit-application',
      'env-specialist-light-physical-to-hit-application',
      'env-specialist-light-ranged-to-hit-application',
      'env-specialist-rain-ranged-to-hit-application',
      'env-specialist-snow-ranged-to-hit-application',
      'env-specialist-wind-ranged-to-hit-application',
    ]);

    expect(
      Object.fromEntries(
        [
          'eagle_eyes',
          'env_specialist',
          'zweihander',
          'vdni',
          'bvdni',
          'comm_implant',
          'boost_comm_implant',
          'dermal_camo_armor',
          'triple_core_processor',
          'proto_dni',
        ].map((spaId) => {
          const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
          return [
            spaId,
            {
              evidence: support.evidence,
              gap: support.gap,
              sourceCitations: canonicalSpaSourceCitations(spaId),
            },
          ];
        }),
      ),
    ).toEqual({
      eagle_eyes: {
        evidence: expect.stringContaining('detonation target-number relief'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
          'MekStation canonical miscellaneous SPA catalog defines eagle_eyes as a sensors and minefield-detection row.',
          'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
        ]),
      },
      env_specialist: {
        evidence: expect.stringContaining('source-backed runtime branches'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'MekStation canonical miscellaneous SPA catalog defines env_specialist as a Fog/Light/Rain/Snow/Wind designation row with a to-hit combat pipeline.',
          'MekStation designation option coverage proves env_specialist exposes exactly Fog, Light, Rain, Snow, and Wind choices rather than generic terrain-only values such as vacuum, underground, or low_gravity.',
        ]),
      },
      zweihander: {
        evidence: expect.stringContaining(
          'every official standalone physical-weapon declaration',
        ),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'MegaMek BipedMek.canZweihander requires the SPA, both hand actuators, both arms intact, no arm weapons fired, and not prone.',
          'MegaMek Zweihander punch and club damage add floor(weight / 10) when the two-handed declaration is active.',
          'MegaMek applyZweihanderSelfDamage applies arm critical self-damage and queues a Zweihander miss PSR when the declared two-handed attack misses.',
          'MekStation canonical piloting SPA catalog defines zweihander as a two-handed weapon strike with extra damage at a to-hit penalty.',
        ]),
      },
      vdni: {
        evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'MekStation bioware SPA table defines VDNI and Buffered VDNI as canonical neural-interface rows with to-hit and PSR pipelines.',
          'MekStation emits NeuralInterfaceStateChanged events so represented jack-in and jack-out state can be replayed without assuming implants are always connected.',
          'MekStation unit-state reducer coverage proves represented VDNI/BVDNI jack-out and jack-in events update neuralInterfaceActive and ignore unknown units.',
        ]),
      },
      bvdni: {
        evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'MekStation bioware SPA table defines VDNI and Buffered VDNI as canonical neural-interface rows with to-hit and PSR pipelines.',
          'MekStation emits NeuralInterfaceStateChanged events so represented jack-in and jack-out state can be replayed without assuming implants are always connected.',
          'MekStation unit-state reducer coverage proves represented VDNI/BVDNI jack-out and jack-in events update neuralInterfaceActive and ignore unknown units.',
        ]),
      },
      comm_implant: {
        evidence: expect.stringContaining('represented LOS spotter'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'Current MegaMek OptionsConstants defines comm_implant and boost_comm_implant as Manei Domini option ids.',
          'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
          'Current MegaMek TWGameManager applies comm-implant minefield detonation relief only to Infantry units.',
          'MekStation bioware SPA table defines Cybernetic Comm Implant and Boosted Comm Implant as canonical spotting, mine-spotting, and C3i-node rows.',
          'MekStation represented indirect-fire resolver applies Comm Implant and Boosted Comm Implant as source-backed LOS spotter target-number relief.',
        ]),
      },
      boost_comm_implant: {
        evidence: expect.stringContaining('C3i access for any crewed unit'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
          'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
          'MekStation bioware SPA table defines Cybernetic Comm Implant and Boosted Comm Implant as canonical spotting, mine-spotting, and C3i-node rows.',
          'MekStation hydrateC3EquipmentFromFullUnit projects boost_comm_implant pilot ability state into represented BattleMech C3i network state.',
          'MekStation GameCreated replay coverage proves raw session units with Boosted Comm Implant pilot ability state derive represented C3i networks without explicit mounted C3 equipment.',
          'MekStation runner coverage proves two hydrated BattleMechs with boost_comm_implant seed a represented C3i network without manual authoring.',
        ]),
      },
      dermal_camo_armor: {
        evidence: expect.stringContaining('no BattleMech attacker to-hit'),
        gap: expect.stringContaining(
          'infantry/personnel concealment validation matrix',
        ),
        sourceCitations: expect.arrayContaining([
          'MegaMek OptionsConstants defines dermal_camo_armor as a Manei Domini option id.',
          'MegaMek Infantry.getArmorDesc treats dermal_camo_armor as infantry camo armor display state.',
          'MegaMek InfantryReadout renders dermal_camo_armor as infantry Camo armor capability when sneak camo is absent.',
          'MekStation bioware SPA table defines Dermal Camouflage Armor as a canonical concealment/to-hit implant row.',
        ]),
      },
      triple_core_processor: {
        evidence: expect.stringContaining(
          'represented called-shot Targeting Computer -1 aimed-shot relief',
        ),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'MegaMek Player.getTCPInitBonus gives a TCP plus VDNI/BVDNI pilot a +2 initiative component, adds +1 for command/C3/communications equipment, and subtracts represented penalties such as shutdown, ECM, and EMI.',
          'MegaMek Entity.hasTCPAimedShotCapability requires Triple-Core Processor plus VDNI or Buffered VDNI before granting targeting-computer-style aimed-shot capability.',
          'MegaMek ComputeAttackerToHitMods applies the TCP plus VDNI aimed-shot path as targeting-computer eligibility, with an extra -1 only when an actual targeting computer is also present.',
          'MekStation hydrateTargetingComputerEquipmentFromFullUnit projects mounted Targeting Computer equipment and critical-slot signals into explicit combat state without conflating them with Triple-Core Processor SPA state.',
          'MekStation runner to-hit coverage proves actual Targeting Computer equipment applies without Triple-Core Processor and does not double-apply when TCP aimed-shot relief is also eligible.',
          'MekStation bioware SPA table defines Triple-Core Processor and Filtration Implants as canonical initiative, to-hit, and environmental-hazard rows.',
        ]),
      },
      proto_dni: {
        evidence: expect.stringContaining('without inferring VDNI'),
        gap: undefined,
        sourceCitations: expect.arrayContaining([
          'Current MegaMek ComputeAttackerToHitMods applies Prototype DNI as -2 ranged/gunnery target-number relief when active DNI is available.',
          'Current MegaMek Entity.hasDNIImplant includes proto_dni in the active DNI gate shared by VDNI and Buffered VDNI.',
          'Current MegaMek Mek.getBasePilotingRoll applies Prototype DNI as -3 BattleMech piloting target-number relief when active DNI is available.',
          'Current MegaMek TWDamageManager neural-feedback runtime checks active DNI plus MD_VDNI and excludes Buffered VDNI/Pain Shunt; it does not branch on MD_PROTO_DNI.',
          'MekStation bioware SPA table defines Prototype Direct Neural Interface as a canonical early-generation DNI row with to-hit and PSR pipelines.',
        ]),
      },
    });

    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.filtration_implants,
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'toxin and low-atmosphere environmental-hazard immunity only',
      ),
      gap: expect.stringContaining(
        'environment/personnel hazard validation matrix',
      ),
    });
    expect(assignedResolverIdsForSpaId('filtration_implants')).toEqual([]);
    expect(canonicalSpaSourceCitations('filtration_implants')).toEqual(
      expect.arrayContaining([
        'MekStation bioware SPA table defines Triple-Core Processor and Filtration Implants as canonical initiative, to-hit, and environmental-hazard rows.',
      ]),
    );

    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.oblique_artillery).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'indirect-fire to-hit penalties, not artillery scatter',
      ),
      gap: expect.stringContaining('artillery/scatter validation matrix'),
    });
    expect(canonicalSpaSourceCitations('oblique_artillery')).toEqual(
      expect.arrayContaining([
        'MekStation canonical gunnery SPA catalog defines oblique_artillery as reduced artillery scatter.',
        'MekStation BattleMech combat catalog keeps oblique_artillery distinct from the integrated oblique_attacker indirect-fire row.',
      ]),
    );

    expect(
      Object.fromEntries(
        (
          [
            'dermal_armor',
            'eagle_eyes',
            'tm_nightwalker',
            'tsm_implant',
          ] as const
        ).map((spaId) => [
          spaId,
          {
            level: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].level,
            assignedResolvers: assignedResolverIdsForSpaId(spaId),
          },
        ]),
      ),
    ).toEqual({
      dermal_armor: {
        level: 'integrated',
        assignedResolvers: [
          'dermal-armor-head-hit-pilot-damage-suppression',
          'dfa-miss-bioware-pilot-damage-avoidance',
        ],
      },
      eagle_eyes: {
        level: 'integrated',
        assignedResolvers: [
          'eagle-eyes-active-probe-range-application',
          'eagle-eyes-minefield-detonation-application',
        ],
      },
      tm_nightwalker: {
        level: 'integrated',
        assignedResolvers: ['nightwalker-light-movement-application'],
      },
      tsm_implant: {
        level: 'integrated',
        assignedResolvers: ['dfa-miss-bioware-pilot-damage-avoidance'],
      },
    });
  });

  it('pins canonical pilot ability scope residual rows to represented slices or catalog blockers', () => {
    const residualRows = [
      'boost_comm_implant',
      'comm_implant',
      'proto_dni',
      'triple_core_processor',
      'zweihander',
    ] as const;

    const residualDetails = Object.fromEntries(
      residualRows.map((spaId) => {
        const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
        const assignedResolvers = assignedResolverIdsForSpaId(spaId);

        return [
          spaId,
          {
            level: support.level,
            evidence: support.evidence,
            gap: support.gap,
            assignedResolvers,
            representedSlice: assignedResolvers.length > 0,
          },
        ];
      }),
    );

    expect(residualDetails).toEqual({
      boost_comm_implant: {
        level: 'integrated',
        evidence: expect.stringContaining('represented LOS spotter'),
        gap: undefined,
        assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
        representedSlice: true,
      },
      comm_implant: {
        level: 'integrated',
        evidence: expect.stringContaining('represented LOS spotter'),
        gap: undefined,
        assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
        representedSlice: true,
      },
      proto_dni: {
        level: 'integrated',
        evidence: expect.stringContaining('without inferring VDNI'),
        gap: undefined,
        assignedResolvers: [
          'proto-dni-piloting-target-number-application',
          'proto-dni-ranged-to-hit-application',
        ],
        representedSlice: true,
      },
      triple_core_processor: {
        level: 'integrated',
        evidence: expect.stringContaining(
          'represented called-shot Targeting Computer -1 aimed-shot relief',
        ),
        gap: undefined,
        assignedResolvers: [
          'triple-core-processor-aimed-shot-application',
          'triple-core-processor-initiative-application',
        ],
        representedSlice: true,
      },
      zweihander: {
        level: 'integrated',
        evidence: expect.stringContaining(
          'every official standalone physical-weapon declaration',
        ),
        gap: undefined,
        assignedResolvers: ['zweihander-punch-physical-application'],
        representedSlice: true,
      },
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('source-backed runtime branches'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist.gap,
    ).toBeUndefined();
    expect(assignedResolverIdsForSpaId('env_specialist')).toEqual([
      'env-specialist-fog-ranged-to-hit-application',
      'env-specialist-light-physical-to-hit-application',
      'env-specialist-light-ranged-to-hit-application',
      'env-specialist-rain-ranged-to-hit-application',
      'env-specialist-snow-ranged-to-hit-application',
      'env-specialist-wind-ranged-to-hit-application',
    ]);
    expect(
      Object.entries(residualDetails).filter(
        ([spaId, { level, representedSlice }]) =>
          spaId !== 'triple_core_processor' &&
          spaId !== 'proto_dni' &&
          spaId !== 'boost_comm_implant' &&
          spaId !== 'comm_implant' &&
          !(spaId === 'zweihander' && representedSlice === true) &&
          level !== 'helper-only' &&
          level !== 'unsupported' &&
          level !== 'out-of-scope',
      ),
    ).toEqual([]);
  });

  it('pins PSR SPA application to MegaMek skidding, quad, Terrain Master PSR, and visible gap semantics', () => {
    const psrSpaRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application']
        .sourceRefs ?? [];
    const maneuveringAceRefs =
      SPA_COMBAT_SUPPORT['maneuvering-ace'].sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];
    const controlledSideslipRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-controlled-sideslip-producer-application'
      ].sourceRefs ?? [];
    const flankingTurningRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-flanking-turning-producer-application'
      ].sourceRefs ?? [];
    const outOfControlProducerRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-out-of-control-producer-application'
      ].sourceRefs ?? [];
    const aerospaceMovementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'aerospace-maneuvering-ace-movement-application'
      ].sourceRefs ?? [];
    const psrSpaTargetNumberRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'psr-spa-target-number-application'
      ].sourceRefs ?? [];
    const lateralMovementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-lateral-movement-application'
      ].sourceRefs ?? [];

    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Frogman water-entry relief'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'psr-spa-target-number-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Swamp Beast bog-down relief'),
    });
    expect(psrSpaRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      'MegaMek QuadMek.addEntityBonuses applies -1 Animal Mimicry to quad Mek piloting rolls.',
      'MegaMek OptionsConstants defines PILOT_ANIMAL_MIMIC as animal_mimic.',
      'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water.',
      'MegaMek OptionsConstants defines PILOT_TM_FROGMAN as tm_frogman.',
      'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
      'MegaMek OptionsConstants defines PILOT_TM_MOUNTAINEER as tm_mountaineer.',
      'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
      'MegaMek Terrain.getBogDownModifier makes swamp a BattleMech bog-down terrain while mud does not bog down biped or quad movement modes.',
      'MegaMek OptionsConstants defines PILOT_TM_SWAMP_BEAST as tm_swamp_beast.',
    ]);
    expect(psrSpaTargetNumberRefs).toEqual(psrSpaRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).toEqual(
      expect.arrayContaining([
        'tm_frogman',
        'tm_mountaineer',
        'tm_swamp_beast',
      ]),
    );
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-target-number-application']
        .spaIds,
    ).toEqual([
      'maneuvering-ace',
      'tm_frogman',
      'tm_mountaineer',
      'tm_swamp_beast',
      'animal-mimicry',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).not.toContain('terrain-master');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).not.toContain('cross-country');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'].evidence,
    ).toContain('Animal Mimicry quad-Mek relief');
    expect(SPA_COMBAT_SUPPORT['maneuvering-ace']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('BattleMech skidding PSRs'),
    });
    expect(SPA_COMBAT_SUPPORT['maneuvering-ace'].evidence).toContain(
      'QuadMek lateral-step MP relief',
    );
    expect(SPA_COMBAT_SUPPORT['maneuvering-ace'].evidence).toContain(
      'out-of-control pending PSRs',
    );
    expect(SPA_COMBAT_SUPPORT['maneuvering-ace'].gap).toBeUndefined();
    expect(maneuveringAceRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
      'MegaMek OptionsConstants defines the source-backed Maneuvering Ace SPA id as maneuvering_ace.',
      'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
      'MekStation createOutOfControlPSR plus runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).toEqual(expect.arrayContaining(['maneuvering-ace']));
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('QuadMek lateral-step MP relief'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-controlled-sideslip-producer-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'queues represented controlled-sideslip PSRs',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-controlled-sideslip-producer-application'
      ].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-flanking-turning-producer-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'queues one represented flanking-and-turning PSR',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-flanking-turning-producer-application'
      ].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-out-of-control-producer-application'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'aerospace, capital craft, and airborne LAM/AirMek',
      ),
      gap: expect.stringContaining('separate aerospace/LAM validation'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-lateral-movement-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('BattleMech biped lateral shifts'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'aerospace-maneuvering-ace-movement-application'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('aerospace maneuver-thrust relief'),
      gap: expect.stringContaining('separate aerospace movement matrix'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'aerospace-maneuvering-ace-movement-application'
      ].spaIds,
    ).toEqual(['maneuvering-ace']);
    expect(aerospaceMovementRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ManeuverStep reduces aerospace maneuver thrust cost by 1 for Maneuvering Ace.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    ]);
    expect(movementRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
        'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
        'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
        'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
        'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
        'MekStation createOutOfControlPSR plus calculatePSRModifiers and runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
      ]),
    );
    expect(movementRefs).toEqual(
      expect.not.arrayContaining([...aerospaceMovementRefs]),
    );
    expect(controlledSideslipRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      'MekStation movementControlPsr queues represented controlled-sideslip PSRs for lateral movement steps and suppresses walking Maneuvering Ace lateral shifts.',
      'MekStation runner movement coverage proves walking Maneuvering Ace lateral shifts suppress controlled-sideslip PSRs while running lateral shifts emit controlled_sideslip with a movement-step trigger source.',
    ]);
    expect(flankingTurningRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      'MekStation movementControlPsr queues one represented flanking-and-turning PSR for BattleMech run/sprint movement when movement-step decomposition changes facing after moving more than one hex, while excluding Infantry and ProtoMech units.',
      'MekStation runner movement coverage proves represented BattleMech flanking-and-turning production plus walking, straight-running, Infantry, and ProtoMech non-production cases.',
    ]);
    expect(outOfControlProducerRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek TWGameManager.resolveControl resolves control rolls only for a single aero or airborne LAM in AirMek mode, returning before control-roll production for ordinary BattleMechs.',
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
      'MegaMek MovePathHandler queues aero control rolls for thrust, velocity, descent, hover, and stall movement side paths.',
      'MegaMek HeatResolver queues heat-driven control rolls for DropShip, JumpShip, and capital fighter heat side paths.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      'MekStation createOutOfControlPSR plus calculatePSRModifiers and runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'maneuvering-ace-controlled-sideslip-producer-application'
      ].spaIds,
    ).toEqual(['maneuvering-ace']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'maneuvering-ace-flanking-turning-producer-application'
      ].spaIds,
    ).toEqual(['maneuvering-ace']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'maneuvering-ace-out-of-control-producer-application'
      ].spaIds,
    ).toEqual(['maneuvering-ace']);
    expect(lateralMovementRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
    ]);
    expect(
      lateralMovementRefs.map(({ citation }) => citation).join(' '),
    ).not.toContain('aerospace maneuver thrust');
    expect(
      lateralMovementRefs.map(({ citation }) => citation).join(' '),
    ).not.toContain('out-of-control');
    expect(lateralMovementRefs).toEqual(
      expect.not.arrayContaining([
        ...(SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? []),
      ]),
    );
  });

  it('pins Cross-Country to MegaMek combat-vehicle movement scope', () => {
    const crossCountryRefs =
      SPA_COMBAT_SUPPORT['cross-country'].sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];
    const vehicleMovementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['vehicle-movement-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['cross-country']).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('combat-vehicle'),
    });
    expect(SPA_COMBAT_SUPPORT['cross-country'].gap).toContain(
      'not a BattleMech terrain PSR',
    );
    expect(crossCountryRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Terrain.movementCost applies Cross-Country only inside ground combat-vehicle terrain movement-cost gates.',
      'MegaMek Tank.isLocationProhibited applies Cross-Country to tracked, wheeled, and hover combat-vehicle passability gates.',
      'MegaMek OptionsConstants defines PILOT_CROSS_COUNTRY as cross_country.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['vehicle-movement-application'],
    ).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('Vehicle movement/passability'),
    });
    expect(movementRefs).toEqual(
      expect.not.arrayContaining([...crossCountryRefs]),
    );
    expect(vehicleMovementRefs).toEqual(crossCountryRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).not.toContain('cross-country');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['vehicle-movement-application']
        .spaIds,
    ).toEqual(['cross-country']);
  });

  it('splits legacy Evasive from source-backed TacOps Evade action coverage', () => {
    const evasiveRefs = SPA_COMBAT_SUPPORT.evasive.sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.evasive).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('local SPA catalog'),
      gap: expect.stringContaining('source-backed evasion remains covered'),
    });
    expect(SPA_COMBAT_SUPPORT.evasive.gap).toContain(
      'integrated optional TacOps Evade movement action row',
    );
    expect(evasiveRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
      'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
      'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
    ]);
    expect(movementRefs).toEqual(expect.not.arrayContaining([...evasiveRefs]));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).toEqual(['maneuvering-ace', 'heavy-lifter']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'maneuvering-ace-lateral-movement-application'
      ].spaIds,
    ).toEqual(['maneuvering-ace']);
  });

  it('pins Heavy Lifter to MegaMek lift-capacity scope', () => {
    const heavyLifterRefs = SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];
    const liftCapacityRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-lift-capacity-application'
      ].sourceRefs ?? [];
    const carryObjectCapacityRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-capacity-check-application'
      ].sourceRefs ?? [];
    const groundObjectWeightGateRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-ground-object-weight-gate-application'
      ].sourceRefs ?? [];
    const carryObjectRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-action-application'
      ].sourceRefs ?? [];
    const throwObjectRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-object-action-application'
      ].sourceRefs ?? [];
    const throwReleaseRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-release-lifecycle-application'
      ].sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['heavy-lifter']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        '5 percent per available hand lift capacity',
      ),
    });
    expect(SPA_COMBAT_SUPPORT['heavy-lifter'].evidence).toContain(
      'canonical hvy_lifter and legacy heavy-lifter 1.5 multipliers',
    );
    expect(SPA_COMBAT_SUPPORT['heavy-lifter'].evidence).toContain(
      'active TSM pickup multiplier',
    );
    expect(SPA_COMBAT_SUPPORT['heavy-lifter'].gap).toBeUndefined();
    expect(heavyLifterRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek MekWithArms.maxGroundObjectTonnage multiplies BattleMech ground-object lift capacity by 1.5 for Heavy Lifter.',
      'MegaMek ProtoMek.maxGroundObjectTonnage multiplies ProtoMek ground-object lift capacity by 1.5 for Heavy Lifter.',
      'MegaMek OptionsConstants defines PILOT_HVY_LIFTER as hvy_lifter.',
      'MekStation calculateGroundObjectLiftCapacity implements the source-backed 5 percent per available hand lift capacity plus Heavy Lifter and TSM pickup multipliers.',
      'MekStation SPA helper tests prove canonical and legacy Heavy Lifter ids apply the 1.5 lift-capacity multiplier as capacity math independent from throw action resolution.',
    ]);
    expect(movementRefs).toEqual(expect.arrayContaining([...heavyLifterRefs]));
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-lift-capacity-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('1.5 BattleMech lift-capacity'),
    });
    expect(liftCapacityRefs).toEqual(heavyLifterRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-capacity-check-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('carry-object capacity-check slice'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-capacity-check-application'
      ].evidence,
    ).toContain(
      'no thrown-object attack damage or target interaction is claimed',
    );
    expect(carryObjectCapacityRefs).toEqual(heavyLifterRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-ground-object-weight-gate-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ground-object weight gate'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-ground-object-weight-gate-application'
      ].evidence,
    ).toContain('throw range, thrown-object damage');
    expect(groundObjectWeightGateRefs.map(({ citation }) => citation)).toEqual([
      ...heavyLifterRefs.map(({ citation }) => citation),
      'MekStation checkGroundObjectLiftCapacity gates represented ground-object payload tonnage against source-backed lift capacity before pickup/drop lifecycle support consumes that state.',
      'MekStation SPA helper tests prove the represented ground-object weight gate allows payloads at or below Heavy Lifter capacity and rejects overweight or invalid payloads.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'heavy-lifter-lift-capacity-application'
      ].spaIds,
    ).toEqual(['heavy-lifter']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'heavy-lifter-carry-object-capacity-check-application'
      ].spaIds,
    ).toEqual(['heavy-lifter']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'heavy-lifter-ground-object-weight-gate-application'
      ].spaIds,
    ).toEqual(['heavy-lifter']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).toEqual(expect.arrayContaining(['heavy-lifter']));
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-action-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('represented pickup/carry/drop'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-action-application'
      ].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-release-lifecycle-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'event-sourced throw-release lifecycle',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-release-lifecycle-application'
      ].evidence,
    ).toContain('no throw range, to-hit, damage, displacement');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-release-lifecycle-application'
      ].gap,
    ).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-object-action-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'bounded throw-object action resolution',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-object-action-application'
      ].evidence,
    ).toContain('without claiming throw range, to-hit, damage');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-throw-object-action-application'
      ].gap,
    ).toBeUndefined();
    expect(carryObjectRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'MegaMek MoveStepType registers pickup and drop cargo movement steps for carryable-object lifecycle actions.',
        'MegaMek MovePathHandler resolves PICKUP_CARGO by finding ground objects, checking maxGroundObjectTonnage against payload tonnage, and calling processPickupStep.',
        'MegaMek MovePathHandler resolves DROP_CARGO by dropping the carried object and placing the ground object at the step position.',
        'MekStation groundObjectActions validates represented pickup/drop actions, consumes Heavy Lifter lift-capacity gates, and emits event-sourced carried-object lifecycle events.',
        'MekStation gameplay coverage proves represented pickup/drop events update object state and reject overweight payloads without side effects.',
        'MekStation runner coverage proves represented pickup/drop helper parity emits events and preserves invalid-action no-side-effect behavior.',
      ]),
    );
    expect(throwReleaseRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'MekStation GroundObjectDropped payloads distinguish represented throw releases from ordinary drops with reason=throw while reusing the carried-object release lifecycle.',
        'MekStation declareGroundObjectThrow emits an event-sourced throw release to a declared hex without claiming throw attack range, hit resolution, damage, or displacement.',
        'MekStation runner ground-object helpers emit reason=throw release events and clear represented carried-object state without resolving throw damage.',
        'MekStation gameplay and runner coverage prove represented throw-release events land the carried object at the declared hex and clear carried-object state.',
      ]),
    );
    expect(throwObjectRefs).toEqual(
      expect.arrayContaining([...heavyLifterRefs, ...throwReleaseRefs]),
    );
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'heavy-lifter-carry-object-action-application'
      ].spaIds,
    ).toEqual(['heavy-lifter']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'heavy-lifter-throw-object-action-application'
      ].spaIds,
    ).toEqual(['heavy-lifter']);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'heavy-lifter-throw-release-lifecycle-application'
      ].spaIds,
    ).toEqual(['heavy-lifter']);
  });

  it('pins Sandblaster to MegaMek cluster-table range bonuses and catalog-authored rapid-fire AC support', () => {
    const sandblasterRefs = SPA_COMBAT_SUPPORT.sandblaster.sourceRefs ?? [];
    const applicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application']
        .sourceRefs ?? [];
    const rateOfFireApplicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-rate-of-fire-application'
      ].sourceRefs ?? [];
    const tacOpsRapidFireApplicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-tacops-rapid-fire-application'
      ].sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.sandblaster).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('+4/+3/+2'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('designated weapon type'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-rate-of-fire-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'explicitly authored ordinary AC rate-of-fire modes',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-tacops-rapid-fire-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'UnitHydration authors official ordinary ac-2/ac-5/ac-10/ac-20 catalog rows',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-tacops-rapid-fire-application'
      ].gap,
    ).toBeUndefined();
    expect(sandblasterRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek WeaponHandler.getClusterModifiers applies Sandblaster as +4 short, +3 medium, or +2 long cluster-table modifiers for the designated weapon, taking precedence over Cluster Hitter.',
      'MegaMek PilotSPAHelper limits Sandblaster designations to UAC, LB-X AC, TacOps rapid-fire AC, and damage-by-cluster-table weapons.',
      'MegaMek OptionsConstants defines GUNNERY_SANDBLASTER as sandblaster.',
    ]);
    expect(applicationRefs).toEqual(sandblasterRefs);
    expect(rateOfFireApplicationRefs).toEqual(sandblasterRefs);
    expect(tacOpsRapidFireApplicationRefs).toEqual(sandblasterRefs);
  });

  it('pins source-backed initiative bonuses and Tactical Genius reroll flow', () => {
    const commandRefs = QUIRK_COMBAT_SUPPORT.command_mech.sourceRefs ?? [];
    const battleComputerRefs =
      QUIRK_COMBAT_SUPPORT.battle_computer.sourceRefs ?? [];
    const tacticalGeniusRefs =
      SPA_COMBAT_SUPPORT['tactical-genius'].sourceRefs ?? [];
    const applicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application']
        .sourceRefs ?? [];
    const equipmentRefs = applicationRefs.slice(
      commandRefs.length,
      applicationRefs.length - tacticalGeniusRefs.length,
    );

    expect(QUIRK_COMBAT_SUPPORT.command_mech).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('rollInitiative'),
    });
    expect(QUIRK_COMBAT_SUPPORT.command_mech.evidence).toContain(
      'initiative-equipment-producer-hydration',
    );
    expect(QUIRK_COMBAT_SUPPORT.battle_computer).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('non-cumulative'),
    });
    expect(QUIRK_COMBAT_SUPPORT.battle_computer.evidence).toContain(
      'initiative-equipment-producer-hydration',
    );
    expect(SPA_COMBAT_SUPPORT['tactical-genius']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('replaces only that side raw 2d6 roll'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('raw 2d6 payload fields'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'].evidence,
    ).toContain('initiativeEquipment gates');
    expect(commandRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.getQuirkIniBonus returns +2 for Battle Computer or +1 for Command Mech, and does not stack them.',
      'MegaMek OptionsConstants defines QUIRK_POS_BATTLE_COMP as battle_computer and QUIRK_POS_COMMAND_MEK as command_mech.',
    ]);
    expect(battleComputerRefs).toEqual(commandRefs);
    expect(equipmentRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
      'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
      'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
      'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
      'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
    ]);
    expect(tacticalGeniusRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Game.hasTacticalGenius checks for a conscious active unit with MISC_TACTICAL_GENIUS before initiative reroll handling.',
      'MegaMek InitiativeRoll.replaceRoll replaces the previous initiative roll and records that Tactical Genius was used.',
      'MegaMek OptionsConstants defines MISC_TACTICAL_GENIUS as tactical_genius.',
    ]);
    expect(applicationRefs).toEqual([
      ...commandRefs,
      ...equipmentRefs,
      ...tacticalGeniusRefs,
    ]);
  });

  it('pins represented initiative equipment hydration and producer gaps separately', () => {
    const hqHydration =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'initiative-hq-equipment-hydration'
      ];
    const commandConsoleHydration =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'initiative-command-console-hydration'
      ];
    const producerHydration =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'initiative-equipment-producer-hydration'
      ];
    const equipmentCitations = [
      'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
      'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
      'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
      'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
      'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
    ];

    expect(hqHydration).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('calculateSideInitiativeModifier'),
    });
    expect(hqHydration.evidence).toContain('Default communications mode');
    expect(commandConsoleHydration).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('calculateSideInitiativeModifier'),
    });
    expect(commandConsoleHydration.evidence).toContain('heavy-or-larger');
    expect(commandConsoleHydration.evidence).toContain('advanced-fire-control');
    expect(producerHydration).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('command-console producer ids'),
    });
    expect(producerHydration.evidence).toContain(
      'communications-equipment:size:N',
    );
    expect(producerHydration.evidence).toContain(
      'communications-equipment-N-ton:omni',
    );
    expect(producerHydration.evidence).toContain('COMMAND_CONSOLE');
    expect(producerHydration.evidence).toContain('istankcockpitcommandconsole');
    expect(producerHydration.evidence).toContain('tankcockpitcommandconsole');
    expect(producerHydration.evidence).toContain('ISRemoteDroneCommandConsole');
    expect(producerHydration.evidence).toContain('remotedronecommandconsole');
    expect(hqHydration.sourceRefs?.map(({ citation }) => citation)).toEqual(
      equipmentCitations,
    );
    expect(
      commandConsoleHydration.sourceRefs?.map(({ citation }) => citation),
    ).toEqual(equipmentCitations);
    expect(
      producerHydration.sourceRefs?.map(({ citation }) => citation),
    ).toEqual(equipmentCitations);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['initiative-hq-equipment-hydration'],
    ).toEqual({ spaIds: [], quirkIds: [] });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'initiative-command-console-hydration'
      ],
    ).toEqual({ spaIds: [], quirkIds: [] });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'initiative-equipment-producer-hydration'
      ],
    ).toEqual({ spaIds: [], quirkIds: [] });
  });

  it('pins Terrain Master Mountaineer PSR and movement relief to MegaMek semantics', () => {
    const mountaineerRefs = SPA_COMBAT_SUPPORT.tm_mountaineer.sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.tm_mountaineer).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Mountaineer'),
    });
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain(
      'tm_mountaineer',
    );
    expect(mountaineerRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
      'MegaMek Terrain.movementCost applies -1 MP for Mountaineer in rough/rubble movement-cost branches.',
      'MegaMek MoveStep applies Mountaineer as one MP less for upward elevation changes.',
      'MegaMek OptionsConstants defines Terrain Master: Mountaineer as tm_mountaineer.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
    ).toBeUndefined();
    expect(movementRefs.map(({ citation }) => citation)).toEqual(
      expect.not.arrayContaining([
        'MegaMek Terrain.movementCost applies -1 MP for Mountaineer in rough/rubble movement-cost branches.',
        'MegaMek MoveStep applies Mountaineer as one MP less for upward elevation changes.',
        'MegaMek OptionsConstants defines PILOT_TM_MOUNTAINEER as tm_mountaineer.',
      ]),
    );
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).toEqual(expect.arrayContaining(['tm_mountaineer']));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).not.toContain('tm_mountaineer');
  });

  it('pins Terrain Master defender to-hit variants to MegaMek terrain and movement semantics', () => {
    const forestRefs = SPA_COMBAT_SUPPORT.tm_forest_ranger.sourceRefs ?? [];
    const swampRefs = SPA_COMBAT_SUPPORT.tm_swamp_beast.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.tm_forest_ranger).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT.tm_swamp_beast).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('to-hit'),
    });
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain(
      'tm_forest_ranger',
    );
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain(
      'tm_swamp_beast',
    );
    expect(forestRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp',
      'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast SPA ids as tm_forest_ranger and tm_swamp_beast',
    ]);
    expect(swampRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp',
      'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
      'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast SPA ids as tm_forest_ranger and tm_swamp_beast',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(expect.arrayContaining(['tm_forest_ranger', 'tm_swamp_beast']));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration']
        .spaIds,
    ).toEqual(expect.arrayContaining(['tm_forest_ranger', 'tm_swamp_beast']));
  });

  it('splits generic Terrain Master from source-backed Nightwalker lighting behavior', () => {
    const genericRefs = SPA_COMBAT_SUPPORT['terrain-master'].sourceRefs ?? [];
    const nightwalker = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker;
    const nightwalkerRefs = nightwalker.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['terrain-master']).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('generic terrain_master'),
      gap: expect.stringContaining('canonical tm_nightwalker'),
    });
    expect(genericRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek PilotOptions registers Terrain Master variants rather than a generic terrain_master combat option.',
      'MegaMek OptionsConstants defines Terrain Master variant ids for Forest Ranger, Frogman, Mountaineer, Nightwalker, and Swamp Beast.',
      'MekStation SPA_CATALOG keeps a legacy generic terrain-master row and splits implemented Terrain Master behavior into tm_frogman, tm_mountaineer, tm_forest_ranger, and tm_swamp_beast rows.',
    ]);
    expect(nightwalker).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented environmental light state',
      ),
    });
    expect(nightwalker.evidence).toContain(
      'no Nightwalker to-hit modifier is claimed',
    );
    expect(nightwalker.evidence).toContain('prohibits run-derived');
    expect(nightwalker.evidence).toContain('airborne LAM');
    expect(nightwalker.gap).toBeUndefined();
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'nightwalker-light-movement-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('MegaMek full moon'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'nightwalker-light-movement-application'
      ].evidence,
    ).not.toContain('featureSupport.canonicalPilotAbilityScope.tm_nightwalker');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'nightwalker-light-movement-application'
      ].evidence,
    ).toContain('no Nightwalker to-hit modifier is claimed');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'nightwalker-light-movement-application'
      ].evidence,
    ).toContain('airborne LAM ground projection remains blocked');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'nightwalker-light-movement-application'
      ].spaIds,
    ).toEqual(['tm_nightwalker']);
    expect(nightwalkerRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'MegaMek PilotOptions registers Terrain Master: Nightwalker as the source-backed tm_nightwalker pilot option.',
        'MegaMek OptionsConstants defines Terrain Master: Nightwalker as tm_nightwalker.',
        'MegaMek LandAirMek.isNightwalker applies Terrain Master: Nightwalker only while the LAM is not airborne.',
        'MegaMek MoveStep uses isNightwalker to bypass full-moon, glare, moonless, solar-flare, and pitch-black movement light penalties, while prohibiting running in those light conditions.',
        'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
        'MekStation piloting SPA table defines the canonical piloting, defensive, physical-combat, Terrain Master, and ATOW G-Tolerance rows consumed by canonicalPilotAbilityScope.',
      ]),
    );
    expect(
      nightwalkerRefs.filter(({ kind }) => kind === 'megamek-source'),
    ).toHaveLength(8);
    expect(
      nightwalkerRefs.filter(({ kind }) => kind === 'mekstation-deviation')
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
        ([resolverId, assignment]) =>
          (assignment.spaIds as readonly string[]).includes('tm_nightwalker') &&
          resolverId !== 'nightwalker-light-movement-application'
            ? [`${resolverId}.spa.tm_nightwalker`]
            : [],
      ),
    ).toEqual([]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).not.toContain('tm_nightwalker');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).not.toContain('tm_nightwalker');
  });

  it('pins Shaky Stick to MegaMek ground-to-air defender semantics', () => {
    const refs = SPA_COMBAT_SUPPORT.shaky_stick.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.shaky_stick).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ground-to-air'),
    });
    expect(refs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
      'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(expect.arrayContaining(['shaky_stick']));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration']
        .spaIds,
    ).toEqual(expect.arrayContaining(['shaky_stick']));
  });

  it('keeps local called-shot helpers out of MegaMek-backed SPA claims', () => {
    expect(SPA_COMBAT_SUPPORT.marksman).toMatchObject({
      level: 'out-of-scope',
    });
    expect(SPA_COMBAT_SUPPORT.sharpshooter).toMatchObject({
      level: 'out-of-scope',
    });
    expect(SPA_COMBAT_SUPPORT.marksman.gap).toContain(
      'local called-shot helper',
    );
    expect(SPA_COMBAT_SUPPORT.sharpshooter.gap).toContain(
      'Sharpshooter constant commented out',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['called-shot-application'],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'disable local Marksman/legacy Sharpshooter helper reductions',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'called-shot-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    ]);
  });

  it('pins heat-driven SPA support to source-backed and local-only boundaries', () => {
    const hotDogRefs = SPA_COMBAT_SUPPORT['hot-dog'].sourceRefs ?? [];
    const someLikeItHotRefs =
      SPA_COMBAT_SUPPORT['some-like-it-hot'].sourceRefs ?? [];
    const weaponCoolingRefs =
      QUIRK_COMBAT_SUPPORT.improved_cooling.sourceRefs ?? [];
    const heatApplicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].sourceRefs ??
      [];

    expect(SPA_COMBAT_SUPPORT['hot-dog']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('heat-induced ammo-explosion'),
    });
    expect(SPA_COMBAT_SUPPORT['hot-dog'].evidence).toContain(
      'opt-in MaxTech pilot heat-damage',
    );
    expect(SPA_COMBAT_SUPPORT['hot-dog'].evidence).toContain(
      'opt-in MaxTech critical-damage',
    );
    expect(hotDogRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek HeatResolver sets PILOT_HOT_DOG to hotDogMod = 1 before resolving heat effects.',
      'MegaMek HeatResolver subtracts hotDogMod from startup and shutdown target numbers instead of shifting the shutdown heat threshold.',
      'MegaMek HeatResolver subtracts hotDogMod from heat ammo-explosion target numbers plus optional MaxTech heat-scale pilot-damage and critical-damage target numbers; default life-support heat damage remains threshold-based.',
      'MegaMek OptionsConstants defines PILOT_HOT_DOG as hot_dog.',
    ]);

    expect(SPA_COMBAT_SUPPORT['cool-under-fire']).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('getCoolUnderFireHeatReduction'),
      gap: expect.stringContaining('No MegaMek source-backed'),
    });
    expect(SPA_COMBAT_SUPPORT['cool-under-fire'].evidence).toContain(
      'without being consumed by BattleMech heat resolution',
    );
    expect(
      SPA_COMBAT_SUPPORT['cool-under-fire'].sourceRefs?.some(
        (sourceRef) => sourceRef.kind === 'mekstation-deviation',
      ),
    ).toBe(true);

    expect(SPA_COMBAT_SUPPORT['some-like-it-hot']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('AttackDeclared heat modifiers'),
    });
    expect(someLikeItHotRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.getHeatFiringModifier reduces positive heat firing modifiers by 1 for UNOFFICIAL_SOME_LIKE_IT_HOT.',
      'MegaMek OptionsConstants defines UNOFFICIAL_SOME_LIKE_IT_HOT as some_like_it_hot.',
    ]);

    expect(QUIRK_COMBAT_SUPPORT.improved_cooling).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('max(1, heat - 1)'),
    });
    expect(weaponCoolingRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek WeaponMounted.getCurrentHeat applies weapon cooling quirks after shot/weapon multiplication: Improved Cooling floors heat at max(1, heat - 1), Poor Cooling adds 1, and No Cooling adds 2.',
      'MegaMek WeaponQuirks registers Improved Cooling, Poor Cooling, and No Cooling as weapon quirk options.',
      'MegaMek WeaponQuirks disallows weapon cooling quirks for club weapons, non-heat weapons, conventional infantry, tanks, battle armor, and ProtoMeks.',
      'MegaMek OptionsConstants defines weapon cooling quirk ids as imp_cooling, poor_cooling, and no_cooling.',
    ]);
    expect(QUIRK_COMBAT_SUPPORT.poor_cooling.sourceRefs).toEqual(
      weaponCoolingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.no_cooling.sourceRefs).toEqual(
      weaponCoolingRefs,
    );

    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('source-backed Some Like It Hot'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].evidence,
    ).toContain('leaving local Cool Under Fire unconsumed');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].gap,
    ).toBeUndefined();
    expect(heatApplicationRefs).toEqual([
      ...hotDogRefs,
      ...someLikeItHotRefs,
      ...weaponCoolingRefs,
    ]);
  });

  it('pins local-only SPA gaps to MegaMek registry and MekStation deviation refs', () => {
    const localOnlySpaIds = [
      'acrobat',
      'natural-grace',
      'speed-demon',
      'combat-intuition',
      'cool-under-fire',
      'evasive',
      'multi-target',
      'iron-will',
      'antagonizer',
    ] as const;

    localOnlySpaIds.forEach((spaId) => {
      const support = SPA_COMBAT_SUPPORT[spaId];
      expect(support.sourceRefs?.map(({ citation }) => citation)).toEqual([
        'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
        'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
        'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
      ]);
      expect(
        support.sourceRefs?.some(
          (sourceRef) =>
            sourceRef.kind === 'mekstation-deviation' &&
            sourceRef.url.includes(
              'src/utils/gameplay/spaModifiers/catalog.ts#L',
            ),
        ),
      ).toBe(true);
    });

    expect(
      localOnlySpaIds.map((spaId) => SPA_COMBAT_SUPPORT[spaId].level),
    ).toEqual([
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
      'out-of-scope',
    ]);
    expect(SPA_COMBAT_SUPPORT.evasive.gap).toContain(
      'source-backed evasion remains covered by the integrated optional TacOps Evade movement action row',
    );
    expect(SPA_COMBAT_SUPPORT['cool-under-fire'].gap).toContain(
      'outside the official BattleMech validation blocker inventory',
    );
    expect(SPA_COMBAT_SUPPORT['combat-intuition'].gap).toContain(
      'source-backed combat authority',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['target-priority-application'],
    ).toMatchObject({
      level: 'out-of-scope',
      sourceRefs: SPA_COMBAT_SUPPORT.antagonizer.sourceRefs,
    });
  });

  it('keeps generic Edge trigger state source-backed after integration', () => {
    const edgeRefs = SPA_COMBAT_SUPPORT.edge.sourceRefs ?? [];
    const edgeCitations = edgeRefs.map(({ citation }) => citation);
    const megamekEdgeCitations = edgeCitations.slice(0, 8);

    expect(SPA_COMBAT_SUPPORT.edge).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Source-backed Edge trigger ids'),
    });
    expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
      'not the generic edge SPA alias by itself',
    );
    expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
      'UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state',
    );
    expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
      'hit-location resolution consumes edge_when_headhit and edge_when_tac',
    );
    expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
      'represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS',
    );
    expect(edgeCitations).toEqual([
      'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
      'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
      'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
      'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
      'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
      'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids, partitions represented BattleMech triggers from out-of-scope aerospace triggers, deriveEdgePointCountFromPilotAbilities models the generic Edge point producer, and createEdgeState/canUseEdge/useEdge model trigger point consumption.',
      'MekStation UnitHydration copies source-backed fullUnit abilities into IUnitGameState and derives edgePointsRemaining from explicit Edge point state or the generic edge ability without treating trigger-only Edge ids as point producers.',
      'MekStation createHydratedUnitState seeds hydrated abilities and Edge point state into BattleMech combat state.',
      'MekStation GameCreated synthesis copies hydrated abilities and Edge point state into seed payloads so replay initialization preserves represented Edge state.',
      'MekStation hydration tests prove explicit Edge points, generic edge point production, trigger-only non-production, combat-state hydration, and GameCreated seed payload preservation.',
      'MekStation GameCreated tests prove hydrated pilot abilities and generic Edge points seed both initial runner state and replay GameCreated units.',
      'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
      'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
      'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
      'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
      'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
      'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
      'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
      'MekStation runner PSR tests prove edge_when_masc_fails rerolls failed MASC and Supercharger checks, spends Edge, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes.',
      'MekStation resolvePilotConsciousnessCheck consumes edge_when_ko to reroll failed BattleMech consciousness checks and returns superseded/final roll plus remaining Edge metadata.',
      'MekStation pilot consciousness tests prove edge_when_ko rerolls failed consciousness checks, spends represented Edge, and does not spend generic Edge or passing checks.',
      'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
      'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
      'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
      'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
    ]);
    expect(edgeRefs.map(({ kind }) => kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].sourceRefs,
    ).toEqual(edgeRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].evidence,
    ).toContain('without treating the generic edge SPA alias as a trigger');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].evidence,
    ).toContain(
      'represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].evidence,
    ).toContain(
      'UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].level,
    ).toBe('integrated');
    const aerospaceEdgeIds = [
      'edge_when_aero_alt_loss',
      'edge_when_aero_explosion',
      'edge_when_aero_ko',
      'edge_when_aero_lucky_crit',
      'edge_when_aero_nuke_crit',
      'edge_when_aero_unit_cargo_lost',
    ];
    expect(
      aerospaceEdgeIds.map((spaId) => ({
        id: spaId,
        level: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].level,
        gap: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].gap,
      })),
    ).toEqual([
      {
        id: 'edge_when_aero_alt_loss',
        level: 'out-of-scope',
        gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      },
      {
        id: 'edge_when_aero_explosion',
        level: 'out-of-scope',
        gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      },
      {
        id: 'edge_when_aero_ko',
        level: 'out-of-scope',
        gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      },
      {
        id: 'edge_when_aero_lucky_crit',
        level: 'out-of-scope',
        gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      },
      {
        id: 'edge_when_aero_nuke_crit',
        level: 'out-of-scope',
        gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      },
      {
        id: 'edge_when_aero_unit_cargo_lost',
        level: 'out-of-scope',
        gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      },
    ]);
    aerospaceEdgeIds.forEach((spaId) => {
      expect(canonicalSpaSourceCitations(spaId)).toEqual(
        expect.arrayContaining([
          'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
          'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
          'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
        ]),
      );
    });
    expect(
      Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
        ([resolverId, assignment]) =>
          assignment.spaIds.flatMap((spaId) =>
            aerospaceEdgeIds.includes(spaId)
              ? [`${resolverId}.spa.${spaId}`]
              : [],
          ),
      ),
    ).toEqual([]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-head-hit-reroll-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('edge_when_headhit'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application']
        .evidence,
    ).toContain('preserves the superseded head-hit metadata');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application']
        .sourceRefs,
    ).not.toEqual(edgeRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-head-hit-reroll-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      ...megamekEdgeCitations,
      'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
      'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
      'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('edge_when_tac'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application']
        .evidence,
    ).toContain('before TAC critical processing');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application']
        .sourceRefs,
    ).not.toEqual(edgeRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-tac-reroll-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      ...megamekEdgeCitations,
      'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
      'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
      'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-ko-consciousness-reroll-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('edge_when_ko'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-ko-consciousness-reroll-application'
      ].evidence,
    ).toContain(
      'refuses to spend generic edge without the KO trigger-specific ability',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-ko-consciousness-reroll-application'
      ].sourceRefs,
    ).not.toEqual(edgeRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-ko-consciousness-reroll-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      ...megamekEdgeCitations,
      'MekStation resolvePilotConsciousnessCheck consumes edge_when_ko to reroll failed BattleMech consciousness checks and returns superseded/final roll plus remaining Edge metadata.',
      'MekStation pilot consciousness tests prove edge_when_ko rerolls failed consciousness checks, spends represented Edge, and does not spend generic Edge or passing checks.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-masc-supercharger-reroll-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('MASCFailure and SuperchargerFailure'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-masc-supercharger-reroll-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
      'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
      'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
      'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
      'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
      'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
      'MekStation runner PSR tests prove edge_when_masc_fails rerolls failed MASC and Supercharger checks, spends Edge, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['critical-prevention-application']
        .sourceRefs,
    ).toEqual(edgeRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['critical-prevention-application'],
    ).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining(
        'Generic critical-hit negation is not a source-backed BattleMech resolver',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'critical-prevention-edge-explosion-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('edge_when_explosion'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'critical-prevention-edge-explosion-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
      'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
      'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
      'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
      'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
      'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
      'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
      'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
      'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
      'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
    ]);
    expect(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-application']).toEqual({
      spaIds: ['edge'],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-head-hit-reroll-application'],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-tac-reroll-application'],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'edge-ko-consciousness-reroll-application'
      ],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'edge-masc-supercharger-reroll-application'
      ],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['critical-prevention-application'],
    ).toEqual({
      spaIds: ['edge'],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'critical-prevention-edge-explosion-application'
      ],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
  });

  it('keeps toughness and consciousness SPA boundaries source-backed and alias-safe', () => {
    const ironManRefs = SPA_COMBAT_SUPPORT['iron-man'].sourceRefs ?? [];
    const painResistanceRefs =
      SPA_COMBAT_SUPPORT['pain-resistance'].sourceRefs ?? [];
    const consciousnessRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['consciousness-application']
        .sourceRefs ?? [];
    const rpgToughnessConsciousnessRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'rpg-toughness-consciousness-application'
      ].sourceRefs ?? [];
    const painResistanceToHitRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'legacy-pain-resistance-to-hit-application'
      ].sourceRefs ?? [];
    const toughnessRefs = SPA_COMBAT_SUPPORT.toughness.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['iron-man']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ammunition-explosion'),
    });
    expect(SPA_COMBAT_SUPPORT['pain-resistance']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('wake-up relief'),
    });
    expect(SPA_COMBAT_SUPPORT.toughness).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('explicit assigned-pilot rpgToughness'),
      gap: expect.stringContaining(
        'explicit assigned-pilot rpgToughness/pilotToughness',
      ),
    });
    expect(SPA_COMBAT_SUPPORT.toughness.evidence).toContain(
      'Legacy pilotAbilities.toughness ability strings',
    );
    expect(SPA_COMBAT_SUPPORT.toughness.gap).toContain(
      'Legacy toughness ability aliases are excluded',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'rpg-toughness-consciousness-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('explicit numeric pilotToughness'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'rpg-toughness-consciousness-application'
      ].evidence,
    ).toContain(
      'legacy toughness ability aliases do not imply numeric RPG Toughness',
    );
    expect(SPA_COMBAT_SUPPORT['iron-will']).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('local SPA catalog defines Iron Will'),
      gap: expect.stringContaining('excluded from the official BattleMech'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'legacy-pain-resistance-to-hit-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'not ranged to-hit wound-penalty relief',
      ),
    });
    expect(ironManRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
      'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
      'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
      'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
      'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
      'MekStation getEffectiveWounds leaves pilot wounds unchanged so Pain Resistance no longer reduces ranged to-hit wound penalties.',
      'MekStation getConsciousnessCheckModifier applies source-backed Pain Resistance ids only; Iron Man, Iron Will, and Toughness do not lower consciousness target numbers.',
      'MekStation resolveBattleMechAmmoExplosionPilotDamage reduces ammo-explosion pilot damage only for source-backed Pain Resistance or Iron Man ids.',
      'MekStation legacy aliases still collapse toughness into pain_resistance and iron-will into iron_man for generic canonicalization, so source-backed resolvers must bypass those aliases.',
    ]);
    expect(painResistanceRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek TWGameManager lowers consciousness target numbers by numeric crew toughness only when the RPG Toughness game option is enabled, then adds +1 to Pain Resistance consciousness rolls.',
      'MegaMek TWGameManager adds +1 to Pain Resistance wake-up rolls.',
      'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
      'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
      'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
      'MegaMek OptionsConstants defines RPG_TOUGHNESS as a separate game-option id.',
      'MegaMek GameOptions registers RPG Toughness as a game option rather than a pilot SPA.',
      'MegaMek Crew stores numeric toughness per crew slot for KO checks.',
      'MegaMek Crew exposes numeric toughness accessors per crew slot.',
      'MegaMek MULParser imports crew toughness only when RPG Toughness is enabled.',
      'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
      'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
      'MegaMek option text defines RPG Toughness as a numeric pilot toughness bonus for consciousness check targets.',
      'MekStation getEffectiveWounds leaves pilot wounds unchanged so Pain Resistance no longer reduces ranged to-hit wound penalties.',
      'MekStation getConsciousnessCheckModifier applies source-backed Pain Resistance ids only; Iron Man, Iron Will, and Toughness do not lower consciousness target numbers.',
      'MekStation resolveBattleMechAmmoExplosionPilotDamage reduces ammo-explosion pilot damage only for source-backed Pain Resistance or Iron Man ids.',
      'MekStation legacy aliases still collapse toughness into pain_resistance and iron-will into iron_man for generic canonicalization, so source-backed resolvers must bypass those aliases.',
    ]);
    expect(ironManRefs.map(({ kind }) => kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
    ]);
    expect(painResistanceRefs.map(({ kind }) => kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'megamek-source',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
    ]);
    expect(toughnessRefs).not.toEqual(painResistanceRefs);
    expect(toughnessRefs.map(({ citation }) => citation)).toEqual([
      ...painResistanceRefs.map(({ citation }) => citation).slice(0, 13),
      'MekStation IPilot.rpgToughness carries explicit assigned-pilot RPG Toughness numeric state without inferring it from legacy ability aliases.',
      'MekStation force-assignment preBattleSessionBuilder maps explicit assigned-pilot rpgToughness into GameCreated pilotToughness seeds for combat state initialization.',
      'MekStation skirmish preBattleSessionBuilder maps explicit RPG Toughness snapshots into GameCreated pilotToughness seeds for combat state initialization.',
      'MekStation pre-battle skirmish launch copies assigned IPilot.rpgToughness into the skirmish pilot snapshot and preserves pilotToughness when creating engine game units.',
      'MekStation force-assignment pre-battle session tests prove numeric rpgToughness reaches session unit state and legacy toughness ability aliases do not imply pilotToughness.',
      'MekStation skirmish pre-battle session tests prove numeric RPG Toughness snapshots reach session unit state and non-finite values remain absent.',
      ...painResistanceRefs.map(({ citation }) => citation).slice(13),
    ]);
    expect(toughnessRefs.map(({ kind }) => kind)).toEqual([
      ...painResistanceRefs.map(({ kind }) => kind).slice(0, 13),
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      'mekstation-deviation',
      ...painResistanceRefs.map(({ kind }) => kind).slice(13),
    ]);
    expect(
      SPA_COMBAT_SUPPORT['iron-will'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
      'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
      'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
    ]);
    expect(consciousnessRefs).toEqual(painResistanceRefs);
    expect(rpgToughnessConsciousnessRefs).toEqual(toughnessRefs);
    expect(painResistanceToHitRefs).toEqual(painResistanceRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['consciousness-application'],
    ).toEqual({
      spaIds: ['iron-man', 'pain-resistance'],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'rpg-toughness-consciousness-application'
      ],
    ).toEqual({ spaIds: [], quirkIds: [] });
    expect(assignedSpaIds()).not.toContain('toughness');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'legacy-pain-resistance-to-hit-application'
      ],
    ).toEqual({ spaIds: [], quirkIds: [] });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).not.toContain('pain-resistance');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration']
        .spaIds,
    ).not.toContain('pain-resistance');
  });

  it('keeps source-backed pilot modifier refs commit-pinned', () => {
    const refs = [
      ...(SPA_COMBAT_SUPPORT['multi-tasker'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['multi-target'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['iron-man'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['pain-resistance'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.toughness.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['iron-will'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['dodge-maneuver'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.shaky_stick.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['hopping-jack'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['jumping-jack'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_frogman.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_forest_ranger.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_mountaineer.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_swamp_beast.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['cross-country'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['hot-dog'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['some-like-it-hot'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['tactical-genius'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.edge.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.command_mech.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.battle_computer.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.distracting.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.low_profile.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.improved_cooling.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.poor_cooling.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.no_cooling.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.sensor_ghosts.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.multi_trac.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.accurate.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.inaccurate.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.stable_weapon.sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'weapon-to-hit-quirk-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-lift-capacity-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-carry-object-capacity-check-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'heavy-lifter-ground-object-weight-gate-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-lateral-movement-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'nightwalker-light-movement-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'legacy-defensive-quirk-to-hit-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'legacy-pain-resistance-to-hit-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-calculation']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'ranged-to-hit-state-hydration'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'psr-spa-target-number-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'triple-core-processor-aimed-shot-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'triple-core-processor-initiative-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['consciousness-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-head-hit-reroll-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-masc-supercharger-reroll-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'critical-prevention-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'critical-prevention-edge-explosion-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'dermal-armor-head-hit-pilot-damage-suppression'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-rate-of-fire-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-tacops-rapid-fire-application'
      ].sourceRefs ?? []),
    ];
    const megamekRefs = refs.filter(
      (sourceRef) => sourceRef.kind === 'megamek-source',
    );
    const mekstationDeviationRefs = refs.filter(
      (sourceRef) => sourceRef.kind === 'mekstation-deviation',
    );
    const pinnedMegaMekVersions = new Set([
      '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      '55584ec7529b944fca3216965697e9fa1115dced',
    ]);

    expect(refs.length).toBeGreaterThan(0);
    expect(
      megamekRefs.every(
        (sourceRef) =>
          pinnedMegaMekVersions.has(sourceRef.sourceVersion) &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
    expect(
      mekstationDeviationRefs.every(
        (sourceRef) => sourceRef.sourceVersion === 'MekStation working-tree',
      ),
    ).toBe(true);
  });
});
