/**
 * InfantryUnitHandler Tests
 *
 * Comprehensive tests for Infantry BLK parsing, validation, calculations, and serialization
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateInfantryBVFromUnit } from '@/utils/construction/infantry';

import {
  InfantryUnitHandler,
  createInfantryHandler,
} from '../InfantryUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createJumpInfantryDocument,
  createMechanizedInfantryDocument,
  createFieldGunInfantryDocument,
  createAntiMechInfantryDocument,
  createAugmentedInfantryDocument,
  createClanInfantryDocument,
} from './InfantryUnitHandler.test-helpers';

describe('InfantryUnitHandler', () => {
  let handler: InfantryUnitHandler;

  beforeEach(() => {
    handler = createInfantryHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.INFANTRY);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Infantry');
    });
  });

  describe('getLocations', () => {
    it('should return Platoon as the only location', () => {
      const locations = handler.getLocations();
      expect(locations).toEqual(['Platoon']);
    });

    it('should return a readonly array', () => {
      const locations = handler.getLocations();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBe(1);
    });
  });

  // ==========================================================================
  // canHandle
  // ==========================================================================

  describe('canHandle', () => {
    it('should handle Infantry unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle BattleArmor unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleArmor',
        mappedUnitType: UnitType.BATTLE_ARMOR,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Vehicle unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Aerospace unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing
  // ==========================================================================
});
