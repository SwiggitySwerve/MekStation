import type { UnitReadiness } from '@/stores/campaign/useCampaignRosterStore';

export interface CampaignDashboardCampaign {
  id: string;
  name: string;
  factionId: string;
  currentDate: Date;
  personnel: Set<unknown>;
  forces: Set<unknown>;
  missions: Set<unknown>;
  finances: {
    balance: {
      format: () => string;
    };
  };
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
  rootForceId: string;
  options: {
    enableDayReportNotifications?: boolean;
  };
}

export interface CampaignRosterUnit {
  unitId: string;
  unitName: string;
  readiness: UnitReadiness;
  armorDamage: Record<string, number>;
}

export type MissionResult = 'victory' | 'defeat' | 'draw' | 'pending' | string;

export interface CampaignMissionHistoryItem {
  id: string;
  name: string;
  missionNumber: number;
  result: MissionResult;
}
