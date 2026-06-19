import Link from 'next/link';
import React, { useMemo, useState } from 'react';

import type { IDayAdvanceSummary } from '@/lib/campaign/hooks/useCampaignDashboardSummary';
import type {
  ActivityLogCategory,
  IActivityLogEntry,
} from '@/types/campaign/ActivityLog';

import { ACTIVITY_LOG_CATEGORIES } from '@/types/campaign/ActivityLog';

import { DashboardCard } from './CampaignDashboardCardShell';

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

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  battle: 'Battle',
  personnel: 'Personnel',
  medical: 'Medical',
  finances: 'Finances',
  acquisitions: 'Acquisitions',
  technical: 'Technical',
  travel: 'Travel',
};

export interface IActivityLogCardProps {
  readonly campaignId: string;
  readonly entries: readonly IActivityLogEntry[];
}

export function ActivityLogCard({
  campaignId,
  entries,
}: IActivityLogCardProps): React.ReactElement {
  const [activeCategory, setActiveCategory] =
    useState<ActivityLogCategory>('battle');
  const filtered = useMemo(
    () =>
      entries
        .filter((entry) => entry.category === activeCategory)
        .slice(-10)
        .reverse(),
    [entries, activeCategory],
  );
  return (
    <DashboardCard
      title="Recent Activity"
      testid="dashboard-card-activity-log"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/log`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View full log →
        </Link>
      }
    >
      <nav
        role="tablist"
        className="-mb-px flex flex-wrap gap-1 border-b border-slate-700"
      >
        {ACTIVITY_LOG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            data-testid={`activity-log-tab-${cat}`}
            aria-selected={cat === activeCategory}
            onClick={() => setActiveCategory(cat)}
            className={
              cat === activeCategory
                ? 'border-b-2 border-sky-400 px-2 py-1 text-xs text-sky-200'
                : 'px-2 py-1 text-xs text-slate-400 hover:text-slate-200'
            }
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </nav>
      {filtered.length === 0 ? (
        <p
          data-testid="activity-log-empty"
          className="mt-3 text-xs text-slate-500"
        >
          No {CATEGORY_LABELS[activeCategory].toLowerCase()} entries yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-xs text-slate-200">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              data-testid={`activity-log-entry-${entry.id}`}
              className="flex justify-between gap-2"
            >
              <span className="truncate">{entry.message}</span>
              <span className="shrink-0 font-mono text-slate-500">
                Day {entry.campaignDay}
              </span>
            </li>
          ))}
        </ul>
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
