/**
 * Award Interfaces Tests
 */

import {
  AwardRarity,
  AwardCategory,
  CriteriaType,
  IAward,
  IPilotAward,
  IPilotStats,
  isAward,
  isPilotAward,
  isPilotStats,
  createEmptyCombatStats,
  createEmptyCareerStats,
  createEmptyPilotStats,
  calculateProgress,
  getRarityColor,
  getRarityBackground,
} from '../AwardInterfaces';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestAward(overrides: Partial<IAward> = {}): IAward {
  return {
    id: 'test-award',
    name: 'Test Award',
    description: 'A test award',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Common,
    icon: 'test-icon',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 5,
      description: 'Get 5 kills',
    },
    repeatable: false,
    sortOrder: 100,
    ...overrides,
  };
}

function createTestPilotAward(
  overrides: Partial<IPilotAward> = {},
): IPilotAward {
  return {
    awardId: 'test-award',
    earnedAt: new Date().toISOString(),
    context: {},
    timesEarned: 1,
    ...overrides,
  };
}

// =============================================================================
// Enum Tests
// =============================================================================

describe('AwardRarity enum', () => {
  it('should have correct values', () => {
    expect(AwardRarity.Common).toBe('common');
    expect(AwardRarity.Uncommon).toBe('uncommon');
    expect(AwardRarity.Rare).toBe('rare');
    expect(AwardRarity.Legendary).toBe('legendary');
  });
});

describe('AwardCategory enum', () => {
  it('should have correct values', () => {
    expect(AwardCategory.Combat).toBe('combat');
    expect(AwardCategory.Survival).toBe('survival');
    expect(AwardCategory.Campaign).toBe('campaign');
    expect(AwardCategory.Service).toBe('service');
    expect(AwardCategory.Special).toBe('special');
  });
});

