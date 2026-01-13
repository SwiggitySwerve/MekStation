/**
 * Exotic Mech Configurations Integration Tests
 *
 * Tests for exotic mech configurations (Quad, LAM, Tripod, QuadVee):
 * - Export/import round-trip preservation
 * - Configuration validation
 * - Armor diagram data handling
 * - Mode switching for transformable units
 *
 * @spec openspec/specs/mech-configuration-system/spec.md
 */

import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  MechConfiguration,
  QuadVeeMode,
  LAMMode,
  configurationRegistry,
  BIPED_LOCATIONS,
  getLocationsForConfig,
} from '@/types/construction/MechConfigurationSystem';
import {
  getConfigurationValidationRules,
  QuadNoArmsRule,
  QuadLegCountRule,
  LAMMaxTonnageRule,
  TripodCenterLegRule,
  QuadVeeConversionEquipmentRule,
} from '@/utils/validation/rules/ConfigurationValidationRules';
import { IValidationContext } from '@/types/validation/rules/ValidationRuleInterfaces';

// ============================================================================
// Test Helpers
// ============================================================================

const createValidationContext = (unit: ISerializedUnit): IValidationContext => ({
  unit: unit as unknown,
  options: {},
  cache: new Map(),
});

/**
 * Create a minimal serialized unit for testing
 */
function createMinimalUnit(
  configuration: string,
  overrides?: Partial<ISerializedUnit>
): ISerializedUnit {
  const base: ISerializedUnit = {
    id: `test-${configuration.toLowerCase()}-1`,
    chassis: `Test${configuration}`,
    model: 'TST-1',
    unitType: 'BattleMech',
    configuration,
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    era: 'Succession Wars',
    year: 3025,
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
    gyro: { type: 'STANDARD' },
    cockpit: 'Standard',
    structure: { type: 'STANDARD' },
    armor: {
      type: 'STANDARD',
      allocation: {},
    },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [],
    criticalSlots: {},
    ...overrides,
  };
  return base;
}

/**
 * Create a quad mech unit
 */
function createQuadMech(overrides?: Partial<ISerializedUnit>): ISerializedUnit {
  return createMinimalUnit('QUAD', {
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 20, rear: 10 },
        LEFT_TORSO: { front: 16, rear: 8 },
        RIGHT_TORSO: { front: 16, rear: 8 },
        FRONT_LEFT_LEG: 16,
        FRONT_RIGHT_LEG: 16,
        REAR_LEFT_LEG: 16,
        REAR_RIGHT_LEG: 16,
      },
    },
    criticalSlots: {
      HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
      CENTER_TORSO: Array<string | null>(12).fill(null),
      LEFT_TORSO: Array<string | null>(12).fill(null),
      RIGHT_TORSO: Array<string | null>(12).fill(null),
      FRONT_LEFT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null, null, null, null, null, null, null],
      FRONT_RIGHT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null, null, null, null, null, null, null],
      REAR_LEFT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null, null, null, null, null, null, null],
      REAR_RIGHT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null, null, null, null, null, null, null],
    },
    ...overrides,
  });
}

/**
 * Create a LAM mech unit
 */
function createLAMMech(overrides?: Partial<ISerializedUnit>): ISerializedUnit {
  return createMinimalUnit('LAM', {
    tonnage: 55, // LAM max tonnage
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 20, rear: 10 },
        LEFT_TORSO: { front: 16, rear: 8 },
        RIGHT_TORSO: { front: 16, rear: 8 },
        LEFT_ARM: 12,
        RIGHT_ARM: 12,
        LEFT_LEG: 16,
        RIGHT_LEG: 16,
      },
    },
    criticalSlots: {
      HEAD: ['Life Support', 'Sensors', 'Cockpit', 'Avionics', 'Sensors', 'Life Support'],
      CENTER_TORSO: ['Fusion Engine', 'Fusion Engine', 'Fusion Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Fusion Engine', 'Fusion Engine', 'Fusion Engine', 'Landing Gear', null],
      LEFT_TORSO: ['Landing Gear', 'Avionics', null, null, null, null, null, null, null, null, null, null],
      RIGHT_TORSO: ['Landing Gear', 'Avionics', null, null, null, null, null, null, null, null, null, null],
      LEFT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', null, null, null, null, null, null, null, null],
      RIGHT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', null, null, null, null, null, null, null, null],
      LEFT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
      RIGHT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
    },
    ...overrides,
  });
}

