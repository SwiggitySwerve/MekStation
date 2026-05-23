import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from '../CombatIntegrationSupport';

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

describe('BattleMech combat integration support catalog', () => {
  it('catalogs the representative cross-stack combat scenarios', () => {
    expect(sortedKeys(COMBAT_INTEGRATION_SCENARIO_SUPPORT)).toEqual(
      [
        'ejection-damage-preservation',
        'ejection-command-intent-outcome',
        'interactive-actor-lifecycle-removal',
        'interactive-terminal-event',
        'objective-control-lifecycle-filter',
        'objective-outcome-precedence',
        'phase-psr-queue-lifecycle',
        'runner-terminal-game-ended-event',
        'runner-terminal-summary',
        'targetability-lifecycle-filter',
        'terminal-survivor-filter',
        'turn-rotation-lifecycle-removal',
      ].sort(),
    );
    expect(supportGaps(COMBAT_INTEGRATION_SCENARIO_SUPPORT)).toEqual([]);
  });

  it('keeps implemented integration paths separate from known event-log gaps', () => {
    expect(
      supportIdsByLevel(COMBAT_INTEGRATION_SCENARIO_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'ejection-damage-preservation',
        'ejection-command-intent-outcome',
        'interactive-actor-lifecycle-removal',
        'interactive-terminal-event',
        'objective-control-lifecycle-filter',
        'objective-outcome-precedence',
        'phase-psr-queue-lifecycle',
        'runner-terminal-game-ended-event',
        'runner-terminal-summary',
        'targetability-lifecycle-filter',
        'terminal-survivor-filter',
        'turn-rotation-lifecycle-removal',
      ].sort(),
    );
    expect(
      supportIdsByLevel(COMBAT_INTEGRATION_SCENARIO_SUPPORT, 'helper-only'),
    ).toEqual([]);
  });
});
