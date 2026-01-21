/**
 * Cluster Weapons Tests
 *
 * Tests for BattleTech cluster hit table and cluster damage resolution.
 */

import {
  CLUSTER_HIT_TABLE,
  CLUSTER_SIZES,
  getNearestClusterSize,
  lookupClusterHits,
  rollClusterHits,
  determineClusterHitLocations,
  resolveClusterAttack,
  CLUSTER_WEAPON_SIZES,
  getClusterSizeForWeapon,
  isStreakWeapon,
  resolveStreakAttack,
  groupClusterHitsByLocation,
  formatClusterResult,
} from '../clusterWeapons';
import { FiringArc, IWeaponAttack, CombatLocation, WeaponCategory } from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

function createClusterWeapon(overrides: Partial<IWeaponAttack> = {}): IWeaponAttack {
  return {
    weaponId: 'lrm-10',
    weaponName: 'LRM-10',
    damage: 1,
    heat: 4,
    category: WeaponCategory.MISSILE,
    minRange: 6,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    isCluster: true,
    clusterSize: 10,
    ...overrides,
  };
}

function createNonClusterWeapon(): IWeaponAttack {
  return {
    weaponId: 'medium-laser',
    weaponName: 'Medium Laser',
    damage: 5,
    heat: 3,
    category: WeaponCategory.ENERGY,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    isCluster: false,
  };
}

// =============================================================================
// Cluster Hit Table Tests
// =============================================================================

describe('CLUSTER_HIT_TABLE', () => {
  it('should have entries for all valid 2d6 rolls (2-12)', () => {
    for (let roll = 2; roll <= 12; roll++) {
      expect(CLUSTER_HIT_TABLE[roll]).toBeDefined();
    }
  });

  it('should have entries for all standard cluster sizes', () => {
    const expectedSizes = [2, 4, 5, 6, 10, 15, 20];
    for (const roll of Object.keys(CLUSTER_HIT_TABLE).map(Number)) {
      for (const size of expectedSizes) {
        expect(CLUSTER_HIT_TABLE[roll][size]).toBeDefined();
      }
    }
  });

  it('should have increasing hits for higher rolls', () => {
    // For any cluster size, roll 12 should give max hits
    expect(CLUSTER_HIT_TABLE[12][10]).toBeGreaterThanOrEqual(CLUSTER_HIT_TABLE[2][10]);
    expect(CLUSTER_HIT_TABLE[12][20]).toBeGreaterThanOrEqual(CLUSTER_HIT_TABLE[2][20]);
  });

  it('should have correct maximum hits for cluster size 20', () => {
    expect(CLUSTER_HIT_TABLE[11][20]).toBe(20);
    expect(CLUSTER_HIT_TABLE[12][20]).toBe(20);
  });

  it('should have minimum hits even on roll of 2', () => {
    expect(CLUSTER_HIT_TABLE[2][2]).toBeGreaterThanOrEqual(1);
    expect(CLUSTER_HIT_TABLE[2][10]).toBeGreaterThanOrEqual(1);
  });
});

describe('CLUSTER_SIZES', () => {
  it('should contain standard cluster sizes', () => {
    expect(CLUSTER_SIZES).toContain(2);
    expect(CLUSTER_SIZES).toContain(5);
    expect(CLUSTER_SIZES).toContain(10);
    expect(CLUSTER_SIZES).toContain(20);
  });

  it('should be in ascending order', () => {
    for (let i = 1; i < CLUSTER_SIZES.length; i++) {
      expect(CLUSTER_SIZES[i]).toBeGreaterThan(CLUSTER_SIZES[i - 1]);
    }
  });
});

// =============================================================================
// Cluster Size Lookup Tests
// =============================================================================

