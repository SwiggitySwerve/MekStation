import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameEventType,
  GameSide,
  MovementType,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementDeclaredPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { applyInteractiveSessionMovement } from '../InteractiveSession.actions';

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

function latestMovementPayload(
  session: IGameSession,
): IMovementDeclaredPayload {
  const event = [...session.events]
    .reverse()
    .find((entry) => entry.type === GameEventType.MovementDeclared);
  if (!event) throw new Error('MovementDeclared event not found');
  return event.payload as IMovementDeclaredPayload;
}

describe('InteractiveSession movement validation', () => {
  it('commits terrain-adjusted MP and movement heat through the interactive action path', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const target = { q: from.q, r: from.r - 1 };
    const grid = setHex(
      createHexGrid({ radius: 5 }),
      target,
      TerrainType.LightWoods,
    );

    const next = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit: new Map([
        ['unit-player', { walkMP: 2, runMP: 3, jumpMP: 0 }],
      ]),
      unitId: 'unit-player',
      to: target,
      facing: Facing.North,
      movementType: MovementType.Walk,
    });

    const payload = latestMovementPayload(next);
    expect(payload.mpUsed).toBe(2);
    expect(payload.heatGenerated).toBe(1);
    expect(next.currentState.units['unit-player'].position).toEqual(target);
    expect(next.currentState.units['unit-player'].heat).toBe(1);
  });

  it('commits TacOps Sprint beyond run MP with sprint state and heat', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const target = { q: from.q, r: from.r - 4 };

    const next = applyInteractiveSessionMovement({
      session,
      grid: createHexGrid({ radius: 8 }),
      movementByUnit: new Map([
        ['unit-player', { walkMP: 2, runMP: 3, sprintMP: 4, jumpMP: 0 }],
      ]),
      unitId: 'unit-player',
      to: target,
      facing: Facing.North,
      movementType: MovementType.Sprint,
    });

    const payload = latestMovementPayload(next);
    expect(payload).toMatchObject({
      movementType: MovementType.Sprint,
      mode: MovementType.Run,
      mpUsed: 4,
      heatGenerated: 3,
    });
    expect(next.currentState.units['unit-player']).toMatchObject({
      position: target,
      heat: 3,
      movementThisTurn: MovementType.Sprint,
      sprintedThisTurn: true,
    });
  });

  it('rejects impassable movement before declaring or locking the unit', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const target = { q: from.q + 1, r: from.r - 1 };
    const grid = setHex(
      createHexGrid({ radius: 5 }),
      target,
      TerrainType.Water,
    );

    expect(() =>
      applyInteractiveSessionMovement({
        session,
        grid,
        movementByUnit: new Map([
          ['unit-player', { walkMP: 5, runMP: 8, jumpMP: 0 }],
        ]),
        unitId: 'unit-player',
        to: target,
        facing: Facing.North,
        movementType: MovementType.Walk,
      }),
    ).toThrow('Invalid movement for unit-player');

    expect(
      session.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
  });

  it('rebuilds authoritative ground paths instead of trusting an illegal caller path', () => {
    const session = createMovementPhaseSession();
    const from = session.currentState.units['unit-player'].position;
    const water = { q: from.q + 1, r: from.r - 1 };
    const target = { q: from.q + 2, r: from.r - 2 };
    const grid = setHex(createHexGrid({ radius: 5 }), water, TerrainType.Water);

    const next = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit: new Map([
        ['unit-player', { walkMP: 8, runMP: 10, jumpMP: 0 }],
      ]),
      unitId: 'unit-player',
      to: target,
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [from, water, target],
    });

    const payload = latestMovementPayload(next);
    const committedPath = payload.path ?? [];
    expect(payload.mpUsed).toBeGreaterThan(2);
    expect(committedPath).not.toContainEqual(water);
    expect(committedPath[committedPath.length - 1]).toEqual(target);
  });
});
