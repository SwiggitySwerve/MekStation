import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
} from '../CombatPilotModifierApplicationSupport';
import { PILOT_SKILL_COMBAT_SUPPORT } from '../CombatPilotSkillSupport';

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

const MEGAMEK_PILOT_SKILL_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const VALID_SOURCE_KINDS = new Set([
  'rulebook',
  'megamek-source',
  'mekhq-behavior',
  'mekstation-deviation',
]);

function sourceRefFailures(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support).flatMap((entry) => {
    const sourceRefs = entry.sourceRefs ?? [];
    if (sourceRefs.length === 0) return [`${entry.id}: missing sourceRefs`];

    return sourceRefs.flatMap((sourceRef, index) => {
      const refId = `${entry.id}.sourceRefs[${index}]`;
      const failures: string[] = [];

      if (!VALID_SOURCE_KINDS.has(sourceRef.kind)) {
        failures.push(`${refId}: invalid source kind ${sourceRef.kind}`);
      }
      if (sourceRef.citation.trim().length === 0) {
        failures.push(`${refId}: missing citation`);
      }
      if (!sourceRef.url.includes('#L')) {
        failures.push(`${refId}: missing line anchor`);
      }
      if (
        sourceRef.kind === 'megamek-source' &&
        (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/') ||
          sourceRef.sourceVersion !== MEGAMEK_PILOT_SKILL_SOURCE_VERSION ||
          !sourceRef.url.includes(MEGAMEK_PILOT_SKILL_SOURCE_VERSION))
      ) {
        failures.push(`${refId}: MegaMek source is not commit-pinned`);
      }
      if (
        sourceRef.kind === 'mekstation-deviation' &&
        sourceRef.sourceVersion !== 'MekStation working-tree'
      ) {
        failures.push(`${refId}: MekStation ref has wrong sourceVersion`);
      }

      return failures;
    });
  });
}

