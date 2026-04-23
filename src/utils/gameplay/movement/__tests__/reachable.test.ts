/**
 * Tests for `deriveReachableHexes` — the Movement-phase UI projection
 * helper.
 *
 * @spec openspec/changes/add-movement-phase-ui/specs/movement-system/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { deriveReachableHexes } from '@/utils/gameplay/movement/reachable';

function makeUnitAtOrigin(): IUnitGameState {
  return {
    id: 'u1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
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
  };
}

describe('deriveReachableHexes', () => {
  it('returns empty array for Stationary movement type', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(
      unit,
      MovementType.Stationary,
      grid,
      cap,
    );

    expect(result).toEqual([]);
  });

  it('returns empty array when the MP budget is zero', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 0, runMP: 0, jumpMP: 0 };

    expect(deriveReachableHexes(unit, MovementType.Walk, grid, cap)).toEqual(
      [],
    );
    expect(deriveReachableHexes(unit, MovementType.Jump, grid, cap)).toEqual(
      [],
    );
  });

  it('derives walk reach for a 5-walk-MP unit on clear terrain', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    // Every returned hex is marked reachable + walk-typed with cost ≤ 5.
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.reachable).toBe(true);
      expect(entry.movementType).toBe(MovementType.Walk);
      expect(entry.mpCost).toBeGreaterThan(0);
      expect(entry.mpCost).toBeLessThanOrEqual(5);
    }
    // A well-known direct neighbour (q=1, r=0) is 1 MP away on clear
    // terrain and must be in the set with cost 1.
    const neighbor = result.find((r) => r.hex.q === 1 && r.hex.r === 0);
    expect(neighbor).toBeDefined();
    expect(neighbor?.mpCost).toBe(1);
  });

  it('expands the reachable envelope when switching Walk → Run', () => {
    const grid = createHexGrid({ radius: 8 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const walk = deriveReachableHexes(unit, MovementType.Walk, grid, cap);
    const run = deriveReachableHexes(unit, MovementType.Run, grid, cap);

    // Run covers strictly more ground than Walk on an open grid.
    expect(run.length).toBeGreaterThan(walk.length);
  });

  it('jump reach is a flat hex-distance gate regardless of path', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 3 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);

    // All returned hexes are within jump distance 3 and are marked Jump.
    for (const entry of jump) {
      expect(entry.movementType).toBe(MovementType.Jump);
      expect(entry.mpCost).toBeLessThanOrEqual(3);
    }

    // Origin hex is excluded.
    const origin = jump.find((r) => r.hex.q === 0 && r.hex.r === 0);
    expect(origin).toBeUndefined();

    // A hex at distance 3 (e.g., q=3, r=0) is reachable.
    const far = jump.find((r) => r.hex.q === 3 && r.hex.r === 0);
    expect(far).toBeDefined();
    expect(far?.mpCost).toBe(3);
  });

  it('jump returns empty when unit has zero jumpMP', () => {
    const grid = createHexGrid({ radius: 5 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

    const jump = deriveReachableHexes(unit, MovementType.Jump, grid, cap);

    expect(jump).toEqual([]);
  });

  it('returned hexes are sorted by ascending mpCost', () => {
    const grid = createHexGrid({ radius: 6 });
    const unit = makeUnitAtOrigin();
    const cap: IMovementCapability = { walkMP: 5, runMP: 8, jumpMP: 0 };

    const result = deriveReachableHexes(unit, MovementType.Walk, grid, cap);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].mpCost).toBeGreaterThanOrEqual(result[i - 1].mpCost);
    }
  });
});
