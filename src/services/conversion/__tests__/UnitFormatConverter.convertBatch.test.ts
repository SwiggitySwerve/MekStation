/**
 * UnitFormatConverter Tests
 *
 * Tests for converting MegaMekLab format to internal format.
 */

import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  UnitFormatConverter,
  unitFormatConverter,
  MegaMekLabUnit,
} from '../UnitFormatConverter';
import { createMegaMekLabUnit } from './UnitFormatConverter.test-helpers';

describe('UnitFormatConverter', () => {
  let converter: UnitFormatConverter;

  beforeEach(() => {
    converter = new UnitFormatConverter();
  });

  describe('convertBatch', () => {
    it('should convert multiple units', () => {
      const units = [
        createMegaMekLabUnit({ chassis: 'Atlas', model: 'AS7-D' }),
        createMegaMekLabUnit({ chassis: 'Locust', model: 'LCT-1V', mass: 20 }),
        createMegaMekLabUnit({
          chassis: 'Marauder',
          model: 'MAD-3R',
          mass: 75,
        }),
      ];

      const result = converter.convertBatch(units);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(3);
    });

    it('should track successful and failed conversions', () => {
      const units: MegaMekLabUnit[] = [
        createMegaMekLabUnit(),
        // @ts-expect-error - testing with null to validate error handling
        null, // Will fail
        createMegaMekLabUnit(),
      ];

      const result = converter.convertBatch(units);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should handle empty batch', () => {
      const result = converter.convertBatch([]);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
