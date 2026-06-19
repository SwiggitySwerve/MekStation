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
      'has no cluster size',
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
      {
        location: 'center_torso' as CombatLocation,
        roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false },
        damage: 1,
      },
      {
        location: 'center_torso' as CombatLocation,
        roll: { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false },
        damage: 1,
      },
      {
        location: 'left_arm' as CombatLocation,
        roll: { dice: [1, 2], total: 3, isSnakeEyes: false, isBoxcars: false },
        damage: 1,
      },
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
      {
        location: 'right_leg' as CombatLocation,
        roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false },
        damage: 2,
      },
      {
        location: 'right_leg' as CombatLocation,
        roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false },
        damage: 2,
      },
      {
        location: 'right_leg' as CombatLocation,
        roll: { dice: [2, 3], total: 5, isSnakeEyes: false, isBoxcars: false },
        damage: 2,
      },
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
      clusterRoll: {
        dice: [4, 3],
        total: 7,
        isSnakeEyes: false,
        isBoxcars: false,
      },
      hitsScored: 6,
      damagePerHit: 1,
      totalDamage: 6,
      hitDistribution: [
        {
          location: 'center_torso' as CombatLocation,
          roll: {
            dice: [3, 4],
            total: 7,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
        {
          location: 'center_torso' as CombatLocation,
          roll: {
            dice: [3, 4],
            total: 7,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
        {
          location: 'left_arm' as CombatLocation,
          roll: {
            dice: [1, 2],
            total: 3,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
        {
          location: 'left_arm' as CombatLocation,
          roll: {
            dice: [1, 3],
            total: 4,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
        {
          location: 'right_leg' as CombatLocation,
          roll: {
            dice: [2, 3],
            total: 5,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
        {
          location: 'head' as CombatLocation,
          roll: {
            dice: [6, 6],
            total: 12,
            isSnakeEyes: false,
            isBoxcars: true,
          },
          damage: 1,
        },
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
      clusterRoll: {
        dice: [5, 5],
        total: 10,
        isSnakeEyes: false,
        isBoxcars: false,
      },
      hitsScored: 3,
      damagePerHit: 1,
      totalDamage: 3,
      hitDistribution: [
        {
          location: 'head' as CombatLocation,
          roll: {
            dice: [6, 6],
            total: 12,
            isSnakeEyes: false,
            isBoxcars: true,
          },
          damage: 1,
        },
        {
          location: 'left_torso' as CombatLocation,
          roll: {
            dice: [4, 4],
            total: 8,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
        {
          location: 'right_arm' as CombatLocation,
          roll: {
            dice: [2, 1],
            total: 3,
            isSnakeEyes: false,
            isBoxcars: false,
          },
          damage: 1,
        },
      ],
    };

    const formatted = formatClusterResult(result);

    expect(formatted).toContain('head');
    expect(formatted).toContain('left_torso');
    expect(formatted).toContain('right_arm');
  });
});
