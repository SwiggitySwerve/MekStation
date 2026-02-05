/**
 * Hit Location Tests
 *
 * Tests for BattleTech hit location tables and damage location determination.
 */

import { FiringArc, CombatLocation } from '@/types/gameplay';

import {
  FRONT_HIT_LOCATION_TABLE,
  LEFT_HIT_LOCATION_TABLE,
  RIGHT_HIT_LOCATION_TABLE,
  REAR_HIT_LOCATION_TABLE,
  getHitLocationTable,
  rollD6,
  roll2d6,
  createDiceRoll,
  determineHitLocation,
  determineHitLocationFromRoll,
  isCriticalLocation,
  isHeadHit,
  usesRearArmor,
  PUNCH_HIT_LOCATION_TABLE,
  KICK_HIT_LOCATION_TABLE,
  determinePunchLocation,
  determineKickLocation,
  distributeClusterHits,
  groupHitsByLocation,
  getLocationDisplayName,
  getStandardLocations,
  getAllLocations,
} from '../hitLocation';

// =============================================================================
// Hit Location Table Tests
// =============================================================================

describe('FRONT_HIT_LOCATION_TABLE', () => {
  it('should have entries for all 2d6 rolls (2-12)', () => {
    for (let roll = 2; roll <= 12; roll++) {
      expect(FRONT_HIT_LOCATION_TABLE[roll]).toBeDefined();
    }
  });

  it('should have head on roll of 12', () => {
    expect(FRONT_HIT_LOCATION_TABLE[12]).toBe('head');
  });

  it('should have center torso on roll of 7', () => {
    expect(FRONT_HIT_LOCATION_TABLE[7]).toBe('center_torso');
  });

  it('should have center torso (critical) on roll of 2', () => {
    expect(FRONT_HIT_LOCATION_TABLE[2]).toBe('center_torso');
  });
});

describe('LEFT_HIT_LOCATION_TABLE', () => {
  it('should have entries for all 2d6 rolls', () => {
    for (let roll = 2; roll <= 12; roll++) {
      expect(LEFT_HIT_LOCATION_TABLE[roll]).toBeDefined();
    }
  });

  it('should have left torso on roll of 2 (critical)', () => {
    expect(LEFT_HIT_LOCATION_TABLE[2]).toBe('left_torso');
  });

  it('should have left torso on roll of 7', () => {
    expect(LEFT_HIT_LOCATION_TABLE[7]).toBe('left_torso');
  });

  it('should have head on roll of 12', () => {
    expect(LEFT_HIT_LOCATION_TABLE[12]).toBe('head');
  });
});

describe('RIGHT_HIT_LOCATION_TABLE', () => {
  it('should have entries for all 2d6 rolls', () => {
    for (let roll = 2; roll <= 12; roll++) {
      expect(RIGHT_HIT_LOCATION_TABLE[roll]).toBeDefined();
    }
  });

  it('should have right torso on roll of 2 (critical)', () => {
    expect(RIGHT_HIT_LOCATION_TABLE[2]).toBe('right_torso');
  });

  it('should have right torso on roll of 7', () => {
    expect(RIGHT_HIT_LOCATION_TABLE[7]).toBe('right_torso');
  });

  it('should have head on roll of 12', () => {
    expect(RIGHT_HIT_LOCATION_TABLE[12]).toBe('head');
  });
});

describe('REAR_HIT_LOCATION_TABLE', () => {
  it('should have entries for all 2d6 rolls', () => {
    for (let roll = 2; roll <= 12; roll++) {
      expect(REAR_HIT_LOCATION_TABLE[roll]).toBeDefined();
    }
  });

  it('should have center torso rear on roll of 2', () => {
    expect(REAR_HIT_LOCATION_TABLE[2]).toBe('center_torso_rear');
  });

  it('should have center torso rear on roll of 7', () => {
    expect(REAR_HIT_LOCATION_TABLE[7]).toBe('center_torso_rear');
  });

  it('should use rear torso locations', () => {
    expect(REAR_HIT_LOCATION_TABLE[6]).toBe('right_torso_rear');
    expect(REAR_HIT_LOCATION_TABLE[8]).toBe('left_torso_rear');
  });
});

