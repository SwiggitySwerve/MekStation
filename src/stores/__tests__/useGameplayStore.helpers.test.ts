import { runAITurnLogic } from '@/stores/useGameplayStore.helpers';
import { InteractivePhase } from '@/stores/useGameplayStore.helpers';
import {
  GamePhase,
  GameSide,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

describe('runAITurnLogic', () => {
  it.each([
    ['single activation', 'opponent-1', 'runAITurn', false],
    ['movement AI', undefined, 'runAITurn', false],
    ['phase advance', undefined, 'advancePhase', false],
    ['terminal activation', 'opponent-1', 'runAITurn', true],
  ] as const)(
    'releases the UI and preserves the original error after a failed %s',
    (_name, unitId, failingMethod, gameOver) => {
      const failure = new Error('AI failed after updating its session');
      const snapshot = {
        currentState: { phase: GamePhase.Movement },
      } as IGameSession;
      const fakeSession = {
        getState: () => snapshot.currentState,
        getSession: () => snapshot,
        isGameOver: () => gameOver,
        runAITurn: jest.fn(),
        advancePhase: jest.fn(),
      };
      fakeSession[failingMethod].mockImplementation(() => {
        throw failure;
      });
      const set = jest.fn();
      let thrown: unknown;

      try {
        runAITurnLogic(fakeSession as never, set, unitId);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(failure);
      expect(set).toHaveBeenNthCalledWith(1, {
        interactivePhase: InteractivePhase.AITurn,
      });
      expect(set).toHaveBeenLastCalledWith({
        session: snapshot,
        interactivePhase: gameOver
          ? InteractivePhase.GameOver
          : InteractivePhase.SelectUnit,
      });
    },
  );

  it('marks a successful terminal single activation as game over', () => {
    const snapshot = {
      currentState: { phase: GamePhase.WeaponAttack },
    } as IGameSession;
    const fakeSession = {
      runAITurn: jest.fn(),
      getSession: () => snapshot,
      isGameOver: () => true,
    };
    const set = jest.fn();

    runAITurnLogic(fakeSession as never, set, 'opponent-1');

    expect(set).toHaveBeenLastCalledWith({
      session: snapshot,
      interactivePhase: InteractivePhase.GameOver,
    });
  });

  it('runs one opponent activation without advancing past the player turn', () => {
    const runAITurn = jest.fn();
    const advancePhase = jest.fn();
    const set = jest.fn();
    const fakeSession = {
      getState: () => ({ phase: GamePhase.Movement }),
      getSession: () =>
        ({
          currentState: { phase: GamePhase.Movement },
        }) as unknown as IGameSession,
      runAITurn,
      advancePhase,
      isGameOver: () => false,
    };

    runAITurnLogic(fakeSession as never, set as never, 'opponent-1');

    expect(runAITurn).toHaveBeenCalledWith(GameSide.Opponent, 'opponent-1');
    expect(advancePhase).not.toHaveBeenCalled();
    expect(set).toHaveBeenLastCalledWith({
      session: fakeSession.getSession(),
      interactivePhase: InteractivePhase.SelectUnit,
    });
  });

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
