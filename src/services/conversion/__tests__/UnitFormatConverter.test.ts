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

/**
 * Create a minimal valid MegaMekLab unit for testing
 */
function createMegaMekLabUnit(
  overrides: Partial<MegaMekLabUnit> = {},
): MegaMekLabUnit {
  return {
    chassis: 'Atlas',
    model: 'AS7-D',
    mul_id: '123',
    config: 'Biped',
    tech_base: 'Inner Sphere',
    era: 3025,
    source: 'TRO 3025',
    rules_level: '2',
    role: 'Juggernaut',
    mass: 100,
    engine: {
      type: 'Fusion Engine',
      rating: 300,
    },
    structure: {
      type: 'Standard',
    },
    heat_sinks: {
      type: 'Single',
      count: 20,
    },
    walk_mp: '3',
    jump_mp: '0',
    armor: {
      type: 'Standard',
      locations: [
        { location: 'Head', armor_points: 9 },
        { location: 'Center Torso', armor_points: 47, rear_armor_points: 14 },
        { location: 'Left Torso', armor_points: 32, rear_armor_points: 10 },
        { location: 'Right Torso', armor_points: 32, rear_armor_points: 10 },
        { location: 'Left Arm', armor_points: 34 },
        { location: 'Right Arm', armor_points: 34 },
        { location: 'Left Leg', armor_points: 41 },
        { location: 'Right Leg', armor_points: 41 },
      ],
    },
    weapons_and_equipment: [
      {
        item_name: 'AC/20',
        location: 'Right Torso',
        item_type: 'AC20',
        tech_base: 'IS',
      },
      {
        item_name: 'LRM 20',
        location: 'Left Torso',
        item_type: 'LRM20',
        tech_base: 'IS',
      },
      {
        item_name: 'Medium Laser',
        location: 'Left Arm',
        item_type: 'MediumLaser',
        tech_base: 'IS',
      },
      {
        item_name: 'Medium Laser',
        location: 'Right Arm',
        item_type: 'MediumLaser',
        tech_base: 'IS',
      },
      {
        item_name: 'SRM 6',
        location: 'Left Torso',
        item_type: 'SRM6',
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
          'Sensors',
          'Life Support',
          '-Empty-',
        ],
      },
      {
        location: 'Left Leg',
        slots: [
          'Hip',
          'Upper Leg Actuator',
          'Lower Leg Actuator',
          'Foot Actuator',
          '-Empty-',
          '-Empty-',
        ],
      },
      {
        location: 'Right Leg',
        slots: [
          'Hip',
          'Upper Leg Actuator',
          'Lower Leg Actuator',
          'Foot Actuator',
          '-Empty-',
          '-Empty-',
        ],
      },
      { location: 'Left Arm', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Right Arm', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Left Torso', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Right Torso', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Center Torso', slots: Array<string>(12).fill('-Empty-') },
    ],
    ...overrides,
  };
}

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

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(unitFormatConverter).toBeInstanceOf(UnitFormatConverter);
    });
  });
});
