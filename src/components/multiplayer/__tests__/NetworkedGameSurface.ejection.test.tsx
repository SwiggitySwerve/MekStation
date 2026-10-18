import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { deriveTurnOwnership } from '@/lib/multiplayer/turnOwnership';
import {
  GamePhase,
  GameSide,
  GameStatus,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  createGameSession,
  canActInPhysicalAttack,
} from '@/utils/gameplay/gameSessionCore';
import { applyUnitEjected } from '@/utils/gameplay/gameState/unitExitState';

import { NetworkedActionBar } from '../NetworkedGameSurface.actionbar';

function ejectedSession(
  phase: GamePhase,
  teammate: Partial<IUnitGameState> = {},
): IGameSession {
  const session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'p1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'p2',
        name: 'Locust',
        side: GameSide.Player,
        unitRef: 'locust-lct-1v',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'o1',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'marauder-mad-3r',
        pilotRef: 'pilot-3',
        gunnery: 4,
        piloting: 5,
      },
    ],
  );
  return {
    ...session,
    currentState: applyUnitEjected(
      {
        ...session.currentState,
        status: GameStatus.Active,
        phase,
        firstMover: GameSide.Player,
        units: {
          ...session.currentState.units,
          p2: { ...session.currentState.units.p2, ...teammate },
        },
      },
      {
        unitId: 'p1',
        turn: session.currentState.turn,
        reason: 'player_declared',
      },
    ),
  };
}

describe('networked ejection eligibility', () => {
  it('gives ownership to the eligible opponent when the surviving teammate is shut down', () => {
    const session = ejectedSession(GamePhase.PhysicalAttack, {
      shutdown: true,
    });
    expect(canActInPhysicalAttack(session, 'o1')).toBe(true);
    expect(deriveTurnOwnership(session, GameSide.Opponent)).toMatchObject({
      activeSide: GameSide.Opponent,
      canAct: true,
    });
    expect(deriveTurnOwnership(session, GameSide.Player).canAct).toBe(false);
  });

  it.each([
    [GamePhase.Movement, 'declare-movement-button'],
    [GamePhase.WeaponAttack, 'declare-attack-button'],
    [GamePhase.PhysicalAttack, 'declare-physical-button'],
  ] as const)(
    'disables unit actions for a retained ejected selection in %s',
    (phase, actionButton) => {
      const session = ejectedSession(phase);
      const onSendIntent = jest.fn();
      const props = {
        session,
        ownership: deriveTurnOwnership(session, GameSide.Player),
        selectedUnitId: 'p1',
        selectedHex: { q: 1, r: 0 },
        targetUnitId: 'o1',
        paused: false,
        onSendIntent,
      };
      const view = render(<NetworkedActionBar {...props} />);
      expect(screen.getByTestId(actionButton)).toBeDisabled();
      expect(screen.getByTestId('eject-button')).toBeDisabled();
      fireEvent.click(screen.getByTestId(actionButton));
      expect(onSendIntent).not.toHaveBeenCalled();
      // Phase progression is independent of the inspected selection.
      expect(screen.getByTestId('advance-phase-button')).toBeEnabled();

      view.rerender(<NetworkedActionBar {...props} selectedUnitId="p2" />);
      expect(screen.getByTestId(actionButton)).toBeEnabled();
      fireEvent.click(screen.getByTestId(actionButton));
      expect(onSendIntent).toHaveBeenCalledTimes(1);
    },
  );
});
