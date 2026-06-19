/**
 * WarShipUnitHandler Tests
 *
 * Tests for WarShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc, KFDriveType } from '@/types/unit/CapitalShipInterfaces';

import {
  WarShipUnitHandler,
  createWarShipHandler,
} from '../WarShipUnitHandler';
// ============================================================================
import { createMockBlkDocument } from './WarShipUnitHandler.test-helpers';

describe('WarShipUnitHandler', () => {
  let handler: WarShipUnitHandler;

  beforeEach(() => {
    handler = createWarShipHandler();
  });

  describe('serialization', () => {
    it('should serialize WarShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
      expect(serializeResult.data?.serialized?.chassis).toBe('McKenna');
      expect(serializeResult.data?.serialized?.model).toBe('Battleship');
    });

    it('should serialize with spheroid configuration', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe('Spheroid');
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'warship-test',
        chassis: 'McKenna',
        model: 'Battleship',
        tonnage: 1400000,
        unitType: 'WARSHIP',
        configuration: 'Spheroid',
        techBase: 'Inner Sphere',
        rulesLevel: 'Advanced',
        era: 'Star League',
        year: 2652,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Double', count: 5000 },
        movement: { walk: 0, jump: 0 },
        equipment: [],
        criticalSlots: {},
        quirks: [],
      });

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });
});
