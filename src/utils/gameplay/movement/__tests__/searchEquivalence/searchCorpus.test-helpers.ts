import type {
  Facing,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
} from '@/types/gameplay';

import { MovementType, TerrainType } from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey, hexesInRange } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { makeUnitAtOrigin } from '../reachable.test-helpers';

/** Seeded PRNG (mulberry32): the corpus is the same on every run. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Random = () => number;

export const pick = <T>(random: Random, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];

export const integer = (random: Random, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

export const BOARD_KINDS = [
  'clear',
  'wooded',
  'mixed',
  'elevation',
  'water',
  'urban',
] as const;
export type BoardKind = (typeof BOARD_KINDS)[number];

type Feature = { readonly type: TerrainType; readonly level: number };

const MIXED_FEATURES: readonly (readonly Feature[])[] = [
  [],
  [],
  [{ type: TerrainType.LightWoods, level: 1 }],
  [{ type: TerrainType.HeavyWoods, level: 2 }],
  [{ type: TerrainType.Rough, level: 1 }],
  [{ type: TerrainType.Rubble, level: 1 }],
  [{ type: TerrainType.Water, level: 1 }],
  [{ type: TerrainType.Water, level: 2 }],
  [{ type: TerrainType.Water, level: 3 }],
  [{ type: TerrainType.Mud, level: 1 }],
  [{ type: TerrainType.Swamp, level: 1 }],
  [{ type: TerrainType.Sand, level: 1 }],
  [{ type: TerrainType.Snow, level: 1 }],
  [{ type: TerrainType.Ice, level: 1 }],
  [{ type: TerrainType.Pavement, level: 0 }],
  [{ type: TerrainType.Road, level: 0 }],
  [{ type: TerrainType.Building, level: 1 }],
  [{ type: TerrainType.Building, level: 3 }],
  [
    { type: TerrainType.Rough, level: 1 },
    { type: TerrainType.LightWoods, level: 1 },
  ],
  [
    { type: TerrainType.Water, level: 1 },
    { type: TerrainType.Ice, level: 1 },
  ],
];

function hexFeatures(
  random: Random,
  kind: BoardKind,
  coord: IHexCoordinate,
): readonly Feature[] {
  switch (kind) {
    case 'clear':
      return [];
    case 'wooded': {
      const roll = random();
      if (roll < 0.35) return [{ type: TerrainType.HeavyWoods, level: 2 }];
      if (roll < 0.7) return [{ type: TerrainType.LightWoods, level: 1 }];
      return [];
    }
    case 'mixed':
      return pick(random, MIXED_FEATURES);
    case 'elevation':
      return random() < 0.25
        ? [{ type: TerrainType.LightWoods, level: 1 }]
        : [];
    case 'water': {
      const roll = random();
      if (roll < 0.45) {
        return [{ type: TerrainType.Water, level: integer(random, 1, 3) }];
      }
      return roll < 0.55 ? [{ type: TerrainType.Rough, level: 1 }] : [];
    }
    case 'urban': {
      const onRoad = coord.q % 4 === 0 || coord.r % 5 === 0;
      if (onRoad) {
        return [
          {
            type: random() < 0.5 ? TerrainType.Road : TerrainType.Pavement,
            level: 0,
          },
        ];
      }
      return random() < 0.4
        ? [{ type: TerrainType.Building, level: integer(random, 1, 3) }]
        : [{ type: TerrainType.Rubble, level: 1 }];
    }
  }
}

function hexElevation(random: Random, kind: BoardKind): number {
  switch (kind) {
    case 'elevation':
      return integer(random, -1, 4);
    case 'mixed':
      return random() < 0.3 ? integer(random, -1, 2) : 0;
    case 'urban':
      return random() < 0.1 ? 1 : 0;
    default:
      return 0;
  }
}

export interface ICorpusBoard {
  readonly kind: BoardKind;
  readonly radius: number;
  readonly grid: IHexGrid;
  readonly occupied: readonly IHexCoordinate[];
}

/** A seeded board: terrain, elevation and up to `occupants` occupied hexes. */
export function corpusBoard(
  random: Random,
  kind: BoardKind,
  radius: number,
  occupants: number,
): ICorpusBoard {
  const base = createHexGrid({ radius });
  const hexes = new Map<string, IHex>();
  for (const [key, hex] of Array.from(base.hexes.entries())) {
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(hexFeatures(random, kind, hex.coord)),
      elevation: hexElevation(random, kind),
    });
  }
  const all = hexesInRange({ q: 0, r: 0 }, radius);
  const occupied: IHexCoordinate[] = [];
  for (let i = 0; i < occupants; i++) {
    const coord = pick(random, all);
    const key = coordToKey(coord);
    hexes.set(key, { ...hexes.get(key)!, occupantId: `other-${i}` });
    occupied.push(coord);
  }
  return { kind, radius, grid: { ...base, hexes }, occupied };
}

export interface ICorpusMover {
  readonly label: string;
  readonly capability: IMovementCapability;
  readonly mpTypes: readonly MovementType[];
}

/** Movement profiles the projection supports, with their legal MP types. */
export function corpusMovers(random: Random): readonly ICorpusMover[] {
  const walkMP = integer(random, 2, 8);
  const runMP = Math.ceil(walkMP * 1.5);
  return [
    {
      label: 'biped mek',
      capability: {
        walkMP,
        runMP,
        sprintMP: walkMP * 2,
        jumpMP: integer(random, 0, 6),
        movementHeatProfile: 'mek',
      },
      mpTypes: [
        MovementType.Walk,
        MovementType.Run,
        MovementType.Sprint,
        MovementType.Evade,
        MovementType.Jump,
      ],
    },
    {
      label: 'tracked',
      capability: { walkMP, runMP, jumpMP: 0, movementMode: 'tracked' },
      mpTypes: [MovementType.Walk, MovementType.Run],
    },
    {
      label: 'wheeled',
      capability: { walkMP, runMP, jumpMP: 0, movementMode: 'wheeled' },
      mpTypes: [MovementType.Walk, MovementType.Run],
    },
    {
      label: 'hover',
      capability: { walkMP, runMP, jumpMP: 0, movementMode: 'hover' },
      mpTypes: [MovementType.Walk, MovementType.Run],
    },
    {
      label: 'foot infantry',
      capability: {
        walkMP: 1,
        runMP: 1,
        jumpMP: 0,
        movementMode: 'walk',
        movementTerrainProfile: 'infantry',
        pavementRoadBonusProfile: 'tacops_infantry',
      },
      mpTypes: [MovementType.Walk],
    },
    {
      label: 'naval',
      capability: { walkMP, runMP, jumpMP: 0, movementMode: 'naval' },
      mpTypes: [MovementType.Walk, MovementType.Run],
    },
  ];
}

/** A unit at a seeded position and facing, sometimes prone, hull-down or hot. */
export function corpusUnit(
  random: Random,
  board: ICorpusBoard,
): IUnitGameState {
  const reach = Math.max(0, board.radius - 2);
  const position = pick(random, hexesInRange({ q: 0, r: 0 }, reach));
  const posture = random();
  return {
    ...makeUnitAtOrigin(),
    position,
    facing: integer(random, 0, 5) as Facing,
    heat: random() < 0.2 ? integer(random, 5, 15) : 0,
    prone: posture < 0.1,
    hullDown: posture >= 0.1 && posture < 0.15,
  };
}
