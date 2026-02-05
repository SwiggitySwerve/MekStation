/**
 * Firing Arc Tests
 * Tests for firing arc determination.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import { IUnitPosition, Facing, FiringArc } from '@/types/gameplay';
import {
  determineArc,
  getFrontArcDirections,
  getRearArcDirections,
  getLeftArcDirection,
  getRightArcDirection,
  canFireFromArc,
  targetsRearArmor,
} from '@/utils/gameplay/firingArcs';

describe('firingArcs', () => {
  // =========================================================================
  // Arc Determination
  // =========================================================================

  describe('determineArc()', () => {
    const createPosition = (facing: Facing): IUnitPosition => ({
      unitId: 'test',
      coord: { q: 0, r: 0 },
      facing,
      prone: false,
    });

    it('should return front arc for same hex', () => {
      const position = createPosition(Facing.North);
      const result = determineArc(position, { q: 0, r: 0 });
      expect(result.arc).toBe(FiringArc.Front);
    });

    it('should return front arc for target directly in front', () => {
      const position = createPosition(Facing.North);
      // Target directly north
      const result = determineArc(position, { q: 0, r: -1 });
      expect(result.arc).toBe(FiringArc.Front);
    });

    it('should return rear arc for target directly behind', () => {
      const position = createPosition(Facing.North);
      // Target directly south
      const result = determineArc(position, { q: 0, r: 1 });
      expect(result.arc).toBe(FiringArc.Rear);
    });

    it('should correctly identify arcs for different facings', () => {
      // Test facing east (Southeast)
      const position = createPosition(Facing.Southeast);

      // Target to the east (in front)
      const frontResult = determineArc(position, { q: 1, r: 0 });
      expect(frontResult.arc).toBe(FiringArc.Front);
    });
  });

  // =========================================================================
  // Arc Directions
  // =========================================================================

  describe('getFrontArcDirections()', () => {
    it('should return 3 directions for front arc', () => {
      const directions = getFrontArcDirections(Facing.North);
      expect(directions.length).toBe(3);
    });

    it('should include facing direction and adjacent directions', () => {
      const directions = getFrontArcDirections(Facing.North);
      expect(directions).toContain(Facing.North);
      expect(directions).toContain(Facing.Northeast);
      expect(directions).toContain(Facing.Northwest);
    });
  });

  describe('getRearArcDirections()', () => {
    it('should return 3 directions for rear arc', () => {
      const directions = getRearArcDirections(Facing.North);
      expect(directions.length).toBe(3);
    });

    it('should include directions behind facing', () => {
      const directions = getRearArcDirections(Facing.North);
      expect(directions).toContain(Facing.South);
      expect(directions).toContain(Facing.Southeast);
      expect(directions).toContain(Facing.Southwest);
    });
  });

  describe('getLeftArcDirection() / getRightArcDirection()', () => {
    it('should return correct side directions', () => {
      expect(getLeftArcDirection(Facing.North)).toBe(Facing.Southeast);
      expect(getRightArcDirection(Facing.North)).toBe(Facing.Southwest);
    });
  });

  // =========================================================================
  // Weapon Arc Validation
  // =========================================================================

  describe('canFireFromArc()', () => {
    it('should allow front weapons to fire into front arc', () => {
      expect(canFireFromArc(FiringArc.Front, FiringArc.Front)).toBe(true);
    });

    it('should not allow front weapons to fire into rear arc', () => {
      expect(canFireFromArc(FiringArc.Front, FiringArc.Rear)).toBe(false);
    });

    it('should allow rear weapons to fire into rear arc', () => {
      expect(canFireFromArc(FiringArc.Rear, FiringArc.Rear)).toBe(true);
    });

    it('should allow side weapons to fire into their respective arcs', () => {
      expect(canFireFromArc(FiringArc.Left, FiringArc.Left)).toBe(true);
      expect(canFireFromArc(FiringArc.Right, FiringArc.Right)).toBe(true);
      expect(canFireFromArc(FiringArc.Left, FiringArc.Right)).toBe(false);
    });
  });

  describe('targetsRearArmor()', () => {
    it('should return true for rear arc', () => {
      expect(targetsRearArmor(FiringArc.Rear)).toBe(true);
    });

    it('should return false for other arcs', () => {
      expect(targetsRearArmor(FiringArc.Front)).toBe(false);
      expect(targetsRearArmor(FiringArc.Left)).toBe(false);
      expect(targetsRearArmor(FiringArc.Right)).toBe(false);
    });
  });
});
