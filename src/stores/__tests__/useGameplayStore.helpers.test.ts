import { runAITurnLogic } from '@/stores/useGameplayStore.helpers';
import { InteractivePhase } from '@/stores/useGameplayStore.helpers';
import {
  GamePhase,
  GameSide,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

describe('runAITurnLogic', () => {
  it('runs and advances the PhysicalAttack phase instead of leaving the loop stuck', () => {
    let phase = GamePhase.PhysicalAttack;
    const runAITurn = jest.fn();
    const advancePhase = jest.fn(() => {
      if (phase === GamePhase.PhysicalAttack) {
        phase = GamePhase.Heat;
        return;
      }
      if (phase === GamePhase.Heat) {
        phase = GamePhase.End;
        return;
      }
      if (phase === GamePhase.End) {
        phase = GamePhase.Initiative;
      }
    });
    const set = jest.fn();
    const fakeSession = {
      getState: () => ({ phase }),
      getSession: () =>
        ({
          currentState: { phase },
        }) as unknown as IGameSession,
      runAITurn,
      advancePhase,
      isGameOver: () => false,
    };

    runAITurnLogic(fakeSession as never, set);

    expect(runAITurn).toHaveBeenCalledWith(GameSide.Opponent);
    expect(advancePhase).toHaveBeenCalledTimes(3);
    expect(set).toHaveBeenLastCalledWith({
      session: fakeSession.getSession(),
      interactivePhase: InteractivePhase.SelectUnit,
    });
    expect(fakeSession.getState().phase).toBe(GamePhase.Initiative);
  });

  it('marks game over when the PhysicalAttack tick reaches a terminal state', () => {
    let phase = GamePhase.PhysicalAttack;
    let gameOver = false;
    const runAITurn = jest.fn();
    const advancePhase = jest.fn(() => {
      if (phase === GamePhase.PhysicalAttack) {
        phase = GamePhase.Heat;
        gameOver = true;
        return;
      }
      if (phase === GamePhase.Heat) {
        phase = GamePhase.End;
        return;
      }
      if (phase === GamePhase.End) {
        phase = GamePhase.Initiative;
      }
    });
    const set = jest.fn();
    const fakeSession = {
      getState: () => ({ phase }),
      getSession: () =>
        ({
          currentState: { phase },
        }) as unknown as IGameSession,
      runAITurn,
      advancePhase,
      isGameOver: () => gameOver,
    };

    runAITurnLogic(fakeSession as never, set);

    expect(set).toHaveBeenLastCalledWith({
      session: fakeSession.getSession(),
      interactivePhase: InteractivePhase.GameOver,
    });
  });
});
