/**
 * Award Store
 *
 * Zustand store for managing pilot awards and statistics.
 * Uses localStorage for persistence.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  IAward,
  IPilotAward,
  IPilotStats,
  IAwardContext,
  IAwardNotification,
  IAwardCheckResult,
  IGrantAwardInput,
  CriteriaType,
  createEmptyPilotStats,
  calculateProgress,
  AWARD_CATALOG,
  getAwardById,
} from '@/types/award';

import { getCriteriaValue } from './awardStoreUtils';

// =============================================================================
// Store State
// =============================================================================

interface AwardStoreState {
  /** Pilot statistics keyed by pilot ID */
  pilotStats: Record<string, IPilotStats>;
  /** Pilot awards keyed by pilot ID */
  pilotAwards: Record<string, IPilotAward[]>;
  /** Active notifications */
  notifications: IAwardNotification[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

interface AwardStoreActions {
  /** Get or create stats for a pilot */
  getPilotStats: (pilotId: string) => IPilotStats;
  /** Update pilot statistics */
  updatePilotStats: (pilotId: string, updates: Partial<IPilotStats>) => void;
  /** Update combat stats */
  updateCombatStats: (
    pilotId: string,
    updates: Partial<IPilotStats['combat']>,
  ) => void;
  /** Update career stats */
  updateCareerStats: (
    pilotId: string,
    updates: Partial<IPilotStats['career']>,
  ) => void;

  /** Get awards for a pilot */
  getPilotAwards: (pilotId: string) => IPilotAward[];
  /** Check if a pilot has an award */
  hasPilotAward: (pilotId: string, awardId: string) => boolean;
  /** Grant an award to a pilot */
  grantAward: (input: IGrantAwardInput) => boolean;
  /** Remove an award from a pilot (for admin/testing) */
  removeAward: (pilotId: string, awardId: string) => boolean;

  /** Check all awards for a pilot and grant any earned */
  evaluateAwards: (
    pilotId: string,
    context: IAwardContext,
  ) => IAwardCheckResult[];
  /** Check a specific award criteria */
  checkAwardCriteria: (pilotId: string, award: IAward) => IAwardCheckResult;

  /** Add a notification */
  addNotification: (award: IAward, pilotId: string, pilotName: string) => void;
  /** Dismiss a notification */
  dismissNotification: (notificationId: string) => void;
  /** Clear all notifications */
  clearNotifications: () => void;
  /** Get undismissed notifications */
  getActiveNotifications: () => IAwardNotification[];

  /** Record a kill for a pilot */
  recordKill: (pilotId: string, context: IAwardContext) => void;
  /** Record damage dealt */
  recordDamage: (
    pilotId: string,
    damage: number,
    context: IAwardContext,
  ) => void;
  /** Record mission completion */
  recordMissionComplete: (
    pilotId: string,
    survived: boolean,
    context: IAwardContext,
  ) => void;
  /** Record campaign completion */
  recordCampaignComplete: (
    pilotId: string,
    won: boolean,
    context: IAwardContext,
  ) => void;
  /** Record game completion */
  recordGameComplete: (pilotId: string, context: IAwardContext) => void;
  /** Record a specific event */
  recordEvent: (
    pilotId: string,
    eventType: string,
    data: Record<string, unknown>,
    context: IAwardContext,
  ) => void;

  /** Reset survival streak (on ejection/death) */
  resetSurvivalStreak: (pilotId: string) => void;

  /** Clear error */
  clearError: () => void;
  /** Reset all data for a pilot */
  resetPilotData: (pilotId: string) => void;
}

type AwardStore = AwardStoreState & AwardStoreActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const useAwardStore = create<AwardStore>()(
  persist(
    (set, get) => ({
      // State
      pilotStats: {},
      pilotAwards: {},
      notifications: [],
      isLoading: false,
      error: null,

      // Get or create stats for a pilot
      getPilotStats: (pilotId: string) => {
        const stats = get().pilotStats[pilotId];
        if (stats) return stats;

        const newStats = createEmptyPilotStats();
        set((state) => ({
          pilotStats: { ...state.pilotStats, [pilotId]: newStats },
        }));
        return newStats;
      },

      // Update pilot statistics
      updatePilotStats: (pilotId: string, updates: Partial<IPilotStats>) => {
        const current = get().getPilotStats(pilotId);
        set((state) => ({
          pilotStats: {
            ...state.pilotStats,
            [pilotId]: {
              ...current,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      // Update combat stats
      updateCombatStats: (
        pilotId: string,
        updates: Partial<IPilotStats['combat']>,
      ) => {
        const current = get().getPilotStats(pilotId);
        set((state) => ({
          pilotStats: {
            ...state.pilotStats,
            [pilotId]: {
              ...current,
              combat: { ...current.combat, ...updates },
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      // Update career stats
      updateCareerStats: (
        pilotId: string,
        updates: Partial<IPilotStats['career']>,
      ) => {
        const current = get().getPilotStats(pilotId);
        set((state) => ({
          pilotStats: {
            ...state.pilotStats,
            [pilotId]: {
              ...current,
              career: { ...current.career, ...updates },
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      // Get awards for a pilot
      getPilotAwards: (pilotId: string) => {
        return get().pilotAwards[pilotId] ?? [];
      },

      // Check if a pilot has an award
      hasPilotAward: (pilotId: string, awardId: string) => {
        const awards = get().getPilotAwards(pilotId);
        return awards.some((a) => a.awardId === awardId);
      },

      // Grant an award to a pilot
      grantAward: (input: IGrantAwardInput) => {
        const { pilotId, awardId, context } = input;
        const award = getAwardById(awardId);
        if (!award) {
          set({ error: `Award not found: ${awardId}` });
          return false;
        }

        const existingAwards = get().getPilotAwards(pilotId);
        const existingAward = existingAwards.find((a) => a.awardId === awardId);

        // Handle repeatable vs non-repeatable awards
        if (existingAward && !award.repeatable) {
          // Already has this non-repeatable award
          return false;
        }

        const now = new Date().toISOString();

        if (existingAward && award.repeatable) {
          // Increment times earned for repeatable award
          const updatedAwards = existingAwards.map((a) =>
            a.awardId === awardId
              ? { ...a, timesEarned: a.timesEarned + 1, earnedAt: now }
              : a,
          );
          set((state) => ({
            pilotAwards: { ...state.pilotAwards, [pilotId]: updatedAwards },
          }));
        } else {
          // Add new award
          const newAward: IPilotAward = {
            awardId,
            earnedAt: now,
            context,
            timesEarned: 1,
          };
          set((state) => ({
            pilotAwards: {
              ...state.pilotAwards,
              [pilotId]: [...existingAwards, newAward],
            },
          }));
        }

        return true;
      },

      // Remove an award from a pilot
      removeAward: (pilotId: string, awardId: string) => {
        const existingAwards = get().getPilotAwards(pilotId);
        const updatedAwards = existingAwards.filter(
          (a) => a.awardId !== awardId,
        );

        if (updatedAwards.length === existingAwards.length) {
          return false; // Award not found
        }

        set((state) => ({
          pilotAwards: { ...state.pilotAwards, [pilotId]: updatedAwards },
        }));
        return true;
      },

      // Check all awards for a pilot and grant any earned
      evaluateAwards: (pilotId: string, context: IAwardContext) => {
        const results: IAwardCheckResult[] = [];

        for (const award of AWARD_CATALOG) {
          const result = get().checkAwardCriteria(pilotId, award);
          results.push(result);

          if (result.earned && !get().hasPilotAward(pilotId, award.id)) {
            get().grantAward({ pilotId, awardId: award.id, context });
          }
        }

        return results;
      },

      // Check a specific award criteria
      checkAwardCriteria: (pilotId: string, award: IAward) => {
        const stats = get().getPilotStats(pilotId);
        const currentValue = getCriteriaValue(stats, award.criteria.type);
        const threshold = award.criteria.threshold;
        const earned = currentValue >= threshold;

        return {
          award,
          earned,
          progress: calculateProgress(currentValue, threshold),
        };
      },

      // Add a notification
      addNotification: (award: IAward, pilotId: string, pilotName: string) => {
        const notification: IAwardNotification = {
          id: uuidv4(),
          award,
          pilotId,
          pilotName,
          createdAt: new Date().toISOString(),
          dismissed: false,
        };

        set((state) => ({
          notifications: [...state.notifications, notification],
        }));
      },

      // Dismiss a notification
      dismissNotification: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, dismissed: true } : n,
          ),
        }));
      },

      // Clear all notifications
      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Get undismissed notifications
      getActiveNotifications: () => {
        return get().notifications.filter((n) => !n.dismissed);
      },

      // Record a kill
      recordKill: (pilotId: string, context: IAwardContext) => {
        const stats = get().getPilotStats(pilotId);
        const newKills = stats.combat.totalKills + 1;

        get().updateCombatStats(pilotId, {
          totalKills: newKills,
        });

        // Evaluate kill-related awards
        get().evaluateAwards(pilotId, context);
      },

      // Record damage dealt
      recordDamage: (
        pilotId: string,
        damage: number,
        context: IAwardContext,
      ) => {
        const stats = get().getPilotStats(pilotId);

        get().updateCombatStats(pilotId, {
          totalDamageDealt: stats.combat.totalDamageDealt + damage,
        });

        get().evaluateAwards(pilotId, context);
      },

      // Record mission completion
      recordMissionComplete: (
        pilotId: string,
        survived: boolean,
        context: IAwardContext,
      ) => {
        const stats = get().getPilotStats(pilotId);
        const newMissionsCompleted = stats.career.missionsCompleted + 1;

        if (survived) {
          const newStreak = stats.career.consecutiveSurvival + 1;
          get().updateCareerStats(pilotId, {
            missionsCompleted: newMissionsCompleted,
            missionsSurvived: stats.career.missionsSurvived + 1,
            consecutiveSurvival: newStreak,
            bestSurvivalStreak: Math.max(
              newStreak,
              stats.career.bestSurvivalStreak,
            ),
          });
        } else {
          get().updateCareerStats(pilotId, {
            missionsCompleted: newMissionsCompleted,
            consecutiveSurvival: 0,
          });
        }

        get().evaluateAwards(pilotId, context);
      },

      // Record campaign completion
      recordCampaignComplete: (
        pilotId: string,
        won: boolean,
        context: IAwardContext,
      ) => {
        const stats = get().getPilotStats(pilotId);

        get().updateCareerStats(pilotId, {
          campaignsCompleted: stats.career.campaignsCompleted + 1,
          campaignsWon: won
            ? stats.career.campaignsWon + 1
            : stats.career.campaignsWon,
        });

        get().evaluateAwards(pilotId, context);
      },

      // Record game completion
      recordGameComplete: (pilotId: string, context: IAwardContext) => {
        const stats = get().getPilotStats(pilotId);

        get().updateCareerStats(pilotId, {
          gamesPlayed: stats.career.gamesPlayed + 1,
        });

        get().evaluateAwards(pilotId, context);
      },

      // Record a specific event
      recordEvent: (
        pilotId: string,
        eventType: string,
        data: Record<string, unknown>,
        context: IAwardContext,
      ) => {
        // For specific events, we need to check awards that match this event type
        const matchingAwards = AWARD_CATALOG.filter(
          (award) =>
            award.criteria.type === CriteriaType.SpecificEvent &&
            award.criteria.conditions?.eventType === eventType,
        );

        for (const award of matchingAwards) {
          if (!get().hasPilotAward(pilotId, award.id)) {
            // Check any additional conditions
            const conditions = award.criteria.conditions;
            let conditionsMet = true;

            if (conditions) {
              for (const [key, value] of Object.entries(conditions)) {
                if (key !== 'eventType' && data[key] !== value) {
                  // For numeric comparisons
                  if (
                    typeof value === 'number' &&
                    typeof data[key] === 'number'
                  ) {
                    if (data[key] < value) {
                      conditionsMet = false;
                      break;
                    }
                  } else {
                    conditionsMet = false;
                    break;
                  }
                }
              }
            }

            if (conditionsMet) {
              get().grantAward({ pilotId, awardId: award.id, context });
            }
          }
        }
      },

      // Reset survival streak
      resetSurvivalStreak: (pilotId: string) => {
        get().updateCareerStats(pilotId, {
          consecutiveSurvival: 0,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset all data for a pilot
      resetPilotData: (pilotId: string) => {
        set((state) => {
          const { [pilotId]: _removedStats, ...remainingStats } =
            state.pilotStats;
          const { [pilotId]: _removedAwards, ...remainingAwards } =
            state.pilotAwards;
          return {
            pilotStats: remainingStats,
            pilotAwards: remainingAwards,
          };
        });
      },
    }),
    {
      name: 'mekstation-awards',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pilotStats: state.pilotStats,
        pilotAwards: state.pilotAwards,
      }),
    },
  ),
);
