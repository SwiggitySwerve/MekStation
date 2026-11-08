import {
  GameEventType,
  GameSide,
  type IGameEndedPayload,
} from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from '../CombatIntegrationSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { SimulationRunner } from '../SimulationRunner';
import { MAX_TURNS } from '../SimulationRunnerConstants';
import { createInitialState } from '../SimulationRunnerState';

jest.mock('../SimulationRunnerState', () => {
  const actual = jest.requireActual<typeof import('../SimulationRunnerState')>(
    '../SimulationRunnerState',
  );
  return { ...actual, createInitialState: jest.fn(actual.createInitialState) };
});

class NoOpAI implements IAIPlayer {
  evaluateRetreat(): null {
    return null;
  }

  playMovementPhase(): null {
    return null;
  }

  playAttackPhase(): null {
    return null;
  }

  playPhysicalAttackPhase(): null {
    return null;
  }
}

describe('SimulationRunner terminal event parity boundaries', () => {
  it('returns terminal summary fields and appends a terminal GameEnded event', () => {
    const runner = new SimulationRunner(404);

    const result = runner.run({
      seed: 404,
      turnLimit: 1,
      unitCount: { player: 1, opponent: 0 },
      mapRadius: 3,
    });

    expect(result.winner).toBe('player');
    expect(result.matchTerminalState).toBe('player_victory');
    expect(result.events[0].type).toBe(GameEventType.GameCreated);
    const ended = result.events.find(
      (event) => event.type === GameEventType.GameEnded,
    );
    expect(ended?.sequence).toBe(result.events.length - 1);
    expect(ended?.payload as IGameEndedPayload).toMatchObject({
      winner: GameSide.Player,
      reason: 'destruction',
      turns: result.turns,
    });
    expect(
      RUNNER_INTERACTIVE_PARITY_SUPPORT['terminal-game-ended-event'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'SimulationRunner.run appends GameEnded',
      ),
    });
    expect(
      COMBAT_INTEGRATION_SCENARIO_SUPPORT['runner-terminal-game-ended-event'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'SimulationRunner.run appends terminal GameEnded',
      ),
    });
  });

  it('records a draw GameEnded event when the runner stops at the turn limit', () => {
    const runner = new SimulationRunner(
      405,
      undefined,
      undefined,
      () => new NoOpAI(),
    );

    const result = runner.run({
      seed: 405,
      turnLimit: 1,
      unitCount: { player: 1, opponent: 1 },
      mapRadius: 3,
    });

    const ended = result.events.find(
      (event) => event.type === GameEventType.GameEnded,
    );
    expect(ended?.payload as IGameEndedPayload).toMatchObject({
      winner: 'draw',
      reason: 'turn_limit',
      turns: 1,
    });
    expect(result.matchTerminalState).toBe('timeout');
  });

  it('keeps an empty-roster run a draw at its configured limit', () => {
    const result = new SimulationRunner(409).run({
      seed: 409,
      turnLimit: 1,
      unitCount: { player: 0, opponent: 0 },
      mapRadius: 3,
    });
    expect(result.winner).toBe('draw');
    expect(result.matchTerminalState).toBe('draw');
  });

  it.each([0, -1, MAX_TURNS + 5])(
    'bounds an unresolved configured limit of %i by the engine ceiling',
    (turnLimit) => {
      const result = new SimulationRunner(
        406,
        undefined,
        undefined,
        () => new NoOpAI(),
      ).run({
        seed: 406,
        turnLimit,
        unitCount: { player: 1, opponent: 1 },
        mapRadius: 3,
      });
      expect(result.turns).toBe(MAX_TURNS);
      expect(result.matchTerminalState).toBe('timeout');
      expect(result.haltedByCriticalAnomaly).toBe(false);
    },
  );

  it('reports a real critical state-cycle halt before the limit as a draw', () => {
    const result = new SimulationRunner(
      407,
      undefined,
      { haltOnCritical: true, stateCycleLength: 2 },
      () => new NoOpAI(),
    ).run({
      seed: 407,
      turnLimit: 30,
      unitCount: { player: 1, opponent: 1 },
      mapRadius: 3,
    });
    expect(result.turns).toBeLessThan(30);
    expect(result.haltedByCriticalAnomaly).toBe(true);
    expect(result.matchTerminalState).toBe('draw');
    expect(result.events.at(-1)?.payload).toMatchObject({ reason: 'aborted' });
  });

  it.each([
    [GameSide.Player, 1],
    [GameSide.Player, 3],
    [GameSide.Opponent, 1],
  ] as const)(
    'reports an objective victory for %s with both sides alive and limit %i',
    (side, turnLimit) => {
      const config = {
        seed: 408,
        turnLimit,
        unitCount: { player: 1, opponent: 1 },
        mapRadius: 3,
      };
      const initial = createInitialState(config);
      const unit = Object.values(initial.units).find(
        (entry) => entry.side === side,
      );
      if (!unit) throw new Error('Expected a unit on the objective side');
      const hexKey = `${unit.position.q},${unit.position.r}`;
      // Seed an objective at a unit's spawn; all objective evaluation and
      // runner phases remain real. Only scenario initialization is replaced.
      jest.mocked(createInitialState).mockReturnValueOnce({
        ...initial,
        objectives: {
          [hexKey]: {
            id: 'terminal-objective',
            hexKey,
            objectiveType: ScenarioObjectiveType.Defend,
            owningSide: 'neutral',
            controlSide: 'neutral',
            controlRule: 'sole-occupancy',
            holdTurnsRequired: 1,
            holdProgress: 0,
          },
        },
      });
      const result = new SimulationRunner(
        config.seed,
        undefined,
        undefined,
        () => new NoOpAI(),
      ).run(config);
      const winner = side === GameSide.Player ? 'player' : 'opponent';
      expect(result.winner).toBe(winner);
      expect(result.matchTerminalState).toBe(
        side === GameSide.Player ? 'player_victory' : 'opfor_victory',
      );
      expect(result.events.at(-1)?.payload).toMatchObject({
        winner: side,
        reason: 'objective',
        turns: result.turns,
      });
      expect(result.turns).toBeLessThanOrEqual(turnLimit);
    },
  );
});
