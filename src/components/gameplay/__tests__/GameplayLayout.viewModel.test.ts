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

describe('buildGameplayTokens fog contact memory (audit 2026-06-09 W5.1a)', () => {
  /**
   * Build a grid whose woods corridor blocks LOS along the +q axis:
   * heavy woods at (1,0) + light woods at (2,0) push the cumulative
   * intervening cover past the LOS threshold, so anything at (3..4, 0)
   * is hidden from an observer at (0,0) while hexes on clear lines
   * (e.g. (0,1), (0,2)) stay visible.
   */
  function makeWoodsGrid(): IHexGrid {
    let grid = createMinimalGrid(4);
    grid = setHexTerrain(grid, { q: 1, r: 0 }, TerrainType.HeavyWoods);
    grid = setHexTerrain(grid, { q: 2, r: 0 }, TerrainType.LightWoods);
    return grid;
  }

  /**
   * Run one buildGameplayTokens pass with the target at `targetPos`,
   * threading the SAME `fogContactMemory` map between calls — the
   * way GameplayLayout threads its per-session memory ref.
   */
  function buildTargetToken(
    targetPos: IHexCoordinate,
    fogContactMemory: Map<string, IHexCoordinate>,
    grid: IHexGrid,
  ) {
    const currentState = makeState();
    currentState.units.target = makeUnitState({
      id: 'target',
      side: GameSide.Opponent,
      position: targetPos,
    });
    const { session, visibilityState } = makeSession(currentState, grid);
    const tokens = buildGameplayTokens({
      currentState,
      config: session.config,
      session,
      unitInfoLookup: {
        attacker: { name: 'Attacker', side: GameSide.Player },
        target: { name: 'Target', side: GameSide.Opponent },
      },
      selectedUnitId: null,
      validTargetIds: [],
      activeTargetId: null,
      playerSide: GameSide.Player,
      localFogPlayerId: 'player-1',
      visibilityState,
      fogContactMemory,
    });
    return tokens.find((token) => token.unitId === 'target');
  }

  it('freezes the ghost at the last observed hex while the contact moves unseen', () => {
    const grid = makeWoodsGrid();
    const fogContactMemory = new Map<string, IHexCoordinate>();

    // 1) Contact observed in the open at (0,1).
    const seen = buildTargetToken({ q: 0, r: 1 }, fogContactMemory, grid);
    expect(seen?.fogStatus).toBeUndefined();

    // 2) Contact slips behind the woods to (3,0) — ghost must freeze
    //    at the last OBSERVED hex (0,1), not the live position.
    const hidden = buildTargetToken({ q: 3, r: 0 }, fogContactMemory, grid);
    expect(hidden).toMatchObject({
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 0, r: 1 },
    });

    // 3) Contact keeps moving while hidden — the ghost must NOT follow.
    const stillHidden = buildTargetToken(
      { q: 4, r: 0 },
      fogContactMemory,
      grid,
    );
    expect(stillHidden).toMatchObject({
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 0, r: 1 },
    });
  });

  it('re-arms the ghost position after the contact is re-acquired', () => {
    const grid = makeWoodsGrid();
    const fogContactMemory = new Map<string, IHexCoordinate>();

    buildTargetToken({ q: 0, r: 1 }, fogContactMemory, grid); // observed
    buildTargetToken({ q: 3, r: 0 }, fogContactMemory, grid); // lost

    // Re-acquired on a clear line at (0,2)…
    const reacquired = buildTargetToken({ q: 0, r: 2 }, fogContactMemory, grid);
    expect(reacquired?.fogStatus).toBeUndefined();

    // …then lost again: the ghost now freezes at the NEW last-seen hex.
    const lostAgain = buildTargetToken({ q: 4, r: 0 }, fogContactMemory, grid);
    expect(lostAgain).toMatchObject({
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 0, r: 2 },
    });
  });

  it('falls back to the live position for a never-observed contact', () => {
    const grid = makeWoodsGrid();
    const fogContactMemory = new Map<string, IHexCoordinate>();

    // Contact starts hidden and was never observed — the only known
    // intel is the deployment-time position, which is what legacy
    // callers (no memory map) also surface.
    const neverSeen = buildTargetToken({ q: 3, r: 0 }, fogContactMemory, grid);
    expect(neverSeen).toMatchObject({
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 3, r: 0 },
    });
  });
});

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
