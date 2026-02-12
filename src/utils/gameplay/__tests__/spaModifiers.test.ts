import { MovementType, RangeBracket } from '@/types/gameplay';
import { IAttackerState, ITargetState } from '@/types/gameplay';

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
  getMeleeMasterDamageBonus,
  getTacticalGeniusBonus,
  getEffectiveWounds,
  getIronManModifier,
  getHotDogShutdownThresholdBonus,
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

  describe('Melee Master', () => {
    it('returns +1 damage bonus', () => {
      expect(getMeleeMasterDamageBonus(['melee-master'])).toBe(1);
    });

    it('returns 0 without the ability', () => {
      expect(getMeleeMasterDamageBonus([])).toBe(0);
    });
  });

  describe('Tactical Genius', () => {
    it('returns +1 initiative bonus', () => {
      expect(getTacticalGeniusBonus(['tactical-genius'])).toBe(1);
    });

    it('returns 0 without the ability', () => {
      expect(getTacticalGeniusBonus([])).toBe(0);
    });
  });

  describe('Pain Resistance', () => {
    it('ignores first wound', () => {
      expect(getEffectiveWounds(['pain-resistance'], 1)).toBe(0);
    });

    it('reduces wound count by 1 for multiple wounds', () => {
      expect(getEffectiveWounds(['pain-resistance'], 3)).toBe(2);
    });

    it('does not affect zero wounds', () => {
      expect(getEffectiveWounds(['pain-resistance'], 0)).toBe(0);
    });

    it('returns raw wounds without the ability', () => {
      expect(getEffectiveWounds([], 3)).toBe(3);
    });
  });

  describe('Iron Man', () => {
    it('returns -2 consciousness modifier', () => {
      expect(getIronManModifier(['iron-man'])).toBe(-2);
    });

    it('returns 0 without the ability', () => {
      expect(getIronManModifier([])).toBe(0);
    });
  });

  describe('Hot Dog', () => {
    it('returns +3 shutdown threshold bonus', () => {
      expect(getHotDogShutdownThresholdBonus(['hot-dog'])).toBe(3);
    });

    it('returns 0 without the ability', () => {
      expect(getHotDogShutdownThresholdBonus([])).toBe(0);
    });
  });

  describe('Edge Trigger System', () => {
    it('defines exactly 6 trigger types', () => {
      expect(Object.keys(EDGE_TRIGGERS)).toHaveLength(6);
    });

    it('includes all required trigger types', () => {
      const triggers: EdgeTriggerType[] = [
        'reroll-to-hit',
        'reroll-damage-location',
        'reroll-critical-hit',
        'reroll-psr',
        'reroll-consciousness',
        'negate-critical-hit',
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
      expect(canUseEdge(state, 'reroll-to-hit')).toBe(true);
    });

    it('denies edge use when no points remain', () => {
      const state: IEdgeState = {
        maxPoints: 1,
        remainingPoints: 0,
        usageHistory: [],
      };
      expect(canUseEdge(state, 'reroll-to-hit')).toBe(false);
    });

    it('denies edge use when state is undefined', () => {
      expect(canUseEdge(undefined, 'reroll-to-hit')).toBe(false);
    });

    it('consumes an edge point on use', () => {
      const state = createEdgeState(2);
      const newState = useEdge(
        state,
        'reroll-to-hit',
        1,
        'unit-1',
        'Rerolled to-hit',
      );
      expect(newState.remainingPoints).toBe(1);
      expect(newState.usageHistory).toHaveLength(1);
      expect(newState.usageHistory[0].trigger).toBe('reroll-to-hit');
    });

    it('tracks multiple edge uses', () => {
      let state = createEdgeState(3);
      state = useEdge(state, 'reroll-to-hit', 1, 'unit-1', 'Miss reroll');
      state = useEdge(state, 'reroll-psr', 2, 'unit-1', 'PSR reroll');
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
        useEdge(state, 'reroll-to-hit', 1, 'unit-1', 'test'),
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
        'jumping-jack',
        'dodge-maneuver',
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

    it('hasSPA correctly checks ability list', () => {
      expect(hasSPA(['weapon-specialist', 'sniper'], 'sniper')).toBe(true);
      expect(hasSPA(['weapon-specialist'], 'sniper')).toBe(false);
    });
  });

  describe('Consciousness check modifiers', () => {
    it('iron-man gives -2', () => {
      expect(getConsciousnessCheckModifier(['iron-man'])).toBe(-2);
    });

    it('iron-will gives -2 (alias)', () => {
      expect(getConsciousnessCheckModifier(['iron-will'])).toBe(-2);
    });

    it('toughness gives -1', () => {
      expect(getConsciousnessCheckModifier(['toughness'])).toBe(-1);
    });

    it('combines iron-man and toughness to -3', () => {
      expect(getConsciousnessCheckModifier(['iron-man', 'toughness'])).toBe(-3);
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

    it('applies pain resistance to reduce wound penalty', () => {
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
      // 4 (gunnery) + 1 (2 wounds - 1 for pain resistance = 1 wound) = 5
      expect(result.finalToHit).toBe(5);
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
