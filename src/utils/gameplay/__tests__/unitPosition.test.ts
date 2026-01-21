/**
 * Unit Position Tests
 *
 * Tests for unit position management utilities.
 */

import {
  createUnitPosition,
  setPositionCoord,
  setPositionFacing,
  setPositionProne,
  movePosition,
  rotateFacingClockwise,
  rotateFacingCounterClockwise,
  getOppositeFacing,
  getFacingDifference,
  getFacingRotationDirection,
  isUnitProne,
  isSameHex,
  getFacingName,
  getFacingAbbreviation,
  createPositionMap,
  getUnitPosition,
  setUnitPosition,
  removeUnitPosition,
  findUnitAtCoord,
  getAllPositions,
  getAllUnitIds,
} from '../unitPosition';
import { Facing, IHexCoordinate, IUnitPosition } from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestPosition(overrides: Partial<IUnitPosition> = {}): IUnitPosition {
  return {
    unitId: 'unit-1',
    coord: { q: 0, r: 0 },
    facing: Facing.North,
    prone: false,
    ...overrides,
  };
}

// =============================================================================
// Position Creation Tests
// =============================================================================

describe('createUnitPosition', () => {
  it('should create a position with default values', () => {
    const position = createUnitPosition('unit-1', { q: 5, r: 3 });

    expect(position.unitId).toBe('unit-1');
    expect(position.coord).toEqual({ q: 5, r: 3 });
    expect(position.facing).toBe(Facing.North); // default
    expect(position.prone).toBe(false); // default
  });

  it('should create a position with custom facing', () => {
    const position = createUnitPosition('unit-1', { q: 0, r: 0 }, Facing.Southeast);

    expect(position.facing).toBe(Facing.Southeast);
  });

  it('should create a position with prone status', () => {
    const position = createUnitPosition('unit-1', { q: 0, r: 0 }, Facing.North, true);

    expect(position.prone).toBe(true);
  });

  it('should create a position with all custom values', () => {
    const position = createUnitPosition('mech-alpha', { q: -2, r: 4 }, Facing.Southwest, true);

    expect(position.unitId).toBe('mech-alpha');
    expect(position.coord).toEqual({ q: -2, r: 4 });
    expect(position.facing).toBe(Facing.Southwest);
    expect(position.prone).toBe(true);
  });
});

// =============================================================================
// Position Update Tests
// =============================================================================

describe('setPositionCoord', () => {
  it('should update coordinate immutably', () => {
    const original = createTestPosition();
    const newCoord: IHexCoordinate = { q: 3, r: 2 };
    const updated = setPositionCoord(original, newCoord);

    expect(updated.coord).toEqual({ q: 3, r: 2 });
    expect(original.coord).toEqual({ q: 0, r: 0 }); // unchanged
    expect(updated.unitId).toBe(original.unitId);
    expect(updated.facing).toBe(original.facing);
    expect(updated.prone).toBe(original.prone);
  });
});

describe('setPositionFacing', () => {
  it('should update facing immutably', () => {
    const original = createTestPosition();
    const updated = setPositionFacing(original, Facing.South);

    expect(updated.facing).toBe(Facing.South);
    expect(original.facing).toBe(Facing.North); // unchanged
  });

  it('should preserve other properties', () => {
    const original = createTestPosition({ prone: true });
    const updated = setPositionFacing(original, Facing.Southeast);

    expect(updated.coord).toEqual(original.coord);
    expect(updated.prone).toBe(true);
  });
});

describe('setPositionProne', () => {
  it('should set prone to true', () => {
    const original = createTestPosition({ prone: false });
    const updated = setPositionProne(original, true);

    expect(updated.prone).toBe(true);
    expect(original.prone).toBe(false); // unchanged
  });

  it('should set prone to false', () => {
    const original = createTestPosition({ prone: true });
    const updated = setPositionProne(original, false);

    expect(updated.prone).toBe(false);
  });
});

describe('movePosition', () => {
  it('should update coord and facing', () => {
    const original = createTestPosition();
    const updated = movePosition(original, { q: 2, r: -1 }, Facing.Northeast);

    expect(updated.coord).toEqual({ q: 2, r: -1 });
    expect(updated.facing).toBe(Facing.Northeast);
  });

  it('should clear prone status when moving', () => {
    const original = createTestPosition({ prone: true });
    const updated = movePosition(original, { q: 1, r: 0 }, Facing.North);

    expect(updated.prone).toBe(false);
  });

  it('should preserve unitId', () => {
    const original = createTestPosition({ unitId: 'custom-unit' });
    const updated = movePosition(original, { q: 1, r: 0 }, Facing.North);

    expect(updated.unitId).toBe('custom-unit');
  });
});