describe('getNearestClusterSize', () => {
  it('should return 2 for sizes <= 2', () => {
    expect(getNearestClusterSize(1)).toBe(2);
    expect(getNearestClusterSize(2)).toBe(2);
  });

  it('should return correct size for exact matches', () => {
    expect(getNearestClusterSize(4)).toBe(4);
    expect(getNearestClusterSize(5)).toBe(5);
    expect(getNearestClusterSize(6)).toBe(6);
    expect(getNearestClusterSize(10)).toBe(10);
    expect(getNearestClusterSize(15)).toBe(15);
    expect(getNearestClusterSize(20)).toBe(20);
  });

  it('should round up to nearest cluster size in table', () => {
    // Size 3 uses 4 column (since 3 <= 4)
    expect(getNearestClusterSize(3)).toBe(4);
    // Size 7-10 use 10 column (since 7 > 6 but 7 <= 10)
    expect(getNearestClusterSize(7)).toBe(10);
    expect(getNearestClusterSize(8)).toBe(10);
    expect(getNearestClusterSize(9)).toBe(10);
    // Size 11-15 use 15 column
    expect(getNearestClusterSize(12)).toBe(15);
    expect(getNearestClusterSize(14)).toBe(15);
    // Size 16-20 use 20 column
    expect(getNearestClusterSize(18)).toBe(20);
  });

  it('should return 20 for sizes > 20', () => {
    expect(getNearestClusterSize(25)).toBe(20);
    expect(getNearestClusterSize(40)).toBe(20);
    expect(getNearestClusterSize(100)).toBe(20);
  });
});

describe('lookupClusterHits', () => {
  it('should return correct hits for standard rolls', () => {
    expect(lookupClusterHits(7, 10)).toBe(6);
    expect(lookupClusterHits(12, 10)).toBe(10);
    expect(lookupClusterHits(2, 10)).toBe(3);
  });

  it('should handle non-standard cluster sizes by rounding up', () => {
    // Size 8 should use the 10 column (since 8 > 6 but 8 <= 10)
    expect(lookupClusterHits(7, 8)).toBe(lookupClusterHits(7, 10));
  });

  it('should clamp out-of-range rolls', () => {
    // Roll < 2 should use 2
    expect(lookupClusterHits(1, 10)).toBe(CLUSTER_HIT_TABLE[2][10]);
    // Roll > 12 should use 12
    expect(lookupClusterHits(15, 10)).toBe(CLUSTER_HIT_TABLE[12][10]);
  });
});

describe('rollClusterHits', () => {
  it('should return a roll and hit count', () => {
    const result = rollClusterHits(10);

    expect(result.roll).toBeDefined();
    expect(result.roll.dice).toHaveLength(2);
    expect(result.roll.total).toBeGreaterThanOrEqual(2);
    expect(result.roll.total).toBeLessThanOrEqual(12);
    expect(result.hits).toBeGreaterThanOrEqual(1);
    expect(result.hits).toBeLessThanOrEqual(10);
  });

  it('should return hits consistent with the roll', () => {
    // Run multiple times to verify consistency
    for (let i = 0; i < 10; i++) {
      const result = rollClusterHits(20);
      const expectedHits = lookupClusterHits(result.roll.total, 20);
      expect(result.hits).toBe(expectedHits);
    }
  });
});

// =============================================================================
// Cluster Hit Location Tests
// =============================================================================

describe('determineClusterHitLocations', () => {
  it('should return correct number of hit locations', () => {
    const locations = determineClusterHitLocations(FiringArc.Front, 5, 1);

    expect(locations).toHaveLength(5);
  });

  it('should have correct damage per hit', () => {
    const locations = determineClusterHitLocations(FiringArc.Front, 3, 2);

    for (const hit of locations) {
      expect(hit.damage).toBe(2);
    }
  });

  it('should have valid hit locations', () => {
    const validLocations: CombatLocation[] = [
      'head',
      'center_torso',
      'left_torso',
      'right_torso',
      'left_arm',
      'right_arm',
      'left_leg',
      'right_leg',
    ];
    const locations = determineClusterHitLocations(FiringArc.Front, 10, 1);

    for (const hit of locations) {
      expect(validLocations).toContain(hit.location);
    }
  });

  it('should return empty array for 0 hits', () => {
    const locations = determineClusterHitLocations(FiringArc.Front, 0, 1);
    expect(locations).toHaveLength(0);
  });

  it('should include roll information for each hit', () => {
    const locations = determineClusterHitLocations(FiringArc.Front, 3, 1);

    for (const hit of locations) {
      expect(hit.roll).toBeDefined();
      expect(hit.roll.total).toBeGreaterThanOrEqual(2);
      expect(hit.roll.total).toBeLessThanOrEqual(12);
    }
  });
});

// =============================================================================
// Cluster Attack Resolution Tests
// =============================================================================

