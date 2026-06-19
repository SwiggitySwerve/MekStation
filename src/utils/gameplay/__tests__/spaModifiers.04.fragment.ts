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
  describe('Heavy Lifter ground-object lift capacity', () => {
    it('uses the source-backed 1.5x lift multiplier for canonical and legacy ability ids', () => {
      expect(getHeavyLifterGroundObjectLiftMultiplier(['hvy_lifter'])).toBe(
        1.5,
      );
      expect(getHeavyLifterGroundObjectLiftMultiplier(['heavy-lifter'])).toBe(
        1.5,
      );
      expect(getHeavyLifterGroundObjectLiftMultiplier([])).toBe(1);
    });

    it('calculates MekWithArms lift capacity as 5 percent of tonnage per available hand', () => {
      expect(
        calculateGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: [],
        }),
      ).toBe(8);
      expect(
        calculateGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: ['hvy_lifter'],
        }),
      ).toBe(12);
      expect(
        calculateGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: ['hvy_lifter'],
          leftHandAvailable: false,
        }),
      ).toBe(6);
    });

    it('preserves the MegaMek TSM pickup multiplier after Heavy Lifter', () => {
      expect(
        calculateGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: ['heavy-lifter'],
          tsmPickupModifier: 2,
        }),
      ).toBe(24);
    });

    it('returns zero when no hand is available or tonnage is non-positive', () => {
      expect(
        calculateGroundObjectLiftCapacity({
          unitTonnage: 80,
          leftHandAvailable: false,
          rightHandAvailable: false,
        }),
      ).toBe(0);
      expect(calculateGroundObjectLiftCapacity({ unitTonnage: 0 })).toBe(0);
    });

    it('gates represented ground-object payloads by Heavy Lifter lift capacity only', () => {
      expect(
        checkGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: ['hvy_lifter'],
          objectTonnage: 12,
        }),
      ).toEqual({
        allowed: true,
        objectTonnage: 12,
        capacityTonnage: 12,
        capacityMarginTonnage: 0,
      });

      expect(
        checkGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: [],
          objectTonnage: 12,
        }),
      ).toEqual({
        allowed: false,
        objectTonnage: 12,
        capacityTonnage: 8,
        capacityMarginTonnage: -4,
      });

      expect(
        checkGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: ['heavy-lifter'],
          leftHandAvailable: false,
          objectTonnage: 7,
        }),
      ).toMatchObject({
        allowed: false,
        capacityTonnage: 6,
      });

      expect(
        checkGroundObjectLiftCapacity({
          unitTonnage: 80,
          abilities: ['hvy_lifter'],
          objectTonnage: 0,
        }).allowed,
      ).toBe(false);
    });
  });

  describe('Oblique Attacker', () => {
    it('returns -1 bonus', () => {
      expect(getObliqueAttackerBonus(['oblique-attacker'])).toBe(-1);
    });

    it('returns 0 without ability', () => {
      expect(getObliqueAttackerBonus([])).toBe(0);
    });
  });

  describe('Sharpshooter', () => {
    it('returns -1 bonus for canonical Marksman', () => {
      expect(getSharpshooterBonus(['marksman'])).toBe(-1);
    });

    it('returns -1 bonus', () => {
      expect(getSharpshooterBonus(['sharpshooter'])).toBe(-1);
    });

    it('returns 0 without ability', () => {
      expect(getSharpshooterBonus([])).toBe(0);
    });
  });

  describe('calculateAttackerSPAModifiers integration', () => {
    const baseAttacker: IAttackerState = {
      gunnery: 4,
      movementType: MovementType.Stationary,
      heat: 0,
      damageModifiers: [],
    };

    const baseTarget: ITargetState = {
      movementType: MovementType.Stationary,
      hexesMoved: 0,
      prone: false,
      immobile: false,
      partialCover: false,
    };

    it('returns empty array when no abilities', () => {
      const result = calculateAttackerSPAModifiers(
        baseAttacker,
        baseTarget,
        RangeBracket.Short,
        0,
      );
      expect(result).toHaveLength(0);
    });

    it('includes weapon specialist when designated weapon matches', () => {
      const attacker: IAttackerState = {
        ...baseAttacker,
        abilities: ['weapon-specialist'],
        weaponType: 'Medium Laser',
        designatedWeaponType: 'Medium Laser',
      };
      const result = calculateAttackerSPAModifiers(
        attacker,
        baseTarget,
        RangeBracket.Short,
        0,
      );
      expect(result.some((m) => m.name === 'Weapon Specialist')).toBe(true);
      expect(result.find((m) => m.name === 'Weapon Specialist')!.value).toBe(
        -2,
      );
    });

    it('includes jumping jack when attacker jumped', () => {
      const attacker: IAttackerState = {
        ...baseAttacker,
        movementType: MovementType.Jump,
        abilities: ['jumping-jack'],
      };
      const result = calculateAttackerSPAModifiers(
        attacker,
        baseTarget,
        RangeBracket.Short,
        0,
      );
      expect(result.some((m) => m.name === 'Jumping Jack')).toBe(true);
      expect(result.find((m) => m.name === 'Jumping Jack')!.value).toBe(-2);
    });

    it('includes hopping jack when attacker jumped', () => {
      const attacker: IAttackerState = {
        ...baseAttacker,
        movementType: MovementType.Jump,
        abilities: ['hopping-jack'],
      };
      const result = calculateAttackerSPAModifiers(
        attacker,
        baseTarget,
        RangeBracket.Short,
        0,
      );
      expect(result.some((m) => m.name === 'Hopping Jack')).toBe(true);
      expect(result.find((m) => m.name === 'Hopping Jack')!.value).toBe(-1);
    });

    it('includes dodge maneuver from target abilities', () => {
      const target: ITargetState = {
        ...baseTarget,
        abilities: ['dodge-maneuver'],
        isDodging: true,
      };
      const result = calculateAttackerSPAModifiers(
        baseAttacker,
        target,
        RangeBracket.Short,
        0,
      );
      expect(result.some((m) => m.name === 'Dodge Maneuver')).toBe(true);
    });

    it('includes source-backed Terrain Master defender to-hit variants from target abilities and terrain', () => {
      const forestTarget: ITargetState = {
        ...baseTarget,
        abilities: ['tm_forest_ranger'],
        movementType: MovementType.Walk,
        terrainFeatures: [{ type: TerrainType.HeavyWoods, level: 1 }],
      };
      const swampTarget: ITargetState = {
        ...baseTarget,
        abilities: ['tm_swamp_beast'],
        movementType: MovementType.Run,
        terrainFeatures: [{ type: TerrainType.Mud, level: 1 }],
      };

      expect(
        calculateAttackerSPAModifiers(
          baseAttacker,
          forestTarget,
          RangeBracket.Short,
          0,
        ).some((m) => m.name === 'Forest Ranger'),
      ).toBe(true);
      expect(
        calculateAttackerSPAModifiers(
          baseAttacker,
          swampTarget,
          RangeBracket.Short,
          0,
        ).some((m) => m.name === 'Swamp Beast'),
      ).toBe(true);
    });

    it('includes source-backed Shaky Stick from airborne target state', () => {
      const target: ITargetState = {
        ...baseTarget,
        abilities: ['shaky_stick'],
        isAirborne: true,
      };

      expect(
        calculateAttackerSPAModifiers(
          baseAttacker,
          target,
          RangeBracket.Short,
          0,
        ).some((m) => m.name === 'Shaky Stick'),
      ).toBe(true);
      expect(
        calculateAttackerSPAModifiers(
          { ...baseAttacker, isAirborne: true },
          target,
          RangeBracket.Short,
          0,
        ).some((m) => m.name === 'Shaky Stick'),
      ).toBe(false);
    });

    it('includes sniper at long range', () => {
      const attacker: IAttackerState = {
        ...baseAttacker,
        abilities: ['sniper'],
      };
      const result = calculateAttackerSPAModifiers(
        attacker,
        baseTarget,
        RangeBracket.Long,
        4,
      );
      expect(result.some((m) => m.name === 'Sniper')).toBe(true);
      expect(result.find((m) => m.name === 'Sniper')!.value).toBe(-2);
    });

    it('prefers range master over sniper when both present', () => {
      const attacker: IAttackerState = {
        ...baseAttacker,
        abilities: ['range-master', 'sniper'],
        designatedRangeBracket: RangeBracket.Medium,
      };
      const result = calculateAttackerSPAModifiers(
        attacker,
        baseTarget,
        RangeBracket.Medium,
        2,
      );
      expect(result.some((m) => m.name === 'Range Master')).toBe(true);
      expect(result.some((m) => m.name === 'Sniper')).toBe(false);
    });
  });
});
