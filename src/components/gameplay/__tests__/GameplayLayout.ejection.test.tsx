import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { GamePhase } from '@/types/gameplay';
import { applyUnitEjected } from '@/utils/gameplay/gameState/unitExitState';

import {
  GameplayLayout,
  createDemoSession,
  createInteractiveSessionStub,
} from './addInteractiveCombatCoreUI.smoke.test-helpers';

describe('local ejection action offerings', () => {
  it.each([GamePhase.Movement, GamePhase.WeaponAttack])(
    'does not offer a composer or withdrawal for an ejected selection in %s',
    (phase) => {
      const base = createDemoSession();
      const session = {
        ...base,
        currentState: applyUnitEjected(
          { ...base.currentState, phase },
          {
            unitId: 'unit-player-1',
            turn: base.currentState.turn,
            reason: 'player_declared',
          },
        ),
      };
      render(
        <GameplayLayout
          session={session}
          selectedUnitId="unit-player-1"
          onUnitSelect={jest.fn()}
          onAction={jest.fn()}
          isPlayerTurn={true}
          interactiveSession={createInteractiveSessionStub(session)}
          intentComposer={{
            composerActive: phase === GamePhase.Movement,
            composedLegs: [],
            lastWaypointHex: null,
            onPopLastWaypoint: jest.fn(),
            onFacingSelect: jest.fn(),
          }}
        />,
      );
      expect(screen.queryByTestId('movement-intent-composer')).toBeNull();
      expect(screen.queryByTestId('attack-intent-composer')).toBeNull();
      expect(screen.queryByTestId('withdraw-control')).toBeNull();
    },
  );
});
