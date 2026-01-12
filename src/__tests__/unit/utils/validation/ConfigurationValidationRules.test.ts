/**
 * ConfigurationValidationRules Unit Tests
 *
 * Tests for configuration-specific validation rules including:
 * - Quad mech validation (no arms, correct legs)
 * - Biped mech validation (no quad legs)
 * - Location validity checks
 */

import {
  QuadNoArmsRule,
  QuadLegCountRule,
  QuadTotalSlotsRule,
  QuadLegArmorBalanceRule,
  BipedNoQuadLegsRule,
  ValidLocationsRule,
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

  describe('getConfigurationValidationRules', () => {
    it('should return all configuration validation rules', () => {
      const rules = getConfigurationValidationRules();
      expect(rules.length).toBeGreaterThanOrEqual(6);
      expect(rules.map((r) => r.id)).toContain('configuration.quad.no_arms');
      expect(rules.map((r) => r.id)).toContain('configuration.quad.leg_count');
      expect(rules.map((r) => r.id)).toContain('configuration.valid_locations');
    });
  });
});
