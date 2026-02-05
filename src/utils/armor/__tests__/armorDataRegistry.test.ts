/**
 * @file armorDataRegistry.test.ts
 * @description Tests for armor data registry utility functions and constants
 */

import { MechConfigType } from '@/components/customizer/armor/shared/layout/useResolvedLayout';
import { MechLocation } from '@/types/construction';

import {
  ARMOR_DATA_REGISTRY,
  getSampleArmorData,
  SAMPLE_BIPED_ARMOR_DATA,
  SAMPLE_QUAD_ARMOR_DATA,
  SAMPLE_TRIPOD_ARMOR_DATA,
  SAMPLE_LAM_ARMOR_DATA,
  SAMPLE_QUADVEE_ARMOR_DATA,
} from '../armorDataRegistry';

describe('armorDataRegistry', () => {
  describe('ARMOR_DATA_REGISTRY', () => {
    it('contains entry for biped configuration', () => {
      expect(ARMOR_DATA_REGISTRY).toHaveProperty('biped');
      expect(Array.isArray(ARMOR_DATA_REGISTRY.biped)).toBe(true);
    });

    it('contains entry for quad configuration', () => {
      expect(ARMOR_DATA_REGISTRY).toHaveProperty('quad');
      expect(Array.isArray(ARMOR_DATA_REGISTRY.quad)).toBe(true);
    });

    it('contains entry for tripod configuration', () => {
      expect(ARMOR_DATA_REGISTRY).toHaveProperty('tripod');
      expect(Array.isArray(ARMOR_DATA_REGISTRY.tripod)).toBe(true);
    });

    it('contains entry for lam configuration', () => {
      expect(ARMOR_DATA_REGISTRY).toHaveProperty('lam');
      expect(Array.isArray(ARMOR_DATA_REGISTRY.lam)).toBe(true);
    });

    it('contains entry for quadvee configuration', () => {
      expect(ARMOR_DATA_REGISTRY).toHaveProperty('quadvee');
      expect(Array.isArray(ARMOR_DATA_REGISTRY.quadvee)).toBe(true);
    });

    it('contains all five MechConfigType values', () => {
      const configTypes: MechConfigType[] = [
        'biped',
        'quad',
        'tripod',
        'lam',
        'quadvee',
      ];
      configTypes.forEach((configType) => {
        expect(ARMOR_DATA_REGISTRY).toHaveProperty(configType);
      });
    });

    it('maps to the correct sample data arrays', () => {
      expect(ARMOR_DATA_REGISTRY.biped).toBe(SAMPLE_BIPED_ARMOR_DATA);
      expect(ARMOR_DATA_REGISTRY.quad).toBe(SAMPLE_QUAD_ARMOR_DATA);
      expect(ARMOR_DATA_REGISTRY.tripod).toBe(SAMPLE_TRIPOD_ARMOR_DATA);
      expect(ARMOR_DATA_REGISTRY.lam).toBe(SAMPLE_LAM_ARMOR_DATA);
      expect(ARMOR_DATA_REGISTRY.quadvee).toBe(SAMPLE_QUADVEE_ARMOR_DATA);
    });
  });

  describe('getSampleArmorData', () => {
    it('returns biped armor data for "biped" config type', () => {
      const result = getSampleArmorData('biped');
      expect(result).toBe(SAMPLE_BIPED_ARMOR_DATA);
    });

    it('returns quad armor data for "quad" config type', () => {
      const result = getSampleArmorData('quad');
      expect(result).toBe(SAMPLE_QUAD_ARMOR_DATA);
    });

    it('returns tripod armor data for "tripod" config type', () => {
      const result = getSampleArmorData('tripod');
      expect(result).toBe(SAMPLE_TRIPOD_ARMOR_DATA);
    });

    it('returns lam armor data for "lam" config type', () => {
      const result = getSampleArmorData('lam');
      expect(result).toBe(SAMPLE_LAM_ARMOR_DATA);
    });

    it('returns quadvee armor data for "quadvee" config type', () => {
      const result = getSampleArmorData('quadvee');
      expect(result).toBe(SAMPLE_QUADVEE_ARMOR_DATA);
    });

    it('returns biped data as fallback for unknown config type', () => {
      // Cast to bypass TypeScript type checking for testing fallback behavior
      const unknownConfig = 'unknown_type' as MechConfigType;
      const result = getSampleArmorData(unknownConfig);
      expect(result).toBe(SAMPLE_BIPED_ARMOR_DATA);
    });

    it('returns an array for all valid config types', () => {
      const configTypes: MechConfigType[] = [
        'biped',
        'quad',
        'tripod',
        'lam',
        'quadvee',
      ];
      configTypes.forEach((configType) => {
        const result = getSampleArmorData(configType);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SAMPLE_BIPED_ARMOR_DATA', () => {
    it('has 8 locations for biped configuration', () => {
      expect(SAMPLE_BIPED_ARMOR_DATA).toHaveLength(8);
    });

    it('includes HEAD location', () => {
      const head = SAMPLE_BIPED_ARMOR_DATA.find(
        (d) => d.location === MechLocation.HEAD,
      );
      expect(head).toBeDefined();
    });

    it('includes CENTER_TORSO location with rear armor', () => {
      const ct = SAMPLE_BIPED_ARMOR_DATA.find(
        (d) => d.location === MechLocation.CENTER_TORSO,
      );
      expect(ct).toBeDefined();
      expect(ct?.rear).toBeDefined();
      expect(ct?.rearMaximum).toBeDefined();
    });

    it('includes all torso locations with rear armor', () => {
      const torsoLocations = [
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
      ];
      torsoLocations.forEach((loc) => {
        const data = SAMPLE_BIPED_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeDefined();
        expect(data?.rear).toBeDefined();
        expect(data?.rearMaximum).toBeDefined();
      });
    });

    it('includes arm and leg locations without rear armor', () => {
      const limbLocations = [
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
      limbLocations.forEach((loc) => {
        const data = SAMPLE_BIPED_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeDefined();
        expect(data?.rear).toBeUndefined();
      });
    });

    it('has valid armor values (current <= maximum)', () => {
      SAMPLE_BIPED_ARMOR_DATA.forEach((data) => {
        expect(data.current).toBeLessThanOrEqual(data.maximum);
        if (data.rear !== undefined && data.rearMaximum !== undefined) {
          expect(data.rear).toBeLessThanOrEqual(data.rearMaximum);
        }
      });
    });
  });

  describe('SAMPLE_QUAD_ARMOR_DATA', () => {
    it('has 8 locations for quad configuration', () => {
      expect(SAMPLE_QUAD_ARMOR_DATA).toHaveLength(8);
    });

    it('includes quad-specific leg locations', () => {
      const quadLegLocations = [
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
      quadLegLocations.forEach((loc) => {
        const data = SAMPLE_QUAD_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeDefined();
      });
    });

    it('does not include biped arm locations', () => {
      const bipedArmLocations = [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM];
      bipedArmLocations.forEach((loc) => {
        const data = SAMPLE_QUAD_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeUndefined();
      });
    });

    it('has valid armor structure for all entries', () => {
      SAMPLE_QUAD_ARMOR_DATA.forEach((data) => {
        expect(data).toHaveProperty('location');
        expect(data).toHaveProperty('current');
        expect(data).toHaveProperty('maximum');
        expect(typeof data.current).toBe('number');
        expect(typeof data.maximum).toBe('number');
      });
    });
  });

  describe('SAMPLE_TRIPOD_ARMOR_DATA', () => {
    it('has 9 locations for tripod configuration', () => {
      expect(SAMPLE_TRIPOD_ARMOR_DATA).toHaveLength(9);
    });

    it('includes CENTER_LEG location', () => {
      const centerLeg = SAMPLE_TRIPOD_ARMOR_DATA.find(
        (d) => d.location === MechLocation.CENTER_LEG,
      );
      expect(centerLeg).toBeDefined();
    });

    it('includes standard biped-style arm locations', () => {
      const armLocations = [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM];
      armLocations.forEach((loc) => {
        const data = SAMPLE_TRIPOD_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeDefined();
      });
    });

    it('includes three leg locations (left, right, center)', () => {
      const legLocations = [
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
      legLocations.forEach((loc) => {
        const data = SAMPLE_TRIPOD_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeDefined();
      });
    });
  });

  describe('SAMPLE_LAM_ARMOR_DATA', () => {
    it('has 8 locations for LAM configuration', () => {
      expect(SAMPLE_LAM_ARMOR_DATA).toHaveLength(8);
    });

    it('has same location structure as biped', () => {
      const bipedLocations = SAMPLE_BIPED_ARMOR_DATA.map((d) => d.location);
      const lamLocations = SAMPLE_LAM_ARMOR_DATA.map((d) => d.location);
      expect(lamLocations.sort()).toEqual(bipedLocations.sort());
    });

    it('includes torso locations with rear armor', () => {
      const torsoLocations = [
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
      ];
      torsoLocations.forEach((loc) => {
        const data = SAMPLE_LAM_ARMOR_DATA.find((d) => d.location === loc);
        expect(data?.rear).toBeDefined();
        expect(data?.rearMaximum).toBeDefined();
      });
    });
  });

  describe('SAMPLE_QUADVEE_ARMOR_DATA', () => {
    it('has 8 locations for QuadVee configuration', () => {
      expect(SAMPLE_QUADVEE_ARMOR_DATA).toHaveLength(8);
    });

    it('has same location structure as quad', () => {
      const quadLocations = SAMPLE_QUAD_ARMOR_DATA.map((d) => d.location);
      const quadveeLocations = SAMPLE_QUADVEE_ARMOR_DATA.map((d) => d.location);
      expect(quadveeLocations.sort()).toEqual(quadLocations.sort());
    });

    it('includes quad-style leg locations', () => {
      const quadLegLocations = [
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
      quadLegLocations.forEach((loc) => {
        const data = SAMPLE_QUADVEE_ARMOR_DATA.find((d) => d.location === loc);
        expect(data).toBeDefined();
      });
    });
  });

  describe('sample data structure validation', () => {
    const allSampleData = [
      { name: 'biped', data: SAMPLE_BIPED_ARMOR_DATA },
      { name: 'quad', data: SAMPLE_QUAD_ARMOR_DATA },
      { name: 'tripod', data: SAMPLE_TRIPOD_ARMOR_DATA },
      { name: 'lam', data: SAMPLE_LAM_ARMOR_DATA },
      { name: 'quadvee', data: SAMPLE_QUADVEE_ARMOR_DATA },
    ];

    allSampleData.forEach(({ name, data }) => {
      describe(`${name} sample data`, () => {
        it('has valid LocationArmorData structure for each entry', () => {
          data.forEach((entry) => {
            expect(entry).toHaveProperty('location');
            expect(entry).toHaveProperty('current');
            expect(entry).toHaveProperty('maximum');
            expect(typeof entry.location).toBe('string');
            expect(typeof entry.current).toBe('number');
            expect(typeof entry.maximum).toBe('number');
          });
        });

        it('has positive armor values', () => {
          data.forEach((entry) => {
            expect(entry.current).toBeGreaterThanOrEqual(0);
            expect(entry.maximum).toBeGreaterThan(0);
            if (entry.rear !== undefined) {
              expect(entry.rear).toBeGreaterThanOrEqual(0);
            }
            if (entry.rearMaximum !== undefined) {
              expect(entry.rearMaximum).toBeGreaterThan(0);
            }
          });
        });

        it('has no duplicate locations', () => {
          const locations = data.map((d) => d.location);
          const uniqueLocations = new Set(locations);
          expect(uniqueLocations.size).toBe(locations.length);
        });
      });
    });
  });
});
