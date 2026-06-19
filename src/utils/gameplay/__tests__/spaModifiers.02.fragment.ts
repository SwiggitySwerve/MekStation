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
  describe('Neural interface modifiers', () => {
    it('applies Prototype DNI ranged relief before VDNI/BVDNI relief', () => {
      expect(
        calculateVdniRangedToHitModifier(['proto_dni', 'vdni']),
      ).toMatchObject({
        name: 'Prototype DNI',
        value: -2,
        source: 'spa',
      });
    });

    it('suppresses Prototype DNI ranged relief when disconnected', () => {
      expect(calculateVdniRangedToHitModifier(['proto_dni'], false)).toBeNull();
    });

    it('applies Prototype DNI BattleMech piloting relief before Buffered VDNI suppression', () => {
      expect(
        calculateNeuralInterfacePilotingModifier(
          ['proto_dni', 'bvdni'],
          'battlemech',
        ),
      ).toEqual({
        name: 'Prototype DNI',
        value: -3,
      });
      expect(getVdniPilotingModifier(['proto_dni'], 'battlemech')).toBe(-3);
    });

    it('keeps Buffered VDNI out of piloting relief', () => {
      expect(
        calculateNeuralInterfacePilotingModifier(['bvdni'], 'battlemech'),
      ).toBeNull();
      expect(getVdniPilotingModifier(['bvdni'], 'battlemech')).toBe(0);
    });
  });

  describe('Melee Specialist', () => {
    it('returns -1 modifier', () => {
      const result = calculateMeleeSpecialistModifier(['melee-specialist']);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(-1);
    });

    it('returns null without the ability', () => {
      const result = calculateMeleeSpecialistModifier([]);
      expect(result).toBeNull();
    });
  });

  describe('Terrain Master: Frogman', () => {
    it('returns -1 physical to-hit in depth-2 water for Mek attackers', () => {
      const result = calculateFrogmanPhysicalToHitModifier(
        ['terrain-master-frogman'],
        2,
        'BattleMech',
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Frogman');
      expect(result!.value).toBe(-1);
      expect(result!.source).toBe('spa');
    });

    it('does not apply outside depth-2+ water or Mek/ProtoMek attackers', () => {
      expect(
        calculateFrogmanPhysicalToHitModifier(['tm_frogman'], 1, 'BattleMech'),
      ).toBeNull();
      expect(
        calculateFrogmanPhysicalToHitModifier(['tm_frogman'], 2, 'Tank'),
      ).toBeNull();
      expect(
        calculateFrogmanPhysicalToHitModifier([], 2, 'BattleMech'),
      ).toBeNull();
    });

    it('returns -1 water-entry PSR relief only in depth-2+ water for Mek attackers', () => {
      expect(
        getFrogmanWaterPSRModifier(['terrain-master-frogman'], 2, 'BattleMech'),
      ).toBe(-1);
      expect(getFrogmanWaterPSRModifier(['tm_frogman'], 1, 'BattleMech')).toBe(
        0,
      );
      expect(getFrogmanWaterPSRModifier(['tm_frogman'], 2, 'Vehicle')).toBe(0);
      expect(getFrogmanWaterPSRModifier([], 2, 'BattleMech')).toBe(0);
    });
  });

  describe('Terrain Master: Mountaineer', () => {
    it('returns -1 entering-rubble PSR relief for canonical and legacy ids', () => {
      expect(getMountaineerRubblePSRModifier(['tm_mountaineer'])).toBe(-1);
      expect(
        getMountaineerRubblePSRModifier(['terrain-master-mountaineer']),
      ).toBe(-1);
      expect(getMountaineerRubblePSRModifier([])).toBe(0);
    });
  });

  describe('Melee Specialist damage', () => {
    it('returns +1 damage bonus', () => {
      expect(getMeleeSpecialistDamageBonus(['melee-specialist'])).toBe(1);
    });

    it('returns 0 without the ability', () => {
      expect(getMeleeSpecialistDamageBonus([])).toBe(0);
    });
  });

  describe('Melee Master', () => {
    it('does not expose a flat damage bonus', () => {
      expect(getMeleeMasterDamageBonus(['melee-master'])).toBe(0);
    });
  });

  describe('Tactical Genius', () => {
    it('does not expose a flat initiative bonus', () => {
      expect(getTacticalGeniusBonus(['tactical-genius'])).toBe(0);
    });

    it('returns 0 without the ability', () => {
      expect(getTacticalGeniusBonus([])).toBe(0);
    });
  });

  describe('Pain Resistance', () => {
    it('does not alter ranged to-hit wound penalties', () => {
      expect(getEffectiveWounds(['pain-resistance'], 1)).toBe(1);
    });

    it('returns raw wound count for multiple wounds', () => {
      expect(getEffectiveWounds(['pain-resistance'], 3)).toBe(3);
    });

    it('does not affect zero wounds', () => {
      expect(getEffectiveWounds(['pain-resistance'], 0)).toBe(0);
    });

    it('returns raw wounds without the ability', () => {
      expect(getEffectiveWounds([], 3)).toBe(3);
    });
  });

  describe('Iron Man', () => {
    it('does not return a consciousness modifier', () => {
      expect(getIronManModifier(['iron-man'])).toBe(0);
    });

    it('returns 0 without the ability', () => {
      expect(getIronManModifier([])).toBe(0);
    });
  });

  describe('Hot Dog', () => {
    it('returns -1 heat target-number modifier', () => {
      expect(getHotDogHeatTargetNumberModifier(['hot-dog'])).toBe(-1);
    });

    it('returns 0 without the ability', () => {
      expect(getHotDogHeatTargetNumberModifier([])).toBe(0);
    });
  });

  describe('Heat SPAs', () => {
    it('returns Cool Under Fire generated-heat reduction', () => {
      expect(getCoolUnderFireHeatReduction(['cool-under-fire'])).toBe(1);
      expect(getCoolUnderFireHeatReduction([])).toBe(0);
    });

    it('returns Some Like It Hot heat to-hit reduction', () => {
      expect(getSomeLikeItHotHeatPenaltyReduction(['some-like-it-hot'])).toBe(
        1,
      );
      expect(getSomeLikeItHotHeatPenaltyReduction([])).toBe(0);
    });
  });
});