describe('BattleMech pilot skill combat support catalog', () => {
  it('catalogs combat use of gunnery, piloting, initiative, and wound skill modifiers', () => {
    // Audit C-5: 'indirect-fire-spotter-gunnery' removed from the catalog —
    // the spotter gunnery modifier is artillery-only; LRM indirect fire
    // consumes no spotter pilot skill (ComputeToHit.java L1512-1545).
    expect(sortedKeys(PILOT_SKILL_COMBAT_SUPPORT)).toEqual(
      [
        'initiative-skill-modifiers',
        'pending-psr-wound-penalty',
        'physical-piloting-to-hit',
        'pilot-wound-ranged-penalty',
        'psr-base-skill-event-stamping',
        'psr-piloting-resolution',
        'ranged-gunnery-to-hit',
        'stand-up-piloting',
        'stand-up-wound-psr-penalty',
      ].sort(),
    );
    expect(supportGaps(PILOT_SKILL_COMBAT_SUPPORT)).toEqual([]);
  });

  it('keeps consumed pilot-skill paths separate from helper-only gaps', () => {
    // Audit C-5: 'indirect-fire-spotter-gunnery' removed (see above).
    expect(supportIdsByLevel(PILOT_SKILL_COMBAT_SUPPORT, 'integrated')).toEqual(
      [
        'initiative-skill-modifiers',
        'pending-psr-wound-penalty',
        'physical-piloting-to-hit',
        'pilot-wound-ranged-penalty',
        'psr-base-skill-event-stamping',
        'psr-piloting-resolution',
        'ranged-gunnery-to-hit',
        'stand-up-piloting',
        'stand-up-wound-psr-penalty',
      ].sort(),
    );
    expect(
      supportIdsByLevel(PILOT_SKILL_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
  });

  it('keeps remaining pilot modifier resolver aggregate gaps explicit when narrow siblings are integrated', () => {
    expect(
      Object.fromEntries(
        (
          [
            'critical-prevention-application',
            'movement-application',
            'psr-spa-application',
          ] as const
        ).map((resolverId) => [
          resolverId,
          {
            level: PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[resolverId].level,
            gap: PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[resolverId].gap,
            assignedSpaIds:
              PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[resolverId].spaIds,
            assignedQuirkIds:
              PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[resolverId].quirkIds,
          },
        ]),
      ),
    ).toEqual({
      'critical-prevention-application': {
        level: 'out-of-scope',
        gap: 'Generic critical-hit negation is not a source-backed BattleMech resolver and no broad critical-prevention mechanic is claimed; this aggregate label is excluded from blockers while the row-specific TAC, head-hit, and explosion Edge triggers stay integrated',
        assignedSpaIds: ['edge'],
        assignedQuirkIds: [],
      },
      'movement-application': {
        level: 'integrated',
        gap: undefined,
        assignedSpaIds: ['maneuvering-ace', 'heavy-lifter'],
        assignedQuirkIds: [],
      },
      'psr-spa-application': {
        level: 'integrated',
        gap: undefined,
        assignedSpaIds: [
          'maneuvering-ace',
          'tm_frogman',
          'tm_mountaineer',
          'tm_swamp_beast',
          'animal-mimicry',
        ],
        assignedQuirkIds: [],
      },
    });

    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'critical-prevention-edge-explosion-application'
      ].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application']
        .level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-head-hit-reroll-application'],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application']
        .level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-tac-reroll-application'],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-ko-consciousness-reroll-application'
      ].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'edge-ko-consciousness-reroll-application'
      ],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'edge-masc-supercharger-reroll-application'
      ].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'maneuvering-ace-lateral-movement-application'
      ].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'psr-spa-target-number-application'
      ].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'rpg-toughness-consciousness-application'
      ].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'rpg-toughness-consciousness-application'
      ],
    ).toEqual({
      spaIds: [],
      quirkIds: [],
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application'].level,
    ).toBe('integrated');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'sandblaster-rate-of-fire-application'
      ].level,
    ).toBe('integrated');

    expect(
      Object.fromEntries(
        (
          [
            'sandblaster-rate-of-fire-application',
            'sandblaster-tacops-rapid-fire-application',
          ] as const
        ).map((resolverId) => [
          resolverId,
          {
            level: PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[resolverId].level,
            evidence:
              PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[resolverId].evidence,
            gap: PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[resolverId].gap,
            assignedSpaIds:
              PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[resolverId].spaIds,
            tacOpsRapidFireSourceRefs: PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
              resolverId
            ].sourceRefs?.filter((sourceRef) =>
              sourceRef.citation.includes('TacOps rapid-fire AC'),
            ).length,
          },
        ]),
      ),
    ).toEqual({
      'sandblaster-rate-of-fire-application': {
        level: 'integrated',
        evidence:
          'runAttackPhase consumes Sandblaster state, designated autocannon weapon type, and attack range before expanding selected UAC/RAC or explicitly authored ordinary AC rate-of-fire modes so runner shot counts follow the source-backed cluster table while non-Sandblaster rate-of-fire modes keep independent selected shots',
        gap: undefined,
        assignedSpaIds: ['sandblaster'],
        tacOpsRapidFireSourceRefs: 1,
      },
      'sandblaster-tacops-rapid-fire-application': {
        level: 'integrated',
        evidence:
          'Sandblaster source refs are pinned to include TacOps rapid-fire AC as a legal designation family, UnitHydration authors official ordinary ac-2/ac-5/ac-10/ac-20 catalog rows with single/rapid-fire modes, and represented runner rate-of-fire integration consumes those catalog-authored ordinary AC rapid-fire modes without static fallback',
        gap: undefined,
        assignedSpaIds: ['sandblaster'],
        tacOpsRapidFireSourceRefs: 1,
      },
    });
  });

  it('pins every pilot skill use row to anchored source refs', () => {
    expect(sourceRefFailures(PILOT_SKILL_COMBAT_SUPPORT)).toEqual([]);
    expect(
      PILOT_SKILL_COMBAT_SUPPORT['physical-piloting-to-hit'].sourceRefs?.some(
        (sourceRef) => sourceRef.citation.includes('PunchAttackAction'),
      ),
    ).toBe(true);
    expect(
      PILOT_SKILL_COMBAT_SUPPORT[
        'psr-base-skill-event-stamping'
      ].sourceRefs?.every(
        (sourceRef) => sourceRef.kind === 'mekstation-deviation',
      ),
    ).toBe(true);
    expect(
      PILOT_SKILL_COMBAT_SUPPORT['initiative-skill-modifiers'].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
        'MegaMek Game.hasTacticalGenius checks for a conscious active unit with MISC_TACTICAL_GENIUS before initiative reroll handling.',
      ]),
    );
  });
});
