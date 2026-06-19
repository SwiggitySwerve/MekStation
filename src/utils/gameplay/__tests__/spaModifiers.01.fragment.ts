import { MovementType, RangeBracket } from '@/types/gameplay';
import { IAttackerState, ITargetState } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  calculateWeaponSpecialistModifier,
  calculateGunnerySpecialistModifier,
  calculateBloodStalkerModifier,
  calculateRangeMasterModifier,
  calculateSniperModifier,
  calculateMultiTaskerModifier,
  getClusterHitterBonus,
  calculateJumpingJackModifier,
  calculateDodgeManeuverModifier,
  calculateMeleeSpecialistModifier,
  calculateFrogmanPhysicalToHitModifier,
  calculateNeuralInterfacePilotingModifier,
  calculateGroundObjectLiftCapacity,
  calculateVdniRangedToHitModifier,
  calculateTerrainMasterDefensiveToHitModifier,
  calculateShakyStickModifier,
  checkGroundObjectLiftCapacity,
  getFrogmanWaterPSRModifier,
  getHeavyLifterGroundObjectLiftMultiplier,
  getMeleeMasterDamageBonus,
  getMeleeSpecialistDamageBonus,
  getMountaineerRubblePSRModifier,
  getTacticalGeniusBonus,
  getVdniPilotingModifier,
  getEffectiveWounds,
  getIronManModifier,
  getHotDogHeatTargetNumberModifier,
  getCoolUnderFireHeatReduction,
  getSomeLikeItHotHeatPenaltyReduction,
  createEdgeState,
  canUseEdge,
  deriveEdgePointCountFromPilotAbilities,
  useEdge,
  resolveEdgeBattleMechTrigger,
  IEdgeState,
  EdgeTriggerType,
  EDGE_TRIGGERS,
  OUT_OF_SCOPE_AEROSPACE_EDGE_TRIGGERS,
  REPRESENTED_BATTLEMECH_EDGE_TRIGGERS,
  SPA_CATALOG,
  getSPACatalogSize,
  getSPAsForPipeline,
  getSPAsByCategory,
  hasSPA,
  getConsciousnessCheckModifier,
  getObliqueAttackerBonus,
  getSharpshooterBonus,
  calculateAttackerSPAModifiers,
} from '../spaModifiers';
import { calculateToHit } from '../toHit';

