import type { IPilotStats } from '@/types/award';

import { CriteriaType } from '@/types/award';

export function getCriteriaValue(
  stats: IPilotStats,
  criteriaType: CriteriaType,
): number {
  switch (criteriaType) {
    case CriteriaType.TotalKills:
      return stats.combat.totalKills;
    case CriteriaType.KillsInMission:
      return stats.combat.maxKillsInMission;
    case CriteriaType.DamageDealt:
      return stats.combat.totalDamageDealt;
    case CriteriaType.DamageInMission:
      return stats.combat.maxDamageInMission;
    case CriteriaType.MissionsCompleted:
      return stats.career.missionsCompleted;
    case CriteriaType.CampaignsCompleted:
      return stats.career.campaignsCompleted;
    case CriteriaType.ConsecutiveSurvival:
      return stats.career.consecutiveSurvival;
    case CriteriaType.GamesPlayed:
      return stats.career.gamesPlayed;
    default:
      return 0;
  }
}
