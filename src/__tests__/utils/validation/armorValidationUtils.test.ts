/**
 * Tests for Armor Validation Utilities
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  buildArmorByLocation,
  getExpectedTorsoArmorMax,
  createArmorLocationEntry,
  FRONT_ARMOR_RATIO,
  REAR_ARMOR_RATIO,
  IArmorAllocationInput,
} from '@/utils/validation/armorValidationUtils';

/**
 * Create empty armor allocation (all zeros)
 */
function createEmptyArmorAllocation(): IArmorAllocationInput {
  return {
    [MechLocation.HEAD]: 0,
    [MechLocation.CENTER_TORSO]: 0,
    centerTorsoRear: 0,
    [MechLocation.LEFT_TORSO]: 0,
    leftTorsoRear: 0,
    [MechLocation.RIGHT_TORSO]: 0,
    rightTorsoRear: 0,
    [MechLocation.LEFT_ARM]: 0,
    [MechLocation.RIGHT_ARM]: 0,
    [MechLocation.LEFT_LEG]: 0,
    [MechLocation.RIGHT_LEG]: 0,
    [MechLocation.CENTER_LEG]: 0,
    [MechLocation.FRONT_LEFT_LEG]: 0,
    [MechLocation.FRONT_RIGHT_LEG]: 0,
    [MechLocation.REAR_LEFT_LEG]: 0,
    [MechLocation.REAR_RIGHT_LEG]: 0,
  };
}

