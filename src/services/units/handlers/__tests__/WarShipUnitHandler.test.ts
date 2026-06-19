/**
 * WarShipUnitHandler Tests
 *
 * Tests for WarShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc, KFDriveType } from '@/types/unit/CapitalShipInterfaces';

import {
  WarShipUnitHandler,
  createWarShipHandler,
} from '../WarShipUnitHandler';
// ============================================================================
import { createMockBlkDocument } from './WarShipUnitHandler.test-helpers';

describe('WarShipUnitHandler', () => {
  let handler: WarShipUnitHandler;

  beforeEach(() => {
    handler = createWarShipHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.WARSHIP);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('WarShip');
    });

    it('should return CapitalArc locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(CapitalArc.NOSE);
      expect(locations).toContain(CapitalArc.AFT);
      expect(locations).toContain(CapitalArc.LEFT_BROADSIDE);
      expect(locations).toContain(CapitalArc.RIGHT_BROADSIDE);
    });
  });

  describe('canHandle', () => {
    it('should handle WarShip unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped WarShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Warship',
        mappedUnitType: UnitType.WARSHIP,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle DropShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'DropShip',
        mappedUnitType: UnitType.DROPSHIP,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });
});
