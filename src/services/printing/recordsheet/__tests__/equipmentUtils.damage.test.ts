import { WeaponCategory } from '@/types/equipment';

import {
  getDamageCode,
  formatMissileDamage,
  lookupWeapon,
  isUnhittableEquipmentName,
} from '../equipmentUtils';
import { createMockWeapon } from './equipmentUtils.test-helpers';

describe('getDamageCode', () => {
  it('should return [DE] for ENERGY weapons', () => {
    expect(getDamageCode(WeaponCategory.ENERGY)).toBe('[DE]');
  });

  it('should return [DB] for BALLISTIC weapons', () => {
    expect(getDamageCode(WeaponCategory.BALLISTIC)).toBe('[DB]');
  });

  it('should return [M,C,S] for MISSILE weapons', () => {
    expect(getDamageCode(WeaponCategory.MISSILE)).toBe('[M,C,S]');
  });

  it('should return [AE] for ARTILLERY weapons', () => {
    expect(getDamageCode(WeaponCategory.ARTILLERY)).toBe('[AE]');
  });

  it('should return [P] for PHYSICAL weapons', () => {
    expect(getDamageCode(WeaponCategory.PHYSICAL)).toBe('[P]');
  });

  it('should return empty string for unknown category', () => {
    expect(getDamageCode('UNKNOWN' as WeaponCategory)).toBe('');
  });
});

describe('formatMissileDamage', () => {
  describe('LRM damage formatting', () => {
    it('should return 1/Msl for LRM-5', () => {
      expect(formatMissileDamage('LRM-5', 5)).toBe('1/Msl');
    });

    it('should return 1/Msl for LRM-10', () => {
      expect(formatMissileDamage('LRM-10', 10)).toBe('1/Msl');
    });

    it('should return 1/Msl for LRM-15', () => {
      expect(formatMissileDamage('LRM-15', 15)).toBe('1/Msl');
    });

    it('should return 1/Msl for LRM-20', () => {
      expect(formatMissileDamage('LRM-20', 20)).toBe('1/Msl');
    });

    it('should return 1/Msl for case-insensitive lrm', () => {
      expect(formatMissileDamage('lrm-5', 5)).toBe('1/Msl');
    });

    it('should return 1/Msl for Extended Range LRM', () => {
      expect(formatMissileDamage('ER LRM-5', 5)).toBe('1/Msl');
    });
  });

  describe('SRM damage formatting', () => {
    it('should return 2/Msl for SRM-2', () => {
      expect(formatMissileDamage('SRM-2', 4)).toBe('2/Msl');
    });

    it('should return 2/Msl for SRM-4', () => {
      expect(formatMissileDamage('SRM-4', 8)).toBe('2/Msl');
    });

    it('should return 2/Msl for SRM-6', () => {
      expect(formatMissileDamage('SRM-6', 12)).toBe('2/Msl');
    });

    it('should return 2/Msl for case-insensitive srm', () => {
      expect(formatMissileDamage('srm-4', 8)).toBe('2/Msl');
    });
  });

  describe('Streak SRM damage formatting', () => {
    it('should return 2/Msl for Streak SRM-2', () => {
      expect(formatMissileDamage('Streak SRM-2', 4)).toBe('2/Msl');
    });

    it('should return 2/Msl for Streak SRM-4', () => {
      expect(formatMissileDamage('Streak SRM-4', 8)).toBe('2/Msl');
    });

    it('should return 2/Msl for Streak SRM-6', () => {
      expect(formatMissileDamage('Streak SRM-6', 12)).toBe('2/Msl');
    });

    it('should handle lowercase streak srm', () => {
      expect(formatMissileDamage('streak srm-4', 8)).toBe('2/Msl');
    });
  });

  describe('MRM damage formatting', () => {
    it('should return 1/Msl for MRM-10', () => {
      expect(formatMissileDamage('MRM-10', 10)).toBe('1/Msl');
    });

    it('should return 1/Msl for MRM-20', () => {
      expect(formatMissileDamage('MRM-20', 20)).toBe('1/Msl');
    });

    it('should return 1/Msl for MRM-30', () => {
      expect(formatMissileDamage('MRM-30', 30)).toBe('1/Msl');
    });

    it('should return 1/Msl for MRM-40', () => {
      expect(formatMissileDamage('MRM-40', 40)).toBe('1/Msl');
    });

    it('should handle lowercase mrm', () => {
      expect(formatMissileDamage('mrm-20', 20)).toBe('1/Msl');
    });
  });

  describe('ATM damage formatting', () => {
    it('should return 2/Msl for ATM-3', () => {
      expect(formatMissileDamage('ATM-3', 6)).toBe('2/Msl');
    });

    it('should return 2/Msl for ATM-6', () => {
      expect(formatMissileDamage('ATM-6', 12)).toBe('2/Msl');
    });

    it('should return 2/Msl for ATM-9', () => {
      expect(formatMissileDamage('ATM-9', 18)).toBe('2/Msl');
    });

    it('should return 2/Msl for ATM-12', () => {
      expect(formatMissileDamage('ATM-12', 24)).toBe('2/Msl');
    });

    it('should handle lowercase atm', () => {
      expect(formatMissileDamage('atm-6', 12)).toBe('2/Msl');
    });
  });

  describe('Non-missile weapons', () => {
    it('should return base damage for Medium Laser', () => {
      expect(formatMissileDamage('Medium Laser', 5)).toBe('5');
    });

    it('should return base damage for Large Laser', () => {
      expect(formatMissileDamage('Large Laser', 8)).toBe('8');
    });

    it('should return base damage for PPC', () => {
      expect(formatMissileDamage('PPC', 10)).toBe('10');
    });

    it('should return base damage for AC/10', () => {
      expect(formatMissileDamage('AC/10', 10)).toBe('10');
    });

    it('should handle string damage values', () => {
      expect(formatMissileDamage('Flamer', '2 Heat')).toBe('2 Heat');
    });

    it('should handle zero damage', () => {
      expect(formatMissileDamage('NARC', 0)).toBe('0');
    });
  });
});
