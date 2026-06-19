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
      expect(isMissileWeapon('mml-9')).toBe(true);
      expect(isMissileWeapon('mrm-20')).toBe(true);
      expect(isMissileWeapon('atm-6')).toBe(true);
      expect(isMissileWeapon('ac-10')).toBe(false);
    });

    it('should detect NARC-compatible missile weapons separately from generic missiles', () => {
      expect(isNarcCompatibleMissileWeapon('lrm-10')).toBe(true);
      expect(isNarcCompatibleMissileWeapon('srm-4')).toBe(true);
      expect(isNarcCompatibleMissileWeapon('mml-9')).toBe(true);
      expect(isNarcCompatibleMissileWeapon('nlrm-10')).toBe(true);
      expect(isNarcCompatibleMissileWeapon('mrm-20')).toBe(false);
      expect(isNarcCompatibleMissileWeapon('atm-6')).toBe(false);
      expect(isNarcCompatibleMissileWeapon('streak-srm-6')).toBe(false);
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
      expect(isSemiGuidedLRM('Semi Guided LRM 10')).toBe(true);
      expect(isSemiGuidedLRM('sg-lrm-5')).toBe(true);
      expect(isSemiGuidedLRM('SG LRM 5')).toBe(true);
      expect(isSemiGuidedLRM('lrm-10')).toBe(false);
    });
  });

  describe('iNARC Pod Lifecycle Helpers', () => {
    it('treats same-team and same-type iNARC pods as the same target object regardless of hit location', () => {
      expect(
        isEquivalentINarcPod(
          {
            teamId: GameSide.Player,
            podType: 'homing',
            location: 'Center Torso',
          },
          {
            teamId: GameSide.Player,
            podType: 'homing',
            location: 'Left Torso',
          },
        ),
      ).toBe(true);
    });

    it('keeps pod target keys distinct by team and pod type', () => {
      expect(
        iNarcPodTargetKey({
          teamId: GameSide.Player,
          podType: 'ecm',
        }),
      ).toBe('player:ecm');
      expect(
        iNarcPodTargetKey({
          teamId: GameSide.Opponent,
          podType: 'ecm',
        }),
      ).toBe('opponent:ecm');
      expect(
        iNarcPodTargetKey({
          teamId: GameSide.Player,
          podType: 'haywire',
        }),
      ).toBe('player:haywire');
    });

    it('builds stable carrier-scoped Brush-Off pod object target ids', () => {
      expect(
        iNarcPodBrushOffTargetId('carrier-1', {
          teamId: GameSide.Opponent,
          podType: 'ecm',
        }),
      ).toBe('inarc-pod:carrier-1:opponent:ecm');
    });

    it('formats source-backed iNARC pod object display names', () => {
      expect(
        iNarcPodDisplayName({
          teamId: GameSide.Player,
          podType: 'nemesis',
        }),
      ).toBe('Nemesis iNarc pod from Team player');
    });

    it('collapses same-team same-type iNARC pods into one represented target option', () => {
      const pods = [
        {
          teamId: GameSide.Player,
          podType: 'homing' as const,
          location: 'Center Torso',
        },
        {
          teamId: GameSide.Player,
          podType: 'homing' as const,
          location: 'Left Torso',
        },
        {
          teamId: GameSide.Player,
          podType: 'ecm' as const,
          location: 'Right Torso',
        },
      ];

      expect(uniqueINarcPodTargets(pods)).toEqual([pods[0], pods[2]]);
    });

    it('builds independently selectable Brush-Off target options from carrier iNARC pods', () => {
      const pods = [
        {
          teamId: GameSide.Player,
          podType: 'homing' as const,
          location: 'Center Torso',
        },
        {
          teamId: GameSide.Player,
          podType: 'homing' as const,
          location: 'Left Torso',
        },
        {
          teamId: GameSide.Opponent,
          podType: 'haywire' as const,
          location: 'Right Torso',
        },
      ];

      expect(
        buildINarcPodBrushOffTargetOptions({
          carrierUnitId: 'carrier-1',
          carrierName: 'Carrier',
          pods,
        }),
      ).toEqual([
        {
          id: 'inarc-pod:carrier-1:player:homing',
          carrierUnitId: 'carrier-1',
          name: 'Carrier - Homing iNarc pod from Team player',
          selectedINarcPod: pods[0],
        },
        {
          id: 'inarc-pod:carrier-1:opponent:haywire',
          carrierUnitId: 'carrier-1',
          name: 'Carrier - Haywire iNarc pod from Team opponent',
          selectedINarcPod: pods[2],
        },
      ]);
    });

    it('removes exactly one same-team same-type pod target while preserving other pod objects', () => {
      const pods = [
        {
          teamId: GameSide.Player,
          podType: 'homing' as const,
          location: 'Center Torso',
        },
        {
          teamId: GameSide.Player,
          podType: 'ecm' as const,
          location: 'Left Torso',
        },
        {
          teamId: GameSide.Opponent,
          podType: 'homing' as const,
          location: 'Right Torso',
        },
      ];

      expect(
        removeEquivalentINarcPod(pods, {
          teamId: GameSide.Player,
          podType: 'homing',
          location: 'Head',
        }),
      ).toEqual([
        {
          teamId: GameSide.Player,
          podType: 'ecm',
          location: 'Left Torso',
        },
        {
          teamId: GameSide.Opponent,
          podType: 'homing',
          location: 'Right Torso',
        },
      ]);
    });

    it('leaves pod object arrays untouched when no same-team same-type target exists', () => {
      const pods = [
        {
          teamId: GameSide.Player,
          podType: 'haywire' as const,
          location: 'Center Torso',
        },
      ];

      expect(
        removeEquivalentINarcPod(pods, {
          teamId: GameSide.Opponent,
          podType: 'haywire',
        }),
      ).toBe(pods);
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
});
