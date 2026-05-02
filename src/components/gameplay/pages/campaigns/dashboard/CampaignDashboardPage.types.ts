import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

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

/**
 * Per `canonicalize-unit-combat-state` PR-B: the dashboard's roster row
 * is the thin `IRosterUnitProjection` (display identity + readiness).
 * Damage data is read from canonical
 * `useCampaignStore.campaign.unitCombatStates` by the unit card
 * directly — see `CampaignDashboardPage.sections.tsx`.
 */
export type CampaignRosterUnit = IRosterUnitProjection;

export type MissionResult = 'victory' | 'defeat' | 'draw' | 'pending' | string;

export interface CampaignMissionHistoryItem {
  id: string;
  name: string;
  missionNumber: number;
  result: MissionResult;
}
