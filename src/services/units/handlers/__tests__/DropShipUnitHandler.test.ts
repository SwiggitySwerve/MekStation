/**
 * DropShipUnitHandler Tests
 *
 * Tests for DropShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  CapitalArc,
  DropShipDesignType,
  BayType,
} from '@/types/unit/CapitalShipInterfaces';

import {
  DropShipUnitHandler,
  createDropShipHandler,
} from '../DropShipUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createAerodyneDropShip,
  createCivilianDropShip,
} from './DropShipUnitHandler.test-helpers';

describe('DropShipUnitHandler', () => {
  let handler: DropShipUnitHandler;

  beforeEach(() => {
    handler = createDropShipHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.DROPSHIP);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('DropShip');
    });

    it('should return CapitalArc locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(CapitalArc.NOSE);
      expect(locations).toContain(CapitalArc.AFT);
      expect(locations).toContain(CapitalArc.FRONT_LEFT);
      expect(locations).toContain(CapitalArc.FRONT_RIGHT);
    });
  });

  describe('canHandle', () => {
    it('should handle DropShip unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle JumpShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'JumpShip',
        mappedUnitType: UnitType.JUMPSHIP,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });
});
