import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';

import {
  advancePhase,
  createGameSession,
  requestSpot,
  rollInitiative,
  startGame,
} from '../gameSession';

function units(): readonly IGameUnit[] {
  return [
    {
      id: 'player-a',
      name: 'Spotter',
      side: GameSide.Player,
      unitRef: 'spotter',
      pilotRef: 'pilot-a',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'player-b',
      name: 'Friendly',
      side: GameSide.Player,
      unitRef: 'friendly',
      pilotRef: 'pilot-b',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-a',
      name: 'Target',
      side: GameSide.Opponent,
      unitRef: 'target',
      pilotRef: 'pilot-c',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSession(): IGameSession {
  return startGame(
    createGameSession(
      {
        mapRadius: 5,
        turnLimit: 30,
        victoryConditions: [],
        optionalRules: [],
      },
      units(),
      {
        id: 'spot-session',
        createdAt: '2026-05-31T00:00:00.000Z',
      },
    ),
    GameSide.Player,
  );
}

function weaponAttackSession(
  overrides: Partial<IGameSession['currentState']['units'][string]> = {},
): IGameSession {
  let session = makeSession();
  session = rollInitiative(session, GameSide.Player, () => 6);
  session = advancePhase(session);
  session = advancePhase(session);
  return {
    ...session,
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.WeaponAttack,
      units: {
        ...session.currentState.units,
        'player-a': {
          ...session.currentState.units['player-a'],
          position: { q: 0, r: 0 },
          facing: Facing.North,
          movementThisTurn: MovementType.Stationary,
          lockState: LockState.Pending,
          ...overrides,
        },
        'opponent-a': {
          ...session.currentState.units['opponent-a'],
          position: { q: 1, r: 0 },
          facing: Facing.South,
          lockState: LockState.Pending,
        },
      },
    },
  };
}

describe('requestSpot', () => {
  it('declares target spotting, latches state, and locks the spotter', () => {
    const session = weaponAttackSession();

    const updated = requestSpot(session, 'player-a', 'opponent-a');

    const event = updated.events.at(-1);
    expect(event).toMatchObject({
      type: GameEventType.SpottingDeclared,
      phase: GamePhase.WeaponAttack,
      payload: {
        unitId: 'player-a',
        targetId: 'opponent-a',
        turn: updated.currentState.turn,
      },
    });
    expect(updated.currentState.units['player-a']).toMatchObject({
      isSpotting: true,
      spotTargetId: 'opponent-a',
      lockState: LockState.Locked,
    });
  });

  it('preserves spotting through physical attack and clears it on next movement phase', () => {
    let session = requestSpot(weaponAttackSession(), 'player-a', 'opponent-a');

    session = advancePhase(session);
    expect(session.currentState.phase).toBe(GamePhase.PhysicalAttack);
    expect(session.currentState.units['player-a'].isSpotting).toBe(true);

    session = advancePhase(session);
    session = advancePhase(session);
    session = advancePhase(session);
    session = advancePhase(session);

    expect(session.currentState.phase).toBe(GamePhase.Movement);
    expect(session.currentState.units['player-a'].isSpotting).toBe(false);
    expect(session.currentState.units['player-a'].spotTargetId).toBeUndefined();
  });

  it.each([
    ['sprinting', { sprintedThisTurn: true }],
    ['evading', { isEvading: true }],
    ['shutdown', { shutdown: true }],
    ['unconscious', { pilotConscious: false }],
  ] as const)('rejects a %s unit as a spotter', (_label, overrides) => {
    expect(() =>
      requestSpot(weaponAttackSession(overrides), 'player-a', 'opponent-a'),
    ).toThrow(/cannot spot|not active/);
  });

  it('rejects friendly and terminal targets', () => {
    expect(() =>
      requestSpot(weaponAttackSession(), 'player-a', 'player-b'),
    ).toThrow('Cannot spot a friendly target');

    const terminalTarget = weaponAttackSession();
    const destroyedTarget: IGameSession = {
      ...terminalTarget,
      currentState: {
        ...terminalTarget.currentState,
        units: {
          ...terminalTarget.currentState.units,
          'opponent-a': {
            ...terminalTarget.currentState.units['opponent-a'],
            destroyed: true,
          },
        },
      },
    };

    expect(() =>
      requestSpot(destroyedTarget, 'player-a', 'opponent-a'),
    ).toThrow('not targetable');
  });
});
