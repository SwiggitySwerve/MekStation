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

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(unitFormatConverter).toBeInstanceOf(UnitFormatConverter);
    });
  });
});
