import type {
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey, hexesInRange } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

export type BoardKind = 'clear' | 'woods' | 'elevation' | 'buildings' | 'water';
export const BOARD_KINDS: readonly BoardKind[] = [
  'clear',
  'woods',
  'elevation',
  'buildings',
  'water',
];

export type Rng = () => number;

/** mulberry32: small seeded PRNG so every run sees the same boards. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function makeBoard(kind: BoardKind, rng: Rng, radius: number): IHexGrid {
  const grid = createHexGrid({ radius });
  for (const [key, hex] of Array.from(grid.hexes)) {
    const roll = rng();
    switch (kind) {
      case 'clear':
        break;
      case 'woods':
        if (roll < 0.35) {
          grid.hexes.set(key, {
            ...hex,
            terrain:
              roll < 0.15 ? TerrainType.HeavyWoods : TerrainType.LightWoods,
          });
        }
        break;
      case 'elevation':
        grid.hexes.set(key, { ...hex, elevation: Math.floor(rng() * 6) - 1 });
        break;
      case 'buildings':
        if (roll < 0.25) {
          grid.hexes.set(key, {
            ...hex,
            elevation: Math.floor(rng() * 2),
            terrain: terrainStringFromFeatures([
              {
                type: TerrainType.Building,
                level: 1 + Math.floor(rng() * 3),
                constructionFactor: 40,
              },
            ]),
          });
        }
        break;
      case 'water':
        if (roll < 0.3) {
          grid.hexes.set(key, {
            ...hex,
            terrain: terrainStringFromFeatures([
              { type: TerrainType.Water, level: 1 + Math.floor(rng() * 2) },
            ]),
          });
        } else if (roll < 0.4) {
          grid.hexes.set(key, { ...hex, terrain: TerrainType.LightWoods });
        }
        break;
    }
  }
  return grid;
}

export const WEAPON_TEMPLATES: readonly IWeaponStatus[] = [
  {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
  },
  {
    id: 'lrm-10',
    name: 'LRM 10',
    location: 'left_torso',
    destroyed: false,
    firedThisTurn: false,
    heat: 4,
    damage: 10,
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
  },
  {
    id: 'ppc',
    name: 'PPC',
    location: 'left_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 10,
    damage: 10,
    ranges: { minimum: 3, short: 6, medium: 12, long: 18 },
  },
  {
    id: 'ac-20',
    name: 'AC/20',
    location: 'right_torso',
    destroyed: false,
    firedThisTurn: false,
    heat: 7,
    damage: 20,
    ranges: { short: 3, medium: 6, long: 9 },
  },
  {
    id: 'rear-small-laser',
    name: 'Small Laser (R)',
    location: 'center_torso',
    mountingArc: FiringArc.Rear,
    destroyed: false,
    firedThisTurn: false,
    heat: 1,
    damage: 3,
    ranges: { short: 1, medium: 2, long: 3 },
  },
];

export function makeWeapons(rng: Rng): IWeaponStatus[] {
  const weapons = WEAPON_TEMPLATES.filter(() => rng() < 0.7).map((weapon) =>
    rng() < 0.1 ? { ...weapon, destroyed: true } : weapon,
  );
  return weapons.length > 0 ? weapons : [WEAPON_TEMPLATES[0]];
}

export function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

export interface IUnitSpec {
  readonly unitId: string;
  readonly side: GameSide;
  readonly position: IHexCoordinate;
  readonly facing: Facing;
  readonly movementThisTurn: MovementType;
  readonly hexesMovedThisTurn: number;
  readonly prone: boolean;
  readonly destroyed: boolean;
  readonly fogStatus?: 'visible' | 'hidden' | 'lastKnown';
  readonly lastKnownPosition?: IHexCoordinate;
}

export function makeCombatState(units: readonly IUnitSpec[]): IGameState {
  return {
    gameId: 'combat-projection-shared',
    status: GameStatus.Active,
    turn: 2,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    turnEvents: [],
    units: Object.fromEntries(
      units.map((unit) => [
        unit.unitId,
        {
          id: unit.unitId,
          side: unit.side,
          position: unit.position,
          facing: unit.facing,
          heat: 0,
          movementThisTurn: unit.movementThisTurn,
          hexesMovedThisTurn: unit.hexesMovedThisTurn,
          prone: unit.prone,
          destroyed: unit.destroyed,
          shutdown: false,
          hasRetreated: false,
          gunnery: 4,
        },
      ]),
    ) as IGameState['units'],
  };
}

export function tokensFor(
  units: readonly IUnitSpec[],
  selectedUnitId: string,
): IUnitToken[] {
  return units.map((unit) =>
    makeToken({
      unitId: unit.unitId,
      name: unit.unitId,
      side: unit.side,
      position: unit.position,
      facing: unit.facing,
      isDestroyed: unit.destroyed,
      isSelected: unit.unitId === selectedUnitId,
      ...(unit.fogStatus ? { fogStatus: unit.fogStatus } : {}),
      ...(unit.lastKnownPosition
        ? { lastKnownPosition: unit.lastKnownPosition }
        : {}),
    }),
  );
}

const FACINGS = [
  Facing.North,
  Facing.Northeast,
  Facing.Southeast,
  Facing.South,
  Facing.Southwest,
  Facing.Northwest,
];
const MOVES = [
  MovementType.Stationary,
  MovementType.Walk,
  MovementType.Run,
  MovementType.Jump,
];

/** One attacker and three to five enemies; some stacked, fogged or destroyed. */
export function makeUnits(rng: Rng, radius: number): IUnitSpec[] {
  const coords = hexesInRange({ q: 0, r: 0 }, radius);
  const unit = (unitId: string, side: GameSide): IUnitSpec => ({
    unitId,
    side,
    position: pick(rng, coords),
    facing: pick(rng, FACINGS),
    movementThisTurn: pick(rng, MOVES),
    hexesMovedThisTurn: Math.floor(rng() * 6),
    prone: rng() < 0.1,
    destroyed: side === GameSide.Opponent && rng() < 0.1,
  });
  const units = [unit('attacker', GameSide.Player)];
  const enemies = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < enemies; i++) {
    const enemy = unit(`enemy-${i}`, GameSide.Opponent);
    const roll = rng();
    if (i > 0 && roll < 0.2) {
      // Stacked with the previous enemy.
      units.push({ ...enemy, position: units[units.length - 1].position });
    } else if (roll < 0.3) {
      units.push({ ...enemy, fogStatus: 'hidden' });
    } else if (roll < 0.4) {
      units.push({
        ...enemy,
        fogStatus: 'lastKnown',
        lastKnownPosition: pick(rng, coords),
      });
    } else {
      units.push(enemy);
    }
  }
  if (rng() < 0.15) {
    units.push(unit('friend', GameSide.Player));
  }
  return units;
}

export function allHexes(grid: IHexGrid): IHexCoordinate[] {
  return Array.from(grid.hexes.values(), (hex) => hex.coord);
}

export { coordToKey };
