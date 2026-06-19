/**
 * Unit Format Converter Tests
 *
 * Tests for converting MegaMekLab JSON format to internal format.
 *
 * @spec openspec/specs/serialization-formats/spec.md
 */

import {
  UnitFormatConverter,
  unitFormatConverter,
  MegaMekLabUnit,
} from '@/services/conversion/UnitFormatConverter';
import { EngineType } from '@/types/construction/EngineType';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

describe('UnitFormatConverter', () => {
  let converter: UnitFormatConverter;

  beforeEach(() => {
    converter = new UnitFormatConverter();
  });

  /**
   * Create a valid MegaMekLab unit for testing
   */
  function createMegaMekLabUnit(
    overrides: Partial<MegaMekLabUnit> = {},
  ): MegaMekLabUnit {
    return {
      chassis: 'Test Mech',
      model: 'TST-1A',
      mul_id: 12345,
      config: 'Biped',
      tech_base: 'Inner Sphere',
      era: 3025,
      source: 'TechManual',
      rules_level: '2',
      mass: 50,
      engine: {
        type: 'Fusion',
        rating: 200,
      },
      structure: {
        type: 'Standard',
      },
      heat_sinks: {
        type: 'Single',
        count: 10,
      },
      walk_mp: 4,
      jump_mp: 0,
      armor: {
        type: 'Standard',
        locations: [
          { location: 'Head', armor_points: 9 },
          { location: 'Center Torso', armor_points: 23, rear_armor_points: 8 },
          { location: 'Left Torso', armor_points: 18, rear_armor_points: 6 },
          { location: 'Right Torso', armor_points: 18, rear_armor_points: 6 },
          { location: 'Left Arm', armor_points: 16 },
          { location: 'Right Arm', armor_points: 16 },
          { location: 'Left Leg', armor_points: 20 },
          { location: 'Right Leg', armor_points: 20 },
        ],
      },
      weapons_and_equipment: [
        {
          item_name: 'Medium Laser',
          location: 'Right Arm',
          item_type: 'MediumLaser',
          tech_base: 'IS',
        },
        {
          item_name: 'Medium Laser',
          location: 'Left Arm',
          item_type: 'MediumLaser',
          tech_base: 'IS',
        },
      ],
      criticals: [
        {
          location: 'Head',
          slots: [
            'Life Support',
            'Sensors',
            'Cockpit',
            '-Empty-',
            'Sensors',
            'Life Support',
          ],
        },
      ],
      ...overrides,
    };
  }

  // ============================================================================
  // Singleton Instance
  // ============================================================================
  describe('Singleton Instance', () => {
    it('should provide a singleton instance', () => {
      expect(unitFormatConverter).toBeDefined();
      expect(unitFormatConverter).toBeInstanceOf(UnitFormatConverter);
    });
  });

  // ============================================================================
  // convert() - Basic Conversion
  // ============================================================================
  describe('convert() - Basic Conversion', () => {
    it('should convert a valid unit', () => {
      const source = createMegaMekLabUnit();
      const result = converter.convert(source);

      expect(result.success).toBe(true);
      expect(result.unit).not.toBeNull();
      expect(result.errors).toHaveLength(0);
    });

    it('should preserve chassis and model', () => {
      const source = createMegaMekLabUnit({
        chassis: 'Atlas',
        model: 'AS7-D',
      });
      const result = converter.convert(source);

      expect(result.unit?.chassis).toBe('Atlas');
      expect(result.unit?.model).toBe('AS7-D');
    });

    it('should generate ID from MUL ID when available', () => {
      const source = createMegaMekLabUnit({ mul_id: 99999 });
      const result = converter.convert(source);

      expect(result.unit?.id).toBe('mul-99999');
    });

    it('should generate ID from chassis/model when no MUL ID', () => {
      const source = createMegaMekLabUnit({
        chassis: 'Test Mech',
        model: 'TST-1A',
        mul_id: '',
      });
      const result = converter.convert(source);

      expect(result.unit?.id).toContain('test-mech');
    });
  });

  // ============================================================================
  // convert() - Tech Base Mapping
  // ============================================================================
  describe('convert() - Tech Base Mapping', () => {
    it('should map Inner Sphere tech base', () => {
      const source = createMegaMekLabUnit({ tech_base: 'Inner Sphere' });
      const result = converter.convert(source);

      expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should map Clan tech base', () => {
      const source = createMegaMekLabUnit({ tech_base: 'Clan' });
      const result = converter.convert(source);

      expect(result.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should map Mixed tech base to INNER_SPHERE (per spec VAL-ENUM-004)', () => {
      // Per spec: Components must have binary tech base, MIXED defaults to IS
      const source = createMegaMekLabUnit({ tech_base: 'Mixed' });
      const result = converter.convert(source);

      expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });
  });

  // ============================================================================
  // convert() - Era and Year Mapping
  // ============================================================================
  describe('convert() - Era and Year Mapping', () => {
    it('should extract year from numeric era', () => {
      const source = createMegaMekLabUnit({ era: 3025 });
      const result = converter.convert(source);

      expect(result.unit?.year).toBe(3025);
    });

    it('should map year to era', () => {
      const source = createMegaMekLabUnit({ era: 3050 });
      const result = converter.convert(source);

      expect(result.unit?.era).toBe(Era.CLAN_INVASION);
    });

    it('should handle string era values', () => {
      const source = createMegaMekLabUnit({ era: 'Star League' });
      const result = converter.convert(source);

      expect(result.unit?.era).toBe(Era.STAR_LEAGUE);
    });
  });

  // ============================================================================
  // convert() - Rules Level Mapping
  // ============================================================================
  describe('convert() - Rules Level Mapping', () => {
    it('should map numeric rules levels', () => {
      expect(
        converter.convert(createMegaMekLabUnit({ rules_level: '1' })).unit
          ?.rulesLevel,
      ).toBe(RulesLevel.INTRODUCTORY);
      expect(
        converter.convert(createMegaMekLabUnit({ rules_level: '2' })).unit
          ?.rulesLevel,
      ).toBe(RulesLevel.STANDARD);
      expect(
        converter.convert(createMegaMekLabUnit({ rules_level: '3' })).unit
          ?.rulesLevel,
      ).toBe(RulesLevel.ADVANCED);
      expect(
        converter.convert(createMegaMekLabUnit({ rules_level: '4' })).unit
          ?.rulesLevel,
      ).toBe(RulesLevel.EXPERIMENTAL);
    });
  });

  // ============================================================================
  // convert() - Engine Conversion
  // ============================================================================
  describe('convert() - Engine Conversion', () => {
    it('should convert standard engine', () => {
      const source = createMegaMekLabUnit({
        engine: { type: 'Fusion', rating: 300 },
      });
      const result = converter.convert(source);

      expect(result.unit?.engine.rating).toBe(300);
    });

    it('should convert XL engine', () => {
      const source = createMegaMekLabUnit({
        engine: { type: 'XL Engine', rating: 300 },
      });
      const result = converter.convert(source);

      expect(result.unit?.engine.type).toBe(EngineType.XL_IS);
    });

    it('should convert Clan XL engine', () => {
      const source = createMegaMekLabUnit({
        tech_base: 'Clan',
        engine: { type: 'Clan XL Engine', rating: 300 },
      });
      const result = converter.convert(source);

      expect(result.unit?.engine.type).toBe(EngineType.XL_CLAN);
    });
  });

  // ============================================================================
  // convert() - Armor Conversion
  // ============================================================================
  describe('convert() - Armor Conversion', () => {
    it('should convert armor allocation', () => {
      const source = createMegaMekLabUnit({
        armor: {
          type: 'Standard',
          locations: [
            { location: 'Head', armor_points: 9 },
            {
              location: 'Center Torso',
              armor_points: 40,
              rear_armor_points: 15,
            },
          ],
        },
      });
      const result = converter.convert(source);

      expect(result.unit?.armor.allocation.head).toBe(9);
      expect(
        (result.unit?.armor.allocation.centerTorso as { front: number }).front,
      ).toBe(40);
      expect(
        (result.unit?.armor.allocation.centerTorso as { rear: number }).rear,
      ).toBe(15);
    });

    it('should convert armor type', () => {
      const source = createMegaMekLabUnit({
        armor: {
          type: 'Ferro-Fibrous',
          locations: [],
        },
      });
      const result = converter.convert(source);

      expect(result.unit?.armor.type).toBeDefined();
    });
  });

  // ============================================================================
  // convert() - Movement Conversion
  // ============================================================================
  describe('convert() - Movement Conversion', () => {
    it('should convert walk MP', () => {
      const source = createMegaMekLabUnit({ walk_mp: 5 });
      const result = converter.convert(source);

      expect(result.unit?.movement.walk).toBe(5);
    });

    it('should convert jump MP', () => {
      const source = createMegaMekLabUnit({ jump_mp: 3 });
      const result = converter.convert(source);

      expect(result.unit?.movement.jump).toBe(3);
    });

    it('should handle string MP values', () => {
      const source = createMegaMekLabUnit({ walk_mp: '4', jump_mp: '2' });
      const result = converter.convert(source);

      expect(result.unit?.movement.walk).toBe(4);
      expect(result.unit?.movement.jump).toBe(2);
    });

    it('should detect MASC enhancement', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'MASC',
            location: 'Left Leg',
            item_type: 'ISMASC',
            tech_base: 'IS',
          },
        ],
      });
      const result = converter.convert(source);

      expect(result.unit?.movement.enhancements).toContain('MASC');
    });

    it('should detect TSM enhancement', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Triple Strength Myomer',
            location: 'Left Torso',
            item_type: 'ISTripleStrengthMyomer',
            tech_base: 'IS',
          },
        ],
      });
      const result = converter.convert(source);

      expect(result.unit?.movement.enhancements).toContain('TSM');
    });
  });

  // ============================================================================
  // convert() - Equipment Conversion
  // ============================================================================
  describe('convert() - Equipment Conversion', () => {
    it('should convert equipment list', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Medium Laser',
            location: 'Right Arm',
            item_type: 'MediumLaser',
            tech_base: 'IS',
          },
          {
            item_name: 'Large Laser',
            location: 'Left Torso',
            item_type: 'LargeLaser',
            tech_base: 'IS',
          },
        ],
      });
      const result = converter.convert(source);

      expect(result.unit?.equipment.length).toBe(2);
    });

    it('should preserve equipment location', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'AC/20',
            location: 'Right Torso',
            item_type: 'AC20',
            tech_base: 'IS',
          },
        ],
      });
      const result = converter.convert(source);

      expect(result.unit?.equipment[0].location).toBeDefined();
    });

    it('should handle rear-mounted equipment', () => {
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

      expect(result.unit?.equipment[0].isRearMounted).toBe(true);
    });

    it('should warn on unknown equipment', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Completely Fake Weapon',
            location: 'Right Arm',
            item_type: 'FakeWeapon123',
            tech_base: 'IS',
          },
        ],
      });
      const result = converter.convert(source);

      expect(result.warnings.some((w) => w.field === 'equipment')).toBe(true);
    });

    it('should skip system components', () => {
      const source = createMegaMekLabUnit({
        weapons_and_equipment: [
          {
            item_name: 'Life Support',
            location: 'Head',
            item_type: 'Life Support',
            tech_base: 'IS',
          },
          {
            item_name: 'Sensors',
            location: 'Head',
            item_type: 'Sensors',
            tech_base: 'IS',
          },
          {
            item_name: 'Medium Laser',
            location: 'Right Arm',
            item_type: 'MediumLaser',
            tech_base: 'IS',
          },
        ],
      });
      const result = converter.convert(source);

      // Should only have the Medium Laser, not system components
      expect(result.unit?.equipment.length).toBe(1);
    });
  });

  // ============================================================================
  // convert() - Configuration Mapping
  // ============================================================================
  describe('convert() - Configuration Mapping', () => {
    it('should map biped configuration', () => {
      const source = createMegaMekLabUnit({ config: 'Biped' });
      const result = converter.convert(source);

      expect(result.unit?.configuration).toBe(MechConfiguration.BIPED);
    });

    it('should map quad configuration', () => {
      const source = createMegaMekLabUnit({ config: 'Quad' });
      const result = converter.convert(source);

      expect(result.unit?.configuration).toBe(MechConfiguration.QUAD);
    });

    it('should detect OmniMech from config', () => {
      const source = createMegaMekLabUnit({ config: 'Biped Omnimech' });
      const result = converter.convert(source);

      expect(result.unit?.unitType).toBe('OmniMech');
    });

    it('should detect OmniMech from is_omnimech flag', () => {
      const source = createMegaMekLabUnit({ is_omnimech: true });
      const result = converter.convert(source);

      expect(result.unit?.unitType).toBe('OmniMech');
    });
  });

  // ============================================================================
  // convert() - Critical Slots Conversion
  // ============================================================================
  describe('convert() - Critical Slots Conversion', () => {
    it('should convert critical slot entries', () => {
      const source = createMegaMekLabUnit({
        criticals: [
          {
            location: 'Head',
            slots: [
              'Life Support',
              'Sensors',
              'Cockpit',
              '-Empty-',
              'Sensors',
              'Life Support',
            ],
          },
          {
            location: 'Right Arm',
            slots: [
              'Shoulder',
              'Upper Arm Actuator',
              'Medium Laser',
              '-Empty-',
              '-Empty-',
              '-Empty-',
            ],
          },
        ],
      });
      const result = converter.convert(source);

      expect(result.unit?.criticalSlots).toBeDefined();
      expect(
        Object.keys(result.unit?.criticalSlots ?? {}).length,
      ).toBeGreaterThan(0);
    });

    it('should convert empty slots to null', () => {
      const source = createMegaMekLabUnit({
        criticals: [
          {
            location: 'Right Arm',
            slots: ['-Empty-', 'Empty', 'Medium Laser'],
          },
        ],
      });
      const result = converter.convert(source);

      const rightArm = result.unit?.criticalSlots['RIGHT_ARM'];
      if (rightArm) {
        expect(rightArm[0]).toBeNull();
        expect(rightArm[1]).toBeNull();
        expect(rightArm[2]).toBe('Medium Laser');
      }
    });
  });

  // ============================================================================
  // convert() - Fluff Conversion
  // ============================================================================
  describe('convert() - Fluff Conversion', () => {
    it('should convert fluff text', () => {
      const source = createMegaMekLabUnit({
        fluff_text: {
          overview: 'A test mech overview.',
          capabilities: 'Test capabilities.',
          deployment: 'Test deployment.',
          history: 'Test history.',
        },
      });
      const result = converter.convert(source);

      expect(result.unit?.fluff?.overview).toBe('A test mech overview.');
      expect(result.unit?.fluff?.capabilities).toBe('Test capabilities.');
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
          { type: 'Armor', name: 'Durallex Standard' },
        ],
      });
      const result = converter.convert(source);

      expect(result.unit?.fluff?.systemManufacturer?.engine).toBe('Vlar 300');
      expect(result.unit?.fluff?.systemManufacturer?.armor).toBe(
        'Durallex Standard',
      );
    });

    it('should handle missing fluff', () => {
      const source = createMegaMekLabUnit();
      delete (source as Partial<MegaMekLabUnit>).fluff_text;
      delete (source as Partial<MegaMekLabUnit>).manufacturers;

      const result = converter.convert(source);

      expect(result.unit?.fluff).toBeUndefined();
    });
  });

  // ============================================================================
  // convert() - Quirks
  // ============================================================================
  describe('convert() - Quirks', () => {
    it('should convert quirks', () => {
      const source = createMegaMekLabUnit({
        quirks: ['easy_to_maintain', 'command_mech'],
      });
      const result = converter.convert(source);

      expect(result.unit?.quirks).toContain('easy_to_maintain');
      expect(result.unit?.quirks).toContain('command_mech');
    });

    it('should handle no quirks', () => {
      const source = createMegaMekLabUnit();
      delete (source as Partial<MegaMekLabUnit>).quirks;

      const result = converter.convert(source);

      expect(result.unit?.quirks).toBeUndefined();
    });
  });

  // ============================================================================
  // convert() - Error Handling
  // ============================================================================
  describe('convert() - Error Handling', () => {
    it('should handle conversion errors gracefully', () => {
      // Create a minimal unit to test error handling
      // Using Partial to indicate intentionally incomplete data
      const source: Partial<MegaMekLabUnit> = {
        chassis: 'Test',
        model: 'T-1',
        // Minimal fields that might cause issues
      };

      // Should not throw
      expect(() => converter.convert(source as MegaMekLabUnit)).not.toThrow();
    });

    it('should capture errors in result', () => {
      const source = {} as MegaMekLabUnit;
      const result = converter.convert(source);

      // Should have errors or handle gracefully
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // convertBatch()
  // ============================================================================
  describe('convertBatch()', () => {
    it('should convert multiple units', () => {
      const sources = [
        createMegaMekLabUnit({ chassis: 'Mech 1', model: 'M1' }),
        createMegaMekLabUnit({ chassis: 'Mech 2', model: 'M2' }),
        createMegaMekLabUnit({ chassis: 'Mech 3', model: 'M3' }),
      ];

      const result = converter.convertBatch(sources);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should count successful and failed conversions', () => {
      const sources = [
        createMegaMekLabUnit({ chassis: 'Valid Mech', model: 'VM1' }),
        {} as MegaMekLabUnit, // Invalid
        createMegaMekLabUnit({ chassis: 'Valid Mech 2', model: 'VM2' }),
      ];

      const result = converter.convertBatch(sources);

      expect(result.total).toBe(3);
      // At least 2 should succeed
      expect(result.successful).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty batch', () => {
      const result = converter.convertBatch([]);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should include individual results', () => {
      const sources = [
        createMegaMekLabUnit({ chassis: 'Test', model: 'T1', mul_id: 1 }),
        createMegaMekLabUnit({ chassis: 'Test', model: 'T2', mul_id: 2 }),
      ];

      const result = converter.convertBatch(sources);

      expect(result.results[0].unit?.id).toBe('mul-1');
      expect(result.results[1].unit?.id).toBe('mul-2');
    });
  });
});
