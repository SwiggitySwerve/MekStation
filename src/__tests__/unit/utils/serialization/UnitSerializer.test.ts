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
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

describe('UnitSerializer', () => {
  const createMockUnit = (overrides?: Record<string, unknown>) => ({
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
  });

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
        const envelope = JSON.parse(result.data) as { formatVersion: string };
        expect(envelope.formatVersion).toBe(CURRENT_FORMAT_VERSION);
      }
    });

    it('should include application info in envelope', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data);
        expect(envelope.application).toBeDefined();
        expect(envelope.application.name).toBe('BattleTech Editor');
      }
    });

    it('should serialize unit metadata', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data);
        expect(envelope.unit.chassis).toBe('Test');
        expect(envelope.unit.model).toBe('TST-1');
        expect(envelope.unit.variant).toBe('TST-1');
      }
    });

    it('should serialize engine data', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data);
        expect(envelope.unit.engine.type).toBe('Standard Fusion');
        expect(envelope.unit.engine.rating).toBe(250);
      }
    });

    it('should serialize armor allocation', () => {
      const unit = createMockUnit();
      const result = serializeUnit(unit);
      
      if (result.success && result.data) {
        const envelope = JSON.parse(result.data);
        expect(envelope.unit.armor.allocation.head).toBe(9);
        expect(envelope.unit.armor.allocation.centerTorso).toBe(16);
      }
    });

    it('should handle errors during serialization', () => {
      const invalidUnit = null as any;
      const result = serializeUnit(invalidUnit);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSerializedFormat()', () => {
    it('should validate correct format', () => {
      const unit = createMockUnit();
      const serialized = serializeUnit(unit);
      
      if (serialized.success && serialized.data) {
        const validation = validateSerializedFormat(serialized.data);
        expect(validation.isValid).toBe(true);
      }
    });

    it('should reject invalid JSON', () => {
      const validation = validateSerializedFormat('invalid json');
      expect(validation.isValid).toBe(false);
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
        const version = getSerializedFormatVersion(serialized.data);
        expect(version).toBe(CURRENT_FORMAT_VERSION);
      }
    });

    it('should return null for invalid data', () => {
      const version = getSerializedFormatVersion('invalid');
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
        const validation = serializer.validateFormat(serialized.data);
        expect(validation.isValid).toBe(true);
      }
    });

    it('should get format version', () => {
      const serializer = createUnitSerializer();
      const unit = createMockUnit();
      const serialized = serializer.serialize(unit);
      
      if (serialized.success && serialized.data) {
        const version = serializer.getFormatVersion(serialized.data);
        expect(version).toBe(CURRENT_FORMAT_VERSION);
      }
    });
  });
});
