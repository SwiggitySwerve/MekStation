/**
 * UnitTypeRegistry Tests
 *
 * Tests for unit type handler registration and lookup
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import {
  UnitTypeRegistry,
  getUnitTypeRegistry,
  registerUnitTypeHandler,
  getUnitTypeHandler,
  isUnitTypeSupported,
} from '../UnitTypeRegistry';
import { UnitCategory } from '../../../types/validation/UnitValidationInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import {
  createVehicleHandler,
  createAerospaceHandler,
  createBattleArmorHandler,
  createInfantryHandler,
  initializeUnitTypeHandlers,
  resetHandlerInitialization,
} from '../handlers';

// ============================================================================
// Tests
// ============================================================================

describe('UnitTypeRegistry', () => {
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

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const registry1 = getUnitTypeRegistry();
      const registry2 = getUnitTypeRegistry();
      expect(registry1).toBe(registry2);
    });
  });

  describe('handler registration', () => {
    it('should register a handler', () => {
      const handler = createVehicleHandler();
      registerUnitTypeHandler(handler);

      expect(isUnitTypeSupported(UnitType.VEHICLE)).toBe(true);
    });

    it('should retrieve registered handler', () => {
      const handler = createVehicleHandler();
      registerUnitTypeHandler(handler);

      const retrieved = getUnitTypeHandler(UnitType.VEHICLE);
      expect(retrieved).toBeDefined();
      expect(retrieved?.unitType).toBe(UnitType.VEHICLE);
    });

    it('should return undefined for unregistered type', () => {
      const handler = getUnitTypeHandler(UnitType.VEHICLE);
      expect(handler).toBeUndefined();
    });

    it('should allow replacing handlers', () => {
      const handler1 = createVehicleHandler();
      const handler2 = createVehicleHandler();

      registerUnitTypeHandler(handler1);
      registerUnitTypeHandler(handler2);

      // Should not throw, just warn
      expect(isUnitTypeSupported(UnitType.VEHICLE)).toBe(true);
    });
  });

  describe('multiple handler types', () => {
    it('should register multiple handler types', () => {
      registerUnitTypeHandler(createVehicleHandler());
      registerUnitTypeHandler(createAerospaceHandler());
      registerUnitTypeHandler(createBattleArmorHandler());

      expect(isUnitTypeSupported(UnitType.VEHICLE)).toBe(true);
      expect(isUnitTypeSupported(UnitType.AEROSPACE)).toBe(true);
      expect(isUnitTypeSupported(UnitType.BATTLE_ARMOR)).toBe(true);
    });

    it('should get all registered types', () => {
      registerUnitTypeHandler(createVehicleHandler());
      registerUnitTypeHandler(createAerospaceHandler());

      const types = getUnitTypeRegistry().getRegisteredTypes();
      expect(types).toContain(UnitType.VEHICLE);
      expect(types).toContain(UnitType.AEROSPACE);
      expect(types.length).toBe(2);
    });
  });

  describe('category filtering', () => {
    it('should get handlers by category', () => {
      registerUnitTypeHandler(createVehicleHandler());
      registerUnitTypeHandler(createAerospaceHandler());
      registerUnitTypeHandler(createBattleArmorHandler());
      registerUnitTypeHandler(createInfantryHandler());

      const vehicleHandlers = getUnitTypeRegistry().getHandlersByCategory(UnitCategory.VEHICLE);
      expect(vehicleHandlers.length).toBe(1);
      expect(vehicleHandlers[0].unitType).toBe(UnitType.VEHICLE);

      const personnelHandlers = getUnitTypeRegistry().getHandlersByCategory(UnitCategory.PERSONNEL);
      expect(personnelHandlers.length).toBe(2);
    });
  });

  describe('getHandlerForDocument', () => {
    it('should find handler for BLK document', () => {
      registerUnitTypeHandler(createVehicleHandler());

      const mockDoc = {
        blockVersion: 1,
        version: 'MAM0',
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
        name: 'Test',
        model: 'Test',
        year: 3025,
        type: 'IS Level 1',
        tonnage: 50,
        armor: [],
        equipmentByLocation: {},
        rawTags: {},
      };

      const handler = getUnitTypeRegistry().getHandlerForDocument(mockDoc as IBlkDocument);
      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.VEHICLE);
    });

    it('should return undefined for unsupported document', () => {
      // Don't register any handlers
      const mockDoc = {
        blockVersion: 1,
        version: 'MAM0',
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
        name: 'Test',
        model: 'Test',
        year: 3025,
        type: 'IS Level 1',
        tonnage: 50,
        armor: [],
        equipmentByLocation: {},
        rawTags: {},
      };

      const handler = getUnitTypeRegistry().getHandlerForDocument(mockDoc as IBlkDocument);
      expect(handler).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should return correct statistics', () => {
      registerUnitTypeHandler(createVehicleHandler());
      registerUnitTypeHandler(createAerospaceHandler());
      registerUnitTypeHandler(createBattleArmorHandler());

      const registry = getUnitTypeRegistry() as UnitTypeRegistry;
      const stats = registry.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byCategory[UnitCategory.VEHICLE]).toBe(1);
      expect(stats.byCategory[UnitCategory.AEROSPACE]).toBe(1);
      expect(stats.byCategory[UnitCategory.PERSONNEL]).toBe(1);
    });

    it('should return handler count', () => {
      registerUnitTypeHandler(createVehicleHandler());
      registerUnitTypeHandler(createAerospaceHandler());

      const registry = getUnitTypeRegistry() as UnitTypeRegistry;
      expect(registry.getHandlerCount()).toBe(2);
    });
  });

  describe('initializeUnitTypeHandlers', () => {
    it('should register all handlers', () => {
      initializeUnitTypeHandlers();

      expect(isUnitTypeSupported(UnitType.VEHICLE)).toBe(true);
      expect(isUnitTypeSupported(UnitType.AEROSPACE)).toBe(true);
      expect(isUnitTypeSupported(UnitType.BATTLE_ARMOR)).toBe(true);
      expect(isUnitTypeSupported(UnitType.INFANTRY)).toBe(true);
      expect(isUnitTypeSupported(UnitType.PROTOMECH)).toBe(true);
      expect(isUnitTypeSupported(UnitType.DROPSHIP)).toBe(true);
      expect(isUnitTypeSupported(UnitType.WARSHIP)).toBe(true);
    });

    it('should not re-register on second call', () => {
      initializeUnitTypeHandlers();
      const count1 = (getUnitTypeRegistry() as UnitTypeRegistry).getHandlerCount();

      initializeUnitTypeHandlers();
      const count2 = (getUnitTypeRegistry() as UnitTypeRegistry).getHandlerCount();

      expect(count1).toBe(count2);
    });
  });
});
