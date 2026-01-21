/**
 * Repair Bay Page
 * Main repair management interface for campaign units.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  PageLoading,
  Card,
  Input,
  Button,
  Badge,
  EmptyState,
} from '@/components/ui';
import { useRepairStore } from '@/stores/useRepairStore';
import {
  DamageAssessmentPanel,
  RepairQueue,
  RepairCostBreakdown,
} from '@/components/repair';
import {
  IRepairJob,
  RepairJobStatus,
} from '@/types/repair';

// =============================================================================
// Filter Types
// =============================================================================

type StatusFilter = 'all' | 'pending' | 'in-progress' | 'complete';

const STATUS_FILTER_MAP: Record<StatusFilter, RepairJobStatus | null> = {
  all: null,
  pending: RepairJobStatus.Pending,
  'in-progress': RepairJobStatus.InProgress,
  complete: RepairJobStatus.Completed,
};

// =============================================================================
// Unit Card Component
// =============================================================================

interface UnitRepairCardProps {
  job: IRepairJob;
  onClick: () => void;
  isSelected?: boolean;
}

function UnitRepairCard({ job, onClick, isSelected = false }: UnitRepairCardProps): React.ReactElement {
  const damagePercent = 100 - ((job.totalCost / 50000) * 100); // Rough estimate
  const isComplete = job.status === RepairJobStatus.Completed;
  const isActive = job.status === RepairJobStatus.InProgress;

  const statusColors: Record<RepairJobStatus, string> = {
    [RepairJobStatus.Pending]: 'border-l-amber-500',
    [RepairJobStatus.InProgress]: 'border-l-cyan-500',
    [RepairJobStatus.Completed]: 'border-l-emerald-500',
    [RepairJobStatus.Cancelled]: 'border-l-red-500',
    [RepairJobStatus.Blocked]: 'border-l-orange-500',
  };

  const statusBadgeVariants: Record<RepairJobStatus, 'amber' | 'cyan' | 'emerald' | 'red' | 'orange'> = {
    [RepairJobStatus.Pending]: 'amber',
    [RepairJobStatus.InProgress]: 'cyan',
    [RepairJobStatus.Completed]: 'emerald',
    [RepairJobStatus.Cancelled]: 'red',
    [RepairJobStatus.Blocked]: 'orange',
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-200
        ${statusColors[job.status]}
        ${isSelected
          ? 'bg-accent/10 border border-accent/40 shadow-lg shadow-accent/10'
          : 'bg-surface-raised/60 border border-border-theme-subtle hover:border-border-theme hover:bg-surface-raised'
        }
        ${isComplete ? 'opacity-70 hover:opacity-100' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-text-theme-primary truncate group-hover:text-accent transition-colors">
            {job.unitName}
          </h4>
          <p className="text-xs text-text-theme-muted">
            {job.items.length} repair{job.items.length !== 1 ? 's' : ''} needed
          </p>
        </div>
        <Badge variant={statusBadgeVariants[job.status]} size="sm">
          {job.status === RepairJobStatus.InProgress ? 'ACTIVE' : job.status.toUpperCase()}
        </Badge>
      </div>

      {/* Damage Summary */}
      <div className="flex items-center gap-3 mb-3">
        {/* Mini damage indicator */}
        <div className="flex-1 h-1.5 bg-surface-deep rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              damagePercent > 75 ? 'bg-emerald-500' :
              damagePercent > 50 ? 'bg-amber-500' :
              damagePercent > 25 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.max(damagePercent, 5)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-text-theme-secondary">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.timeRemainingHours}h
          </span>
        </div>
        <span className="font-semibold text-accent tabular-nums">
          {job.totalCost.toLocaleString()} C-Bills
        </span>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -inset-px rounded-xl border-2 border-accent pointer-events-none" />
      )}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function RepairBayPage(): React.ReactElement {
  const router = useRouter();
  const { campaignId } = router.query;

  // For demo purposes, use a default campaign ID
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

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize campaign data
  useEffect(() => {
    initializeCampaign(activeCampaignId);
    setIsInitialized(true);
  }, [activeCampaignId, initializeCampaign]);

  // Get jobs for this campaign
  const allJobs = getJobs(activeCampaignId);
  const selectedJob = selectedJobId ? getJob(activeCampaignId, selectedJobId) : null;

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let jobs = [...allJobs];

    // Apply status filter
    const targetStatus = STATUS_FILTER_MAP[statusFilter];
    if (targetStatus !== null) {
      jobs = jobs.filter(j => j.status === targetStatus);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      jobs = jobs.filter(j => j.unitName.toLowerCase().includes(query));
    }

    // Sort by priority then by status
    return jobs.sort((a, b) => {
      // Active jobs first
      if (a.status === RepairJobStatus.InProgress && b.status !== RepairJobStatus.InProgress) return -1;
      if (b.status === RepairJobStatus.InProgress && a.status !== RepairJobStatus.InProgress) return 1;
      // Then pending by priority
      if (a.status === RepairJobStatus.Pending && b.status === RepairJobStatus.Pending) {
        return a.priority - b.priority;
      }
      // Completed last
      if (a.status === RepairJobStatus.Completed && b.status !== RepairJobStatus.Completed) return 1;
      if (b.status === RepairJobStatus.Completed && a.status !== RepairJobStatus.Completed) return -1;
      return 0;
    });
  }, [allJobs, statusFilter, searchQuery]);

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleJobClick = useCallback((jobId: string) => {
    selectJob(selectedJobId === jobId ? null : jobId);
  }, [selectedJobId, selectJob]);

  const handleStartRepair = useCallback(() => {
    if (selectedJobId) {
      startJob(activeCampaignId, selectedJobId);
    }
  }, [activeCampaignId, selectedJobId, startJob]);

  const handleCancelJob = useCallback((jobId: string) => {
    cancelJob(activeCampaignId, jobId);
    if (selectedJobId === jobId) {
      selectJob(null);
    }
  }, [activeCampaignId, selectedJobId, cancelJob, selectJob]);

  const handleToggleItem = useCallback((itemId: string) => {
    if (selectedJobId) {
      toggleRepairItem(activeCampaignId, selectedJobId, itemId);
    }
  }, [activeCampaignId, selectedJobId, toggleRepairItem]);

  const handleSelectAll = useCallback(() => {
    if (selectedJobId) {
      selectAllItems(activeCampaignId, selectedJobId);
    }
  }, [activeCampaignId, selectedJobId, selectAllItems]);

  const handleDeselectAll = useCallback(() => {
    if (selectedJobId) {
      deselectAllItems(activeCampaignId, selectedJobId);
    }
  }, [activeCampaignId, selectedJobId, deselectAllItems]);

  const handleMoveUp = useCallback((jobId: string) => {
    const pendingJobs = allJobs
      .filter(j => j.status === RepairJobStatus.Pending)
      .sort((a, b) => a.priority - b.priority);
    
    const currentIndex = pendingJobs.findIndex(j => j.id === jobId);
    if (currentIndex > 0) {
      const newOrder = [...pendingJobs];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
      reorderJobs(activeCampaignId, newOrder.map(j => j.id));
    }
  }, [activeCampaignId, allJobs, reorderJobs]);

  const handleMoveDown = useCallback((jobId: string) => {
    const pendingJobs = allJobs
      .filter(j => j.status === RepairJobStatus.Pending)
      .sort((a, b) => a.priority - b.priority);
    
    const currentIndex = pendingJobs.findIndex(j => j.id === jobId);
    if (currentIndex < pendingJobs.length - 1) {
      const newOrder = [...pendingJobs];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      reorderJobs(activeCampaignId, newOrder.map(j => j.id));
    }
  }, [activeCampaignId, allJobs, reorderJobs]);

  const handleFieldRepair = useCallback(() => {
    // TODO: Implement field repair modal
    console.log('Field repair clicked');
  }, []);

  const handleRepairAll = useCallback(() => {
    // Start all pending jobs that can be started
    const pendingJobs = allJobs.filter(j => j.status === RepairJobStatus.Pending);
    pendingJobs.forEach(job => {
      startJob(activeCampaignId, job.id);
    });
  }, [activeCampaignId, allJobs, startJob]);

  // Stats
  const stats = useMemo(() => {
    const pending = allJobs.filter(j => j.status === RepairJobStatus.Pending);
    const active = allJobs.filter(j => j.status === RepairJobStatus.InProgress);
    const complete = allJobs.filter(j => j.status === RepairJobStatus.Completed);
    const totalCost = pending.reduce((sum, j) => sum + j.totalCost, 0);
    return { pending: pending.length, active: active.length, complete: complete.length, totalCost };
  }, [allJobs]);

  // Demo C-Bills (in a real app, this would come from campaign state)
  const availableCBills = 500000;

  if (!isInitialized || isLoading) {
    return <PageLoading message="Loading repair bay..." />;
  }

  return (
    <PageLayout
      title="Repair Bay"
      subtitle="Manage unit repairs and restoration"
      maxWidth="wide"
      backLink="/gameplay"
      backLabel="Gameplay"
      headerContent={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleFieldRepair}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            Field Repair
          </Button>
          <Button
            variant="primary"
            onClick={handleRepairAll}
            disabled={stats.pending === 0}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          >
            Repair All
          </Button>
        </div>
      }
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="!p-4">
          <div className="text-xs text-text-theme-muted uppercase tracking-wider mb-1">Active</div>
          <div className="text-2xl font-bold text-cyan-400 tabular-nums">{stats.active}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-xs text-text-theme-muted uppercase tracking-wider mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-400 tabular-nums">{stats.pending}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-xs text-text-theme-muted uppercase tracking-wider mb-1">Completed</div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.complete}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-xs text-text-theme-muted uppercase tracking-wider mb-1">Est. Cost</div>
          <div className="text-2xl font-bold text-accent tabular-nums">{stats.totalCost.toLocaleString()}</div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-600/30 flex items-center justify-between">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search units..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search units"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'in-progress', 'complete'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : 
                 status === 'in-progress' ? 'In Progress' : 
                 status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-text-theme-secondary">
          Showing {filteredJobs.length} unit{filteredJobs.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && (
            <span className="text-accent ml-1">(filtered)</span>
          )}
        </div>
      </Card>

      {/* Main Content */}
      {allJobs.length === 0 ? (
        <EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          }
          title="All Units Operational"
          message="No units currently require repairs. All systems nominal."
        />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          }
          title="No Matches"
          message="No units match your current filters"
          action={
            <Button variant="secondary" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Unit List */}
          <div className="xl:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-text-theme-muted uppercase tracking-wider mb-3">
              Units Requiring Repair
            </h3>
            <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {filteredJobs.map(job => (
                <UnitRepairCard
                  key={job.id}
                  job={job}
                  onClick={() => handleJobClick(job.id)}
                  isSelected={selectedJobId === job.id}
                />
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="xl:col-span-2">
            {selectedJob ? (
              <div className="space-y-6">
                <DamageAssessmentPanel
                  job={selectedJob}
                  onToggleItem={handleToggleItem}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onStartRepair={handleStartRepair}
                  onPartialRepair={handleStartRepair}
                  availableCBills={availableCBills}
                />
                <RepairCostBreakdown
                  job={selectedJob}
                  availableCBills={availableCBills}
                />
              </div>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-deep flex items-center justify-center">
                    <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-text-theme-primary mb-1">
                    Select a Unit
                  </h3>
                  <p className="text-sm text-text-theme-secondary">
                    Click on a unit to view damage assessment and repair options
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Repair Queue (when there are active/pending jobs) */}
      {(stats.active > 0 || stats.pending > 0) && (
        <div className="mt-8">
          <RepairQueue
            jobs={allJobs.filter(j => 
              j.status === RepairJobStatus.InProgress ||
              j.status === RepairJobStatus.Pending ||
              j.status === RepairJobStatus.Completed
            )}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onCancel={handleCancelJob}
            onJobClick={handleJobClick}
          />
        </div>
      )}
    </PageLayout>
  );
}
