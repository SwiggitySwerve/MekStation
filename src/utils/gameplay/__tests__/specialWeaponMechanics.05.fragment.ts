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
  // Modified Cluster Hits Resolution
  // =========================================================================
  describe('Modified Cluster Hits Resolution', () => {
    it('should apply positive cluster modifier', () => {
      // Roll 7 + modifier 2 = 9, cluster size 10 = 8 hits
      const roller = createDiceRoller([
        [4, 3], // cluster roll: 7
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

      const result = resolveModifiedClusterHits(
        10,
        1,
        FiringArc.Front,
        roller,
        2,
      );

      expect(result.modifiedRoll).toBe(9);
      expect(result.hitsScored).toBe(8);
    });

    it('should apply negative cluster modifier', () => {
      // Roll 7 + modifier -1 = 6, cluster size 10 = 6 hits
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

      const result = resolveModifiedClusterHits(
        10,
        1,
        FiringArc.Front,
        roller,
        -1,
      );

      expect(result.modifiedRoll).toBe(6);
      expect(result.hitsScored).toBe(6);
    });

    it('should clamp modified roll to 2-12', () => {
      // Roll 2 + modifier -3 should clamp to 2
      const roller = createDiceRoller([
        [1, 1], // cluster roll: 2
        // 3 location rolls for cluster size 10 at roll 2
        [3, 3],
        [4, 2],
        [5, 1],
      ]);

      const result = resolveModifiedClusterHits(
        10,
        1,
        FiringArc.Front,
        roller,
        -3,
      );

      expect(result.modifiedRoll).toBe(2);
    });

    it('should clamp modified roll at max 12', () => {
      // Roll 12 + modifier +3 should clamp to 12
      const roller = createDiceRoller([
        [6, 6], // cluster roll: 12
        // 10 location rolls for cluster size 10 at roll 12
        [3, 3],
        [4, 2],
        [5, 1],
        [3, 4],
        [2, 5],
        [4, 3],
        [3, 3],
        [4, 2],
        [5, 1],
        [3, 4],
      ]);

      const result = resolveModifiedClusterHits(
        10,
        1,
        FiringArc.Front,
        roller,
        3,
      );

      expect(result.modifiedRoll).toBe(12);
      expect(result.hitsScored).toBe(10);
    });

    it('should calculate total damage = hits × damagePerHit', () => {
      // Roll 7, cluster size 4 = 3 hits, damage per hit = 2
      const roller = createDiceRoller([
        [4, 3], // cluster roll: 7
        [3, 3],
        [4, 2],
        [5, 1], // 3 location rolls
      ]);

      const result = resolveModifiedClusterHits(4, 2, FiringArc.Front, roller);

      expect(result.hitsScored).toBe(3);
      expect(result.totalDamage).toBe(6);
    });
  });
});
