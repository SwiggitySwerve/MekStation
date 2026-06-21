import type {
  IGameState,
  IHexGrid,
  IHexTerrain,
  IMovementRangeHex,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { facingForPathEnd } from '@/utils/gameplay/movement/eventPath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

type TacticalMapUnitStateInput = Pick<
  IUnitGameState,
  'id' | 'side' | 'position' | 'facing'
> &
  Partial<Omit<IUnitGameState, 'id' | 'side' | 'position' | 'facing'>>;

type TacticalMapGameStateInput = Partial<
  Omit<
    IGameState,
    'gameId' | 'status' | 'turn' | 'phase' | 'activationIndex' | 'turnEvents'
  >
> & {
  readonly gameId?: string;
  readonly status?: GameStatus;
  readonly turn?: number;
  readonly phase?: GamePhase;
  readonly activationIndex?: number;
  readonly turnEvents?: IGameState['turnEvents'];
  readonly units: IGameState['units'];
};

type TacticalMapMechTokenInput = Pick<
  IUnitToken,
  'unitId' | 'name' | 'designation' | 'position'
> &
  Partial<Omit<IUnitToken, 'unitId' | 'name' | 'designation' | 'position'>>;

type TacticalMapTokenOverride =
  | Partial<IUnitToken>
  | ((token: IUnitToken) => IUnitToken);

export function createTacticalMapUnitState(
  input: TacticalMapUnitStateInput,
): IUnitGameState {
  const { id, side, position, facing, ...overrides } = input;

  return {
    id,
    side,
    position,
    facing,
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

export function createTacticalMapUnitStateFromToken(
  token: IUnitToken,
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return createTacticalMapUnitState({
    id: token.unitId,
    side: token.side,
    position: token.position,
    facing: token.facing,
    destroyed: token.isDestroyed,
    ...overrides,
  });
}

export function createTacticalMapGameState(
  input: TacticalMapGameStateInput,
): IGameState {
  const {
    gameId = 'tactical-map-e2e',
    status = GameStatus.Active,
    turn = 1,
    phase = GamePhase.WeaponAttack,
    activationIndex = 0,
    turnEvents = [],
    units,
    ...overrides
  } = input;

  return {
    gameId,
    status,
    turn,
    phase,
    activationIndex,
    turnEvents,
    units,
    ...overrides,
  };
}

export function createTacticalMapGameStateForTokens(
  tokens: readonly IUnitToken[],
  input: Omit<TacticalMapGameStateInput, 'units'> & {
    readonly unitOverrides?: (
      token: IUnitToken,
    ) => Partial<IUnitGameState> | undefined;
    readonly units?: IGameState['units'];
  } = {},
): IGameState {
  const { unitOverrides, units = {}, ...gameStateInput } = input;

  return createTacticalMapGameState({
    ...gameStateInput,
    units: {
      ...Object.fromEntries(
        tokens.map((token) => [
          token.unitId,
          createTacticalMapUnitStateFromToken(
            token,
            unitOverrides?.(token) ?? {},
          ),
        ]),
      ),
      ...units,
    },
  });
}

export function createTacticalMapMechToken(
  input: TacticalMapMechTokenInput,
): IUnitToken {
  return {
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    unitType: TokenUnitType.Mech,
    ...input,
  } as IUnitToken;
}

export function createTacticalMapPlayerMechToken(
  input: TacticalMapMechTokenInput,
): IUnitToken {
  return createTacticalMapMechToken({
    facing: Facing.Northeast,
    side: GameSide.Player,
    isSelected: true,
    isValidTarget: false,
    ...input,
  });
}

export function overrideTacticalMapTokens(
  tokens: readonly IUnitToken[],
  overrides: Readonly<Record<string, TacticalMapTokenOverride>>,
): readonly IUnitToken[] {
  return tokens.map((token) => {
    const override = overrides[token.unitId];
    if (!override) return token;
    if (typeof override === 'function') return override(token);
    return { ...token, ...override } as IUnitToken;
  });
}

export function createTacticalMapTerrainGrid(
  terrainOverrides: readonly IHexTerrain[],
  options: {
    readonly radius?: number;
    readonly missingHexLabel?: string;
  } = {},
): IHexGrid {
  const grid = createHexGrid({ radius: options.radius ?? 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of terrainOverrides) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);

    if (!hex) {
      throw new Error(
        `Missing ${options.missingHexLabel ?? 'tactical-map fixture'} hex ${key}`,
      );
    }

    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

export function requireTacticalMapMovementProjection(
  projection: IMovementRangeHex | null,
  label = 'tactical-map',
): IMovementRangeHex {
  if (!projection) {
    throw new Error(`Expected ${label} movement projection`);
  }

  return projection;
}

export function facingForTacticalMapProjection(
  projection: IMovementRangeHex | null | undefined,
  fallback: Facing,
): Facing {
  return facingForPathEnd(projection?.path ?? [], fallback);
}
