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
});
