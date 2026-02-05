import { useRouter } from 'next/router';
/**
 * Campaign Dashboard Page
 * Overview of a single campaign with stats and day advancement.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState, useCallback } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { DayReportPanel } from '@/components/campaign/DayReportPanel';
import { PageLayout, Card, Button, EmptyState } from '@/components/ui';
import { DayReport } from '@/lib/campaign/dayAdvancement';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps): React.ReactElement {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-theme-secondary mb-1 text-sm">{label}</p>
          <p className="text-text-theme-primary text-3xl font-bold">{value}</p>
        </div>
        {icon && <div className="text-accent opacity-50">{icon}</div>}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CampaignDashboardPage(): React.ReactElement {
  const router = useRouter();
  const { id: _id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const [isClient, setIsClient] = useState(false);
  const [dayReports, setDayReports] = useState<DayReport[]>([]);

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  const handleAdvanceDay = useCallback(() => {
    const report = store.getState().advanceDay();
    if (report && campaign?.options.enableDayReportNotifications) {
      setDayReports([report]);
    }
  }, [store, campaign?.options.enableDayReportNotifications]);

  const handleAdvanceWeek = useCallback(() => {
    const reports = store.getState().advanceDays(7);
    if (reports && campaign?.options.enableDayReportNotifications) {
      setDayReports(reports);
    }
  }, [store, campaign?.options.enableDayReportNotifications]);

  const handleAdvanceMonth = useCallback(() => {
    const reports = store.getState().advanceDays(30);
    if (reports && campaign?.options.enableDayReportNotifications) {
      setDayReports(reports);
    }
  }, [store, campaign?.options.enableDayReportNotifications]);

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Campaign"
        subtitle="Loading campaign..."
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-32">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  // Handle campaign not found
  if (!campaign) {
    return (
      <PageLayout
        title="Campaign Not Found"
        subtitle="The requested campaign could not be found"
        maxWidth="wide"
        backLink="/gameplay/campaigns"
        backLabel="Back to Campaigns"
      >
        <EmptyState
          icon={
            <div className="bg-surface-raised/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          }
          title="Campaign not found"
          message="No campaign is currently loaded. Create a new campaign to get started."
          action={
            <Button
              variant="primary"
              onClick={() => router.push('/gameplay/campaigns/create')}
            >
              Create Campaign
            </Button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={campaign.name}
      subtitle={`Faction: ${campaign.factionId}`}
      maxWidth="wide"
      headerContent={
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-text-theme-secondary text-sm">Current Date</p>
            <p className="text-text-theme-primary text-lg font-semibold">
              {campaign.currentDate.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleAdvanceDay}
              data-testid="advance-day-btn"
            >
              Advance Day
            </Button>
            <Button
              variant="secondary"
              onClick={handleAdvanceWeek}
              data-testid="advance-week-btn"
            >
              Advance Week
            </Button>
            <Button
              variant="secondary"
              onClick={handleAdvanceMonth}
              data-testid="advance-month-btn"
            >
              Advance Month
            </Button>
          </div>
        </div>
      }
    >
      {/* Navigation Tabs */}
      <CampaignNavigation campaignId={campaign.id} currentPage="dashboard" />

      {/* Day Report */}
      {dayReports.length > 0 && (
        <DayReportPanel
          reports={dayReports}
          onDismiss={() => setDayReports([])}
        />
      )}

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Personnel"
          value={campaign.personnel.size}
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Forces"
          value={campaign.forces.size}
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
        <StatCard
          label="Missions"
          value={campaign.missions.size}
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          }
        />
        <StatCard
          label="Balance"
          value={campaign.finances.balance.format()}
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/gameplay/campaigns/${campaign.id}/personnel`)
            }
            className="justify-start"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Manage Personnel
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/gameplay/campaigns/${campaign.id}/forces`)
            }
            className="justify-start"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Organize Forces
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/gameplay/campaigns/${campaign.id}/missions`)
            }
            className="justify-start"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            View Missions
          </Button>
        </div>
      </Card>

      {/* Campaign Info */}
      <Card>
        <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
          Campaign Information
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-text-theme-secondary mb-1 text-sm">
              Campaign ID
            </p>
            <p className="text-text-theme-primary font-mono text-sm">
              {campaign.id}
            </p>
          </div>
          <div>
            <p className="text-text-theme-secondary mb-1 text-sm">Created</p>
            <p className="text-text-theme-primary">
              {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-text-theme-secondary mb-1 text-sm">
              Last Updated
            </p>
            <p className="text-text-theme-primary">
              {new Date(campaign.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-text-theme-secondary mb-1 text-sm">Root Force</p>
            <p className="text-text-theme-primary">{campaign.rootForceId}</p>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
