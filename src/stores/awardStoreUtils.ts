import type { IPilotStats } from '@/types/award';

import { CriteriaType } from '@/types/award';

type CriteriaValueGetter = (stats: IPilotStats) => number;

const criteriaValueGetters: Partial<Record<CriteriaType, CriteriaValueGetter>> =
  {
    [CriteriaType.TotalKills]: (stats) => stats.combat.totalKills,
    [CriteriaType.KillsInMission]: (stats) => stats.combat.maxKillsInMission,
    [CriteriaType.DamageDealt]: (stats) => stats.combat.totalDamageDealt,
    [CriteriaType.DamageInMission]: (stats) => stats.combat.maxDamageInMission,
    [CriteriaType.MissionsCompleted]: (stats) => stats.career.missionsCompleted,
    [CriteriaType.CampaignsCompleted]: (stats) =>
      stats.career.campaignsCompleted,
    [CriteriaType.ConsecutiveSurvival]: (stats) =>
      stats.career.consecutiveSurvival,
    [CriteriaType.GamesPlayed]: (stats) => stats.career.gamesPlayed,
  };

export function getCriteriaValue(
  stats: IPilotStats,
  criteriaType: CriteriaType,
): number {
  return criteriaValueGetters[criteriaType]?.(stats) ?? 0;
}
