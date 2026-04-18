/**
 * Per-change smoke test for `feat/add-victory-flow-ui`.
 *
 * Asserts that the orphan engine helpers from PR #314
 * (`InteractiveSession.concede`, `derivePostBattleReport`,
 * `victoryReasonLabel`, MVP pick) are now wired into a real user
 * flow:
 *
 *   1. ConcedeButton opens a confirm modal and calls
 *      `interactiveSession.concede(playerSide)` exactly once.
 *   2. VictoryScreen renders "VICTORY" when the player won and
 *      "DEFEAT" when the opponent won, plus the MVP card.
 *   3. EventLogDisplay routes DamageApplied through the canonical
 *      `formatDamageEntry` formatter (✓ glyph + standardized text).
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 1, § 4, § 7, § 8
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { InteractiveSession } from '@/engine/InteractiveSession';

import { ConcedeButton } from '@/components/gameplay/ConcedeButton';
import { EventLogDisplay } from '@/components/gameplay/EventLogDisplay';
import { VictoryScreen } from '@/pages/gameplay/games/[id]/victory';
import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IDamageAppliedPayload,
  type IGameEndedPayload,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';

// next/router is only used by ConcedeButton's default-navigation
// fallback; we always pass `onNavigate` in tests, so the router
// stub here exists only to satisfy module import.
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Build a minimal `InteractiveSession`-shaped object exposing the
 * three methods ConcedeButton consumes. Avoids spinning up the real
 * GameEngine which pulls in the entire weapon/unit catalog and adds
 * seconds to the smoke test.
 */
function buildFakeInteractiveSession(): {
  session: InteractiveSession;
  concedeMock: jest.Mock;
  setEnded: () => void;
} {
  const events: IGameEvent[] = [];
  let ended = false;
  const concedeMock = jest.fn(() => {
    ended = true;
  });

  const fakeSession: Pick<
    InteractiveSession,
    'concede' | 'isGameOver' | 'getSession'
  > = {
    concede: concedeMock as unknown as InteractiveSession['concede'],
    isGameOver: () => ended,
    getSession: () =>
      ({
        id: 'test-session',
        events,
        currentState: {} as IGameSession['currentState'],
      }) as unknown as IGameSession,
  };

  return {
    session: fakeSession as unknown as InteractiveSession,
    concedeMock,
    setEnded: () => {
      ended = true;
    },
  };
}

/**
 * Build a synthetic completed session for the VictoryScreen test.
 * Includes an AttackResolved + DamageApplied chain so MVP picking
 * has a non-zero damageDealt to anchor on.
 */
