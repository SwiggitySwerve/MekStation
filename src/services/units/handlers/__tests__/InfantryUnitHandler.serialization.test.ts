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

  describe('serialize', () => {
    it('should serialize successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.unitType).toBe(
        UnitType.INFANTRY,
      );
    });

    it('should include configuration (motion type) in serialized output', () => {
      const doc = createMockBlkDocument({ motionType: 'Jump', jumpingMP: 3 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe(
        SquadMotionType.JUMP,
      );
    });

    it('should include chassis and model', () => {
      const doc = createMockBlkDocument({
        name: 'Test Platoon',
        model: 'Alpha',
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.chassis).toBe('Test Platoon');
      expect(serializeResult.data?.serialized?.model).toBe('Alpha');
    });
  });

  // ==========================================================================
  // Deserialization
  // ==========================================================================

  describe('deserialize', () => {
    it('should return failure result (not yet implemented)', () => {
      // Create a minimal mock ISerializedUnit for testing
      const serialized = {
        id: 'test-id',
        chassis: 'Test',
        model: 'Test',
        unitType: 'Infantry',
        configuration: 'Foot',
        techBase: 'Inner Sphere',
        rulesLevel: 'Introductory',
        era: 'Succession Wars',
        year: 3025,
        tonnage: 0.1,
        engine: { type: 'None', rating: 0 },
        gyro: { type: 'None' },
        cockpit: 'None',
        structure: { type: 'None' },
        armor: { type: 'None', allocation: {} },
        heatSinks: { type: 'None', count: 0 },
        movement: { walk: 1, jump: 0 },
        equipment: [],
        criticalSlots: {},
      };

      const result = handler.deserialize(serialized);
      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================

  describe('createInfantryHandler', () => {
    it('should create an InfantryUnitHandler instance', () => {
      const newHandler = createInfantryHandler();
      expect(newHandler).toBeInstanceOf(InfantryUnitHandler);
    });

    it('should create independent instances', () => {
      const handler1 = createInfantryHandler();
      const handler2 = createInfantryHandler();
      expect(handler1).not.toBe(handler2);
    });

    it('should have correct unit type', () => {
      const newHandler = createInfantryHandler();
      expect(newHandler.unitType).toBe(UnitType.INFANTRY);
    });
  });
});
