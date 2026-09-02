import Link from 'next/link';
import React from 'react';

import type {
  CampaignOperationPriority,
  ICampaignOperationsSummary,
  IDayAdvanceSummary,
} from '@/lib/campaign/hooks/useCampaignDashboardSummary';

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
    className: 'border-slate-600 bg-slate-800 text-slate-200',
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
          className="text-sm font-semibold text-slate-100"
        >
          {summary.statusLabel}
        </p>
        <span
          data-testid="operations-queue-count"
          className="rounded border border-slate-700 px-2 py-1 font-mono text-xs text-slate-300"
        >
          {summary.unresolvedCount}
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <p
          data-testid="operations-queue-empty"
          className="text-sm text-slate-500"
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
                className="rounded border border-slate-700 bg-slate-950/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
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
}

export function DayAdvanceCard({
  summary,
  onAdvanceDay,
  onAdvanceWeek,
}: IDayAdvanceCardProps): React.ReactElement {
  const dateLabel = summary.currentDate.toISOString().slice(0, 10);
  return (
    <DashboardCard title="Day Advance" testid="dashboard-card-day-advance">
      <p
        data-testid="day-advance-current-date"
        className="font-mono text-base text-slate-100"
      >
        {dateLabel}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          data-testid="day-advance-one-day"
          onClick={onAdvanceDay}
          className="rounded border border-sky-600 px-3 py-1 text-sm text-sky-200 hover:bg-sky-900/30"
        >
          Advance one day
        </button>
        <button
          type="button"
          data-testid="day-advance-one-week"
          onClick={onAdvanceWeek}
          className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
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
          className="mt-2 text-xs text-slate-500"
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
          className="rounded border border-slate-600 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          Hire a pilot
        </Link>
        <Link
          data-testid="quick-action-browse-contracts"
          href={`/gameplay/campaigns/${campaignId}/contract-market`}
          className="rounded border border-slate-600 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          Browse contracts
        </Link>
        <Link
          data-testid="quick-action-refit-mech"
          href={`/gameplay/campaigns/${campaignId}/mech-bay`}
          className="rounded border border-slate-600 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          Refit a mech
        </Link>
        <Link
          data-testid="quick-action-open-salvage"
          href={`/gameplay/campaigns/${campaignId}/salvage`}
          className="rounded border border-slate-600 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          Open salvage
        </Link>
      </div>
    </DashboardCard>
  );
}
