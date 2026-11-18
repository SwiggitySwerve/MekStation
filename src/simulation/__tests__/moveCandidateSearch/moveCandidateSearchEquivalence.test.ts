import type {
  Facing,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
  MovementMotiveMode,
} from '@/types/gameplay';
import type { IMovementCostContext } from '@/utils/gameplay/movement';

import { MovementType } from '@/types/gameplay';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { getMaxMP } from '@/utils/gameplay/movement';

import type { IMove } from '../../ai/types';

import { getValidMoveCandidates } from '../../ai/MoveAI.movement';
import { SeededRandom } from '../../core/SeededRandom';
import { moveCandidatesAtBase } from './moveCandidatesAtBase.test-helpers';

/**
 * The bounded candidate search (one flood at maxMP, then the same unbounded
 * A* per surviving destination) must return exactly the ordered move list of
 * the unbounded search frozen at bc5090609, on seeded boards of every terrain
 * family, for every movement type, motive mode and cost context.
 */

const RADIUS = 7;
const BOARDS_PER_KIND = 3;

type BoardKind =
  | 'clear'
  | 'wooded'
  | 'mixed'
  | 'elevation'
  | 'water'
  | 'urban'
  | 'roads';

const BOARD_KINDS: readonly BoardKind[] = [
  'clear',
  'wooded',
  'mixed',
  'elevation',
  'water',
  'urban',
  'roads',
];

const MOVEMENT_TYPES: readonly MovementType[] = [
  MovementType.Stationary,
  MovementType.Walk,
  MovementType.Run,
  MovementType.Sprint,
  MovementType.Evade,
  MovementType.Jump,
];

const MOTIVE_MODES: readonly MovementMotiveMode[] = [
  'walk',
  'tracked',
  'wheeled',
  'hover',
  'vtol',
  'naval',
  'hydrofoil',
  'submarine',
  'umu',
  'biped_swim',
  'quad_swim',
  'wige',
  'rail',
  'maglev',
];

const CONTEXTS: readonly (IMovementCostContext | undefined)[] = [
  undefined,
  { pilotAbilities: ['tm_mountaineer', 'tm_forest_ranger'] },
  { movementTerrainProfile: 'infantry' },
  {
    movementTerrainProfile: 'infantry',
    pavementRoadBonusProfile: 'tacops_infantry',
  },
  { waterCapability: { fullyAmphibious: true } },
  {
    waterCapability: { limitedAmphibious: true, frogmanSpecialist: true },
    pilotAbilities: ['tm_frogman'],
  },
  { waterCapability: { flotationHull: true } },
  { declaredMovementType: MovementType.Run, isFirstStep: false },
  {
    environmentalConditions: createEnvironmentalConditions({ light: 'night' }),
    optionalRules: ['tacops_run_through_woods'],
    pilotAbilities: ['tm_nightwalker'],
  },
  { unitHeight: 2, pilotAbilities: ['tm_swamp_beast'] },
];

function terrain(...features: [string, number][]): string {
  if (features.length === 1 && features[0][1] === 1) return features[0][0];
  return JSON.stringify(features.map(([type, level]) => ({ type, level })));
}

function pick<T>(random: SeededRandom, items: readonly T[]): T {
  return items[random.nextInt(items.length)];
}

function hexFor(
  kind: BoardKind,
  random: SeededRandom,
): Pick<IHex, 'terrain' | 'elevation'> {
  const roll = random.next();
  switch (kind) {
    case 'clear':
      return { terrain: 'clear', elevation: 0 };
    case 'wooded':
      return {
        terrain:
          roll < 0.35
            ? 'light_woods'
            : roll < 0.6
              ? 'heavy_woods'
              : roll < 0.65
                ? terrain(['heavy_woods', 3])
                : 'clear',
        elevation: 0,
      };
    case 'mixed':
      return {
        terrain: pick(random, [
          'clear',
          'clear',
          'rough',
          'rubble',
          'sand',
          'mud',
          'snow',
          'ice',
          'swamp',
          'planted_field',
          'light_woods',
          terrain(['rough', 1], ['light_woods', 1]),
          terrain(['water', 1], ['ice', 1]),
          'heavy_industrial',
        ]),
        elevation: random.nextInt(2),
      };
    case 'elevation':
      return {
        terrain: roll < 0.2 ? 'light_woods' : 'clear',
        elevation: random.nextInt(7) - 2,
      };
    case 'water': {
      if (roll < 0.45) {
        const depth = 1 + random.nextInt(3);
        return { terrain: terrain(['water', depth]), elevation: -depth };
      }
      return { terrain: roll < 0.55 ? 'swamp' : 'clear', elevation: 0 };
    }
    case 'urban':
      return roll < 0.4
        ? {
            terrain: terrain(['building', 1 + random.nextInt(3)]),
            elevation: 0,
          }
        : {
            terrain: roll < 0.8 ? 'pavement' : 'rubble',
            elevation: 0,
          };
    case 'roads':
      return {
        terrain:
          roll < 0.3 ? 'heavy_woods' : roll < 0.5 ? 'rough' : 'light_woods',
        elevation: random.nextInt(2),
      };
  }
}

