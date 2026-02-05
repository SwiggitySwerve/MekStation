/**
 * Unit Card Data Service Tests
 */

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  getTechBaseName,
  getRulesLevelName,
  getWeightClassName,
  getUnitTypeName,
  calculateHeatSummary,
  aggregateWeapons,
  formatRanges,
  formatDamage,
  IWeaponSummary,
} from '../UnitCardDataService';

describe('UnitCardDataService', () => {
  describe('getTechBaseName', () => {
    it('returns "IS" for Inner Sphere', () => {
      expect(getTechBaseName(TechBase.INNER_SPHERE)).toBe('IS');
    });

    it('returns "Clan" for Clan', () => {
      expect(getTechBaseName(TechBase.CLAN)).toBe('Clan');
    });
  });

  describe('getRulesLevelName', () => {
    it('returns "Intro" for Introductory', () => {
      expect(getRulesLevelName(RulesLevel.INTRODUCTORY)).toBe('Intro');
    });

    it('returns "Standard" for Standard', () => {
      expect(getRulesLevelName(RulesLevel.STANDARD)).toBe('Standard');
    });

    it('returns "Advanced" for Advanced', () => {
      expect(getRulesLevelName(RulesLevel.ADVANCED)).toBe('Advanced');
    });

    it('returns "Experimental" for Experimental', () => {
      expect(getRulesLevelName(RulesLevel.EXPERIMENTAL)).toBe('Experimental');
    });
  });

  describe('getWeightClassName', () => {
    it('returns correct names for all weight classes', () => {
      expect(getWeightClassName(WeightClass.LIGHT)).toBe('Light');
      expect(getWeightClassName(WeightClass.MEDIUM)).toBe('Medium');
      expect(getWeightClassName(WeightClass.HEAVY)).toBe('Heavy');
      expect(getWeightClassName(WeightClass.ASSAULT)).toBe('Assault');
    });
  });

  describe('getUnitTypeName', () => {
    it('returns correct names for unit types', () => {
      expect(getUnitTypeName(UnitType.BATTLEMECH)).toBe('BattleMech');
      expect(getUnitTypeName(UnitType.VEHICLE)).toBe('Vehicle');
      expect(getUnitTypeName(UnitType.AEROSPACE)).toBe('Aerospace');
      expect(getUnitTypeName(UnitType.BATTLE_ARMOR)).toBe('Battle Armor');
    });
  });

  describe('calculateHeatSummary', () => {
    const createWeapon = (heat: number, count: number = 1): IWeaponSummary => ({
      name: 'Test Weapon',
      category: WeaponCategory.ENERGY,
      damage: 5,
      heat,
      ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      count,
    });

    it('calculates correct heat for single heat sinks', () => {
      const weapons = [createWeapon(5, 2), createWeapon(3, 1)];
      const result = calculateHeatSummary(weapons, 10, 'single');

      expect(result.totalHeatGenerated).toBe(13); // 5*2 + 3*1
      expect(result.heatDissipation).toBe(10); // 10 * 1
      expect(result.netHeat).toBe(3);
      expect(result.isHeatNeutral).toBe(false);
      expect(result.heatSinkType).toBe('Single');
    });

    it('calculates correct heat for double heat sinks', () => {
      const weapons = [createWeapon(5, 2)];
      const result = calculateHeatSummary(weapons, 10, 'double');

      expect(result.totalHeatGenerated).toBe(10);
      expect(result.heatDissipation).toBe(20); // 10 * 2
      expect(result.netHeat).toBe(-10);
      expect(result.isHeatNeutral).toBe(true);
      expect(result.heatSinkType).toBe('Double');
    });

    it('handles zero weapons', () => {
      const result = calculateHeatSummary([], 10, 'single');

      expect(result.totalHeatGenerated).toBe(0);
      expect(result.heatDissipation).toBe(10);
      expect(result.netHeat).toBe(-10);
      expect(result.isHeatNeutral).toBe(true);
    });
  });

  describe('aggregateWeapons', () => {
    const createWeapon = (
      name: string,
      location?: string,
      isRearMounted?: boolean,
    ): IWeaponSummary => ({
      name,
      category: WeaponCategory.ENERGY,
      damage: 5,
      heat: 3,
      ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      count: 1,
      location,
      isRearMounted,
    });

    it('aggregates weapons with same name and location', () => {
      const weapons = [
        createWeapon('Medium Laser', 'Left Arm'),
        createWeapon('Medium Laser', 'Left Arm'),
        createWeapon('Medium Laser', 'Right Arm'),
      ];

      const result = aggregateWeapons(weapons);

      expect(result).toHaveLength(2);
      const leftArmWeapon = result.find((w) => w.location === 'Left Arm');
      const rightArmWeapon = result.find((w) => w.location === 'Right Arm');

      expect(leftArmWeapon?.count).toBe(2);
      expect(rightArmWeapon?.count).toBe(1);
    });

    it('keeps rear-mounted weapons separate', () => {
      const weapons = [
        createWeapon('Medium Laser', 'Center Torso', false),
        createWeapon('Medium Laser', 'Center Torso', true),
      ];

      const result = aggregateWeapons(weapons);

      expect(result).toHaveLength(2);
    });

    it('handles empty array', () => {
      const result = aggregateWeapons([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('formatRanges', () => {
    it('formats standard ranges without minimum', () => {
      const ranges = { minimum: 0, short: 3, medium: 6, long: 9 };
      expect(formatRanges(ranges)).toBe('3/6/9');
    });

    it('formats ranges with minimum', () => {
      const ranges = { minimum: 6, short: 7, medium: 14, long: 21 };
      expect(formatRanges(ranges)).toBe('6/7/14/21');
    });
  });

  describe('formatDamage', () => {
    it('formats numeric damage', () => {
      expect(formatDamage(10)).toBe('10');
    });

    it('preserves string damage (e.g., "2/missile")', () => {
      expect(formatDamage('2/missile')).toBe('2/missile');
    });
  });
});
