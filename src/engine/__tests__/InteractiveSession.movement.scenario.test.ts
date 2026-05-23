import type {
  IHex,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';

import {
  buildMovementPlan,
  mergeRunMovementRangeHexes,
} from '@/components/gameplay/pages/gameSession/GameSessionPage.movementPlanning';
import {
  Facing,
  GameEventType,
  GameSide,
  MovementType,
  type IGameSession,
  type IGameUnit,
  type IMovementDeclaredPayload,
  type IMovementInvalidPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import {
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
} from '@/utils/gameplay/movement/reachable';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { applyInteractiveSessionMovement } from '../InteractiveSession.actions';

function makeHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation: number = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

function makeGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -6; q <= 6; q++) {
    for (let r = -6; r <= 6; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 6 }, hexes };
}

function makeUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function setupSessionAtMovement(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [makeUnit('m1', GameSide.Player), makeUnit('blocker', GameSide.Opponent)],
  );
  session = startGame(session, GameSide.Player);
  session = advancePhase(session);
  session.currentState.units.m1 = {
    ...session.currentState.units.m1,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
  };
  session.currentState.units.blocker = {
    ...session.currentState.units.blocker,
    position: { q: 1, r: 0 },
    facing: Facing.South,
  };
  return session;
}

function capability(overrides: Partial<IMovementCapability> = {}) {
  return new Map<string, IMovementCapability>([
    ['m1', { walkMP: 2, runMP: 3, jumpMP: 0, ...overrides }],
  ]);
}

function fixed2d6(total: number) {
  return () => ({
    dice: total >= 7 ? [6, total - 6] : [1, total - 1],
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  });
}

