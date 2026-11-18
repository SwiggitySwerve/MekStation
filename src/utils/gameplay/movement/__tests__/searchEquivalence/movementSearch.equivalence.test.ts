/**
 * P3/P4 equivalence corpus: the heap A*, the per-projection search cache and
 * its floods must give exactly what the pre-change code gave. The reference is
 * the frozen origin/main copy in this directory (`reference*.test-helpers.ts`),
 * loaded in an isolated module registry so the reference projection runs the
 * old ground projection and the old linear-scan A* end to end.
 *
 * Coverage classes: 8 board kinds, 16 travel modes, 15 movers, 9 cost-context
 * classes and 8 projection-context classes. The default run rotates through
 * them so every class gets at least one board; `P34_CORPUS_FULL=1` runs the
 * cross products instead. Each test asserts its classes were all covered.
 */
import type {
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
  IUnitGameState,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { coordToKey, hexesInRange } from '@/utils/gameplay/hexMath';
import { calculatePathMovementCost } from '@/utils/gameplay/movement/calculations';
import {
  createPathSearchSpace,
  findPath,
  findPathInSearchSpace,
  floodSearchSpace,
  type IFindPathOptions,
} from '@/utils/gameplay/movement/pathfinding';
import {
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
} from '@/utils/gameplay/movement/reachable';

import { findPath as referenceFindPath } from './referencePathfinding.test-helpers';
import {
  BOARD_KINDS,
  corpusBoard,
  corpusMovers,
  corpusUnit,
  integer,
  OVERLAY_CONTEXT_CLASSES,
  PATH_CONTEXT_CLASSES,
  pick,
  seededRandom,
  TRAVEL_MODES,
  type BoardKind,
  type ICorpusMover,
  type IOverlayContextClass,
  type Random,
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

const FULL = process.env.P34_CORPUS_FULL === '1';
const SEED = 20261118;
const MOVER_LABELS = corpusMovers(seededRandom(0)).map((mover) => mover.label);

/** Per-test, per-class counts, printed after the run and checked for gaps. */
const counts: Record<string, Record<string, number>> = {};
function tally(test: string, cls: string, by = 1): void {
  const row = (counts[test] ??= {});
  row[cls] = (row[cls] ?? 0) + by;
}
function expectEveryClass(
  test: string,
  prefix: string,
  labels: readonly string[],
): void {
  const missing = labels.filter((l) => !counts[test]?.[`${prefix}:${l}`]);
  expect({ test, prefix, missing }).toEqual({ test, prefix, missing: [] });
}

function withOccupant(grid: IHexGrid, unit: IUnitGameState): IHexGrid {
  const key = coordToKey(unit.position);
  const hex = grid.hexes.get(key);
  if (!hex || hex.occupantId) return grid;
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, occupantId: unit.id });
  return { ...grid, hexes };
}

interface IOverlayScenario {
  readonly kind: BoardKind;
  readonly radius: number;
  readonly moverIndex: number;
  readonly contextIndex: number;
}

/**
 * Default: each mover on three boards whose kind and context rotate, plus four
 * harness-sized radius-19 boards. Full: mover x kind x context at radius 9,
 * then the same at radius 12 and 19 for the original Mek and vehicle movers.
 */
