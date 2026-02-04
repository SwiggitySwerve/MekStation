import {
  serializeUnit,
  validateSerializedFormat,
  getSerializedFormatVersion,
  isFormatVersionSupported,
  createUnitSerializer,
} from '@/utils/serialization/UnitSerializer';
import { CURRENT_FORMAT_VERSION } from '@/types/unit/UnitSerialization';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { MechConfiguration, IBattleMech } from '@/types/unit/BattleMechInterfaces';

describe('UnitSerializer', () => {
  // Helper to create partial IBattleMech mocks for testing
  // @ts-expect-error - Partial mock of IBattleMech for testing
  const createMockUnit = (overrides?: Record<string, unknown>): IBattleMech => ({
    id: 'test-unit',
    unitType: 'BattleMech',
    configuration: MechConfiguration.BIPED,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    tonnage: 50,
    metadata: {
      chassis: 'Test',
      model: 'TST-1',
      variant: 'TST-1',
      era: 'AGE_OF_WAR',
      year: 2750,
    },
    engine: {
      type: 'Standard Fusion',
      rating: 250,
    },
    gyro: {
      type: 'Standard',
    },
    cockpitType: 'Standard',
    structure: {
      type: 'Standard',
    },
    armorType: 'Standard',
    armorAllocation: {
      head: 9,
      centerTorso: 16,
      centerTorsoRear: 5,
      leftTorso: 12,
      leftTorsoRear: 4,
      rightTorso: 12,
      rightTorsoRear: 4,
      leftArm: 8,
      rightArm: 8,
      leftLeg: 12,
      rightLeg: 12,
    },
    heatSinks: {
      type: 'Single',
      total: 10,
    },
    movement: {
      walkMP: 5,
      jumpMP: 0,
      jumpJetType: null,
      hasMASC: false,
      hasSupercharger: false,
      hasTSM: false,
    },
    equipment: [],
    criticalSlots: [],
    ...overrides,
  }) as IBattleMech;

  describe('serializeUnit()', () => {
    it('should serialize unit to JSON', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should include format version in envelope', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data.serializedContent) as { formatVersion: string };
        expect(envelope.formatVersion).toBe(CURRENT_FORMAT_VERSION);
      }
    });

    it('should include application info in envelope', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data.serializedContent) as { application: string; applicationVersion: string };
        expect(envelope.application).toBeDefined();
        expect(envelope.application).toBe('MekStation');
        expect(envelope.applicationVersion).toBeDefined();
      }
    });

    it('should serialize unit metadata', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data.serializedContent) as { unit: { chassis: string; model: string; variant: string } };
        expect(envelope.unit.chassis).toBe('Test');
        expect(envelope.unit.model).toBe('TST-1');
        expect(envelope.unit.variant).toBe('TST-1');
      }
    });

    it('should serialize engine data', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data.serializedContent) as { unit: { engine: { type: string; rating: number } } };
        expect(envelope.unit.engine.type).toBe('Standard Fusion');
        expect(envelope.unit.engine.rating).toBe(250);
      }
    });

    it('should serialize armor allocation', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data.serializedContent) as { unit: { armor: { allocation: { head: number; centerTorso: number } } } };
        expect(envelope.unit.armor.allocation.head).toBe(9);
        expect(envelope.unit.armor.allocation.centerTorso).toBe(16);
      }
    });

    it('should serialize equipment and critical slots', () => {
      const unit = createMockUnit({
        equipment: [
          {
            equipmentId: 'medium-laser',
            location: 'RA',
            slots: [0, 1],
            isRearMounted: true,
            linkedAmmoId: 'ml-ammo',
          },
          {
            equipmentId: 'small-laser',
            location: 'LA',
            slots: [2],
            isRearMounted: false,
          },
        ],
        criticalSlots: [
          {
            location: 'RA',
            slots: [
              { content: { name: 'Medium Laser' } },
              { content: null },
            ],
          },
        ],
        quirks: ['Nimble Jumper'],
        movement: {
          walkMP: 5,
          jumpMP: 2,
          jumpJetType: null,
          hasMASC: true,
          hasSupercharger: true,
          hasTSM: true,
        },
      });

      const result = serializeUnit(unit);
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        type SerializedUnitEnvelope = {
          unit: {
            equipment: Array<{
              id: string;
              location?: string;
              slots?: number[];
              isRearMounted?: boolean;
              linkedAmmo?: string;
            }>;
            criticalSlots: Record<string, Array<string | null>>;
            quirks?: string[];
            movement: {
              enhancements?: string[];
            };
          };
        };

        const envelope = JSON.parse(result.data.serializedContent) as SerializedUnitEnvelope;

        expect(envelope.unit.equipment[0]).toMatchObject({
          id: 'medium-laser',
          location: 'RA',
          slots: [0, 1],
          isRearMounted: true,
          linkedAmmo: 'ml-ammo',
        });
        expect(envelope.unit.equipment[1]).toMatchObject({
          id: 'small-laser',
          location: 'LA',
        });
        expect(envelope.unit.equipment[1].isRearMounted).toBeUndefined();
        expect(envelope.unit.criticalSlots.RA).toEqual(['Medium Laser', null]);
        expect(envelope.unit.quirks?.[0]).toBe('Nimble Jumper');
        expect(envelope.unit.movement.enhancements).toEqual(
          expect.arrayContaining(['MASC', 'Supercharger', 'TSM'])
        );
      }
    });

    it('should handle errors during serialization', () => {
      const invalidUnit = null as unknown;
      // @ts-expect-error - Testing error handling with invalid input
      const result = serializeUnit(invalidUnit);
      
      expect(result.success).toBe(false);
      expect(result.error!.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSerializedFormat()', () => {
    it('should validate correct format', () => {
      const unit = createMockUnit();
      const serialized = serializeUnit(unit);
      
      if (serialized.success && serialized.data) {
        const validation = validateSerializedFormat(serialized.data.serializedContent);
        expect(validation.isValid).toBe(true);
      }
    });

    it('should reject invalid JSON', () => {
      const validation = validateSerializedFormat('invalid json');
      expect(validation.isValid).toBe(false);
    });

    it('should flag missing unit fields', () => {
      const envelope = {
        formatVersion: CURRENT_FORMAT_VERSION,
        application: { name: 'Test', version: '1.0.0' },
        unit: {},
      };
      const validation = validateSerializedFormat(JSON.stringify(envelope));

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toEqual(
        expect.arrayContaining([
          'Missing unit.chassis',
          'Missing unit.model',
          'Missing unit.unitType',
          'Missing unit.tonnage',
          'Missing unit.engine',
          'Missing unit.armor',
        ])
      );
    });

    it('should reject missing envelope', () => {
      const validation = validateSerializedFormat('{}');
      expect(validation.isValid).toBe(false);
    });

    it('should reject missing unit data', () => {
      const envelope = {
        formatVersion: CURRENT_FORMAT_VERSION,
        application: { name: 'Test', version: '1.0.0' },
      };
      const validation = validateSerializedFormat(JSON.stringify(envelope));
      expect(validation.isValid).toBe(false);
    });
  });

  describe('getSerializedFormatVersion()', () => {
    it('should extract format version from valid data', () => {
      const unit = createMockUnit();
      const serialized = serializeUnit(unit);
      
      if (serialized.success && serialized.data) {
        const version = getSerializedFormatVersion(serialized.data.serializedContent);
        expect(version).toBe(CURRENT_FORMAT_VERSION);
      }
    });

    it('should return null for invalid data', () => {
      const version = getSerializedFormatVersion('invalid');
      expect(version).toBeNull();
    });

    it('should return null for non-string format version', () => {
      const envelope = { formatVersion: 123 };
      const version = getSerializedFormatVersion(JSON.stringify(envelope));
      expect(version).toBeNull();
    });
  });

  describe('isFormatVersionSupported()', () => {
    it('should support current format version', () => {
      const supported = isFormatVersionSupported(CURRENT_FORMAT_VERSION);
      expect(supported).toBe(true);
    });

    it('should support same major version', () => {
      const [major, minor] = CURRENT_FORMAT_VERSION.split('.');
      const sameMajor = `${major}.${parseInt(minor) + 1}.0`;
      const supported = isFormatVersionSupported(sameMajor);
      expect(supported).toBe(true);
    });

    it('should not support different major version', () => {
      const [major] = CURRENT_FORMAT_VERSION.split('.');
      const differentMajor = `${parseInt(major) + 1}.0.0`;
      const supported = isFormatVersionSupported(differentMajor);
      expect(supported).toBe(false);
    });
  });

  describe('createUnitSerializer()', () => {
    it('should create serializer instance', () => {
      const serializer = createUnitSerializer();
      expect(serializer).toBeDefined();
      expect(serializer.serialize).toBeDefined();
      expect(serializer.deserialize).toBeDefined();
      expect(serializer.validateFormat).toBeDefined();
      expect(serializer.getFormatVersion).toBeDefined();
    });

    it('should serialize unit', () => {
      const serializer = createUnitSerializer();
      const unit = createMockUnit();
      const result = serializer.serialize(unit);
      
      expect(result.success).toBe(true);
    });

    it('should validate format', () => {
      const serializer = createUnitSerializer();
      const unit = createMockUnit();
      const serialized = serializer.serialize(unit);
      
      if (serialized.success && serialized.data) {
        const validation = serializer.validateFormat(serialized.data.serializedContent);
        expect(validation.isValid).toBe(true);
      }
    });

    it('should get format version', () => {
      const serializer = createUnitSerializer();
      const unit = createMockUnit();
      const serialized = serializer.serialize(unit);
      
      if (serialized.success && serialized.data) {
        const version = serializer.getFormatVersion(serialized.data.serializedContent);
        expect(version).toBe(CURRENT_FORMAT_VERSION);
      }
    });

    it('should return validation errors for malformed payloads', () => {
      const serializer = createUnitSerializer();
      const malformed = { formatVersion: CURRENT_FORMAT_VERSION };
      const result = serializer.deserialize(JSON.stringify(malformed));

      expect(result.success).toBe(false);
      expect(result.error!.errors).toContain('Missing unit field');
    });

    it('should reject unsupported format versions during deserialize', () => {
      const serializer = createUnitSerializer();
      const envelope = {
        formatVersion: '99.0.0',
        unit: {
          chassis: 'Test',
          model: 'TST',
          unitType: 'BattleMech',
          tonnage: 50,
          engine: { type: 'Standard', rating: 250 },
          armor: { type: 'Standard' },
        },
      };

      const result = serializer.deserialize(JSON.stringify(envelope));
      expect(result.success).toBe(false);
      expect(result.error!.errors[0]).toContain('Unsupported format version');
    });

    it('should return not implemented result for valid payloads', () => {
      const serializer = createUnitSerializer();
      const envelope = {
        formatVersion: CURRENT_FORMAT_VERSION,
        unit: {
          chassis: 'Test',
          model: 'TST',
          unitType: 'BattleMech',
          tonnage: 50,
          engine: { type: 'Standard', rating: 250 },
          armor: { type: 'Standard' },
        },
      };

      const result = serializer.deserialize(JSON.stringify(envelope));
      expect(result.success).toBe(false);
      expect(result.error!.errors[0]).toContain('Deserialization not yet implemented');
    });
  });
});