describe('CriteriaType enum', () => {
  it('should have correct values', () => {
    expect(CriteriaType.TotalKills).toBe('total_kills');
    expect(CriteriaType.KillsInMission).toBe('kills_in_mission');
    expect(CriteriaType.DamageDealt).toBe('damage_dealt');
    expect(CriteriaType.MissionsCompleted).toBe('missions_completed');
    expect(CriteriaType.CampaignsCompleted).toBe('campaigns_completed');
    expect(CriteriaType.GamesPlayed).toBe('games_played');
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('isAward', () => {
  it('should return true for valid award', () => {
    const award = createTestAward();
    expect(isAward(award)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isAward(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAward(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isAward('string')).toBe(false);
    expect(isAward(123)).toBe(false);
  });

  it('should return false for object missing required fields', () => {
    expect(isAward({ id: 'test' })).toBe(false);
    expect(isAward({ id: 'test', name: 'Test' })).toBe(false);
  });
});

describe('isPilotAward', () => {
  it('should return true for valid pilot award', () => {
    const pilotAward = createTestPilotAward();
    expect(isPilotAward(pilotAward)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPilotAward(null)).toBe(false);
  });

  it('should return false for object missing required fields', () => {
    expect(isPilotAward({ awardId: 'test' })).toBe(false);
  });
});

describe('isPilotStats', () => {
  it('should return true for valid pilot stats', () => {
    const stats = createEmptyPilotStats();
    expect(isPilotStats(stats)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPilotStats(null)).toBe(false);
  });

  it('should return false for object missing required fields', () => {
    expect(isPilotStats({ combat: {} })).toBe(false);
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createEmptyCombatStats', () => {
  it('should create stats with zero values', () => {
    const stats = createEmptyCombatStats();
    expect(stats.totalKills).toBe(0);
    expect(stats.maxKillsInMission).toBe(0);
    expect(stats.totalDamageDealt).toBe(0);
    expect(stats.maxDamageInMission).toBe(0);
    expect(stats.totalDamageReceived).toBe(0);
    expect(stats.criticalHits).toBe(0);
  });
});

describe('createEmptyCareerStats', () => {
  it('should create stats with zero values', () => {
    const stats = createEmptyCareerStats();
    expect(stats.missionsCompleted).toBe(0);
    expect(stats.missionsSurvived).toBe(0);
    expect(stats.consecutiveSurvival).toBe(0);
    expect(stats.bestSurvivalStreak).toBe(0);
    expect(stats.campaignsCompleted).toBe(0);
    expect(stats.campaignsWon).toBe(0);
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.totalCombatTime).toBe(0);
  });
});

describe('createEmptyPilotStats', () => {
  it('should create complete stats object', () => {
    const stats = createEmptyPilotStats();
    expect(stats.combat).toBeDefined();
    expect(stats.career).toBeDefined();
    expect(stats.updatedAt).toBeDefined();
  });

  it('should set updatedAt to current time', () => {
    const before = new Date().toISOString();
    const stats = createEmptyPilotStats();
    const after = new Date().toISOString();

    expect(stats.updatedAt >= before).toBe(true);
    expect(stats.updatedAt <= after).toBe(true);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('calculateProgress', () => {
  it('should calculate correct percentage', () => {
    const progress = calculateProgress(5, 10);
    expect(progress.current).toBe(5);
    expect(progress.target).toBe(10);
    expect(progress.percentage).toBe(50);
  });

  it('should cap percentage at 100', () => {
    const progress = calculateProgress(15, 10);
    expect(progress.percentage).toBe(100);
  });

  it('should round percentage', () => {
    const progress = calculateProgress(1, 3);
    expect(progress.percentage).toBe(33);
  });

  it('should handle zero target gracefully', () => {
    // This would cause division by zero, but should handle gracefully
    const progress = calculateProgress(5, 0);
    expect(progress.percentage).toBe(100); // Infinity capped to 100
  });
});

describe('getRarityColor', () => {
  it('should return correct color for common', () => {
    expect(getRarityColor(AwardRarity.Common)).toBe('text-slate-400');
  });

  it('should return correct color for uncommon', () => {
    expect(getRarityColor(AwardRarity.Uncommon)).toBe('text-emerald-400');
  });

  it('should return correct color for rare', () => {
    expect(getRarityColor(AwardRarity.Rare)).toBe('text-blue-400');
  });

  it('should return correct color for legendary', () => {
    expect(getRarityColor(AwardRarity.Legendary)).toBe('text-amber-400');
  });
});

describe('getRarityBackground', () => {
  it('should return correct background for common', () => {
    expect(getRarityBackground(AwardRarity.Common)).toBe('bg-slate-500/20');
  });

  it('should return correct background for uncommon', () => {
    expect(getRarityBackground(AwardRarity.Uncommon)).toBe('bg-emerald-500/20');
  });

  it('should return correct background for rare', () => {
    expect(getRarityBackground(AwardRarity.Rare)).toBe('bg-blue-500/20');
  });

  it('should return correct background for legendary', () => {
    expect(getRarityBackground(AwardRarity.Legendary)).toBe('bg-amber-500/20');
  });
});

// =============================================================================
// Interface Structure Tests
// =============================================================================

describe('IAward interface', () => {
  it('should support optional secret field', () => {
    const publicAward = createTestAward();
    const secretAward = createTestAward({ secret: true });

    expect(publicAward.secret).toBeUndefined();
    expect(secretAward.secret).toBe(true);
  });

  it('should support criteria conditions', () => {
    const award = createTestAward({
      criteria: {
        type: CriteriaType.SpecificEvent,
        threshold: 1,
        conditions: { eventType: 'headshot' },
        description: 'Score a headshot',
      },
    });

    expect(award.criteria.conditions).toEqual({ eventType: 'headshot' });
  });
});

describe('IPilotAward interface', () => {
  it('should track times earned for repeatable awards', () => {
    const award = createTestPilotAward({ timesEarned: 5 });
    expect(award.timesEarned).toBe(5);
  });

  it('should store context information', () => {
    const award = createTestPilotAward({
      context: {
        campaignId: 'campaign-1',
        missionId: 'mission-1',
        data: { kills: 3 },
      },
    });

    expect(award.context.campaignId).toBe('campaign-1');
    expect(award.context.missionId).toBe('mission-1');
    expect(award.context.data?.kills).toBe(3);
  });
});

describe('IPilotStats interface', () => {
  it('should track all combat statistics', () => {
    const stats: IPilotStats = {
      combat: {
        totalKills: 10,
        maxKillsInMission: 3,
        totalDamageDealt: 500,
        maxDamageInMission: 150,
        totalDamageReceived: 200,
        criticalHits: 2,
      },
      career: createEmptyCareerStats(),
      updatedAt: new Date().toISOString(),
    };

    expect(stats.combat.totalKills).toBe(10);
    expect(stats.combat.maxKillsInMission).toBe(3);
  });

  it('should track all career statistics', () => {
    const stats: IPilotStats = {
      combat: createEmptyCombatStats(),
      career: {
        missionsCompleted: 20,
        missionsSurvived: 18,
        consecutiveSurvival: 5,
        bestSurvivalStreak: 12,
        campaignsCompleted: 2,
        campaignsWon: 1,
        gamesPlayed: 50,
        totalCombatTime: 36000,
      },
      updatedAt: new Date().toISOString(),
    };

    expect(stats.career.missionsCompleted).toBe(20);
    expect(stats.career.consecutiveSurvival).toBe(5);
  });
});