function overlayScenarios(): IOverlayScenario[] {
  const scenarios: IOverlayScenario[] = [];
  const kinds = BOARD_KINDS.length;
  const contexts = OVERLAY_CONTEXT_CLASSES.length;
  if (!FULL) {
    MOVER_LABELS.forEach((_, moverIndex) => {
      for (let b = 0; b < 3; b++) {
        scenarios.push({
          kind: BOARD_KINDS[(moverIndex * 3 + b) % kinds],
          radius: 9,
          moverIndex,
          contextIndex: (moverIndex + b * 3) % contexts,
        });
      }
    });
    scenarios.push(
      { kind: 'clear', radius: 19, moverIndex: 0, contextIndex: 0 },
      { kind: 'wooded', radius: 19, moverIndex: 1, contextIndex: 0 },
      { kind: 'urban', radius: 19, moverIndex: 3, contextIndex: 2 },
      { kind: 'mixed', radius: 19, moverIndex: 2, contextIndex: 3 },
    );
    return scenarios;
  }
  MOVER_LABELS.forEach((_, moverIndex) => {
    BOARD_KINDS.forEach((kind) => {
      OVERLAY_CONTEXT_CLASSES.forEach((__, contextIndex) => {
        scenarios.push({ kind, radius: 9, moverIndex, contextIndex });
      });
    });
  });
  for (const radius of [12, 19]) {
    for (let moverIndex = 0; moverIndex < 6; moverIndex++) {
      BOARD_KINDS.forEach((kind, k) => {
        scenarios.push({
          kind,
          radius,
          moverIndex,
          contextIndex: (moverIndex + k) % contexts,
        });
      });
    }
  }
  return scenarios;
}

function overlayInputs(
  random: Random,
  scenario: IOverlayScenario,
): {
  readonly unit: IUnitGameState;
  readonly grid: IHexGrid;
  readonly mover: ICorpusMover;
  readonly context: IOverlayContextClass;
} {
  const board = corpusBoard(
    random,
    scenario.kind,
    scenario.radius,
    integer(random, 0, 8),
  );
  const context = OVERLAY_CONTEXT_CLASSES[scenario.contextIndex];
  const baseUnit = corpusUnit(random, board);
  const unit = context.abilities
    ? { ...baseUnit, abilities: context.abilities }
    : baseUnit;
  const base = corpusMovers(random)[scenario.moverIndex];
  return {
    unit,
    grid: withOccupant(board.grid, unit),
    mover: {
      ...base,
      capability: { ...base.capability, ...context.capability },
    },
    context,
  };
}

interface IPathScenario {
  readonly kind: BoardKind;
  readonly modeIndex: number;
  readonly contextIndex: number;
}

/** Default: one board per travel mode, kinds and contexts rotating. Full: two cross products. */
function pathScenarios(offset: number): IPathScenario[] {
  const kinds = BOARD_KINDS.length;
  const contexts = PATH_CONTEXT_CLASSES.length;
  const scenarios: IPathScenario[] = [];
  TRAVEL_MODES.forEach((_, modeIndex) => {
    if (!FULL) {
      scenarios.push({
        kind: BOARD_KINDS[(modeIndex + offset) % kinds],
        modeIndex,
        contextIndex: (modeIndex + offset) % contexts,
      });
      return;
    }
    BOARD_KINDS.forEach((kind, k) =>
      scenarios.push({
        kind,
        modeIndex,
        contextIndex: (modeIndex + k) % contexts,
      }),
    );
    PATH_CONTEXT_CLASSES.forEach((__, contextIndex) =>
      scenarios.push({
        kind: BOARD_KINDS[(modeIndex + contextIndex) % kinds],
        modeIndex,
        contextIndex,
      }),
    );
  });
  return scenarios;
}

function tallyPathScenario(
  test: string,
  scenario: IPathScenario,
  by: number,
): void {
  tally(test, `kind:${scenario.kind}`, by);
  tally(test, `mode:${TRAVEL_MODES[scenario.modeIndex]}`, by);
  tally(
    test,
    `context:${PATH_CONTEXT_CLASSES[scenario.contextIndex].label}`,
    by,
  );
}

