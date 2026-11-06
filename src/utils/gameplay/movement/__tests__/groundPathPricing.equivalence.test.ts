import { createMinimalGrid } from '@/simulation/runner/SimulationRunnerSupport';
import { Facing } from '@/types/gameplay';

import * as calculations from '../calculations';
import { calculateGroundPathMpCost, prepareGroundPathMpCost } from '../index';
import { referenceGroundPathMpCost } from './groundPathPricingReference.test-helpers';

jest.mock('../calculations', () => {
  const actual =
    jest.requireActual<typeof import('../calculations')>('../calculations');
  return { ...actual, getHexMovementCost: jest.fn(actual.getHexMovementCost) };
});

const stepCost = jest.mocked(calculations.getHexMovementCost);
beforeEach(() => {
  stepCost
    .mockReset()
    .mockImplementation(
      jest.requireActual<typeof import('../calculations')>('../calculations')
        .getHexMovementCost,
    );
});

const FACINGS = [0, 1, 2, 3, 4, 5] as const satisfies readonly Facing[];
const paths = [
  [],
  [{ q: 0, r: 0 }],
  [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
  ],
  [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
  ],
  [
    { q: 0, r: 0 },
    { q: 9, r: 9 },
  ],
];

afterEach(() => jest.restoreAllMocks());

describe('prepared ground-path pricing preserves the existing contract', () => {
  it('matches every complete old price, including empty, singleton, turning and blocked paths', () => {
    const grid = createMinimalGrid(2);
    for (const path of paths) {
      for (const mode of ['walk', 'run'] as const) {
        for (const from of FACINGS) {
          for (const context of [
            undefined,
            { isFirstStep: true },
            { isFirstStep: false },
          ]) {
            const prepared = prepareGroundPathMpCost(
              grid,
              path,
              mode,
              from,
              context,
            );
            for (const to of FACINGS) {
              const expected = referenceGroundPathMpCost(
                grid,
                path,
                mode,
                from,
                to,
                context,
              );
              expect(
                calculateGroundPathMpCost(grid, path, mode, from, to, context),
              ).toBe(expected);
              expect(prepared(to)).toBe(expected);
            }
          }
        }
      }
    }
  });

  it.each([Infinity, -Infinity, NaN])(
    'preserves the non-finite step guard for %s',
    (step) => {
      stepCost.mockReturnValue(step);
      const grid = createMinimalGrid(2);
      const path = paths[2];
      const prepared = prepareGroundPathMpCost(
        grid,
        path,
        'walk',
        Facing.North,
      );
      for (const to of FACINGS) {
        expect(prepared(to)).toBe(Infinity);
        expect(
          calculateGroundPathMpCost(grid, path, 'walk', Facing.North, to),
        ).toBe(Infinity);
      }
    },
  );

  it('keeps the original left-to-right step sum before adding final turning cost', () => {
    const costs = [1e16, 1, 1];
    stepCost.mockImplementation((_grid, coord) => costs[coord.q - 1]);
    const path = [0, 1, 2, 3].map((q) => ({ q, r: 0 }));
    const grid = createMinimalGrid(3);
    const prepared = prepareGroundPathMpCost(grid, path, 'walk', Facing.North);
    for (const to of FACINGS) {
      expect(prepared(to)).toBe(
        referenceGroundPathMpCost(grid, path, 'walk', Facing.North, to),
      );
    }
  });

  it('prices path steps once when the six final facings are requested', () => {
    const steps = stepCost;
    const path = paths[3];
    const prepared = prepareGroundPathMpCost(
      createMinimalGrid(2),
      path,
      'walk',
      Facing.North,
    );
    for (const to of FACINGS) prepared(to);
    expect(steps).toHaveBeenCalledTimes(path.length - 1);
  });

  it('takes a fresh price for every preparation after terrain changes', () => {
    const steps = stepCost.mockReturnValue(1);
    const grid = createMinimalGrid(2);
    const path = paths[2];
    const first = prepareGroundPathMpCost(grid, path, 'walk', Facing.North);
    steps.mockReturnValue(4);
    const second = prepareGroundPathMpCost(grid, path, 'walk', Facing.North);
    expect(second(Facing.North) - first(Facing.North)).toBe(3);
    expect(steps).toHaveBeenCalledTimes(2);
  });
});
