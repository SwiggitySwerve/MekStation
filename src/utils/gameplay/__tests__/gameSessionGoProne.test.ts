import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IMovementDeclaredPayload,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  advancePhase,
  createGameSession,
  goProne,
  rollInitiative,
  startGame,
} from '../gameSession';

function makeConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 30,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-a',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-b',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeMovementSession(): IGameSession {
  let session = createGameSession(makeConfig(), makeUnits());
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 6);
  session = advancePhase(session);
  return {
    ...session,
    currentState: {
      ...session.currentState,
      phase: GamePhase.Movement,
      units: {
        ...session.currentState.units,
        'player-1': {
          ...session.currentState.units['player-1'],
          facing: Facing.North,
          lockState: LockState.Pending,
        },
      },
    },
  };
}

describe('goProne', () => {
  it('emits a same-hex goProne movement step and locks the unit', () => {
    const session = makeMovementSession();
    const start = session.currentState.units['player-1'].position;

    const next = goProne(session, 'player-1');

    const movement = next.events.find(
      (entry) => entry.type === GameEventType.MovementDeclared,
    );
    expect(movement?.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'player-1',
      from: start,
      to: start,
      facing: Facing.North,
      movementType: MovementType.Stationary,
      mpUsed: 1,
      heatGenerated: 0,
      hexesMoved: 0,
      straightHexes: 0,
      turningMpCost: 1,
      netDisplacement: 0,
      steps: [{ kind: 'goProne', index: 0, at: start, mpCost: 1 }],
    });
    expect(
      next.events.some((entry) => entry.type === GameEventType.MovementLocked),
    ).toBe(true);
    expect(next.currentState.units['player-1'].prone).toBe(true);
    expect(next.currentState.units['player-1'].hexesMovedThisTurn).toBe(0);
    expect(next.currentState.units['player-1'].heat).toBe(0);
    expect(next.currentState.units['player-1'].lockState).toBe(
      LockState.Locked,
    );
  });

  it('does not emit a duplicate action for an already-prone unit', () => {
    const base = makeMovementSession();
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-1': {
            ...base.currentState.units['player-1'],
            prone: true,
          },
        },
      },
    };

    expect(goProne(session, 'player-1')).toBe(session);
  });

  it('does not emit a goProne action for a stuck unit', () => {
    const base = makeMovementSession();
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-1': {
            ...base.currentState.units['player-1'],
            isStuck: true,
          },
        },
      },
    };

    expect(goProne(session, 'player-1')).toBe(session);
  });

  it('converts hull-down posture to prone at zero MP', () => {
    const base = makeMovementSession();
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-1': {
            ...base.currentState.units['player-1'],
            hullDown: true,
          },
        },
      },
    };

    const next = goProne(session, 'player-1');
    const movement = next.events.find(
      (entry) => entry.type === GameEventType.MovementDeclared,
    );
    const payload = movement?.payload as IMovementDeclaredPayload;

    expect(payload.mpUsed).toBe(0);
    expect(payload.turningMpCost).toBe(0);
    expect(payload.steps).toEqual([
      { kind: 'goProne', index: 0, at: payload.from, mpCost: 0 },
    ]);
    expect(next.currentState.units['player-1'].prone).toBe(true);
    expect(next.currentState.units['player-1'].hullDown).toBe(false);
  });

  it('rejects explicit non-Mek go-prone units', () => {
    const base = makeMovementSession();
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'player-1': {
            ...base.currentState.units['player-1'],
            unitType: UnitType.VEHICLE,
          },
        },
      },
    };

    expect(goProne(session, 'player-1')).toBe(session);
  });
});
