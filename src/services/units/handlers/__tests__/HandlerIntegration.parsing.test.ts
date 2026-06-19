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

  describe('handler parsing', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should parse Vehicle document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.VEHICLE);
      const doc = createVehicleDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.VEHICLE);
      expect(result.data?.unit?.tonnage).toBe(60);
    });

    it('should parse VTOL document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.VTOL);
      const doc = createVTOLDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.VTOL);
      expect(result.data?.unit?.tonnage).toBe(20);
    });

    it('should parse Support Vehicle document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.SUPPORT_VEHICLE);
      const doc = createSupportVehicleDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.SUPPORT_VEHICLE);
    });

    it('should parse Aerospace document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.AEROSPACE);
      const doc = createAerospaceDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.AEROSPACE);
      expect(result.data?.unit?.tonnage).toBe(75);
    });

    it('should parse Conventional Fighter document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.CONVENTIONAL_FIGHTER);
      const doc = createConventionalFighterDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
    });

    it('should parse Small Craft document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.SMALL_CRAFT);
      const doc = createSmallCraftDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.SMALL_CRAFT);
      expect(result.data?.unit?.tonnage).toBe(150);
    });

    it('should parse Battle Armor document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.BATTLE_ARMOR);
      const doc = createBattleArmorDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.BATTLE_ARMOR);
    });

    it('should parse Infantry document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.INFANTRY);
      const doc = createInfantryDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.INFANTRY);
    });

    it('should parse ProtoMech document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.PROTOMECH);
      const doc = createProtoMechDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.PROTOMECH);
    });

    it('should parse DropShip document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.DROPSHIP);
      const doc = createDropShipDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.DROPSHIP);
      expect(result.data?.unit?.tonnage).toBe(3500);
    });

    it('should parse WarShip document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.WARSHIP);
      const doc = createWarShipDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.WARSHIP);
    });

    it('should parse JumpShip document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.JUMPSHIP);
      const doc = createJumpShipDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.JUMPSHIP);
    });

    it('should parse Space Station document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.SPACE_STATION);
      const doc = createSpaceStationDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.SPACE_STATION);
    });
  });

  // ==========================================================================
  // Handler Lookup Tests
  // ==========================================================================
});