describe('Armor Validation Utilities', () => {
  describe('Constants', () => {
    it('should have correct front/rear armor ratios', () => {
      expect(FRONT_ARMOR_RATIO).toBe(0.75);
      expect(REAR_ARMOR_RATIO).toBe(0.25);
      expect(FRONT_ARMOR_RATIO + REAR_ARMOR_RATIO).toBe(1);
    });
  });

  describe('buildArmorByLocation', () => {
    const emptyAllocation = createEmptyArmorAllocation();

    describe('Biped configuration', () => {
      it('should build armor data for all biped locations', () => {
        const allocation: IArmorAllocationInput = {
          ...emptyAllocation,
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 30,
          centerTorsoRear: 10,
          [MechLocation.LEFT_TORSO]: 20,
          leftTorsoRear: 7,
          [MechLocation.RIGHT_TORSO]: 20,
          rightTorsoRear: 7,
          [MechLocation.LEFT_ARM]: 16,
          [MechLocation.RIGHT_ARM]: 16,
          [MechLocation.LEFT_LEG]: 20,
          [MechLocation.RIGHT_LEG]: 20,
        };

        const result = buildArmorByLocation(
          allocation,
          50,
          MechConfiguration.BIPED,
        );

        // Check that all biped locations are present
        expect(result.head).toBeDefined();
        expect(result.centerTorso).toBeDefined();
        expect(result.centerTorsoRear).toBeDefined();
        expect(result.leftTorso).toBeDefined();
        expect(result.leftTorsoRear).toBeDefined();
        expect(result.rightTorso).toBeDefined();
        expect(result.rightTorsoRear).toBeDefined();
        expect(result.leftArm).toBeDefined();
        expect(result.rightArm).toBeDefined();
        expect(result.leftLeg).toBeDefined();
        expect(result.rightLeg).toBeDefined();

        // Quad locations should NOT be present
        expect(result.frontLeftLeg).toBeUndefined();
        expect(result.frontRightLeg).toBeUndefined();
        expect(result.rearLeftLeg).toBeUndefined();
        expect(result.rearRightLeg).toBeUndefined();
        expect(result.centerLeg).toBeUndefined();
      });

      it('should correctly set current armor values', () => {
        const allocation: IArmorAllocationInput = {
          ...emptyAllocation,
          [MechLocation.HEAD]: 7,
          [MechLocation.CENTER_TORSO]: 25,
          centerTorsoRear: 8,
        };

        const result = buildArmorByLocation(
          allocation,
          50,
          MechConfiguration.BIPED,
        );

        expect(result.head.current).toBe(7);
        expect(result.centerTorso.current).toBe(25);
        expect(result.centerTorsoRear.current).toBe(8);
      });

      it('should use 75/25 split for torso max values', () => {
        const result = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.BIPED,
        );

        // For a 50-ton mech, CT max is 32 (IS = 16, max armor = 32)
        // Front expected max = 32 * 0.75 = 24
        // Rear expected max = 32 * 0.25 = 8
        expect(result.centerTorso.max).toBe(Math.round(32 * 0.75));
        expect(result.centerTorsoRear.max).toBe(Math.round(32 * 0.25));
      });

      it('should set head max to 9', () => {
        const result = buildArmorByLocation(
          emptyAllocation,
          100,
          MechConfiguration.BIPED,
        );
        expect(result.head.max).toBe(9);
      });

      it('should include display names', () => {
        const result = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.BIPED,
        );

        expect(result.head.displayName).toBe('Head');
        expect(result.centerTorso.displayName).toBe('Center Torso');
        expect(result.centerTorsoRear.displayName).toBe('Center Torso (Rear)');
        expect(result.leftArm.displayName).toBe('Left Arm');
        expect(result.rightArm.displayName).toBe('Right Arm');
        expect(result.leftLeg.displayName).toBe('Left Leg');
        expect(result.rightLeg.displayName).toBe('Right Leg');
      });
    });

    describe('Quad configuration', () => {
      it('should build armor data for all quad locations', () => {
        const result = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.QUAD,
        );

        // Check that quad leg locations are present
        expect(result.frontLeftLeg).toBeDefined();
        expect(result.frontRightLeg).toBeDefined();
        expect(result.rearLeftLeg).toBeDefined();
        expect(result.rearRightLeg).toBeDefined();

        // Biped arm locations should NOT be present
        expect(result.leftArm).toBeUndefined();
        expect(result.rightArm).toBeUndefined();

        // Torso locations should still be present
        expect(result.head).toBeDefined();
        expect(result.centerTorso).toBeDefined();
        expect(result.leftTorso).toBeDefined();
        expect(result.rightTorso).toBeDefined();
      });

      it('should correctly set quad leg armor values', () => {
        const allocation: IArmorAllocationInput = {
          ...emptyAllocation,
          [MechLocation.FRONT_LEFT_LEG]: 15,
          [MechLocation.FRONT_RIGHT_LEG]: 16,
          [MechLocation.REAR_LEFT_LEG]: 12,
          [MechLocation.REAR_RIGHT_LEG]: 13,
        };

        const result = buildArmorByLocation(
          allocation,
          50,
          MechConfiguration.QUAD,
        );

        expect(result.frontLeftLeg.current).toBe(15);
        expect(result.frontRightLeg.current).toBe(16);
        expect(result.rearLeftLeg.current).toBe(12);
        expect(result.rearRightLeg.current).toBe(13);
      });
    });

    describe('QuadVee configuration', () => {
      it('should use same locations as Quad', () => {
        const quadResult = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.QUAD,
        );
        const quadveeResult = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.QUADVEE,
        );

        expect(Object.keys(quadResult).sort()).toEqual(
          Object.keys(quadveeResult).sort(),
        );
      });
    });

    describe('Tripod configuration', () => {
      it('should build armor data with center leg', () => {
        const result = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.TRIPOD,
        );

        // Should have arms
        expect(result.leftArm).toBeDefined();
        expect(result.rightArm).toBeDefined();

        // Should have 3 legs including center
        expect(result.leftLeg).toBeDefined();
        expect(result.rightLeg).toBeDefined();
        expect(result.centerLeg).toBeDefined();
      });

      it('should correctly set center leg armor', () => {
        const allocation: IArmorAllocationInput = {
          ...emptyAllocation,
          [MechLocation.CENTER_LEG]: 18,
        };

        const result = buildArmorByLocation(
          allocation,
          50,
          MechConfiguration.TRIPOD,
        );

        expect(result.centerLeg.current).toBe(18);
        expect(result.centerLeg.displayName).toBe('Center Leg');
      });
    });

    describe('Default/undefined configuration', () => {
      it('should use biped locations when configuration is undefined', () => {
        const result = buildArmorByLocation(emptyAllocation, 50, undefined);

        expect(result.leftArm).toBeDefined();
        expect(result.rightArm).toBeDefined();
        expect(result.leftLeg).toBeDefined();
        expect(result.rightLeg).toBeDefined();
        expect(result.frontLeftLeg).toBeUndefined();
        expect(result.centerLeg).toBeUndefined();
      });
    });

    describe('Edge cases', () => {
      it('should handle zero armor allocation', () => {
        const result = buildArmorByLocation(
          emptyAllocation,
          50,
          MechConfiguration.BIPED,
        );

        Object.values(result).forEach((entry) => {
          expect(entry.current).toBe(0);
          expect(entry.max).toBeGreaterThan(0);
        });
      });

      it('should handle different tonnages', () => {
        const result20 = buildArmorByLocation(
          emptyAllocation,
          20,
          MechConfiguration.BIPED,
        );
        const result100 = buildArmorByLocation(
          emptyAllocation,
          100,
          MechConfiguration.BIPED,
        );

        // Heavier mechs should have higher armor capacity (except head)
        expect(result100.centerTorso.max).toBeGreaterThan(
          result20.centerTorso.max,
        );
        expect(result100.leftArm.max).toBeGreaterThan(result20.leftArm.max);

        // Head is always max 9
        expect(result20.head.max).toBe(9);
        expect(result100.head.max).toBe(9);
      });
    });
  });

  describe('getExpectedTorsoArmorMax', () => {
    it('should return 75% for front armor', () => {
      // For 50-ton mech, CT max is 32
      const front = getExpectedTorsoArmorMax(50, 'centerTorso', true);
      expect(front).toBe(Math.round(32 * 0.75));
    });

    it('should return 25% for rear armor', () => {
      // For 50-ton mech, CT max is 32
      const rear = getExpectedTorsoArmorMax(50, 'centerTorso', false);
      expect(rear).toBe(Math.round(32 * 0.25));
    });

    it('should work for side torsos', () => {
      const ltFront = getExpectedTorsoArmorMax(50, 'leftTorso', true);
      const ltRear = getExpectedTorsoArmorMax(50, 'leftTorso', false);

      expect(ltFront).toBeGreaterThan(ltRear);
      expect(ltFront + ltRear).toBeLessThanOrEqual(32); // Max for side torso
    });
  });

  describe('createArmorLocationEntry', () => {
    it('should create a valid armor location entry', () => {
      const entry = createArmorLocationEntry(15, 24, 'Center Torso');

      expect(entry.current).toBe(15);
      expect(entry.max).toBe(24);
      expect(entry.displayName).toBe('Center Torso');
    });

    it('should handle edge values', () => {
      const entry = createArmorLocationEntry(0, 0, 'Empty');
      expect(entry.current).toBe(0);
      expect(entry.max).toBe(0);
    });
  });
});