describe('getHitLocationTable', () => {
  it('should return front table for front arc', () => {
    const table = getHitLocationTable(FiringArc.Front);
    expect(table).toBe(FRONT_HIT_LOCATION_TABLE);
  });

  it('should return left table for left arc', () => {
    const table = getHitLocationTable(FiringArc.Left);
    expect(table).toBe(LEFT_HIT_LOCATION_TABLE);
  });

  it('should return right table for right arc', () => {
    const table = getHitLocationTable(FiringArc.Right);
    expect(table).toBe(RIGHT_HIT_LOCATION_TABLE);
  });

  it('should return rear table for rear arc', () => {
    const table = getHitLocationTable(FiringArc.Rear);
    expect(table).toBe(REAR_HIT_LOCATION_TABLE);
  });
});

// =============================================================================
// Dice Rolling Tests
// =============================================================================

describe('rollD6', () => {
  it('should return values between 1 and 6', () => {
    const results = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const roll = rollD6();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
      results.add(roll);
    }
    // Should have seen multiple different values
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('roll2d6', () => {
  it('should return total between 2 and 12', () => {
    for (let i = 0; i < 50; i++) {
      const result = roll2d6();
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeLessThanOrEqual(12);
    }
  });

  it('should return two dice values', () => {
    const result = roll2d6();
    expect(result.dice).toHaveLength(2);
    expect(result.dice[0]).toBeGreaterThanOrEqual(1);
    expect(result.dice[0]).toBeLessThanOrEqual(6);
    expect(result.dice[1]).toBeGreaterThanOrEqual(1);
    expect(result.dice[1]).toBeLessThanOrEqual(6);
  });

  it('should calculate total correctly', () => {
    const result = roll2d6();
    expect(result.total).toBe(result.dice[0] + result.dice[1]);
  });

  it('should detect snake eyes correctly', () => {
    // Use createDiceRoll for deterministic test
    const snakeEyes = createDiceRoll(1, 1);
    expect(snakeEyes.isSnakeEyes).toBe(true);
    expect(snakeEyes.total).toBe(2);
  });

  it('should detect boxcars correctly', () => {
    const boxcars = createDiceRoll(6, 6);
    expect(boxcars.isBoxcars).toBe(true);
    expect(boxcars.total).toBe(12);
  });
});

describe('createDiceRoll', () => {
  it('should create a roll with specified dice values', () => {
    const roll = createDiceRoll(3, 4);

    expect(roll.dice).toEqual([3, 4]);
    expect(roll.total).toBe(7);
    expect(roll.isSnakeEyes).toBe(false);
    expect(roll.isBoxcars).toBe(false);
  });

  it('should identify snake eyes', () => {
    const roll = createDiceRoll(1, 1);
    expect(roll.isSnakeEyes).toBe(true);
  });

  it('should identify boxcars', () => {
    const roll = createDiceRoll(6, 6);
    expect(roll.isBoxcars).toBe(true);
  });
});

// =============================================================================
// Hit Location Determination Tests
// =============================================================================

describe('determineHitLocation', () => {
  it('should return valid hit result for front arc', () => {
    const result = determineHitLocation(FiringArc.Front);

    expect(result.roll).toBeDefined();
    expect(result.arc).toBe(FiringArc.Front);
    expect(result.location).toBeDefined();
    expect(typeof result.isCritical).toBe('boolean');
  });

  it('should return valid hit result for all arcs', () => {
    const arcs = [
      FiringArc.Front,
      FiringArc.Left,
      FiringArc.Right,
      FiringArc.Rear,
    ];

    for (const arc of arcs) {
      const result = determineHitLocation(arc);
      expect(result.arc).toBe(arc);
      expect(result.location).toBeDefined();
    }
  });
});

describe('determineHitLocationFromRoll', () => {
  it('should determine location from specific roll', () => {
    const roll = createDiceRoll(3, 4); // total 7
    const result = determineHitLocationFromRoll(FiringArc.Front, roll);

    expect(result.location).toBe('center_torso');
    expect(result.roll).toBe(roll);
    expect(result.arc).toBe(FiringArc.Front);
  });

  it('should mark head hit as critical', () => {
    const roll = createDiceRoll(6, 6); // total 12 = head
    const result = determineHitLocationFromRoll(FiringArc.Front, roll);

    expect(result.location).toBe('head');
    expect(result.isCritical).toBe(true);
  });

  it('should mark roll of 2 as critical', () => {
    const roll = createDiceRoll(1, 1); // total 2
    const result = determineHitLocationFromRoll(FiringArc.Front, roll);

    expect(result.isCritical).toBe(true);
  });

  it('should use correct table for each arc', () => {
    const roll = createDiceRoll(3, 4); // total 7

    const front = determineHitLocationFromRoll(FiringArc.Front, roll);
    const left = determineHitLocationFromRoll(FiringArc.Left, roll);
    const right = determineHitLocationFromRoll(FiringArc.Right, roll);
    const rear = determineHitLocationFromRoll(FiringArc.Rear, roll);

    expect(front.location).toBe('center_torso');
    expect(left.location).toBe('left_torso');
    expect(right.location).toBe('right_torso');
    expect(rear.location).toBe('center_torso_rear');
  });
});

// =============================================================================
// Location Classification Tests
// =============================================================================

describe('isCriticalLocation', () => {
  it('should return true for head', () => {
    expect(isCriticalLocation('head')).toBe(true);
  });

  it('should return true for center torso', () => {
    expect(isCriticalLocation('center_torso')).toBe(true);
  });

  it('should return true for center torso rear', () => {
    expect(isCriticalLocation('center_torso_rear')).toBe(true);
  });

  it('should return false for limbs', () => {
    expect(isCriticalLocation('left_arm')).toBe(false);
    expect(isCriticalLocation('right_arm')).toBe(false);
    expect(isCriticalLocation('left_leg')).toBe(false);
    expect(isCriticalLocation('right_leg')).toBe(false);
  });

  it('should return false for side torsos', () => {
    expect(isCriticalLocation('left_torso')).toBe(false);
    expect(isCriticalLocation('right_torso')).toBe(false);
  });
});

describe('isHeadHit', () => {
  it('should return true for head', () => {
    expect(isHeadHit('head')).toBe(true);
  });

  it('should return false for other locations', () => {
    expect(isHeadHit('center_torso')).toBe(false);
    expect(isHeadHit('left_arm')).toBe(false);
    expect(isHeadHit('right_leg')).toBe(false);
  });
});

describe('usesRearArmor', () => {
  it('should return true for rear torso locations', () => {
    expect(usesRearArmor('center_torso_rear')).toBe(true);
    expect(usesRearArmor('left_torso_rear')).toBe(true);
    expect(usesRearArmor('right_torso_rear')).toBe(true);
  });

  it('should return false for front locations', () => {
    expect(usesRearArmor('center_torso')).toBe(false);
    expect(usesRearArmor('left_torso')).toBe(false);
    expect(usesRearArmor('right_torso')).toBe(false);
    expect(usesRearArmor('head')).toBe(false);
    expect(usesRearArmor('left_arm')).toBe(false);
  });
});

// =============================================================================
// Physical Attack Tables Tests
// =============================================================================

describe('PUNCH_HIT_LOCATION_TABLE', () => {
  it('should have entries for all d6 rolls (1-6)', () => {
    for (let roll = 1; roll <= 6; roll++) {
      expect(PUNCH_HIT_LOCATION_TABLE[roll]).toBeDefined();
    }
  });

  it('should have head on roll of 6', () => {
    expect(PUNCH_HIT_LOCATION_TABLE[6]).toBe('head');
  });

  it('should have center torso on roll of 3', () => {
    expect(PUNCH_HIT_LOCATION_TABLE[3]).toBe('center_torso');
  });
});

describe('KICK_HIT_LOCATION_TABLE', () => {
  it('should have entries for all d6 rolls (1-6)', () => {
    for (let roll = 1; roll <= 6; roll++) {
      expect(KICK_HIT_LOCATION_TABLE[roll]).toBeDefined();
    }
  });

  it('should only hit legs', () => {
    for (let roll = 1; roll <= 6; roll++) {
      const location = KICK_HIT_LOCATION_TABLE[roll];
      expect(['left_leg', 'right_leg']).toContain(location);
    }
  });
});

describe('determinePunchLocation', () => {
  it('should return a valid punch location', () => {
    const result = determinePunchLocation();

    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(6);
    expect(result.location).toBe(PUNCH_HIT_LOCATION_TABLE[result.roll]);
  });
});

describe('determineKickLocation', () => {
  it('should return a valid kick location', () => {
    const result = determineKickLocation();

    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(6);
    expect(['left_leg', 'right_leg']).toContain(result.location);
  });
});

// =============================================================================
// Cluster Damage Distribution Tests
// =============================================================================

describe('distributeClusterHits', () => {
  it('should return correct number of hits', () => {
    const results = distributeClusterHits(FiringArc.Front, 5, 1);
    expect(results).toHaveLength(5);
  });

  it('should set correct damage per hit', () => {
    const results = distributeClusterHits(FiringArc.Front, 3, 2);

    for (const result of results) {
      expect(result.damage).toBe(2);
    }
  });

  it('should include roll for each hit', () => {
    const results = distributeClusterHits(FiringArc.Front, 3, 1);

    for (const result of results) {
      expect(result.roll).toBeDefined();
      expect(result.roll.total).toBeGreaterThanOrEqual(2);
      expect(result.roll.total).toBeLessThanOrEqual(12);
    }
  });

  it('should return empty array for 0 hits', () => {
    const results = distributeClusterHits(FiringArc.Front, 0, 1);
    expect(results).toHaveLength(0);
  });
});

describe('groupHitsByLocation', () => {
  it('should group hits by location', () => {
    const hits = [
      { location: 'center_torso' as CombatLocation, damage: 5 },
      { location: 'center_torso' as CombatLocation, damage: 5 },
      { location: 'left_arm' as CombatLocation, damage: 5 },
    ];

    const grouped = groupHitsByLocation(hits);

    expect(grouped.get('center_torso')).toBe(10);
    expect(grouped.get('left_arm')).toBe(5);
  });

  it('should handle empty array', () => {
    const grouped = groupHitsByLocation([]);
    expect(grouped.size).toBe(0);
  });

  it('should sum damage per location', () => {
    const hits = [
      { location: 'right_leg' as CombatLocation, damage: 3 },
      { location: 'right_leg' as CombatLocation, damage: 4 },
      { location: 'right_leg' as CombatLocation, damage: 5 },
    ];

    const grouped = groupHitsByLocation(hits);
    expect(grouped.get('right_leg')).toBe(12);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('getLocationDisplayName', () => {
  it('should return correct display names', () => {
    expect(getLocationDisplayName('head')).toBe('Head');
    expect(getLocationDisplayName('center_torso')).toBe('Center Torso');
    expect(getLocationDisplayName('center_torso_rear')).toBe(
      'Center Torso (Rear)',
    );
    expect(getLocationDisplayName('left_torso')).toBe('Left Torso');
    expect(getLocationDisplayName('left_torso_rear')).toBe('Left Torso (Rear)');
    expect(getLocationDisplayName('right_torso')).toBe('Right Torso');
    expect(getLocationDisplayName('right_torso_rear')).toBe(
      'Right Torso (Rear)',
    );
    expect(getLocationDisplayName('left_arm')).toBe('Left Arm');
    expect(getLocationDisplayName('right_arm')).toBe('Right Arm');
    expect(getLocationDisplayName('left_leg')).toBe('Left Leg');
    expect(getLocationDisplayName('right_leg')).toBe('Right Leg');
  });
});

describe('getStandardLocations', () => {
  it('should return 8 standard locations', () => {
    const locations = getStandardLocations();
    expect(locations).toHaveLength(8);
  });

  it('should include all standard locations', () => {
    const locations = getStandardLocations();

    expect(locations).toContain('head');
    expect(locations).toContain('center_torso');
    expect(locations).toContain('left_torso');
    expect(locations).toContain('right_torso');
    expect(locations).toContain('left_arm');
    expect(locations).toContain('right_arm');
    expect(locations).toContain('left_leg');
    expect(locations).toContain('right_leg');
  });

  it('should not include rear locations', () => {
    const locations = getStandardLocations();

    expect(locations).not.toContain('center_torso_rear');
    expect(locations).not.toContain('left_torso_rear');
    expect(locations).not.toContain('right_torso_rear');
  });
});

describe('getAllLocations', () => {
  it('should return 11 total locations', () => {
    const locations = getAllLocations();
    expect(locations).toHaveLength(11);
  });

  it('should include all locations including rear', () => {
    const locations = getAllLocations();

    expect(locations).toContain('head');
    expect(locations).toContain('center_torso');
    expect(locations).toContain('center_torso_rear');
    expect(locations).toContain('left_torso');
    expect(locations).toContain('left_torso_rear');
    expect(locations).toContain('right_torso');
    expect(locations).toContain('right_torso_rear');
    expect(locations).toContain('left_arm');
    expect(locations).toContain('right_arm');
    expect(locations).toContain('left_leg');
    expect(locations).toContain('right_leg');
  });
});
