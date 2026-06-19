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

  it('spends Edge and replaces a head-hit location result', () => {
    const roll = createDiceRoll(6, 6); // total 12 = head
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      edge: {
        edgePointsRemaining: 1,
        pilotAbilities: ['edge_when_headhit'],
        turn: 3,
        unitId: 'target-1',
        reroll: () => createDiceRoll(3, 4),
      },
    });

    expect(result.location).toBe('center_torso');
    expect(result.roll.total).toBe(7);
    expect(result).toMatchObject({
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_headhit',
      edgePointsRemaining: 0,
      supersededLocation: 'head',
    });
    expect(result.supersededRoll).toBe(roll);
  });

  it('spends Edge and replaces a TAC hit-location result', () => {
    const roll = createDiceRoll(1, 1); // total 2 = TAC trigger
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      edge: {
        edgePointsRemaining: 1,
        pilotAbilities: ['edge_when_tac'],
        turn: 3,
        unitId: 'target-1',
        reroll: () => createDiceRoll(3, 3),
      },
    });

    expect(result.location).toBe('right_torso');
    expect(result.roll.total).toBe(6);
    expect(result.isCritical).toBe(false);
    expect(result).toMatchObject({
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_tac',
      edgePointsRemaining: 0,
      supersededLocation: 'center_torso',
    });
    expect(result.supersededRoll).toBe(roll);
  });

  it('does not reroll hit location when the matching Edge ability is absent', () => {
    const roll = createDiceRoll(6, 6);
    const result = determineHitLocationFromRoll(FiringArc.Front, roll, {
      edge: {
        edgePointsRemaining: 1,
        pilotAbilities: [],
        reroll: () => {
          throw new Error('unexpected reroll');
        },
      },
    });

    expect(result.location).toBe('head');
    expect(result.edgeReroll).toBeUndefined();
    expect(result.edgePointsRemaining).toBeUndefined();
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
