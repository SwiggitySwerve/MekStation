/**
 * V211-01 regression: the interactive AI must plan and validate movement
 * against live unit occupancy, including moves other units already locked
 * this turn, so it never ends movement in an occupied hex.
 *
 * @spec openspec/specs/movement-system/spec.md (committed validation
 *   occupancy/stacking gate shared by projection and engine)
 * @spec openspec/specs/combat-resolution/spec.md (runner-vs-interactive
 *   movement parity cites interactive movement validation paths)
 */

import { describe, expect, it, jest } from '@jest/globals';

import type { BotPlayer } from '@/simulation/ai/BotPlayer';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { BotPlayer as RealBotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType } from '@/types/gameplay';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  declareMovement,
  lockMovement,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { hexDistance } from '@/utils/gameplay/hexMath';

import {
  runInteractiveSessionAITurn,
  type IInteractiveSessionAIContext,
} from '../InteractiveSession.ai';

const PLAYER_ID = 'player-1';
const OPPONENT_ID = 'opponent-1';

function createMovementSession(): IGameSession {
  const units: readonly IGameUnit[] = [
    {
      id: PLAYER_ID,
      side: GameSide.Player,
      name: 'Hunchback',
      unitRef: 'p1',
      pilotRef: 'pilot-p1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: OPPONENT_ID,
      side: GameSide.Opponent,
      name: 'Locust',
      unitRef: 'o1',
      pilotRef: 'pilot-o1',
      gunnery: 4,
      piloting: 5,
    },
  ];
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 30,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units,
  );
  session = startGame(session, GameSide.Player);
  // Opponent wins initiative so the player moves (and locks) first, the
  // same ordering as match c18abb5d T3.
  session = rollInitiative(session, GameSide.Opponent, () => 6);
  return advancePhase(session);
}

/** Player runs next to the opponent and locks before the AI activates. */
function lockPlayerAdjacentToOpponent(session: IGameSession): {
  readonly session: IGameSession;
  readonly playerHex: IHexCoordinate;
} {
  const opponent = session.currentState.units[OPPONENT_ID];
  const player = session.currentState.units[PLAYER_ID];
  const playerHex = { q: opponent.position.q, r: opponent.position.r + 1 };
  let next = declareMovement(
    session,
    PLAYER_ID,
    player.position,
    playerHex,
    Facing.North,
    MovementType.Run,
    hexDistance(player.position, playerHex),
    2,
  );
  next = lockMovement(next, PLAYER_ID);
  return { session: next, playerHex };
}

function createAIContext(
  getSession: () => IGameSession,
  setSession: (session: IGameSession) => void,
  botPlayer: BotPlayer,
  grid: IHexGrid,
): IInteractiveSessionAIContext {
  return {
    side: GameSide.Opponent,
    getSession,
    setSession,
    appendAndPersistEvent: (event) => {
      setSession(appendEvent(getSession(), event));
    },
    weaponsByUnit: new Map(),
    movementByUnit: new Map([
      [OPPONENT_ID, { walkMP: 6, runMP: 9, jumpMP: 0 }],
    ]),
    gunneryByUnit: new Map(),
    pilotingByUnit: new Map(),
    tonnageByUnit: new Map(),
    grid,
    botPlayer,
  };
}

describe('interactive AI movement occupancy (V211-01)', () => {
  it('rejects a bot move into the hex the player already locked', () => {
    const locked = lockPlayerAdjacentToOpponent(createMovementSession());
    let session = locked.session;
    const eventsBefore = session.events.length;
    const opponentStart = session.currentState.units[OPPONENT_ID].position;
    const context = createAIContext(
      () => session,
      (next) => {
        session = next;
      },
      {
        evaluateRetreat: jest.fn(() => null),
        playMovementPhase: jest.fn(() => ({
          type: GameEventType.MovementDeclared,
          payload: {
            unitId: OPPONENT_ID,
            from: opponentStart,
            to: locked.playerHex,
            facing: Facing.South,
            movementType: MovementType.Walk,
            mpUsed: 1,
            heatGenerated: 1,
          },
        })),
      } as unknown as BotPlayer,
      createHexGrid({ radius: 6 }),
    );

    runInteractiveSessionAITurn(context, OPPONENT_ID);

    const opponent = session.currentState.units[OPPONENT_ID];
    expect(opponent.position).toEqual(opponentStart);
    expect(opponent.lockState).toBe(LockState.Locked);
    const declaredInto = session.events
      .slice(eventsBefore)
      .filter((event) => event.type === GameEventType.MovementDeclared);
    expect(declaredInto).toHaveLength(0);
  });

  it('seeded bot never ends movement stacked on another unit', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const locked = lockPlayerAdjacentToOpponent(createMovementSession());
      let session = locked.session;
      const context = createAIContext(
        () => session,
        (next) => {
          session = next;
        },
        new RealBotPlayer(new SeededRandom(seed)),
        createHexGrid({ radius: 6 }),
      );

      runInteractiveSessionAITurn(context, OPPONENT_ID);

      const opponent = session.currentState.units[OPPONENT_ID];
      const player = session.currentState.units[PLAYER_ID];
      expect({
        seed,
        stacked: hexDistance(opponent.position, player.position) === 0,
      }).toEqual({
        seed,
        stacked: false,
      });
    }
  });
});
