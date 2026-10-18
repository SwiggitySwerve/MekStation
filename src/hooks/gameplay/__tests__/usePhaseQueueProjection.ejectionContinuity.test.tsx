import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';

import { NetworkedActionBar } from '@/components/multiplayer/NetworkedGameSurface.actionbar';
import { deriveTurnOwnership } from '@/lib/multiplayer/turnOwnership';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  LockState,
  type IGameSession,
} from '@/types/gameplay';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import {
  advancePhase,
  appendEvent,
  canActInPhysicalAttack,
  canAdvancePhase,
  createGameSession,
  lockAttack,
  lockMovement,
  lockPhysicalAttack,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import { usePhaseQueueProjection } from '../usePhaseQueueProjection';

function phaseSession(
  phase: GamePhase,
  firstMover: GameSide,
  secondForceSize = 2,
): IGameSession {
  let session = startGame(
    createGameSession(
      {
        mapRadius: 6,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      },
      [GameSide.Player, GameSide.Opponent].flatMap((side) =>
        [1, 2]
          .filter((number) => side === firstMover || number <= secondForceSize)
          .map((number) => ({
            id: `${side}-${number}`,
            side,
            name: `${side} ${number}`,
            unitRef: 'locust-lct-1v',
            pilotRef: `${side}-${number}-pilot`,
            gunnery: 4,
            piloting: 5,
          })),
      ),
    ),
    firstMover,
  );
  session = rollInitiative(session, firstMover, () => 3);
  while (session.currentState.phase !== phase) session = advancePhase(session);
  return session;
}

function lock(session: IGameSession, unitId: string): IGameSession {
  switch (session.currentState.phase) {
    case GamePhase.Movement:
      return lockMovement(session, unitId);
    case GamePhase.WeaponAttack:
      return lockAttack(session, unitId);
    default:
      return lockPhysicalAttack(session, unitId);
  }
}

function eject(session: IGameSession, unitId: string): IGameSession {
  return appendEvent(
    session,
    createUnitEjectedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      'player_declared',
    ),
  );
}

function assertActorAndControls(
  session: IGameSession,
  expectedId: string,
): void {
  act(() => useGameplayStore.setState({ session }));
  const { result } = renderHook(() => usePhaseQueueProjection());
  const side = session.currentState.units[expectedId].side;
  expect(result.current.activeUnitId).toBe(expectedId);
  expect(result.current.unresolvedUnits).toContain(expectedId);
  expect(canAdvancePhase(session)).toBe(false);
  const ownership = deriveTurnOwnership(session, side);
  expect(ownership.canAct).toBe(true);
  if (session.currentState.phase === GamePhase.PhysicalAttack) {
    expect(canActInPhysicalAttack(session, expectedId)).toBe(true);
  }
  const onSendIntent = jest.fn();
  render(
    <NetworkedActionBar
      session={session}
      ownership={ownership}
      selectedUnitId={expectedId}
      selectedHex={{ q: 1, r: 0 }}
      targetUnitId={`${side === GameSide.Player ? GameSide.Opponent : GameSide.Player}-1`}
      paused={false}
      onSendIntent={onSendIntent}
    />,
  );
  const actionButton =
    session.currentState.phase === GamePhase.Movement
      ? 'declare-movement-button'
      : session.currentState.phase === GamePhase.WeaponAttack
        ? 'declare-attack-button'
        : 'declare-physical-button';
  expect(screen.getByTestId(actionButton)).toBeEnabled();
  fireEvent.click(screen.getByTestId(actionButton));
  expect(onSendIntent).toHaveBeenCalledTimes(1);
}

describe.each([
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
])('temporal ejection in %s', (phase) => {
  afterEach(() => act(() => useGameplayStore.setState({ session: null })));

  it.each([
    [GameSide.Player, 1],
    [GameSide.Opponent, 1],
    [GameSide.Player, 2],
    [GameSide.Opponent, 2],
  ] as const)(
    'preserves the pending teammate after a completed actor ejects, first mover %s, opposing units %s',
    (firstMover, opposingCount) => {
      const other =
        firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
      let session = phaseSession(phase, firstMover, opposingCount);
      session = lock(session, `${firstMover}-1`);
      session = lock(session, `${other}-1`);
      expect(session.currentState.activationIndex).toBe(2);
      session = eject(session, `${firstMover}-1`);
      expect(session.currentState.activationIndex).toBe(2);
      expect(session.currentState.units[`${firstMover}-2`].lockState).toBe(
        LockState.Pending,
      );
      assertActorAndControls(session, `${firstMover}-2`);
      session = lock(session, `${firstMover}-2`);
      expect(session.currentState.units[`${firstMover}-2`].lockState).toBe(
        phase === GamePhase.WeaponAttack && opposingCount === 1
          ? LockState.Revealed
          : LockState.Locked,
      );
      const recovered = hydrateGameSessionFromEvents(
        session.id,
        session.events,
      );
      expect(deriveTurnOwnership(recovered, other).canAct).toBe(
        opposingCount > 1,
      );
    },
  );

  it.each([GameSide.Player, GameSide.Opponent])(
    'keeps the opponent next when the completed first actor ejects, first mover %s',
    (firstMover) => {
      const other =
        firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
      let session = lock(phaseSession(phase, firstMover), `${firstMover}-1`);
      session = eject(session, `${firstMover}-1`);
      assertActorAndControls(session, `${other}-1`);
    },
  );

  it.each([GameSide.Player, GameSide.Opponent])(
    'advances past an ejected current actor without reactivating completed units, first mover %s',
    (firstMover) => {
      const other =
        firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
      let session = lock(phaseSession(phase, firstMover), `${firstMover}-1`);
      session = lock(session, `${other}-1`);
      session = eject(session, `${firstMover}-2`);
      assertActorAndControls(session, `${other}-2`);
      session = lock(session, `${other}-2`);
      act(() => useGameplayStore.setState({ session }));
      const { result } = renderHook(() => usePhaseQueueProjection());
      expect(result.current.activeUnitId).toBeNull();
      expect(result.current.unresolvedUnits).toEqual([]);
      expect(deriveTurnOwnership(session, other).activeSide).toBeNull();
    },
  );

  it.each([GameSide.Player, GameSide.Opponent])(
    'keeps the current actor when a future actor ejects, first mover %s',
    (firstMover) => {
      const other =
        firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
      let session = lock(phaseSession(phase, firstMover), `${firstMover}-1`);
      session = eject(session, `${firstMover}-2`);
      assertActorAndControls(session, `${other}-1`);
    },
  );

  it.each([GameSide.Player, GameSide.Opponent])(
    'replaces an ejected initial actor before any activation, first mover %s',
    (firstMover) => {
      const session = eject(phaseSession(phase, firstMover), `${firstMover}-1`);
      assertActorAndControls(session, `${firstMover}-2`);
    },
  );

  it.each([GameSide.Player, GameSide.Opponent])(
    'does not carry consumed slots into the next phase, first mover %s',
    (firstMover) => {
      const other =
        firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
      let session = lock(phaseSession(phase, firstMover), `${firstMover}-1`);
      session = lock(session, `${other}-1`);
      session = advancePhase(eject(session, `${firstMover}-1`));
      if (phase === GamePhase.PhysicalAttack) {
        act(() => useGameplayStore.setState({ session }));
        const { result } = renderHook(() => usePhaseQueueProjection());
        expect(result.current.activeUnitId).toBeNull();
        expect(deriveTurnOwnership(session, firstMover).activeSide).toBeNull();
      } else {
        assertActorAndControls(session, `${firstMover}-2`);
      }
    },
  );
});