function seededBoard(kind: BoardKind, seed: number): IHexGrid {
  const random = new SeededRandom(seed);
  const hexes = new Map<string, IHex>();
  for (let q = -RADIUS; q <= RADIUS; q++) {
    for (let r = -RADIUS; r <= RADIUS; r++) {
      if (Math.abs(q + r) > RADIUS) continue;
      const roadLine = kind === 'roads' && (q === 0 || r === 1 || q + r === -2);
      const base = hexFor(kind, random);
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: random.next() < 0.15 ? `occupant-${q},${r}` : null,
        terrain: roadLine
          ? random.next() < 0.5
            ? 'road'
            : 'pavement'
          : base.terrain,
        elevation: base.elevation,
      });
    }
  }
  return { config: { radius: RADIUS }, hexes };
}

/** Centre, every corner and edge midpoint of the map, and seeded hexes. */
function originsFor(grid: IHexGrid, random: SeededRandom): IHexCoordinate[] {
  const R = RADIUS;
  const fixed: IHexCoordinate[] = [
    { q: 0, r: 0 },
    { q: R, r: 0 },
    { q: -R, r: 0 },
    { q: 0, r: R },
    { q: 0, r: -R },
    { q: R, r: -R },
    { q: -R, r: R },
    { q: 3, r: -R },
    { q: -R, r: 4 },
  ];
  const keys = [...grid.hexes.keys()];
  for (let i = 0; i < 4; i++) {
    const [q, r] = pick(random, keys).split(',').map(Number);
    fixed.push({ q, r });
  }
  return fixed;
}

/** The moving unit occupies its own hex, as `gridWithUnitOccupants` places it. */
function withMover(grid: IHexGrid, origin: IHexCoordinate): IHexGrid {
  const key = `${origin.q},${origin.r}`;
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error(`origin ${key} is off the board`);
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, occupantId: 'mover' });
  return { ...grid, hexes };
}

interface IComparison {
  readonly grid: IHexGrid;
  readonly position: IUnitPosition;
  readonly movementType: MovementType;
  readonly capability: IMovementCapability;
  readonly context: IMovementCostContext | undefined;
}

function comparisonsFor(kind: BoardKind): IComparison[] {
  const comparisons: IComparison[] = [];
  for (let board = 0; board < BOARDS_PER_KIND; board++) {
    const seed = 6_000 + BOARD_KINDS.indexOf(kind) * 100 + board;
    const random = new SeededRandom(seed + 50);
    const grid = seededBoard(kind, seed);
    for (const origin of originsFor(grid, random)) {
      const boardWithMover = withMover(grid, origin);
      for (const movementType of MOVEMENT_TYPES) {
        for (let facingDraw = 0; facingDraw < 2; facingDraw++) {
          const walkMP = 1 + random.nextInt(7);
          const capability: IMovementCapability = {
            walkMP,
            runMP: Math.ceil(walkMP * 1.5),
            jumpMP: random.nextInt(7),
            movementMode: pick(random, MOTIVE_MODES),
            ...(random.next() < 0.3 ? { movementHeatProfile: 'none' } : {}),
            ...(random.next() < 0.2 ? { partialWingJumpBonus: 1 } : {}),
          };
          comparisons.push({
            grid: boardWithMover,
            position: {
              unitId: 'mover',
              coord: origin,
              facing: random.nextInt(6) as Facing,
              prone: false,
            },
            movementType,
            capability,
            context: pick(random, CONTEXTS),
          });
        }
      }
    }
  }
  return comparisons;
}

/** In-bounds, unoccupied hexes of the candidate square with no move in `moves`. */
function countOpenDestinationsWithoutMove(
  c: IComparison,
  moves: readonly IMove[],
): number {
  const maxMP = getMaxMP(c.capability, c.movementType);
  const withMove = new Set(
    moves.map((m) => `${m.destination.q},${m.destination.r}`),
  );
  let count = 0;
  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      const key = `${c.position.coord.q + dq},${c.position.coord.r + dr}`;
      const hex = c.grid.hexes.get(key);
      if (!hex || hex.occupantId !== null || withMove.has(key)) continue;
      count++;
    }
  }
  return count;
}

describe('bounded move candidate search equals the unbounded search at bc5090609', () => {
  it.each(BOARD_KINDS.map((kind) => [kind, comparisonsFor(kind)] as const))(
    '%s boards: ordered candidate lists are deep-equal',
    (_kind, comparisons) => {
      let movesCompared = 0;
      let openDestinationsWithoutMove = 0;
      for (const c of comparisons) {
        const expected = moveCandidatesAtBase(
          c.grid,
          c.position,
          c.movementType,
          c.capability,
          c.context,
        );
        const actual = getValidMoveCandidates(
          c.grid,
          c.position,
          c.movementType,
          c.capability,
          c.context,
        );
        expect(actual).toStrictEqual(expected);
        movesCompared += expected.length;
        if (c.movementType !== MovementType.Jump) {
          openDestinationsWithoutMove += countOpenDestinationsWithoutMove(
            c,
            expected,
          );
        }
      }
      expect(comparisons.length).toBe(
        BOARDS_PER_KIND * 13 * MOVEMENT_TYPES.length * 2,
      );
      expect(movesCompared).toBeGreaterThan(0);
      // The boards exercise the skip: open hexes in the candidate square that
      // the unbounded search priced and found no move for.
      expect(openDestinationsWithoutMove).toBeGreaterThan(0);
    },
  );
});
