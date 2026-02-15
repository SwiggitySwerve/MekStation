import { Badge } from '@/components/ui';
import { RepairJobStatus, type IRepairJob } from '@/types/repair';

import type {
  RepairStatusBadgeVariant,
  RepairStatusBorderMap,
} from './RepairBayPage.types';

interface UnitRepairCardProps {
  job: IRepairJob;
  onClick: () => void;
  isSelected?: boolean;
}

export function UnitRepairCard({
  job,
  onClick,
  isSelected = false,
}: UnitRepairCardProps): React.ReactElement {
  const damagePercent = 100 - (job.totalCost / 50000) * 100;
  const isComplete = job.status === RepairJobStatus.Completed;
  const isActive = job.status === RepairJobStatus.InProgress;

  const statusColors: RepairStatusBorderMap = {
    [RepairJobStatus.Pending]: 'border-l-amber-500',
    [RepairJobStatus.InProgress]: 'border-l-cyan-500',
    [RepairJobStatus.Completed]: 'border-l-emerald-500',
    [RepairJobStatus.Cancelled]: 'border-l-red-500',
    [RepairJobStatus.Blocked]: 'border-l-orange-500',
  };

  const statusBadgeVariants: Record<RepairJobStatus, RepairStatusBadgeVariant> =
    {
      [RepairJobStatus.Pending]: 'amber',
      [RepairJobStatus.InProgress]: 'cyan',
      [RepairJobStatus.Completed]: 'emerald',
      [RepairJobStatus.Cancelled]: 'red',
      [RepairJobStatus.Blocked]: 'orange',
    };

  return (
    <div
      data-testid={`repair-unit-card-${job.id}`}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl border-l-4 p-4 transition-all duration-200 ${statusColors[job.status]} ${
        isSelected
          ? 'bg-accent/10 border-accent/40 shadow-accent/10 border shadow-lg'
          : 'bg-surface-raised/60 border-border-theme-subtle hover:border-border-theme hover:bg-surface-raised border'
      } ${isComplete ? 'opacity-70 hover:opacity-100' : ''} `}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4
            data-testid="repair-unit-name"
            className="text-text-theme-primary group-hover:text-accent truncate text-sm font-bold transition-colors"
          >
            {job.unitName}
          </h4>
          <p className="text-text-theme-muted text-xs">
            {job.items.length} repair{job.items.length !== 1 ? 's' : ''} needed
          </p>
        </div>
        <Badge variant={statusBadgeVariants[job.status]} size="sm">
          {job.status === RepairJobStatus.InProgress
            ? 'ACTIVE'
            : job.status.toUpperCase()}
        </Badge>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <div className="bg-surface-deep h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className={`h-full transition-all ${
              damagePercent > 75
                ? 'bg-emerald-500'
                : damagePercent > 50
                  ? 'bg-amber-500'
                  : damagePercent > 25
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(damagePercent, 5)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="text-text-theme-secondary flex items-center gap-3">
          <span className="flex items-center gap-1">
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
            {job.timeRemainingHours}h
          </span>
        </div>
        <span className="text-accent font-semibold tabular-nums">
          {job.totalCost.toLocaleString()} C-Bills
        </span>
      </div>

      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
        </div>
      )}

      {isSelected && (
        <div className="border-accent pointer-events-none absolute -inset-px rounded-xl border-2" />
      )}
    </div>
  );
}
