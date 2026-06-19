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

  describe('convert', () => {
    it('should skip system components in equipment', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Life Support',
            location: 'Head',
            item_type: 'Life Support',
            tech_base: 'IS',
          },
          {
            item_name: 'Medium Laser',
            location: 'Left Arm',
            item_type: 'MediumLaser',
            tech_base: 'IS',
          },
        ],
      });

      const result = converter.convert(source);

      // Life Support should be skipped
      expect(result.unit?.equipment.every((e) => !e.id.includes('life'))).toBe(
        true,
      );
    });

    it('should handle rear-facing equipment', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Medium Laser',
            location: 'Center Torso',
            item_type: 'MediumLaser',
            tech_base: 'IS',
            rear_facing: true,
          },
        ],
      });

      const result = converter.convert(source);

      expect(result.unit?.equipment.some((e) => e.isRearMounted)).toBe(true);
    });

    it('should warn for unknown equipment', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Unknown Weapon',
            location: 'Left Arm',
            item_type: 'UnknownWeapon',
            tech_base: 'IS',
          },
        ],
      });

      const result = converter.convert(source);

      expect(
        result.warnings.some((w) => w.message.includes('Unknown equipment')),
      ).toBe(true);
    });

    it('should convert critical slots', () => {
      const source = createMegaMekLabUnit();
      const result = converter.convert(source);

      expect(result.unit?.criticalSlots).toBeDefined();
    });

    it('should convert empty slots to null', () => {
      const source = createMegaMekLabUnit();
      const result = converter.convert(source);

      // Check that -Empty- is converted to null
      // The location key depends on what MechLocation enum value is used
      const critSlots = result.unit?.criticalSlots;
      const slotArrays = Object.values(critSlots || {});
      // At least one location should have null slots (from -Empty-)
      expect(slotArrays.some((slots) => slots.some((s) => s === null))).toBe(
        true,
      );
    });

    it('should detect OmniMech from config', () => {
      const omniMech = createMegaMekLabUnit({ config: 'Biped Omnimech' });
      const standardMech = createMegaMekLabUnit({ config: 'Biped' });

      expect(converter.convert(omniMech).unit?.unitType).toBe('OmniMech');
      expect(converter.convert(standardMech).unit?.unitType).toBe('BattleMech');
    });

    it('should detect OmniMech from is_omnimech flag', () => {
      const omniMech = createMegaMekLabUnit({ is_omnimech: true });

      expect(converter.convert(omniMech).unit?.unitType).toBe('OmniMech');
    });

    it('should preserve variant from clanname', () => {
      const source = createMegaMekLabUnit({ clanname: 'Daishi' });
      const result = converter.convert(source);

      expect(result.unit?.variant).toBe('Daishi');
    });

    it('should preserve variant from omnimech configuration', () => {
      const source = createMegaMekLabUnit({ omnimech_configuration: 'Prime' });
      const result = converter.convert(source);

      expect(result.unit?.variant).toBe('Prime');
    });

    it('should convert quirks', () => {
      const source = createMegaMekLabUnit({
        quirks: ['battle_fists_la', 'battle_fists_ra'],
      });

      const result = converter.convert(source);

      expect(result.unit?.quirks).toContain('battle_fists_la');
      expect(result.unit?.quirks).toContain('battle_fists_ra');
    });

    it('should convert fluff text', () => {
      const source = createMegaMekLabUnit({
        fluff_text: {
          overview: 'The Atlas is a famous assault mech.',
          capabilities: 'Heavy armor and firepower.',
          history: 'Designed by General Kerensky.',
        },
      });

      const result = converter.convert(source);

      expect(result.unit?.fluff?.overview).toBe(
        'The Atlas is a famous assault mech.',
      );
      expect(result.unit?.fluff?.capabilities).toBe(
        'Heavy armor and firepower.',
      );
      expect(result.unit?.fluff?.history).toBe('Designed by General Kerensky.');
    });

    it('should convert manufacturer info', () => {
      const source = createMegaMekLabUnit({
        manufacturers: [
          { name: 'Defiance Industries', location: 'Hesperus II' },
        ],
      });

      const result = converter.convert(source);

      expect(result.unit?.fluff?.manufacturer).toBe('Defiance Industries');
      expect(result.unit?.fluff?.primaryFactory).toBe('Hesperus II');
    });

    it('should convert system manufacturers', () => {
      const source = createMegaMekLabUnit({
        system_manufacturers: [
          { type: 'Engine', name: 'Vlar 300' },
          { type: 'Armor', name: 'Durallex Heavy' },
        ],
      });

      const result = converter.convert(source);

      expect(result.unit?.fluff?.systemManufacturer?.engine).toBe('Vlar 300');
      expect(result.unit?.fluff?.systemManufacturer?.armor).toBe(
        'Durallex Heavy',
      );
    });

    it('should return undefined fluff when no fluff data present', () => {
      const source = createMegaMekLabUnit({
        fluff_text: undefined,
        manufacturers: undefined,
        system_manufacturers: undefined,
      });

      const result = converter.convert(source);

      expect(result.unit?.fluff).toBeUndefined();
    });

    it('should handle conversion errors gracefully', () => {
      // @ts-expect-error - testing with null to validate error handling
      const source: MegaMekLabUnit = null;

      const result = converter.convert(source);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
