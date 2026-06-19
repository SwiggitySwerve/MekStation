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

  describe('serialization', () => {
    it('should serialize DropShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized?.chassis).toBe('Union');
    });

    it('should serialize with motion type configuration', () => {
      const spheroidDoc = createMockBlkDocument();
      const aerodyneDoc = createAerodyneDropShip();

      const spheroidResult = handler.parse(spheroidDoc);
      const aerodyneResult = handler.parse(aerodyneDoc);

      const spheroidSerialized = handler.serialize(spheroidResult.data!.unit);
      const aerodyneSerialized = handler.serialize(aerodyneResult.data!.unit);

      expect(spheroidSerialized.data?.serialized?.configuration).toBe(
        AerospaceMotionType.SPHEROID,
      );
      expect(aerodyneSerialized.data?.serialized?.configuration).toBe(
        AerospaceMotionType.AERODYNE,
      );
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'dropship-test',
        chassis: 'Union',
        model: 'Standard',
        tonnage: 3500,
        unitType: 'DROPSHIP',
        configuration: 'Spheroid',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: 2708,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 100 },
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