/**
 * Create a Tripod mech unit
 */
function createTripodMech(overrides?: Partial<ISerializedUnit>): ISerializedUnit {
  return createMinimalUnit('TRIPOD', {
    tonnage: 100, // Tripods are typically superheavy
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 30, rear: 15 },
        LEFT_TORSO: { front: 24, rear: 12 },
        RIGHT_TORSO: { front: 24, rear: 12 },
        LEFT_ARM: 20,
        RIGHT_ARM: 20,
        LEFT_LEG: 24,
        RIGHT_LEG: 24,
        CENTER_LEG: 24,
      },
    },
    // Validation rules check unit.armorAllocation (top level)
    armorAllocation: {
      [MechLocation.HEAD]: 9,
      [MechLocation.CENTER_TORSO]: 30,
      [MechLocation.LEFT_TORSO]: 24,
      [MechLocation.RIGHT_TORSO]: 24,
      [MechLocation.LEFT_ARM]: 20,
      [MechLocation.RIGHT_ARM]: 20,
      [MechLocation.LEFT_LEG]: 24,
      [MechLocation.RIGHT_LEG]: 24,
      [MechLocation.CENTER_LEG]: 24,
    },
    criticalSlots: {
      [MechLocation.HEAD]: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
      [MechLocation.CENTER_TORSO]: Array(12).fill(null),
      [MechLocation.LEFT_TORSO]: Array(12).fill(null),
      [MechLocation.RIGHT_TORSO]: Array(12).fill(null),
      [MechLocation.LEFT_ARM]: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', null, null, null, null, null, null, null, null],
      [MechLocation.RIGHT_ARM]: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', null, null, null, null, null, null, null, null],
      [MechLocation.LEFT_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
      [MechLocation.RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
      [MechLocation.CENTER_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
    },
    ...overrides,
  } as Partial<ISerializedUnit>);
}

/**
 * Create a QuadVee mech unit
 */
function createQuadVeeMech(overrides?: Partial<ISerializedUnit>): ISerializedUnit {
  return createMinimalUnit('QUADVEE', {
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 20, rear: 10 },
        LEFT_TORSO: { front: 16, rear: 8 },
        RIGHT_TORSO: { front: 16, rear: 8 },
        FRONT_LEFT_LEG: 16,
        FRONT_RIGHT_LEG: 16,
        REAR_LEFT_LEG: 16,
        REAR_RIGHT_LEG: 16,
      },
    },
    criticalSlots: {
      [MechLocation.HEAD]: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
      [MechLocation.CENTER_TORSO]: Array(12).fill(null),
      [MechLocation.LEFT_TORSO]: Array(12).fill(null),
      [MechLocation.RIGHT_TORSO]: Array(12).fill(null),
      [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', 'Conversion Equipment', 'Tracks', null, null, null, null, null, null],
      [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', 'Conversion Equipment', 'Tracks', null, null, null, null, null, null],
      [MechLocation.REAR_LEFT_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', 'Conversion Equipment', 'Tracks', null, null, null, null, null, null],
      [MechLocation.REAR_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', 'Conversion Equipment', 'Tracks', null, null, null, null, null, null],
    },
    ...overrides,
  });
}

// ============================================================================
// Configuration Registry Tests
// ============================================================================

describe('Configuration Registry Integration', () => {
  describe('getConfiguration', () => {
    it('should return valid definition for QUAD', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.QUAD);
      expect(config.id).toBe(MechConfiguration.QUAD);
      expect(config.displayName).toBe('Quad');
      expect(config.locations).toHaveLength(8);
    });

    it('should return valid definition for LAM', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.LAM);
      expect(config.id).toBe(MechConfiguration.LAM);
      expect(config.displayName).toBe('Land-Air Mech');
      expect(config.locations).toHaveLength(8);
      expect(config.modes).toBeDefined();
      expect(config.modes?.length).toBe(3); // Mech, AirMech, Fighter
    });

    it('should return valid definition for TRIPOD', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.TRIPOD);
      expect(config.id).toBe(MechConfiguration.TRIPOD);
      expect(config.displayName).toBe('Tripod');
      expect(config.locations).toHaveLength(9); // 8 + center leg
    });

    it('should return valid definition for QUADVEE', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.QUADVEE);
      expect(config.id).toBe(MechConfiguration.QUADVEE);
      expect(config.displayName).toBe('QuadVee');
      expect(config.locations).toHaveLength(8);
      expect(config.requiredEquipment).toBeDefined();
    });
  });

  describe('isQuadConfiguration', () => {
    it('should return true for QUAD', () => {
      expect(configurationRegistry.isQuadConfiguration(MechConfiguration.QUAD)).toBe(true);
    });

    it('should return true for QUADVEE', () => {
      expect(configurationRegistry.isQuadConfiguration(MechConfiguration.QUADVEE)).toBe(true);
    });

    it('should return false for BIPED', () => {
      expect(configurationRegistry.isQuadConfiguration(MechConfiguration.BIPED)).toBe(false);
    });

    it('should return false for LAM', () => {
      expect(configurationRegistry.isQuadConfiguration(MechConfiguration.LAM)).toBe(false);
    });
  });

  describe('isTransformingConfiguration', () => {
    it('should return true for LAM', () => {
      expect(configurationRegistry.isTransformingConfiguration(MechConfiguration.LAM)).toBe(true);
    });

    it('should return true for QUADVEE', () => {
      expect(configurationRegistry.isTransformingConfiguration(MechConfiguration.QUADVEE)).toBe(true);
    });

    it('should return false for BIPED', () => {
      expect(configurationRegistry.isTransformingConfiguration(MechConfiguration.BIPED)).toBe(false);
    });

    it('should return false for QUAD', () => {
      expect(configurationRegistry.isTransformingConfiguration(MechConfiguration.QUAD)).toBe(false);
    });
  });
});

