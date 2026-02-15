import React from 'react';

import { Badge } from '@/components/ui';
import { IRepairJob, RepairJobStatus } from '@/types/repair';

// =============================================================================
// Progress Bar
// =============================================================================

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({
  current,
  total,
  className = '',
}: ProgressBarProps): React.ReactElement {
  const percent = total > 0 ? ((total - current) / total) * 100 : 0;

  return (
    <div
      className={`bg-surface-deep relative h-2 overflow-hidden rounded-full ${className}`}
    >
      <div className="absolute inset-0 flex">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="border-surface-base/30 flex-1 border-r last:border-r-0"
          />
        ))}
      </div>
      <div
        className="from-accent absolute inset-y-0 left-0 bg-gradient-to-r to-amber-400 transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </div>
  );
}

// =============================================================================
// Queue Item
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

const STATUS_VARIANTS: Record<
  RepairJobStatus,
  'emerald' | 'amber' | 'slate' | 'red' | 'orange'
> = {
  [RepairJobStatus.Completed]: 'emerald',
  [RepairJobStatus.InProgress]: 'amber',
  [RepairJobStatus.Pending]: 'slate',
  [RepairJobStatus.Cancelled]: 'red',
  [RepairJobStatus.Blocked]: 'orange',
};

function formatTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours.toFixed(0)}h`;
}

export function QueueItem({
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

  return (
    <div
      data-testid={`repair-queue-item-${job.id}`}
      className={`group relative flex cursor-pointer items-stretch gap-3 rounded-xl border p-4 transition-all ${
        isInProgress
          ? 'bg-accent/10 border-accent/40 shadow-accent/10 shadow-lg'
          : 'bg-surface-raised/60 border-border-theme-subtle hover:border-border-theme hover:bg-surface-raised'
      } `}
      onClick={() => onClick?.(job.id)}
    >
      {/* Priority indicator */}
      <div className="flex w-8 flex-col items-center justify-center">
        <span
          className={`text-lg font-bold tabular-nums ${isInProgress ? 'text-accent' : 'text-text-theme-muted'} `}
        >
          {index + 1}
        </span>
        {isPending && (
          <div className="mt-2 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              data-testid={`repair-queue-up-${job.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.(job.id);
              }}
              disabled={isFirst}
              className={`hover:bg-surface-deep rounded p-1 transition-colors ${isFirst ? 'text-text-theme-muted/30 cursor-not-allowed' : 'text-text-theme-secondary hover:text-accent'} `}
              aria-label="Move up"
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
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              data-testid={`repair-queue-down-${job.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.(job.id);
              }}
              disabled={isLast}
              className={`hover:bg-surface-deep rounded p-1 transition-colors ${isLast ? 'text-text-theme-muted/30 cursor-not-allowed' : 'text-text-theme-secondary hover:text-accent'} `}
              aria-label="Move down"
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-text-theme-primary truncate text-sm font-semibold">
              {job.unitName}
            </h4>
            <p className="text-text-theme-muted truncate text-xs">
              {job.items.filter((i) => i.selected).length} repairs selected
            </p>
          </div>
          <Badge
            data-testid={`repair-queue-status-${job.id}`}
            variant={STATUS_VARIANTS[job.status]}
            size="sm"
          >
            {job.status === RepairJobStatus.InProgress
              ? 'ACTIVE'
              : job.status.toUpperCase()}
          </Badge>
        </div>

        {isInProgress && (
          <div className="mb-3">
            <ProgressBar current={timeRemaining} total={totalTime} />
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-text-theme-muted">
                {Math.round(((totalTime - timeRemaining) / totalTime) * 100)}%
                complete
              </span>
              <span className="text-accent font-medium tabular-nums">
                {formatTime(timeRemaining)} remaining
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs">
          <div className="text-text-theme-secondary flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="tabular-nums">
              {formatTime(isPending ? totalTime : timeRemaining)}
            </span>
          </div>
          <div className="text-text-theme-secondary flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5"
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
            <span className="font-medium tabular-nums">
              {job.totalCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {(isPending || isInProgress) && (
        <button
          data-testid={`repair-queue-cancel-${job.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onCancel?.(job.id);
          }}
          className="text-text-theme-muted self-start rounded-lg p-2 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-900/20 hover:text-red-400"
          aria-label="Cancel repair"
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
      )}

      {isInProgress && (
        <div className="bg-accent/20 absolute -inset-px -z-10 animate-pulse rounded-xl blur-sm" />
      )}
    </div>
  );
}
