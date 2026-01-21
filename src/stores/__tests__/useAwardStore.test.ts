/**
 * Award Store Tests
 *
 * Comprehensive tests for the useAwardStore Zustand store.
 */

import { act, renderHook } from '@testing-library/react';
import { useAwardStore } from '../useAwardStore';
import {
  AwardCategory,
  AwardRarity,
  CriteriaType,
  IAward,
  IAwardContext,
  createEmptyPilotStats,
  getAwardById,
  AWARD_CATALOG,
} from '@/types/award';

// =============================================================================
// Test Utilities
// =============================================================================

const TEST_PILOT_ID = 'test-pilot-001';
const TEST_PILOT_ID_2 = 'test-pilot-002';

const createTestContext = (overrides: Partial<IAwardContext> = {}): IAwardContext => ({
  campaignId: 'test-campaign',
  missionId: 'test-mission',
  gameId: 'test-game',
  ...overrides,
});

/**
 * Reset store state between tests
 */
function resetStore() {
  const store = useAwardStore.getState();
  // Clear all data
  useAwardStore.setState({
    pilotStats: {},
    pilotAwards: {},
    notifications: [],
    isLoading: false,
    error: null,
  });
}

// =============================================================================
// Test Suite
// =============================================================================

describe('useAwardStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ===========================================================================
  // Pilot Stats
  // ===========================================================================

  describe('Pilot Statistics', () => {
    it('should create empty stats for a new pilot', () => {
      const { result } = renderHook(() => useAwardStore());

      let stats: ReturnType<typeof result.current.getPilotStats>;
      act(() => {
        stats = result.current.getPilotStats(TEST_PILOT_ID);
      });

      expect(stats!.combat.totalKills).toBe(0);
      expect(stats!.combat.totalDamageDealt).toBe(0);
      expect(stats!.career.missionsCompleted).toBe(0);
      expect(stats!.career.gamesPlayed).toBe(0);
    });

    it('should return existing stats for a pilot', () => {
      const { result } = renderHook(() => useAwardStore());

      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 5 });
      });

      let stats: ReturnType<typeof result.current.getPilotStats>;
      act(() => {
        stats = result.current.getPilotStats(TEST_PILOT_ID);
      });

      expect(stats!.combat.totalKills).toBe(5);
    });

    it('should update combat stats', () => {
      const { result } = renderHook(() => useAwardStore());

      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, {
          totalKills: 10,
          maxKillsInMission: 3,
          totalDamageDealt: 500,
        });
      });

      const stats = result.current.getPilotStats(TEST_PILOT_ID);
      expect(stats.combat.totalKills).toBe(10);
      expect(stats.combat.maxKillsInMission).toBe(3);
      expect(stats.combat.totalDamageDealt).toBe(500);
    });

    it('should update career stats', () => {
      const { result } = renderHook(() => useAwardStore());

      act(() => {
        result.current.updateCareerStats(TEST_PILOT_ID, {
          missionsCompleted: 15,
          consecutiveSurvival: 10,
          gamesPlayed: 20,
        });
      });

      const stats = result.current.getPilotStats(TEST_PILOT_ID);
      expect(stats.career.missionsCompleted).toBe(15);
      expect(stats.career.consecutiveSurvival).toBe(10);
      expect(stats.career.gamesPlayed).toBe(20);
    });

    it('should track multiple pilots independently', () => {
      const { result } = renderHook(() => useAwardStore());

      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 5 });
        result.current.updateCombatStats(TEST_PILOT_ID_2, { totalKills: 10 });
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).combat.totalKills).toBe(5);
      expect(result.current.getPilotStats(TEST_PILOT_ID_2).combat.totalKills).toBe(10);
    });
  });

  // ===========================================================================
  // Award Granting
  // ===========================================================================

  describe('Award Granting', () => {
    it('should grant an award to a pilot', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      let granted: boolean;
      act(() => {
        granted = result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'first-blood',
          context,
        });
      });

      expect(granted!).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'first-blood')).toBe(true);
    });

    it('should not grant the same non-repeatable award twice', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'first-blood',
          context,
        });
      });

      let grantedAgain: boolean;
      act(() => {
        grantedAgain = result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'first-blood',
          context,
        });
      });

      expect(grantedAgain!).toBe(false);
      const awards = result.current.getPilotAwards(TEST_PILOT_ID);
      expect(awards.length).toBe(1);
      expect(awards[0].timesEarned).toBe(1);
    });

    it('should return false for non-existent award', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      let granted: boolean;
      act(() => {
        granted = result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'non-existent-award',
          context,
        });
      });

      expect(granted!).toBe(false);
      expect(result.current.error).toBe('Award not found: non-existent-award');
    });

    it('should remove an award from a pilot', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'first-blood',
          context,
        });
      });

      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'first-blood')).toBe(true);

      let removed: boolean;
      act(() => {
        removed = result.current.removeAward(TEST_PILOT_ID, 'first-blood');
      });

      expect(removed!).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'first-blood')).toBe(false);
    });

    it('should return false when removing non-existent award', () => {
      const { result } = renderHook(() => useAwardStore());

      let removed: boolean;
      act(() => {
        removed = result.current.removeAward(TEST_PILOT_ID, 'first-blood');
      });

      expect(removed!).toBe(false);
    });

    it('should get empty awards array for pilot with no awards', () => {
      const { result } = renderHook(() => useAwardStore());
      expect(result.current.getPilotAwards(TEST_PILOT_ID)).toEqual([]);
    });
  });

  // ===========================================================================
  // Award Evaluation
  // ===========================================================================

  describe('Award Evaluation', () => {
    it('should check award criteria correctly', () => {
      const { result } = renderHook(() => useAwardStore());
      const firstBlood = getAwardById('first-blood')!;

      // Before any kills
      let checkResult = result.current.checkAwardCriteria(TEST_PILOT_ID, firstBlood);
      expect(checkResult.earned).toBe(false);
      expect(checkResult.progress.current).toBe(0);
      expect(checkResult.progress.target).toBe(1);

      // After one kill
      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 1 });
      });

      checkResult = result.current.checkAwardCriteria(TEST_PILOT_ID, firstBlood);
      expect(checkResult.earned).toBe(true);
      expect(checkResult.progress.percentage).toBe(100);
    });

    it('should evaluate all awards and grant earned ones', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      // Set up stats that should earn multiple awards
      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 5 });
        result.current.updateCareerStats(TEST_PILOT_ID, {
          missionsCompleted: 1,
          consecutiveSurvival: 1,
          gamesPlayed: 1,
        });
      });

      act(() => {
        result.current.evaluateAwards(TEST_PILOT_ID, context);
      });

      // Should have earned: first-blood, warrior, ace, survivor, campaign-initiate, recruit
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'first-blood')).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'warrior')).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'ace')).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'survivor')).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'campaign-initiate')).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'recruit')).toBe(true);
    });

    it('should not grant awards not yet earned', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      // Only 1 kill - should not earn "warrior" (requires 3)
      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 1 });
      });

      act(() => {
        result.current.evaluateAwards(TEST_PILOT_ID, context);
      });

      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'first-blood')).toBe(true);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'warrior')).toBe(false);
    });
  });

  // ===========================================================================
  // Recording Events
  // ===========================================================================

  describe('Recording Events', () => {
    it('should record kills and evaluate awards', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.recordKill(TEST_PILOT_ID, context);
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).combat.totalKills).toBe(1);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'first-blood')).toBe(true);
    });

    it('should record damage', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.recordDamage(TEST_PILOT_ID, 50, context);
        result.current.recordDamage(TEST_PILOT_ID, 75, context);
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).combat.totalDamageDealt).toBe(125);
    });

    it('should record mission completion and track survival streak', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      // Survive 3 missions
      act(() => {
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
      });

      const stats = result.current.getPilotStats(TEST_PILOT_ID);
      expect(stats.career.missionsCompleted).toBe(3);
      expect(stats.career.missionsSurvived).toBe(3);
      expect(stats.career.consecutiveSurvival).toBe(3);
      expect(stats.career.bestSurvivalStreak).toBe(3);
    });

    it('should reset survival streak when mission failed', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      // Survive 3, then fail
      act(() => {
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
        result.current.recordMissionComplete(TEST_PILOT_ID, false, context);
      });

      const stats = result.current.getPilotStats(TEST_PILOT_ID);
      expect(stats.career.missionsCompleted).toBe(4);
      expect(stats.career.missionsSurvived).toBe(3);
      expect(stats.career.consecutiveSurvival).toBe(0);
      expect(stats.career.bestSurvivalStreak).toBe(3);
    });

    it('should record campaign completion', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.recordCampaignComplete(TEST_PILOT_ID, true, context);
      });

      const stats = result.current.getPilotStats(TEST_PILOT_ID);
      expect(stats.career.campaignsCompleted).toBe(1);
      expect(stats.career.campaignsWon).toBe(1);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'campaign-victor')).toBe(true);
    });

    it('should record game completion', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.recordGameComplete(TEST_PILOT_ID, context);
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).career.gamesPlayed).toBe(1);
      expect(result.current.hasPilotAward(TEST_PILOT_ID, 'recruit')).toBe(true);
    });

    it('should reset survival streak explicitly', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
        result.current.recordMissionComplete(TEST_PILOT_ID, true, context);
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).career.consecutiveSurvival).toBe(2);

      act(() => {
        result.current.resetSurvivalStreak(TEST_PILOT_ID);
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).career.consecutiveSurvival).toBe(0);
    });
  });

  // ===========================================================================
  // Notifications
  // ===========================================================================

  describe('Notifications', () => {
    it('should add a notification', () => {
      const { result } = renderHook(() => useAwardStore());
      const award = getAwardById('first-blood')!;

      act(() => {
        result.current.addNotification(award, TEST_PILOT_ID, 'Test Pilot');
      });

      const notifications = result.current.getActiveNotifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].award.id).toBe('first-blood');
      expect(notifications[0].pilotName).toBe('Test Pilot');
      expect(notifications[0].dismissed).toBe(false);
    });

    it('should dismiss a notification', () => {
      const { result } = renderHook(() => useAwardStore());
      const award = getAwardById('first-blood')!;

      act(() => {
        result.current.addNotification(award, TEST_PILOT_ID, 'Test Pilot');
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.dismissNotification(notificationId);
      });

      expect(result.current.getActiveNotifications().length).toBe(0);
      expect(result.current.notifications[0].dismissed).toBe(true);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useAwardStore());
      const award1 = getAwardById('first-blood')!;
      const award2 = getAwardById('warrior')!;

      act(() => {
        result.current.addNotification(award1, TEST_PILOT_ID, 'Pilot 1');
        result.current.addNotification(award2, TEST_PILOT_ID_2, 'Pilot 2');
      });

      expect(result.current.notifications.length).toBe(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications.length).toBe(0);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      // Trigger an error
      act(() => {
        result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'non-existent',
          context,
        });
      });

      expect(result.current.error).toBe('Award not found: non-existent');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Data Reset
  // ===========================================================================

  describe('Data Reset', () => {
    it('should reset all data for a pilot', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      // Set up data
      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 5 });
        result.current.grantAward({
          pilotId: TEST_PILOT_ID,
          awardId: 'first-blood',
          context,
        });
      });

      expect(result.current.getPilotStats(TEST_PILOT_ID).combat.totalKills).toBe(5);
      expect(result.current.getPilotAwards(TEST_PILOT_ID).length).toBe(1);

      // Reset
      act(() => {
        result.current.resetPilotData(TEST_PILOT_ID);
      });

      // Should have empty stats (recreated on access)
      expect(result.current.getPilotStats(TEST_PILOT_ID).combat.totalKills).toBe(0);
      expect(result.current.getPilotAwards(TEST_PILOT_ID).length).toBe(0);
    });

    it('should not affect other pilots when resetting', () => {
      const { result } = renderHook(() => useAwardStore());
      const context = createTestContext();

      act(() => {
        result.current.updateCombatStats(TEST_PILOT_ID, { totalKills: 5 });
        result.current.updateCombatStats(TEST_PILOT_ID_2, { totalKills: 10 });
        result.current.grantAward({
          pilotId: TEST_PILOT_ID_2,
          awardId: 'first-blood',
          context,
        });
      });

      act(() => {
        result.current.resetPilotData(TEST_PILOT_ID);
      });

      // Pilot 2 should be unaffected
      expect(result.current.getPilotStats(TEST_PILOT_ID_2).combat.totalKills).toBe(10);
      expect(result.current.getPilotAwards(TEST_PILOT_ID_2).length).toBe(1);
    });
  });

  // ===========================================================================
  // Award Catalog Integration
  // ===========================================================================

  describe('Award Catalog Integration', () => {
    it('should have a valid award catalog', () => {
      expect(AWARD_CATALOG.length).toBeGreaterThan(0);

      // All awards should have required fields
      for (const award of AWARD_CATALOG) {
        expect(award.id).toBeTruthy();
        expect(award.name).toBeTruthy();
        expect(award.criteria).toBeDefined();
        expect(award.criteria.threshold).toBeGreaterThan(0);
      }
    });

    it('should find awards by ID', () => {
      const award = getAwardById('first-blood');
      expect(award).toBeDefined();
      expect(award?.name).toBe('First Blood');
    });

    it('should evaluate all criteria types', () => {
      const { result } = renderHook(() => useAwardStore());

      // Test each criteria type has at least one award
      const criteriaTypes = new Set(AWARD_CATALOG.map((a) => a.criteria.type));
      
      expect(criteriaTypes.has(CriteriaType.TotalKills)).toBe(true);
      expect(criteriaTypes.has(CriteriaType.MissionsCompleted)).toBe(true);
      expect(criteriaTypes.has(CriteriaType.CampaignsCompleted)).toBe(true);
      expect(criteriaTypes.has(CriteriaType.ConsecutiveSurvival)).toBe(true);
      expect(criteriaTypes.has(CriteriaType.GamesPlayed)).toBe(true);
    });
  });
});