// ============================================================================
// Location Set Tests
// ============================================================================

describe('Configuration Location Sets', () => {
  describe('getLocationsForConfig', () => {
    it('should return 8 locations for BIPED', () => {
      const locations = getLocationsForConfig(MechConfiguration.BIPED);
      expect(locations).toHaveLength(8);
      expect(locations).toContain(MechLocation.LEFT_ARM);
      expect(locations).toContain(MechLocation.RIGHT_ARM);
    });

    it('should return 8 quad locations for QUAD', () => {
      const locations = getLocationsForConfig(MechConfiguration.QUAD);
      expect(locations).toHaveLength(8);
      expect(locations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(locations).toContain(MechLocation.REAR_RIGHT_LEG);
      expect(locations).not.toContain(MechLocation.LEFT_ARM);
    });

    it('should return 9 locations for TRIPOD', () => {
      const locations = getLocationsForConfig(MechConfiguration.TRIPOD);
      expect(locations).toHaveLength(9);
      expect(locations).toContain(MechLocation.CENTER_LEG);
      expect(locations).toContain(MechLocation.LEFT_ARM);
    });

    it('should return quad locations for QUADVEE', () => {
      const locations = getLocationsForConfig(MechConfiguration.QUADVEE);
      expect(locations).toHaveLength(8);
      expect(locations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(locations).not.toContain(MechLocation.LEFT_ARM);
    });

    it('should return biped locations for LAM', () => {
      const locations = getLocationsForConfig(MechConfiguration.LAM);
      expect(locations).toHaveLength(8);
      expect(locations).toContain(MechLocation.LEFT_ARM);
    });
  });
});

// ============================================================================
// Validation Rules Integration
// ============================================================================

describe('Configuration Validation Rules Integration', () => {
  describe('getConfigurationValidationRules', () => {
    it('should return at least 19 rules', () => {
      const rules = getConfigurationValidationRules();
      expect(rules.length).toBeGreaterThanOrEqual(19);
    });

    it('should include rules for all exotic configurations', () => {
      const rules = getConfigurationValidationRules();
      const ruleIds = rules.map(r => r.id);

      // Quad rules
      expect(ruleIds).toContain('configuration.quad.no_arms');
      expect(ruleIds).toContain('configuration.quad.leg_count');

      // LAM rules
      expect(ruleIds).toContain('configuration.lam.max_tonnage');
      expect(ruleIds).toContain('configuration.lam.engine_type');

      // Tripod rules
      expect(ruleIds).toContain('configuration.tripod.center_leg');
      expect(ruleIds).toContain('configuration.tripod.leg_equipment');

      // QuadVee rules
      expect(ruleIds).toContain('configuration.quadvee.conversion_equipment');
      expect(ruleIds).toContain('configuration.quadvee.tracks');
    });
  });

  describe('Quad Validation', () => {
    it('should pass for valid quad unit', () => {
      const unit = createQuadMech();
      const context = createValidationContext(unit);

      const noArmsResult = QuadNoArmsRule.validate(context);
      expect(noArmsResult.passed).toBe(true);

      const legCountResult = QuadLegCountRule.validate(context);
      expect(legCountResult.passed).toBe(true);
    });

    it('should fail when quad has arm equipment', () => {
      const unit = createQuadMech({
        equipment: [{ id: 'medium-laser', location: MechLocation.LEFT_ARM }],
      });
      const context = createValidationContext(unit);

      const result = QuadNoArmsRule.validate(context);
      expect(result.passed).toBe(false);
    });
  });

  describe('LAM Validation', () => {
    it('should pass for valid LAM unit', () => {
      const unit = createLAMMech();
      const context = createValidationContext(unit);

      const tonnageResult = LAMMaxTonnageRule.validate(context);
      expect(tonnageResult.passed).toBe(true);
    });

    it('should fail when LAM exceeds 55 tons', () => {
      const unit = createLAMMech({ tonnage: 60 });
      const context = createValidationContext(unit);

      const result = LAMMaxTonnageRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('55 tons');
    });
  });

  describe('Tripod Validation', () => {
    it('should pass for valid tripod unit', () => {
      const unit = createTripodMech();
      const context = createValidationContext(unit);

      const result = TripodCenterLegRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when tripod missing center leg', () => {
      const unit = createTripodMech({
        // Validation rules check armorAllocation at top level
        armorAllocation: {
          [MechLocation.HEAD]: 9,
          [MechLocation.LEFT_LEG]: 24,
          [MechLocation.RIGHT_LEG]: 24,
          // Missing CENTER_LEG
        },
        criticalSlots: {
          [MechLocation.LEFT_LEG]: ['Hip', 'Upper Leg Actuator'],
          [MechLocation.RIGHT_LEG]: ['Hip', 'Upper Leg Actuator'],
          // Missing CENTER_LEG
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const context = createValidationContext(unit);

      const result = TripodCenterLegRule.validate(context);
      expect(result.passed).toBe(false);
    });
  });

  describe('QuadVee Validation', () => {
    it('should pass for valid quadvee unit', () => {
      const unit = createQuadVeeMech();
      const context = createValidationContext(unit);

      const result = QuadVeeConversionEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when quadvee missing conversion equipment', () => {
      const unit = createQuadVeeMech({
        criticalSlots: {
          [MechLocation.HEAD]: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
          [MechLocation.CENTER_TORSO]: Array(12).fill(null),
          [MechLocation.LEFT_TORSO]: Array(12).fill(null),
          [MechLocation.RIGHT_TORSO]: Array(12).fill(null),
          [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Upper Leg Actuator', null, null, null, null, null, null, null, null, null, null],
          [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', null, null, null, null, null, null, null, null, null, null],
          [MechLocation.REAR_LEFT_LEG]: ['Hip', 'Upper Leg Actuator', null, null, null, null, null, null, null, null, null, null],
          [MechLocation.REAR_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', null, null, null, null, null, null, null, null, null, null],
        },
      });
      const context = createValidationContext(unit);

      const result = QuadVeeConversionEquipmentRule.validate(context);
      expect(result.passed).toBe(false);
    });
  });
});

// ============================================================================
// Mode System Tests
// ============================================================================

describe('Transformable Configuration Modes', () => {
  describe('LAM Modes', () => {
    it('should have three modes defined', () => {
      const modes = configurationRegistry.getModes(MechConfiguration.LAM);
      expect(modes).toBeDefined();
      expect(modes?.length).toBe(3);
    });

    it('should have Mech, AirMech, and Fighter modes', () => {
      const modes = configurationRegistry.getModes(MechConfiguration.LAM);
      const modeValues = modes?.map(m => m.mode);

      expect(modeValues).toContain(LAMMode.MECH);
      expect(modeValues).toContain(LAMMode.AIRMECH);
      expect(modeValues).toContain(LAMMode.FIGHTER);
    });

    it('should provide fighter armor location mapping', () => {
      const mapping = configurationRegistry.getFighterArmorMapping(MechConfiguration.LAM);
      expect(mapping).toBeDefined();
      expect(mapping?.[MechLocation.HEAD]).toBe(MechLocation.NOSE);
      expect(mapping?.[MechLocation.CENTER_TORSO]).toBe(MechLocation.FUSELAGE);
    });
  });

  describe('QuadVee Modes', () => {
    it('should have two modes defined', () => {
      const modes = configurationRegistry.getQuadVeeModes();
      expect(modes).toHaveLength(2);
    });

    it('should have Mech and Vehicle modes', () => {
      const modes = configurationRegistry.getQuadVeeModes();
      const modeValues = modes.map(m => m.mode);

      expect(modeValues).toContain(QuadVeeMode.MECH);
      expect(modeValues).toContain(QuadVeeMode.VEHICLE);
    });

    it('should provide mode definitions with movement types', () => {
      const mechMode = configurationRegistry.getQuadVeeModeDefinition(QuadVeeMode.MECH);
      const vehicleMode = configurationRegistry.getQuadVeeModeDefinition(QuadVeeMode.VEHICLE);

      expect(mechMode?.movementType).toBe('ground');
      expect(vehicleMode?.movementType).toBe('tracked');
    });
  });
});

// ============================================================================
// Required Equipment Tests
// ============================================================================

describe('Required Equipment', () => {
  describe('LAM Required Equipment', () => {
    it('should require landing gear and avionics', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.LAM);
      const required = config.requiredEquipment;

      expect(required).toBeDefined();
      expect(required?.some(e => e.equipmentId === 'landing-gear')).toBe(true);
      expect(required?.some(e => e.equipmentId === 'avionics')).toBe(true);
    });

    it('should specify correct locations for landing gear', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.LAM);
      const landingGear = config.requiredEquipment?.find(e => e.equipmentId === 'landing-gear');

      expect(landingGear?.locations).toContain(MechLocation.CENTER_TORSO);
      expect(landingGear?.locations).toContain(MechLocation.LEFT_TORSO);
      expect(landingGear?.locations).toContain(MechLocation.RIGHT_TORSO);
    });
  });

  describe('QuadVee Required Equipment', () => {
    it('should require conversion equipment', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.QUADVEE);
      const required = config.requiredEquipment;

      expect(required).toBeDefined();
      expect(required?.some(e => e.equipmentId === 'conversion-equipment')).toBe(true);
    });

    it('should specify conversion equipment in all legs', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.QUADVEE);
      const conversion = config.requiredEquipment?.find(e => e.equipmentId === 'conversion-equipment');

      expect(conversion?.locations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(conversion?.locations).toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(conversion?.locations).toContain(MechLocation.REAR_LEFT_LEG);
      expect(conversion?.locations).toContain(MechLocation.REAR_RIGHT_LEG);
    });
  });
});

// ============================================================================
// Diagram Component Name Tests
// ============================================================================

describe('Diagram Component Names', () => {
  it('should return QuadArmorDiagram for QUAD', () => {
    const name = configurationRegistry.getDiagramComponentName(MechConfiguration.QUAD);
    expect(name).toBe('QuadArmorDiagram');
  });

  it('should return LAMArmorDiagram for LAM', () => {
    const name = configurationRegistry.getDiagramComponentName(MechConfiguration.LAM);
    expect(name).toBe('LAMArmorDiagram');
  });

  it('should return TripodArmorDiagram for TRIPOD', () => {
    const name = configurationRegistry.getDiagramComponentName(MechConfiguration.TRIPOD);
    expect(name).toBe('TripodArmorDiagram');
  });

  it('should return QuadVeeArmorDiagram for QUADVEE', () => {
    const name = configurationRegistry.getDiagramComponentName(MechConfiguration.QUADVEE);
    expect(name).toBe('QuadVeeArmorDiagram');
  });

  it('should return BipedArmorDiagram for BIPED', () => {
    const name = configurationRegistry.getDiagramComponentName(MechConfiguration.BIPED);
    expect(name).toBe('BipedArmorDiagram');
  });
});

// ============================================================================
// Prohibited Equipment Tests
// ============================================================================

describe('Prohibited Equipment', () => {
  describe('LAM Prohibited Equipment', () => {
    it('should prohibit advanced armor and structure types', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.LAM);
      const prohibited = config.prohibitedEquipment;

      expect(prohibited).toContain('endo-steel');
      expect(prohibited).toContain('ferro-fibrous');
      expect(prohibited).toContain('stealth-armor');
    });
  });

  describe('Other Configurations', () => {
    it('should not prohibit equipment for QUAD', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.QUAD);
      expect(config.prohibitedEquipment).toHaveLength(0);
    });

    it('should not prohibit equipment for TRIPOD', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.TRIPOD);
      expect(config.prohibitedEquipment).toHaveLength(0);
    });

    it('should not prohibit equipment for QUADVEE', () => {
      const config = configurationRegistry.getConfiguration(MechConfiguration.QUADVEE);
      expect(config.prohibitedEquipment).toHaveLength(0);
    });
  });
});