// =============================================================================
// Facing Operations Tests
// =============================================================================

describe('rotateFacingClockwise', () => {
  it('should rotate one step clockwise by default', () => {
    expect(rotateFacingClockwise(Facing.North)).toBe(Facing.Northeast);
    expect(rotateFacingClockwise(Facing.Northeast)).toBe(Facing.Southeast);
    expect(rotateFacingClockwise(Facing.Southeast)).toBe(Facing.South);
    expect(rotateFacingClockwise(Facing.South)).toBe(Facing.Southwest);
    expect(rotateFacingClockwise(Facing.Southwest)).toBe(Facing.Northwest);
    expect(rotateFacingClockwise(Facing.Northwest)).toBe(Facing.North);
  });

  it('should rotate multiple steps clockwise', () => {
    expect(rotateFacingClockwise(Facing.North, 2)).toBe(Facing.Southeast);
    expect(rotateFacingClockwise(Facing.North, 3)).toBe(Facing.South);
    expect(rotateFacingClockwise(Facing.North, 6)).toBe(Facing.North);
  });

  it('should handle zero steps', () => {
    expect(rotateFacingClockwise(Facing.Northeast, 0)).toBe(Facing.Northeast);
  });

  it('should handle more than 6 steps', () => {
    expect(rotateFacingClockwise(Facing.North, 7)).toBe(Facing.Northeast);
    expect(rotateFacingClockwise(Facing.North, 12)).toBe(Facing.North);
  });
});

describe('rotateFacingCounterClockwise', () => {
  it('should rotate one step counter-clockwise by default', () => {
    expect(rotateFacingCounterClockwise(Facing.North)).toBe(Facing.Northwest);
    expect(rotateFacingCounterClockwise(Facing.Northeast)).toBe(Facing.North);
    expect(rotateFacingCounterClockwise(Facing.Southeast)).toBe(Facing.Northeast);
    expect(rotateFacingCounterClockwise(Facing.South)).toBe(Facing.Southeast);
    expect(rotateFacingCounterClockwise(Facing.Southwest)).toBe(Facing.South);
    expect(rotateFacingCounterClockwise(Facing.Northwest)).toBe(Facing.Southwest);
  });

  it('should rotate multiple steps counter-clockwise', () => {
    expect(rotateFacingCounterClockwise(Facing.North, 2)).toBe(Facing.Southwest);
    expect(rotateFacingCounterClockwise(Facing.North, 3)).toBe(Facing.South);
  });

  it('should handle zero steps', () => {
    expect(rotateFacingCounterClockwise(Facing.South, 0)).toBe(Facing.South);
  });

  it('should handle more than 6 steps', () => {
    expect(rotateFacingCounterClockwise(Facing.North, 7)).toBe(Facing.Northwest);
  });
});

describe('getOppositeFacing', () => {
  it('should return opposite facing', () => {
    expect(getOppositeFacing(Facing.North)).toBe(Facing.South);
    expect(getOppositeFacing(Facing.South)).toBe(Facing.North);
    expect(getOppositeFacing(Facing.Northeast)).toBe(Facing.Southwest);
    expect(getOppositeFacing(Facing.Southwest)).toBe(Facing.Northeast);
    expect(getOppositeFacing(Facing.Southeast)).toBe(Facing.Northwest);
    expect(getOppositeFacing(Facing.Northwest)).toBe(Facing.Southeast);
  });

  it('should be symmetric', () => {
    for (let f = 0; f < 6; f++) {
      const facing = f as Facing;
      expect(getOppositeFacing(getOppositeFacing(facing))).toBe(facing);
    }
  });
});

describe('getFacingDifference', () => {
  it('should return 0 for same facing', () => {
    expect(getFacingDifference(Facing.North, Facing.North)).toBe(0);
    expect(getFacingDifference(Facing.South, Facing.South)).toBe(0);
  });

  it('should return 1 for adjacent facings', () => {
    expect(getFacingDifference(Facing.North, Facing.Northeast)).toBe(1);
    expect(getFacingDifference(Facing.North, Facing.Northwest)).toBe(1);
  });

  it('should return 2 for two steps apart', () => {
    expect(getFacingDifference(Facing.North, Facing.Southeast)).toBe(2);
    expect(getFacingDifference(Facing.North, Facing.Southwest)).toBe(2);
  });

  it('should return 3 for opposite facings', () => {
    expect(getFacingDifference(Facing.North, Facing.South)).toBe(3);
    expect(getFacingDifference(Facing.Northeast, Facing.Southwest)).toBe(3);
  });

  it('should be symmetric', () => {
    for (let f1 = 0; f1 < 6; f1++) {
      for (let f2 = 0; f2 < 6; f2++) {
        expect(getFacingDifference(f1 as Facing, f2 as Facing)).toBe(
          getFacingDifference(f2 as Facing, f1 as Facing)
        );
      }
    }
  });
});

