/**
 * ConfigurationValidationRules Unit Tests
 *
 * Tests for configuration-specific validation rules including:
 * - Quad mech validation (no arms, correct legs)
 * - Biped mech validation (no quad legs)
 * - LAM mech validation (tonnage, engine, structure/armor, equipment)
 * - Location validity checks
 */

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
  getConfigurationValidationRules,
} from '@/utils/validation/rules/ConfigurationValidationRules';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IValidationContext } from '@/types/validation/rules/ValidationRuleInterfaces';

describe('ConfigurationValidationRules', () => {
  const createContext = (unit: Record<string, unknown>): IValidationContext => ({
    unit,
    equipment: [],
    options: {},
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
          createContext({ configuration: 'Biped' })
        )
      ).toBe(false);
      expect(
        QuadLegCountRule.canValidate?.(
          createContext({ configuration: 'Quad' })
        )
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
          createContext({ configuration: 'Biped' })
        )
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
          createContext({ configuration: 'Biped' })
        )
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
          createContext({ configuration: 'Quad' })
        )
      ).toBe(false);
      expect(
        BipedNoQuadLegsRule.canValidate?.(
          createContext({ configuration: 'Biped' })
        )
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
        LAMMaxTonnageRule.canValidate?.(createContext({ configuration: 'Biped' }))
      ).toBe(false);
      expect(
        LAMMaxTonnageRule.canValidate?.(createContext({ configuration: 'LAM' }))
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
        LAMEngineTypeRule.canValidate?.(createContext({ configuration: 'Biped' }))
      ).toBe(false);
      expect(
        LAMEngineTypeRule.canValidate?.(createContext({ configuration: 'LAM' }))
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
        LAMStructureArmorRule.canValidate?.(createContext({ configuration: 'Biped' }))
      ).toBe(false);
      expect(
        LAMStructureArmorRule.canValidate?.(createContext({ configuration: 'LAM' }))
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
        LAMLandingGearRule.canValidate?.(createContext({ configuration: 'Biped' }))
      ).toBe(false);
      expect(
        LAMLandingGearRule.canValidate?.(createContext({ configuration: 'LAM' }))
      ).toBe(true);
    });
  });

  describe('LAMAvionicsRule', () => {
    it('should pass when LAM has Avionics in HD, LT, RT', () => {
      const context = createContext({
        configuration: 'LAM',
        criticalSlots: {
          [MechLocation.HEAD]: ['Life Support', 'Sensors', 'Cockpit', 'Avionics'],
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
        LAMAvionicsRule.canValidate?.(createContext({ configuration: 'Biped' }))
      ).toBe(false);
      expect(
        LAMAvionicsRule.canValidate?.(createContext({ configuration: 'LAM' }))
      ).toBe(true);
    });
  });

  describe('getConfigurationValidationRules', () => {
    it('should return all configuration validation rules', () => {
      const rules = getConfigurationValidationRules();
      expect(rules.length).toBeGreaterThanOrEqual(11);
      expect(rules.map((r) => r.id)).toContain('configuration.quad.no_arms');
      expect(rules.map((r) => r.id)).toContain('configuration.quad.leg_count');
      expect(rules.map((r) => r.id)).toContain('configuration.valid_locations');
      // LAM rules
      expect(rules.map((r) => r.id)).toContain('configuration.lam.max_tonnage');
      expect(rules.map((r) => r.id)).toContain('configuration.lam.engine_type');
      expect(rules.map((r) => r.id)).toContain('configuration.lam.structure_armor');
      expect(rules.map((r) => r.id)).toContain('configuration.lam.landing_gear');
      expect(rules.map((r) => r.id)).toContain('configuration.lam.avionics');
    });
  });
});