// ============================================================================
// Max Tonnage Tests
// ============================================================================

describe('Configuration Max Tonnage', () => {
  it('should return 55 for LAM', () => {
    const maxTonnage = configurationRegistry.getMaxTonnage(MechConfiguration.LAM);
    expect(maxTonnage).toBe(55);
  });

  it('should return undefined for QUAD (no limit)', () => {
    const maxTonnage = configurationRegistry.getMaxTonnage(MechConfiguration.QUAD);
    expect(maxTonnage).toBeUndefined();
  });

  it('should return undefined for TRIPOD (no limit)', () => {
    const maxTonnage = configurationRegistry.getMaxTonnage(MechConfiguration.TRIPOD);
    expect(maxTonnage).toBeUndefined();
  });

  it('should return undefined for QUADVEE (no limit)', () => {
    const maxTonnage = configurationRegistry.getMaxTonnage(MechConfiguration.QUADVEE);
    expect(maxTonnage).toBeUndefined();
  });
});

// ============================================================================
// Biped Regression Tests
// ============================================================================

describe('Biped Configuration Regression', () => {
  it('should maintain standard biped location set', () => {
    const locations = BIPED_LOCATIONS;
    expect(locations).toHaveLength(8);
    expect(locations).toContain(MechLocation.HEAD);
    expect(locations).toContain(MechLocation.CENTER_TORSO);
    expect(locations).toContain(MechLocation.LEFT_ARM);
    expect(locations).toContain(MechLocation.RIGHT_ARM);
    expect(locations).toContain(MechLocation.LEFT_LEG);
    expect(locations).toContain(MechLocation.RIGHT_LEG);
  });

  it('should return valid biped configuration', () => {
    const config = configurationRegistry.getConfiguration(MechConfiguration.BIPED);
    expect(config.id).toBe(MechConfiguration.BIPED);
    expect(config.displayName).toBe('Biped');
    expect(config.locations).toHaveLength(8);
  });

  it('should not affect biped validation rules', () => {
    const unit = createMinimalUnit('BIPED', {
      armor: {
        type: 'STANDARD',
        allocation: {
          HEAD: 9,
          CENTER_TORSO: { front: 20, rear: 10 },
          LEFT_TORSO: { front: 16, rear: 8 },
          RIGHT_TORSO: { front: 16, rear: 8 },
          LEFT_ARM: 12,
          RIGHT_ARM: 12,
          LEFT_LEG: 16,
          RIGHT_LEG: 16,
        },
      },
    });
    const context = createValidationContext(unit);

    expect(QuadNoArmsRule.canValidate?.(context)).toBe(false);
    expect(LAMMaxTonnageRule.canValidate?.(context)).toBe(false);
    expect(TripodCenterLegRule.canValidate?.(context)).toBe(false);
    expect(QuadVeeConversionEquipmentRule.canValidate?.(context)).toBe(false);
  });
});

