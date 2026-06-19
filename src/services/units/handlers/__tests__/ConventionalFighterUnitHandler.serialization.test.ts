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

  describe('serialization', () => {
    describe('serialize', () => {
      it('should serialize successfully', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.success).toBe(true);
        expect(serializeResult.data?.serialized).toBeDefined();
      });

      it('should include id in serialized output', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.id).toBeDefined();
      });

      it('should include chassis and model', () => {
        const doc = createMockBlkDocument({
          name: 'Test Fighter',
          model: 'TF-1',
        });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.chassis).toBe('Test Fighter');
        expect(serializeResult.data?.serialized?.model).toBe('TF-1');
      });

      it('should include unitType', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.unitType).toBe(
          UnitType.CONVENTIONAL_FIGHTER,
        );
      });

      it('should include tonnage', () => {
        const doc = createMockBlkDocument({ tonnage: 65 });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.tonnage).toBe(65);
      });
    });

    describe('serializeTypeSpecificFields', () => {
      it('should include configuration with engine type', () => {
        const doc = createMockBlkDocument({ engineType: 0 });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.configuration).toContain(
          'ICE',
        );
      });

      it('should include Conventional Fighter in configuration', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.configuration).toContain(
          'Conventional Fighter',
        );
      });

      it('should include rules level in serialized output', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 2' });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.rulesLevel).toBeDefined();
      });
    });

    describe('deserialize', () => {
      it('should return failure result (not implemented)', () => {
        const serialized: ISerializedUnit = {
          id: 'test-id',
          chassis: 'Test',
          model: 'T-1',
          unitType: String(UnitType.CONVENTIONAL_FIGHTER),
          configuration: 'Conventional Fighter (ICE)',
          techBase: 'Inner Sphere',
          rulesLevel: 'Standard',
          era: 'Succession Wars',
          year: 3025,
          tonnage: 50,
          engine: { type: 'ICE', rating: 200 },
          gyro: { type: 'Standard' },
          cockpit: 'Standard',
          structure: { type: 'Standard' },
          armor: {
            type: 'Standard',
            allocation: { nose: 16, leftWing: 12, rightWing: 12, aft: 8 },
          },
          heatSinks: { type: 'Single', count: 0 },
          movement: { walk: 6, jump: 0 },
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
  });

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createConventionalFighterHandler', () => {
    it('should create a new handler instance', () => {
      const newHandler = createConventionalFighterHandler();
      expect(newHandler).toBeInstanceOf(ConventionalFighterUnitHandler);
    });

    it('should create independent instances', () => {
      const handler1 = createConventionalFighterHandler();
      const handler2 = createConventionalFighterHandler();
      expect(handler1).not.toBe(handler2);
    });

    it('should have correct properties on created instance', () => {
      const newHandler = createConventionalFighterHandler();
      expect(newHandler.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
      expect(newHandler.displayName).toBe('Conventional Fighter');
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('edge cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalDoc: IBlkDocument = {
        blockVersion: 1,
        version: 'MAM0',
        unitType: 'ConvFighter',
        mappedUnitType: UnitType.CONVENTIONAL_FIGHTER,
        name: 'Minimal Fighter',
        model: '',
        year: 3025,
        type: 'IS Level 2',
        tonnage: 50,
        safeThrust: 5,
        armor: [10, 8, 8, 6],
        equipmentByLocation: {},
        rawTags: {},
      };

      const result = handler.parse(minimalDoc);
      expect(result.success).toBe(true);
      expect(result.data?.unit?.fuel).toBe(0);
      expect(result.data?.unit?.structuralIntegrity).toBe(0);
    });

    it('should generate IDs with conv-fighter prefix', () => {
      const doc = createMockBlkDocument();

      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.id).toMatch(/^conv-fighter-\d+$/);
    });

    it('should handle empty equipment list', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {},
      });

      const result = handler.parse(doc);
      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment).toHaveLength(0);
    });

    it('should parse all fighter weight classes correctly', () => {
      const lightResult = handler.parse(createLightFighterDocument());
      const mediumResult = handler.parse(createMediumFighterDocument());
      const heavyResult = handler.parse(createHeavyFighterDocument());

      expect(lightResult.success).toBe(true);
      expect(mediumResult.success).toBe(true);
      expect(heavyResult.success).toBe(true);

      expect(lightResult.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
      expect(mediumResult.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
      expect(heavyResult.data?.unit?.weightClass).toBe(WeightClass.HEAVY);
    });
  });
});
