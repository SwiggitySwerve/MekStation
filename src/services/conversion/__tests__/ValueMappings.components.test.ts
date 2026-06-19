/**
 * ValueMappings component and configuration mapping tests.
 */

import { CockpitType } from '@/types/construction/CockpitType';
import { GyroType } from '@/types/construction/GyroType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  mapGyroType,
  mapCockpitType,
  mapMechConfiguration,
} from '../ValueMappings';

describe('ValueMappings component mappings', () => {
  describe('mapGyroType', () => {
    it('should map standard gyro', () => {
      expect(mapGyroType('Standard')).toBe(GyroType.STANDARD);
      expect(mapGyroType('Standard Gyro')).toBe(GyroType.STANDARD);
    });

    it('should map other gyro types', () => {
      expect(mapGyroType('Compact')).toBe(GyroType.COMPACT);
      expect(mapGyroType('Heavy Duty')).toBe(GyroType.HEAVY_DUTY);
      expect(mapGyroType('Heavy-Duty')).toBe(GyroType.HEAVY_DUTY);
      expect(mapGyroType('XL')).toBe(GyroType.XL);
      expect(mapGyroType('Extra-Light')).toBe(GyroType.XL);
    });

    it('should use fuzzy matching', () => {
      expect(mapGyroType('some compact gyro')).toBe(GyroType.COMPACT);
      expect(mapGyroType('heavy duty type')).toBe(GyroType.HEAVY_DUTY);
    });

    it('should fuzzy match XL gyro', () => {
      expect(mapGyroType('some xl gyro')).toBe(GyroType.XL);
      expect(mapGyroType('extra-light gyro')).toBe(GyroType.XL);
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapGyroType('Unknown')).toBe(GyroType.STANDARD);
    });
  });

  describe('mapCockpitType', () => {
    it('should map standard cockpit', () => {
      expect(mapCockpitType('Standard')).toBe(CockpitType.STANDARD);
      expect(mapCockpitType('Standard Cockpit')).toBe(CockpitType.STANDARD);
    });

    it('should map other cockpit types', () => {
      expect(mapCockpitType('Small')).toBe(CockpitType.SMALL);
      expect(mapCockpitType('Command Console')).toBe(
        CockpitType.COMMAND_CONSOLE,
      );
      expect(mapCockpitType('Torso-Mounted')).toBe(CockpitType.TORSO_MOUNTED);
      expect(mapCockpitType('Industrial')).toBe(CockpitType.INDUSTRIAL);
      expect(mapCockpitType('Primitive')).toBe(CockpitType.PRIMITIVE);
      expect(mapCockpitType('Superheavy')).toBe(CockpitType.SUPER_HEAVY);
    });

    it('should use fuzzy matching', () => {
      expect(mapCockpitType('small cockpit')).toBe(CockpitType.SMALL);
      expect(mapCockpitType('torso mounted')).toBe(CockpitType.TORSO_MOUNTED);
    });

    it('should fuzzy match command console', () => {
      expect(mapCockpitType('command console type')).toBe(
        CockpitType.COMMAND_CONSOLE,
      );
    });

    it('should fuzzy match industrial cockpit', () => {
      expect(mapCockpitType('industrial cockpit type')).toBe(
        CockpitType.INDUSTRIAL,
      );
    });

    it('should fuzzy match primitive cockpit', () => {
      expect(mapCockpitType('primitive cockpit type')).toBe(
        CockpitType.PRIMITIVE,
      );
    });

    it('should fuzzy match superheavy cockpit', () => {
      expect(mapCockpitType('superheavy cockpit type')).toBe(
        CockpitType.SUPER_HEAVY,
      );
      expect(mapCockpitType('super-heavy cockpit')).toBe(
        CockpitType.SUPER_HEAVY,
      );
    });

    it('should default to STANDARD for unknown', () => {
      expect(mapCockpitType('Unknown')).toBe(CockpitType.STANDARD);
    });
  });

  describe('mapMechConfiguration', () => {
    it('should map biped configurations', () => {
      expect(mapMechConfiguration('Biped')).toBe(MechConfiguration.BIPED);
      expect(mapMechConfiguration('Biped Omnimech')).toBe(
        MechConfiguration.BIPED,
      );
    });

    it('should map quad configurations', () => {
      expect(mapMechConfiguration('Quad')).toBe(MechConfiguration.QUAD);
      expect(mapMechConfiguration('Quad Omnimech')).toBe(
        MechConfiguration.QUAD,
      );
    });

    it('should map other configurations', () => {
      expect(mapMechConfiguration('Tripod')).toBe(MechConfiguration.TRIPOD);
      expect(mapMechConfiguration('LAM')).toBe(MechConfiguration.LAM);
      expect(mapMechConfiguration('QuadVee')).toBe(MechConfiguration.QUADVEE);
    });

    it('should use fuzzy matching', () => {
      expect(mapMechConfiguration('quad mech')).toBe(MechConfiguration.QUAD);
      expect(mapMechConfiguration('tripod omni')).toBe(
        MechConfiguration.TRIPOD,
      );
      expect(mapMechConfiguration('quad vee type')).toBe(
        MechConfiguration.QUADVEE,
      );
    });

    it('should fuzzy match LAM configuration', () => {
      expect(mapMechConfiguration('some lam type')).toBe(MechConfiguration.LAM);
    });

    it('should default to BIPED for unknown', () => {
      expect(mapMechConfiguration('Unknown')).toBe(MechConfiguration.BIPED);
    });
  });
});
