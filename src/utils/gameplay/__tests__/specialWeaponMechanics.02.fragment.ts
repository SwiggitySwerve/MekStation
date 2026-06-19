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
  // 13.3: LB-X AC
  // =========================================================================
  describe('LB-X AC Resolution', () => {
    it('should return null for slug mode (use standard resolution)', () => {
      expect(resolveLBXSlug()).toBeNull();
    });

    it('should resolve cluster mode with cluster table', () => {
      const weapon = createWeapon({
        weaponId: 'lb-10-x',
        weaponName: 'LB 10-X AC',
        damage: 10,
        isCluster: true,
        clusterSize: 10,
      });
      // Roll 7 on cluster table for size 10 = 6 hits
      const roller = createDiceRoller([
        [4, 3], // cluster roll: 7
        // 6 location rolls
        [3, 3],
        [4, 2],
        [5, 1],
        [3, 4],
        [2, 5],
        [4, 3],
      ]);

      const result = resolveLBXCluster(weapon, FiringArc.Front, roller);

      expect(result.hitsScored).toBe(6);
      // Each pellet deals 1 damage
      expect(result.totalDamage).toBe(6);
      expect(result.hitDistribution).toHaveLength(6);
      result.hitDistribution.forEach((hit) => {
        expect(hit.damage).toBe(1);
      });
    });

    it('should apply cluster modifier to LBX cluster roll', () => {
      const weapon = createWeapon({
        weaponId: 'lb-10-x',
        damage: 10,
        isCluster: true,
        clusterSize: 10,
      });
      // Roll 7 + modifier +2 = 9, size 10 = 8 hits
      const roller = createDiceRoller([
        [4, 3], // cluster roll: 7 + 2 = 9
        // 8 location rolls
        [3, 3],
        [4, 2],
        [5, 1],
        [3, 4],
        [2, 5],
        [4, 3],
        [3, 3],
        [4, 2],
      ]);

      const result = resolveLBXCluster(weapon, FiringArc.Front, roller, 2);

      expect(result.hitsScored).toBe(8);
    });

    it('LBX cluster mode to-hit modifier should be -1', () => {
      expect(getLBXClusterToHitModifier('lbx-cluster')).toBe(-1);
      expect(getLBXClusterToHitModifier('lbx-slug')).toBe(0);
      expect(getLBXClusterToHitModifier('standard')).toBe(0);
    });

    it('LBX max roll on cluster table for size 20 = 20 pellets', () => {
      const weapon = createWeapon({
        weaponId: 'lb-20-x',
        damage: 20,
        isCluster: true,
        clusterSize: 20,
      });
      const locationRolls: number[][] = [];
      for (let i = 0; i < 20; i++) locationRolls.push([3, 3]);
      const roller = createDiceRoller([[6, 6], ...locationRolls]);

      const result = resolveLBXCluster(weapon, FiringArc.Front, roller);

      expect(result.hitsScored).toBe(20);
      expect(result.totalDamage).toBe(20);
    });
  });

  // =========================================================================
  // 13.4: AMS
  // =========================================================================
  describe('AMS Resolution', () => {
    it('should reduce incoming missile hits with a -4 cluster-table modifier', () => {
      const roller = createDiceRoller([[3, 4]]);

      const result = resolveAMS(6, roller, 10);

      expect(result.clusterRoll).toBe(7);
      expect(result.clusterModifier).toBe(-4);
      expect(result.modifiedClusterRoll).toBe(3);
      expect(result.hitsReduced).toBe(3);
      expect(result.hitsRemaining).toBe(3);
      expect(result.ammoConsumed).toBe(1);
    });

    it('should clamp AMS modifier to the cluster table minimum', () => {
      const roller = createDiceRoller([[1, 1]]);

      const result = resolveAMS(1, roller, 2);

      expect(result.modifiedClusterRoll).toBe(2);
      expect(result.hitsReduced).toBe(0);
      expect(result.hitsRemaining).toBe(1);
    });

    it('should apply AMS reduction correctly', () => {
      const amsResult = {
        hitsReduced: 3,
        hitsRemaining: 3,
        ammoConsumed: 1,
        roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false },
        clusterRoll: 7,
        clusterModifier: -4,
        modifiedClusterRoll: 3,
      };
      expect(applyAMSReduction(6, amsResult)).toBe(3);
      expect(applyAMSReduction(3, amsResult)).toBe(0);
      expect(applyAMSReduction(0, amsResult)).toBe(0);
    });

    it('should consume 1 ammo per activation', () => {
      const roller = createDiceRoller([[2, 3]]);
      const result = resolveAMS(5, roller);
      expect(result.ammoConsumed).toBe(1);
    });
  });

  // =========================================================================
  // 13.5: Artemis IV/V
  // =========================================================================
  describe('Artemis IV/V Bonus', () => {
    it('should return +2 for Artemis IV equipped', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisIV: true };
      const target: ITargetStatusFlags = {};

      expect(getArtemisIVBonus(equipment, target)).toBe(2);
    });

    it('should return +1 for prototype Artemis IV equipped', () => {
      const equipment: IWeaponEquipmentFlags = {
        hasPrototypeArtemisIV: true,
      };
      const target: ITargetStatusFlags = {};

      expect(getPrototypeArtemisIVBonus(equipment, target)).toBe(1);
    });

    it('should return +3 for Artemis V equipped', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisV: true };
      const target: ITargetStatusFlags = {};

      expect(getArtemisVBonus(equipment, target)).toBe(3);
    });

    it('should return 0 if not equipped', () => {
      const equipment: IWeaponEquipmentFlags = {};
      const target: ITargetStatusFlags = {};

      expect(getArtemisIVBonus(equipment, target)).toBe(0);
      expect(getArtemisVBonus(equipment, target)).toBe(0);
    });

    it('Artemis IV should be nullified by ECM', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisIV: true };
      const target: ITargetStatusFlags = { ecmProtected: true };

      expect(getArtemisIVBonus(equipment, target)).toBe(0);
    });

    it('Artemis IV should be nullified by flight-path ECM without nullifying target-only NARC', () => {
      const result = calculateClusterModifiers(
        'lrm-15',
        { hasArtemisIV: true },
        {
          flightPathEcmAffected: true,
          narcedTarget: true,
        },
      );

      expect(result.artemisBonus).toBe(0);
      expect(result.narcBonus).toBe(2);
      expect(result.total).toBe(2);
    });

    it('Artemis V should be nullified by ECM', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisV: true };
      const target: ITargetStatusFlags = { ecmProtected: true };

      expect(getArtemisVBonus(equipment, target)).toBe(0);
    });

    it('Artemis IV/V should not apply to indirect fire', () => {
      const equipment: IWeaponEquipmentFlags = {
        hasArtemisIV: true,
        hasPrototypeArtemisIV: true,
        hasArtemisV: true,
      };
      const target: ITargetStatusFlags = { isIndirectFire: true };

      expect(getArtemisIVBonus(equipment, target)).toBe(0);
      expect(getPrototypeArtemisIVBonus(equipment, target)).toBe(0);
      expect(getArtemisVBonus(equipment, target)).toBe(0);
    });

    it('Artemis IV/prototype IV/V should be nullified by attacker stealth', () => {
      const target: ITargetStatusFlags = { attackerStealthActive: true };

      expect(getArtemisIVBonus({ hasArtemisIV: true }, target)).toBe(0);
      expect(
        getPrototypeArtemisIVBonus({ hasPrototypeArtemisIV: true }, target),
      ).toBe(0);
      expect(getArtemisVBonus({ hasArtemisV: true }, target)).toBe(0);
    });

    it('cluster modifiers suppress Artemis while attacker stealth is active', () => {
      const result = calculateClusterModifiers(
        'lrm-15',
        { hasArtemisIV: true },
        { attackerStealthActive: true },
      );

      expect(result.artemisBonus).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // 13.6: Narc/iNarc Beacon
  // =========================================================================
  describe('Narc Beacon Bonus', () => {
    it('should return +2 for narced target', () => {
      const target: ITargetStatusFlags = { narcedTarget: true };

      expect(getNarcBonus(target)).toBe(2);
    });

    it('should return 0 for non-narced target', () => {
      const target: ITargetStatusFlags = {};

      expect(getNarcBonus(target)).toBe(0);
    });

    it('should be nullified by ECM', () => {
      const target: ITargetStatusFlags = {
        narcedTarget: true,
        ecmProtected: true,
      };

      expect(getNarcBonus(target)).toBe(0);
    });

    it('should not apply the cluster bonus during indirect fire', () => {
      const target: ITargetStatusFlags = {
        narcedTarget: true,
        isIndirectFire: true,
      };

      expect(getNarcBonus(target)).toBe(0);
    });
  });
});
