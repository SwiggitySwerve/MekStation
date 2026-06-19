import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';

import { PageLayout, PageLoading } from '@/components/ui';
import { useRepairSelector } from '@/stores/useRepairStore';
import { RepairJobStatus, type IRepairJob } from '@/types/repair';
import { logger } from '@/utils/logger';

import {
  useRepairFilters,
  useRepairInitialization,
} from './RepairBayPage.hooks';
import {
  RepairAllOperationalState,
  RepairErrorBanner,
  RepairFiltersCard,
  RepairHeaderActions,
  RepairNoMatchesState,
  RepairQueueSection,
  RepairStatsOverview,
  RepairWorkspace,
} from './RepairBayPage.sections';
import {
  calculateRepairStats,
  filterAndSortJobs,
  getPendingJobsInPriorityOrder,
  reorderPendingJobs,
} from './RepairBayPage.utils';

const DEMO_CAMPAIGN_ID = 'demo-campaign';
const AVAILABLE_C_BILLS = 500000;

function getActiveCampaignId(
  campaignId: string | string[] | undefined,
): string {
  return typeof campaignId === 'string' ? campaignId : DEMO_CAMPAIGN_ID;
}

function getSelectedJob(
  activeCampaignId: string,
  selectedJobId: string | null,
  getJob: (campaignId: string, jobId: string) => IRepairJob | undefined,
): IRepairJob | null {
  if (!selectedJobId) return null;
  return getJob(activeCampaignId, selectedJobId) ?? null;
}

function getQueueJobs(allJobs: readonly IRepairJob[]): IRepairJob[] {
  return allJobs.filter(
    (job) =>
      job.status === RepairJobStatus.InProgress ||
      job.status === RepairJobStatus.Pending ||
      job.status === RepairJobStatus.Completed,
  );
}

function moveRepairJob(params: {
  readonly allJobs: readonly IRepairJob[];
  readonly activeCampaignId: string;
  readonly jobId: string;
  readonly direction: 'up' | 'down';
  readonly reorderJobs: (campaignId: string, orderedJobIds: string[]) => void;
}): void {
  const { allJobs, activeCampaignId, jobId, direction, reorderJobs } = params;
  const pendingJobs = getPendingJobsInPriorityOrder(allJobs);
  const reorderedIds = reorderPendingJobs(pendingJobs, jobId, direction);
  if (reorderedIds) {
    reorderJobs(activeCampaignId, reorderedIds);
  }
}

function startPendingRepairJobs(
  allJobs: readonly IRepairJob[],
  activeCampaignId: string,
  startJob: (campaignId: string, jobId: string) => void,
): void {
  const pendingJobs = allJobs.filter(
    (job) => job.status === RepairJobStatus.Pending,
  );
  pendingJobs.forEach((job) => {
    startJob(activeCampaignId, job.id);
  });
}

