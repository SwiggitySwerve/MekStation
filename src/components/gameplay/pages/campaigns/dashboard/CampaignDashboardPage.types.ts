import type { ICoopSession } from '@/types/campaign/CoopSession';
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
  /**
   * Co-op session metadata, undefined on single-player campaigns
   * (`wire-coop-campaign-route` Wave 6.1). Drives the
   * `<CampaignNavigation>` "Co-op session" badge + the
   * `<CampaignCoopRouteSurface>` mount on the dashboard.
   */
  coopSession?: ICoopSession;
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
