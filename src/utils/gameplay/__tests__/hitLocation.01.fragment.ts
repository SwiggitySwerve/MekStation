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
  isLegLocation,
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
