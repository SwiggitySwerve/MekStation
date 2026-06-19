/**
 * Handler Integration Tests
 *
 * Tests the full handler registration and parsing flow across all unit types.
 * Validates that all 13 handlers work correctly with the UnitTypeRegistry.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { UnitTypeRegistry, getUnitTypeRegistry } from '../../UnitTypeRegistry';
import {
  initializeUnitTypeHandlers,
  resetHandlerInitialization,
  getSupportedUnitTypes,
} from '../initializeHandlers';
// ============================================================================
// Test Setup
// ============================================================================
import {
  createBaseDocument,
  createVehicleDocument,
  createVTOLDocument,
  createSupportVehicleDocument,
  createAerospaceDocument,
  createConventionalFighterDocument,
  createSmallCraftDocument,
  createBattleArmorDocument,
  createInfantryDocument,
  createProtoMechDocument,
  createDropShipDocument,
  createWarShipDocument,
  createJumpShipDocument,
  createSpaceStationDocument,
  createDocumentForUnitType,
  DOCUMENT_FACTORIES_BY_UNIT_TYPE,
} from './HandlerIntegration.test-helpers';

describe('Handler Integration', () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = getUnitTypeRegistry() as UnitTypeRegistry;
    registry.clear();
    resetHandlerInitialization();
  });

  afterEach(() => {
    // Clean up
    const registry = getUnitTypeRegistry() as UnitTypeRegistry;
    registry.clear();
    resetHandlerInitialization();
  });

  // ==========================================================================
  // Handler Registration Tests
  // ==========================================================================

  describe('handler registration', () => {
    it('should register all 13 handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();
      const registeredTypes = registry.getRegisteredTypes();

      expect(registeredTypes.length).toBe(13);
    });

    it('should register vehicle handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.VEHICLE)).toBeDefined();
      expect(registry.getHandler(UnitType.VTOL)).toBeDefined();
      expect(registry.getHandler(UnitType.SUPPORT_VEHICLE)).toBeDefined();
    });

    it('should register aerospace handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.AEROSPACE)).toBeDefined();
      expect(registry.getHandler(UnitType.CONVENTIONAL_FIGHTER)).toBeDefined();
      expect(registry.getHandler(UnitType.SMALL_CRAFT)).toBeDefined();
    });

    it('should register personnel unit handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.BATTLE_ARMOR)).toBeDefined();
      expect(registry.getHandler(UnitType.INFANTRY)).toBeDefined();
      expect(registry.getHandler(UnitType.PROTOMECH)).toBeDefined();
    });

    it('should register capital ship handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.DROPSHIP)).toBeDefined();
      expect(registry.getHandler(UnitType.WARSHIP)).toBeDefined();
      expect(registry.getHandler(UnitType.JUMPSHIP)).toBeDefined();
      expect(registry.getHandler(UnitType.SPACE_STATION)).toBeDefined();
    });

    it('should return correct supported unit types', () => {
      const types = getSupportedUnitTypes();

      expect(types).toContain('Vehicle');
      expect(types).toContain('VTOL');
      expect(types).toContain('Support Vehicle');
      expect(types).toContain('Aerospace');
      expect(types).toContain('Conventional Fighter');
      expect(types).toContain('Small Craft');
      expect(types).toContain('Battle Armor');
      expect(types).toContain('Infantry');
      expect(types).toContain('ProtoMech');
      expect(types).toContain('DropShip');
      expect(types).toContain('WarShip');
      expect(types).toContain('JumpShip');
      expect(types).toContain('Space Station');
    });
  });

  // ==========================================================================
  // Handler Parsing Tests
  // ==========================================================================
});
