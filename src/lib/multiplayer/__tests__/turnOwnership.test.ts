/**
 * turnOwnership unit tests.
 *
 * Per `complete-multiplayer-game-surface` task 4.3: controls are
 * disabled during the opponent's phase and enabled during the local
 * side's phase.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import {
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type IGameSession,
  type IGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  activeSideFromSession,
  deriveTurnOwnership,
  localSideFromSeats,
} from '../turnOwnership';

// =============================================================================
// Fixtures
// =============================================================================

function makeSeat(
  slotId: string,
  side: string,
  playerId: string | null,
): IMatchSeat {
  return {
    slotId,
    side,
    seatNumber: 1,
    occupant: playerId ? { playerId, displayName: playerId } : null,
    kind: 'human',
    ready: true,
  };
}

function makeSession(state: Partial<IGameState>): IGameSession {
  const base: IGameState = {
    gameId: 'g',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    firstMover: GameSide.Player,
    units: {
      p1: createMinimalUnitState('p1', GameSide.Player, { q: 0, r: 0 }),
      o1: createMinimalUnitState('o1', GameSide.Opponent, { q: 1, r: 0 }),
    },
    turnEvents: [],
  };
  return {
    id: 'g',
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
    config: {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units: [
      {
        id: 'p1',
        name: 'Player',
        unitRef: 'p1',
        side: GameSide.Player,
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'o1',
        name: 'Opponent',
        unitRef: 'o1',
        side: GameSide.Opponent,
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: { ...base, ...state },
  };
}

// =============================================================================
// localSideFromSeats
// =============================================================================

describe('localSideFromSeats', () => {
  const seats = [
    makeSeat('alpha-1', 'Alpha', 'pid_host'),
    makeSeat('bravo-1', 'Bravo', 'pid_guest'),
  ];

  it('maps the first side (Alpha) to GameSide.Player', () => {
    expect(localSideFromSeats(seats, 'pid_host')).toBe(GameSide.Player);
  });

  it('maps the second side (Bravo) to GameSide.Opponent', () => {
    expect(localSideFromSeats(seats, 'pid_guest')).toBe(GameSide.Opponent);
  });

  it('returns null when the player occupies no seat', () => {
    expect(localSideFromSeats(seats, 'pid_stranger')).toBeNull();
    expect(localSideFromSeats(seats, null)).toBeNull();
  });
});

// =============================================================================
// activeSideFromSession
// =============================================================================

describe('activeSideFromSession', () => {
  it("returns the first eligible actor's side at cursor zero", () => {
    const session = makeSession({
      firstMover: GameSide.Opponent,
      activationIndex: 0,
    });
    expect(activeSideFromSession(session)).toBe(GameSide.Opponent);
  });

  it("returns the next eligible actor's side at cursor one", () => {
    const base = makeSession({
      firstMover: GameSide.Opponent,
      activationIndex: 1,
    });
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          o1: { ...base.currentState.units.o1, lockState: LockState.Locked },
        },
      },
    };
    expect(activeSideFromSession(session)).toBe(GameSide.Player);
  });

  it('returns null in a server-only phase (Initiative)', () => {
    const session = makeSession({ phase: GamePhase.Initiative });
    expect(activeSideFromSession(session)).toBeNull();
  });

  it('returns null when the match is not active', () => {
    const session = makeSession({ status: GameStatus.Completed });
    expect(activeSideFromSession(session)).toBeNull();
  });

  it('returns null for a null session', () => {
    expect(activeSideFromSession(null)).toBeNull();
  });

  it('returns null when no eligible actors remain', () => {
    expect(activeSideFromSession(makeSession({ units: {} }))).toBeNull();
  });

  it('returns null when the eligible activation queue is exhausted', () => {
    const base = makeSession({ activationIndex: 2 });
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: Object.fromEntries(
          Object.entries(base.currentState.units).map(([id, unit]) => [
            id,
            { ...unit, lockState: LockState.Locked },
          ]),
        ),
      },
    };
    expect(activeSideFromSession(session)).toBeNull();
  });
});

// =============================================================================
// deriveTurnOwnership — task 4.3
// =============================================================================

describe('deriveTurnOwnership', () => {
  it('enables controls during the local side movement phase', () => {
    const session = makeSession({
      phase: GamePhase.Movement,
      firstMover: GameSide.Player,
      activationIndex: 0,
    });
    const ownership = deriveTurnOwnership(session, GameSide.Player);
    expect(ownership.canAct).toBe(true);
    expect(ownership.waitingForOpponent).toBe(false);
  });

  it('disables controls during the opponent phase and flags waiting', () => {
    const session = makeSession({
      phase: GamePhase.Movement,
      firstMover: GameSide.Opponent,
      activationIndex: 0,
    });
    const ownership = deriveTurnOwnership(session, GameSide.Player);
    expect(ownership.canAct).toBe(false);
    expect(ownership.waitingForOpponent).toBe(true);
    expect(ownership.activeSide).toBe(GameSide.Opponent);
  });

  it('disables controls in a server-only phase even for the active side', () => {
    const session = makeSession({ phase: GamePhase.Heat });
    const ownership = deriveTurnOwnership(session, GameSide.Player);
    expect(ownership.canAct).toBe(false);
    expect(ownership.waitingForOpponent).toBe(true);
  });

  it('a seatless player can never act', () => {
    const session = makeSession({ phase: GamePhase.Movement });
    const ownership = deriveTurnOwnership(session, null);
    expect(ownership.canAct).toBe(false);
  });

  it('a null session yields no active side and no waiting state', () => {
    const ownership = deriveTurnOwnership(null, GameSide.Player);
    expect(ownership.canAct).toBe(false);
    expect(ownership.waitingForOpponent).toBe(false);
  });
});