function buildCompletedSession(opts: {
  winner: GameSide | 'draw';
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective';
}): IGameSession {
  const baseEvent: Omit<IGameEvent, 'id' | 'sequence' | 'type' | 'payload'> = {
    gameId: 'test-session',
    timestamp: '2026-04-17T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.WeaponAttack,
  };

  const events: IGameEvent[] = [
    {
      ...baseEvent,
      id: 'evt-attack',
      sequence: 0,
      type: GameEventType.AttackResolved,
      actorId: 'unit-player-1',
      payload: {
        attackerId: 'unit-player-1',
        targetId: 'unit-opponent-1',
        weaponId: 'ml-1',
        roll: 10,
        toHitNumber: 4,
        hit: true,
        location: 'center_torso',
        damage: 12,
      },
    },
    {
      ...baseEvent,
      id: 'evt-damage',
      sequence: 1,
      type: GameEventType.DamageApplied,
      actorId: 'unit-opponent-1',
      payload: {
        unitId: 'unit-opponent-1',
        location: 'center_torso',
        damage: 12,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      } as IDamageAppliedPayload,
    },
    {
      ...baseEvent,
      id: 'evt-ended',
      sequence: 2,
      type: GameEventType.GameEnded,
      payload: {
        winner: opts.winner,
        reason: opts.reason,
      } as IGameEndedPayload,
    },
  ];

  return {
    id: 'test-session',
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    config: {
      mapRadius: 10,
      turnLimit: 10,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units: [
      {
        id: 'unit-player-1',
        name: 'Hunchback HBK-4G',
        side: GameSide.Player,
        unitRef: 'hbk-4g',
        pilotRef: 'p1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'unit-opponent-1',
        name: 'Marauder MAD-3R',
        side: GameSide.Opponent,
        unitRef: 'mad-3r',
        pilotRef: 'p2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events,
    currentState: {
      phase: GamePhase.End,
      turn: 1,
      status: GameStatus.Completed,
      firstMover: GameSide.Player,
      units: {
        'unit-player-1': {
          id: 'unit-player-1',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: 'none',
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
        },
        'unit-opponent-1': {
          id: 'unit-opponent-1',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: 'none',
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: ['center_torso'],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: true,
          lockState: 'unlocked',
        },
      },
    } as unknown as IGameSession['currentState'],
  } as IGameSession;
}

// =============================================================================
// Tests
// =============================================================================

describe('add-victory-flow-ui — smoke test', () => {
  describe('ConcedeButton', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('renders the Concede button enabled when game is active', () => {
      const { session } = buildFakeInteractiveSession();
      render(
        <ConcedeButton
          interactiveSession={session}
          sessionId="test-session"
          playerSide={GameSide.Player}
          onNavigate={jest.fn()}
        />,
      );
      const btn = screen.getByTestId('concede-button');
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('opens confirm modal on click and shows the warning copy', () => {
      const { session } = buildFakeInteractiveSession();
      render(
        <ConcedeButton
          interactiveSession={session}
          sessionId="test-session"
          playerSide={GameSide.Player}
          onNavigate={jest.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('concede-button'));
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(
        within(modal).getByTestId('concede-confirm-text'),
      ).toHaveTextContent(
        /Concede match\? Your forces will withdraw\. This cannot be undone\./,
      );
    });

    it('calls concede(playerSide) exactly once on confirm + navigates to victory', () => {
      const { session, concedeMock } = buildFakeInteractiveSession();
      const onNavigate = jest.fn();
      render(
        <ConcedeButton
          interactiveSession={session}
          sessionId="abc-123"
          playerSide={GameSide.Player}
          onNavigate={onNavigate}
        />,
      );

      fireEvent.click(screen.getByTestId('concede-button'));
      fireEvent.click(screen.getByTestId('concede-confirm'));

      expect(concedeMock).toHaveBeenCalledTimes(1);
      expect(concedeMock).toHaveBeenCalledWith(GameSide.Player);
      expect(onNavigate).toHaveBeenCalledWith(
        '/gameplay/games/abc-123/victory',
      );
    });

    it('disables the button when the game is already over (no double concede)', () => {
      const { session, concedeMock, setEnded } = buildFakeInteractiveSession();
      setEnded();
      render(
        <ConcedeButton
          interactiveSession={session}
          sessionId="test-session"
          playerSide={GameSide.Player}
          onNavigate={jest.fn()}
        />,
      );

      const btn = screen.getByTestId('concede-button');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(concedeMock).not.toHaveBeenCalled();
    });
  });

  describe('VictoryScreen', () => {
    it('renders VICTORY when the player won', () => {
      const session = buildCompletedSession({
        winner: GameSide.Player,
        reason: 'destruction',
      });
      render(<VictoryScreen session={session} playerSide={GameSide.Player} />);

      const outcome = screen.getByTestId('victory-outcome');
      expect(outcome).toHaveTextContent('VICTORY');
      expect(outcome).toHaveAttribute('data-outcome', 'victory');
      expect(screen.getByTestId('victory-reason')).toHaveTextContent(
        /Last side standing/,
      );
    });

    it('renders DEFEAT when the opponent won + uses loser perspective for concede label', () => {
      const session = buildCompletedSession({
        winner: GameSide.Opponent,
        reason: 'concede',
      });
      render(<VictoryScreen session={session} playerSide={GameSide.Player} />);

      const outcome = screen.getByTestId('victory-outcome');
      expect(outcome).toHaveTextContent('DEFEAT');
      expect(outcome).toHaveAttribute('data-outcome', 'defeat');
      // Loser perspective produces "You conceded".
      expect(screen.getByTestId('victory-reason')).toHaveTextContent(
        /You conceded/,
      );
    });

    it('renders the MVP card with the player-side unit when player won', () => {
      const session = buildCompletedSession({
        winner: GameSide.Player,
        reason: 'destruction',
      });
      render(<VictoryScreen session={session} playerSide={GameSide.Player} />);

      const mvp = screen.getByTestId('mvp-display');
      expect(mvp).toBeInTheDocument();
      // Per derivePostBattleReport: attacker (unit-player-1) dealt 12
      // damage and so is the only MVP candidate.
      expect(screen.getByTestId('mvp-unit-name')).toHaveTextContent(
        'Hunchback HBK-4G',
      );
      expect(screen.getByTestId('mvp-damage-dealt')).toHaveTextContent('12');
    });

    it('renders DRAW when winner is "draw"', () => {
      const session = buildCompletedSession({
        winner: 'draw',
        reason: 'turn_limit',
      });
      render(<VictoryScreen session={session} playerSide={GameSide.Player} />);
      expect(screen.getByTestId('victory-outcome')).toHaveTextContent('DRAW');
    });
  });

  describe('EventLogDisplay damage-feedback wiring', () => {
    it('renders DamageApplied via formatDamageEntry (includes ✓ glyph)', () => {
      const damageEvent: IGameEvent = {
        id: 'd-1',
        gameId: 'g',
        sequence: 0,
        timestamp: '2026-04-17T00:00:00.000Z',
        type: GameEventType.DamageApplied,
        turn: 1,
        phase: GamePhase.WeaponAttack,
        actorId: 'mad',
        payload: {
          unitId: 'mad',
          location: 'center_torso',
          damage: 5,
          armorRemaining: 15,
          structureRemaining: 16,
          locationDestroyed: false,
        } as IDamageAppliedPayload,
      };

      render(<EventLogDisplay events={[damageEvent]} />);
      const row = screen.getByTestId('event-row');
      const text = within(row).getByTestId('event-text');
      // Canonical formatter output: glyph + canonical wording.
      expect(text.textContent).toContain('✓');
      expect(text.textContent).toContain('5 damage');
      expect(text.textContent).toContain('Center Torso');
    });
  });
});
