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

describe('BattleMech pilot skill combat support catalog', () => {
  it('catalogs combat use of gunnery, piloting, initiative, and wound skill modifiers', () => {
    expect(sortedKeys(PILOT_SKILL_COMBAT_SUPPORT)).toEqual(
      [
        'indirect-fire-spotter-gunnery',
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
    expect(supportIdsByLevel(PILOT_SKILL_COMBAT_SUPPORT, 'integrated')).toEqual(
      [
        'indirect-fire-spotter-gunnery',
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
});
