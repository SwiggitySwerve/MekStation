import { describe, expect, it } from '@jest/globals';

import type {
  IMovementEvent,
  IRetreatEvent,
} from '@/simulation/ai/AIPlayerEvents';
import type { IAIUnitState } from '@/simulation/ai/types';
import type {
  IGameConfig,
  IGameSession,
  IGameUnit,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IMovementDeclaredPayload,
} from '@/types/gameplay';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameEventType,
  GameSide,
  MovementType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import {
  appendEvent,
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { runMovementPhase } from '../GameEngine.phases';

class ScriptedMoveBot extends BotPlayer {
  constructor(
    private readonly unitId: string,
    private readonly to: IHexCoordinate,
  ) {
    super(new SeededRandom(7));
  }

  override evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  override playMovementPhase(unit: IAIUnitState): IMovementEvent | null {
    if (unit.unitId !== this.unitId) return null;
    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: this.to,
        facing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      },
    };
  }
}

class ScriptedGoProneBot extends BotPlayer {
  constructor(private readonly unitId: string) {
    super(new SeededRandom(11));
  }

  override evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  override playMovementPhase(unit: IAIUnitState): IMovementEvent | null {
    if (unit.unitId !== this.unitId) return null;
    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: unit.position,
        facing: unit.facing,
        movementType: MovementType.Stationary,
        mpUsed: 1,
        heatGenerated: 0,
        steps: [
          {
            kind: 'goProne',
            index: 0,
            at: { q: unit.position.q, r: unit.position.r },
            mpCost: 1,
          },
        ],
      },
    };
  }
}

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
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-opponent',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function createMovementPhaseSession(): IGameSession {
  let session = createGameSession(makeConfig(), makeUnits());
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 6);
  return advancePhase(session);
}

function setHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: TerrainType,
): IHexGrid {
  const key = coordToKey(coord);
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Hex at ${key} does not exist in grid`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, terrain });
  return { ...grid, hexes };
}

function movementPayloads(
  session: IGameSession,
): readonly IMovementDeclaredPayload[] {
  return session.events
    .filter((event) => event.type === GameEventType.MovementDeclared)
    .map((event) => event.payload as IMovementDeclaredPayload);
}

function movementMaps(
  capability: IMovementCapability,
): Map<string, IMovementCapability> {
  return new Map([
    ['unit-player', capability],
    ['unit-opponent', capability],
  ]);
}

describe('GameEngine movement phase validation', () => {
  it('skips ejected units instead of letting bot movement re-enter combat', () => {
    let session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const target = { q: from.q, r: from.r - 1 };
    session = appendEvent(
      session,
      createUnitEjectedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        session.currentState.phase,
        'unit-player',
        'player_declared',
      ),
    );

    const next = runMovementPhase(
      session,
      createHexGrid({ radius: 5 }),
      new ScriptedMoveBot('unit-player', target),
      new Map(),
      movementMaps({ walkMP: 5, runMP: 8, jumpMP: 0 }),
      new Map(),
    );

    expect(movementPayloads(next)).toEqual([]);
    expect(next.currentState.units['unit-player'].hasEjected).toBe(true);
    expect(next.currentState.units['unit-player'].position).toEqual(from);
  });

  it('rejects invalid AI movement instead of committing the bot payload', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const target = { q: from.q + 1, r: from.r - 1 };
    const grid = setHex(
      createHexGrid({ radius: 5 }),
      target,
      TerrainType.Water,
    );

    const next = runMovementPhase(
      session,
      grid,
      new ScriptedMoveBot('unit-player', target),
      new Map(),
      movementMaps({ walkMP: 5, runMP: 8, jumpMP: 0 }),
      new Map(),
    );

    expect(movementPayloads(next)).toEqual([]);
    expect(next.currentState.units['unit-player'].position).toEqual(from);
  });

  it('replaces bot-reported MP and heat with authoritative terrain validation', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const target = { q: from.q, r: from.r - 1 };
    const grid = setHex(
      createHexGrid({ radius: 5 }),
      target,
      TerrainType.LightWoods,
    );

    const next = runMovementPhase(
      session,
      grid,
      new ScriptedMoveBot('unit-player', target),
      new Map(),
      movementMaps({ walkMP: 2, runMP: 3, jumpMP: 0 }),
      new Map(),
    );

    const payload = movementPayloads(next)[0];
    expect(payload).toMatchObject({
      unitId: 'unit-player',
      to: target,
      mpUsed: 2,
      heatGenerated: 1,
    });
    expect(next.currentState.units['unit-player'].heat).toBe(1);
  });

  it('honors a bot voluntary go-prone movement step through the session reducer', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;

    const next = runMovementPhase(
      session,
      createHexGrid({ radius: 5 }),
      new ScriptedGoProneBot('unit-player'),
      new Map(),
      movementMaps({ walkMP: 5, runMP: 8, jumpMP: 0 }),
      new Map(),
    );

    const payload = movementPayloads(next)[0];
    expect(payload).toMatchObject({
      unitId: 'unit-player',
      from,
      to: from,
      movementType: MovementType.Stationary,
      mpUsed: 1,
      heatGenerated: 0,
      hexesMoved: 0,
      steps: [
        expect.objectContaining({
          kind: 'goProne',
          mpCost: 1,
        }),
      ],
    });
    expect(next.currentState.units['unit-player'].position).toEqual(from);
    expect(next.currentState.units['unit-player'].prone).toBe(true);
  });
});
