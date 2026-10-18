import {
  GamePhase,
  GameSide,
  LockState,
  RangeBracket,
  type IGameSession,
} from '@/types/gameplay';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';

import {
  getActivePhaseUnitId,
  getPhaseActivationOrder,
} from '../gameSessionActivation';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  declareAttack,
  lockAttack,
  lockMovement,
  lockPhysicalAttack,
  rollInitiative,
  startGame,
} from '../gameSessionCore';

function phaseSession(
  phase: GamePhase,
  firstMover = GameSide.Player,
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
        [1, 2].map((number) => ({
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

describe('phase activation history and unfinished declarations', () => {
  it.each(['missing', 'undefined'])(
    'accepts a snapshot with %s event history',
    (history) => {
      const session = phaseSession(GamePhase.Movement);
      if (history === 'missing') Reflect.deleteProperty(session, 'events');
      else Reflect.set(session, 'events', undefined);
      expect(getPhaseActivationOrder(session)).toEqual([
        'player-1',
        'opponent-1',
        'player-2',
        'opponent-2',
      ]);
      expect(getActivePhaseUnitId(session)).toBe('player-1');
    },
  );

  it.each([
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
  ])('keeps a Planning actor unfinished in %s', (phase) => {
    const base = phaseSession(phase);
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-1': {
            ...base.currentState.units['player-1'],
            lockState: LockState.Planning,
          },
        },
      },
    };
    expect(getActivePhaseUnitId(session)).toBe('player-1');
  });

  it('keeps the attacker active after declaration until its attacks are locked', () => {
    const base = phaseSession(GamePhase.WeaponAttack);
    const declared = declareAttack(
      base,
      'player-1',
      'opponent-1',
      [],
      1,
      RangeBracket.Short,
    );
    expect(declared.currentState.units['player-1'].lockState).toBe(
      LockState.Planning,
    );
    expect(declared.currentState.activationIndex).toBe(0);
    expect(getActivePhaseUnitId(declared)).toBe('player-1');
    expect(getActivePhaseUnitId(lockAttack(declared, 'player-1'))).toBe(
      'opponent-1',
    );
  });

  describe.each([
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
  ])('next-turn history in %s', (phase) => {
    it.each([GameSide.Player, GameSide.Opponent])(
      'drops phantom slots for an actor that locked and ejected last turn, first mover %s',
      (firstMover) => {
        let session = phaseSession(phase, firstMover);
        const previousTurn = session.currentState.turn;
        const actor = `${firstMover}-1`;
        session =
          phase === GamePhase.Movement
            ? lockMovement(session, actor)
            : phase === GamePhase.WeaponAttack
              ? lockAttack(session, actor)
              : lockPhysicalAttack(session, actor);
        session = appendEvent(
          session,
          createUnitEjectedEvent(
            session.id,
            session.events.length,
            previousTurn,
            phase,
            actor,
            'player_declared',
          ),
        );
        while (session.currentState.turn === previousTurn)
          session = advancePhase(session);
        session = rollInitiative(session, firstMover, () => 3);
        while (session.currentState.phase !== phase)
          session = advancePhase(session);
        expect(session.currentState.turn).toBe(previousTurn + 1);
        expect(session.currentState.units[actor].hasEjected).toBe(true);
        expect(getActivePhaseUnitId(session)).toBe(`${firstMover}-2`);
        expect(getPhaseActivationOrder(session)).not.toContain(actor);
      },
    );
  });
});
