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

describe('isLegLocation', () => {
  it('should return true for left_leg', () => {
    expect(isLegLocation('left_leg')).toBe(true);
  });

  it('should return true for right_leg', () => {
    expect(isLegLocation('right_leg')).toBe(true);
  });

  it('should return false for non-leg locations', () => {
    expect(isLegLocation('head')).toBe(false);
    expect(isLegLocation('center_torso')).toBe(false);
    expect(isLegLocation('left_arm')).toBe(false);
    expect(isLegLocation('right_arm')).toBe(false);
    expect(isLegLocation('left_torso')).toBe(false);
    expect(isLegLocation('right_torso')).toBe(false);
  });
});

describe('Hull-Down Hit Location Modification', () => {
  it('should redirect front-arc right_leg hit to center_torso when hull-down', () => {
    const roll = createDiceRoll(2, 3); // total 5 → right_leg
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('center_torso');
  });

  it('should redirect front-arc left_leg hit to center_torso when hull-down', () => {
    const roll = createDiceRoll(4, 5); // total 9 → left_leg
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('center_torso');
  });

  it('should not modify front-arc non-leg hits when hull-down', () => {
    const nonLegRolls: {
      die1: number;
      die2: number;
      expected: CombatLocation;
    }[] = [
      { die1: 1, die2: 1, expected: 'center_torso' },
      { die1: 1, die2: 2, expected: 'right_arm' },
      { die1: 2, die2: 2, expected: 'right_arm' },
      { die1: 3, die2: 3, expected: 'right_torso' },
      { die1: 3, die2: 4, expected: 'center_torso' },
      { die1: 4, die2: 4, expected: 'left_torso' },
      { die1: 4, die2: 6, expected: 'left_arm' },
      { die1: 5, die2: 6, expected: 'left_arm' },
      { die1: 6, die2: 6, expected: 'head' },
    ];

    for (const { die1, die2, expected } of nonLegRolls) {
      const roll = createDiceRoll(die1, die2);
      const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
        hullDown: true,
      });
      expect(result.location).toBe(expected);
    }
  });

  it('should NOT redirect left-arc leg hits when hull-down', () => {
    const roll = createDiceRoll(1, 2); // total 3 → left_leg in left arc
    const result = determineHitLocationFromRoll(FiringArc.Left, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('left_leg');
  });

  it('should NOT redirect right-arc leg hits when hull-down', () => {
    const roll = createDiceRoll(1, 2); // total 3 → right_leg in right arc
    const result = determineHitLocationFromRoll(FiringArc.Right, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('right_leg');
  });

  it('should NOT redirect rear-arc leg hits when hull-down', () => {
    const roll = createDiceRoll(2, 3); // total 5 → right_leg in rear arc
    const result = determineHitLocationFromRoll(FiringArc.Rear, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('right_leg');
  });

  it('should not redirect when hull-down is false', () => {
    const roll = createDiceRoll(2, 3); // total 5 → right_leg
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      hullDown: false,
    });

    expect(result.location).toBe('right_leg');
  });

  it('should not redirect when options are empty', () => {
    const roll = createDiceRoll(2, 3); // total 5 → right_leg
    const result = determineHitLocationFromRoll(FiringArc.Front, roll);

    expect(result.location).toBe('right_leg');
  });

  it('should mark hull-down redirected CT hit as critical', () => {
    const roll = createDiceRoll(2, 3); // total 5 → right_leg → CT
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('center_torso');
    expect(result.isCritical).toBe(true);
  });

  it('should handle snake-eyes (roll 2) with hull-down — already CT', () => {
    const roll = createDiceRoll(1, 1); // total 2 → center_torso
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      hullDown: true,
    });

    expect(result.location).toBe('center_torso');
    expect(result.isCritical).toBe(true);
  });
});