describe('spaModifiers', () => {
  describe('Weapon Specialist', () => {
    it('returns -2 when firing designated weapon type', () => {
      const result = calculateWeaponSpecialistModifier(
        ['weapon-specialist'],
        'Medium Laser',
        'Medium Laser',
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-2);
      expect(result!.source).toBe('spa');
    });

    it('returns null for non-designated weapon type', () => {
      const result = calculateWeaponSpecialistModifier(
        ['weapon-specialist'],
        'AC/10',
        'Medium Laser',
      );
      expect(result).toBeNull();
    });

    it('returns null when pilot lacks the ability', () => {
      const result = calculateWeaponSpecialistModifier(
        ['sniper'],
        'Medium Laser',
        'Medium Laser',
      );
      expect(result).toBeNull();
    });

    it('matches weapon types case-insensitively', () => {
      const result = calculateWeaponSpecialistModifier(
        ['weapon-specialist'],
        'medium laser',
        'Medium Laser',
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-2);
    });

    it('returns null when weapon type is missing', () => {
      const result = calculateWeaponSpecialistModifier(
        ['weapon-specialist'],
        undefined,
        'Medium Laser',
      );
      expect(result).toBeNull();
    });
  });

  describe('Gunnery Specialist', () => {
    it('returns -1 for designated weapon category', () => {
      const result = calculateGunnerySpecialistModifier(
        ['gunnery-specialist'],
        'energy',
        'energy',
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-1);
    });

    it('returns +1 for non-designated weapon category', () => {
      const result = calculateGunnerySpecialistModifier(
        ['gunnery-specialist'],
        'ballistic',
        'energy',
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(1);
    });

    it('returns null without the ability', () => {
      const result = calculateGunnerySpecialistModifier([], 'energy', 'energy');
      expect(result).toBeNull();
    });
  });

  describe('Blood Stalker', () => {
    it('returns -1 against designated target', () => {
      const result = calculateBloodStalkerModifier(
        ['blood-stalker'],
        'target-1',
        'target-1',
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-1);
    });

    it('returns +2 against non-designated target', () => {
      const result = calculateBloodStalkerModifier(
        ['blood-stalker'],
        'target-2',
        'target-1',
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(2);
    });

    it('returns null without the ability', () => {
      const result = calculateBloodStalkerModifier([], 'target-1', 'target-1');
      expect(result).toBeNull();
    });
  });

  describe('Range Master', () => {
    it('zeroes range modifier at designated bracket', () => {
      const result = calculateRangeMasterModifier(
        ['range-master'],
        RangeBracket.Medium,
        RangeBracket.Medium,
        2,
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-2);
    });

    it('returns null at non-designated bracket', () => {
      const result = calculateRangeMasterModifier(
        ['range-master'],
        RangeBracket.Long,
        RangeBracket.Medium,
        4,
      );
      expect(result).toBeNull();
    });

    it('returns null when range modifier is 0 or negative', () => {
      const result = calculateRangeMasterModifier(
        ['range-master'],
        RangeBracket.Short,
        RangeBracket.Short,
        0,
      );
      expect(result).toBeNull();
    });
  });

  describe('Sniper', () => {
    it('halves long range modifier (+4 → +2)', () => {
      const result = calculateSniperModifier(['sniper'], 4);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-2);
    });

    it('halves medium range modifier (+2 → +1)', () => {
      const result = calculateSniperModifier(['sniper'], 2);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-1);
    });

    it('returns null when range modifier is 0', () => {
      const result = calculateSniperModifier(['sniper'], 0);
      expect(result).toBeNull();
    });

    it('rounds down odd modifiers (+3 → halved to +1, reduction = -1)', () => {
      const result = calculateSniperModifier(['sniper'], 3);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-1);
    });
  });

  describe('Multi-Tasker', () => {
    it('returns -1 for secondary targets', () => {
      const result = calculateMultiTaskerModifier(['multi-tasker'], true);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-1);
    });

    it('returns null for primary targets', () => {
      const result = calculateMultiTaskerModifier(['multi-tasker'], false);
      expect(result).toBeNull();
    });
  });

  describe('Cluster Hitter', () => {
    it('returns +1 column shift', () => {
      expect(getClusterHitterBonus(['cluster-hitter'])).toBe(1);
    });

    it('returns 0 without the ability', () => {
      expect(getClusterHitterBonus([])).toBe(0);
    });
  });

  describe('Jumping Jack', () => {
    it('returns -2 modifier when jumping', () => {
      const result = calculateJumpingJackModifier(
        ['jumping-jack'],
        MovementType.Jump,
      );
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-2);
    });

    it('returns null when not jumping', () => {
      const result = calculateJumpingJackModifier(
        ['jumping-jack'],
        MovementType.Walk,
      );
      expect(result).toBeNull();
    });

    it('returns null without the ability', () => {
      const result = calculateJumpingJackModifier([], MovementType.Jump);
      expect(result).toBeNull();
    });

    it('returns -1 for Hopping Jack when jumping', () => {
      const result = calculateJumpingJackModifier(
        ['hopping-jack'],
        MovementType.Jump,
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Hopping Jack');
      expect(result!.value).toBe(-1);
    });
  });

  describe('Dodge Maneuver', () => {
    it('returns +2 when target is dodging', () => {
      const result = calculateDodgeManeuverModifier(['dodge-maneuver'], true);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(2);
    });

    it('returns null when target is not dodging', () => {
      const result = calculateDodgeManeuverModifier(['dodge-maneuver'], false);
      expect(result).toBeNull();
    });
  });

  describe('Terrain Master defensive to-hit variants', () => {
    it('returns +1 Forest Ranger only when the target walked in woods', () => {
      const result = calculateTerrainMasterDefensiveToHitModifier(
        ['terrain-master-forest-ranger'],
        MovementType.Walk,
        [{ type: TerrainType.LightWoods, level: 1 }],
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Forest Ranger');
      expect(result!.value).toBe(1);
      expect(result!.source).toBe('spa');

      expect(
        calculateTerrainMasterDefensiveToHitModifier(
          ['tm_forest_ranger'],
          MovementType.Run,
          [{ type: TerrainType.LightWoods, level: 1 }],
        ),
      ).toBeNull();
      expect(
        calculateTerrainMasterDefensiveToHitModifier(
          ['tm_forest_ranger'],
          MovementType.Walk,
          [{ type: TerrainType.Mud, level: 1 }],
        ),
      ).toBeNull();
    });

    it('returns +1 Swamp Beast only when the target ran in mud or swamp', () => {
      const result = calculateTerrainMasterDefensiveToHitModifier(
        ['terrain-master-swamp-beast'],
        MovementType.Run,
        [{ type: TerrainType.Swamp, level: 1 }],
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Swamp Beast');
      expect(result!.value).toBe(1);
      expect(result!.source).toBe('spa');

      expect(
        calculateTerrainMasterDefensiveToHitModifier(
          ['tm_swamp_beast'],
          MovementType.Walk,
          [{ type: TerrainType.Swamp, level: 1 }],
        ),
      ).toBeNull();
      expect(
        calculateTerrainMasterDefensiveToHitModifier(
          ['tm_swamp_beast'],
          MovementType.Run,
          [{ type: TerrainType.LightWoods, level: 1 }],
        ),
      ).toBeNull();
    });
  });

  describe('Shaky Stick', () => {
    it('returns +1 only when an airborne target is attacked from the ground', () => {
      const result = calculateShakyStickModifier(['shaky_stick'], true, false);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Shaky Stick');
      expect(result!.value).toBe(1);
      expect(result!.source).toBe('spa');

      expect(
        calculateShakyStickModifier(['shaky_stick'], false, false),
      ).toBeNull();
      expect(
        calculateShakyStickModifier(['shaky_stick'], true, true),
      ).toBeNull();
      expect(calculateShakyStickModifier([], true, false)).toBeNull();
    });
  });
});
