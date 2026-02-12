import { FiringArc } from '@/types/gameplay';
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
  getArtemisVBonus,
  getNarcBonus,
  isTargetTAGDesignated,
  getSemiGuidedLRMBonus,
  getMRMClusterModifier,
  calculateClusterModifiers,
  verifyStreakBehavior,
  resolveModifiedClusterHits,
  isUltraAC,
  isRotaryAC,
  isLBXAC,
  isMissileWeapon,
  isMRM,
  isStreakSRM,
  isAMS,
  isTAG,
  isNarc,
  isSemiGuidedLRM,
  getDefaultFireMode,
  getLBXClusterToHitModifier,
  getFireModeHeatMultiplier,
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
  // 13.1: Ultra AC
  // =========================================================================
  describe('Ultra AC Resolution', () => {
    it('should fire 2 independent shots', () => {
      const weapon = createWeapon({ weaponId: 'uac-5', damage: 5 });
      const roller = createDiceRoller([
        [4, 4], // shot 1 to-hit: 8
        [3, 3], // shot 1 location
        [5, 3], // shot 2 to-hit: 8
        [4, 2], // shot 2 location
      ]);

      const result = resolveUltraAC(weapon, 7, FiringArc.Front, roller);

      expect(result.shots).toHaveLength(2);
      expect(result.fireMode).toBe('ultra');
    });

    it('should resolve each shot independently for hit/miss', () => {
      const weapon = createWeapon({ weaponId: 'uac-5', damage: 5 });
      const roller = createDiceRoller([
        [4, 4], // shot 1: 8 >= 8 = hit
        [3, 3], // shot 1 location
        [2, 2], // shot 2: 4 < 8 = miss
      ]);

      const result = resolveUltraAC(weapon, 8, FiringArc.Front, roller);

      expect(result.shots[0].hit).toBe(true);
      expect(result.shots[0].damage).toBe(5);
      expect(result.shots[1].hit).toBe(false);
      expect(result.shots[1].damage).toBe(0);
      expect(result.totalHits).toBe(1);
      expect(result.totalDamage).toBe(5);
    });

    it('should both shots hit with independent locations', () => {
      const weapon = createWeapon({ weaponId: 'uac-10', damage: 10 });
      const roller = createDiceRoller([
        [5, 3], // shot 1: 8 >= 7 = hit
        [4, 3], // shot 1 location
        [4, 4], // shot 2: 8 >= 7 = hit
        [6, 1], // shot 2 location
      ]);

      const result = resolveUltraAC(weapon, 7, FiringArc.Front, roller);

      expect(result.totalHits).toBe(2);
      expect(result.totalDamage).toBe(20);
      expect(result.shots[0].hitLocation).toBeDefined();
      expect(result.shots[1].hitLocation).toBeDefined();
    });

    it('should jam on natural 2 (snake eyes)', () => {
      const weapon = createWeapon({ weaponId: 'uac-5', damage: 5 });
      const roller = createDiceRoller([
        [4, 4], // shot 1: 8 hit
        [3, 3], // shot 1 location
        [1, 1], // shot 2: natural 2 = JAM
      ]);

      const result = resolveUltraAC(weapon, 7, FiringArc.Front, roller);

      expect(result.jammed).toBe(true);
      expect(result.shots[1].causedJam).toBe(true);
      expect(result.shots[1].hit).toBe(false);
    });

    it('should jam even if first shot is snake eyes', () => {
      const weapon = createWeapon({ weaponId: 'uac-5', damage: 5 });
      const roller = createDiceRoller([
        [1, 1], // shot 1: natural 2 = JAM
        [5, 4], // shot 2: 9 hit
        [3, 3], // shot 2 location
      ]);

      const result = resolveUltraAC(weapon, 7, FiringArc.Front, roller);

      expect(result.jammed).toBe(true);
      expect(result.shots[0].causedJam).toBe(true);
      expect(result.shots[0].hit).toBe(false);
    });

    it('should generate heat = weapon heat + 1 in ultra mode', () => {
      const weapon = createWeapon({ weaponId: 'uac-5', damage: 5, heat: 1 });
      const roller = createDiceRoller([
        [3, 2], // miss
        [3, 2], // miss
      ]);

      const result = resolveUltraAC(weapon, 10, FiringArc.Front, roller);

      expect(result.heatGenerated).toBe(2);
    });

    it('should not hit with snake eyes even if >= toHitNumber', () => {
      const weapon = createWeapon({ weaponId: 'uac-5', damage: 5 });
      // TN 2 means natural 2 would normally hit, but snake eyes = jam + miss
      const roller = createDiceRoller([
        [1, 1], // natural 2 = JAM, not a hit
        [3, 3], // shot 2
        [4, 2], // shot 2 location
      ]);

      const result = resolveUltraAC(weapon, 2, FiringArc.Front, roller);

      expect(result.shots[0].hit).toBe(false);
      expect(result.shots[0].causedJam).toBe(true);
      expect(result.jammed).toBe(true);
    });
  });

  // =========================================================================
  // 13.2: Rotary AC
  // =========================================================================
  describe('Rotary AC Resolution', () => {
    it('should fire the selected number of shots (1-6)', () => {
      const weapon = createWeapon({ weaponId: 'rac-5', damage: 5, heat: 1 });

      for (let rof = 1; rof <= 6; rof++) {
        const rolls: number[][] = [];
        for (let i = 0; i < rof; i++) {
          rolls.push([4, 4]); // hit
          rolls.push([3, 3]); // location
        }
        const roller = createDiceRoller(rolls);

        const result = resolveRotaryAC(
          weapon,
          7,
          FiringArc.Front,
          rof as RACRateOfFire,
          roller,
        );

        expect(result.shots).toHaveLength(rof);
      }
    });

    it('should resolve each shot independently', () => {
      const weapon = createWeapon({ weaponId: 'rac-2', damage: 2 });
      const roller = createDiceRoller([
        [5, 3], // shot 1: 8 hit
        [4, 2], // location
        [2, 2], // shot 2: 4 miss
        [6, 1], // shot 3: 7 hit
        [3, 4], // location
      ]);

      const result = resolveRotaryAC(weapon, 7, FiringArc.Front, 3, roller);

      expect(result.shots[0].hit).toBe(true);
      expect(result.shots[1].hit).toBe(false);
      expect(result.shots[2].hit).toBe(true);
      expect(result.totalHits).toBe(2);
      expect(result.totalDamage).toBe(4);
    });

    it('should jam on natural 2 at any shot', () => {
      const weapon = createWeapon({ weaponId: 'rac-5', damage: 5 });
      const roller = createDiceRoller([
        [5, 4], // shot 1: hit
        [3, 3], // location
        [4, 3], // shot 2: hit
        [4, 2], // location
        [1, 1], // shot 3: natural 2 = JAM
        [5, 3], // shot 4: would continue
        [3, 3], // location
      ]);

      const result = resolveRotaryAC(weapon, 7, FiringArc.Front, 4, roller);

      expect(result.jammed).toBe(true);
      expect(result.shots[2].causedJam).toBe(true);
    });

    it('should scale heat with rate of fire', () => {
      const weapon = createWeapon({ weaponId: 'rac-5', damage: 5, heat: 1 });
      const roller = createDiceRoller([
        [3, 2],
        [3, 2],
        [3, 2],
        [3, 2],
        [3, 2],
        [3, 2], // 6 misses
      ]);

      const result = resolveRotaryAC(weapon, 12, FiringArc.Front, 6, roller);

      expect(result.heatGenerated).toBe(6); // heat × rateOfFire
    });

    it('should fire single shot at ROF 1', () => {
      const weapon = createWeapon({ weaponId: 'rac-2', damage: 2 });
      const roller = createDiceRoller([
        [5, 4], // hit
        [3, 3], // location
      ]);

      const result = resolveRotaryAC(weapon, 7, FiringArc.Front, 1, roller);

      expect(result.shots).toHaveLength(1);
      expect(result.totalHits).toBe(1);
    });

    it('should have fireMode = rotary', () => {
      const weapon = createWeapon({ weaponId: 'rac-5', damage: 5 });
      const roller = createDiceRoller([[3, 2]]);

      const result = resolveRotaryAC(weapon, 12, FiringArc.Front, 1, roller);

      expect(result.fireMode).toBe('rotary');
    });
  });

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
    it('should reduce incoming missile hits by d6', () => {
      const roller = createDiceRoller([[4, 2]]); // first die = 4

      const result = resolveAMS(10, roller);

      expect(result.hitsReduced).toBe(4);
      expect(result.ammoConsumed).toBe(1);
    });

    it('should not reduce below 0', () => {
      const roller = createDiceRoller([[6, 3]]); // first die = 6

      const result = resolveAMS(3, roller);

      expect(result.hitsReduced).toBe(3); // capped at incoming hits
    });

    it('should apply AMS reduction correctly', () => {
      const amsResult = {
        hitsReduced: 4,
        ammoConsumed: 1,
        roll: { dice: [4, 2], total: 6, isSnakeEyes: false, isBoxcars: false },
      };
      expect(applyAMSReduction(10, amsResult)).toBe(6);
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

    it('should return +2 for Artemis V equipped', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisV: true };
      const target: ITargetStatusFlags = {};

      expect(getArtemisVBonus(equipment, target)).toBe(2);
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

    it('Artemis V should be nullified by ECM', () => {
      const equipment: IWeaponEquipmentFlags = { hasArtemisV: true };
      const target: ITargetStatusFlags = { ecmProtected: true };

      expect(getArtemisVBonus(equipment, target)).toBe(0);
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
  });

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

    it('semi-guided LRM should get +2 bonus when TAG-designated', () => {
      const equipment: IWeaponEquipmentFlags = { isSemiGuided: true };
      const target: ITargetStatusFlags = { tagDesignated: true };

      expect(getSemiGuidedLRMBonus(equipment, target)).toBe(2);
    });

    it('semi-guided LRM should get 0 without TAG', () => {
      const equipment: IWeaponEquipmentFlags = { isSemiGuided: true };
      const target: ITargetStatusFlags = {};

      expect(getSemiGuidedLRMBonus(equipment, target)).toBe(0);
    });

    it('non-semi-guided should get 0 even with TAG', () => {
      const equipment: IWeaponEquipmentFlags = {};
      const target: ITargetStatusFlags = { tagDesignated: true };

      expect(getSemiGuidedLRMBonus(equipment, target)).toBe(0);
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

    it('should apply MRM penalty in combined calculation', () => {
      const equipment: IWeaponEquipmentFlags = {};
      const target: ITargetStatusFlags = {};

      const mods = calculateClusterModifiers('mrm-20', equipment, target);

      expect(mods.mrmPenalty).toBe(-1);
      expect(mods.total).toBe(-1);
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

  // =========================================================================
  // Weapon Type Detection
  // =========================================================================
  describe('Weapon Type Detection', () => {
    it('should detect Ultra AC weapons', () => {
      expect(isUltraAC('uac-5')).toBe(true);
      expect(isUltraAC('uac-10')).toBe(true);
      expect(isUltraAC('uac-20')).toBe(true);
      expect(isUltraAC('ultra-ac-5')).toBe(true);
      expect(isUltraAC('ac-5')).toBe(false);
      expect(isUltraAC('rac-5')).toBe(false);
    });

    it('should detect Rotary AC weapons', () => {
      expect(isRotaryAC('rac-2')).toBe(true);
      expect(isRotaryAC('rac-5')).toBe(true);
      expect(isRotaryAC('rotary-ac-5')).toBe(true);
      expect(isRotaryAC('ac-5')).toBe(false);
      expect(isRotaryAC('uac-5')).toBe(false);
    });

    it('should detect LB-X AC weapons', () => {
      expect(isLBXAC('lb-10-x')).toBe(true);
      expect(isLBXAC('lb-5-x')).toBe(true);
      expect(isLBXAC('lbx-10')).toBe(true);
      expect(isLBXAC('ac-10')).toBe(false);
    });

    it('should detect missile weapons', () => {
      expect(isMissileWeapon('lrm-10')).toBe(true);
      expect(isMissileWeapon('srm-4')).toBe(true);
      expect(isMissileWeapon('mrm-20')).toBe(true);
      expect(isMissileWeapon('atm-6')).toBe(true);
      expect(isMissileWeapon('ac-10')).toBe(false);
    });

    it('should detect MRM weapons', () => {
      expect(isMRM('mrm-10')).toBe(true);
      expect(isMRM('mrm-40')).toBe(true);
      expect(isMRM('lrm-10')).toBe(false);
    });

    it('should detect Streak SRM weapons', () => {
      expect(isStreakSRM('streak-srm-2')).toBe(true);
      expect(isStreakSRM('streak-srm-6')).toBe(true);
      expect(isStreakSRM('srm-4')).toBe(false);
    });

    it('should detect AMS weapons', () => {
      expect(isAMS('ams')).toBe(true);
      expect(isAMS('clan-ams')).toBe(true);
      expect(isAMS('is-ams')).toBe(true);
      expect(isAMS('ac-5')).toBe(false);
    });

    it('should detect TAG designators', () => {
      expect(isTAG('tag')).toBe(true);
      expect(isTAG('clan-tag')).toBe(true);
      expect(isTAG('light-tag')).toBe(true);
      expect(isTAG('ac-5')).toBe(false);
    });

    it('should detect Narc beacons', () => {
      expect(isNarc('narc')).toBe(true);
      expect(isNarc('inarc')).toBe(true);
      expect(isNarc('ac-5')).toBe(false);
    });

    it('should detect semi-guided LRM', () => {
      expect(isSemiGuidedLRM('semi-guided-lrm-10')).toBe(true);
      expect(isSemiGuidedLRM('sg-lrm-5')).toBe(true);
      expect(isSemiGuidedLRM('lrm-10')).toBe(false);
    });
  });

  // =========================================================================
  // Fire Mode Helpers
  // =========================================================================
  describe('Fire Mode Helpers', () => {
    it('should return correct default fire modes', () => {
      expect(getDefaultFireMode('uac-5')).toBe('ultra');
      expect(getDefaultFireMode('rac-5')).toBe('rotary');
      expect(getDefaultFireMode('lb-10-x')).toBe('lbx-cluster');
      expect(getDefaultFireMode('ac-5')).toBe('standard');
      expect(getDefaultFireMode('lrm-10')).toBe('standard');
    });

    it('should calculate fire mode heat multiplier', () => {
      expect(getFireModeHeatMultiplier('ultra')).toBe(2);
      expect(getFireModeHeatMultiplier('rotary', 4)).toBe(4);
      expect(getFireModeHeatMultiplier('rotary', 6)).toBe(6);
      expect(getFireModeHeatMultiplier('standard')).toBe(1);
      expect(getFireModeHeatMultiplier('lbx-slug')).toBe(1);
      expect(getFireModeHeatMultiplier('lbx-cluster')).toBe(1);
    });
  });

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