export default function RepairBayPage(): React.ReactElement {
  const router = useRouter();
  const { campaignId } = router.query;

  const activeCampaignId = getActiveCampaignId(campaignId);

  const isLoading = useRepairSelector((state) => state.isLoading);
  const error = useRepairSelector((state) => state.error);
  const selectedJobId = useRepairSelector((state) => state.selectedJobId);
  const getJobs = useRepairSelector((state) => state.getJobs);
  const getJob = useRepairSelector((state) => state.getJob);
  const selectJob = useRepairSelector((state) => state.selectJob);
  const startJob = useRepairSelector((state) => state.startJob);
  const cancelJob = useRepairSelector((state) => state.cancelJob);
  const toggleRepairItem = useRepairSelector((state) => state.toggleRepairItem);
  const selectAllItems = useRepairSelector((state) => state.selectAllItems);
  const deselectAllItems = useRepairSelector((state) => state.deselectAllItems);
  const reorderJobs = useRepairSelector((state) => state.reorderJobs);
  const initializeCampaign = useRepairSelector(
    (state) => state.initializeCampaign,
  );
  const clearError = useRepairSelector((state) => state.clearError);

  const {
    searchQuery,
    statusFilter,
    setStatusFilter,
    handleSearchChange,
    resetFilters,
  } = useRepairFilters();

  const isInitialized = useRepairInitialization({
    activeCampaignId,
    initializeCampaign,
  });

  const allJobs = getJobs(activeCampaignId);
  const selectedJob = getSelectedJob(activeCampaignId, selectedJobId, getJob);

  const filteredJobs = useMemo(() => {
    return filterAndSortJobs(allJobs, statusFilter, searchQuery);
  }, [allJobs, searchQuery, statusFilter]);

  const handleJobClick = useCallback(
    (jobId: string) => {
      selectJob(selectedJobId === jobId ? null : jobId);
    },
    [selectJob, selectedJobId],
  );

  const handleStartRepair = useCallback(() => {
    if (selectedJobId) {
      startJob(activeCampaignId, selectedJobId);
    }
  }, [activeCampaignId, selectedJobId, startJob]);

  const handleCancelJob = useCallback(
    (jobId: string) => {
      cancelJob(activeCampaignId, jobId);
      if (selectedJobId === jobId) {
        selectJob(null);
      }
    },
    [activeCampaignId, cancelJob, selectJob, selectedJobId],
  );

  const handleToggleItem = useCallback(
    (itemId: string) => {
      if (selectedJobId) {
        toggleRepairItem(activeCampaignId, selectedJobId, itemId);
      }
    },
    [activeCampaignId, selectedJobId, toggleRepairItem],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedJobId) {
      selectAllItems(activeCampaignId, selectedJobId);
    }
  }, [activeCampaignId, selectAllItems, selectedJobId]);

  const handleDeselectAll = useCallback(() => {
    if (selectedJobId) {
      deselectAllItems(activeCampaignId, selectedJobId);
    }
  }, [activeCampaignId, deselectAllItems, selectedJobId]);

  const handleMoveUp = useCallback(
    (jobId: string) => {
      moveRepairJob({
        allJobs,
        activeCampaignId,
        jobId,
        direction: 'up',
        reorderJobs,
      });
    },
    [activeCampaignId, allJobs, reorderJobs],
  );

  const handleMoveDown = useCallback(
    (jobId: string) => {
      moveRepairJob({
        allJobs,
        activeCampaignId,
        jobId,
        direction: 'down',
        reorderJobs,
      });
    },
    [activeCampaignId, allJobs, reorderJobs],
  );

  const handleFieldRepair = useCallback(() => {
    logger.debug('Field repair clicked');
  }, []);

  const handleRepairAll = useCallback(() => {
    startPendingRepairJobs(allJobs, activeCampaignId, startJob);
  }, [activeCampaignId, allJobs, startJob]);

  const stats = useMemo(() => calculateRepairStats(allJobs), [allJobs]);

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading repair bay..." />;
  }

  const queueJobs = getQueueJobs(allJobs);

  return (
    <PageLayout
      title="Repair Bay"
      subtitle="Manage unit repairs and restoration"
      maxWidth="wide"
      backLink="/gameplay"
      backLabel="Gameplay"
      headerContent={
        <RepairHeaderActions
          onFieldRepair={handleFieldRepair}
          onRepairAll={handleRepairAll}
          disableRepairAll={stats.pending === 0}
        />
      }
    >
      <RepairStatsOverview stats={stats} />

      {error && <RepairErrorBanner error={error} onDismiss={clearError} />}

      <RepairFiltersCard
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        filteredJobsCount={filteredJobs.length}
        showFilteredBadge={Boolean(searchQuery) || statusFilter !== 'all'}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={setStatusFilter}
      />

      {allJobs.length === 0 ? (
        <RepairAllOperationalState />
      ) : filteredJobs.length === 0 ? (
        <RepairNoMatchesState onClearFilters={resetFilters} />
      ) : (
        <RepairWorkspace
          filteredJobs={filteredJobs}
          selectedJobId={selectedJobId}
          selectedJob={selectedJob}
          availableCBills={AVAILABLE_C_BILLS}
          onJobClick={handleJobClick}
          onToggleItem={handleToggleItem}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onStartRepair={handleStartRepair}
        />
      )}

      {(stats.active > 0 || stats.pending > 0) && (
        <RepairQueueSection
          jobs={queueJobs}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onCancel={handleCancelJob}
          onJobClick={handleJobClick}
        />
      )}
    </PageLayout>
  );
}
