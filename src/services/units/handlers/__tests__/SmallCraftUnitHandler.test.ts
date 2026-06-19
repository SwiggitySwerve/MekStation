/**
 * SmallCraftUnitHandler Tests
 *
 * Tests for Small Craft BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SmallCraftUnitHandler,
  createSmallCraftHandler,
} from '../SmallCraftUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createSpheroidSmallCraft,
  createAssaultBoat,
} from './SmallCraftUnitHandler.test-helpers';

describe('SmallCraftUnitHandler', () => {
  let handler: SmallCraftUnitHandler;

  beforeEach(() => {
    handler = createSmallCraftHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.SMALL_CRAFT);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Small Craft');
    });

    it('should return SmallCraft locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(SmallCraftLocation.NOSE);
      expect(locations).toContain(SmallCraftLocation.AFT);
      expect(locations).toContain(SmallCraftLocation.LEFT_SIDE);
      expect(locations).toContain(SmallCraftLocation.RIGHT_SIDE);
      expect(locations).toContain(SmallCraftLocation.HULL);
    });
  });

  describe('canHandle', () => {
    it('should handle Small Craft unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle DropShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'DropShip',
        mappedUnitType: UnitType.DROPSHIP,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Aerospace Fighter unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });
});
