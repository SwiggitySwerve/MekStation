import type { IRepairJob } from '@/types/repair';

import { RepairQueue } from '@/components/repair';
import { Button, Card, Input, EmptyState } from '@/components/ui';

import type { RepairStats, StatusFilter } from './RepairBayPage.types';

export { UnitRepairCard } from './RepairBayPage.UnitRepairCard';

interface RepairHeaderActionsProps {
  onFieldRepair: () => void;
  onRepairAll: () => void;
  disableRepairAll: boolean;
}

export function RepairHeaderActions({
  onFieldRepair,
  onRepairAll,
  disableRepairAll,
}: RepairHeaderActionsProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <Button
        data-testid="repair-field-btn"
        variant="secondary"
        onClick={onFieldRepair}
        leftIcon={
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      >
        Field Repair
      </Button>
      <Button
        data-testid="repair-all-btn"
        variant="primary"
        onClick={onRepairAll}
        disabled={disableRepairAll}
        leftIcon={
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
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        }
      >
        Repair All
      </Button>
    </div>
  );
}

interface RepairStatsOverviewProps {
  stats: RepairStats;
}

export function RepairStatsOverview({
  stats,
}: RepairStatsOverviewProps): React.ReactElement {
  return (
    <div
      className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4"
      data-testid="repair-stats"
    >
      <Card className="!p-4">
        <div className="text-text-theme-muted mb-1 text-xs tracking-wider uppercase">
          Active
        </div>
        <div
          data-testid="repair-stats-active"
          className="text-2xl font-bold text-cyan-400 tabular-nums"
        >
          {stats.active}
        </div>
      </Card>
      <Card className="!p-4">
        <div className="text-text-theme-muted mb-1 text-xs tracking-wider uppercase">
          Pending
        </div>
        <div
          data-testid="repair-stats-pending"
          className="text-2xl font-bold text-amber-400 tabular-nums"
        >
          {stats.pending}
        </div>
      </Card>
      <Card className="!p-4">
        <div className="text-text-theme-muted mb-1 text-xs tracking-wider uppercase">
          Completed
        </div>
        <div
          data-testid="repair-stats-completed"
          className="text-2xl font-bold text-emerald-400 tabular-nums"
        >
          {stats.complete}
        </div>
      </Card>
      <Card className="!p-4">
        <div className="text-text-theme-muted mb-1 text-xs tracking-wider uppercase">
          Est. Cost
        </div>
        <div
          data-testid="repair-stats-cost"
          className="text-accent text-2xl font-bold tabular-nums"
        >
          {stats.totalCost.toLocaleString()}
        </div>
      </Card>
    </div>
  );
}

interface RepairErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

export function RepairErrorBanner({
  error,
  onDismiss,
}: RepairErrorBannerProps): React.ReactElement {
  return (
    <div
      data-testid="repair-error"
      className="mb-6 flex items-center justify-between rounded-lg border border-red-600/30 bg-red-900/20 p-4"
    >
      <p className="text-sm text-red-400">{error}</p>
      <button
        data-testid="repair-error-dismiss"
        onClick={onDismiss}
        className="text-red-400 transition-colors hover:text-red-300"
      >
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
      </button>
    </div>
  );
}

interface RepairFiltersCardProps {
  searchQuery: string;
  statusFilter: StatusFilter;
  filteredJobsCount: number;
  showFilteredBadge: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export function RepairFiltersCard({
  searchQuery,
  statusFilter,
  filteredJobsCount,
  showFilteredBadge,
  onSearchChange,
  onStatusFilterChange,
}: RepairFiltersCardProps): React.ReactElement {
  return (
    <Card className="mb-6" data-testid="repair-filters">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <Input
            data-testid="repair-search-input"
            type="text"
            placeholder="Search units..."
            value={searchQuery}
            onChange={onSearchChange}
            aria-label="Search units"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'in-progress', 'complete'] as const).map(
            (status) => (
              <Button
                key={status}
                data-testid={`repair-status-filter-${status}`}
                variant={statusFilter === status ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onStatusFilterChange(status)}
              >
                {status === 'all'
                  ? 'All'
                  : status === 'in-progress'
                    ? 'In Progress'
                    : status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ),
          )}
        </div>
      </div>

      <div
        data-testid="repair-results-count"
        className="text-text-theme-secondary mt-4 text-sm"
      >
        Showing {filteredJobsCount} unit{filteredJobsCount !== 1 ? 's' : ''}
        {showFilteredBadge && (
          <span className="text-accent ml-1">(filtered)</span>
        )}
      </div>
    </Card>
  );
}

export function RepairAllOperationalState(): React.ReactElement {
  return (
    <EmptyState
      data-testid="repair-all-operational"
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
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      }
      title="All Units Operational"
      message="No units currently require repairs. All systems nominal."
    />
  );
}

interface RepairNoMatchesStateProps {
  onClearFilters: () => void;
}

export function RepairNoMatchesState({
  onClearFilters,
}: RepairNoMatchesStateProps): React.ReactElement {
  return (
    <EmptyState
      data-testid="repair-empty-state"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
      title="No Matches"
      message="No units match your current filters"
      action={
        <Button variant="secondary" onClick={onClearFilters}>
          Clear Filters
        </Button>
      }
    />
  );
}

export { RepairWorkspace } from './RepairBayPage.RepairWorkspace';

interface RepairQueueSectionProps {
  jobs: IRepairJob[];
  onMoveUp: (jobId: string) => void;
  onMoveDown: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
}

export function RepairQueueSection({
  jobs,
  onMoveUp,
  onMoveDown,
  onCancel,
  onJobClick,
}: RepairQueueSectionProps): React.ReactElement {
  return (
    <div className="mt-8" data-testid="repair-queue-section">
      <RepairQueue
        jobs={jobs}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onCancel={onCancel}
        onJobClick={onJobClick}
      />
    </div>
  );
}
