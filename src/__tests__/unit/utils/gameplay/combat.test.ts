/**
 * Combat Resolution Tests
 * Tests for to-hit calculation, hit location, damage, and cluster weapons.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import { describe, it, expect } from '@jest/globals';

// To-Hit Calculation
import {
  createBaseModifier,
  calculateRangeModifier,
  calculateAttackerMovementModifier,
  calculateHeatModifier,
  calculateMinimumRangeModifier,
  calculateToHit,
  simpleToHit,
  getProbability,
  RANGE_MODIFIERS,
  ATTACKER_MOVEMENT_MODIFIERS,
} from '@/utils/gameplay/toHit';

// Hit Location
import {
  FRONT_HIT_LOCATION_TABLE,
  REAR_HIT_LOCATION_TABLE,
  getHitLocationTable,
  determineHitLocationFromRoll,
  createDiceRoll,
  isCriticalLocation,
  isHeadHit,
  usesRearArmor,
  getLocationDisplayName,
} from '@/utils/gameplay/hitLocation';

// Damage
import {
  applyDamageToLocation,
  applyDamageWithTransfer,
  checkCriticalHitTrigger,
  getCriticalHitCount,
  applyPilotDamage,
  checkUnitDestruction,
  createDamageState,
} from '@/utils/gameplay/damage';

// Cluster Weapons
import {
  lookupClusterHits,
  getNearestClusterSize,
  groupClusterHitsByLocation,
  CLUSTER_HIT_TABLE,
} from '@/utils/gameplay/clusterWeapons';

// Types
import { 
  MovementType, 
  RangeBracket,
  FiringArc,
  CombatLocation,
} from '@/types/gameplay';

// =============================================================================
// To-Hit Calculation Tests
// =============================================================================

describe('To-Hit Calculation', () => {
  describe('createBaseModifier', () => {
    it('should create a base modifier from gunnery skill', () => {
      const modifier = createBaseModifier(4);
      expect(modifier.name).toBe('Gunnery Skill');
      expect(modifier.value).toBe(4);
      expect(modifier.source).toBe('base');
    });
  });

  describe('RANGE_MODIFIERS', () => {
    it('should have correct range bracket modifiers', () => {
      expect(RANGE_MODIFIERS[RangeBracket.Short]).toBe(0);
      expect(RANGE_MODIFIERS[RangeBracket.Medium]).toBe(2);
      expect(RANGE_MODIFIERS[RangeBracket.Long]).toBe(4);
      expect(RANGE_MODIFIERS[RangeBracket.OutOfRange]).toBe(Infinity);
    });
  });

  describe('ATTACKER_MOVEMENT_MODIFIERS', () => {
    it('should have correct movement modifiers', () => {
      expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Stationary]).toBe(0);
      expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Walk]).toBe(1);
      expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Run]).toBe(2);
      expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Jump]).toBe(3);
    });
  });

  describe('calculateRangeModifier', () => {
    it('should return short range modifier for close targets', () => {
      const modifier = calculateRangeModifier(2, 3, 6, 15);
      expect(modifier.value).toBe(0);
      expect(modifier.source).toBe('range');
    });

    it('should return medium range modifier', () => {
      const modifier = calculateRangeModifier(5, 3, 6, 15);
      expect(modifier.value).toBe(2);
    });

    it('should return long range modifier', () => {
      const modifier = calculateRangeModifier(10, 3, 6, 15);
      expect(modifier.value).toBe(4);
    });

    it('should return out of range for distant targets', () => {
      const modifier = calculateRangeModifier(20, 3, 6, 15);
      expect(modifier.value).toBe(Infinity);
    });
  });

  describe('calculateAttackerMovementModifier', () => {
    it('should return 0 for stationary', () => {
      const modifier = calculateAttackerMovementModifier(MovementType.Stationary);
      expect(modifier.value).toBe(0);
    });

    it('should return 3 for jumping', () => {
      const modifier = calculateAttackerMovementModifier(MovementType.Jump);
      expect(modifier.value).toBe(3);
    });
  });

  describe('calculateHeatModifier', () => {
    it('should return 0 for low heat (0-4)', () => {
      expect(calculateHeatModifier(0).value).toBe(0);
      expect(calculateHeatModifier(4).value).toBe(0);
    });

    it('should return 1 for heat 5-7', () => {
      expect(calculateHeatModifier(5).value).toBe(1);
      expect(calculateHeatModifier(7).value).toBe(1);
    });

    it('should return 2 for heat 8-12', () => {
      expect(calculateHeatModifier(8).value).toBe(2);
      expect(calculateHeatModifier(12).value).toBe(2);
    });

    it('should return 3 for heat 13+', () => {
      expect(calculateHeatModifier(13).value).toBe(3);
      expect(calculateHeatModifier(20).value).toBe(3);
    });
  });

  describe('calculateMinimumRangeModifier', () => {
    it('should return null when no minimum range', () => {
      const modifier = calculateMinimumRangeModifier(3, 0);
      expect(modifier).toBeNull();
    });

    it('should return null when outside minimum range', () => {
      const modifier = calculateMinimumRangeModifier(7, 6);
      expect(modifier).toBeNull();
    });

    it('should return penalty inside minimum range', () => {
      const modifier = calculateMinimumRangeModifier(3, 6);
      expect(modifier).not.toBeNull();
      expect(modifier!.value).toBe(3); // 6 - 3 = 3
    });
  });

  describe('simpleToHit', () => {
    it('should calculate simple to-hit number', () => {
      const result = simpleToHit(4, RangeBracket.Short);
      expect(result.finalToHit).toBe(4); // Just gunnery at short range
      expect(result.impossible).toBe(false);
    });

    it('should accumulate all modifiers', () => {
      const result = simpleToHit(
        4,
        RangeBracket.Medium,
        MovementType.Run,
        MovementType.Walk,
        5,
        8
      );
      // 4 (gunnery) + 2 (medium) + 2 (run) + 1 (TMM for 5 hexes) + 2 (heat 8) = 11
      expect(result.finalToHit).toBe(11);
    });

    it('should mark impossible when to-hit > 12', () => {
      const result = simpleToHit(
        4,
        RangeBracket.Long,
        MovementType.Jump,
        MovementType.Jump,
        15,
        15
      );
      expect(result.impossible).toBe(true);
      expect(result.probability).toBe(0);
    });
  });

  describe('getProbability', () => {
    it('should return 1.0 for target 2', () => {
      expect(getProbability(2)).toBe(1.0);
    });

    it('should return correct probability for target 7', () => {
      expect(getProbability(7)).toBeCloseTo(21 / 36, 3);
    });

    it('should return 0 for target > 12', () => {
      expect(getProbability(13)).toBe(0);
    });
  });
});

// =============================================================================
// Hit Location Tests
// =============================================================================

describe('Hit Location', () => {
  describe('FRONT_HIT_LOCATION_TABLE', () => {
    it('should have 12 as head', () => {
      expect(FRONT_HIT_LOCATION_TABLE[12]).toBe('head');
    });

    it('should have 7 as center torso', () => {
      expect(FRONT_HIT_LOCATION_TABLE[7]).toBe('center_torso');
    });

    it('should have 2 as center torso (critical)', () => {
      expect(FRONT_HIT_LOCATION_TABLE[2]).toBe('center_torso');
    });
  });

  describe('REAR_HIT_LOCATION_TABLE', () => {
    it('should have rear torso locations', () => {
      expect(REAR_HIT_LOCATION_TABLE[7]).toBe('center_torso_rear');
      expect(REAR_HIT_LOCATION_TABLE[6]).toBe('right_torso_rear');
      expect(REAR_HIT_LOCATION_TABLE[8]).toBe('left_torso_rear');
    });
  });

  describe('getHitLocationTable', () => {
    it('should return front table for front arc', () => {
      const table = getHitLocationTable(FiringArc.Front);
      expect(table[7]).toBe('center_torso');
    });

    it('should return rear table for rear arc', () => {
      const table = getHitLocationTable(FiringArc.Rear);
      expect(table[7]).toBe('center_torso_rear');
    });
  });

  describe('determineHitLocationFromRoll', () => {
    it('should return correct location for roll', () => {
      const roll = createDiceRoll(6, 6); // 12
      const result = determineHitLocationFromRoll(FiringArc.Front, roll);
      expect(result.location).toBe('head');
      expect(result.isCritical).toBe(true);
    });

    it('should mark snake eyes as critical', () => {
      const roll = createDiceRoll(1, 1); // 2
      const result = determineHitLocationFromRoll(FiringArc.Front, roll);
      expect(result.isCritical).toBe(true);
    });
  });

  describe('isCriticalLocation', () => {
    it('should return true for head', () => {
      expect(isCriticalLocation('head')).toBe(true);
    });

    it('should return true for center torso', () => {
      expect(isCriticalLocation('center_torso')).toBe(true);
      expect(isCriticalLocation('center_torso_rear')).toBe(true);
    });

    it('should return false for arms', () => {
      expect(isCriticalLocation('left_arm')).toBe(false);
    });
  });

  describe('isHeadHit', () => {
    it('should return true for head', () => {
      expect(isHeadHit('head')).toBe(true);
    });

    it('should return false for other locations', () => {
      expect(isHeadHit('center_torso')).toBe(false);
    });
  });

  describe('usesRearArmor', () => {
    it('should return true for rear locations', () => {
      expect(usesRearArmor('center_torso_rear')).toBe(true);
      expect(usesRearArmor('left_torso_rear')).toBe(true);
    });

    it('should return false for front locations', () => {
      expect(usesRearArmor('center_torso')).toBe(false);
    });
  });

  describe('getLocationDisplayName', () => {
    it('should return proper display names', () => {
      expect(getLocationDisplayName('head')).toBe('Head');
      expect(getLocationDisplayName('center_torso_rear')).toBe('Center Torso (Rear)');
    });
  });
});

// =============================================================================
// Damage Application Tests
// =============================================================================

describe('Damage Application', () => {
  const createTestState = () => {
    const armor: Record<CombatLocation, number> = {
      'head': 9,
      'center_torso': 30,
      'center_torso_rear': 10,
      'left_torso': 20,
      'left_torso_rear': 8,
      'right_torso': 20,
      'right_torso_rear': 8,
      'left_arm': 16,
      'right_arm': 16,
      'left_leg': 24,
      'right_leg': 24,
    };
    
    const rearArmor = {
      'center_torso': 10,
      'left_torso': 8,
      'right_torso': 8,
    };
    
    return createDamageState(50, armor, rearArmor);
  };

  describe('applyDamageToLocation', () => {
    it('should apply damage to armor first', () => {
      const state = createTestState();
      const result = applyDamageToLocation(state, 'left_arm', 10);
      
      expect(result.armorDamage).toBe(10);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(6);
      expect(result.destroyed).toBe(false);
    });

    it('should apply excess damage to structure', () => {
      const state = createTestState();
      const result = applyDamageToLocation(state, 'left_arm', 20);
      
      expect(result.armorDamage).toBe(16);
      expect(result.structureDamage).toBe(4);
      expect(result.armorRemaining).toBe(0);
    });

    it('should destroy location when structure depleted', () => {
      const state = createTestState();
      const result = applyDamageToLocation(state, 'left_arm', 30);
      
      expect(result.destroyed).toBe(true);
      expect(state.destroyedLocations.has('left_arm')).toBe(true);
    });

    it('should transfer damage from destroyed location', () => {
      const state = createTestState();
      // Destroy the arm with 30 damage (16 armor + 8 structure = 24, so 6 excess)
      const result = applyDamageToLocation(state, 'left_arm', 30);
      
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(6);
      expect(result.transferLocation).toBe('left_torso');
    });
  });

  describe('applyDamageWithTransfer', () => {
    it('should apply damage through transfer chain', () => {
      const state = createTestState();
      
      // First destroy the arm
      state.armor['left_arm'] = 0;
      state.structure['left_arm'] = 1;
      
      const results = applyDamageWithTransfer(state, 'left_arm', 10);
      
      // Should have hit arm and transferred to torso
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].location).toBe('left_arm');
    });
  });

  describe('checkCriticalHitTrigger', () => {
    it('should not trigger for 0 structure damage', () => {
      const result = checkCriticalHitTrigger(0);
      expect(result.triggered).toBe(false);
    });
  });

  describe('getCriticalHitCount', () => {
    it('should return correct hit counts', () => {
      expect(getCriticalHitCount(7)).toBe(0);
      expect(getCriticalHitCount(8)).toBe(1);
      expect(getCriticalHitCount(10)).toBe(2);
      expect(getCriticalHitCount(12)).toBe(3);
    });
  });

  describe('applyPilotDamage', () => {
    it('should apply wounds to pilot', () => {
      const state = createTestState();
      const result = applyPilotDamage(state, 1, 'head_hit');
      
      expect(result.woundsInflicted).toBe(1);
      expect(result.totalWounds).toBe(1);
      expect(result.consciousnessCheckRequired).toBe(true);
    });

    it('should kill pilot at 6 wounds', () => {
      const state = createTestState();
      state.pilotWounds = 5;
      
      const result = applyPilotDamage(state, 1, 'head_hit');
      
      expect(result.dead).toBe(true);
      expect(state.destroyed).toBe(true);
      expect(state.destructionCause).toBe('pilot_death');
    });
  });

  describe('checkUnitDestruction', () => {
    it('should detect head destruction', () => {
      const state = createTestState();
      state.destroyedLocations.add('head');
      
      const result = checkUnitDestruction(state);
      
      expect(result.destroyed).toBe(true);
      expect(result.cause).toBe('damage');
    });

    it('should detect center torso destruction', () => {
      const state = createTestState();
      state.destroyedLocations.add('center_torso');
      
      const result = checkUnitDestruction(state);
      
      expect(result.destroyed).toBe(true);
    });

    it('should not destroy for limb loss', () => {
      const state = createTestState();
      state.destroyedLocations.add('left_arm');
      
      const result = checkUnitDestruction(state);
      
      expect(result.destroyed).toBe(false);
    });
  });
});

// =============================================================================
// Cluster Weapons Tests
// =============================================================================

describe('Cluster Weapons', () => {
  describe('CLUSTER_HIT_TABLE', () => {
    it('should have correct values for roll 7 cluster 10', () => {
      expect(CLUSTER_HIT_TABLE[7][10]).toBe(6);
    });

    it('should have max hits on roll 11-12', () => {
      expect(CLUSTER_HIT_TABLE[12][20]).toBe(20);
      expect(CLUSTER_HIT_TABLE[11][10]).toBe(10);
    });
  });

  describe('getNearestClusterSize', () => {
    it('should return exact sizes when available', () => {
      expect(getNearestClusterSize(5)).toBe(5);
      expect(getNearestClusterSize(10)).toBe(10);
    });

    it('should round up to next available size', () => {
      // Sizes available: 2, 4, 5, 6, 10, 15, 20
      // Implementation rounds up to next available threshold
      expect(getNearestClusterSize(7)).toBe(10);  // 7 <= 10, returns 10
      expect(getNearestClusterSize(12)).toBe(15); // 12 <= 15, returns 15
      expect(getNearestClusterSize(3)).toBe(4);   // 3 <= 4, returns 4
    });

    it('should cap at 20', () => {
      expect(getNearestClusterSize(30)).toBe(20);
    });
  });

  describe('lookupClusterHits', () => {
    it('should return correct hits', () => {
      expect(lookupClusterHits(7, 10)).toBe(6);
      expect(lookupClusterHits(12, 20)).toBe(20);
    });

    it('should handle non-standard cluster sizes', () => {
      // 7 rounds up to 10 in cluster table
      expect(lookupClusterHits(7, 7)).toBe(6);
    });
  });

  describe('groupClusterHitsByLocation', () => {
    it('should group hits by location', () => {
      const hits = [
        { location: 'left_arm' as CombatLocation, damage: 1, roll: createDiceRoll(3, 3) },
        { location: 'left_arm' as CombatLocation, damage: 1, roll: createDiceRoll(3, 4) },
        { location: 'center_torso' as CombatLocation, damage: 1, roll: createDiceRoll(3, 4) },
      ];

      const grouped = groupClusterHitsByLocation(hits);
      
      expect(grouped.get('left_arm')?.count).toBe(2);
      expect(grouped.get('left_arm')?.totalDamage).toBe(2);
      expect(grouped.get('center_torso')?.count).toBe(1);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Combat Integration', () => {
  it('should calculate complete attack scenario', () => {
    // Attacker: Gunnery 4, walked, heat 5
    // Target: Ran 6 hexes
    // Range: 4 hexes (medium)
    
    const result = calculateToHit(
      {
        gunnery: 4,
        movementType: MovementType.Walk,
        heat: 5,
        damageModifiers: [],
      },
      {
        movementType: MovementType.Run,
        hexesMoved: 6,
        prone: false,
        immobile: false,
        partialCover: false,
      },
      RangeBracket.Medium,
      4
    );

    // Expected: 4 (gunnery) + 2 (medium) + 1 (walk) + 2 (TMM 6/5=2) + 1 (heat 5-7) = 10
    expect(result.finalToHit).toBe(10);
    expect(result.impossible).toBe(false);
    expect(result.probability).toBeCloseTo(6 / 36, 3); // P(10+)
  });
});
