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

  describe('configuration mapping', () => {
    it('should convert biped configuration', () => {
      const source = createMegaMekLabUnit({ config: 'Biped' });
      const result = converter.convert(source);

      expect(result.unit?.configuration).toBe(MechConfiguration.BIPED);
    });

    it('should convert quad configuration', () => {
      const source = createMegaMekLabUnit({ config: 'Quad' });
      const result = converter.convert(source);

      expect(result.unit?.configuration).toBe(MechConfiguration.QUAD);
    });

    it('should convert tripod configuration', () => {
      const source = createMegaMekLabUnit({ config: 'Tripod' });
      const result = converter.convert(source);

      expect(result.unit?.configuration).toBe(MechConfiguration.TRIPOD);
    });
  });
});