describe('applyInteractiveSessionMovement', () => {
  it('rejects an occupied destination before declaring or locking movement', () => {
    const session = setupSessionAtMovement();
    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability(),
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementLocked,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'DestinationOccupied',
      details: 'Destination hex is occupied',
    });
  });

  it('rejects over-budget movement before the engine mutates position or locks the unit', () => {
    const session = setupSessionAtMovement();
    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 2, runMP: 3 }),
      unitId: 'm1',
      to: { q: 3, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementLocked,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InsufficientMP',
      mpCost: 3,
    });
  });

  it('keeps shutdown movement preview and commit validation aligned', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      shutdown: true,
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 3 });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      mpCost: 0,
      heatGenerated: 0,
      movementInvalidReason: 'UnitImmobile',
      movementInvalidDetails: 'Unit is shut down and cannot move',
      blockedReason: 'Unit is shut down and cannot move',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementLocked,
      ),
    ).toBe(false);
    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: preview!.movementInvalidReason,
      details: preview!.movementInvalidDetails,
      mpCost: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps movement preview and commit validation aligned for encoded terrain blockers', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Smoke, level: 1 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'tracked',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Water blocks ground movement',
      blockedReason: 'Water blocks ground movement',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'TerrainBlocked',
      details: 'Water blocks ground movement',
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps walking water entry legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Water));
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'walk',
      mpCost: 2,
      terrainCost: 1,
      elevationCost: 0,
      heatGenerated: 1,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps UMU deep-water movement legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 1,
      runMP: 1,
      movementMode: 'umu',
      movementHeatProfile: 'none',
      movementTerrainProfile: 'infantry',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'umu',
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps tracked ice-covered water movement legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Ice, level: 1 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'tracked',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps tracked bridge-covered water movement legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Bridge, level: 1 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'tracked',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps tracked paved-road water movement legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Road, level: 1 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'tracked',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it.each([3, 4] as const)(
    'keeps tracked road level %i water blocked between preview and commit validation',
    (roadLevel) => {
      const session = setupSessionAtMovement();
      session.currentState.units.blocker = {
        ...session.currentState.units.blocker,
        position: { q: 5, r: 0 },
      };
      const grid = makeGrid();
      grid.hexes.set(
        '1,0',
        makeHex(
          1,
          0,
          terrainStringFromFeatures([
            { type: TerrainType.Water, level: 2 },
            { type: TerrainType.Road, level: roadLevel },
          ]),
        ),
      );
      const movementByUnit = capability({
        walkMP: 3,
        runMP: 5,
        movementMode: 'tracked',
      });

      const preview = deriveReachableHexes(
        session.currentState.units.m1,
        MovementType.Walk,
        grid,
        movementByUnit.get('m1')!,
      ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

      expect(preview).toMatchObject({
        reachable: false,
        movementMode: 'tracked',
        mpCost: Infinity,
        heatGenerated: 0,
        movementType: MovementType.Walk,
        blockedReason: 'Water blocks ground movement',
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: 'Water blocks ground movement',
      });

      const result = applyInteractiveSessionMovement({
        session,
        grid,
        movementByUnit,
        unitId: 'm1',
        to: { q: 1, r: 0 },
        facing: Facing.Southeast,
        movementType: MovementType.Walk,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      });

      expect(
        result.events.some(
          (event) => event.type === GameEventType.MovementDeclared,
        ),
      ).toBe(false);

      const invalid = result.events.find(
        (event) => event.type === GameEventType.MovementInvalid,
      );
      expect(invalid).toBeDefined();
      expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
        unitId: 'm1',
        reason: 'TerrainBlocked',
        details: 'Water blocks ground movement',
        heatGenerated: preview!.heatGenerated,
      });
    },
  );

  it('keeps tracked paved-road bonus movement legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    for (const q of [1, 2, 3]) {
      grid.hexes.set(
        `${q},0`,
        makeHex(
          q,
          0,
          terrainStringFromFeatures([{ type: TerrainType.Road, level: 1 }]),
        ),
      );
    }
    const movementByUnit = capability({
      walkMP: 2,
      runMP: 3,
      movementMode: 'tracked',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 3 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 3,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
      ],
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 3, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: preview!.path,
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
      path: preview!.path,
    });
  });

  it('keeps naval low-bridge clearance blocked between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('0,0', makeHex(0, 0, TerrainType.Water));
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Bridge, level: 0 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'naval',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      movementMode: 'naval',
      movementType: MovementType.Walk,
      blockedReason: 'Naval movement lacks bridge clearance',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Naval movement lacks bridge clearance',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'TerrainBlocked',
      details: 'Naval movement lacks bridge clearance',
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps flotation-hull tracked water movement aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      movementMode: 'tracked',
      waterCapability: { flotationHull: true },
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 4,
      terrainCost: 3,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps flotation-hull tracked first-step run into water aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      movementMode: 'tracked',
      waterCapability: { flotationHull: true },
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Run,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 4,
      terrainCost: 3,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Run,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('rejects flotation-hull tracked run into water after the first step in preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear));
    grid.hexes.set(
      '2,0',
      makeHex(
        2,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      movementMode: 'tracked',
      waterCapability: { flotationHull: true },
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Run,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 2 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      movementMode: 'tracked',
      movementType: MovementType.Run,
      blockedReason: 'Water blocks ground movement',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Water blocks ground movement',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 2, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'TerrainBlocked',
      details: 'Water blocks ground movement',
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('commits a run-overlay walk fallback as walking when water blocks running', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear));
    grid.hexes.set(
      '2,0',
      makeHex(
        2,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({ walkMP: 5, runMP: 6, jumpMP: 0 });
    const unit = session.currentState.units.m1;
    const unitCapability = movementByUnit.get('m1')!;
    const run = deriveReachableHexes(
      unit,
      MovementType.Run,
      grid,
      unitCapability,
    );
    const walk = deriveReachableHexes(
      unit,
      MovementType.Walk,
      grid,
      unitCapability,
    );
    const projected = mergeRunMovementRangeHexes(run, walk).find(
      (entry) => entry.hex.q === 2 && entry.hex.r === 0,
    );

    expect(projected).toMatchObject({
      reachable: true,
      movementMode: 'walk',
      movementType: MovementType.Walk,
      mpCost: 5,
      heatGenerated: 1,
    });

    const plan = buildMovementPlan({
      hex: { q: 2, r: 0 },
      selectedUnitState: unit,
      movementRangeLookup: new Map([['2,0', projected!]]),
      movementType: MovementType.Run,
    });

    expect(plan).toMatchObject({
      movementType: MovementType.Walk,
      mpCost: projected!.mpCost,
      heatGenerated: projected!.heatGenerated,
      path: projected!.path,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: plan!.destination,
      facing: plan!.facing,
      movementType: plan!.movementType,
      path: plan!.path,
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: projected!.hex,
      movementType: MovementType.Walk,
      mpUsed: projected!.mpCost,
      heatGenerated: projected!.heatGenerated,
    });
  });

  it('keeps fully amphibious tracked run into water aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      movementMode: 'tracked',
      waterCapability: { fullyAmphibious: true },
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Run,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 2,
      terrainCost: 1,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Run,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps hover preview and commit validation aligned when crossing encoded water', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Smoke, level: 1 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'hover',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'hover',
      mpCost: 1,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps naval preview and commit validation aligned when leaving water is blocked', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('0,0', makeHex(0, 0, TerrainType.Water));
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear));
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'naval',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      movementMode: 'naval',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Naval movement requires water terrain',
      blockedReason: 'Naval movement requires water terrain',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: preview!.movementInvalidReason,
      details: preview!.movementInvalidDetails,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps VTOL preview and commit validation aligned for abrupt elevation changes', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 4));
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'vtol',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'vtol',
      mpCost: 1,
      elevationDelta: 4,
      elevationCost: 0,
      movementType: MovementType.Walk,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps tracked vehicle elevation limits aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 2));
    const movementByUnit = capability({
      walkMP: 5,
      runMP: 8,
      movementMode: 'tracked',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      movementMode: 'tracked',
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Elevation change of 2 exceeds Tracked movement limit',
      blockedReason: 'Elevation change of 2 exceeds Tracked movement limit',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: preview!.movementInvalidReason,
      details: preview!.movementInvalidDetails,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps jump preview and commit validation aligned for off-map landings', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: -1, r: 0 },
    };
    const grid = createHexGrid({ radius: 1 });
    const movementByUnit = capability({
      walkMP: 2,
      runMP: 3,
      jumpMP: 2,
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Jump,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 2 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      movementType: MovementType.Jump,
      movementInvalidReason: 'DestinationOutOfBounds',
      movementInvalidDetails: 'Destination is outside map bounds',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 2, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Jump,
      path: [
        { q: 0, r: 0 },
        { q: 2, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: preview!.movementInvalidReason,
      details: preview!.movementInvalidDetails,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps jump preview and commit validation aligned for too-high landings', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: -1, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 3));
    const movementByUnit = capability({
      walkMP: 2,
      runMP: 3,
      jumpMP: 2,
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Jump,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      movementType: MovementType.Jump,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails: 'Jump elevation rise of 3 exceeds jump MP 2',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Jump,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: preview!.movementInvalidReason,
      details: preview!.movementInvalidDetails,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps heat-reduced zero jump MP hover and commit validation aligned', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      heat: 25,
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 2,
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Jump,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      movementType: MovementType.Jump,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails:
        'Destination is 1 hexes away, but max range for jump is 0',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Jump,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: preview!.movementInvalidReason,
      details: preview!.movementInvalidDetails,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps prone stand-up movement preview, commit cost, and unit state aligned', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 3 });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 0, r: 2 },
    );

    expect(preview).toMatchObject({
      reachable: true,
      mpCost: 4,
      heatGenerated: 1,
      movementType: MovementType.Walk,
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: true,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 2 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: 2 },
      ],
      diceRoller: fixed2d6(12),
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 0, r: 2 },
      movementType: MovementType.Walk,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
      standUpAttempt: true,
      standUpSucceeded: true,
    });
    expect(
      result.events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.PSRResolved),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(true);
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 0, r: 2 },
      prone: false,
    });
  });

  it('stops prone ground movement at the origin when the stand-up PSR fails', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 3 });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 2 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: 2 },
      ],
      diceRoller: fixed2d6(2),
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 2,
      heatGenerated: 1,
      path: [{ q: 0, r: 0 }],
      standUpAttempt: true,
      standUpSucceeded: false,
    });
    expect(
      result.events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.PSRResolved),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 0, r: 0 },
      prone: true,
    });
  });

  it('keeps destroyed-leg-and-arms stand-up attempts at the origin as impossible', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      destroyedLocations: ['left_leg', 'left_arm', 'right_arm'],
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      diceRoller: fixed2d6(12),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      unitId: 'm1',
      targetNumber: Infinity,
      roll: 0,
      passed: false,
      reason: 'Cannot stand with a destroyed leg and both arms destroyed',
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 0, r: 0 },
      mpUsed: 2,
      standUpAttempt: true,
      standUpSucceeded: false,
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 0, r: 0 },
      prone: true,
    });
  });

  it('commits standalone stand-up as a zero-hex walk with stand-up MP cost', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      diceRoller: fixed2d6(12),
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Walk,
      mpUsed: 2,
      heatGenerated: 1,
      path: [{ q: 0, r: 0 }],
      standUpAttempt: true,
      standUpSucceeded: true,
    });
    expect(
      result.events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.PSRResolved),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(true);
    expect(result.currentState.units.m1.prone).toBe(false);
  });

  it('commits TacOps careful stand as a whole-turn zero-hex walk with the PSR bonus', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      diceRoller: fixed2d6(3),
      standUpMode: 'careful',
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      targetNumber: 3,
      roll: 3,
      modifiers: -2,
      passed: true,
    });
    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 0, r: 0 },
      movementType: MovementType.Walk,
      mpUsed: 4,
      standUpAttempt: true,
      standUpSucceeded: true,
      standUpMode: 'careful',
    });
    expect(result.currentState.units.m1.prone).toBe(false);
  });

  it('rejects TacOps careful stand when paired with destination movement', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      standUpMode: 'careful',
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid?.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Careful stand consumes the movement for this turn',
      mpCost: 4,
    });

    const jumpResult = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit: capability({ walkMP: 4, runMP: 6, jumpMP: 3 }),
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Jump,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      standUpMode: 'careful',
    });

    const invalidJump = jumpResult.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalidJump?.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Careful stand consumes the movement for this turn',
      mpCost: 4,
    });
  });

  it('keeps a unit prone when standalone stand-up PSR fails after spending MP', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      diceRoller: fixed2d6(2),
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 0, r: 0 },
      mpUsed: 2,
      standUpAttempt: true,
      standUpSucceeded: false,
    });
    expect(
      result.events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.PSRResolved),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementLocked,
      ),
    ).toBe(true);
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 0, r: 0 },
      prone: true,
      lockState: expect.any(String),
    });
  });

  it('declares legal terrain movement with the same MP and heat cost the validator computed', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.LightWoods));

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit: capability({ walkMP: 4, runMP: 6 }),
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 1, r: 0 },
      movementType: MovementType.Walk,
      mpUsed: 2,
      heatGenerated: 1,
    });
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementLocked,
      ),
    ).toBe(true);
  });

  it('keeps non-Mek movement heat aligned between preview and commit', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 3,
      jumpMP: 3,
      movementMode: 'walk',
      movementHeatProfile: 'none',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'walk',
      heatGenerated: 0,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      movementType: MovementType.Walk,
      heatGenerated: 0,
    });
  });

  it('keeps infantry woods movement cost aligned between preview and commit', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.LightWoods));
    const movementByUnit = capability({
      walkMP: 1,
      runMP: 1,
      jumpMP: 0,
      movementMode: 'walk',
      movementHeatProfile: 'none',
      movementTerrainProfile: 'infantry',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      heatGenerated: 0,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Southeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });
  });
});
