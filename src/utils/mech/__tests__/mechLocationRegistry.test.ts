/**
 * @file mechLocationRegistry.test.ts
 * @description Tests for mech location registry utility functions and constants
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  BIPED_LOCATIONS,
  QUAD_LOCATIONS,
  TRIPOD_LOCATIONS,
  LAM_LOCATIONS,
  QUADVEE_LOCATIONS,
  MECH_LOCATIONS_BY_CONFIG,
  getLocationsForConfiguration,
  getLocationsForConfigurationString,
  getLocationsForMechType,
} from '../mechLocationRegistry';

describe('mechLocationRegistry', () => {
  describe('BIPED_LOCATIONS', () => {
    it('contains 8 locations', () => {
      expect(BIPED_LOCATIONS).toHaveLength(8);
    });

    it('includes HEAD location', () => {
      expect(BIPED_LOCATIONS).toContain(MechLocation.HEAD);
    });

    it('includes all torso locations', () => {
      expect(BIPED_LOCATIONS).toContain(MechLocation.CENTER_TORSO);
      expect(BIPED_LOCATIONS).toContain(MechLocation.LEFT_TORSO);
      expect(BIPED_LOCATIONS).toContain(MechLocation.RIGHT_TORSO);
    });

    it('includes arm locations', () => {
      expect(BIPED_LOCATIONS).toContain(MechLocation.LEFT_ARM);
      expect(BIPED_LOCATIONS).toContain(MechLocation.RIGHT_ARM);
    });

    it('includes biped leg locations', () => {
      expect(BIPED_LOCATIONS).toContain(MechLocation.LEFT_LEG);
      expect(BIPED_LOCATIONS).toContain(MechLocation.RIGHT_LEG);
    });

    it('does not include quad leg locations', () => {
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.FRONT_LEFT_LEG);
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.REAR_LEFT_LEG);
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.REAR_RIGHT_LEG);
    });

    it('does not include CENTER_LEG', () => {
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.CENTER_LEG);
    });
  });

  describe('QUAD_LOCATIONS', () => {
    it('contains 8 locations', () => {
      expect(QUAD_LOCATIONS).toHaveLength(8);
    });

    it('includes HEAD location', () => {
      expect(QUAD_LOCATIONS).toContain(MechLocation.HEAD);
    });

    it('includes all torso locations', () => {
      expect(QUAD_LOCATIONS).toContain(MechLocation.CENTER_TORSO);
      expect(QUAD_LOCATIONS).toContain(MechLocation.LEFT_TORSO);
      expect(QUAD_LOCATIONS).toContain(MechLocation.RIGHT_TORSO);
    });

    it('includes quad-specific leg locations', () => {
      expect(QUAD_LOCATIONS).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(QUAD_LOCATIONS).toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(QUAD_LOCATIONS).toContain(MechLocation.REAR_LEFT_LEG);
      expect(QUAD_LOCATIONS).toContain(MechLocation.REAR_RIGHT_LEG);
    });

    it('does not include arm locations', () => {
      expect(QUAD_LOCATIONS).not.toContain(MechLocation.LEFT_ARM);
      expect(QUAD_LOCATIONS).not.toContain(MechLocation.RIGHT_ARM);
    });

    it('does not include biped leg locations', () => {
      expect(QUAD_LOCATIONS).not.toContain(MechLocation.LEFT_LEG);
      expect(QUAD_LOCATIONS).not.toContain(MechLocation.RIGHT_LEG);
    });
  });

  describe('TRIPOD_LOCATIONS', () => {
    it('contains 9 locations', () => {
      expect(TRIPOD_LOCATIONS).toHaveLength(9);
    });

    it('includes HEAD location', () => {
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.HEAD);
    });

    it('includes all torso locations', () => {
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.CENTER_TORSO);
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.LEFT_TORSO);
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.RIGHT_TORSO);
    });

    it('includes arm locations', () => {
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.LEFT_ARM);
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.RIGHT_ARM);
    });

    it('includes three leg locations including CENTER_LEG', () => {
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.LEFT_LEG);
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.RIGHT_LEG);
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.CENTER_LEG);
    });
  });

  describe('LAM_LOCATIONS', () => {
    it('contains 8 locations', () => {
      expect(LAM_LOCATIONS).toHaveLength(8);
    });

    it('has same locations as BIPED_LOCATIONS', () => {
      expect(LAM_LOCATIONS.sort()).toEqual(BIPED_LOCATIONS.sort());
    });

    it('includes HEAD location', () => {
      expect(LAM_LOCATIONS).toContain(MechLocation.HEAD);
    });

    it('includes arm locations', () => {
      expect(LAM_LOCATIONS).toContain(MechLocation.LEFT_ARM);
      expect(LAM_LOCATIONS).toContain(MechLocation.RIGHT_ARM);
    });

    it('includes biped leg locations', () => {
      expect(LAM_LOCATIONS).toContain(MechLocation.LEFT_LEG);
      expect(LAM_LOCATIONS).toContain(MechLocation.RIGHT_LEG);
    });
  });

  describe('QUADVEE_LOCATIONS', () => {
    it('is the same reference as QUAD_LOCATIONS', () => {
      expect(QUADVEE_LOCATIONS).toBe(QUAD_LOCATIONS);
    });

    it('contains 8 locations', () => {
      expect(QUADVEE_LOCATIONS).toHaveLength(8);
    });

    it('includes quad-specific leg locations', () => {
      expect(QUADVEE_LOCATIONS).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(QUADVEE_LOCATIONS).toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(QUADVEE_LOCATIONS).toContain(MechLocation.REAR_LEFT_LEG);
      expect(QUADVEE_LOCATIONS).toContain(MechLocation.REAR_RIGHT_LEG);
    });
  });

  describe('MECH_LOCATIONS_BY_CONFIG', () => {
    it('contains entry for BIPED configuration', () => {
      expect(MECH_LOCATIONS_BY_CONFIG).toHaveProperty(MechConfiguration.BIPED);
      expect(MECH_LOCATIONS_BY_CONFIG[MechConfiguration.BIPED]).toBe(
        BIPED_LOCATIONS,
      );
    });

    it('contains entry for QUAD configuration', () => {
      expect(MECH_LOCATIONS_BY_CONFIG).toHaveProperty(MechConfiguration.QUAD);
      expect(MECH_LOCATIONS_BY_CONFIG[MechConfiguration.QUAD]).toBe(
        QUAD_LOCATIONS,
      );
    });

    it('contains entry for TRIPOD configuration', () => {
      expect(MECH_LOCATIONS_BY_CONFIG).toHaveProperty(MechConfiguration.TRIPOD);
      expect(MECH_LOCATIONS_BY_CONFIG[MechConfiguration.TRIPOD]).toBe(
        TRIPOD_LOCATIONS,
      );
    });

    it('contains entry for LAM configuration', () => {
      expect(MECH_LOCATIONS_BY_CONFIG).toHaveProperty(MechConfiguration.LAM);
      expect(MECH_LOCATIONS_BY_CONFIG[MechConfiguration.LAM]).toBe(
        LAM_LOCATIONS,
      );
    });

    it('contains entry for QUADVEE configuration', () => {
      expect(MECH_LOCATIONS_BY_CONFIG).toHaveProperty(
        MechConfiguration.QUADVEE,
      );
      expect(MECH_LOCATIONS_BY_CONFIG[MechConfiguration.QUADVEE]).toBe(
        QUADVEE_LOCATIONS,
      );
    });

    it('contains all five MechConfiguration enum values', () => {
      const configs = [
        MechConfiguration.BIPED,
        MechConfiguration.QUAD,
        MechConfiguration.TRIPOD,
        MechConfiguration.LAM,
        MechConfiguration.QUADVEE,
      ];
      configs.forEach((config) => {
        expect(MECH_LOCATIONS_BY_CONFIG).toHaveProperty(config);
      });
    });
  });

  describe('getLocationsForConfiguration', () => {
    it('returns BIPED_LOCATIONS for BIPED configuration', () => {
      const result = getLocationsForConfiguration(MechConfiguration.BIPED);
      expect(result).toBe(BIPED_LOCATIONS);
    });

    it('returns QUAD_LOCATIONS for QUAD configuration', () => {
      const result = getLocationsForConfiguration(MechConfiguration.QUAD);
      expect(result).toBe(QUAD_LOCATIONS);
    });

    it('returns TRIPOD_LOCATIONS for TRIPOD configuration', () => {
      const result = getLocationsForConfiguration(MechConfiguration.TRIPOD);
      expect(result).toBe(TRIPOD_LOCATIONS);
    });

    it('returns LAM_LOCATIONS for LAM configuration', () => {
      const result = getLocationsForConfiguration(MechConfiguration.LAM);
      expect(result).toBe(LAM_LOCATIONS);
    });

    it('returns QUADVEE_LOCATIONS for QUADVEE configuration', () => {
      const result = getLocationsForConfiguration(MechConfiguration.QUADVEE);
      expect(result).toBe(QUADVEE_LOCATIONS);
    });

    it('returns BIPED_LOCATIONS as fallback for unknown configuration', () => {
      const unknownConfig = 'UnknownConfig' as MechConfiguration;
      const result = getLocationsForConfiguration(unknownConfig);
      expect(result).toBe(BIPED_LOCATIONS);
    });

    it('returns an array for all valid configurations', () => {
      Object.values(MechConfiguration).forEach((config) => {
        const result = getLocationsForConfiguration(config);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getLocationsForConfigurationString', () => {
    describe('case variations', () => {
      it('handles "Biped" (Title case)', () => {
        const result = getLocationsForConfigurationString('Biped');
        expect(result).toBe(BIPED_LOCATIONS);
      });

      it('handles "biped" (lowercase)', () => {
        const result = getLocationsForConfigurationString('biped');
        expect(result).toBe(BIPED_LOCATIONS);
      });

      it('handles "BIPED" (uppercase)', () => {
        const result = getLocationsForConfigurationString('BIPED');
        expect(result).toBe(BIPED_LOCATIONS);
      });

      it('handles "Quad" (Title case)', () => {
        const result = getLocationsForConfigurationString('Quad');
        expect(result).toBe(QUAD_LOCATIONS);
      });

      it('handles "quad" (lowercase)', () => {
        const result = getLocationsForConfigurationString('quad');
        expect(result).toBe(QUAD_LOCATIONS);
      });

      it('handles "QUAD" (uppercase)', () => {
        const result = getLocationsForConfigurationString('QUAD');
        expect(result).toBe(QUAD_LOCATIONS);
      });

      it('handles "Tripod" (Title case)', () => {
        const result = getLocationsForConfigurationString('Tripod');
        expect(result).toBe(TRIPOD_LOCATIONS);
      });

      it('handles "tripod" (lowercase)', () => {
        const result = getLocationsForConfigurationString('tripod');
        expect(result).toBe(TRIPOD_LOCATIONS);
      });

      it('handles "TRIPOD" (uppercase)', () => {
        const result = getLocationsForConfigurationString('TRIPOD');
        expect(result).toBe(TRIPOD_LOCATIONS);
      });

      it('handles "Lam" (Title case)', () => {
        const result = getLocationsForConfigurationString('Lam');
        expect(result).toBe(LAM_LOCATIONS);
      });

      it('handles "lam" (lowercase)', () => {
        const result = getLocationsForConfigurationString('lam');
        expect(result).toBe(LAM_LOCATIONS);
      });

      it('handles "LAM" (uppercase)', () => {
        const result = getLocationsForConfigurationString('LAM');
        expect(result).toBe(LAM_LOCATIONS);
      });

      it('handles "Quadvee" (Title case)', () => {
        const result = getLocationsForConfigurationString('Quadvee');
        expect(result).toBe(QUADVEE_LOCATIONS);
      });

      it('handles "quadvee" (lowercase)', () => {
        const result = getLocationsForConfigurationString('quadvee');
        expect(result).toBe(QUADVEE_LOCATIONS);
      });

      it('handles "QUADVEE" (uppercase)', () => {
        const result = getLocationsForConfigurationString('QUADVEE');
        expect(result).toBe(QUADVEE_LOCATIONS);
      });
    });

    it('returns BIPED_LOCATIONS as fallback for unknown string', () => {
      const result = getLocationsForConfigurationString('unknown');
      expect(result).toBe(BIPED_LOCATIONS);
    });

    it('returns BIPED_LOCATIONS for empty string', () => {
      const result = getLocationsForConfigurationString('');
      expect(result).toBe(BIPED_LOCATIONS);
    });
  });

  describe('getLocationsForMechType', () => {
    it('returns BIPED_LOCATIONS for "biped"', () => {
      const result = getLocationsForMechType('biped');
      expect(result).toBe(BIPED_LOCATIONS);
    });

    it('returns QUAD_LOCATIONS for "quad"', () => {
      const result = getLocationsForMechType('quad');
      expect(result).toBe(QUAD_LOCATIONS);
    });

    it('returns TRIPOD_LOCATIONS for "tripod"', () => {
      const result = getLocationsForMechType('tripod');
      expect(result).toBe(TRIPOD_LOCATIONS);
    });

    it('returns LAM_LOCATIONS for "lam"', () => {
      const result = getLocationsForMechType('lam');
      expect(result).toBe(LAM_LOCATIONS);
    });

    it('returns QUADVEE_LOCATIONS for "quadvee"', () => {
      const result = getLocationsForMechType('quadvee');
      expect(result).toBe(QUADVEE_LOCATIONS);
    });

    it('handles uppercase input by converting to lowercase', () => {
      expect(getLocationsForMechType('BIPED')).toBe(BIPED_LOCATIONS);
      expect(getLocationsForMechType('QUAD')).toBe(QUAD_LOCATIONS);
      expect(getLocationsForMechType('TRIPOD')).toBe(TRIPOD_LOCATIONS);
      expect(getLocationsForMechType('LAM')).toBe(LAM_LOCATIONS);
      expect(getLocationsForMechType('QUADVEE')).toBe(QUADVEE_LOCATIONS);
    });

    it('handles mixed case input', () => {
      expect(getLocationsForMechType('Biped')).toBe(BIPED_LOCATIONS);
      expect(getLocationsForMechType('QuadVee')).toBe(QUADVEE_LOCATIONS);
    });

    it('returns BIPED_LOCATIONS as fallback for unknown mech type', () => {
      const result = getLocationsForMechType('unknown');
      expect(result).toBe(BIPED_LOCATIONS);
    });

    it('returns BIPED_LOCATIONS for empty string', () => {
      const result = getLocationsForMechType('');
      expect(result).toBe(BIPED_LOCATIONS);
    });
  });

  describe('location arrays contain valid MechLocation values', () => {
    const allLocationArrays = [
      { name: 'BIPED_LOCATIONS', array: BIPED_LOCATIONS },
      { name: 'QUAD_LOCATIONS', array: QUAD_LOCATIONS },
      { name: 'TRIPOD_LOCATIONS', array: TRIPOD_LOCATIONS },
      { name: 'LAM_LOCATIONS', array: LAM_LOCATIONS },
      { name: 'QUADVEE_LOCATIONS', array: QUADVEE_LOCATIONS },
    ];

    allLocationArrays.forEach(({ name, array }) => {
      it(`${name} contains only valid MechLocation enum values`, () => {
        const validLocations = Object.values(MechLocation);
        array.forEach((location) => {
          expect(validLocations).toContain(location);
        });
      });

      it(`${name} has no duplicate locations`, () => {
        const uniqueLocations = new Set(array);
        expect(uniqueLocations.size).toBe(array.length);
      });
    });
  });
});
