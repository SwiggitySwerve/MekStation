/**
 * SmallCraftUnitHandler Tests
 *
 * Tests for Small Craft BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SmallCraftUnitHandler,
  createSmallCraftHandler,
} from '../SmallCraftUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createSpheroidSmallCraft,
  createAssaultBoat,
} from './SmallCraftUnitHandler.test-helpers';

describe('SmallCraftUnitHandler', () => {
  let handler: SmallCraftUnitHandler;

  beforeEach(() => {
    handler = createSmallCraftHandler();
  });

  describe('serialization', () => {
    it('should serialize Small Craft', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized?.chassis).toBe('K-1');
    });

    it('should serialize with motion type configuration', () => {
      const aerodyneDoc = createMockBlkDocument();
      const spheroidDoc = createSpheroidSmallCraft();

      const aerodyneResult = handler.parse(aerodyneDoc);
      const spheroidResult = handler.parse(spheroidDoc);

      const aerodyneSerialized = handler.serialize(aerodyneResult.data!.unit);
      const spheroidSerialized = handler.serialize(spheroidResult.data!.unit);

      expect(aerodyneSerialized.data?.serialized?.configuration).toBe(
        String(AerospaceMotionType.AERODYNE),
      );
      expect(spheroidSerialized.data?.serialized?.configuration).toBe(
        String(AerospaceMotionType.SPHEROID),
      );
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'smallcraft-test',
        chassis: 'K-1',
        model: 'Shuttle',
        tonnage: 100,
        unitType: 'SMALL_CRAFT',
        configuration: 'Aerodyne',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Succession Wars',
        year: 2470,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 10 },
        movement: { walk: 0, jump: 0 },
        equipment: [],
        criticalSlots: {},
      });

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });
});
