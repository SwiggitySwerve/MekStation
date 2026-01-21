/**
 * Repair Queue Component
 * Displays and manages queued repair jobs with reordering capability.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */
import React, { useCallback } from 'react';
import { Card, Badge } from '@/components/ui';
import { IRepairJob, RepairJobStatus } from '@/types/repair';

// =============================================================================
// Progress Bar Component
// =============================================================================

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

function ProgressBar({ current, total, className = '' }: ProgressBarProps): React.ReactElement {
  const percent = total > 0 ? ((total - current) / total) * 100 : 0;

  return (
    <div className={`relative h-2 bg-surface-deep rounded-full overflow-hidden ${className}`}>
      {/* Background track lines */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-surface-base/30 last:border-r-0"
          />
        ))}
      </div>
      {/* Progress fill */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-amber-400 transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      >
        {/* Animated shine */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Queue Item Component
// =============================================================================

interface QueueItemProps {
  job: IRepairJob;
  index: number;
  onMoveUp?: (jobId: string) => void;
  onMoveDown?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onClick?: (jobId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function QueueItem({
  job,
  index,
  onMoveUp,
  onMoveDown,
  onCancel,
  onClick,
  isFirst = false,
  isLast = false,
}: QueueItemProps): React.ReactElement {
  const isInProgress = job.status === RepairJobStatus.InProgress;
  const isPending = job.status === RepairJobStatus.Pending;
  const timeRemaining = job.timeRemainingHours;
  const totalTime = job.totalTimeHours;

  const statusVariants: Record<RepairJobStatus, 'emerald' | 'amber' | 'slate' | 'red' | 'orange'> = {
    [RepairJobStatus.Completed]: 'emerald',
    [RepairJobStatus.InProgress]: 'amber',
    [RepairJobStatus.Pending]: 'slate',
    [RepairJobStatus.Cancelled]: 'red',
    [RepairJobStatus.Blocked]: 'orange',
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours.toFixed(0)}h`;
  };

  return (
    <div
      data-testid={`repair-queue-item-${job.id}`}
      className={`
        group relative flex items-stretch gap-3 p-4 rounded-xl border transition-all cursor-pointer
        ${isInProgress 
          ? 'bg-accent/10 border-accent/40 shadow-lg shadow-accent/10' 
          : 'bg-surface-raised/60 border-border-theme-subtle hover:border-border-theme hover:bg-surface-raised'
        }
      `}
      onClick={() => onClick?.(job.id)}
    >
      {/* Priority indicator */}
      <div className="flex flex-col items-center justify-center w-8">
        <span className={`
          text-lg font-bold tabular-nums
          ${isInProgress ? 'text-accent' : 'text-text-theme-muted'}
        `}>
          {index + 1}
        </span>
        {isPending && (
          <div className="flex flex-col gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              data-testid={`repair-queue-up-${job.id}`}
              onClick={(e) => { e.stopPropagation(); onMoveUp?.(job.id); }}
              disabled={isFirst}
              className={`
                p-1 rounded hover:bg-surface-deep transition-colors
                ${isFirst ? 'text-text-theme-muted/30 cursor-not-allowed' : 'text-text-theme-secondary hover:text-accent'}
              `}
              aria-label="Move up"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              data-testid={`repair-queue-down-${job.id}`}
              onClick={(e) => { e.stopPropagation(); onMoveDown?.(job.id); }}
              disabled={isLast}
              className={`
                p-1 rounded hover:bg-surface-deep transition-colors
                ${isLast ? 'text-text-theme-muted/30 cursor-not-allowed' : 'text-text-theme-secondary hover:text-accent'}
              `}
              aria-label="Move down"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text-theme-primary truncate">
              {job.unitName}
            </h4>
            <p className="text-xs text-text-theme-muted truncate">
              {job.items.filter(i => i.selected).length} repairs selected
            </p>
          </div>
          <Badge data-testid={`repair-queue-status-${job.id}`} variant={statusVariants[job.status]} size="sm">
            {job.status === RepairJobStatus.InProgress ? 'ACTIVE' : job.status.toUpperCase()}
          </Badge>
        </div>

        {/* Progress bar for in-progress jobs */}
        {isInProgress && (
          <div className="mb-3">
            <ProgressBar current={timeRemaining} total={totalTime} />
            <div className="flex justify-between mt-1.5 text-xs">
              <span className="text-text-theme-muted">
                {Math.round(((totalTime - timeRemaining) / totalTime) * 100)}% complete
              </span>
              <span className="text-accent font-medium tabular-nums">
                {formatTime(timeRemaining)} remaining
              </span>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-text-theme-secondary">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tabular-nums">{formatTime(isPending ? totalTime : timeRemaining)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-theme-secondary">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tabular-nums font-medium">{job.totalCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      {(isPending || isInProgress) && (
        <button
          data-testid={`repair-queue-cancel-${job.id}`}
          onClick={(e) => { e.stopPropagation(); onCancel?.(job.id); }}
          className="
            self-start p-2 rounded-lg opacity-0 group-hover:opacity-100
            text-text-theme-muted hover:text-red-400 hover:bg-red-900/20
            transition-all
          "
          aria-label="Cancel repair"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Active indicator glow */}
      {isInProgress && (
        <div className="absolute -inset-px rounded-xl bg-accent/20 blur-sm -z-10 animate-pulse" />
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface RepairQueueProps {
  jobs: readonly IRepairJob[];
  onMoveUp?: (jobId: string) => void;
  onMoveDown?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onJobClick?: (jobId: string) => void;
  onReorder?: (jobIds: string[]) => void;
  className?: string;
}

export function RepairQueue({
  jobs,
  onMoveUp,
  onMoveDown,
  onCancel,
  onJobClick,
  className = '',
}: RepairQueueProps): React.ReactElement {
  // Separate active and pending jobs
  const activeJobs = jobs.filter(j => j.status === RepairJobStatus.InProgress);
  const pendingJobs = jobs.filter(j => j.status === RepairJobStatus.Pending);
  const completedJobs = jobs.filter(j => j.status === RepairJobStatus.Completed);

  // Sort pending by priority
  const sortedPending = [...pendingJobs].sort((a, b) => a.priority - b.priority);

  const handleMoveUp = useCallback((jobId: string) => {
    onMoveUp?.(jobId);
  }, [onMoveUp]);

  const handleMoveDown = useCallback((jobId: string) => {
    onMoveDown?.(jobId);
  }, [onMoveDown]);

  const totalPendingCost = pendingJobs.reduce((sum, j) => sum + j.totalCost, 0);
  const totalPendingTime = pendingJobs.reduce((sum, j) => sum + j.totalTimeHours, 0);

  if (jobs.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-deep flex items-center justify-center">
            <svg className="w-8 h-8 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-theme-primary mb-1">No Repair Jobs</h3>
          <p className="text-sm text-text-theme-secondary">
            All units are fully operational
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card data-testid="repair-queue" className={`${className} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-theme-primary">Repair Queue</h3>
          <p className="text-sm text-text-theme-secondary">
            {activeJobs.length} active, {pendingJobs.length} pending
          </p>
        </div>
        {pendingJobs.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-text-theme-muted">Queue Total</div>
            <div className="text-sm font-bold text-accent tabular-nums">
              {totalPendingCost.toLocaleString()} C-Bills
            </div>
            <div className="text-xs text-text-theme-secondary tabular-nums">
              ~{Math.ceil(totalPendingTime)}h
            </div>
          </div>
        )}
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-accent mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            In Progress
          </h4>
          <div className="space-y-3">
            {activeJobs.map((job, idx) => (
              <QueueItem
                key={job.id}
                job={job}
                index={idx}
                onCancel={onCancel}
                onClick={onJobClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Jobs */}
      {sortedPending.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-theme-muted mb-3">
            Queued ({sortedPending.length})
          </h4>
          <div className="space-y-2">
            {sortedPending.map((job, idx) => (
              <QueueItem
                key={job.id}
                job={job}
                index={activeJobs.length + idx}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onCancel={onCancel}
                onClick={onJobClick}
                isFirst={idx === 0}
                isLast={idx === sortedPending.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs (collapsed) */}
      {completedJobs.length > 0 && (
        <details className="group">
          <summary data-testid="repair-queue-completed-toggle" className="cursor-pointer list-none">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-colors">
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Completed ({completedJobs.length})
            </div>
          </summary>
          <div className="mt-3 space-y-2 opacity-60">
            {completedJobs.slice(0, 5).map((job, idx) => (
              <QueueItem
                key={job.id}
                job={job}
                index={idx}
                onClick={onJobClick}
              />
            ))}
            {completedJobs.length > 5 && (
              <p className="text-xs text-text-theme-muted text-center py-2">
                +{completedJobs.length - 5} more completed
              </p>
            )}
          </div>
        </details>
      )}
    </Card>
  );
}

export default RepairQueue;
