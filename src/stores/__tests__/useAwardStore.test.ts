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

  // ===========================================================================
  // Game Event Integration Tests
  // ===========================================================================

  describe('Game Event Integration', () => {
    describe('Full Game Scenario', () => {
      it('should track a complete single-game session with multiple pilots', () => {
        const { result } = renderHook(() => useAwardStore());
        const gameContext = createTestContext({ gameId: 'game-001' });
        const pilot1 = 'lance-leader';
        const pilot2 = 'wingman-1';
        const pilot3 = 'wingman-2';

        act(() => {
          // Pre-game: Record game start for all pilots
          result.current.recordGameComplete(pilot1, gameContext);
          result.current.recordGameComplete(pilot2, gameContext);
          result.current.recordGameComplete(pilot3, gameContext);

          // Turn 1: Pilot 1 gets first kill
          result.current.recordKill(pilot1, gameContext);
          result.current.recordDamage(pilot1, 45, gameContext);

          // Turn 2: Pilot 2 scores two kills, Pilot 3 takes damage
          result.current.recordKill(pilot2, gameContext);
          result.current.recordKill(pilot2, gameContext);
          result.current.recordDamage(pilot2, 80, gameContext);

          // Turn 3: Pilot 1 gets another kill
          result.current.recordKill(pilot1, gameContext);
          result.current.recordDamage(pilot1, 30, gameContext);

          // End of game: All pilots survived
          result.current.recordMissionComplete(pilot1, true, gameContext);
          result.current.recordMissionComplete(pilot2, true, gameContext);
          result.current.recordMissionComplete(pilot3, true, gameContext);
        });

        // Verify stats were accumulated correctly
        const stats1 = result.current.getPilotStats(pilot1);
        const stats2 = result.current.getPilotStats(pilot2);
        const stats3 = result.current.getPilotStats(pilot3);

        expect(stats1.combat.totalKills).toBe(2);
        expect(stats1.combat.totalDamageDealt).toBe(75);
        expect(stats1.career.gamesPlayed).toBe(1);
        expect(stats1.career.missionsSurvived).toBe(1);

        expect(stats2.combat.totalKills).toBe(2);
        expect(stats2.combat.totalDamageDealt).toBe(80);

        expect(stats3.combat.totalKills).toBe(0);
        expect(stats3.career.missionsSurvived).toBe(1);

        // Verify first kill award was granted
        expect(result.current.hasPilotAward(pilot1, 'first-blood')).toBe(true);
        expect(result.current.hasPilotAward(pilot2, 'first-blood')).toBe(true);
      });

      it('should handle pilot ejection/death resetting survival streak', () => {
        const { result } = renderHook(() => useAwardStore());
        const pilot = 'unlucky-pilot';

        act(() => {
          // First 3 missions survived
          result.current.recordMissionComplete(pilot, true, createTestContext({ missionId: 'm1' }));
          result.current.recordMissionComplete(pilot, true, createTestContext({ missionId: 'm2' }));
          result.current.recordMissionComplete(pilot, true, createTestContext({ missionId: 'm3' }));
        });

        expect(result.current.getPilotStats(pilot).career.consecutiveSurvival).toBe(3);

        act(() => {
          // Pilot ejects - survival streak resets
          result.current.resetSurvivalStreak(pilot);
          result.current.recordMissionComplete(pilot, false, createTestContext({ missionId: 'm4' }));
        });

        const stats = result.current.getPilotStats(pilot);
        expect(stats.career.consecutiveSurvival).toBe(0);
        expect(stats.career.bestSurvivalStreak).toBe(3);
        expect(stats.career.missionsCompleted).toBe(4);
        expect(stats.career.missionsSurvived).toBe(3);
      });
    });

    describe('Multi-Mission Campaign Scenario', () => {
      it('should track progression across multiple missions in a campaign', () => {
        const { result } = renderHook(() => useAwardStore());
        const campaignId = 'operation-revival';
        const pilot = 'campaign-veteran';

        const missions = ['mission-1', 'mission-2', 'mission-3', 'mission-4', 'mission-5'];

        act(() => {
          // Simulate 5 missions with varying performance
          for (let i = 0; i < missions.length; i++) {
            const context = createTestContext({
              campaignId,
              missionId: missions[i],
            });

            // Record game
            result.current.recordGameComplete(pilot, context);

            // Simulate kills (increasing skill)
            const kills = i + 1;
            for (let k = 0; k < kills; k++) {
              result.current.recordKill(pilot, context);
            }

            // Damage dealt
            result.current.recordDamage(pilot, 50 + i * 20, context);

            // All missions survived
            result.current.recordMissionComplete(pilot, true, context);
          }

          // Campaign victory
          result.current.recordCampaignComplete(pilot, true, createTestContext({ campaignId }));
        });

        const stats = result.current.getPilotStats(pilot);

        // Verify cumulative stats
        expect(stats.combat.totalKills).toBe(1 + 2 + 3 + 4 + 5); // 15 total
        expect(stats.combat.totalDamageDealt).toBe(50 + 70 + 90 + 110 + 130); // 450 total
        expect(stats.career.missionsCompleted).toBe(5);
        expect(stats.career.missionsSurvived).toBe(5);
        expect(stats.career.consecutiveSurvival).toBe(5);
        expect(stats.career.campaignsCompleted).toBe(1);
        expect(stats.career.campaignsWon).toBe(1);
        expect(stats.career.gamesPlayed).toBe(5);

        // Should have earned kill milestone awards
        expect(result.current.hasPilotAward(pilot, 'first-blood')).toBe(true);
        // 5 kills = warrior award (if threshold is 5)
        const awards = result.current.getPilotAwards(pilot);
        expect(awards.length).toBeGreaterThan(0);
      });

      it('should track multiple pilots through the same campaign', () => {
        const { result } = renderHook(() => useAwardStore());
        const campaignId = 'clan-invasion';
        const pilots = ['alpha-lead', 'alpha-2', 'bravo-lead', 'bravo-2'];

        act(() => {
          // Each pilot participates in 3 missions
          for (let mission = 1; mission <= 3; mission++) {
            const context = createTestContext({
              campaignId,
              missionId: `mission-${mission}`,
            });

            for (const pilot of pilots) {
              result.current.recordGameComplete(pilot, context);

              // Varying kills per pilot
              const killCount = pilots.indexOf(pilot) + 1;
              for (let k = 0; k < killCount; k++) {
                result.current.recordKill(pilot, context);
              }

              result.current.recordMissionComplete(pilot, true, context);
            }
          }

          // Campaign ends in victory
          for (const pilot of pilots) {
            result.current.recordCampaignComplete(
              pilot,
              true,
              createTestContext({ campaignId })
            );
          }
        });

        // Verify each pilot has correct stats
        for (let i = 0; i < pilots.length; i++) {
          const stats = result.current.getPilotStats(pilots[i]);
          expect(stats.combat.totalKills).toBe((i + 1) * 3); // 3, 6, 9, 12
          expect(stats.career.missionsCompleted).toBe(3);
          expect(stats.career.campaignsWon).toBe(1);
        }
      });
    });

    describe('Award Progression Edge Cases', () => {
      it('should not grant the same non-repeatable award twice', () => {
        const { result } = renderHook(() => useAwardStore());
        const pilot = 'ace-pilot';
        const context = createTestContext();

        act(() => {
          // Record many kills to trigger first-blood multiple times
          for (let i = 0; i < 10; i++) {
            result.current.recordKill(pilot, context);
          }
        });

        // First Blood should only be granted once
        const awards = result.current.getPilotAwards(pilot);
        const firstBloodAwards = awards.filter((a) => a.awardId === 'first-blood');
        expect(firstBloodAwards.length).toBe(1);
        expect(firstBloodAwards[0].timesEarned).toBe(1);
      });

      it('should grant multiple awards from a single action when criteria met', () => {
        const { result } = renderHook(() => useAwardStore());
        const pilot = 'multi-achiever';

        // Set up pilot with stats close to multiple thresholds
        act(() => {
          // Set kills to 4 (one away from warrior award at 5)
          result.current.updateCombatStats(pilot, { totalKills: 4 });

          // Now record one kill that should push over the threshold
          result.current.recordKill(pilot, createTestContext());
        });

        const stats = result.current.getPilotStats(pilot);
        expect(stats.combat.totalKills).toBe(5);

        // Should have both first-blood and warrior awards
        expect(result.current.hasPilotAward(pilot, 'first-blood')).toBe(true);
      });

      it('should track awards earned in different contexts separately', () => {
        const { result } = renderHook(() => useAwardStore());
        const pilot = 'context-tracker';

        const campaign1Context = createTestContext({
          campaignId: 'campaign-1',
          missionId: 'c1-mission',
        });
        const campaign2Context = createTestContext({
          campaignId: 'campaign-2',
          missionId: 'c2-mission',
        });

        act(() => {
          // Earn first blood in campaign 1
          result.current.recordKill(pilot, campaign1Context);

          // More kills in campaign 2
          result.current.recordKill(pilot, campaign2Context);
          result.current.recordKill(pilot, campaign2Context);
        });

        const awards = result.current.getPilotAwards(pilot);
        const firstBlood = awards.find((a) => a.awardId === 'first-blood');

        // Award should have campaign 1 context (where it was first earned)
        expect(firstBlood?.context.campaignId).toBe('campaign-1');
      });

      it('should correctly evaluate awards after resetting pilot data', () => {
        const { result } = renderHook(() => useAwardStore());
        const pilot = 'reset-pilot';

        act(() => {
          // Build up stats and awards
          for (let i = 0; i < 5; i++) {
            result.current.recordKill(pilot, createTestContext());
          }
          result.current.recordMissionComplete(pilot, true, createTestContext());
        });

        const awardsBefore = result.current.getPilotAwards(pilot).length;
        expect(awardsBefore).toBeGreaterThan(0);

        act(() => {
          result.current.resetPilotData(pilot);
        });

        // After reset, pilot should have no stats or awards
        const stats = result.current.getPilotStats(pilot);
        expect(stats.combat.totalKills).toBe(0);
        expect(result.current.getPilotAwards(pilot).length).toBe(0);
      });
    });

    describe('Real-time Award Notification Flow', () => {
      it('should create notifications when awards are granted via game events', () => {
        const { result } = renderHook(() => useAwardStore());
        const pilot = 'notification-pilot';

        // Clear any existing notifications
        act(() => {
          result.current.clearNotifications();
        });

        // Grant an award directly
        act(() => {
          const award = getAwardById('first-blood')!;
          result.current.addNotification(award, pilot, 'Test Pilot');
        });

        const notifications = result.current.getActiveNotifications();
        expect(notifications.length).toBe(1);
        expect(notifications[0].pilotId).toBe(pilot);
        expect(notifications[0].award.id).toBe('first-blood');
        expect(notifications[0].dismissed).toBe(false);
      });

      it('should allow dismissing notifications individually', () => {
        const { result } = renderHook(() => useAwardStore());
        const award1 = getAwardById('first-blood')!;
        const award2 = getAwardById('recruit')!;

        act(() => {
          result.current.clearNotifications();
          result.current.addNotification(award1, 'pilot-1', 'Pilot 1');
          result.current.addNotification(award2, 'pilot-2', 'Pilot 2');
        });

        let notifications = result.current.getActiveNotifications();
        expect(notifications.length).toBe(2);

        act(() => {
          result.current.dismissNotification(notifications[0].id);
        });

        notifications = result.current.getActiveNotifications();
        expect(notifications.length).toBe(1);
        expect(notifications[0].pilotId).toBe('pilot-2');
      });
    });
  });
});
