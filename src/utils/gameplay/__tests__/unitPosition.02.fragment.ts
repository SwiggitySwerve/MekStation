/**
 * Unit Position Tests
 *
 * Tests for unit position management utilities.
 */

import { Facing, IHexCoordinate, IUnitPosition } from '@/types/gameplay';

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

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestPosition(
  overrides: Partial<IUnitPosition> = {},
): IUnitPosition {
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
    const a = createTestPosition({
      coord: { q: 5, r: 5 },
      facing: Facing.North,
      prone: false,
    });
    const b = createTestPosition({
      coord: { q: 5, r: 5 },
      facing: Facing.South,
      prone: true,
    });

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
    const position1 = createTestPosition({
      unitId: 'unit-1',
      coord: { q: 0, r: 0 },
    });
    const position2 = createTestPosition({
      unitId: 'unit-1',
      coord: { q: 5, r: 5 },
    });

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
    const position = createTestPosition({
      unitId: 'unit-1',
      coord: { q: 3, r: -2 },
    });
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
    map = setUnitPosition(
      map,
      createTestPosition({ unitId: 'unit-1', coord: { q: 0, r: 0 } }),
    );
    map = setUnitPosition(
      map,
      createTestPosition({ unitId: 'unit-2', coord: { q: 0, r: 0 } }),
    );

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

    const unitIds = positions.map((p) => p.unitId);
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
