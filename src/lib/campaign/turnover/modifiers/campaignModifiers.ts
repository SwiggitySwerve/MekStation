import type { ICampaign } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums';

const DEFAULT_BASE_TARGET = 3;

export function getBaseTargetModifier(campaign: ICampaign): number {
  return campaign.options.turnoverFixedTargetNumber ?? DEFAULT_BASE_TARGET;
}

export function getMissionStatusModifier(campaign: ICampaign): number {
  const missions = Array.from(campaign.missions.values());

  const completedMissions = missions.filter(
    (m) =>
      m.status === MissionStatus.SUCCESS ||
      m.status === MissionStatus.FAILED ||
      m.status === MissionStatus.BREACH,
  );

  if (completedMissions.length === 0) return 0;

  const lastMission = completedMissions[completedMissions.length - 1];

  switch (lastMission.status) {
    case MissionStatus.SUCCESS:
      return -1;
    case MissionStatus.FAILED:
      return 1;
    case MissionStatus.BREACH:
      return 2;
    default:
      return 0;
  }
}
