import {
  Facing,
  MovementType,
  type IHex,
  type IHexCoordinate,
  type IHexGrid,
} from '@/types/gameplay';
import {
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  canPlayerSeeUnit,
  visibleUnitsForPlayer,
} from '@/utils/gameplay/visibility';

type VisibilityTestState = IGameState & {
  readonly grid: IHexGrid;
  readonly sideOwners: Partial<Record<GameSide, string>>;
};

type VisibilityTestUnit = IUnitGameState & {
  readonly sensorRange?: number;
};

const PLAYER_ID = 'pid_a';
const OPPONENT_ID = 'pid_b';

function makeUnit(
  id: string,
  side: GameSide,
  position: IHexCoordinate,
  overrides: Partial<VisibilityTestUnit> = {},
): VisibilityTestUnit {
  return {
    id,
    side,
    position,
    facing: Facing.North,
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
    ...overrides,
  };
}

function makeHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation: number = 0,
): IHex {
  return {
    coord: { q, r },
    occupantId: null,
    terrain,
    elevation,
  };
}

function makeGrid(hexes: readonly IHex[]): IHexGrid {
  const hexMap = new Map<string, IHex>();

  for (const hex of hexes) {
    hexMap.set(coordToKey(hex.coord), hex);
  }

  return {
    config: { radius: 12 },
    hexes: hexMap,
  };
}

function makeClearLineGrid(qMin: number, qMax: number): IHexGrid {
  const hexes: IHex[] = [];

  for (let q = qMin; q <= qMax; q++) {
    hexes.push(makeHex(q, 0));
  }

  return makeGrid(hexes);
}

function makeState(
  units: readonly VisibilityTestUnit[],
  grid: IHexGrid = makeClearLineGrid(0, 12),
): VisibilityTestState {
  const unitMap: Record<string, IUnitGameState> = {};

  for (const unit of units) {
    unitMap[unit.id] = unit;
  }

  return {
    gameId: 'game-visibility',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: unitMap,
    turnEvents: [],
    grid,
    sideOwners: {
      [GameSide.Player]: PLAYER_ID,
      [GameSide.Opponent]: OPPONENT_ID,
    },
  };
}

describe('fog-of-war unit visibility helpers', () => {
  it('returns true for adjacent enemy units with clear LOS', () => {
    const state = makeState([
      makeUnit('player-scout', GameSide.Player, { q: 0, r: 0 }),
      makeUnit('enemy-adjacent', GameSide.Opponent, { q: 1, r: 0 }),
    ]);

    expect(canPlayerSeeUnit(PLAYER_ID, 'enemy-adjacent', state)).toBe(true);
  });

  it('returns false when blocking terrain interrupts LOS', () => {
    const grid = makeGrid([
      makeHex(0, 0),
      makeHex(1, 0, TerrainType.HeavyWoods),
      makeHex(2, 0, TerrainType.LightWoods),
      makeHex(3, 0),
    ]);
    const state = makeState(
      [
        makeUnit('player-scout', GameSide.Player, { q: 0, r: 0 }),
        makeUnit('enemy-hidden', GameSide.Opponent, { q: 3, r: 0 }),
      ],
      grid,
    );

    expect(canPlayerSeeUnit(PLAYER_ID, 'enemy-hidden', state)).toBe(false);
  });

  it('honors the default sensor range boundary', () => {
    const state = makeState([
      makeUnit('player-scout', GameSide.Player, { q: 0, r: 0 }),
      makeUnit('enemy-at-boundary', GameSide.Opponent, { q: 10, r: 0 }),
      makeUnit('enemy-beyond-boundary', GameSide.Opponent, { q: 11, r: 0 }),
    ]);

    expect(canPlayerSeeUnit(PLAYER_ID, 'enemy-at-boundary', state)).toBe(true);
    expect(canPlayerSeeUnit(PLAYER_ID, 'enemy-beyond-boundary', state)).toBe(
      false,
    );
  });

  it('always returns true for own units regardless of combat state', () => {
    const state = makeState([
      makeUnit(
        'own-disabled',
        GameSide.Player,
        { q: 11, r: 0 },
        {
          destroyed: true,
          prone: true,
          shutdown: true,
        },
      ),
    ]);

    expect(canPlayerSeeUnit(PLAYER_ID, 'own-disabled', state)).toBe(true);
  });

  it('returns sorted unique aggregate visible unit ids', () => {
    const state = makeState([
      makeUnit('zeta-own', GameSide.Player, { q: 0, r: 0 }),
      makeUnit('alpha-own', GameSide.Player, { q: 0, r: 1 }),
      makeUnit('beta-enemy', GameSide.Opponent, { q: 1, r: 0 }),
      makeUnit('omega-hidden', GameSide.Opponent, { q: 11, r: 0 }),
    ]);

    expect(visibleUnitsForPlayer(PLAYER_ID, state)).toEqual([
      'alpha-own',
      'beta-enemy',
      'zeta-own',
    ]);
  });
});
