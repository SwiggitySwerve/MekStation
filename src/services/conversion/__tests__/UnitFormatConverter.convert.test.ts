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
    it('should successfully convert a valid unit', () => {
      const source = createMegaMekLabUnit();
      const result = converter.convert(source);

      expect(result.success).toBe(true);
      expect(result.unit).not.toBeNull();
      expect(result.errors.length).toBe(0);
    });

    it('should convert chassis and model correctly', () => {
      const source = createMegaMekLabUnit({
        chassis: 'Marauder',
        model: 'MAD-3R',
      });

      const result = converter.convert(source);

      expect(result.unit?.chassis).toBe('Marauder');
      expect(result.unit?.model).toBe('MAD-3R');
    });

    it('should generate ID from MUL ID', () => {
      const source = createMegaMekLabUnit({ mul_id: '456' });
      const result = converter.convert(source);

      expect(result.unit?.id).toBe('mul-456');
    });

    it('should generate ID from chassis/model if no MUL ID', () => {
      const source = createMegaMekLabUnit({
        mul_id: '',
        chassis: 'Test Mech',
        model: 'TM-1',
      });

      const result = converter.convert(source);

      expect(result.unit?.id).toBe('test-mech-tm-1');
    });

    it('should convert tech base correctly', () => {
      const isUnit = createMegaMekLabUnit({ tech_base: 'Inner Sphere' });
      const clanUnit = createMegaMekLabUnit({ tech_base: 'Clan' });

      expect(converter.convert(isUnit).unit?.techBase).toBe(
        TechBase.INNER_SPHERE,
      );
      expect(converter.convert(clanUnit).unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should convert tonnage correctly', () => {
      const lightMech = createMegaMekLabUnit({ mass: 35 });
      const assaultMech = createMegaMekLabUnit({ mass: 100 });

      expect(converter.convert(lightMech).unit?.tonnage).toBe(35);
      expect(converter.convert(assaultMech).unit?.tonnage).toBe(100);
    });

    it('should convert era from year', () => {
      const source = createMegaMekLabUnit({ era: 3050 });
      const result = converter.convert(source);

      expect(result.unit?.year).toBe(3050);
    });

    it('should convert engine type', () => {
      const standardEngine = createMegaMekLabUnit({
        engine: { type: 'Fusion Engine', rating: 300 },
      });
      const xlEngine = createMegaMekLabUnit({
        engine: { type: 'XL Engine', rating: 300 },
      });

      expect(converter.convert(standardEngine).unit?.engine.type).toBe(
        'Standard Fusion',
      );
      expect(converter.convert(xlEngine).unit?.engine.type).toBe(
        'XL Engine (IS)',
      );
    });

    it('should convert engine rating', () => {
      const source = createMegaMekLabUnit({
        engine: { type: 'Fusion Engine', rating: 280 },
      });

      const result = converter.convert(source);
      expect(result.unit?.engine.rating).toBe(280);
    });

    it('should convert structure type', () => {
      const standardStructure = createMegaMekLabUnit({
        structure: { type: 'Standard' },
      });
      const endoStructure = createMegaMekLabUnit({
        structure: { type: 'Endo Steel' },
      });

      expect(converter.convert(standardStructure).unit?.structure.type).toBe(
        'Standard',
      );
      expect(converter.convert(endoStructure).unit?.structure.type).toBe(
        'Endo Steel (IS)',
      );
    });

    it('should convert armor type', () => {
      const standardArmor = createMegaMekLabUnit();
      const ferroArmor = createMegaMekLabUnit({
        armor: {
          type: 'Ferro-Fibrous',
          locations: [],
        },
      });

      expect(converter.convert(standardArmor).unit?.armor.type).toBe(
        'Standard',
      );
      expect(converter.convert(ferroArmor).unit?.armor.type).toBe(
        'Ferro-Fibrous (IS)',
      );
    });

    it('should convert armor allocation', () => {
      const source = createMegaMekLabUnit();
      const result = converter.convert(source);

      expect(result.unit?.armor.allocation.head).toBe(9);
      expect(
        (
          result.unit?.armor.allocation.centerTorso as {
            front: number;
            rear: number;
          }
        ).front,
      ).toBe(47);
      expect(
        (
          result.unit?.armor.allocation.centerTorso as {
            front: number;
            rear: number;
          }
        ).rear,
      ).toBe(14);
    });

    it('should convert heat sinks', () => {
      const singleHS = createMegaMekLabUnit({
        heat_sinks: { type: 'Single', count: 15 },
      });
      const doubleHS = createMegaMekLabUnit({
        heat_sinks: { type: 'Double', count: 12 },
      });

      expect(converter.convert(singleHS).unit?.heatSinks.type).toBe('Single');
      expect(converter.convert(singleHS).unit?.heatSinks.count).toBe(15);
      expect(converter.convert(doubleHS).unit?.heatSinks.type).toBe(
        'Double (IS)',
      );
    });

    it('should convert movement', () => {
      const source = createMegaMekLabUnit({
        walk_mp: '5',
        jump_mp: '3',
      });

      const result = converter.convert(source);

      expect(result.unit?.movement.walk).toBe(5);
      expect(result.unit?.movement.jump).toBe(3);
    });

    it('should handle numeric walk/jump MP', () => {
      const source = createMegaMekLabUnit({
        walk_mp: 4,
        jump_mp: 2,
      });

      const result = converter.convert(source);

      expect(result.unit?.movement.walk).toBe(4);
      expect(result.unit?.movement.jump).toBe(2);
    });

    it('should detect movement enhancements', () => {
      const mascUnit = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'MASC',
            location: 'Center Torso',
            item_type: 'ISMASC',
            tech_base: 'IS',
          },
        ],
      });

      const result = converter.convert(mascUnit);

      expect(result.unit?.movement.enhancements).toContain('MASC');
    });

    it('should detect jump jet type', () => {
      const standardJJ = createMegaMekLabUnit({
        jump_mp: '3',
        weapons_and_equipment: [
          {
            item_name: 'Jump Jet',
            location: 'Left Leg',
            item_type: 'JumpJet',
            tech_base: 'IS',
          },
        ],
      });
      const improvedJJ = createMegaMekLabUnit({
        jump_mp: '3',
        weapons_and_equipment: [
          {
            item_name: 'Improved Jump Jet',
            location: 'Left Leg',
            item_type: 'ImprovedJumpJet',
            tech_base: 'IS',
          },
        ],
      });

      expect(converter.convert(standardJJ).unit?.movement.jumpJetType).toBe(
        'Standard',
      );
      expect(converter.convert(improvedJJ).unit?.movement.jumpJetType).toBe(
        'Improved',
      );
    });

    it('should convert equipment', () => {
      const source = createMegaMekLabUnit();
      const result = converter.convert(source);

      expect(result.unit?.equipment.length).toBeGreaterThan(0);
    });
  });
});
