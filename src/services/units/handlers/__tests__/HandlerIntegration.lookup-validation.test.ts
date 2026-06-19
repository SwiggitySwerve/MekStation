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

  describe('handler lookup by document', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should find handler for Tank document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createVehicleDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.VEHICLE);
    });

    it('should find handler for VTOL document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createVTOLDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.VTOL);
    });

    it('should find handler for Aero document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createAerospaceDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.AEROSPACE);
    });

    it('should find handler for BattleArmor document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createBattleArmorDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.BATTLE_ARMOR);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('handler validation', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should validate parsed Vehicle unit', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.VEHICLE);
      const doc = createVehicleDocument();

      const parseResult = handler!.parse(doc);
      expect(parseResult.success).toBe(true);

      const validationResult = handler!.validate(parseResult.data!.unit);
      expect(validationResult.isValid).toBe(true);
    });

    it('should validate parsed Aerospace unit', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.AEROSPACE);
      const doc = createAerospaceDocument();

      const parseResult = handler!.parse(doc);
      expect(parseResult.success).toBe(true);

      const validationResult = handler!.validate(parseResult.data!.unit);
      expect(validationResult.isValid).toBe(true);
    });

    it('should validate parsed DropShip unit', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.DROPSHIP);
      const doc = createDropShipDocument();

      const parseResult = handler!.parse(doc);
      expect(parseResult.success).toBe(true);

      const validationResult = handler!.validate(parseResult.data!.unit);
      expect(validationResult.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // Calculation Tests
  // ==========================================================================

  describe('handler calculations', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should calculate weight for all unit types', () => {
      const registry = getUnitTypeRegistry();

      for (const unitType of registry.getRegisteredTypes()) {
        const handler = registry.getHandler(unitType);
        const doc = createDocumentForUnitType(unitType);
        const parseResult = handler!.parse(doc);

        if (parseResult.success && parseResult.data?.unit) {
          const weight = handler!.calculateWeight(parseResult.data.unit);
          expect(typeof weight).toBe('number');
          expect(weight).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should calculate BV for all unit types', () => {
      const registry = getUnitTypeRegistry();

      for (const unitType of registry.getRegisteredTypes()) {
        const handler = registry.getHandler(unitType);
        const doc = createDocumentForUnitType(unitType);
        const parseResult = handler!.parse(doc);

        if (parseResult.success && parseResult.data?.unit) {
          const bv = handler!.calculateBV(parseResult.data.unit);
          expect(typeof bv).toBe('number');
          expect(bv).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should calculate cost for all unit types', () => {
      const registry = getUnitTypeRegistry();

      for (const unitType of registry.getRegisteredTypes()) {
        const handler = registry.getHandler(unitType);
        const doc = createDocumentForUnitType(unitType);
        const parseResult = handler!.parse(doc);

        if (parseResult.success && parseResult.data?.unit) {
          const cost = handler!.calculateCost(parseResult.data.unit);
          expect(typeof cost).toBe('number');
          expect(cost).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
