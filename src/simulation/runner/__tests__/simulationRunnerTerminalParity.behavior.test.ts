import {
  GameEventType,
  GameSide,
  type IGameEndedPayload,
} from '@/types/gameplay';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from '../CombatIntegrationSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { SimulationRunner } from '../SimulationRunner';

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
  });
});
