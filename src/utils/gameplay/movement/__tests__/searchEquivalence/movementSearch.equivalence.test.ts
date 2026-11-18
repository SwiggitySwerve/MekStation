/**
 * P3/P4 equivalence corpus: the heap A*, the per-projection search cache and
 * its floods must give exactly what the pre-change code gave. The reference is
 * the frozen origin/main copy in this directory (`reference*.test-helpers.ts`),
 * loaded in an isolated module registry so the reference projection runs the
 * old ground projection and the old linear-scan A* end to end.
 */
import type {
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
  IUnitGameState,
  MovementTravelMode,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { coordToKey, hexesInRange } from '@/utils/gameplay/hexMath';
import {
  type IMovementCostContext,
  calculatePathMovementCost,
} from '@/utils/gameplay/movement/calculations';
import {
  createPathSearchSpace,
  findPath,
  findPathInSearchSpace,
  floodSearchSpace,
  type IFindPathOptions,
} from '@/utils/gameplay/movement/pathfinding';
import { deriveReachableHexes } from '@/utils/gameplay/movement/reachable';

import { findPath as referenceFindPath } from './referencePathfinding.test-helpers';
import {
  BOARD_KINDS,
  corpusBoard,
  corpusMovers,
  corpusUnit,
  integer,
  pick,
  seededRandom,
  type ICorpusBoard,
} from './searchCorpus.test-helpers';

type DeriveReachable = typeof deriveReachableHexes;

function loadReferenceProjection(): DeriveReachable {
  let derive: DeriveReachable | undefined;
  jest.isolateModules(() => {
    jest.doMock('@/utils/gameplay/movement/pathfinding', () => ({
      ...jest.requireActual<object>('@/utils/gameplay/movement/pathfinding'),
      findPath: jest.requireActual<{ findPath: typeof findPath }>(
        './referencePathfinding.test-helpers',
      ).findPath,
    }));
    jest.doMock('@/utils/gameplay/movement/reachableGround', () =>
      jest.requireActual('./referenceReachableGround.test-helpers'),
    );
    derive = jest.requireActual<{ deriveReachableHexes: DeriveReachable }>(
      './referenceReachableEnvelope.test-helpers',
    ).deriveReachableHexes;
  });
  return derive!;
}

const referenceDeriveReachableHexes = loadReferenceProjection();

const SEED = 20261118;
const RADII = [9, 12, 19] as const;
const PATH_MODES: readonly MovementTravelMode[] = [
  'walk',
  'run',
  'tracked',
  'wheeled',
  'hover',
  'naval',
  'jump',
];
const PATH_CONTEXTS: readonly IMovementCostContext[] = [
  {},
  { movementTerrainProfile: 'infantry' },
  {
    declaredMovementType: MovementType.Run,
    pavementRoadBonusProfile: 'tacops_infantry',
    optionalRules: ['tacops_inf_pave_bonus'],
  },
  { optionalRules: ['playtest2'] },
];
const RULE_OPTIONS = [
  {},
  {},
  { optionalRules: ['tacops_inf_pave_bonus'] },
  { optionalRules: ['playtest2'] },
] as const;

function withOccupant(grid: IHexGrid, unit: IUnitGameState): IHexGrid {
  const key = coordToKey(unit.position);
  const hex = grid.hexes.get(key);
  if (!hex || hex.occupantId) return grid;
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, occupantId: unit.id });
  return { ...grid, hexes };
}

function boards(seed: number, count: number): ICorpusBoard[] {
  const random = seededRandom(seed);
  const result: ICorpusBoard[] = [];
  for (let i = 0; i < count; i++) {
    const kind = BOARD_KINDS[i % BOARD_KINDS.length];
    const radius = RADII[Math.floor(i / BOARD_KINDS.length) % RADII.length];
    result.push(corpusBoard(random, kind, radius, integer(random, 0, 10)));
  }
  return result;
}

