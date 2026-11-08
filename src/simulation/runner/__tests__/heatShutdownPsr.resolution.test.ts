/**
 * C7 PR3: a heat-shutdown PSR queued in the runner's Heat phase is rolled, not
 * dropped.
 *
 * MegaMek 48fcb2f64 resolves the shutdown PSR in the phase it is queued; the
 * interactive path rolls it in the End phase (gameSessionHeat.effects.ts +
 * resolvePendingPSRs). The runner queued it in `runHeatPhase`, but its turn
 * loop had no PSR phase after Heat, so the next `resetTurnState` cleared the
 * queue unrolled and no `PSRResolved` was ever emitted.
 *
 * `runHeatPhase` is wrapped to force a shutdown-level heat so the loop-level
 * behaviour is observable without a heat-engineered scenario.
 */

import { GameEventType, type IPSRResolvedPayload } from '@/types/gameplay';

import { StandStillAIPlayer } from '../../ai/StandStillAIPlayer';
import { SimulationRunner } from '../SimulationRunner';

jest.mock('../phases/postCombat', () => {
  const actual = jest.requireActual<typeof import('../phases/postCombat')>(
    '../phases/postCombat',
  );
  return {
    ...actual,
    runHeatPhase: jest.fn(
      (options: Parameters<typeof actual.runHeatPhase>[0]) =>
        actual.runHeatPhase({
          ...options,
          state: {
            ...options.state,
            units: {
              ...options.state.units,
              'player-1': { ...options.state.units['player-1'], heat: 40 },
            },
          },
        }),
    ),
  };
});

const CONFIG = {
  seed: 8101,
  turnLimit: 2,
  unitCount: { player: 1, opponent: 1 },
  mapRadius: 5,
};

describe('runner heat-shutdown PSR resolution', () => {
  const run = () =>
    new SimulationRunner(
      CONFIG.seed,
      undefined,
      undefined,
      () => new StandStillAIPlayer(),
    ).run(CONFIG);

  it('emits PSRResolved for every shutdown PSR it queues, before the next turn starts', () => {
    const { events } = run();
    const shutdownTriggers = events.filter(
      (event) =>
        event.type === GameEventType.PSRTriggered &&
        event.actorId === 'player-1',
    );
    expect(shutdownTriggers.length).toBeGreaterThan(0);

    for (const trigger of shutdownTriggers) {
      const nextTurnStart = events.findIndex(
        (event) =>
          event.type === GameEventType.TurnStarted &&
          event.turn === trigger.turn + 1,
      );
      const resolvedAt = events.findIndex(
        (event) =>
          event.type === GameEventType.PSRResolved &&
          (event.payload as IPSRResolvedPayload).unitId === 'player-1' &&
          event.turn === trigger.turn &&
          event.sequence > trigger.sequence,
      );
      expect(resolvedAt).toBeGreaterThan(-1);
      if (nextTurnStart !== -1) expect(resolvedAt).toBeLessThan(nextTurnStart);
    }
  });
});