describe('getFacingRotationDirection', () => {
  it('should return 0 for same facing', () => {
    expect(getFacingRotationDirection(Facing.North, Facing.North)).toBe(0);
  });

  it('should return 1 for clockwise rotation', () => {
    expect(getFacingRotationDirection(Facing.North, Facing.Northeast)).toBe(1);
    expect(getFacingRotationDirection(Facing.North, Facing.Southeast)).toBe(1);
  });

  it('should return -1 for counter-clockwise rotation', () => {
    expect(getFacingRotationDirection(Facing.North, Facing.Northwest)).toBe(-1);
    expect(getFacingRotationDirection(Facing.North, Facing.Southwest)).toBe(-1);
  });

  it('should prefer clockwise for opposite facing', () => {
    // When equal, clockwise should be preferred (returns 1)
    expect(getFacingRotationDirection(Facing.North, Facing.South)).toBe(1);
  });
});

// =============================================================================
// Position Query Tests
// =============================================================================

describe('isUnitProne', () => {
  it('should return true for prone unit', () => {
    const position = createTestPosition({ prone: true });
    expect(isUnitProne(position)).toBe(true);
  });

  it('should return false for standing unit', () => {
    const position = createTestPosition({ prone: false });
    expect(isUnitProne(position)).toBe(false);
  });
});

describe('isSameHex', () => {
  it('should return true for same hex', () => {
    const a = createTestPosition({ coord: { q: 3, r: -2 } });
    const b = createTestPosition({ coord: { q: 3, r: -2 }, unitId: 'unit-2' });

    expect(isSameHex(a, b)).toBe(true);
  });

  it('should return false for different hexes', () => {
    const a = createTestPosition({ coord: { q: 0, r: 0 } });
    const b = createTestPosition({ coord: { q: 1, r: 0 } });

    expect(isSameHex(a, b)).toBe(false);
  });

  it('should ignore facing and prone status', () => {
    const a = createTestPosition({ coord: { q: 5, r: 5 }, facing: Facing.North, prone: false });
    const b = createTestPosition({ coord: { q: 5, r: 5 }, facing: Facing.South, prone: true });

    expect(isSameHex(a, b)).toBe(true);
  });
});

describe('getFacingName', () => {
  it('should return correct names for all facings', () => {
    expect(getFacingName(Facing.North)).toBe('North');
    expect(getFacingName(Facing.Northeast)).toBe('Northeast');
    expect(getFacingName(Facing.Southeast)).toBe('Southeast');
    expect(getFacingName(Facing.South)).toBe('South');
    expect(getFacingName(Facing.Southwest)).toBe('Southwest');
    expect(getFacingName(Facing.Northwest)).toBe('Northwest');
  });
});

describe('getFacingAbbreviation', () => {
  it('should return correct abbreviations for all facings', () => {
    expect(getFacingAbbreviation(Facing.North)).toBe('N');
    expect(getFacingAbbreviation(Facing.Northeast)).toBe('NE');
    expect(getFacingAbbreviation(Facing.Southeast)).toBe('SE');
    expect(getFacingAbbreviation(Facing.South)).toBe('S');
    expect(getFacingAbbreviation(Facing.Southwest)).toBe('SW');
    expect(getFacingAbbreviation(Facing.Northwest)).toBe('NW');
  });
});

// =============================================================================
// Position Map Tests
// =============================================================================

describe('createPositionMap', () => {
  it('should create an empty map', () => {
    const map = createPositionMap();

    expect(map.size).toBe(0);
  });
});

describe('getUnitPosition', () => {
  it('should return position for existing unit', () => {
    const map = createPositionMap();
    const position = createTestPosition({ unitId: 'unit-1' });
    const mapWithUnit = setUnitPosition(map, position);

    const retrieved = getUnitPosition(mapWithUnit, 'unit-1');
    expect(retrieved).toEqual(position);
  });

  it('should return undefined for non-existing unit', () => {
    const map = createPositionMap();

    expect(getUnitPosition(map, 'unit-nonexistent')).toBeUndefined();
  });
});

