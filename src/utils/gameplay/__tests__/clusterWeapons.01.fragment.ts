/**
 * Cluster Weapons Tests
 *
 * Tests for BattleTech cluster hit table and cluster damage resolution.
 */

import {
  FiringArc,
  IWeaponAttack,
  CombatLocation,
  WeaponCategory,
} from '@/types/gameplay';

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

// =============================================================================
// Test Fixtures
// =============================================================================

function createClusterWeapon(
  overrides: Partial<IWeaponAttack> = {},
): IWeaponAttack {
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
    const expectedSizes = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
    for (const roll of Object.keys(CLUSTER_HIT_TABLE).map(Number)) {
      for (const size of expectedSizes) {
        expect(CLUSTER_HIT_TABLE[roll][size]).toBeDefined();
      }
    }
  });

  it('should have increasing hits for higher rolls', () => {
    // For any cluster size, roll 12 should give max hits
    expect(CLUSTER_HIT_TABLE[12][10]).toBeGreaterThanOrEqual(
      CLUSTER_HIT_TABLE[2][10],
    );
    expect(CLUSTER_HIT_TABLE[12][20]).toBeGreaterThanOrEqual(
      CLUSTER_HIT_TABLE[2][20],
    );
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

  it('should return exact sizes now that all columns exist', () => {
    expect(getNearestClusterSize(3)).toBe(3);
    expect(getNearestClusterSize(7)).toBe(7);
    expect(getNearestClusterSize(8)).toBe(8);
    expect(getNearestClusterSize(9)).toBe(9);
    expect(getNearestClusterSize(12)).toBe(12);
    expect(getNearestClusterSize(14)).toBe(15);
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

  it('should return exact values for now-supported sizes', () => {
    // Size 8 now has its own column
    expect(lookupClusterHits(7, 8)).toBe(CLUSTER_HIT_TABLE[7][8]);
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
      'is not a cluster weapon',
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
