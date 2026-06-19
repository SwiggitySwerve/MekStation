/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ConventionalFighterEngineType,
  AerospaceCockpitType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  ConventionalFighterUnitHandler,
  createConventionalFighterHandler,
} from '../ConventionalFighterUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createLightFighterDocument,
  createMediumFighterDocument,
  createHeavyFighterDocument,
} from './ConventionalFighterUnitHandler.test-helpers';

describe('ConventionalFighterUnitHandler', () => {
  let handler: ConventionalFighterUnitHandler;

  beforeEach(() => {
    handler = createConventionalFighterHandler();
  });

  describe('constructor and properties', () => {
    it('should have unitType of CONVENTIONAL_FIGHTER', () => {
      expect(handler.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
    });

    it('should have displayName of "Conventional Fighter"', () => {
      expect(handler.displayName).toBe('Conventional Fighter');
    });

    it('should return AerospaceLocation values from getLocations()', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(AerospaceLocation.NOSE);
      expect(locations).toContain(AerospaceLocation.LEFT_WING);
      expect(locations).toContain(AerospaceLocation.RIGHT_WING);
      expect(locations).toContain(AerospaceLocation.AFT);
      expect(locations).toContain(AerospaceLocation.FUSELAGE);
    });

    it('should return all 5 aerospace locations', () => {
      const locations = handler.getLocations();
      expect(locations.length).toBe(5);
    });
  });

  // ============================================================================
  // canHandle Tests
  // ============================================================================

  describe('canHandle', () => {
    it('should handle ConvFighter unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Aero unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
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

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ============================================================================
  // Parsing Tests
  // ============================================================================
});
