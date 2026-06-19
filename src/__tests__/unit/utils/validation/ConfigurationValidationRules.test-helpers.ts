/**
 * ConfigurationValidationRules Unit Tests
 *
 * Tests for configuration-specific validation rules including:
 * - Quad mech validation (no arms, correct legs)
 * - Biped mech validation (no quad legs)
 * - LAM mech validation (tonnage, engine, structure/armor, equipment)
 * - Location validity checks
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IValidationContext } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  QuadNoArmsRule,
  QuadLegCountRule,
  QuadTotalSlotsRule,
  QuadLegArmorBalanceRule,
  BipedNoQuadLegsRule,
  ValidLocationsRule,
  LAMMaxTonnageRule,
  LAMEngineTypeRule,
  LAMStructureArmorRule,
  LAMLandingGearRule,
  LAMAvionicsRule,
  TripodCenterLegRule,
  TripodLegEquipmentRule,
  TripodTotalSlotsRule,
  TripodLegArmorBalanceRule,
  QuadVeeConversionEquipmentRule,
  QuadVeeTracksRule,
  QuadVeeTotalSlotsRule,
  QuadVeeLegArmorBalanceRule,
  OmniMechBaseHeatSinksRule,
  OmniMechBaseHeatSinksValidRule,
  OmniMechFixedEquipmentRule,
  getConfigurationValidationRules,
  registerConfigurationRules,
} from '@/utils/validation/rules/ConfigurationValidationRules';

describe('ConfigurationValidationRules', () => {
  const createContext = (
    unit: Record<string, unknown>,
  ): IValidationContext => ({
    unit,
    options: {},
    cache: new Map(),
  });

  describe('QuadNoArmsRule', () => {
    it('should pass when no equipment in arm locations', () => {
      const context = createContext({
        configuration: 'Quad',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.LEFT_TORSO },
          { name: 'Medium Laser', location: MechLocation.FRONT_LEFT_LEG },
        ],
      });

      const result = QuadNoArmsRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when equipment in left arm', () => {
      const context = createContext({
        configuration: 'Quad',
        equipment: [{ name: 'Medium Laser', location: MechLocation.LEFT_ARM }],
      });

      const result = QuadNoArmsRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Left Arm');
    });

    it('should fail when equipment in both arms', () => {
      const context = createContext({
        configuration: 'Quad',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.LEFT_ARM },
          { name: 'PPC', location: MechLocation.RIGHT_ARM },
        ],
      });

      const result = QuadNoArmsRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should only apply to quad mechs', () => {
      const bipedContext = createContext({
        configuration: 'Biped',
        equipment: [],
      });

      expect(QuadNoArmsRule.canValidate?.(bipedContext)).toBe(false);

      const quadContext = createContext({
        configuration: 'Quad',
        equipment: [],
      });

      expect(QuadNoArmsRule.canValidate?.(quadContext)).toBe(true);
    });
  });

  describe('QuadLegCountRule', () => {
    it('should pass when all quad legs have armor allocation', () => {
      const context = createContext({
        configuration: 'Quad',
        armorAllocation: {
          [MechLocation.FRONT_LEFT_LEG]: 20,
          [MechLocation.FRONT_RIGHT_LEG]: 20,
          [MechLocation.REAR_LEFT_LEG]: 18,
          [MechLocation.REAR_RIGHT_LEG]: 18,
        },
      });

      const result = QuadLegCountRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should only apply to quad mechs', () => {
      expect(
        QuadLegCountRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        QuadLegCountRule.canValidate?.(
          createContext({ configuration: 'Quad' }),
        ),
      ).toBe(true);
    });
  });

  describe('QuadTotalSlotsRule', () => {
    it('should pass when slots under maximum', () => {
      const context = createContext({
        configuration: 'Quad',
        criticalSlots: {
          [MechLocation.HEAD]: ['Cockpit', null, null, null, null, null],
          [MechLocation.CENTER_TORSO]: Array(12).fill('Gyro'),
        },
      });

      const result = QuadTotalSlotsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should only apply to quad mechs', () => {
      expect(
        QuadTotalSlotsRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
    });
  });

  describe('QuadLegArmorBalanceRule', () => {
    it('should pass when leg armor is balanced', () => {
      const context = createContext({
        configuration: 'Quad',
        armorAllocation: {
          [MechLocation.FRONT_LEFT_LEG]: 20,
          [MechLocation.FRONT_RIGHT_LEG]: 20,
          [MechLocation.REAR_LEFT_LEG]: 20,
          [MechLocation.REAR_RIGHT_LEG]: 20,
        },
      });

      const result = QuadLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when leg armor is significantly unbalanced', () => {
      const context = createContext({
        configuration: 'Quad',
        armorAllocation: {
          [MechLocation.FRONT_LEFT_LEG]: 30,
          [MechLocation.FRONT_RIGHT_LEG]: 30,
          [MechLocation.REAR_LEFT_LEG]: 10,
          [MechLocation.REAR_RIGHT_LEG]: 10,
        },
      });

      const result = QuadLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true); // Still passes, just warning
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should only apply to quad mechs', () => {
      expect(
        QuadLegArmorBalanceRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
    });
  });

  describe('BipedNoQuadLegsRule', () => {
    it('should pass for biped with normal locations', () => {
      const context = createContext({
        configuration: 'Biped',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.LEFT_ARM },
          { name: 'Medium Laser', location: MechLocation.LEFT_LEG },
        ],
      });

      const result = BipedNoQuadLegsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when biped has quad leg location', () => {
      const context = createContext({
        configuration: 'Biped',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.FRONT_LEFT_LEG },
        ],
      });

      const result = BipedNoQuadLegsRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Front Left Leg');
    });

    it('should only apply to non-quad mechs', () => {
      expect(
        BipedNoQuadLegsRule.canValidate?.(
          createContext({ configuration: 'Quad' }),
        ),
      ).toBe(false);
      expect(
        BipedNoQuadLegsRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(true);
    });
  });

  describe('ValidLocationsRule', () => {
    it('should pass for valid biped locations', () => {
      const context = createContext({
        configuration: 'Biped',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.LEFT_ARM },
          { name: 'PPC', location: MechLocation.RIGHT_TORSO },
        ],
      });

      const result = ValidLocationsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass for valid quad locations', () => {
      const context = createContext({
        configuration: 'Quad',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.LEFT_TORSO },
          { name: 'PPC', location: MechLocation.FRONT_LEFT_LEG },
        ],
      });

      const result = ValidLocationsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail for invalid quad location (arm)', () => {
      const context = createContext({
        configuration: 'Quad',
        equipment: [{ name: 'Medium Laser', location: MechLocation.LEFT_ARM }],
      });

      const result = ValidLocationsRule.validate(context);
      expect(result.passed).toBe(false);
    });

    it('should fail for invalid biped location (quad leg)', () => {
      const context = createContext({
        configuration: 'Biped',
        equipment: [
          { name: 'Medium Laser', location: MechLocation.FRONT_LEFT_LEG },
        ],
      });

      const result = ValidLocationsRule.validate(context);
      expect(result.passed).toBe(false);
    });
  });

  // ==========================================================================
  // LAM VALIDATION RULES
  // ==========================================================================

  describe('LAMMaxTonnageRule', () => {
    it('should pass when LAM is 55 tons or less', () => {
      const context = createContext({
        configuration: 'LAM',
        tonnage: 50,
      });

      const result = LAMMaxTonnageRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when LAM is exactly 55 tons', () => {
      const context = createContext({
        configuration: 'LAM',
        tonnage: 55,
      });

      const result = LAMMaxTonnageRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when LAM exceeds 55 tons', () => {
      const context = createContext({
        configuration: 'LAM',
        tonnage: 60,
      });

      const result = LAMMaxTonnageRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('55 tons');
    });

    it('should only apply to LAM mechs', () => {
      expect(
        LAMMaxTonnageRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        LAMMaxTonnageRule.canValidate?.(
          createContext({ configuration: 'LAM' }),
        ),
      ).toBe(true);
    });
  });

  describe('LAMEngineTypeRule', () => {
    it('should pass when LAM uses Fusion engine', () => {
      const context = createContext({
        configuration: 'LAM',
        engine: { type: 'FUSION', rating: 250 },
      });

      const result = LAMEngineTypeRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when LAM uses XL engine', () => {
      const context = createContext({
        configuration: 'LAM',
        engine: { type: 'XL', rating: 250 },
      });

      const result = LAMEngineTypeRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('XL');
    });

    it('should fail when LAM uses Light engine', () => {
      const context = createContext({
        configuration: 'LAM',
        engine: { type: 'LIGHT', rating: 250 },
      });

      const result = LAMEngineTypeRule.validate(context);
      expect(result.passed).toBe(false);
    });

    it('should only apply to LAM mechs', () => {
      expect(
        LAMEngineTypeRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        LAMEngineTypeRule.canValidate?.(
          createContext({ configuration: 'LAM' }),
        ),
      ).toBe(true);
    });
  });

  describe('LAMStructureArmorRule', () => {
    it('should pass when LAM uses Standard structure and armor', () => {
      const context = createContext({
        configuration: 'LAM',
        structure: { type: 'STANDARD' },
        armor: { type: 'STANDARD' },
      });

      const result = LAMStructureArmorRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when LAM uses Endo Steel structure', () => {
      const context = createContext({
        configuration: 'LAM',
        structure: { type: 'ENDO_STEEL' },
        armor: { type: 'STANDARD' },
      });

      const result = LAMStructureArmorRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('ENDO_STEEL');
    });

    it('should fail when LAM uses Ferro-Fibrous armor', () => {
      const context = createContext({
        configuration: 'LAM',
        structure: { type: 'STANDARD' },
        armor: { type: 'FERRO_FIBROUS' },
      });

      const result = LAMStructureArmorRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('FERRO_FIBROUS');
    });

    it('should only apply to LAM mechs', () => {
      expect(
        LAMStructureArmorRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        LAMStructureArmorRule.canValidate?.(
          createContext({ configuration: 'LAM' }),
        ),
      ).toBe(true);
    });
  });

  describe('LAMLandingGearRule', () => {
    it('should pass when LAM has Landing Gear in CT, LT, RT', () => {
      const context = createContext({
        configuration: 'LAM',
        criticalSlots: {
          [MechLocation.CENTER_TORSO]: ['Fusion Engine', 'Landing Gear', null],
          [MechLocation.LEFT_TORSO]: ['Landing Gear', null, null],
          [MechLocation.RIGHT_TORSO]: ['Landing Gear', null, null],
        },
      });

      const result = LAMLandingGearRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when LAM is missing Landing Gear in CT', () => {
      const context = createContext({
        configuration: 'LAM',
        criticalSlots: {
          [MechLocation.CENTER_TORSO]: ['Fusion Engine', null, null],
          [MechLocation.LEFT_TORSO]: ['Landing Gear', null, null],
          [MechLocation.RIGHT_TORSO]: ['Landing Gear', null, null],
        },
      });

      const result = LAMLandingGearRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Center Torso');
    });

    it('should only apply to LAM mechs', () => {
      expect(
        LAMLandingGearRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        LAMLandingGearRule.canValidate?.(
          createContext({ configuration: 'LAM' }),
        ),
      ).toBe(true);
    });
  });

  describe('LAMAvionicsRule', () => {
    it('should pass when LAM has Avionics in HD, LT, RT', () => {
      const context = createContext({
        configuration: 'LAM',
        criticalSlots: {
          [MechLocation.HEAD]: [
            'Life Support',
            'Sensors',
            'Cockpit',
            'Avionics',
          ],
          [MechLocation.LEFT_TORSO]: ['Avionics', null, null],
          [MechLocation.RIGHT_TORSO]: ['Avionics', null, null],
        },
      });

      const result = LAMAvionicsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when LAM is missing Avionics in Head', () => {
      const context = createContext({
        configuration: 'LAM',
        criticalSlots: {
          [MechLocation.HEAD]: ['Life Support', 'Sensors', 'Cockpit', null],
          [MechLocation.LEFT_TORSO]: ['Avionics', null, null],
          [MechLocation.RIGHT_TORSO]: ['Avionics', null, null],
        },
      });

      const result = LAMAvionicsRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Head');
    });

    it('should only apply to LAM mechs', () => {
      expect(
        LAMAvionicsRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        LAMAvionicsRule.canValidate?.(createContext({ configuration: 'LAM' })),
      ).toBe(true);
    });
  });

  // ============================================================================
  // TRIPOD VALIDATION RULES
  // ============================================================================

  describe('TripodCenterLegRule', () => {
    it('should pass when tripod has center leg in armor allocation', () => {
      const context = createContext({
        configuration: 'Tripod',
        armorAllocation: {
          [MechLocation.CENTER_LEG]: 30,
          [MechLocation.LEFT_LEG]: 30,
          [MechLocation.RIGHT_LEG]: 30,
        },
      });

      const result = TripodCenterLegRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when tripod has center leg in critical slots', () => {
      const context = createContext({
        configuration: 'Tripod',
        criticalSlots: {
          [MechLocation.CENTER_LEG]: [
            'Hip',
            'Upper Leg Actuator',
            'Lower Leg Actuator',
            'Foot Actuator',
          ],
        },
      });

      const result = TripodCenterLegRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when tripod is missing center leg location', () => {
      const context = createContext({
        configuration: 'Tripod',
        armorAllocation: {
          [MechLocation.LEFT_LEG]: 30,
          [MechLocation.RIGHT_LEG]: 30,
        },
        criticalSlots: {
          [MechLocation.LEFT_LEG]: ['Hip', 'Upper Leg Actuator'],
          [MechLocation.RIGHT_LEG]: ['Hip', 'Upper Leg Actuator'],
        },
      });

      const result = TripodCenterLegRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Center Leg');
    });

    it('should only apply to tripod mechs', () => {
      expect(
        TripodCenterLegRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        TripodCenterLegRule.canValidate?.(
          createContext({ configuration: 'Tripod' }),
        ),
      ).toBe(true);
    });
  });

  describe('TripodLegEquipmentRule', () => {
    it('should pass when no leg-spanning equipment is present', () => {
      const context = createContext({
        configuration: 'Tripod',
        criticalSlots: {
          [MechLocation.LEFT_LEG]: ['Hip', 'Upper Leg Actuator', null],
          [MechLocation.RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', null],
          [MechLocation.CENTER_LEG]: ['Hip', 'Upper Leg Actuator', null],
        },
      });

      const result = TripodLegEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when tracks are in all three legs', () => {
      const context = createContext({
        configuration: 'Tripod',
        criticalSlots: {
          [MechLocation.LEFT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.RIGHT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.CENTER_LEG]: ['Hip', 'Tracks', null],
        },
      });

      const result = TripodLegEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when tracks are only in some legs', () => {
      const context = createContext({
        configuration: 'Tripod',
        criticalSlots: {
          [MechLocation.LEFT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.RIGHT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.CENTER_LEG]: ['Hip', null, null],
        },
      });

      const result = TripodLegEquipmentRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Tracks');
      expect(result.errors[0].message).toContain('all three legs');
    });

    it('should fail when talons are only in some legs', () => {
      const context = createContext({
        configuration: 'Tripod',
        criticalSlots: {
          [MechLocation.LEFT_LEG]: ['Hip', 'Talons', null],
          [MechLocation.RIGHT_LEG]: ['Hip', null, null],
          [MechLocation.CENTER_LEG]: ['Hip', null, null],
        },
      });

      const result = TripodLegEquipmentRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Talons');
    });

    it('should only apply to tripod mechs', () => {
      expect(
        TripodLegEquipmentRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        TripodLegEquipmentRule.canValidate?.(
          createContext({ configuration: 'Tripod' }),
        ),
      ).toBe(true);
    });
  });

  describe('TripodTotalSlotsRule', () => {
    it('should pass when within slot limit', () => {
      const context = createContext({
        configuration: 'Tripod',
        criticalSlots: {
          [MechLocation.HEAD]: [
            'Life Support',
            'Sensors',
            null,
            null,
            null,
            null,
          ],
          [MechLocation.CENTER_TORSO]: [
            'Engine',
            'Engine',
            null,
            null,
            null,
            null,
          ],
        },
      });

      const result = TripodTotalSlotsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should only apply to tripod mechs', () => {
      expect(
        TripodTotalSlotsRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        TripodTotalSlotsRule.canValidate?.(
          createContext({ configuration: 'Tripod' }),
        ),
      ).toBe(true);
    });
  });

  describe('TripodLegArmorBalanceRule', () => {
    it('should pass when leg armor is balanced', () => {
      const context = createContext({
        configuration: 'Tripod',
        armorAllocation: {
          [MechLocation.LEFT_LEG]: 30,
          [MechLocation.RIGHT_LEG]: 30,
          [MechLocation.CENTER_LEG]: 30,
        },
      });

      const result = TripodLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when leg armor varies significantly', () => {
      const context = createContext({
        configuration: 'Tripod',
        armorAllocation: {
          [MechLocation.LEFT_LEG]: 40,
          [MechLocation.RIGHT_LEG]: 40,
          [MechLocation.CENTER_LEG]: 15,
        },
      });

      const result = TripodLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true); // Warnings don't fail validation
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('varies significantly');
    });

    it('should warn when center leg has less armor than side legs', () => {
      const context = createContext({
        configuration: 'Tripod',
        armorAllocation: {
          [MechLocation.LEFT_LEG]: 40,
          [MechLocation.RIGHT_LEG]: 40,
          [MechLocation.CENTER_LEG]: 25,
        },
      });

      const result = TripodLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Center leg')),
      ).toBe(true);
    });

    it('should only apply to tripod mechs', () => {
      expect(
        TripodLegArmorBalanceRule.canValidate?.(
          createContext({ configuration: 'Biped' }),
        ),
      ).toBe(false);
      expect(
        TripodLegArmorBalanceRule.canValidate?.(
          createContext({ configuration: 'Tripod' }),
        ),
      ).toBe(true);
    });
  });

  // ============================================================================
  // QUADVEE VALIDATION RULES
  // ============================================================================

  describe('QuadVeeConversionEquipmentRule', () => {
    it('should pass when conversion equipment is in all four legs', () => {
      const context = createContext({
        configuration: 'QuadVee',
        criticalSlots: {
          [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Conversion Equipment', null],
          [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Conversion Equipment', null],
          [MechLocation.REAR_LEFT_LEG]: ['Hip', 'Conversion Equipment', null],
          [MechLocation.REAR_RIGHT_LEG]: ['Hip', 'Conversion Equipment', null],
        },
      });

      const result = QuadVeeConversionEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when conversion equipment is missing from some legs', () => {
      const context = createContext({
        configuration: 'QuadVee',
        criticalSlots: {
          [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Conversion Equipment', null],
          [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Conversion Equipment', null],
          [MechLocation.REAR_LEFT_LEG]: ['Hip', null, null],
          [MechLocation.REAR_RIGHT_LEG]: ['Hip', null, null],
        },
      });

      const result = QuadVeeConversionEquipmentRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Rear Left Leg');
    });

    it('should warn when no critical slot data available', () => {
      const context = createContext({
        configuration: 'QuadVee',
      });

      const result = QuadVeeConversionEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Cannot verify');
    });

    it('should only apply to quadvee mechs', () => {
      expect(
        QuadVeeConversionEquipmentRule.canValidate?.(
          createContext({ configuration: 'Quad' }),
        ),
      ).toBe(false);
      expect(
        QuadVeeConversionEquipmentRule.canValidate?.(
          createContext({ configuration: 'QuadVee' }),
        ),
      ).toBe(true);
    });
  });

  describe('QuadVeeTracksRule', () => {
    it('should pass when no tracks are present', () => {
      const context = createContext({
        configuration: 'QuadVee',
        criticalSlots: {
          [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Upper Leg Actuator', null],
          [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', null],
          [MechLocation.REAR_LEFT_LEG]: ['Hip', 'Upper Leg Actuator', null],
          [MechLocation.REAR_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator', null],
        },
      });

      const result = QuadVeeTracksRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when tracks are in all four legs', () => {
      const context = createContext({
        configuration: 'QuadVee',
        criticalSlots: {
          [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.REAR_LEFT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.REAR_RIGHT_LEG]: ['Hip', 'Tracks', null],
        },
      });

      const result = QuadVeeTracksRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when tracks are only in some legs', () => {
      const context = createContext({
        configuration: 'QuadVee',
        criticalSlots: {
          [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Tracks', null],
          [MechLocation.REAR_LEFT_LEG]: ['Hip', null, null],
          [MechLocation.REAR_RIGHT_LEG]: ['Hip', null, null],
        },
      });

      const result = QuadVeeTracksRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('all four legs');
    });

    it('should only apply to quadvee mechs', () => {
      expect(
        QuadVeeTracksRule.canValidate?.(
          createContext({ configuration: 'Quad' }),
        ),
      ).toBe(false);
      expect(
        QuadVeeTracksRule.canValidate?.(
          createContext({ configuration: 'QuadVee' }),
        ),
      ).toBe(true);
    });
  });

  describe('QuadVeeTotalSlotsRule', () => {
    it('should pass when within slot limit', () => {
      const context = createContext({
        configuration: 'QuadVee',
        criticalSlots: {
          [MechLocation.HEAD]: [
            'Life Support',
            'Sensors',
            null,
            null,
            null,
            null,
          ],
          [MechLocation.CENTER_TORSO]: [
            'Engine',
            'Engine',
            null,
            null,
            null,
            null,
          ],
        },
      });

      const result = QuadVeeTotalSlotsRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should only apply to quadvee mechs', () => {
      expect(
        QuadVeeTotalSlotsRule.canValidate?.(
          createContext({ configuration: 'Quad' }),
        ),
      ).toBe(false);
      expect(
        QuadVeeTotalSlotsRule.canValidate?.(
          createContext({ configuration: 'QuadVee' }),
        ),
      ).toBe(true);
    });
  });

  describe('QuadVeeLegArmorBalanceRule', () => {
    it('should pass when leg armor is balanced', () => {
      const context = createContext({
        configuration: 'QuadVee',
        armorAllocation: {
          [MechLocation.FRONT_LEFT_LEG]: 30,
          [MechLocation.FRONT_RIGHT_LEG]: 30,
          [MechLocation.REAR_LEFT_LEG]: 30,
          [MechLocation.REAR_RIGHT_LEG]: 30,
        },
      });

      const result = QuadVeeLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when leg armor varies significantly', () => {
      const context = createContext({
        configuration: 'QuadVee',
        armorAllocation: {
          [MechLocation.FRONT_LEFT_LEG]: 40,
          [MechLocation.FRONT_RIGHT_LEG]: 40,
          [MechLocation.REAR_LEFT_LEG]: 15,
          [MechLocation.REAR_RIGHT_LEG]: 15,
        },
      });

      const result = QuadVeeLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true); // Warnings don't fail validation
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('varies significantly');
    });

    it('should warn when front/rear armor is unbalanced', () => {
      const context = createContext({
        configuration: 'QuadVee',
        armorAllocation: {
          [MechLocation.FRONT_LEFT_LEG]: 40,
          [MechLocation.FRONT_RIGHT_LEG]: 40,
          [MechLocation.REAR_LEFT_LEG]: 15,
          [MechLocation.REAR_RIGHT_LEG]: 15,
        },
      });

      const result = QuadVeeLegArmorBalanceRule.validate(context);
      expect(result.passed).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Front and rear')),
      ).toBe(true);
    });

    it('should only apply to quadvee mechs', () => {
      expect(
        QuadVeeLegArmorBalanceRule.canValidate?.(
          createContext({ configuration: 'Quad' }),
        ),
      ).toBe(false);
      expect(
        QuadVeeLegArmorBalanceRule.canValidate?.(
          createContext({ configuration: 'QuadVee' }),
        ),
      ).toBe(true);
    });
  });

  // ============================================================================
  // OMNIMECH VALIDATION RULES
  // ============================================================================

  describe('OmniMechBaseHeatSinksRule', () => {
    it('should pass when base heat sinks is -1 (auto)', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: -1,
        heatSinkCount: 10,
      });

      const result = OmniMechBaseHeatSinksRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when base heat sinks is undefined', () => {
      const context = createContext({
        isOmni: true,
        heatSinkCount: 10,
      });

      const result = OmniMechBaseHeatSinksRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when base heat sinks is less than total', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: 5,
        heatSinkCount: 10,
      });

      const result = OmniMechBaseHeatSinksRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when base heat sinks equals total', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: 10,
        heatSinkCount: 10,
      });

      const result = OmniMechBaseHeatSinksRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when base heat sinks exceeds total', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: 15,
        heatSinkCount: 10,
      });

      const result = OmniMechBaseHeatSinksRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('cannot exceed');
    });

    it('should only apply to OmniMechs', () => {
      expect(
        OmniMechBaseHeatSinksRule.canValidate?.(
          createContext({ isOmni: false }),
        ),
      ).toBe(false);
      expect(
        OmniMechBaseHeatSinksRule.canValidate?.(
          createContext({ isOmni: true }),
        ),
      ).toBe(true);
    });
  });

  describe('OmniMechBaseHeatSinksValidRule', () => {
    it('should pass when base heat sinks is -1 (auto)', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: -1,
      });

      const result = OmniMechBaseHeatSinksValidRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when base heat sinks is undefined', () => {
      const context = createContext({
        isOmni: true,
      });

      const result = OmniMechBaseHeatSinksValidRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when base heat sinks is 0', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: 0,
      });

      const result = OmniMechBaseHeatSinksValidRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when base heat sinks is positive', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: 10,
      });

      const result = OmniMechBaseHeatSinksValidRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should fail when base heat sinks is negative (not -1)', () => {
      const context = createContext({
        isOmni: true,
        baseChassisHeatSinks: -5,
      });

      const result = OmniMechBaseHeatSinksValidRule.validate(context);
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('cannot be negative');
    });

    it('should only apply to OmniMechs', () => {
      expect(
        OmniMechBaseHeatSinksValidRule.canValidate?.(
          createContext({ isOmni: false }),
        ),
      ).toBe(false);
      expect(
        OmniMechBaseHeatSinksValidRule.canValidate?.(
          createContext({ isOmni: true }),
        ),
      ).toBe(true);
    });
  });

  describe('OmniMechFixedEquipmentRule', () => {
    it('should pass when no equipment is present', () => {
      const context = createContext({
        isOmni: true,
      });

      const result = OmniMechFixedEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when equipment array is empty', () => {
      const context = createContext({
        isOmni: true,
        equipment: [],
      });

      const result = OmniMechFixedEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
    });

    it('should pass when some equipment is fixed (not pod-mounted)', () => {
      const context = createContext({
        isOmni: true,
        equipment: [
          {
            name: 'Medium Laser',
            location: 'Left Arm',
            isOmniPodMounted: true,
          },
          {
            name: 'ER Large Laser',
            location: 'Right Torso',
            isOmniPodMounted: false,
          },
        ],
      });

      const result = OmniMechFixedEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass with only fixed equipment', () => {
      const context = createContext({
        isOmni: true,
        equipment: [
          { name: 'Medium Laser', location: 'Left Arm' }, // No isOmniPodMounted = fixed
          { name: 'ER Large Laser', location: 'Right Torso' },
        ],
      });

      const result = OmniMechFixedEquipmentRule.validate(context);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when all equipment is pod-mounted', () => {
      const context = createContext({
        isOmni: true,
        equipment: [
          {
            name: 'Medium Laser',
            location: 'Left Arm',
            isOmniPodMounted: true,
          },
          {
            name: 'ER Large Laser',
            location: 'Right Torso',
            isOmniPodMounted: true,
          },
        ],
      });

      const result = OmniMechFixedEquipmentRule.validate(context);
      expect(result.passed).toBe(true); // Just a warning, doesn't fail
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('no fixed');
    });

    it('should only apply to OmniMechs', () => {
      expect(
        OmniMechFixedEquipmentRule.canValidate?.(
          createContext({ isOmni: false }),
        ),
      ).toBe(false);
      expect(
        OmniMechFixedEquipmentRule.canValidate?.(
          createContext({ isOmni: true }),
        ),
      ).toBe(true);
    });
  });

  describe('getConfigurationValidationRules', () => {
    it('should return all configuration validation rules', () => {
      const rules = getConfigurationValidationRules();
      expect(rules.length).toBeGreaterThanOrEqual(22);
      expect(rules.map((r) => r.id)).toContain('configuration.quad.no_arms');
      expect(rules.map((r) => r.id)).toContain('configuration.quad.leg_count');
      expect(rules.map((r) => r.id)).toContain('configuration.valid_locations');
      // LAM rules
      expect(rules.map((r) => r.id)).toContain('configuration.lam.max_tonnage');
      expect(rules.map((r) => r.id)).toContain('configuration.lam.engine_type');
      expect(rules.map((r) => r.id)).toContain(
        'configuration.lam.structure_armor',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.lam.landing_gear',
      );
      expect(rules.map((r) => r.id)).toContain('configuration.lam.avionics');
      // Tripod rules
      expect(rules.map((r) => r.id)).toContain(
        'configuration.tripod.center_leg',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.tripod.leg_equipment',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.tripod.total_slots',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.tripod.leg_armor_balance',
      );
      // QuadVee rules
      expect(rules.map((r) => r.id)).toContain(
        'configuration.quadvee.conversion_equipment',
      );
      expect(rules.map((r) => r.id)).toContain('configuration.quadvee.tracks');
      expect(rules.map((r) => r.id)).toContain(
        'configuration.quadvee.total_slots',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.quadvee.leg_armor_balance',
      );
      // OmniMech rules
      expect(rules.map((r) => r.id)).toContain(
        'configuration.omnimech.base_heat_sinks',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.omnimech.base_heat_sinks_valid',
      );
      expect(rules.map((r) => r.id)).toContain(
        'configuration.omnimech.fixed_equipment',
      );
    });
  });

  describe('registerConfigurationRules', () => {
    it('should register all configuration rules with a registry', () => {
      const registeredRules: string[] = [];
      const mockRegistry = {
        register: jest.fn((rule: { id: string }) => {
          registeredRules.push(rule.id);
        }),
      };

      registerConfigurationRules(mockRegistry);

      expect(mockRegistry.register).toHaveBeenCalled();
      expect(registeredRules.length).toBeGreaterThanOrEqual(22);
      expect(registeredRules).toContain('configuration.quad.no_arms');
      expect(registeredRules).toContain('configuration.lam.max_tonnage');
      expect(registeredRules).toContain('configuration.tripod.center_leg');
      expect(registeredRules).toContain(
        'configuration.quadvee.conversion_equipment',
      );
      expect(registeredRules).toContain(
        'configuration.omnimech.base_heat_sinks',
      );
      expect(registeredRules).toContain(
        'configuration.omnimech.fixed_equipment',
      );
    });
  });

  // Additional branch coverage tests
  describe('Edge cases and branch coverage', () => {
    describe('QuadNoArmsRule - no equipment', () => {
      it('should pass when equipment is undefined', () => {
        const context = createContext({
          configuration: 'Quad',
          // equipment is undefined
        });

        const result = QuadNoArmsRule.validate(context);
        expect(result.passed).toBe(true);
      });
    });

    describe('QuadLegCountRule - missing legs', () => {
      it('should fail when quad leg is missing from armor allocation', () => {
        const context = createContext({
          configuration: 'Quad',
          armorAllocation: {
            [MechLocation.FRONT_LEFT_LEG]: 20,
            [MechLocation.FRONT_RIGHT_LEG]: 20,
            [MechLocation.REAR_LEFT_LEG]: 20,
            // Missing REAR_RIGHT_LEG
          },
        });

        const result = QuadLegCountRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('missing');
      });
    });

    describe('QuadTotalSlotsRule - exceeding slots', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'Quad',
          // criticalSlots is undefined
        });

        const result = QuadTotalSlotsRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when critical slots exceed quad maximum', () => {
        // Quad max is 66: 6 (head) + 12*3 (torsos) + 6*4 (quad legs) = 6 + 36 + 24 = 66
        // Fill all locations to capacity = 66, then add 1 more = 67 total
        const context = createContext({
          configuration: 'Quad',
          criticalSlots: {
            [MechLocation.HEAD]: Array(6).fill('Equipment'), // 6
            [MechLocation.CENTER_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.LEFT_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.RIGHT_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.FRONT_LEFT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.FRONT_RIGHT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.REAR_LEFT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.REAR_RIGHT_LEG]: Array(7).fill('Equipment'), // 7 (1 over) = 67 total
          },
        });

        const result = QuadTotalSlotsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('exceed');
      });
    });

    describe('ValidLocationsRule - invalid locations', () => {
      it('should pass when equipment is undefined', () => {
        const context = createContext({
          configuration: 'Biped',
          // equipment is undefined
        });

        const result = ValidLocationsRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when biped has equipment in quad leg locations', () => {
        const context = createContext({
          configuration: 'Biped',
          equipment: [
            { name: 'Medium Laser', location: MechLocation.FRONT_LEFT_LEG },
          ],
        });

        const result = ValidLocationsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('not valid');
      });

      it('should fail when quad has equipment in biped arm locations', () => {
        const context = createContext({
          configuration: 'Quad',
          equipment: [
            { name: 'Medium Laser', location: MechLocation.LEFT_ARM },
          ],
        });

        const result = ValidLocationsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('not valid');
      });
    });

    describe('LAMStructureArmorRule - non-standard equipment', () => {
      it('should pass when no structure or armor specified', () => {
        const context = createContext({
          configuration: 'LAM',
          // No structure or armor specified
        });

        const result = LAMStructureArmorRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail with non-standard structure', () => {
        const context = createContext({
          configuration: 'LAM',
          structure: { type: 'Endo Steel' },
        });

        const result = LAMStructureArmorRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('Endo Steel');
      });

      it('should fail with non-standard armor', () => {
        const context = createContext({
          configuration: 'LAM',
          armor: { type: 'Ferro-Fibrous' },
        });

        const result = LAMStructureArmorRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('Ferro-Fibrous');
      });
    });

    describe('LAMLandingGearRule - missing landing gear', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'LAM',
          // criticalSlots is undefined
        });

        const result = LAMLandingGearRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when landing gear is missing', () => {
        const context = createContext({
          configuration: 'LAM',
          criticalSlots: {
            [MechLocation.CENTER_TORSO]: ['Engine', 'Engine', 'Gyro'],
          },
        });

        const result = LAMLandingGearRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('Landing Gear');
      });
    });

    describe('LAMAvionicsRule - missing avionics', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'LAM',
          // criticalSlots is undefined
        });

        const result = LAMAvionicsRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when avionics is missing', () => {
        const context = createContext({
          configuration: 'LAM',
          criticalSlots: {
            [MechLocation.HEAD]: ['Life Support', 'Sensors', 'Cockpit'],
          },
        });

        const result = LAMAvionicsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('Avionics');
      });
    });

    describe('TripodCenterLegRule - missing center leg', () => {
      it('should fail when center leg armor is missing', () => {
        const context = createContext({
          configuration: 'Tripod',
          armorAllocation: {
            [MechLocation.LEFT_LEG]: 20,
            [MechLocation.RIGHT_LEG]: 20,
            // Missing CENTER_LEG
          },
        });

        const result = TripodCenterLegRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('Center Leg');
      });
    });

    describe('TripodTotalSlotsRule - exceeding slots', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'Tripod',
          // criticalSlots is undefined
        });

        const result = TripodTotalSlotsRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when critical slots exceed tripod maximum', () => {
        // Tripod max is 84: 6 (head) + 12*3 (torsos) + 12*2 (arms) + 6*3 (legs) = 6 + 36 + 24 + 18 = 84
        // Fill to capacity then add 1 more
        const context = createContext({
          configuration: 'Tripod',
          criticalSlots: {
            [MechLocation.HEAD]: Array(6).fill('Equipment'), // 6
            [MechLocation.CENTER_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.LEFT_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.RIGHT_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.LEFT_ARM]: Array(12).fill('Equipment'), // 12
            [MechLocation.RIGHT_ARM]: Array(12).fill('Equipment'), // 12
            [MechLocation.LEFT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.RIGHT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.CENTER_LEG]: Array(7).fill('Equipment'), // 7 (1 over) = 85 total
          },
        });

        const result = TripodTotalSlotsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('exceed');
      });
    });

    describe('QuadVeeConversionEquipmentRule - missing conversion equipment', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'QuadVee',
          // criticalSlots is undefined
        });

        const result = QuadVeeConversionEquipmentRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when conversion equipment is missing from legs', () => {
        const context = createContext({
          configuration: 'QuadVee',
          criticalSlots: {
            [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Upper Leg Actuator'],
            [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator'],
            [MechLocation.REAR_LEFT_LEG]: ['Hip', 'Upper Leg Actuator'],
            [MechLocation.REAR_RIGHT_LEG]: ['Hip', 'Upper Leg Actuator'],
          },
        });

        const result = QuadVeeConversionEquipmentRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('conversion equipment');
      });
    });

    describe('QuadVeeTracksRule - incomplete tracks', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'QuadVee',
          // criticalSlots is undefined
        });

        const result = QuadVeeTracksRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when tracks are only in some legs', () => {
        const context = createContext({
          configuration: 'QuadVee',
          criticalSlots: {
            [MechLocation.FRONT_LEFT_LEG]: ['Hip', 'Tracks'],
            [MechLocation.FRONT_RIGHT_LEG]: ['Hip', 'Tracks'],
            [MechLocation.REAR_LEFT_LEG]: ['Hip'],
            [MechLocation.REAR_RIGHT_LEG]: ['Hip'],
          },
        });

        const result = QuadVeeTracksRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('all four legs');
      });
    });

    describe('QuadVeeTotalSlotsRule - exceeding slots', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'QuadVee',
          // criticalSlots is undefined
        });

        const result = QuadVeeTotalSlotsRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when critical slots exceed quadvee maximum', () => {
        // QuadVee max is 66: 6 (head) + 12*3 (torsos) + 6*4 (legs) = 6 + 36 + 24 = 66
        // Fill to capacity then add 1 more
        const context = createContext({
          configuration: 'QuadVee',
          criticalSlots: {
            [MechLocation.HEAD]: Array(6).fill('Equipment'), // 6
            [MechLocation.CENTER_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.LEFT_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.RIGHT_TORSO]: Array(12).fill('Equipment'), // 12
            [MechLocation.FRONT_LEFT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.FRONT_RIGHT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.REAR_LEFT_LEG]: Array(6).fill('Equipment'), // 6
            [MechLocation.REAR_RIGHT_LEG]: Array(7).fill('Equipment'), // 7 (1 over) = 67 total
          },
        });

        const result = QuadVeeTotalSlotsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('exceed');
      });
    });

    describe('QuadVeeLegArmorBalanceRule - no armor allocation', () => {
      it('should pass when armorAllocation is undefined', () => {
        const context = createContext({
          configuration: 'QuadVee',
          // armorAllocation is undefined
        });

        const result = QuadVeeLegArmorBalanceRule.validate(context);
        expect(result.passed).toBe(true);
      });
    });

    describe('TripodLegArmorBalanceRule - no armor allocation', () => {
      it('should pass when armorAllocation is undefined', () => {
        const context = createContext({
          configuration: 'Tripod',
          // armorAllocation is undefined
        });

        const result = TripodLegArmorBalanceRule.validate(context);
        expect(result.passed).toBe(true);
      });
    });

    describe('QuadLegArmorBalanceRule - no armor allocation', () => {
      it('should pass when armorAllocation is undefined', () => {
        const context = createContext({
          configuration: 'Quad',
          // armorAllocation is undefined
        });

        const result = QuadLegArmorBalanceRule.validate(context);
        expect(result.passed).toBe(true);
      });
    });

    describe('TripodLegEquipmentRule - no critical slots', () => {
      it('should pass when criticalSlots is undefined', () => {
        const context = createContext({
          configuration: 'Tripod',
          // criticalSlots is undefined
        });

        const result = TripodLegEquipmentRule.validate(context);
        expect(result.passed).toBe(true);
      });
    });

    describe('BipedNoQuadLegsRule - equipment in quad locations', () => {
      it('should pass when equipment is undefined', () => {
        const context = createContext({
          configuration: 'Biped',
          // equipment is undefined
        });

        const result = BipedNoQuadLegsRule.validate(context);
        expect(result.passed).toBe(true);
      });

      it('should fail when biped has equipment in front leg', () => {
        const context = createContext({
          configuration: 'Biped',
          equipment: [
            { name: 'Medium Laser', location: MechLocation.FRONT_LEFT_LEG },
          ],
        });

        const result = BipedNoQuadLegsRule.validate(context);
        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('Front Left Leg');
      });
    });
  });
});
