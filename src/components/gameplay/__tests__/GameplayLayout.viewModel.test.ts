import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  type IHexCoordinate,
  LockState,
  MovementType,
  TerrainType,
  type IGameSession,
  type IGameState,
  type IHexGrid,
  type IUnitGameState,
} from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { buildGameplayTokens } from '../GameplayLayout.viewModel';

const SIDE_OWNERS = {
  [GameSide.Player]: 'player-1',
  [GameSide.Opponent]: 'opponent-1',
} as const;

function setHexTerrain(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: TerrainType,
  elevation = 0,
): IHexGrid {
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) {
    throw new Error(`Missing test hex ${key}`);
  }

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, terrain, elevation });
  return { ...grid, hexes };
}

function makeUnitState({
  id,
  side,
  position,
}: {
  readonly id: string;
  readonly side: GameSide;
  readonly position: { readonly q: number; readonly r: number };
}): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.Southeast,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

function makeState(): IGameState {
  return {
    gameId: 'visibility-map',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      attacker: makeUnitState({
        id: 'attacker',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
      }),
      target: makeUnitState({
        id: 'target',
        side: GameSide.Opponent,
        position: { q: 3, r: 0 },
      }),
    },
    turnEvents: [],
  };
}

function makeSession(
  currentState: IGameState,
  grid: IHexGrid,
): {
  readonly session: IGameSession;
  readonly visibilityState: IGameState & {
    readonly sideOwners: IGameSession['sideOwners'];
    readonly grid: IHexGrid;
  };
} {
  const config = {
    mapRadius: 4,
    fogOfWar: true,
    turnLimit: 0,
    victoryConditions: [],
    optionalRules: [],
  } as unknown as IGameSession['config'];
  const sideOwners = SIDE_OWNERS as unknown as IGameSession['sideOwners'];
  const session = {
    id: 'session-visibility',
    config,
    currentState,
    units: [],
    events: [],
    sideOwners,
  } as unknown as IGameSession;

  return {
    session,
    visibilityState: {
      ...currentState,
      sideOwners,
      grid,
    },
  };
}

describe('buildGameplayTokens', () => {
  it('uses the battle grid for fog visibility so LOS blockers hide target tokens', () => {
    const currentState = makeState();
    let grid = createMinimalGrid(4);
    grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.HeavyWoods);
    grid = setHexTerrain(grid, { q: 2, r: 0 }, TerrainType.LightWoods);
    const { session, visibilityState } = makeSession(currentState, grid);

    const tokens = buildGameplayTokens({
      currentState,
      config: session.config,
      session,
      unitInfoLookup: {
        attacker: { name: 'Attacker', side: GameSide.Player },
        target: { name: 'Target', side: GameSide.Opponent },
      },
      selectedUnitId: 'attacker',
      validTargetIds: ['target'],
      activeTargetId: 'target',
      playerSide: GameSide.Player,
      localFogPlayerId: 'player-1',
      visibilityState,
    });

    const target = tokens.find((token) => token.unitId === 'target');
    expect(target).toMatchObject({
      fogStatus: 'lastKnown',
      isValidTarget: false,
      isActiveTarget: false,
      lastKnownPosition: { q: 3, r: 0 },
    });
  });

  it('keeps clear-LOS fog targets visible and targetable', () => {
    const currentState = makeState();
    const grid = createMinimalGrid(4);
    const { session, visibilityState } = makeSession(currentState, grid);

    const tokens = buildGameplayTokens({
      currentState,
      config: session.config,
      session,
      unitInfoLookup: {
        attacker: { name: 'Attacker', side: GameSide.Player },
        target: { name: 'Target', side: GameSide.Opponent },
      },
      selectedUnitId: 'attacker',
      validTargetIds: ['target'],
      activeTargetId: 'target',
      playerSide: GameSide.Player,
      localFogPlayerId: 'player-1',
      visibilityState,
    });

    const target = tokens.find((token) => token.unitId === 'target');
    expect(target).toMatchObject({
      isValidTarget: true,
      isActiveTarget: true,
    });
    expect(target?.fogStatus).toBeUndefined();
  });
});
