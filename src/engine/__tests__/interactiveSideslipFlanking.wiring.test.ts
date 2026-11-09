/**
 * Interactive movement queues no controlled-sideslip or flanking-and-turning
 * PSR for a BattleMech (C-1b). MegaMek 48fcb2f64 calls `Entity.checkSideSlip`
 * only for VTOL, hover and WiGE movement (`MovePathHandler.java` L3715-L3727;
 * the client prediction in `SharedUtility.java` L397-L402 has the same gate),
 * so interactive play matches the pin by not producing them. The runner no
 * longer produces them either.
 *
 * @spec openspec/changes/close-combat-psr-parity-gaps/specs/piloting-skill-rolls/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import { commitValidatedMovement } from '@/simulation/runner/phases/movementCommit';
import {
  Facing,
  GameEventType,
  GameSide,
  MovementType,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IHex,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
  type IMovementDeclaredPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import { applyInteractiveSessionMovement } from '../InteractiveSession.actions';

const ORIGIN = { q: 0, r: 0 };

function makeGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -6; q <= 6; q++) {
    for (let r = -6; r <= 6; r++) {
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: TerrainType.Clear,
        elevation: 0,
      });
    }
  }
  return { config: { radius: 6 }, hexes };
}

function makeUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IGameUnit> = {},
): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

/** m1 stands at the origin facing North, with Maneuvering Ace when asked. */
function sessionAtMovement(abilities: readonly string[]): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [
      makeUnit('m1', GameSide.Player, { abilities }),
      makeUnit('blocker', GameSide.Opponent),
    ],
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session.currentState.units.m1 = {
    ...session.currentState.units.m1,
    position: ORIGIN,
    facing: Facing.North,
    secondaryFacing: Facing.North,
    heat: 0,
  };
  session.currentState.units.blocker = {
    ...session.currentState.units.blocker,
    position: { q: -4, r: 4 },
    facing: Facing.South,
  };
  return session;
}

const CAPABILITY: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 0 };

function declared(events: readonly IGameEvent[]): IMovementDeclaredPayload {
  return events.find((event) => event.type === GameEventType.MovementDeclared)
    ?.payload as IMovementDeclaredPayload;
}

function psrCodes(events: readonly IGameEvent[]): readonly unknown[] {
  return events
    .filter((event) => event.type === GameEventType.PSRTriggered)
    .map((event) => (event.payload as { reasonCode?: string }).reasonCode);
}

function sessionMove(
  session: IGameSession,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  path: readonly IHexCoordinate[],
): readonly IGameEvent[] {
  const moved = applyInteractiveSessionMovement({
    session,
    grid: makeGrid(),
    movementByUnit: new Map([['m1', CAPABILITY]]),
    unitId: 'm1',
    to,
    facing,
    movementType,
    path,
  });
  return moved.events.slice(session.events.length);
}

function runnerMove(
  session: IGameSession,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  mpCost: number,
): readonly IGameEvent[] {
  const events: IGameEvent[] = [];
  commitValidatedMovement({
    currentState: session.currentState,
    events,
    gameId: session.id,
    grid: makeGrid(),
    unitId: 'm1',
    unit: session.currentState.units.m1,
    payload: {
      unitId: 'm1',
      from: ORIGIN,
      to,
      facing,
      movementType,
      mpUsed: 0,
      heatGenerated: 0,
    },
    validationCapability: CAPABILITY,
    mpCost,
    heatGenerated: 0,
    d6Roller: () => 6,
  });
  return events;
}

describe('interactive and runner movement queue no sideslip or flanking PSR for a BattleMech', () => {
  it('S-1 a run that turns after moving queues no flanking-and-turning PSR', () => {
    const session = sessionAtMovement(['maneuvering_ace']);
    const to = { q: 1, r: -2 };
    const events = sessionMove(
      session,
      to,
      Facing.Northeast,
      MovementType.Run,
      [ORIGIN, { q: 0, r: -1 }, to],
    );
    expect(events.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.MovementLocked,
    ]);
    expect(psrCodes(events)).toEqual([]);

    const runner = runnerMove(
      session,
      to,
      Facing.Northeast,
      MovementType.Run,
      declared(events).mpUsed,
    );
    // The scenario really is a turn after more than one hex.
    expect(declared(runner).hexesMoved).toBe(2);
    expect(declared(runner).steps?.map((step) => step.kind)).toEqual([
      'forward',
      'turn',
      'forward',
    ]);
    expect(psrCodes(runner)).toEqual([]);
  });

  it('S-2 a Maneuvering Ace running lateral shift queues no controlled-sideslip PSR', () => {
    const session = sessionAtMovement(['maneuvering_ace']);
    const to = { q: 1, r: -1 };
    const events = sessionMove(session, to, Facing.North, MovementType.Run, [
      ORIGIN,
      to,
    ]);

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.MovementLocked,
    ]);
    expect(psrCodes(events)).toEqual([]);

    // The runner prices the shift as a lateral step (side-step cost 2); the
    // session prices the same hexes as an ordinary turn-and-forward path.
    const runner = runnerMove(session, to, Facing.North, MovementType.Run, 2);
    expect(declared(runner).steps?.map((step) => step.kind)).toEqual([
      'lateral',
    ]);
    expect(psrCodes(runner)).toEqual([]);
  });
});