describe('P3/P4 movement search equivalence corpus', () => {
  const counts = {
    projections: 0,
    rangeHexes: 0,
    reachableHexes: 0,
    paths: 0,
    pathsFound: 0,
    sharedSpacePaths: 0,
    floodChecks: 0,
  };

  afterAll(() => {
    process.stdout.write(`[searchEquivalence] ${JSON.stringify(counts)}\n`);
  });

  it('projects the same range hexes, in the same order, as the reference', () => {
    const random = seededRandom(SEED + 1);
    for (const board of boards(SEED, 36)) {
      for (let unitIndex = 0; unitIndex < 2; unitIndex++) {
        const unit = corpusUnit(random, board);
        const grid = withOccupant(board.grid, unit);
        const movers = corpusMovers(random);
        for (const mover of [pick(random, movers), pick(random, movers)]) {
          for (const mpType of mover.mpTypes) {
            const ruleOptions = pick(random, RULE_OPTIONS);
            const standUpMode = random() < 0.5 ? 'normal' : 'careful';
            const actual = deriveReachableHexes(
              unit,
              mpType,
              grid,
              mover.capability,
              standUpMode,
              ruleOptions,
            );
            const expected = referenceDeriveReachableHexes(
              unit,
              mpType,
              grid,
              mover.capability,
              standUpMode,
              ruleOptions,
            );
            expectSameProjection(actual, expected, {
              board: `${board.kind} r${board.radius}`,
              mover: mover.label,
              mpType,
              position: unit.position,
            });
            counts.projections++;
            counts.rangeHexes += expected.length;
            counts.reachableHexes += expected.filter((h) => h.reachable).length;
          }
        }
      }
    }
    expect(counts.projections).toBeGreaterThan(200);
    expect(counts.rangeHexes).toBeGreaterThan(5000);
  });

  it('finds the same path as the reference A* for sampled origin and destination pairs', () => {
    const random = seededRandom(SEED + 2);
    for (const board of boards(SEED + 3, 18)) {
      const cells = hexesInRange({ q: 0, r: 0 }, board.radius);
      for (let originIndex = 0; originIndex < 4; originIndex++) {
        const start = pick(random, cells);
        const movementType = pick(random, PATH_MODES);
        const context = pick(random, PATH_CONTEXTS);
        const space = createPathSearchSpace(
          board.grid,
          start,
          movementType,
          context,
        );
        for (let pairIndex = 0; pairIndex < 40; pairIndex++) {
          const end =
            pairIndex % 8 === 0
              ? start
              : pick(random, hexesInRange(start, integer(random, 1, 14)));
          const maxCost = pick(random, [
            Infinity,
            Number.MAX_SAFE_INTEGER,
            integer(random, 1, 6),
            integer(random, 4, 16),
          ]);
          const options: IFindPathOptions | undefined =
            random() < 0.3
              ? { requirePavementRoadBonusSurface: true }
              : undefined;
          const expected = referenceFindPath({
            grid: board.grid,
            start,
            end,
            maxCost,
            movementType,
            context,
            options,
          });
          const label = {
            board: board.kind,
            start,
            end,
            maxCost,
            movementType,
          };
          expect({
            label,
            path: findPath({
              grid: board.grid,
              start,
              end,
              maxCost,
              movementType,
              context,
              options,
            }),
          }).toEqual({ label, path: expected });
          expect({
            label,
            path: findPathInSearchSpace(space, end, maxCost, options),
          }).toEqual({ label, path: expected });
          counts.paths++;
          counts.sharedSpacePaths++;
          if (expected) counts.pathsFound++;
        }
      }
    }
    expect(counts.paths).toBeGreaterThan(2500);
    expect(counts.pathsFound).toBeGreaterThan(1000);
  });

  it('floods reach exactly the destinations the reference A* reaches, at the A* path cost', () => {
    const random = seededRandom(SEED + 4);
    for (const board of boards(SEED + 5, 12)) {
      const cells = hexesInRange({ q: 0, r: 0 }, board.radius);
      const start = pick(random, cells);
      const movementType = pick(random, PATH_MODES);
      const context = pick(random, PATH_CONTEXTS);
      const maxCost = pick(random, [
        integer(random, 2, 12),
        Number.MAX_SAFE_INTEGER,
      ]);
      const options: IFindPathOptions | undefined =
        random() < 0.3 ? { requirePavementRoadBonusSurface: true } : undefined;
      const flood = floodSearchSpace(
        createPathSearchSpace(board.grid, start, movementType, context),
        maxCost,
        options,
      );
      for (const end of hexesInRange(start, Math.min(board.radius, 10))) {
        if (!board.grid.hexes.has(coordToKey(end))) continue;
        const expected = referenceFindPath({
          grid: board.grid,
          start,
          end,
          maxCost,
          movementType,
          context,
          options,
        });
        const label = { board: board.kind, start, end, maxCost, movementType };
        const cost = expected
          ? calculatePathMovementCost(
              board.grid,
              expected,
              movementType,
              context,
            )
          : undefined;
        expect({ label, cost: flood.get(coordToKey(end)) }).toEqual({
          label,
          cost,
        });
        counts.floodChecks++;
      }
    }
    expect(counts.floodChecks).toBeGreaterThan(2000);
  });
});

function expectSameProjection(
  actual: readonly IMovementRangeHex[],
  expected: readonly IMovementRangeHex[],
  label: {
    readonly board: string;
    readonly mover: string;
    readonly mpType: MovementType;
    readonly position: IHexCoordinate;
  },
): void {
  // Labelled so a failure names the scenario, not just a diff.
  expect({ label, hexes: actual }).toStrictEqual({ label, hexes: expected });
}
