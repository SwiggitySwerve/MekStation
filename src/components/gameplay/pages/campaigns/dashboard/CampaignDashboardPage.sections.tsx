import { Badge, Button, Card, EmptyState, PageLayout } from '@/components/ui';

import type {
  CampaignDashboardCampaign,
  CampaignRosterUnit,
} from './CampaignDashboardPage.types';

import {
  getDamagePercent,
  getReadinessBadge,
} from './CampaignDashboardPage.utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  icon,
}: StatCardProps): React.ReactElement {
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

export function CampaignLoadingState(): React.ReactElement {
  return (
    <PageLayout title="Campaign" subtitle="Loading campaign..." maxWidth="wide">
      <div className="animate-pulse">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="h-32">
              <div className="h-full" />
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

interface CampaignNotFoundStateProps {
  onCreateCampaign: () => void;
}

export function CampaignNotFoundState({
  onCreateCampaign,
}: CampaignNotFoundStateProps): React.ReactElement {
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
          <Button variant="primary" onClick={onCreateCampaign}>
            Create Campaign
          </Button>
        }
      />
    </PageLayout>
  );
}

interface CampaignHeaderContentProps {
  currentDate: Date;
  onAdvanceDay: () => void;
  onAdvanceWeek: () => void;
  onAdvanceMonth: () => void;
}

export function CampaignHeaderContent({
  currentDate,
  onAdvanceDay,
  onAdvanceWeek,
  onAdvanceMonth,
}: CampaignHeaderContentProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-text-theme-secondary text-sm">Current Date</p>
        <p className="text-text-theme-primary text-lg font-semibold">
          {currentDate.toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          onClick={onAdvanceDay}
          data-testid="advance-day-btn"
        >
          Advance Day
        </Button>
        <Button
          variant="secondary"
          onClick={onAdvanceWeek}
          data-testid="advance-week-btn"
        >
          Advance Week
        </Button>
        <Button
          variant="secondary"
          onClick={onAdvanceMonth}
          data-testid="advance-month-btn"
        >
          Advance Month
        </Button>
      </div>
    </div>
  );
}

interface CampaignStatsGridProps {
  campaign: CampaignDashboardCampaign;
}

export function CampaignStatsGrid({
  campaign,
}: CampaignStatsGridProps): React.ReactElement {
  return (
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
  );
}

interface CampaignOperationsCardProps {
  missionCount: number;
  isGenerating: boolean;
  isGenerateDisabled: boolean;
  onGenerateMission: () => void;
}

export function CampaignOperationsCard({
  missionCount,
  isGenerating,
  isGenerateDisabled,
  onGenerateMission,
}: CampaignOperationsCardProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            Operations
          </h2>
          <p className="text-text-theme-secondary text-sm">
            {missionCount} missions completed
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onGenerateMission}
          disabled={isGenerateDisabled}
          data-testid="generate-mission-btn"
        >
          {isGenerating ? 'Generating...' : 'Generate Mission'}
        </Button>
      </div>
    </Card>
  );
}

interface CampaignRosterCardProps {
  units: CampaignRosterUnit[];
}

export function CampaignRosterCard({
  units,
}: CampaignRosterCardProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Roster
      </h2>
      {units.length === 0 ? (
        <p className="text-text-theme-muted py-4 text-center text-sm">
          No units in roster. Create a new campaign with units to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <div
              key={unit.unitId}
              className={`bg-surface-deep border-border-theme-subtle rounded-lg border p-4 ${
                unit.readiness === 'Destroyed' ? 'opacity-50' : ''
              }`}
              data-testid="roster-unit-card"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-text-theme-primary font-semibold">
                  {unit.unitName}
                </span>
                <Badge variant={getReadinessBadge(unit.readiness)} size="sm">
                  {unit.readiness}
                </Badge>
              </div>
              {unit.readiness === 'Damaged' && (
                <div className="mt-2">
                  <div className="bg-surface-raised h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                      style={{
                        width: `${getDamagePercent(unit.armorDamage)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
