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
  calculateGroundObjectLiftCapacity,
  calculateTerrainMasterDefensiveToHitModifier,
  calculateShakyStickModifier,
  getFrogmanWaterPSRModifier,
  getHeavyLifterGroundObjectLiftMultiplier,
  getMeleeMasterDamageBonus,
  getMeleeSpecialistDamageBonus,
  getMountaineerRubblePSRModifier,
  getTacticalGeniusBonus,
  getEffectiveWounds,
  getIronManModifier,
  getHotDogHeatTargetNumberModifier,
  getCoolUnderFireHeatReduction,
  getSomeLikeItHotHeatPenaltyReduction,
  createEdgeState,
  canUseEdge,
  useEdge,
  IEdgeState,
  EdgeTriggerType,
  EDGE_TRIGGERS,
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

  describe('Edge Trigger System', () => {
    it('defines all MegaMek Edge trigger types', () => {
      expect(Object.keys(EDGE_TRIGGERS)).toHaveLength(11);
    });

    it('includes all required trigger types', () => {
      const triggers: EdgeTriggerType[] = [
        'edge_when_headhit',
        'edge_when_tac',
        'edge_when_ko',
        'edge_when_explosion',
        'edge_when_masc_fails',
        'edge_when_aero_alt_loss',
        'edge_when_aero_explosion',
        'edge_when_aero_ko',
        'edge_when_aero_lucky_crit',
        'edge_when_aero_nuke_crit',
        'edge_when_aero_unit_cargo_lost',
      ];
      for (const trigger of triggers) {
        expect(EDGE_TRIGGERS[trigger]).toBeDefined();
      }
    });

    it('creates edge state with correct initial values', () => {
      const state = createEdgeState(2);
      expect(state.maxPoints).toBe(2);
      expect(state.remainingPoints).toBe(2);
      expect(state.usageHistory).toHaveLength(0);
    });

    it('allows edge use when points remain', () => {
      const state = createEdgeState(1);
      expect(canUseEdge(state, 'edge_when_tac')).toBe(true);
    });

    it('denies edge use when no points remain', () => {
      const state: IEdgeState = {
        maxPoints: 1,
        remainingPoints: 0,
        usageHistory: [],
      };
      expect(canUseEdge(state, 'edge_when_tac')).toBe(false);
    });

    it('denies edge use when state is undefined', () => {
      expect(canUseEdge(undefined, 'edge_when_tac')).toBe(false);
    });

    it('consumes an edge point on use', () => {
      const state = createEdgeState(2);
      const newState = useEdge(
        state,
        'edge_when_tac',
        1,
        'unit-1',
        'Rerolled TAC location',
      );
      expect(newState.remainingPoints).toBe(1);
      expect(newState.usageHistory).toHaveLength(1);
      expect(newState.usageHistory[0].trigger).toBe('edge_when_tac');
    });

    it('tracks multiple edge uses', () => {
      let state = createEdgeState(3);
      state = useEdge(state, 'edge_when_tac', 1, 'unit-1', 'TAC reroll');
      state = useEdge(state, 'edge_when_ko', 2, 'unit-1', 'KO reroll');
      expect(state.remainingPoints).toBe(1);
      expect(state.usageHistory).toHaveLength(2);
    });

    it('throws when using edge with no points', () => {
      const state: IEdgeState = {
        maxPoints: 1,
        remainingPoints: 0,
        usageHistory: [],
      };
      expect(() =>
        useEdge(state, 'edge_when_tac', 1, 'unit-1', 'test'),
      ).toThrow('No Edge points remaining');
    });
  });

  describe('SPA Catalog', () => {
    it('contains at least 35 entries', () => {
      expect(getSPACatalogSize()).toBeGreaterThanOrEqual(35);
    });

    it('includes all key combat SPAs', () => {
      const requiredSPAs = [
        'weapon-specialist',
        'gunnery-specialist',
        'blood-stalker',
        'sniper',
        'range-master',
        'cluster-hitter',
        'multi-tasker',
        'hopping-jack',
        'jumping-jack',
        'dodge-maneuver',
        'shaky_stick',
        'melee-specialist',
        'melee-master',
        'tactical-genius',
        'pain-resistance',
        'iron-man',
        'hot-dog',
        'edge',
      ];
      for (const id of requiredSPAs) {
        expect(SPA_CATALOG[id]).toBeDefined();
      }
    });

    it('returns SPAs for to-hit pipeline', () => {
      const toHitSPAs = getSPAsForPipeline('to-hit');
      expect(toHitSPAs.length).toBeGreaterThan(5);
      expect(toHitSPAs.some((s) => s.id === 'weapon-specialist')).toBe(true);
    });

    it('returns SPAs by category', () => {
      const gunnerySPAs = getSPAsByCategory('gunnery');
      expect(gunnerySPAs.length).toBeGreaterThan(3);
    });

    it('declares Sandblaster as a designated cluster-table damage SPA', () => {
      expect(SPA_CATALOG.sandblaster).toMatchObject({
        pipelines: ['damage'],
        combatEffect: expect.stringContaining('+4/+3/+2'),
        requiresDesignation: true,
        designationType: 'weapon_type',
      });
    });

    it('hasSPA correctly checks ability list', () => {
      expect(hasSPA(['weapon-specialist', 'sniper'], 'sniper')).toBe(true);
      expect(hasSPA(['weapon-specialist'], 'sniper')).toBe(false);
    });
  });

  describe('Consciousness check modifiers', () => {
    it('pain-resistance gives -1', () => {
      expect(getConsciousnessCheckModifier(['pain-resistance'])).toBe(-1);
    });

    it('iron-man gives no generic consciousness relief', () => {
      expect(getConsciousnessCheckModifier(['iron-man'])).toBe(0);
    });

    it('iron-will gives no generic consciousness relief', () => {
      expect(getConsciousnessCheckModifier(['iron-will'])).toBe(0);
    });

    it('toughness gives no SPA consciousness relief without numeric RPG Toughness state', () => {
      expect(getConsciousnessCheckModifier(['toughness'])).toBe(0);
    });
  });

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
