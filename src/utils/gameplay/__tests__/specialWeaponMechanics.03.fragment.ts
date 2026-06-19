import { FiringArc, GameSide } from '@/types/gameplay';
import { IWeaponAttack, IDiceRoll } from '@/types/gameplay';
import { WeaponCategory } from '@/types/gameplay';

import {
  resolveUltraAC,
  resolveRotaryAC,
  resolveLBXSlug,
  resolveLBXCluster,
  resolveAMS,
  applyAMSReduction,
  getArtemisIVBonus,
  getPrototypeArtemisIVBonus,
  getArtemisVBonus,
  getNarcBonus,
  isTargetTAGDesignated,
  getMRMClusterModifier,
  getLowProfileClusterModifier,
  getSandblasterClusterModifier,
  calculateClusterModifiers,
  verifyStreakBehavior,
  resolveModifiedClusterHits,
  isUltraAC,
  isRotaryAC,
  isLBXAC,
  isMissileWeapon,
  isMRM,
  isNarcCompatibleMissileWeapon,
  isStreakSRM,
  isAMS,
  isTAG,
  isNarc,
  isSemiGuidedLRM,
  getDefaultFireMode,
  getLBXClusterToHitModifier,
  getFireModeHeatMultiplier,
  buildINarcPodBrushOffTargetOptions,
  iNarcPodDisplayName,
  iNarcPodBrushOffTargetId,
  iNarcPodTargetKey,
  isEquivalentINarcPod,
  removeEquivalentINarcPod,
  uniqueINarcPodTargets,
  DiceRoller,
  ITargetStatusFlags,
  IWeaponEquipmentFlags,
  RACRateOfFire,
} from '../specialWeaponMechanics';

function createWeapon(overrides: Partial<IWeaponAttack> = {}): IWeaponAttack {
  return {
    weaponId: 'uac-5',
    weaponName: 'Ultra AC/5',
    damage: 5,
    heat: 1,
    category: 'ballistic' as WeaponCategory,
    minRange: 0,
    shortRange: 6,
    mediumRange: 13,
    longRange: 20,
    isCluster: false,
    ...overrides,
  };
}

function createDiceRoller(rolls: number[][]): DiceRoller {
  let index = 0;
  return () => {
    const dice = rolls[index % rolls.length];
    index++;
    return {
      dice,
      total: dice[0] + dice[1],
      isSnakeEyes: dice[0] === 1 && dice[1] === 1,
      isBoxcars: dice[0] === 6 && dice[1] === 6,
    };
  };
}

