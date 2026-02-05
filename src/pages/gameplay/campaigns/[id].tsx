import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * Campaign Detail Page
 * View and manage a single campaign with audit timeline.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */
import { useState, useCallback, useEffect } from 'react';

import { EventTimeline, TimelineFilters } from '@/components/audit/timeline';
import { MissionTreeView } from '@/components/campaign/MissionTreeView';
import { RosterStateDisplay } from '@/components/campaign/RosterStateDisplay';
import {
  SkeletonText,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, Card, Button, Badge } from '@/components/ui';
import { useCampaignTimeline } from '@/hooks/audit';
import { useCampaignStore } from '@/stores/useCampaignStore';
import {
  CampaignStatus,
  CampaignMissionStatus,
  ICampaignMission,
} from '@/types/campaign';
import { IBaseEvent, EventCategory } from '@/types/events';

// =============================================================================
// Tab Types
// =============================================================================

type CampaignTab = 'overview' | 'audit';

// =============================================================================
// Status Helpers
// =============================================================================

function getStatusColor(
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

function getStatusLabel(status: CampaignStatus): string {
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

// =============================================================================
// Resources Card Component
// =============================================================================

interface ResourcesCardProps {
  cBills: number;
  supplies: number;
  morale: number;
  salvageParts: number;
}

function ResourcesCard({
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

// =============================================================================
// Mission History Component
// =============================================================================

interface MissionHistoryProps {
  missions: readonly ICampaignMission[];
}

function MissionHistory({ missions }: MissionHistoryProps): React.ReactElement {
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

// =============================================================================
// Campaign Audit Tab Component
// =============================================================================

interface CampaignAuditTabProps {
  campaignId: string;
  campaignName: string;
}

function CampaignAuditTab({
  campaignId,
  campaignName,
}: CampaignAuditTabProps): React.ReactElement {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    EventCategory | undefined
  >(undefined);
  const [rootEventsOnly, setRootEventsOnly] = useState(false);

  const {
    allEvents,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    loadMore,
    refresh,
  } = useCampaignTimeline(campaignId, {
    pageSize: 50,
    infiniteScroll: true,
  });

  const handleEventClick = useCallback((event: IBaseEvent) => {
    setSelectedEventId((prev) => (prev === event.id ? null : event.id));
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters: { category?: EventCategory; rootEventsOnly?: boolean }) => {
      setCategoryFilter(newFilters.category);
      setRootEventsOnly(newFilters.rootEventsOnly || false);
      setFilters({
        ...filters,
        category: newFilters.category,
        rootEventsOnly: newFilters.rootEventsOnly || undefined,
      });
    },
    [filters, setFilters],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            Campaign Timeline
          </h2>
          <p className="text-text-theme-secondary text-sm">
            Event history for {campaignName}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="bg-surface-raised border-border-theme-subtle hover:border-border-theme rounded-lg border p-2 transition-colors disabled:opacity-50"
          aria-label="Refresh timeline"
        >
          <svg
            className={`text-text-theme-secondary h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <TimelineFilters
          filters={{
            category: categoryFilter,
            rootEventsOnly,
          }}
          onChange={handleFiltersChange}
        />
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <div
            className="flex items-center gap-3 p-4 text-red-400"
            role="alert"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error.message}</span>
          </div>
        </Card>
      )}

      {/* Results Count */}
      <div className="text-text-theme-secondary text-sm" aria-live="polite">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          <span>
            <span className="text-text-theme-primary font-medium">
              {pagination.total}
            </span>{' '}
            events
          </span>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && allEvents.length === 0 && (
        <Card className="p-8 text-center">
          <div className="bg-surface-raised/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-text-theme-muted h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-text-theme-primary mb-2 text-lg font-semibold">
            No Events Yet
          </h3>
          <p className="text-text-theme-secondary mx-auto max-w-md text-sm">
            This campaign has no recorded events. Events will appear here as
            missions are completed.
          </p>
        </Card>
      )}

      {/* Timeline */}
      {allEvents.length > 0 && (
        <Card className="overflow-hidden p-0">
          <EventTimeline
            events={allEvents as IBaseEvent[]}
            onEventClick={handleEventClick}
            onLoadMore={loadMore}
            hasMore={pagination.hasMore}
            isLoading={isLoading}
            selectedEventId={selectedEventId || undefined}
            maxHeight="calc(100vh - 400px)"
          />
        </Card>
      )}

      {/* Selected Event Details */}
      {selectedEventId && (
        <Card>
          <h3 className="text-text-theme-primary mb-4 text-lg font-semibold">
            Event Details
          </h3>
          {(() => {
            const event = allEvents.find((e) => e.id === selectedEventId);
            if (!event) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-theme-muted">ID:</span>{' '}
                    <code className="text-text-theme-secondary">
                      {event.id}
                    </code>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Sequence:</span>{' '}
                    <span className="text-text-theme-primary font-medium">
                      {event.sequence}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Category:</span>{' '}
                    <span className="text-text-theme-primary">
                      {event.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-theme-muted">Type:</span>{' '}
                    <span className="text-text-theme-primary">
                      {event.type}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-theme-muted">Timestamp:</span>{' '}
                    <span className="text-text-theme-secondary">
                      {event.timestamp}
                    </span>
                  </div>
                </div>
                {event.causedBy && (
                  <div className="border-border-theme-subtle border-t pt-3">
                    <span className="text-text-theme-muted">Caused by:</span>{' '}
                    <code className="text-cyan-400">
                      {event.causedBy.eventId}
                    </code>{' '}
                    <span className="text-text-theme-muted">
                      ({event.causedBy.relationship})
                    </span>
                  </div>
                )}
                <div className="border-border-theme-subtle border-t pt-3">
                  <span className="text-text-theme-muted mb-2 block">
                    Payload:
                  </span>
                  <pre className="bg-surface-base/50 overflow-x-auto rounded-lg p-3 text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CampaignDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id, tab: queryTab } = router.query;
  const { showToast } = useToast();

  const {
    getCampaign,
    startMission,
    deleteCampaign,
    setCampaignStatus,
    validateCampaign,
    validations,
    error,
    clearError,
  } = useCampaignStore();

  const [isClient, setIsClient] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMission, setSelectedMission] =
    useState<ICampaignMission | null>(null);

  // Tab state - default to overview, can be set via query param
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview');

  // Sync tab from query param
  useEffect(() => {
    if (queryTab === 'audit') {
      setActiveTab('audit');
    } else {
      setActiveTab('overview');
    }
  }, [queryTab]);

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: CampaignTab) => {
      setActiveTab(tab);
      // Update URL without full navigation
      const url =
        tab === 'overview'
          ? `/gameplay/campaigns/${id}`
          : `/gameplay/campaigns/${id}?tab=${tab}`;
      router.replace(url, undefined, { shallow: true });
    },
    [id, router],
  );

  const campaign = id && typeof id === 'string' ? getCampaign(id) : null;
  const validation = id && typeof id === 'string' ? validations.get(id) : null;

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Validate on load
  useEffect(() => {
    if (isClient && id && typeof id === 'string') {
      validateCampaign(id);
    }
  }, [isClient, id, validateCampaign]);

  // Get next available mission
  const nextMission = campaign?.missions.find(
    (m) => m.status === CampaignMissionStatus.Available,
  );

  const currentMission = campaign?.missions.find(
    (m) => m.status === CampaignMissionStatus.InProgress,
  );

  // Handle start mission
  const handleStartMission = useCallback(
    (missionId: string) => {
      if (!id || typeof id !== 'string') return;
      clearError();
      const success = startMission(id, missionId);
      if (success) {
        showToast({
          message: 'Mission started! Prepare for battle.',
          variant: 'info',
        });
        // Navigate to encounter/game (placeholder)
        router.push(`/gameplay/encounters`);
      } else {
        showToast({ message: 'Failed to start mission', variant: 'error' });
      }
    },
    [id, startMission, router, clearError, showToast],
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = deleteCampaign(id);
    if (success) {
      showToast({
        message: 'Campaign deleted successfully',
        variant: 'success',
      });
      router.push('/gameplay/campaigns');
    } else {
      showToast({ message: 'Failed to delete campaign', variant: 'error' });
    }
  }, [id, deleteCampaign, router, clearError, showToast]);

  // Handle abandon
  const handleAbandon = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = setCampaignStatus(id, CampaignStatus.Abandoned);
    if (success) {
      showToast({ message: 'Campaign abandoned', variant: 'warning' });
    } else {
      showToast({ message: 'Failed to abandon campaign', variant: 'error' });
    }
  }, [id, setCampaignStatus, clearError, showToast]);

  // Handle mission click
  const handleMissionClick = useCallback((mission: ICampaignMission) => {
    setSelectedMission(mission);
  }, []);

  if (!isClient) {
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
              <div
                key={i}
                className="bg-surface-deep rounded-lg p-3 text-center"
              >
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

  if (!campaign) {
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

  const isComplete =
    campaign.status === CampaignStatus.Victory ||
    campaign.status === CampaignStatus.Defeat ||
    campaign.status === CampaignStatus.Abandoned;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign.name },
  ];

  return (
    <PageLayout
      title={campaign.name}
      subtitle={campaign.description}
      breadcrumbs={breadcrumbs}
      backLink="/gameplay/campaigns"
      backLabel="Back to Campaigns"
      maxWidth="wide"
      headerContent={
        <div className="flex items-center gap-3">
          <Badge
            variant={getStatusColor(campaign.status)}
            size="lg"
            data-testid="campaign-status"
          >
            {getStatusLabel(campaign.status)}
          </Badge>

          {!isComplete && nextMission && !currentMission && (
            <Button
              variant="primary"
              onClick={() => handleStartMission(nextMission.id)}
            >
              Start Next Mission
            </Button>
          )}

          {currentMission && (
            <Link href="/gameplay/encounters">
              <Button variant="primary">Continue Mission</Button>
            </Link>
          )}
        </div>
      }
    >
      {/* Tab Navigation */}
      <div className="border-border-theme-subtle mb-6 flex items-center gap-1 border-b">
        <button
          onClick={() => handleTabChange('overview')}
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
          onClick={() => handleTabChange('audit')}
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

      {/* Tab Content */}
      {activeTab === 'audit' ? (
        <CampaignAuditTab
          campaignId={id as string}
          campaignName={campaign.name}
        />
      ) : (
        <>
          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Validation Warnings */}
          {validation &&
            (!validation.valid || validation.warnings.length > 0) && (
              <Card className="mb-6 border-yellow-600/30 bg-yellow-900/10">
                {validation.errors.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-medium text-red-400">
                      Configuration Required
                    </h3>
                    <ul className="space-y-1">
                      {validation.errors.map((err, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-red-300"
                        >
                          <span className="mt-0.5 text-red-400">•</span>
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-yellow-400">
                      Warnings
                    </h3>
                    <ul className="space-y-1">
                      {validation.warnings.map((warn, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-yellow-300"
                        >
                          <span className="mt-0.5 text-yellow-400">•</span>
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

          {/* Resources */}
          <ResourcesCard
            cBills={campaign.resources.cBills}
            supplies={campaign.resources.supplies}
            morale={campaign.resources.morale}
            salvageParts={campaign.resources.salvageParts}
          />

          {/* Main Content Grid */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Mission Tree */}
            <Card>
              <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
                Mission Progression
              </h2>
              <MissionTreeView
                missions={campaign.missions}
                currentMissionId={campaign.progress.currentMissionId}
                onMissionClick={handleMissionClick}
              />
            </Card>

            {/* Mission Details Panel */}
            <Card data-testid="mission-details-panel">
              <h2
                className="text-text-theme-primary mb-4 text-lg font-semibold"
                data-testid="mission-details-name"
              >
                {selectedMission ? selectedMission.name : 'Select a Mission'}
              </h2>
              {selectedMission ? (
                <div className="space-y-4">
                  <p className="text-text-theme-secondary">
                    {selectedMission.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedMission.status === CampaignMissionStatus.Victory
                          ? 'success'
                          : selectedMission.status ===
                              CampaignMissionStatus.Defeat
                            ? 'red'
                            : selectedMission.status ===
                                CampaignMissionStatus.Available
                              ? 'warning'
                              : selectedMission.status ===
                                  CampaignMissionStatus.InProgress
                                ? 'info'
                                : 'muted'
                      }
                    >
                      {selectedMission.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {selectedMission.isFinal && (
                      <Badge variant="violet">Final Mission</Badge>
                    )}
                  </div>

                  {selectedMission.optionalObjectives &&
                    selectedMission.optionalObjectives.length > 0 && (
                      <div>
                        <h4 className="text-text-theme-primary mb-2 text-sm font-medium">
                          Optional Objectives
                        </h4>
                        <ul className="space-y-1">
                          {selectedMission.optionalObjectives.map((obj, i) => (
                            <li
                              key={i}
                              className="text-text-theme-secondary flex items-start gap-2 text-sm"
                            >
                              <span className="text-accent">+</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {selectedMission.outcome && (
                    <div className="bg-surface-deep rounded-lg p-3">
                      <h4 className="text-text-theme-primary mb-2 text-sm font-medium">
                        Outcome
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-text-theme-muted">
                            Enemy Destroyed:
                          </span>{' '}
                          <span className="text-text-theme-primary">
                            {selectedMission.outcome.enemyUnitsDestroyed}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-theme-muted">
                            Units Lost:
                          </span>{' '}
                          <span className="text-text-theme-primary">
                            {selectedMission.outcome.playerUnitsDestroyed}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-theme-muted">
                            C-Bills Earned:
                          </span>{' '}
                          <span className="text-accent">
                            {(
                              selectedMission.outcome.cBillsReward / 1000
                            ).toFixed(0)}
                            K
                          </span>
                        </div>
                        <div>
                          <span className="text-text-theme-muted">Turns:</span>{' '}
                          <span className="text-text-theme-primary">
                            {selectedMission.outcome.turnsPlayed}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMission.status === CampaignMissionStatus.Available &&
                    !currentMission && (
                      <Button
                        variant="primary"
                        onClick={() => handleStartMission(selectedMission.id)}
                        className="w-full"
                      >
                        Start This Mission
                      </Button>
                    )}
                </div>
              ) : (
                <div className="text-text-theme-muted py-8 text-center">
                  <p>Click on a mission in the tree to view details</p>
                </div>
              )}
            </Card>
          </div>

          {/* Roster */}
          <div className="mb-6">
            <RosterStateDisplay
              units={campaign.roster.units}
              pilots={campaign.roster.pilots}
            />
          </div>

          {/* Mission History */}
          <MissionHistory missions={campaign.missions} />

          {/* Actions */}
          {!isComplete && (
            <div className="border-border-theme-subtle mt-6 flex justify-between border-t pt-6">
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="delete-campaign-btn"
                >
                  Delete Campaign
                </Button>
                <Button
                  variant="ghost"
                  className="text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300"
                  onClick={handleAbandon}
                >
                  Abandon Campaign
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="delete-confirm-dialog"
        >
          <Card className="mx-4 max-w-md">
            <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
              Delete Campaign?
            </h3>
            <p className="text-text-theme-secondary mb-4 text-sm">
              This will permanently delete &quot;{campaign.name}&quot; and all
              its progress. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                data-testid="cancel-delete-btn"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                data-testid="confirm-delete-btn"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
