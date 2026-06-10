import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

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
    ).toEqual(['initiative-skill-modifiers'].sort());
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
