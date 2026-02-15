/**
 * Repair Queue Component
 * Displays and manages queued repair jobs with reordering capability.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */
import React, { useCallback } from 'react';

import { Card } from '@/components/ui';
import { IRepairJob, RepairJobStatus } from '@/types/repair';

import { QueueItem } from './RepairQueueItem';

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
  const activeJobs = jobs.filter(
    (j) => j.status === RepairJobStatus.InProgress,
  );
  const pendingJobs = jobs.filter((j) => j.status === RepairJobStatus.Pending);
  const completedJobs = jobs.filter(
    (j) => j.status === RepairJobStatus.Completed,
  );

  // Sort pending by priority
  const sortedPending = [...pendingJobs].sort(
    (a, b) => a.priority - b.priority,
  );

  const handleMoveUp = useCallback(
    (jobId: string) => {
      onMoveUp?.(jobId);
    },
    [onMoveUp],
  );

  const handleMoveDown = useCallback(
    (jobId: string) => {
      onMoveDown?.(jobId);
    },
    [onMoveDown],
  );

  const totalPendingCost = pendingJobs.reduce((sum, j) => sum + j.totalCost, 0);
  const totalPendingTime = pendingJobs.reduce(
    (sum, j) => sum + j.totalTimeHours,
    0,
  );

  if (jobs.length === 0) {
    return (
      <Card className={className}>
        <div className="py-8 text-center">
          <div className="bg-surface-deep mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
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
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h3 className="text-text-theme-primary mb-1 text-lg font-semibold">
            No Repair Jobs
          </h3>
          <p className="text-text-theme-secondary text-sm">
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
          <h3 className="text-text-theme-primary text-lg font-bold">
            Repair Queue
          </h3>
          <p className="text-text-theme-secondary text-sm">
            {activeJobs.length} active, {pendingJobs.length} pending
          </p>
        </div>
        {pendingJobs.length > 0 && (
          <div className="text-right">
            <div className="text-text-theme-muted text-xs">Queue Total</div>
            <div className="text-accent text-sm font-bold tabular-nums">
              {totalPendingCost.toLocaleString()} C-Bills
            </div>
            <div className="text-text-theme-secondary text-xs tabular-nums">
              ~{Math.ceil(totalPendingTime)}h
            </div>
          </div>
        )}
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h4 className="text-accent mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />
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
          <h4 className="text-text-theme-muted mb-3 text-xs font-semibold tracking-wider uppercase">
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
          <summary
            data-testid="repair-queue-completed-toggle"
            className="cursor-pointer list-none"
          >
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-500 uppercase transition-colors hover:text-emerald-400">
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
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
              <p className="text-text-theme-muted py-2 text-center text-xs">
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
