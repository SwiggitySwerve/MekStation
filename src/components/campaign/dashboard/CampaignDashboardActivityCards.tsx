import Link from 'next/link';
import React from 'react';

import type {
  CampaignOperationPriority,
  ICampaignOperationsSummary,
  IDayAdvanceSummary,
} from '@/lib/campaign/hooks/useCampaignDashboardSummary';

import { disabledButtonClasses } from '@/components/ui/Button';

import { DashboardCard } from './CampaignDashboardCardShell';

export { ActivityLogCard } from './CampaignDashboardActivityLogCard';
export type { IActivityLogCardProps } from './CampaignDashboardActivityLogCard';

const OPERATION_PRIORITY_STYLES: Record<
  CampaignOperationPriority,
  { readonly label: string; readonly className: string }
> = {
  critical: {
    label: 'Critical',
    className: 'border-red-500/60 bg-red-950/30 text-red-200',
  },
  warning: {
    label: 'Needs attention',
    className: 'border-amber-500/60 bg-amber-950/30 text-amber-200',
  },
  ready: {
    label: 'Ready',
    className: 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200',
  },
  routine: {
    label: 'Review',
    className: 'border-border-theme bg-surface-base text-text-theme-primary',
  },
};

export interface IOperationsQueueCardProps {
  readonly campaignId: string;
  readonly summary: ICampaignOperationsSummary;
}

export function OperationsQueueCard({
  campaignId,
  summary,
}: IOperationsQueueCardProps): React.ReactElement {
  const visibleItems = summary.items.slice(0, 4);

  return (
    <DashboardCard
      title="Operations Queue"
      testid="dashboard-card-operations-queue"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/log`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View campaign log
        </Link>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          data-testid="operations-queue-status"
          className="text-text-theme-primary text-sm font-semibold"
        >
          {summary.statusLabel}
        </p>
        <span
          data-testid="operations-queue-count"
          className="border-border-theme text-text-theme-secondary rounded border px-2 py-1 font-mono text-xs"
        >
          {summary.unresolvedCount}
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <p
          data-testid="operations-queue-empty"
          className="text-text-theme-muted text-sm"
        >
          No operational items are waiting.
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const style = OPERATION_PRIORITY_STYLES[item.priority];
            return (
              <li
                key={item.id}
                data-testid={`operations-queue-item-${item.id}`}
                className="border-border-theme bg-surface-deep/40 rounded border p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-text-theme-primary text-sm font-semibold">
                      {item.title}
                    </h3>
                    <p className="text-text-theme-secondary mt-1 text-xs">
                      {item.detail}
                    </p>
                  </div>
                  <span
                    data-testid={`operations-queue-priority-${item.id}`}
                    className={`shrink-0 rounded border px-2 py-1 text-xs ${style.className}`}
                  >
                    {style.label}
                  </span>
                </div>
                <Link
                  href={item.href}
                  data-testid={`operations-queue-link-${item.id}`}
                  className="mt-2 inline-block text-xs text-sky-400 hover:text-sky-200"
                >
                  {item.ctaLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

export interface IDayAdvanceCardProps {
  readonly summary: IDayAdvanceSummary;
  readonly onAdvanceDay: () => void;
  readonly onAdvanceWeek: () => void;
  /** A day advance is in flight: both buttons are disabled. */
  readonly isAdvancing?: boolean;
}

export function DayAdvanceCard({
  summary,
  onAdvanceDay,
  onAdvanceWeek,
  isAdvancing = false,
}: IDayAdvanceCardProps): React.ReactElement {
  const dateLabel = summary.currentDate.toISOString().slice(0, 10);
  return (
    <DashboardCard title="Day Advance" testid="dashboard-card-day-advance">
      <p
        data-testid="day-advance-current-date"
        className="text-text-theme-primary font-mono text-base"
      >
        {dateLabel}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          data-testid="day-advance-one-day"
          onClick={onAdvanceDay}
          disabled={isAdvancing}
          className={`rounded border border-sky-600 px-3 py-1 text-sm text-sky-200 hover:bg-sky-900/30 ${disabledButtonClasses}`}
        >
          Advance one day
        </button>
        <button
          type="button"
          data-testid="day-advance-one-week"
          onClick={onAdvanceWeek}
          disabled={isAdvancing}
          className={`border-border-theme text-text-theme-primary hover:bg-surface-base rounded border px-3 py-1 text-sm ${disabledButtonClasses}`}
        >
          Advance one week
        </button>
      </div>
      {summary.pendingEventPreview ? (
        <p
          data-testid="day-advance-event-preview"
          className="mt-2 text-xs text-amber-300"
        >
          {summary.pendingEventPreview}
        </p>
      ) : (
        <p
          data-testid="day-advance-no-pending"
          className="text-text-theme-muted mt-2 text-xs"
        >
          No events upcoming.
        </p>
      )}
    </DashboardCard>
  );
}

export interface IQuickActionsCardProps {
  readonly campaignId: string;
}

export function QuickActionsCard({
  campaignId,
}: IQuickActionsCardProps): React.ReactElement {
  return (
    <DashboardCard title="Quick Actions" testid="dashboard-card-quick-actions">
      <div className="grid grid-cols-2 gap-2">
        <Link
          data-testid="quick-action-hire-pilot"
          href={`/gameplay/campaigns/${campaignId}/hiring`}
          className="border-border-theme text-text-theme-primary hover:bg-surface-base rounded border px-2 py-2 text-xs"
        >
          Hire a pilot
        </Link>
        <Link
          data-testid="quick-action-browse-contracts"
          href={`/gameplay/campaigns/${campaignId}/contract-market`}
          className="border-border-theme text-text-theme-primary hover:bg-surface-base rounded border px-2 py-2 text-xs"
        >
          Browse contracts
        </Link>
        <Link
          data-testid="quick-action-refit-mech"
          href={`/gameplay/campaigns/${campaignId}/mech-bay`}
          className="border-border-theme text-text-theme-primary hover:bg-surface-base rounded border px-2 py-2 text-xs"
        >
          Refit a mech
        </Link>
        <Link
          data-testid="quick-action-open-salvage"
          href={`/gameplay/campaigns/${campaignId}/salvage`}
          className="border-border-theme text-text-theme-primary hover:bg-surface-base rounded border px-2 py-2 text-xs"
        >
          Open salvage
        </Link>
      </div>
    </DashboardCard>
  );
}