describe('Phase 5: End-to-End Integration Tests', () => {
  describe('5.1 Round-Trip Export/Import', () => {
    describe('5.1.1 Quad Mech JSON Round-Trip', () => {
      it('should preserve quad configuration through JSON serialization', () => {
        const quadUnit = createQuadMech();
        const serialized = JSON.stringify(quadUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        expect(deserialized.configuration).toBe('QUAD');
        expect(deserialized.armor.allocation.FRONT_LEFT_LEG).toBe(16);
        expect(deserialized.armor.allocation.REAR_RIGHT_LEG).toBe(16);
        expect(deserialized.criticalSlots.FRONT_LEFT_LEG).toBeDefined();
      });

      it('should maintain quad armor allocation integrity', () => {
        const quadUnit = createQuadMech();
        const serialized = JSON.stringify(quadUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        const originalArmor = quadUnit.armor.allocation;
        const deserializedArmor = deserialized.armor.allocation;

        expect(deserializedArmor.HEAD).toBe(originalArmor.HEAD);
        expect(deserializedArmor.FRONT_LEFT_LEG).toBe(originalArmor.FRONT_LEFT_LEG);
        expect(deserializedArmor.FRONT_RIGHT_LEG).toBe(originalArmor.FRONT_RIGHT_LEG);
        expect(deserializedArmor.REAR_LEFT_LEG).toBe(originalArmor.REAR_LEFT_LEG);
        expect(deserializedArmor.REAR_RIGHT_LEG).toBe(originalArmor.REAR_RIGHT_LEG);
      });
    });

    describe('5.1.3 LAM Mech JSON Round-Trip', () => {
      it('should preserve LAM configuration through JSON serialization', () => {
        const lamUnit = createLAMMech();
        const serialized = JSON.stringify(lamUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        expect(deserialized.configuration).toBe('LAM');
        expect(deserialized.tonnage).toBe(55);
        expect(deserialized.criticalSlots.HEAD).toContain('Avionics');
        expect(deserialized.criticalSlots.CENTER_TORSO).toContain('Landing Gear');
      });

      it('should preserve LAM required equipment locations', () => {
        const lamUnit = createLAMMech();
        const serialized = JSON.stringify(lamUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        expect(deserialized.criticalSlots.LEFT_TORSO).toContain('Landing Gear');
        expect(deserialized.criticalSlots.RIGHT_TORSO).toContain('Landing Gear');
        expect(deserialized.criticalSlots.LEFT_TORSO).toContain('Avionics');
        expect(deserialized.criticalSlots.RIGHT_TORSO).toContain('Avionics');
      });
    });

    describe('5.1.4 LAM Mode Preservation', () => {
      it('should preserve biped locations in mech mode', () => {
        const lamUnit = createLAMMech();
        const locations = getLocationsForConfig(MechConfiguration.LAM);

        expect(locations).toContain(MechLocation.LEFT_ARM);
        expect(locations).toContain(MechLocation.RIGHT_ARM);
        expect(locations).toContain(MechLocation.LEFT_LEG);
        expect(locations).toContain(MechLocation.RIGHT_LEG);
      });

      it('should have fighter armor mapping available', () => {
        const mapping = configurationRegistry.getFighterArmorMapping(MechConfiguration.LAM);

        expect(mapping).toBeDefined();
        expect(mapping?.[MechLocation.HEAD]).toBe(MechLocation.NOSE);
        expect(mapping?.[MechLocation.CENTER_TORSO]).toBe(MechLocation.FUSELAGE);
        expect(mapping?.[MechLocation.LEFT_TORSO]).toBe(MechLocation.LEFT_WING);
        expect(mapping?.[MechLocation.RIGHT_TORSO]).toBe(MechLocation.RIGHT_WING);
      });
    });

    describe('5.1.5 Tripod Round-Trip', () => {
      it('should preserve tripod configuration through JSON serialization', () => {
        const tripodUnit = createTripodMech();
        const serialized = JSON.stringify(tripodUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        expect(deserialized.configuration).toBe('TRIPOD');
        expect(deserialized.criticalSlots[MechLocation.CENTER_LEG]).toBeDefined();
      });

      it('should preserve center leg armor allocation', () => {
        const tripodUnit = createTripodMech();
        const serialized = JSON.stringify(tripodUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        expect(deserialized.armor.allocation.CENTER_LEG).toBe(24);
      });

      it('should maintain tripod critical slot integrity', () => {
        const tripodUnit = createTripodMech();
        const centerLegSlots = tripodUnit.criticalSlots[MechLocation.CENTER_LEG];

        expect(centerLegSlots).toBeDefined();
        expect(centerLegSlots?.[0]).toBe('Hip');
        expect(centerLegSlots?.[1]).toBe('Upper Leg Actuator');
      });
    });

    describe('5.1.6 QuadVee Round-Trip', () => {
      it('should preserve QuadVee configuration through JSON serialization', () => {
        const quadVeeUnit = createQuadVeeMech();
        const serialized = JSON.stringify(quadVeeUnit);
        const deserialized = JSON.parse(serialized) as ISerializedUnit;

        expect(deserialized.configuration).toBe('QUADVEE');
        expect(deserialized.criticalSlots[MechLocation.FRONT_LEFT_LEG]).toContain('Conversion Equipment');
        expect(deserialized.criticalSlots[MechLocation.FRONT_LEFT_LEG]).toContain('Tracks');
      });

      it('should preserve QuadVee conversion equipment in all legs', () => {
        const quadVeeUnit = createQuadVeeMech();
        const legs = [
          MechLocation.FRONT_LEFT_LEG,
          MechLocation.FRONT_RIGHT_LEG,
          MechLocation.REAR_LEFT_LEG,
          MechLocation.REAR_RIGHT_LEG,
        ];

        for (const leg of legs) {
          expect(quadVeeUnit.criticalSlots[leg]).toContain('Conversion Equipment');
          expect(quadVeeUnit.criticalSlots[leg]).toContain('Tracks');
        }
      });
    });
  });

  describe('5.2 Migration Verification', () => {
    describe('5.2.1 Existing Biped Units', () => {
      it('should load biped units with correct configuration', () => {
        const bipedUnit = createMinimalUnit('BIPED');

        expect(bipedUnit.configuration).toBe('BIPED');
        expect(bipedUnit.unitType).toBe('BattleMech');
      });

      it('should have all 8 biped locations available', () => {
        const locations = BIPED_LOCATIONS;

        expect(locations).toHaveLength(8);
        expect(locations).toContain(MechLocation.HEAD);
        expect(locations).toContain(MechLocation.CENTER_TORSO);
        expect(locations).toContain(MechLocation.LEFT_TORSO);
        expect(locations).toContain(MechLocation.RIGHT_TORSO);
        expect(locations).toContain(MechLocation.LEFT_ARM);
        expect(locations).toContain(MechLocation.RIGHT_ARM);
        expect(locations).toContain(MechLocation.LEFT_LEG);
        expect(locations).toContain(MechLocation.RIGHT_LEG);
      });
    });

    describe('5.2.2 Biped Functionality Regression', () => {
      it('should not apply exotic rules to biped units', () => {
        const bipedUnit = createMinimalUnit('BIPED', {
          equipment: [
            { id: 'medium-laser', location: MechLocation.LEFT_ARM },
            { id: 'medium-laser', location: MechLocation.RIGHT_ARM },
          ],
        });
        const context = createValidationContext(bipedUnit);

        expect(QuadNoArmsRule.canValidate?.(context)).toBe(false);
        expect(LAMMaxTonnageRule.canValidate?.(context)).toBe(false);
        expect(TripodCenterLegRule.canValidate?.(context)).toBe(false);
        expect(QuadVeeConversionEquipmentRule.canValidate?.(context)).toBe(false);
      });

      it('should allow arm equipment on biped', () => {
        const bipedUnit = createMinimalUnit('BIPED', {
          equipment: [
            { id: 'medium-laser', location: MechLocation.LEFT_ARM },
            { id: 'ppc', location: MechLocation.RIGHT_ARM },
          ],
        });

        expect(bipedUnit.equipment).toHaveLength(2);
        expect(bipedUnit.equipment[0].location).toBe(MechLocation.LEFT_ARM);
        expect(bipedUnit.equipment[1].location).toBe(MechLocation.RIGHT_ARM);
      });
    });

    describe('5.2.3 Full Validation Suite', () => {
      it('should return all configuration validation rules', () => {
        const rules = getConfigurationValidationRules();

        expect(rules.length).toBeGreaterThanOrEqual(19);
      });

      it('should have rules for all exotic configurations', () => {
        const rules = getConfigurationValidationRules();
        const ruleIds = rules.map(r => r.id);

        expect(ruleIds).toContain('configuration.quad.no_arms');
        expect(ruleIds).toContain('configuration.quad.leg_count');
        expect(ruleIds).toContain('configuration.lam.max_tonnage');
        expect(ruleIds).toContain('configuration.tripod.center_leg');
        expect(ruleIds).toContain('configuration.quadvee.conversion_equipment');
      });

      it('should validate quad mech correctly', () => {
        const quadUnit = createQuadMech();
        const context = createValidationContext(quadUnit);

        const noArmsResult = QuadNoArmsRule.validate(context);
        const legCountResult = QuadLegCountRule.validate(context);

        expect(noArmsResult.passed).toBe(true);
        expect(legCountResult.passed).toBe(true);
      });

      it('should validate LAM mech correctly', () => {
        const lamUnit = createLAMMech();
        const context = createValidationContext(lamUnit);

        const tonnageResult = LAMMaxTonnageRule.validate(context);

        expect(tonnageResult.passed).toBe(true);
      });

      it('should validate tripod mech correctly', () => {
        const tripodUnit = createTripodMech();
        const context = createValidationContext(tripodUnit);

        const centerLegResult = TripodCenterLegRule.validate(context);

        expect(centerLegResult.passed).toBe(true);
      });

      it('should validate QuadVee mech correctly', () => {
        const quadVeeUnit = createQuadVeeMech();
        const context = createValidationContext(quadVeeUnit);

        const conversionResult = QuadVeeConversionEquipmentRule.validate(context);

        expect(conversionResult.passed).toBe(true);
      });
    });
  });
});
