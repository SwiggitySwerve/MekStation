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

function sourceRefsFor(id: string) {
  return (
    COMBAT_INTEGRATION_SCENARIO_SUPPORT[
      id as keyof typeof COMBAT_INTEGRATION_SCENARIO_SUPPORT
    ]?.sourceRefs ?? []
  );
}

function sourceCitationsFor(id: string): readonly string[] {
  return sourceRefsFor(id).map(({ citation }) => citation);
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

  it('source-pins each representative integration row to executable anchors', () => {
    for (const entry of Object.values(COMBAT_INTEGRATION_SCENARIO_SUPPORT)) {
      const sourceRefs = entry.sourceRefs ?? [];

      expect(sourceRefs).not.toHaveLength(0);
      expect(
        sourceRefs.some(({ kind }) => kind === 'mekstation-deviation'),
      ).toBe(true);
      expect(
        sourceRefs.every(
          ({ sourceVersion, url }) =>
            sourceVersion.length > 0 && url.includes('#L'),
        ),
      ).toBe(true);
    }
    expect(sourceCitationsFor('ejection-command-intent-outcome')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ejection lifecycle integration test'),
        expect.stringContaining('InteractiveSession.ejectUnit'),
        expect.stringContaining('applyUnitEjected'),
      ]),
    );
    expect(sourceCitationsFor('phase-psr-queue-lifecycle')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('applyPhaseChanged'),
        expect.stringContaining('applyTurnStarted'),
        expect.stringContaining('phaseManagement regression tests'),
      ]),
    );
    expect(sourceCitationsFor('runner-terminal-game-ended-event')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('SimulationRunner derives matchTerminalState'),
        expect.stringContaining('appendRunnerGameEndedEvent'),
        expect.stringContaining('terminal parity behavior test'),
      ]),
    );
    expect(sourceCitationsFor('objective-outcome-precedence')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('checkVictoryConditions'),
        expect.stringContaining('evaluateObjectiveOutcome'),
        expect.stringContaining('GameOutcomeCalculator'),
      ]),
    );
  });
});
