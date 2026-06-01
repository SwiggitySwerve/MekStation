/**
 * Campaign Command Center Dashboard Cards
 *
 * The 6 dashboard cards composed by `<CampaignDashboard>`
 * (`add-campaign-command-center` Wave 6.1.B, tasks 3.1-3.6). Each card
 * is a small presentational component that reads from an
 * `IDashboardSummary` snapshot — the cards stay decoupled from the
 * campaign store layout and the tests can stub a fixture summary.
 *
 * The 6 cards:
 *   1. <ForceSnapshotCard> — mechs / pilots / repair / injured headline
 *   2. <ActiveContractCard> — current contract progress + objectives
 *   3. <FinancesCard> — balance + daily burn + runway
 *   4. <DayAdvanceCard> — current date + advance one/seven days
 *   5. <ActivityLogCard> — last 10 entries per category, 6 tabs
 *   6. <QuickActionsCard> — 4 deep-link buttons to common surfaces
 *
 * Wave 6.1.B ships the cards' visual structure + minimum content. Polish
 * items called out by the proposal (Storybook stories per card, edge-case
 * variants, the full activity-log page filters) are explicit follow-up
 * candidates so the dashboard composition can ship before the polish.
 *
 * @spec openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

import type {
  IActiveContractSummary,
  IDayAdvanceSummary,
  IFinancesSummary,
  IForceSnapshotSummary,
} from '@/lib/campaign/hooks/useCampaignDashboardSummary';
import type {
  ActivityLogCategory,
  IActivityLogEntry,
} from '@/types/campaign/ActivityLog';

import { ACTIVITY_LOG_CATEGORIES } from '@/types/campaign/ActivityLog';

// =============================================================================
// Card shell
// =============================================================================

interface ICardProps {
  readonly title: string;
  readonly testid: string;
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
}

function DashboardCard({
  title,
  testid,
  children,
  footer,
}: ICardProps): React.ReactElement {
  return (
    <section
      data-testid={testid}
      className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/60 p-4"
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        {title}
      </h3>
      <div className="flex-1">{children}</div>
      {footer ? (
        <div className="mt-3 border-t border-slate-700 pt-3">{footer}</div>
      ) : null}
    </section>
  );
}

// =============================================================================
// 1. ForceSnapshotCard
// =============================================================================

export interface IForceSnapshotCardProps {
  readonly campaignId: string;
  readonly snapshot: IForceSnapshotSummary;
}

export function ForceSnapshotCard({
  campaignId,
  snapshot,
}: IForceSnapshotCardProps): React.ReactElement {
  return (
    <DashboardCard
      title="Force Snapshot"
      testid="dashboard-card-force-snapshot"
    >
      <ul className="space-y-2 text-sm text-slate-200">
        <li>
          <Link
            data-testid="force-snapshot-mech-count"
            href={`/gameplay/campaigns/${campaignId}/forces`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.mechCount}</span> mechs
          </Link>
        </li>
        <li>
          <Link
            data-testid="force-snapshot-pilot-count"
            href={`/gameplay/campaigns/${campaignId}/personnel`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.pilotCount}</span> pilots
          </Link>
        </li>
        <li>
          <Link
            data-testid="force-snapshot-injured-count"
            href={`/gameplay/campaigns/${campaignId}/medical-bay`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.injuredPilotCount}</span>{' '}
            injured
          </Link>
        </li>
        <li>
          <Link
            data-testid="force-snapshot-repair-depth"
            href={`/gameplay/campaigns/${campaignId}/repair-bay`}
            className="hover:text-sky-400"
          >
            <span className="font-mono">{snapshot.repairQueueDepth}</span> in
            repair
          </Link>
        </li>
      </ul>
    </DashboardCard>
  );
}

// =============================================================================
// 2. ActiveContractCard
// =============================================================================

export interface IActiveContractCardProps {
  readonly campaignId: string;
  readonly summary: IActiveContractSummary;
}

export function ActiveContractCard({
  campaignId,
  summary,
}: IActiveContractCardProps): React.ReactElement {
  if (!summary.contract) {
    return (
      <DashboardCard
        title="Active Contract"
        testid="dashboard-card-active-contract"
      >
        <div className="text-sm text-slate-400">
          <p data-testid="active-contract-empty">No active contract.</p>
          <Link
            data-testid="active-contract-cta-browse"
            href={`/gameplay/campaigns/${campaignId}/contract-market`}
            className="mt-2 inline-block rounded border border-sky-600 px-3 py-1 text-sky-300 hover:bg-sky-900/30"
          >
            Browse contracts
          </Link>
        </div>
      </DashboardCard>
    );
  }
  const { contract } = summary;
  const completionPct =
    contract.objectivesTotal === 0
      ? 0
      : Math.floor(
          (contract.objectivesCompleted / contract.objectivesTotal) * 100,
        );
  return (
    <DashboardCard
      title="Active Contract"
      testid="dashboard-card-active-contract"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/missions`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View missions →
        </Link>
      }
    >
      <p className="text-base font-semibold text-slate-100">{contract.name}</p>
      <p className="text-xs text-slate-400">Employer: {contract.employer}</p>
      <p
        data-testid="active-contract-days-remaining"
        className="mt-2 text-sm text-slate-300"
      >
        {contract.daysRemaining} days remaining
      </p>
      <div className="mt-2 text-xs text-slate-400">
        <span data-testid="active-contract-objectives-progress">
          {contract.objectivesCompleted} / {contract.objectivesTotal} objectives
        </span>
        <div className="mt-1 h-1.5 w-full rounded bg-slate-800">
          <div
            className="h-1.5 rounded bg-sky-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>
    </DashboardCard>
  );
}

// =============================================================================
// 3. FinancesCard
// =============================================================================

export interface IFinancesCardProps {
  readonly campaignId: string;
  readonly summary: IFinancesSummary;
}

export function FinancesCard({
  campaignId,
  summary,
}: IFinancesCardProps): React.ReactElement {
  return (
    <DashboardCard
      title="Finances"
      testid="dashboard-card-finances"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/finances`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View ledger →
        </Link>
      }
    >
      <p
        data-testid="finances-balance"
        className="text-base font-semibold text-slate-100"
      >
        {summary.balanceFormatted}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-slate-400">Salaries</dt>
        <dd
          data-testid="finances-daily-salaries"
          className="text-right font-mono text-slate-200"
        >
          {summary.dailySalariesAmount.toLocaleString()}/day
        </dd>
        <dt className="text-slate-400">Maintenance</dt>
        <dd
          data-testid="finances-daily-maintenance"
          className="text-right font-mono text-slate-200"
        >
          {summary.dailyMaintenanceAmount.toLocaleString()}/day
        </dd>
        <dt className="text-slate-400">Loan repay</dt>
        <dd
          data-testid="finances-daily-loan-repayment"
          className="text-right font-mono text-slate-200"
        >
          {summary.dailyLoanRepaymentAmount.toLocaleString()}/day
        </dd>
        <dt className="border-t border-slate-700 pt-1 text-slate-300">Total</dt>
        <dd
          data-testid="finances-daily-total"
          className="border-t border-slate-700 pt-1 text-right font-mono text-slate-200"
        >
          {summary.dailyTotalAmount.toLocaleString()}/day
        </dd>
      </dl>
      <p
        data-testid="finances-runway-days"
        className="mt-2 text-xs text-slate-300"
      >
        Runway:{' '}
        {summary.runwayDays === Number.POSITIVE_INFINITY
          ? '∞'
          : `${summary.runwayDays} days`}
      </p>
    </DashboardCard>
  );
}

// =============================================================================
// 4. DayAdvanceCard
// =============================================================================

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

// =============================================================================
// 5. ActivityLogCard
// =============================================================================

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

// =============================================================================
// 6. QuickActionsCard
// =============================================================================

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
