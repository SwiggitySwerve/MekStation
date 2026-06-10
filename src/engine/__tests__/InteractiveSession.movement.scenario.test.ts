import type {
  IHex,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';

import {
  buildMovementPlan,
  mergeRunMovementRangeHexes,
} from '@/components/gameplay/pages/gameSession/GameSessionPage.movementPlanning';
import { GyroType } from '@/types/construction/GyroType';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameSession,
  type IGameUnit,
  type IMovementDeclaredPayload,
  type IMovementInvalidPayload,
  type IRuntimeMovementStateChangedPayload,
  type IUnitStoodPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
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

function setupSessionAtMovement(
  m1Overrides: Partial<IGameUnit> = {},
): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    [
      makeUnit('m1', GameSide.Player, m1Overrides),
      makeUnit('blocker', GameSide.Opponent),
    ],
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
  it('auto-lands short positive-altitude WiGE movement after declaration', () => {
    const session = setupSessionAtMovement({
      unitType: UnitType.VEHICLE,
      movementMode: 'wige',
      vehicleInit: {
        motionType: GroundMotionType.WIGE,
        originalCruiseMP: 4,
        armor: {},
        structure: {},
        altitude: 2,
      },
    });
    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 4, runMP: 6, movementMode: 'wige' }),
      unitId: 'm1',
      to: { q: 0, r: 1 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 0, r: 1 },
      ],
    });

    const appended = result.events.slice(session.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.MovementDeclared,
      GameEventType.RuntimeMovementStateChanged,
      GameEventType.MovementLocked,
    ]);
    expect(
      appended[1].payload as IRuntimeMovementStateChangedPayload,
    ).toMatchObject({
      unitId: 'm1',
      source: 'automatic_wige_landing',
      vehicleAltitude: 0,
    });
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 0, r: 1 },
      lockState: LockState.Locked,
      combatState: {
        kind: 'vehicle',
        state: { altitude: 0, motionType: GroundMotionType.WIGE },
      },
    });
  });

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

  it('rejects a second movement declaration after the unit is locked', () => {
    const session = setupSessionAtMovement();
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6 });
    const first = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 1 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
    });

    expect(first.currentState.units.m1.lockState).toBe(LockState.Locked);
    expect(first.currentState.units.m1.position).toEqual({ q: 0, r: 1 });

    const second = applyInteractiveSessionMovement({
      session: first,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 0, r: 2 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
    });

    expect(second.currentState.units.m1.position).toEqual({ q: 0, r: 1 });
    expect(
      second.events.filter(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toHaveLength(1);
    const invalid = second.events.findLast(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'UnitAlreadyMoved',
      details: 'Unit has already locked movement this phase',
      mpCost: 0,
      heatGenerated: 0,
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

  it('keeps Playtest2 deep-water MP aligned between preview and commit validation', () => {
    const baseSession = setupSessionAtMovement();
    const session: IGameSession = {
      ...baseSession,
      config: {
        ...baseSession.config,
        optionalRules: ['playtest_2'],
      },
    };
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
      walkMP: 3,
      runMP: 5,
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      'normal',
      { optionalRules: session.config.optionalRules },
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'walk',
      mpCost: 3,
      terrainCost: 2,
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

  it('keeps Playtest2 Mek-style run into water aligned after the first step', () => {
    const baseSession = setupSessionAtMovement();
    const session: IGameSession = {
      ...baseSession,
      config: {
        ...baseSession.config,
        optionalRules: ['playtest_2'],
      },
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0));
    grid.hexes.set(
      '2,0',
      makeHex(
        2,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Run,
      grid,
      movementByUnit.get('m1')!,
      { q: 2, r: 0 },
      'normal',
      { optionalRules: session.config.optionalRules },
    );

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'run',
      mpCost: 4,
      terrainCost: 2,
      heatGenerated: 2,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
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

  it('keeps Mek swim elevation movement legal between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '0,0',
      makeHex(
        0,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
      ),
    );
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Water, level: 2 }]),
        3,
      ),
    );
    const movementByUnit = capability({
      walkMP: 1,
      runMP: 1,
      movementMode: 'biped_swim',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'biped_swim',
      mpCost: 1,
      terrainCost: 0,
      elevationDelta: 3,
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

  it('keeps TacOps infantry pavement bonus aligned between preview and commit', () => {
    const baseSession = setupSessionAtMovement();
    const session: IGameSession = {
      ...baseSession,
      config: {
        ...baseSession.config,
        optionalRules: ['tacops_inf_pave_bonus'],
      },
    };
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
      runMP: 2,
      movementMode: 'tracked',
      movementHeatProfile: 'none',
      pavementRoadBonusProfile: 'tacops_infantry',
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      'normal',
      { optionalRules: session.config.optionalRules },
    ).find((entry) => entry.hex.q === 3 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 3,
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

  it('keeps represented naval unit-height bridge clearance blocked between preview and commit validation', () => {
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
          { type: TerrainType.Bridge, level: 1 },
        ]),
      ),
    );
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 5,
      movementMode: 'naval',
      unitHeight: 1,
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

  it('keeps runtime unit-height bridge clearance aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      unitHeight: 1,
    };
    const grid = makeGrid();
    grid.hexes.set('0,0', makeHex(0, 0, TerrainType.Water));
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Water, level: 1 },
          { type: TerrainType.Bridge, level: 1 },
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

  it('keeps Frogman deep-water movement cost aligned between preview and commit validation', () => {
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
      walkMP: 3,
      runMP: 5,
      movementMode: 'walk',
      waterCapability: { frogmanSpecialist: true },
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
      mpCost: 3,
      terrainCost: 2,
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

  it('keeps Battle Armor VTOL movement aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 4));
    const movementByUnit = capability({
      walkMP: 2,
      runMP: 2,
      jumpMP: 0,
      movementMode: 'vtol',
      movementHeatProfile: 'none',
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'vtol',
      mpCost: 1,
      elevationDelta: 4,
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

  it('keeps ProtoMech explicit run MP aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: -5, r: 0 },
    };
    const grid = makeGrid();
    const destination = { q: 5, r: 0 };
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 5,
      jumpMP: 0,
      movementMode: 'walk',
      movementHeatProfile: 'none',
    });
    const unitCapability = movementByUnit.get('m1')!;

    const walkPreview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      unitCapability,
      destination,
    );
    const runPreview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Run,
      grid,
      unitCapability,
      destination,
    );

    expect(walkPreview).toMatchObject({
      reachable: false,
      movementMode: 'walk',
      mpCost: 5,
      movementInvalidReason: 'InsufficientMP',
    });
    expect(runPreview).toMatchObject({
      reachable: true,
      movementMode: 'walk',
      mpCost: 5,
      heatGenerated: 0,
      movementType: MovementType.Run,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: destination,
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
        { q: 4, r: 0 },
        destination,
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
      to: runPreview!.hex,
      movementType: runPreview!.movementType,
      mpUsed: runPreview!.mpCost,
      heatGenerated: runPreview!.heatGenerated,
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

  it('keeps downhill elevation costs aligned between preview and commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('0,0', makeHex(0, 0, TerrainType.Clear, 2));
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 0));
    const movementByUnit = capability({ walkMP: 3, runMP: 5 });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: true,
      mpCost: 3,
      elevationDelta: -2,
      elevationCost: 2,
      movementMode: 'walk',
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
      to: preview!.hex,
      movementType: preview!.movementType,
      mpUsed: preview!.mpCost,
      heatGenerated: preview!.heatGenerated,
    });
  });

  it('keeps over-limit downhill elevation rejection aligned with commit validation', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set('0,0', makeHex(0, 0, TerrainType.Clear, 3));
    grid.hexes.set('1,0', makeHex(1, 0, TerrainType.Clear, 0));
    const movementByUnit = capability({ walkMP: 5, runMP: 8 });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 1 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      elevationDelta: -3,
      elevationCost: 3,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Elevation change of 3 exceeds ground movement limit',
      blockedReason: 'Elevation change of 3 exceeds ground movement limit',
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

  it('keeps jump preview and commit validation aligned for blocked jump clearance', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: -1, r: 0 },
    };
    const grid = makeGrid();
    grid.hexes.set(
      '1,0',
      makeHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Building, level: 4 }]),
      ),
    );
    grid.hexes.set('3,0', makeHex(3, 0));
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
    });

    const preview = deriveReachableHexes(
      session.currentState.units.m1,
      MovementType.Jump,
      grid,
      movementByUnit.get('m1')!,
    ).find((entry) => entry.hex.q === 3 && entry.hex.r === 0);

    expect(preview).toMatchObject({
      reachable: false,
      heatGenerated: 0,
      movementType: MovementType.Jump,
      movementInvalidReason: 'TerrainBlocked',
      movementInvalidDetails:
        'Jump path height +4 at (1,0) exceeds jump clearance +3',
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: { q: 3, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Jump,
      path: [
        { q: 0, r: 0 },
        { q: 3, r: 0 },
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

  // Audit 2026-06-09 C-2: jump MP is heat-immune (MegaMek Mek.getJumpMP has
  // no heat term) — this scenario previously pinned the wrong pre-fix
  // behavior where heat 25 (penalty 5) zeroed a jump-2 capability. The
  // hover preview and commit validation must now AGREE the jump is legal.
  it('keeps overheated jump hover and commit validation aligned (jump MP heat-immune)', () => {
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
      reachable: true,
      heatGenerated: 3,
      movementType: MovementType.Jump,
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
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(true);
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

  it('keeps hull-down GET_UP posture exit preview cost and commit state aligned', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: true,
      prone: false,
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 4, runMP: 6 }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Walk,
      mpUsed: 2,
      heatGenerated: 1,
      path: [{ q: 0, r: 0 }],
      hullDownExitAttempt: true,
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(result.currentState.units.m1).toMatchObject({
      hullDown: false,
      prone: false,
      lockState: LockState.Locked,
    });
  });

  it('commits standing HULL_DOWN as a same-hex 2 MP posture action', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: false,
      prone: false,
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 4, runMP: 6 }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      hullDownEntryAttempt: true,
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Walk,
      mpUsed: 2,
      heatGenerated: 1,
      path: [{ q: 0, r: 0 }],
      hullDownEntryAttempt: true,
      steps: [
        {
          kind: 'hullDown',
          index: 0,
          at: { q: 0, r: 0 },
          mpCost: 2,
        },
      ],
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(result.currentState.units.m1).toMatchObject({
      hullDown: true,
      prone: false,
      lockState: LockState.Locked,
    });
  });

  it('commits prone HULL_DOWN with actuator and hip MP costs', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: false,
      prone: true,
      componentDamage: {
        engineHits: 0,
        gyroHits: 0,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        actuatorsByLocation: {
          right_leg: { [ActuatorType.UPPER_LEG]: true },
          left_leg: { [ActuatorType.HIP]: true },
        },
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 3, runMP: 5 }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      hullDownEntryAttempt: true,
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      movementType: MovementType.Walk,
      mpUsed: 3,
      heatGenerated: 1,
      hullDownEntryAttempt: true,
      steps: [
        {
          kind: 'hullDown',
          index: 0,
          at: { q: 0, r: 0 },
          mpCost: 3,
        },
      ],
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(result.currentState.units.m1).toMatchObject({
      hullDown: true,
      prone: false,
      lockState: LockState.Locked,
    });
  });

  it('rejects prone HULL_DOWN when a required support location is destroyed', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: false,
      prone: true,
      destroyedLocations: ['left_leg'],
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 20, runMP: 30 }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      hullDownEntryAttempt: true,
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Cannot enter hull-down with a destroyed leg/support location',
      mpCost: 100,
      heatGenerated: 0,
    });
  });

  it('rejects HULL_DOWN entry for non-Mek-style movement profiles', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: false,
      prone: false,
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({
        walkMP: 4,
        runMP: 6,
        movementMode: 'tracked',
        movementHeatProfile: 'none',
      }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      hullDownEntryAttempt: true,
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
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Hull-down entry is only available for Mek-style movement',
      mpCost: 0,
      heatGenerated: 0,
    });
  });

  it('rejects HULL_DOWN entry with a destroyed gyro', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: false,
      prone: false,
      componentDamage: {
        engineHits: 0,
        gyroHits: 2,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 4, runMP: 6 }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      path: [{ q: 0, r: 0 }],
      hullDownEntryAttempt: true,
    });

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Cannot enter hull-down with a destroyed gyro',
      mpCost: 2,
      heatGenerated: 0,
    });
  });

  it('commits hull-down GO_PRONE as a same-hex 0 MP posture action', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: true,
      prone: false,
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 4, runMP: 6 }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Stationary,
      path: [{ q: 0, r: 0 }],
      goProneAttempt: true,
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Stationary,
      mpUsed: 0,
      heatGenerated: 0,
      path: [{ q: 0, r: 0 }],
      goProneAttempt: true,
      steps: [
        {
          kind: 'goProne',
          index: 0,
          at: { q: 0, r: 0 },
          mpCost: 0,
        },
      ],
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(false);
    expect(result.currentState.units.m1).toMatchObject({
      hullDown: false,
      prone: true,
      lockState: LockState.Locked,
    });
  });

  it('rejects hull-down GO_PRONE for non-Mek-style movement profiles', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      hullDown: true,
      prone: false,
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({
        walkMP: 4,
        runMP: 6,
        movementMode: 'tracked',
        movementHeatProfile: 'none',
      }),
      unitId: 'm1',
      to: { q: 0, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Stationary,
      path: [{ q: 0, r: 0 }],
      goProneAttempt: true,
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
    expect(invalid!.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Hull-down go-prone is only available for Mek-style movement',
      mpCost: 0,
      heatGenerated: 0,
    });
  });

  it('keeps intact quad stand-up preview and commit aligned without rolling a PSR', () => {
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
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: { standUpLegProfile: 'quad' },
    });

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
      standUpRequired: true,
      standUpCost: 2,
      standUpPsrRequired: false,
      standUpPsrAutomaticSuccessReason:
        'Quad Mek has all four legs and does not need a stand-up PSR',
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
      diceRoller: () => {
        throw new Error('Intact quad stand-up should not roll a PSR');
      },
    });

    expect(
      result.events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(false);
    expect(
      result.events.some((event) => event.type === GameEventType.PSRResolved),
    ).toBe(false);

    const stood = result.events.find(
      (event) => event.type === GameEventType.UnitStood,
    );
    expect(stood?.payload as IUnitStoodPayload).toMatchObject({
      unitId: 'm1',
      roll: 0,
      targetNumber: 0,
      automaticSuccessReason:
        'Quad Mek has all four legs and does not need a stand-up PSR',
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      mpUsed: preview!.mpCost,
      standUpAttempt: true,
      standUpSucceeded: true,
    });
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

  it('keeps runtime conversion careful-stand costs aligned when standing fails', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      conversionMode: 'airmek',
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({
      walkMP: 1,
      runMP: 2,
      jumpMP: 2,
      unitHeight: 1,
      unitHeightProfile: { kind: 'lam', standingHeight: 1 },
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 0, r: 1 },
      'careful',
    );

    expect(preview).toMatchObject({
      reachable: false,
      mpCost: 6,
      movementMode: 'wige',
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        'Careful stand consumes the movement for this turn',
      standUpRequired: true,
      standUpCost: 6,
    });

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
      standUpMode: 'careful',
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Walk,
      mpUsed: preview!.standUpCost,
      heatGenerated: 1,
      path: [{ q: 0, r: 0 }],
      standUpAttempt: true,
      standUpSucceeded: false,
      standUpMode: 'careful',
    });
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

  it('keeps destroyed-gyro stand-up attempts at the origin as impossible', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      componentDamage: {
        engineHits: 0,
        gyroHits: 2,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });
    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: false,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: 'Cannot stand with a destroyed gyro',
      standUpPsrImpossibleReason: 'Cannot stand with a destroyed gyro',
    });

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
      diceRoller: () => {
        throw new Error('Destroyed-gyro stand-up should not roll dice');
      },
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      unitId: 'm1',
      targetNumber: Infinity,
      roll: 0,
      passed: false,
      reason: 'Cannot stand with a destroyed gyro',
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

  it('rejects standing non-tracked movement when the gyro is destroyed', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      componentDamage: {
        engineHits: 0,
        gyroHits: 2,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };

    const result = applyInteractiveSessionMovement({
      session,
      grid: makeGrid(),
      movementByUnit: capability({ walkMP: 4, runMP: 6, jumpMP: 3 }),
      unitId: 'm1',
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    const invalid = result.events.find(
      (event) => event.type === GameEventType.MovementInvalid,
    );
    expect(invalid?.payload as IMovementInvalidPayload).toMatchObject({
      unitId: 'm1',
      reason: 'InvalidDestination',
      details: 'Destroyed gyro only permits tracked or wheeled movement',
    });
    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementDeclared,
      ),
    ).toBe(false);
  });

  it('allows tracked movement with a destroyed gyro through preview and commit', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      componentDamage: {
        engineHits: 0,
        gyroHits: 2,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      movementMode: 'tracked',
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );
    expect(preview).toMatchObject({
      reachable: true,
      movementMode: 'tracked',
      mpCost: 1,
    });

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
    });

    expect(
      result.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared?.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 1, r: 0 },
      mpUsed: 1,
      movementType: MovementType.Walk,
    });
    expect(result.currentState.units.m1.position).toEqual({ q: 1, r: 0 });
  });

  it('keeps two-hit heavy-duty gyro stand-up projection and commit rollable', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: {
        engineHits: 0,
        gyroHits: 2,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });
    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 8,
      standUpPsrModifier: 3,
      standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
    });
    expect(preview?.standUpPsrImpossibleReason).toBeUndefined();

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
      diceRoller: fixed2d6(8),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      unitId: 'm1',
      targetNumber: 8,
      roll: 8,
      modifiers: 3,
      passed: true,
      reason: 'Standing up',
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(true);

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 1, r: 0 },
      mpUsed: 3,
      standUpAttempt: true,
      standUpSucceeded: true,
    });
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 1, r: 0 },
      prone: false,
    });
  });

  it('keeps Playtest3 three-hit heavy-duty gyro stand-up projection and commit rollable', () => {
    const baseSession = setupSessionAtMovement();
    const session: IGameSession = {
      ...baseSession,
      config: {
        ...baseSession.config,
        optionalRules: ['playtest_3'],
      },
    };
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      gyroType: GyroType.HEAVY_DUTY,
      componentDamage: {
        engineHits: 0,
        gyroHits: 3,
        sensorHits: 0,
        lifeSupport: 0,
        cockpitHit: false,
        actuators: {},
        weaponsDestroyed: [],
        heatSinksDestroyed: 0,
        jumpJetsDestroyed: 0,
      },
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({ walkMP: 4, runMP: 6, jumpMP: 0 });
    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
      'normal',
      { optionalRules: session.config.optionalRules },
    );

    expect(preview).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 8,
      standUpPsrModifier: 3,
      standUpPsrModifierDetails: ['Heavy-duty gyro damage +3'],
    });
    expect(preview?.standUpPsrImpossibleReason).toBeUndefined();

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
      diceRoller: fixed2d6(8),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      unitId: 'm1',
      targetNumber: 8,
      roll: 8,
      modifiers: 3,
      passed: true,
      reason: 'Standing up',
    });
    expect(
      result.events.some((event) => event.type === GameEventType.UnitStood),
    ).toBe(true);
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 1, r: 0 },
      prone: false,
    });
  });

  it('keeps TacOps destroyed-arm stand-up penalties aligned between preview and commit', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      destroyedLocations: ['right_arm'],
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: { tacOpsAttemptingStand: true },
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: true,
      mpCost: 3,
      standUpRequired: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: ['Right arm destroyed +2'],
    });

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
      diceRoller: fixed2d6(6),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      targetNumber: 7,
      roll: 6,
      modifiers: 2,
      passed: false,
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

  it('keeps Playtest2 trying-to-stand bonus aligned between preview and commit', () => {
    const baseSession = setupSessionAtMovement();
    const session: IGameSession = {
      ...baseSession,
      config: {
        ...baseSession.config,
        optionalRules: ['playtest_2'],
      },
    };
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

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
      'normal',
      { optionalRules: session.config.optionalRules },
    );

    expect(preview).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 4,
      standUpPsrModifier: -1,
      standUpPsrModifierDetails: ['Trying to stand -1'],
    });

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
      diceRoller: fixed2d6(4),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      targetNumber: 4,
      roll: 4,
      modifiers: -1,
      passed: true,
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      to: { q: 1, r: 0 },
      mpUsed: 3,
      standUpAttempt: true,
      standUpSucceeded: true,
    });
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 1, r: 0 },
      prone: false,
    });
  });

  it('keeps TacOps arm-actuator stand-up penalties aligned between preview and commit', () => {
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
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: {
        tacOpsAttemptingStand: true,
        armActuators: { right: 'hand', left: 'upper_arm' },
      },
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: [
        'Right arm hand actuator missing/destroyed +1',
        'Left arm upper actuator missing/destroyed +1',
      ],
    });

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
      diceRoller: fixed2d6(6),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      targetNumber: 7,
      roll: 6,
      modifiers: 2,
      passed: false,
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
    expect(result.currentState.units.m1).toMatchObject({
      position: { q: 0, r: 0 },
      prone: true,
    });
  });

  it('keeps no-arms quirk stand-up penalties overriding TacOps arm checks', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.m1 = {
      ...session.currentState.units.m1,
      prone: true,
      destroyedLocations: ['right_arm', 'left_arm'],
    };
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const movementByUnit = capability({
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      standUpCapability: {
        noMinimalArmsQuirk: true,
        tacOpsAttemptingStand: true,
      },
    });

    const preview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      movementByUnit.get('m1')!,
      { q: 1, r: 0 },
    );

    expect(preview).toMatchObject({
      reachable: true,
      standUpPsrTargetNumber: 7,
      standUpPsrModifier: 2,
      standUpPsrModifierDetails: ['No/minimal arms +2'],
    });

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
      diceRoller: fixed2d6(6),
    });

    const resolved = result.events.find(
      (event) => event.type === GameEventType.PSRResolved,
    );
    expect(resolved?.payload).toMatchObject({
      targetNumber: 7,
      roll: 6,
      modifiers: 2,
      passed: false,
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

  it('keeps TacOps fast infantry run movement aligned between preview and commit', () => {
    const session = setupSessionAtMovement();
    session.currentState.units.blocker = {
      ...session.currentState.units.blocker,
      position: { q: 5, r: 0 },
    };
    const grid = makeGrid();
    const destination = { q: 4, r: 0 };
    const movementByUnit = capability({
      walkMP: 3,
      runMP: 4,
      jumpMP: 0,
      movementMode: 'walk',
      movementHeatProfile: 'none',
      movementTerrainProfile: 'infantry',
    });
    const unitCapability = movementByUnit.get('m1')!;

    const walkPreview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Walk,
      grid,
      unitCapability,
      destination,
    );
    const runPreview = deriveMovementRangeHexForDestination(
      session.currentState.units.m1,
      MovementType.Run,
      grid,
      unitCapability,
      destination,
    );

    expect(walkPreview).toMatchObject({
      reachable: false,
      mpCost: 4,
      movementInvalidReason: 'InsufficientMP',
    });
    expect(runPreview).toMatchObject({
      reachable: true,
      mpCost: 4,
      heatGenerated: 0,
      movementType: MovementType.Run,
    });

    const result = applyInteractiveSessionMovement({
      session,
      grid,
      movementByUnit,
      unitId: 'm1',
      to: destination,
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
        destination,
      ],
    });

    const declared = result.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    );
    expect(declared).toBeDefined();
    expect(declared!.payload as IMovementDeclaredPayload).toMatchObject({
      unitId: 'm1',
      movementType: runPreview!.movementType,
      mpUsed: runPreview!.mpCost,
      heatGenerated: runPreview!.heatGenerated,
    });
  });
});