describe('setUnitPosition', () => {
  it('should add a new position to the map', () => {
    const map = createPositionMap();
    const position = createTestPosition({ unitId: 'unit-1' });
    const newMap = setUnitPosition(map, position);

    expect(newMap.size).toBe(1);
    expect(map.size).toBe(0); // original unchanged
  });

  it('should update existing position', () => {
    const map = createPositionMap();
    const position1 = createTestPosition({ unitId: 'unit-1', coord: { q: 0, r: 0 } });
    const position2 = createTestPosition({ unitId: 'unit-1', coord: { q: 5, r: 5 } });

    const map1 = setUnitPosition(map, position1);
    const map2 = setUnitPosition(map1, position2);

    expect(map2.size).toBe(1);
    expect(getUnitPosition(map2, 'unit-1')?.coord).toEqual({ q: 5, r: 5 });
  });

  it('should be immutable', () => {
    const map = createPositionMap();
    const position = createTestPosition();
    const newMap = setUnitPosition(map, position);

    expect(map).not.toBe(newMap);
  });
});

describe('removeUnitPosition', () => {
  it('should remove a unit from the map', () => {
    const map = createPositionMap();
    const position = createTestPosition({ unitId: 'unit-1' });
    const mapWithUnit = setUnitPosition(map, position);
    const mapWithoutUnit = removeUnitPosition(mapWithUnit, 'unit-1');

    expect(mapWithoutUnit.size).toBe(0);
    expect(mapWithUnit.size).toBe(1); // original unchanged
  });

  it('should handle removing non-existing unit', () => {
    const map = createPositionMap();
    const newMap = removeUnitPosition(map, 'unit-nonexistent');

    expect(newMap.size).toBe(0);
  });

  it('should be immutable', () => {
    const map = createPositionMap();
    const position = createTestPosition();
    const mapWithUnit = setUnitPosition(map, position);
    const newMap = removeUnitPosition(mapWithUnit, 'unit-1');

    expect(mapWithUnit).not.toBe(newMap);
  });
});

describe('findUnitAtCoord', () => {
  it('should find unit at specified coordinate', () => {
    let map = createPositionMap();
    const position = createTestPosition({ unitId: 'unit-1', coord: { q: 3, r: -2 } });
    map = setUnitPosition(map, position);

    const found = findUnitAtCoord(map, { q: 3, r: -2 });
    expect(found?.unitId).toBe('unit-1');
  });

  it('should return undefined if no unit at coordinate', () => {
    let map = createPositionMap();
    const position = createTestPosition({ coord: { q: 0, r: 0 } });
    map = setUnitPosition(map, position);

    const found = findUnitAtCoord(map, { q: 5, r: 5 });
    expect(found).toBeUndefined();
  });

  it('should handle empty map', () => {
    const map = createPositionMap();
    const found = findUnitAtCoord(map, { q: 0, r: 0 });
    expect(found).toBeUndefined();
  });

  it('should find first unit if multiple at same coord (edge case)', () => {
    // Note: In practice, shouldn't have multiple units at same coord
    let map = createPositionMap();
    map = setUnitPosition(map, createTestPosition({ unitId: 'unit-1', coord: { q: 0, r: 0 } }));
    map = setUnitPosition(map, createTestPosition({ unitId: 'unit-2', coord: { q: 0, r: 0 } }));

    const found = findUnitAtCoord(map, { q: 0, r: 0 });
    expect(['unit-1', 'unit-2']).toContain(found?.unitId);
  });
});

describe('getAllPositions', () => {
  it('should return empty array for empty map', () => {
    const map = createPositionMap();
    const positions = getAllPositions(map);

    expect(positions).toEqual([]);
  });

  it('should return all positions', () => {
    let map = createPositionMap();
    map = setUnitPosition(map, createTestPosition({ unitId: 'unit-1' }));
    map = setUnitPosition(map, createTestPosition({ unitId: 'unit-2' }));
    map = setUnitPosition(map, createTestPosition({ unitId: 'unit-3' }));

    const positions = getAllPositions(map);
    expect(positions.length).toBe(3);

    const unitIds = positions.map(p => p.unitId);
    expect(unitIds).toContain('unit-1');
    expect(unitIds).toContain('unit-2');
    expect(unitIds).toContain('unit-3');
  });
});

describe('getAllUnitIds', () => {
  it('should return empty array for empty map', () => {
    const map = createPositionMap();
    const ids = getAllUnitIds(map);

    expect(ids).toEqual([]);
  });

  it('should return all unit IDs', () => {
    let map = createPositionMap();
    map = setUnitPosition(map, createTestPosition({ unitId: 'alpha' }));
    map = setUnitPosition(map, createTestPosition({ unitId: 'beta' }));

    const ids = getAllUnitIds(map);
    expect(ids.length).toBe(2);
    expect(ids).toContain('alpha');
    expect(ids).toContain('beta');
  });
});