describe('Special Weapon Mechanics', () => {
  // =========================================================================
  // 13.7: TAG Designation
  // =========================================================================
  describe('TAG Designation', () => {
    it('should recognize TAG-designated target', () => {
      const target: ITargetStatusFlags = { tagDesignated: true };

      expect(isTargetTAGDesignated(target)).toBe(true);
    });

    it('should return false for non-designated target', () => {
      const target: ITargetStatusFlags = {};

      expect(isTargetTAGDesignated(target)).toBe(false);
    });

    it('TAG should be nullified by ECM', () => {
      const target: ITargetStatusFlags = {
        tagDesignated: true,
        ecmProtected: true,
      };

      expect(isTargetTAGDesignated(target)).toBe(false);
    });

    it('does not expose TAG as a semi-guided cluster-table helper', () => {
      const equipment: IWeaponEquipmentFlags = { isSemiGuided: true };
      const target: ITargetStatusFlags = { tagDesignated: true };

      const mods = calculateClusterModifiers('lrm-10', equipment, target);

      expect(mods.total).toBe(0);
    });
  });

  // =========================================================================
  // 13.8: MRM Cluster Column Modifier
  // =========================================================================
  describe('MRM Cluster Modifier', () => {
    it('should return -1 for MRM weapons', () => {
      expect(getMRMClusterModifier('mrm-10')).toBe(-1);
      expect(getMRMClusterModifier('mrm-20')).toBe(-1);
      expect(getMRMClusterModifier('mrm-30')).toBe(-1);
      expect(getMRMClusterModifier('mrm-40')).toBe(-1);
    });

    it('should return 0 for non-MRM weapons', () => {
      expect(getMRMClusterModifier('lrm-10')).toBe(0);
      expect(getMRMClusterModifier('srm-4')).toBe(0);
      expect(getMRMClusterModifier('ac-10')).toBe(0);
    });
  });

  // =========================================================================
  // Combined Cluster Modifiers
  // =========================================================================
  describe('Combined Cluster Modifiers', () => {
    it('should combine Artemis IV + Narc + Cluster Hitter', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisIV: true };
      const target: ITargetStatusFlags = { narcedTarget: true };

      const mods = calculateClusterModifiers('lrm-10', equipment, target, true);

      expect(mods.artemisBonus).toBe(2);
      expect(mods.narcBonus).toBe(2);
      expect(mods.clusterHitterBonus).toBe(1);
      expect(mods.mrmPenalty).toBe(0);
      expect(mods.total).toBe(5);
    });

    it('should apply source-backed Sandblaster range bonuses and override Cluster Hitter', () => {
      const shortBonus = getSandblasterClusterModifier({
        hasSandblaster: true,
        weaponId: 'lb-10-x-ac',
        weaponName: 'LB 10-X AC',
        designatedWeaponType: 'LB 10-X AC',
        range: 6,
        shortRange: 6,
        mediumRange: 12,
      });
      const mediumBonus = getSandblasterClusterModifier({
        hasSandblaster: true,
        weaponId: 'lb-10-x-ac',
        weaponName: 'LB 10-X AC',
        designatedWeaponType: 'LB 10-X AC',
        range: 7,
        shortRange: 6,
        mediumRange: 12,
      });
      const longBonus = getSandblasterClusterModifier({
        hasSandblaster: true,
        weaponId: 'lb-10-x-ac',
        weaponName: 'LB 10-X AC',
        designatedWeaponType: 'LB 10-X AC',
        range: 13,
        shortRange: 6,
        mediumRange: 12,
      });
      const mismatchBonus = getSandblasterClusterModifier({
        hasSandblaster: true,
        weaponId: 'lb-10-x-ac',
        weaponName: 'LB 10-X AC',
        designatedWeaponType: 'LRM 10',
        range: 6,
        shortRange: 6,
        mediumRange: 12,
      });
      const mods = calculateClusterModifiers('lb-10-x-ac', {}, {}, true, 4);

      expect(shortBonus).toBe(4);
      expect(mediumBonus).toBe(3);
      expect(longBonus).toBe(2);
      expect(mismatchBonus).toBe(0);
      expect(mods.sandblasterBonus).toBe(4);
      expect(mods.clusterHitterBonus).toBe(0);
      expect(mods.total).toBe(4);
    });

    it('should apply Low Profile as a -4 cluster-table penalty', () => {
      const target: ITargetStatusFlags = { lowProfile: true };

      const mods = calculateClusterModifiers('lrm-10', {}, target);

      expect(getLowProfileClusterModifier(target)).toBe(-4);
      expect(mods.lowProfilePenalty).toBe(-4);
      expect(mods.total).toBe(-4);
    });

    it('should apply MRM penalty in combined calculation', () => {
      const equipment: IWeaponEquipmentFlags = {};
      const target: ITargetStatusFlags = {};

      const mods = calculateClusterModifiers('mrm-20', equipment, target);

      expect(mods.mrmPenalty).toBe(-1);
      expect(mods.total).toBe(-1);
    });

    it('should not apply Artemis flags to non-Artemis-compatible MRM launchers', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisIV: true };
      const target: ITargetStatusFlags = {};

      const mods = calculateClusterModifiers('mrm-20', equipment, target);

      expect(mods.artemisBonus).toBe(0);
      expect(mods.mrmPenalty).toBe(-1);
      expect(mods.total).toBe(-1);
    });

    it('should not apply NARC guidance to non-NARC-compatible MRM launchers', () => {
      const equipment: IWeaponEquipmentFlags = {};
      const target: ITargetStatusFlags = { narcedTarget: true };

      const mods = calculateClusterModifiers('mrm-20', equipment, target);

      expect(mods.narcBonus).toBe(0);
      expect(mods.mrmPenalty).toBe(-1);
      expect(mods.total).toBe(-1);
    });

    it('should not include semi-guided TAG behavior in official cluster totals', () => {
      const equipment: IWeaponEquipmentFlags = { isSemiGuided: true };
      const target: ITargetStatusFlags = { tagDesignated: true };

      const mods = calculateClusterModifiers('lrm-10', equipment, target);

      expect(mods.total).toBe(0);
    });

    it('should apply prototype Artemis IV as a +1 cluster-table modifier', () => {
      const equipment: IWeaponEquipmentFlags = {
        hasPrototypeArtemisIV: true,
      };
      const target: ITargetStatusFlags = {};

      const mods = calculateClusterModifiers('lrm-10', equipment, target);

      expect(mods.artemisBonus).toBe(1);
      expect(mods.total).toBe(1);
    });

    it('should prefer Artemis V instead of stacking IV and V flags', () => {
      const equipment: IWeaponEquipmentFlags = {
        hasArtemisIV: true,
        hasPrototypeArtemisIV: true,
        hasArtemisV: true,
      };
      const target: ITargetStatusFlags = {};

      const mods = calculateClusterModifiers('lrm-10', equipment, target);

      expect(mods.artemisBonus).toBe(3);
      expect(mods.total).toBe(3);
    });

    it('should not apply narc bonus for non-missile weapons', () => {
      const equipment: IWeaponEquipmentFlags = {};
      const target: ITargetStatusFlags = { narcedTarget: true };

      const mods = calculateClusterModifiers('lb-10-x', equipment, target);

      expect(mods.narcBonus).toBe(0);
    });

    it('ECM should zero out Artemis and Narc', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisIV: true };
      const target: ITargetStatusFlags = {
        narcedTarget: true,
        ecmProtected: true,
      };

      const mods = calculateClusterModifiers('lrm-10', equipment, target);

      expect(mods.artemisBonus).toBe(0);
      expect(mods.narcBonus).toBe(0);
      expect(mods.total).toBe(0);
    });
  });

  // =========================================================================
  // 13.9: Streak SRM Verification
  // =========================================================================
  describe('Streak SRM Verification', () => {
    it('should verify streak weapons', () => {
      expect(verifyStreakBehavior('streak-srm-2')).toBe(true);
      expect(verifyStreakBehavior('streak-srm-4')).toBe(true);
      expect(verifyStreakBehavior('streak-srm-6')).toBe(true);
    });

    it('should not match non-streak weapons', () => {
      expect(verifyStreakBehavior('srm-4')).toBe(false);
      expect(verifyStreakBehavior('lrm-10')).toBe(false);
    });
  });
});
