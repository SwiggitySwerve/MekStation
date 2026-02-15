import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';

import { PageLayout, PageLoading } from '@/components/ui';
import { useRepairStore } from '@/stores/useRepairStore';
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

export default function RepairBayPage(): React.ReactElement {
  const router = useRouter();
  const { campaignId } = router.query;

  const activeCampaignId = (campaignId as string) || 'demo-campaign';

  const {
    isLoading,
    error,
    selectedJobId,
    getJobs,
    getJob,
    selectJob,
    startJob,
    cancelJob,
    toggleRepairItem,
    selectAllItems,
    deselectAllItems,
    reorderJobs,
    initializeCampaign,
    clearError,
  } = useRepairStore();

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
  const selectedJob: IRepairJob | null = selectedJobId
    ? (getJob(activeCampaignId, selectedJobId) ?? null)
    : null;

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
      const pendingJobs = getPendingJobsInPriorityOrder(allJobs);
      const reorderedIds = reorderPendingJobs(pendingJobs, jobId, 'up');
      if (reorderedIds) {
        reorderJobs(activeCampaignId, reorderedIds);
      }
    },
    [activeCampaignId, allJobs, reorderJobs],
  );

  const handleMoveDown = useCallback(
    (jobId: string) => {
      const pendingJobs = getPendingJobsInPriorityOrder(allJobs);
      const reorderedIds = reorderPendingJobs(pendingJobs, jobId, 'down');
      if (reorderedIds) {
        reorderJobs(activeCampaignId, reorderedIds);
      }
    },
    [activeCampaignId, allJobs, reorderJobs],
  );

  const handleFieldRepair = useCallback(() => {
    logger.debug('Field repair clicked');
  }, []);

  const handleRepairAll = useCallback(() => {
    const pendingJobs = allJobs.filter(
      (job) => job.status === RepairJobStatus.Pending,
    );
    pendingJobs.forEach((job) => {
      startJob(activeCampaignId, job.id);
    });
  }, [activeCampaignId, allJobs, startJob]);

  const stats = useMemo(() => calculateRepairStats(allJobs), [allJobs]);

  const availableCBills = 500000;

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading repair bay..." />;
  }

  const queueJobs = allJobs.filter(
    (job) =>
      job.status === RepairJobStatus.InProgress ||
      job.status === RepairJobStatus.Pending ||
      job.status === RepairJobStatus.Completed,
  );

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
          availableCBills={availableCBills}
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
