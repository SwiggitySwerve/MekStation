import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  type IFacingChangedPayload,
  type IGameEvent,
  type IGameState,
  type IMovementDeclaredPayload,
} from '@/types/gameplay';

import { applyEvent, createInitialGameState } from '../index';

function createEvent(
  type: GameEventType,
  payload: IGameEvent['payload'],
): IGameEvent {
  return {
    id: `${type}-1`,
    gameId: 'torso-twist-state-test',
    sequence: 1,
    timestamp: '2026-05-25T00:00:00.000Z',
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    actorId: 'player-1',
    payload,
  };
}

function createState(): IGameState {
  const unit = createMinimalUnitState('player-1', GameSide.Player, {
    q: 0,
    r: 0,
  });

  return {
    ...createInitialGameState('torso-twist-state-test'),
    phase: GamePhase.WeaponAttack,
    units: {
      'player-1': {
        ...unit,
        facing: Facing.North,
        secondaryFacing: Facing.North,
      },
    },
  };
}

describe('event-sourced torso twist state', () => {
  it('persists secondary facing from FacingChanged without rotating chassis facing', () => {
    const payload: IFacingChangedPayload = {
      unitId: 'player-1',
      secondaryFacing: Facing.Northeast,
    };

    const next = applyEvent(
      createState(),
      createEvent(GameEventType.FacingChanged, payload),
    );

    expect(next.units['player-1']).toMatchObject({
      facing: Facing.North,
      secondaryFacing: Facing.Northeast,
    });
  });

  it('realigns secondary facing when a movement declaration changes chassis facing', () => {
    const twisted = applyEvent(
      createState(),
      createEvent(GameEventType.FacingChanged, {
        unitId: 'player-1',
        secondaryFacing: Facing.Northeast,
      } satisfies IFacingChangedPayload),
    );
    const movementPayload: IMovementDeclaredPayload = {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      facing: Facing.Northwest,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    };

    const moved = applyEvent(
      twisted,
      createEvent(GameEventType.MovementDeclared, movementPayload),
    );

    expect(moved.units['player-1']).toMatchObject({
      facing: Facing.Northwest,
      secondaryFacing: Facing.Northwest,
      torsoTwist: undefined,
    });
  });
});
