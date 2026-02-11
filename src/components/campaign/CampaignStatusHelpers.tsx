import Link from 'next/link';

import {
  SkeletonText,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { PageLayout, Card } from '@/components/ui';
import {
  CampaignStatus,
  CampaignMissionStatus,
  ICampaignMission,
} from '@/types/campaign';

export function getStatusColor(
  status: CampaignStatus,
): 'info' | 'success' | 'warning' | 'red' {
  switch (status) {
    case CampaignStatus.Setup:
      return 'info';
    case CampaignStatus.Active:
      return 'warning';
    case CampaignStatus.Victory:
      return 'success';
    case CampaignStatus.Defeat:
    case CampaignStatus.Abandoned:
      return 'red';
    default:
      return 'info';
  }
}

export function getStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case CampaignStatus.Setup:
      return 'Setup';
    case CampaignStatus.Active:
      return 'Active';
    case CampaignStatus.Victory:
      return 'Victory';
    case CampaignStatus.Defeat:
      return 'Defeat';
    case CampaignStatus.Abandoned:
      return 'Abandoned';
    default:
      return status;
  }
}

export function CampaignDetailSkeleton(): React.ReactElement {
  return (
    <PageLayout
      title="Loading..."
      backLink="/gameplay/campaigns"
      backLabel="Back to Campaigns"
      maxWidth="wide"
    >
      <div className="border-border-theme-subtle mb-6 flex items-center gap-1 border-b pb-2">
        <SkeletonText width="w-20" />
        <SkeletonText width="w-28" />
      </div>

      <Card className="mb-6">
        <SkeletonText width="w-24" className="mb-4" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-deep rounded-lg p-3 text-center">
              <SkeletonText width="w-16" className="mx-auto mb-1" />
              <SkeletonText width="w-12" className="mx-auto" />
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonFormSection title="Mission Progression">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-surface-raised/50 h-8 w-8 animate-pulse rounded-full" />
                <SkeletonText width="w-32" />
              </div>
            ))}
          </div>
        </SkeletonFormSection>

        <SkeletonFormSection title="Mission Details">
          <div className="space-y-3">
            <SkeletonText width="w-full" />
            <SkeletonText width="w-3/4" />
            <SkeletonText width="w-24" />
          </div>
        </SkeletonFormSection>
      </div>
    </PageLayout>
  );
}

export function CampaignNotFound(): React.ReactElement {
  return (
    <PageLayout title="Campaign Not Found" backLink="/gameplay/campaigns">
      <Card>
        <p className="text-text-theme-secondary">
          The requested campaign could not be found.
        </p>
        <Link
          href="/gameplay/campaigns"
          className="text-accent mt-4 inline-block hover:underline"
        >
          Return to Campaigns
        </Link>
      </Card>
    </PageLayout>
  );
}

export interface CampaignTabBarProps {
  activeTab: 'overview' | 'audit';
  onTabChange: (tab: 'overview' | 'audit') => void;
}

export function CampaignTabBar({
  activeTab,
  onTabChange,
}: CampaignTabBarProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle mb-6 flex items-center gap-1 border-b">
      <button
        onClick={() => onTabChange('overview')}
        data-testid="tab-overview"
        className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'overview'
            ? 'text-accent'
            : 'text-text-theme-secondary hover:text-text-theme-primary'
        }`}
      >
        Overview
        {activeTab === 'overview' && (
          <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5" />
        )}
      </button>
      <button
        onClick={() => onTabChange('audit')}
        data-testid="tab-audit"
        className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'audit'
            ? 'text-accent'
            : 'text-text-theme-secondary hover:text-text-theme-primary'
        }`}
      >
        Audit Timeline
        {activeTab === 'audit' && (
          <span className="bg-accent absolute right-0 bottom-0 left-0 h-0.5" />
        )}
      </button>
    </div>
  );
}

export interface ResourcesCardProps {
  cBills: number;
  supplies: number;
  morale: number;
  salvageParts: number;
}

export function ResourcesCard({
  cBills,
  supplies,
  morale,
  salvageParts,
}: ResourcesCardProps): React.ReactElement {
  return (
    <Card className="mb-6" data-testid="resources-card">
      <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Resources
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-surface-deep rounded-lg p-3 text-center">
          <div
            className="text-accent text-2xl font-bold"
            data-testid="resource-cbills"
          >
            {(cBills / 1000000).toFixed(2)}M
          </div>
          <div className="text-text-theme-muted mt-1 text-xs tracking-wide uppercase">
            C-Bills
          </div>
        </div>
        <div className="bg-surface-deep rounded-lg p-3 text-center">
          <div
            className="text-2xl font-bold text-cyan-400"
            data-testid="resource-supplies"
          >
            {supplies}
          </div>
          <div className="text-text-theme-muted mt-1 text-xs tracking-wide uppercase">
            Supplies
          </div>
        </div>
        <div className="bg-surface-deep rounded-lg p-3 text-center">
          <div
            className={`text-2xl font-bold ${morale >= 50 ? 'text-emerald-400' : 'text-red-400'}`}
            data-testid="resource-morale"
          >
            {morale}%
          </div>
          <div className="text-text-theme-muted mt-1 text-xs tracking-wide uppercase">
            Morale
          </div>
        </div>
        <div className="bg-surface-deep rounded-lg p-3 text-center">
          <div
            className="text-2xl font-bold text-violet-400"
            data-testid="resource-salvage"
          >
            {salvageParts}
          </div>
          <div className="text-text-theme-muted mt-1 text-xs tracking-wide uppercase">
            Salvage
          </div>
        </div>
      </div>
    </Card>
  );
}

export interface MissionHistoryProps {
  missions: readonly ICampaignMission[];
}

export function MissionHistory({
  missions,
}: MissionHistoryProps): React.ReactElement {
  const completedMissions = missions.filter(
    (m) =>
      m.status === CampaignMissionStatus.Victory ||
      m.status === CampaignMissionStatus.Defeat,
  );

  if (completedMissions.length === 0) {
    return (
      <Card>
        <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
          Mission History
        </h2>
        <div className="text-text-theme-muted py-8 text-center">
          <p>No completed missions yet</p>
          <p className="mt-1 text-sm">
            Complete your first mission to see history here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Mission History
      </h2>
      <div className="space-y-3">
        {completedMissions.map((mission) => (
          <div
            key={mission.id}
            className="bg-surface-deep flex items-center justify-between rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  mission.status === CampaignMissionStatus.Victory
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {mission.status === CampaignMissionStatus.Victory ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-text-theme-primary font-medium">
                  {mission.name}
                </div>
                {mission.completedAt && (
                  <div className="text-text-theme-muted text-xs">
                    {new Date(mission.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {mission.outcome && (
              <div className="text-right text-sm">
                <div className="text-text-theme-secondary">
                  {mission.outcome.enemyUnitsDestroyed} kills
                </div>
                <div className="text-accent text-xs">
                  +{(mission.outcome.cBillsReward / 1000).toFixed(0)}K C-Bills
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
