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
  describe('calculateToHit SPA integration', () => {
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

    const integratedToHitSPACases: readonly {
      readonly id: string;
      readonly modifierName?: string;
      readonly attacker: IAttackerState;
      readonly target: ITargetState;
      readonly rangeBracket: RangeBracket;
      readonly range: number;
      readonly expectedFinalToHit: number;
    }[] = [
      {
        id: 'weapon-specialist',
        modifierName: 'Weapon Specialist',
        attacker: {
          ...baseAttacker,
          abilities: ['weapon-specialist'],
          weaponType: 'Medium Laser',
          designatedWeaponType: 'Medium Laser',
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 2,
      },
      {
        id: 'gunnery-specialist',
        modifierName: 'Gunnery Specialist',
        attacker: {
          ...baseAttacker,
          abilities: ['gunnery-specialist'],
          weaponCategory: 'energy',
          designatedWeaponCategory: 'energy',
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 3,
      },
      {
        id: 'blood-stalker',
        modifierName: 'Blood Stalker',
        attacker: {
          ...baseAttacker,
          abilities: ['blood-stalker'],
          targetId: 'enemy-1',
          designatedTargetId: 'enemy-1',
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 3,
      },
      {
        id: 'range-master',
        modifierName: 'Range Master',
        attacker: {
          ...baseAttacker,
          abilities: ['range-master'],
          designatedRangeBracket: RangeBracket.Medium,
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Medium,
        range: 5,
        expectedFinalToHit: 4,
      },
      {
        id: 'sniper',
        modifierName: 'Sniper',
        attacker: {
          ...baseAttacker,
          abilities: ['sniper'],
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Long,
        range: 9,
        expectedFinalToHit: 6,
      },
      {
        id: 'multi-tasker',
        modifierName: 'Multi-Tasker',
        attacker: {
          ...baseAttacker,
          abilities: ['multi-tasker'],
          secondaryTarget: { isSecondary: true, inFrontArc: true },
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 4,
      },
      {
        id: 'hopping-jack',
        modifierName: 'Hopping Jack',
        attacker: {
          ...baseAttacker,
          abilities: ['hopping-jack'],
          movementType: MovementType.Jump,
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 6,
      },
      {
        id: 'jumping-jack',
        modifierName: 'Jumping Jack',
        attacker: {
          ...baseAttacker,
          abilities: ['jumping-jack'],
          movementType: MovementType.Jump,
        },
        target: baseTarget,
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 5,
      },
      {
        id: 'dodge-maneuver',
        modifierName: 'Dodge Maneuver',
        attacker: baseAttacker,
        target: {
          ...baseTarget,
          abilities: ['dodge-maneuver'],
          isDodging: true,
        },
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 6,
      },
      {
        id: 'tm_forest_ranger',
        modifierName: 'Forest Ranger',
        attacker: baseAttacker,
        target: {
          ...baseTarget,
          abilities: ['terrain-master-forest-ranger'],
          movementType: MovementType.Walk,
          terrainFeatures: [{ type: TerrainType.LightWoods, level: 1 }],
        },
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 5,
      },
      {
        id: 'tm_swamp_beast',
        modifierName: 'Swamp Beast',
        attacker: baseAttacker,
        target: {
          ...baseTarget,
          abilities: ['terrain-master-swamp-beast'],
          movementType: MovementType.Run,
          terrainFeatures: [{ type: TerrainType.Mud, level: 1 }],
        },
        rangeBracket: RangeBracket.Short,
        range: 1,
        expectedFinalToHit: 5,
      },
    ];

    it.each(integratedToHitSPACases)(
      'applies catalog to-hit SPA $id through full calculateToHit',
      ({
        id,
        modifierName,
        attacker,
        target,
        rangeBracket,
        range,
        expectedFinalToHit,
      }) => {
        expect(SPA_CATALOG[id].pipelines).toContain('to-hit');

        const result = calculateToHit(attacker, target, rangeBracket, range);

        expect(result.finalToHit).toBe(expectedFinalToHit);
        if (modifierName) {
          expect(result.modifiers.map((modifier) => modifier.name)).toContain(
            modifierName,
          );
        }
      },
    );

    it('applies weapon specialist -2 in full to-hit calc', () => {
      const attacker: IAttackerState = {
        gunnery: 4,
        movementType: MovementType.Stationary,
        heat: 0,
        damageModifiers: [],
        abilities: ['weapon-specialist'],
        weaponType: 'Medium Laser',
        designatedWeaponType: 'Medium Laser',
      };
      const target: ITargetState = {
        movementType: MovementType.Stationary,
        hexesMoved: 0,
        prone: false,
        immobile: false,
        partialCover: false,
      };
      const result = calculateToHit(attacker, target, RangeBracket.Short, 1);
      expect(result.finalToHit).toBe(2); // 4 (gunnery) + 0 (range) - 2 (weapon specialist)
    });

    it('does not apply pain resistance to reduce wound penalty', () => {
      const attacker: IAttackerState = {
        gunnery: 4,
        movementType: MovementType.Stationary,
        heat: 0,
        damageModifiers: [],
        abilities: ['pain-resistance'],
        pilotWounds: 2,
      };
      const target: ITargetState = {
        movementType: MovementType.Stationary,
        hexesMoved: 0,
        prone: false,
        immobile: false,
        partialCover: false,
      };
      const result = calculateToHit(attacker, target, RangeBracket.Short, 1);
      // 4 (gunnery) + 2 wounds. Pain Resistance is consciousness/ammo-explosion only.
      expect(result.finalToHit).toBe(6);
    });

    it('applies blood stalker -1 vs designated target', () => {
      const attacker: IAttackerState = {
        gunnery: 4,
        movementType: MovementType.Stationary,
        heat: 0,
        damageModifiers: [],
        abilities: ['blood-stalker'],
        targetId: 'enemy-1',
        designatedTargetId: 'enemy-1',
      };
      const target: ITargetState = {
        movementType: MovementType.Stationary,
        hexesMoved: 0,
        prone: false,
        immobile: false,
        partialCover: false,
      };
      const result = calculateToHit(attacker, target, RangeBracket.Short, 1);
      expect(result.finalToHit).toBe(3); // 4 - 1
    });

    it('applies blood stalker +2 vs non-designated target', () => {
      const attacker: IAttackerState = {
        gunnery: 4,
        movementType: MovementType.Stationary,
        heat: 0,
        damageModifiers: [],
        abilities: ['blood-stalker'],
        targetId: 'enemy-2',
        designatedTargetId: 'enemy-1',
      };
      const target: ITargetState = {
        movementType: MovementType.Stationary,
        hexesMoved: 0,
        prone: false,
        immobile: false,
        partialCover: false,
      };
      const result = calculateToHit(attacker, target, RangeBracket.Short, 1);
      expect(result.finalToHit).toBe(6); // 4 + 2
    });
  });
});