describe('P3/P4 movement search equivalence corpus', () => {
  afterAll(() => {
    process.stdout.write(
      `[searchEquivalence] ${FULL ? 'FULL' : 'default'} ${JSON.stringify(counts)}\n`,
    );
  });

  it('projects the same range hexes, in the same order, as the reference', () => {
    const test = 'overlay';
    const random = seededRandom(SEED + 1);
    for (const scenario of overlayScenarios()) {
      const { unit, grid, mover, context } = overlayInputs(random, scenario);
      for (const mpType of mover.mpTypes) {
        const standUpMode = random() < 0.5 ? 'normal' : 'careful';
        const args = [
          unit,
          mpType,
          grid,
          mover.capability,
          standUpMode,
          context.ruleOptions,
        ] as const;
        const actual = deriveReachableHexes(...args);
        const expected = referenceDeriveReachableHexes(...args);
        expectSameProjection(actual, expected, {
          board: `${scenario.kind} r${scenario.radius}`,
          mover: mover.label,
          context: context.label,
          mpType,
          position: unit.position,
        });
        tally(test, 'projections');
        tally(test, 'rangeHexes', expected.length);
        tally(
          test,
          'reachableHexes',
          expected.filter((h) => h.reachable).length,
        );
        tally(test, `kind:${scenario.kind}`);
        tally(test, `radius:${scenario.radius}`);
        tally(test, `mover:${mover.label}`);
        tally(test, `context:${context.label}`);
        tally(test, `mpType:${mpType}`);
      }
    }
    expectEveryClass(test, 'kind', BOARD_KINDS);
    expectEveryClass(test, 'mover', MOVER_LABELS);
    expectEveryClass(
      test,
      'context',
      OVERLAY_CONTEXT_CLASSES.map((c) => c.label),
    );
  });

  it('finds the same path as the reference A* for sampled origin and destination pairs', () => {
    const test = 'paths';
    const random = seededRandom(SEED + 2);
    for (const scenario of pathScenarios(0)) {
      const board = corpusBoard(
        random,
        scenario.kind,
        12,
        integer(random, 0, 10),
      );
      const cells = hexesInRange({ q: 0, r: 0 }, board.radius);
      const movementType = TRAVEL_MODES[scenario.modeIndex];
      const { context } = PATH_CONTEXT_CLASSES[scenario.contextIndex];
      const origins = FULL ? 1 : 3;
      const pairs = FULL ? 12 : 24;
      for (let originIndex = 0; originIndex < origins; originIndex++) {
        const start = pick(random, cells);
        const space = createPathSearchSpace(
          board.grid,
          start,
          movementType,
          context,
        );
        for (let pairIndex = 0; pairIndex < pairs; pairIndex++) {
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
          const request = {
            grid: board.grid,
            start,
            end,
            maxCost,
            movementType,
            context,
            options,
          };
          const expected = referenceFindPath(request);
          const label = {
            board: board.kind,
            start,
            end,
            maxCost,
            movementType,
            options,
          };
          expect({ label, path: findPath(request) }).toEqual({
            label,
            path: expected,
          });
          expect({
            label,
            path: findPathInSearchSpace(space, end, maxCost, options),
          }).toEqual({
            label,
            path: expected,
          });
          tally(test, 'pairs');
          if (expected) tally(test, 'pathsFound');
        }
      }
      tallyPathScenario(test, scenario, origins * pairs);
    }
    expectEveryClass(test, 'mode', TRAVEL_MODES);
    expectEveryClass(test, 'kind', BOARD_KINDS);
    expectEveryClass(
      test,
      'context',
      PATH_CONTEXT_CLASSES.map((c) => c.label),
    );
  });

  // Keep this test: it is the only one that sees the occupied-hex rule (an
  // occupied hex may end a path but is never passed through). The overlay
  // cannot show it, because the pre-path projection rejects occupied
  // destinations before any search (review N3).
  it('floods reach exactly the destinations the reference A* reaches, at the A* path cost', () => {
    const test = 'flood';
    const random = seededRandom(SEED + 4);
    for (const scenario of pathScenarios(3)) {
      const board = corpusBoard(
        random,
        scenario.kind,
        9,
        integer(random, 2, 8),
      );
      const start = pick(random, hexesInRange({ q: 0, r: 0 }, 6));
      const movementType = TRAVEL_MODES[scenario.modeIndex];
      const { context } = PATH_CONTEXT_CLASSES[scenario.contextIndex];
      const space = createPathSearchSpace(
        board.grid,
        start,
        movementType,
        context,
      );
      const bounds: { maxCost: number; options?: IFindPathOptions }[] = [
        { maxCost: integer(random, 2, 9) },
        {
          maxCost: integer(random, 3, 10),
          options: { requirePavementRoadBonusSurface: true },
        },
        { maxCost: Number.MAX_SAFE_INTEGER },
      ];
      let checks = 0;
      for (const { maxCost, options } of bounds) {
        const flood = floodSearchSpace(space, maxCost, options);
        for (const end of hexesInRange(start, FULL ? 6 : 7)) {
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
          const label = {
            board: board.kind,
            start,
            end,
            maxCost,
            movementType,
            options,
          };
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
          checks++;
          if (expected) tally(test, 'reachable');
        }
      }
      tally(test, 'checks', checks);
      tallyPathScenario(test, scenario, checks);
    }
    expectEveryClass(test, 'mode', TRAVEL_MODES);
    expectEveryClass(test, 'kind', BOARD_KINDS);
    expectEveryClass(
      test,
      'context',
      PATH_CONTEXT_CLASSES.map((c) => c.label),
    );
  });

  // Review B1: the A* and the flood share one entry rule (classifyNeighbourEntry
  // + enteredCost), so they must agree with each other whatever that rule says.
  // A change to the shared rule fails the reference tests above but not this
  // one; a change to only one search fails this one.
  it('the live flood and the live A* agree, and the cached overlay equals per-destination projection', () => {
    const test = 'live';
    const random = seededRandom(SEED + 6);
    for (const scenario of pathScenarios(5)) {
      const board = corpusBoard(
        random,
        scenario.kind,
        9,
        integer(random, 2, 8),
      );
      const start = pick(random, hexesInRange({ q: 0, r: 0 }, 6));
      const movementType = TRAVEL_MODES[scenario.modeIndex];
      const { context } = PATH_CONTEXT_CLASSES[scenario.contextIndex];
      const space = createPathSearchSpace(
        board.grid,
        start,
        movementType,
        context,
      );
      for (const options of [
        undefined,
        { requirePavementRoadBonusSurface: true },
      ]) {
        const maxCost = integer(random, 3, 12);
        const flood = floodSearchSpace(space, maxCost, options);
        for (const end of hexesInRange(start, 7)) {
          if (!board.grid.hexes.has(coordToKey(end))) continue;
          const path = findPath({
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
            options,
          };
          expect({ label, reach: flood.has(coordToKey(end)) }).toEqual({
            label,
            reach: path !== null,
          });
          tally(test, 'floodChecks');
        }
      }
    }
    for (const scenario of overlayScenarios().filter((s) => s.radius === 9)) {
      const { unit, grid, mover, context } = overlayInputs(random, scenario);
      const mpType = pick(random, mover.mpTypes);
      const overlay = deriveReachableHexes(
        unit,
        mpType,
        grid,
        mover.capability,
        'normal',
        context.ruleOptions,
      );
      for (const hex of overlay) {
        const single = deriveMovementRangeHexForDestination(
          unit,
          mpType,
          grid,
          mover.capability,
          hex.hex,
          'normal',
          context.ruleOptions,
        );
        expect({ mover: mover.label, hex: single }).toStrictEqual({
          mover: mover.label,
          hex,
        });
        tally(test, 'overlayHexes');
      }
    }
    expect(counts[test].floodChecks).toBeGreaterThan(1000);
    expect(counts[test].overlayHexes).toBeGreaterThan(1000);
  });
});

function expectSameProjection(
  actual: readonly IMovementRangeHex[],
  expected: readonly IMovementRangeHex[],
  label: {
    readonly board: string;
    readonly mover: string;
    readonly context: string;
    readonly mpType: MovementType;
    readonly position: IHexCoordinate;
  },
): void {
  // Labelled so a failure names the scenario, not just a diff.
  expect({ label, hexes: actual }).toStrictEqual({ label, hexes: expected });
}
