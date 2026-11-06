import type { IHexGrid, IMovementCapability } from '@/types/gameplay';
import type { IMovementCostContext } from '@/utils/gameplay/movement';

import { Facing, MovementType } from '@/types/gameplay';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import * as movementPricing from '@/utils/gameplay/movement';

import { getValidMoveCandidates } from '../ai/MoveAI.movement';
import { createMinimalGrid } from '../runner/SimulationRunnerSupport';
import { referenceMoveCandidates } from './movementPricingReference.test-helpers';

jest.mock('@/utils/gameplay/movement', () => {
  const actual = jest.requireActual<typeof import('@/utils/gameplay/movement')>(
    '@/utils/gameplay/movement',
  );
  return {
    ...actual,
    calculateGroundPathMpCost: jest.fn(actual.calculateGroundPathMpCost),
    prepareGroundPathMpCost: jest.fn(actual.prepareGroundPathMpCost),
  };
});

const FACINGS = [0, 1, 2, 3, 4, 5] as const satisfies readonly Facing[];
const MODES = [MovementType.Walk, MovementType.Run, MovementType.Jump];

interface Case {
  name: string;
  grid: IHexGrid;
  capability?: IMovementCapability;
  context?: IMovementCostContext;
}

function gridWith(
  changes: Readonly<
    Record<
      string,
      { terrain?: string; elevation?: number; occupantId?: string }
    >
  >,
): IHexGrid {
  const grid = createMinimalGrid(2);
  const hexes = new Map(grid.hexes);
  for (const [key, change] of Object.entries(changes)) {
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing test hex ${key}`);
    hexes.set(key, { ...hex, ...change });
  }
  return { ...grid, hexes };
}

const varied = gridWith({
  '1,0': { terrain: 'light_woods' },
  '0,1': { terrain: 'rough' },
  '-1,1': { elevation: 1 },
  '-1,0': { elevation: -1 },
  '0,-1': { terrain: 'water', elevation: -1 },
  '1,-1': { terrain: 'heavy_woods' },
});
const cases: Case[] = [
  {
    name: 'clear map and cutoff at every final facing',
    grid: createMinimalGrid(2),
  },
  {
    name: 'zero movement',
    grid: createMinimalGrid(2),
    capability: { walkMP: 0, runMP: 0, jumpMP: 0 },
  },
  {
    name: 'one MP cutoff',
    grid: varied,
    capability: { walkMP: 1, runMP: 1, jumpMP: 1 },
  },
  { name: 'terrain, elevation and water', grid: varied },
  {
    name: 'occupied destination and detour',
    grid: gridWith({
      '1,0': { occupantId: 'other' },
      '0,1': { occupantId: 'other-2' },
    }),
  },
  {
    name: 'blocked elevation ring',
    grid: gridWith(
      Object.fromEntries(
        ['1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1'].map((key) => [
          key,
          { elevation: 9 },
        ]),
      ),
    ),
  },
  {
    name: 'explicit first-step context',
    grid: varied,
    context: { isFirstStep: true, declaredMovementType: MovementType.Run },
  },
  {
    name: 'explicit later-step context',
    grid: varied,
    context: { isFirstStep: false, declaredMovementType: MovementType.Run },
  },
  {
    name: 'infantry movement context',
    grid: varied,
    context: { movementTerrainProfile: 'infantry' },
  },
  {
    name: 'night and optional rule context',
    grid: varied,
    context: {
      environmentalConditions: createEnvironmentalConditions({
        light: 'night',
      }),
      optionalRules: ['tacops_run_through_woods'],
      pilotAbilities: ['mountaineer'],
    },
  },
  {
    name: 'partial wing heat',
    grid: varied,
    capability: { walkMP: 2, runMP: 3, jumpMP: 3, partialWingJumpBonus: 1 },
  },
  {
    name: 'heat-free motive',
    grid: varied,
    capability: { walkMP: 2, runMP: 3, jumpMP: 2, movementHeatProfile: 'none' },
  },
];

describe('ordered movement candidates equal the pre-optimization implementation', () => {
  it.each(cases)(
    '$name',
    ({ grid, capability = { walkMP: 2, runMP: 3, jumpMP: 2 }, context }) => {
      for (const facing of FACINGS) {
        for (const mode of MODES) {
          const position = {
            unitId: 'moving-unit',
            coord: { q: 0, r: 0 },
            facing,
            prone: false,
          };
          expect(
            getValidMoveCandidates(grid, position, mode, capability, context),
          ).toStrictEqual(
            referenceMoveCandidates(grid, position, mode, capability, context),
          );
        }
      }
    },
  );

  it('prices each adjacent ground destination once while retaining all facing candidates', () => {
    const prepared = jest
      .mocked(movementPricing.prepareGroundPathMpCost)
      .mockClear();
    const single = jest
      .mocked(movementPricing.calculateGroundPathMpCost)
      .mockClear();
    const grid = createMinimalGrid(1);
    const position = {
      unitId: 'moving-unit',
      coord: { q: 0, r: 0 },
      facing: Facing.North,
      prone: false,
    };
    const capability = { walkMP: 4, runMP: 6, jumpMP: 4 };
    expect(
      getValidMoveCandidates(grid, position, MovementType.Walk, capability),
    ).toStrictEqual(
      referenceMoveCandidates(grid, position, MovementType.Walk, capability),
    );
    expect(prepared).toHaveBeenCalledTimes(6);
    expect(single).not.toHaveBeenCalled();

    prepared.mockClear();
    getValidMoveCandidates(grid, position, MovementType.Jump, capability);
    getValidMoveCandidates(grid, position, MovementType.Walk, {
      walkMP: 0,
      runMP: 0,
      jumpMP: 0,
    });
    expect(prepared).not.toHaveBeenCalled();
  });
});
