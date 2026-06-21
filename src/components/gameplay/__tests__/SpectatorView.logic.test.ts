import { runOneSpectatorTurn } from '@/components/gameplay/SpectatorView.logic';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GamePhase, GameSide } from '@/types/gameplay/GameSessionInterfaces';

describe('runOneSpectatorTurn', () => {
  it('runs both sides and advances when the engine is in PhysicalAttack', () => {
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
    const session = {
      id: 'spectator-session',
      currentState: { phase },
    };
    const fakeSession = {
      isGameOver: () => false,
      getState: () => ({ phase }),
      getSession: () => ({
        ...session,
        currentState: { phase },
      }),
      runAITurn,
      advancePhase,
    };
    const onGameOver = jest.fn();

    const continuePlaying = runOneSpectatorTurn(
      fakeSession as never,
      onGameOver,
    );

    expect(continuePlaying).toBe(true);
    expect(runAITurn).toHaveBeenNthCalledWith(1, GameSide.Player);
    expect(runAITurn).toHaveBeenNthCalledWith(2, GameSide.Opponent);
    expect(advancePhase).toHaveBeenCalledTimes(3);
    expect(onGameOver).not.toHaveBeenCalled();
    expect(useGameplayStore.getState().session?.currentState.phase).toBe(
      GamePhase.Initiative,
    );
  });

  it('stops the loop when PhysicalAttack progression reaches game over', () => {
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
    const fakeSession = {
      isGameOver: () => gameOver,
      getState: () => ({ phase }),
      getSession: () => ({
        id: 'spectator-session',
        currentState: { phase },
      }),
      runAITurn,
      advancePhase,
    };
    const onGameOver = jest.fn();

    const continuePlaying = runOneSpectatorTurn(
      fakeSession as never,
      onGameOver,
    );

    expect(continuePlaying).toBe(false);
    expect(onGameOver).toHaveBeenCalledTimes(1);
  });
});