describe('resolveClusterAttack', () => {
  it('should throw for non-cluster weapon', () => {
    const weapon = createNonClusterWeapon();

    expect(() => resolveClusterAttack(weapon, FiringArc.Front)).toThrow(
      'is not a cluster weapon'
    );
  });

  it('should return complete cluster result', () => {
    const weapon = createClusterWeapon({ clusterSize: 10, damage: 1 });
    const result = resolveClusterAttack(weapon, FiringArc.Front);

    expect(result.weapon).toBe(weapon);
    expect(result.clusterRoll).toBeDefined();
    expect(result.hitsScored).toBeGreaterThanOrEqual(1);
    expect(result.hitsScored).toBeLessThanOrEqual(10);
    expect(result.damagePerHit).toBe(1);
    expect(result.totalDamage).toBe(result.hitsScored * result.damagePerHit);
    expect(result.hitDistribution).toHaveLength(result.hitsScored);
  });

  it('should calculate total damage correctly', () => {
    const weapon = createClusterWeapon({ clusterSize: 6, damage: 2 });
    const result = resolveClusterAttack(weapon, FiringArc.Front);

    expect(result.totalDamage).toBe(result.hitsScored * 2);
  });

  it('should work with different firing arcs', () => {
    const weapon = createClusterWeapon();

    const frontResult = resolveClusterAttack(weapon, FiringArc.Front);
    const rearResult = resolveClusterAttack(weapon, FiringArc.Rear);

    expect(frontResult.hitDistribution.length).toBeGreaterThanOrEqual(1);
    expect(rearResult.hitDistribution.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Cluster Weapon Definitions Tests
// =============================================================================

describe('CLUSTER_WEAPON_SIZES', () => {
  it('should have correct LRM sizes', () => {
    expect(CLUSTER_WEAPON_SIZES['lrm-5']).toBe(5);
    expect(CLUSTER_WEAPON_SIZES['lrm-10']).toBe(10);
    expect(CLUSTER_WEAPON_SIZES['lrm-15']).toBe(15);
    expect(CLUSTER_WEAPON_SIZES['lrm-20']).toBe(20);
  });

  it('should have correct SRM sizes', () => {
    expect(CLUSTER_WEAPON_SIZES['srm-2']).toBe(2);
    expect(CLUSTER_WEAPON_SIZES['srm-4']).toBe(4);
    expect(CLUSTER_WEAPON_SIZES['srm-6']).toBe(6);
  });

  it('should have LB-X autocannon sizes', () => {
    expect(CLUSTER_WEAPON_SIZES['lb-2-x']).toBe(2);
    expect(CLUSTER_WEAPON_SIZES['lb-5-x']).toBe(5);
    expect(CLUSTER_WEAPON_SIZES['lb-10-x']).toBe(10);
    expect(CLUSTER_WEAPON_SIZES['lb-20-x']).toBe(20);
  });
});

describe('getClusterSizeForWeapon', () => {
  it('should return correct size for known weapons', () => {
    expect(getClusterSizeForWeapon('lrm-10')).toBe(10);
    expect(getClusterSizeForWeapon('srm-6')).toBe(6);
  });

  it('should be case-insensitive', () => {
    expect(getClusterSizeForWeapon('LRM-10')).toBe(10);
    expect(getClusterSizeForWeapon('LRM-10')).toBe(10);
  });

  it('should return undefined for unknown weapons', () => {
    expect(getClusterSizeForWeapon('medium-laser')).toBeUndefined();
    expect(getClusterSizeForWeapon('unknown-weapon')).toBeUndefined();
  });
});

// =============================================================================
// Streak Weapon Tests
// =============================================================================

describe('isStreakWeapon', () => {
  it('should return true for streak weapons', () => {
    expect(isStreakWeapon('streak-srm-2')).toBe(true);
    expect(isStreakWeapon('streak-srm-4')).toBe(true);
    expect(isStreakWeapon('streak-srm-6')).toBe(true);
    expect(isStreakWeapon('STREAK-SRM-4')).toBe(true);
  });

  it('should return false for non-streak weapons', () => {
    expect(isStreakWeapon('srm-6')).toBe(false);
    expect(isStreakWeapon('lrm-10')).toBe(false);
    expect(isStreakWeapon('medium-laser')).toBe(false);
  });
});

describe('resolveStreakAttack', () => {
  it('should throw for weapon without cluster size', () => {
    const weapon = createClusterWeapon({ clusterSize: undefined });

    expect(() => resolveStreakAttack(weapon, FiringArc.Front)).toThrow(
      'has no cluster size'
    );
  });

  it('should have all missiles hit', () => {
    const weapon = createClusterWeapon({
      weaponId: 'streak-srm-6',
      weaponName: 'Streak SRM-6',
      clusterSize: 6,
      damage: 2,
    });
    const result = resolveStreakAttack(weapon, FiringArc.Front);

    expect(result.hitsScored).toBe(6);
    expect(result.hitDistribution).toHaveLength(6);
  });

  it('should calculate total damage correctly', () => {
    const weapon = createClusterWeapon({
      clusterSize: 4,
      damage: 2,
    });
    const result = resolveStreakAttack(weapon, FiringArc.Front);

    expect(result.totalDamage).toBe(4 * 2); // 4 missiles * 2 damage each
  });

  it('should have a perfect cluster roll (12)', () => {
    const weapon = createClusterWeapon({ clusterSize: 6 });
    const result = resolveStreakAttack(weapon, FiringArc.Front);

    expect(result.clusterRoll.total).toBe(12);
    expect(result.clusterRoll.isBoxcars).toBe(true);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('groupClusterHitsByLocation', () => {
  it('should group hits by location', () => {
    const hits = [
      { location: 'center_torso' as CombatLocation, roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
      { location: 'center_torso' as CombatLocation, roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
      { location: 'left_arm' as CombatLocation, roll: { dice: [1, 2], total: 3, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
    ];

    const grouped = groupClusterHitsByLocation(hits);

    expect(grouped.get('center_torso')).toEqual({ count: 2, totalDamage: 2 });
    expect(grouped.get('left_arm')).toEqual({ count: 1, totalDamage: 1 });
  });

  it('should handle empty hits array', () => {
    const grouped = groupClusterHitsByLocation([]);
    expect(grouped.size).toBe(0);
  });

  it('should calculate total damage per location', () => {
    const hits = [
      { location: 'right_leg' as CombatLocation, roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false }, damage: 2 },
      { location: 'right_leg' as CombatLocation, roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false }, damage: 2 },
      { location: 'right_leg' as CombatLocation, roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false }, damage: 2 },
    ];

    const grouped = groupClusterHitsByLocation(hits);
    const rightLeg = grouped.get('right_leg');

    expect(rightLeg?.count).toBe(3);
    expect(rightLeg?.totalDamage).toBe(6);
  });
});

describe('formatClusterResult', () => {
  it('should format cluster result for display', () => {
    const weapon = createClusterWeapon({
      weaponName: 'LRM-10',
      clusterSize: 10,
      damage: 1,
    });

    // Mock a cluster result
    const result = {
      weapon,
      clusterRoll: { dice: [4, 3], total: 7, isSnakeEyes: false, isBoxcars: false },
      hitsScored: 6,
      damagePerHit: 1,
      totalDamage: 6,
      hitDistribution: [
        { location: 'center_torso' as CombatLocation, roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
        { location: 'center_torso' as CombatLocation, roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
        { location: 'left_arm' as CombatLocation, roll: { dice: [1, 2], total: 3, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
        { location: 'left_arm' as CombatLocation, roll: { dice: [1, 3], total: 4, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
        { location: 'right_leg' as CombatLocation, roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
        { location: 'head' as CombatLocation, roll: { dice: [6, 6], total: 12, isSnakeEyes: false, isBoxcars: true }, damage: 1 },
      ],
    };

    const formatted = formatClusterResult(result);

    expect(formatted).toContain('LRM-10');
    expect(formatted).toContain('6 hits');
    expect(formatted).toContain('roll: 7');
    expect(formatted).toContain('Total damage: 6');
    expect(formatted).toContain('center_torso');
  });

  it('should include all hit locations in output', () => {
    const weapon = createClusterWeapon();
    const result = {
      weapon,
      clusterRoll: { dice: [5, 5], total: 10, isSnakeEyes: false, isBoxcars: false },
      hitsScored: 3,
      damagePerHit: 1,
      totalDamage: 3,
      hitDistribution: [
        { location: 'head' as CombatLocation, roll: { dice: [6, 6], total: 12, isSnakeEyes: false, isBoxcars: true }, damage: 1 },
        { location: 'left_torso' as CombatLocation, roll: { dice: [4, 4], total: 8, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
        { location: 'right_arm' as CombatLocation, roll: { dice: [2, 1], total: 3, isSnakeEyes: false, isBoxcars: false }, damage: 1 },
      ],
    };

    const formatted = formatClusterResult(result);

    expect(formatted).toContain('head');
    expect(formatted).toContain('left_torso');
    expect(formatted).toContain('right_arm');
  });
});
