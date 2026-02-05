import React, { useState, useCallback, useMemo } from 'react';

import type {
  ICampaignDashboardMetrics,
  IFinancialDataPoint,
  IPerformerSummary,
} from '@/types/simulation-viewer';

import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { KPICard } from '@/components/simulation-viewer/KPICard';
import { TrendChart } from '@/components/simulation-viewer/TrendChart';
import { FOCUS_RING_CLASSES, announce } from '@/utils/accessibility';

type PerformerSortKey = 'kills' | 'xp' | 'missionsCompleted';

interface IDerivedWarning {
  readonly id: string;
  readonly type: 'financial-risk' | 'pilot-risk' | 'unit-risk';
  readonly severity: 'critical' | 'warning' | 'info';
  readonly message: string;
  readonly target: string;
}

/**
 * Props for the Campaign Dashboard page component.
 *
 * @example
 * <CampaignDashboard
 *   campaignId="campaign-001"
 *   metrics={dashboardMetrics}
 *   onDrillDown={(target, ctx) => navigateTo(target, ctx)}
 * />
 */
export interface ICampaignDashboardProps {
  /** Unique identifier for the active campaign */
  readonly campaignId: string;
  /** Pre-computed dashboard metrics from campaign state */
  readonly metrics: ICampaignDashboardMetrics;
  /** Optional callback invoked when a drill-down link is activated */
  readonly onDrillDown?: (
    target: string,
    context: Record<string, unknown>,
  ) => void;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SORT_OPTIONS: ReadonlyArray<{ key: PerformerSortKey; label: string }> = [
  { key: 'kills', label: 'Kills' },
  { key: 'xp', label: 'XP' },
  { key: 'missionsCompleted', label: 'Missions' },
] as const;

const FINANCIAL_TIME_RANGES = ['7d', '30d', '90d', '1y'] as const;

const SEVERITY_CLASSES: Record<IDerivedWarning['severity'], string> = {
  critical:
    'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200',
  warning:
    'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200',
};

const SEVERITY_BADGE: Record<IDerivedWarning['severity'], string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
};

/* -------------------------------------------------------------------------- */
/*  Utility functions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Format a number into a compact, human-readable string.
 * Values ≥ 1 M render as e.g. "1.5M", ≥ 1 K as "25.0K", otherwise comma-separated.
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString('en-US');
}

/**
 * Format a decimal ratio (0–1) as a percentage string, e.g. 0.75 → "75%".
 */
export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Derive displayable warning items from the boolean flags in metrics.warnings.
 */
function deriveWarnings(
  flags: ICampaignDashboardMetrics['warnings'],
): IDerivedWarning[] {
  const items: IDerivedWarning[] = [];

  if (flags.manyWounded) {
    items.push({
      id: 'many-wounded',
      type: 'pilot-risk',
      severity: 'critical',
      message: 'Multiple pilots wounded — roster strength compromised',
      target: 'roster',
    });
  }
  if (flags.lowFunds) {
    items.push({
      id: 'low-funds',
      type: 'financial-risk',
      severity: 'warning',
      message: 'Low C-Bill reserves — operational funding at risk',
      target: 'financial',
    });
  }
  if (flags.lowBV) {
    items.push({
      id: 'low-bv',
      type: 'unit-risk',
      severity: 'warning',
      message: 'Battle Value below threshold — force readiness degraded',
      target: 'force',
    });
  }

  return items;
}

/**
 * Filter financial data points by a time range string relative to the
 * latest data point date.
 */
function filterByTimeRange(
  data: readonly IFinancialDataPoint[],
  range: string,
): IFinancialDataPoint[] {
  if (data.length === 0) return [];

  const daysMap: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const days = daysMap[range] ?? 30;
  const latestDate = new Date(data[data.length - 1].date);
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - days);

  return data.filter((pt) => new Date(pt.date) >= cutoff);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Campaign Dashboard — top-level overview of a running BattleTech campaign.
 *
 * Renders six data sections in a responsive grid:
 * 1. Roster — pilot readiness (active / wounded / KIA)
 * 2. Force — unit operational status and Battle Value
 * 3. Financial — C-Bill balance trend with time-range controls
 * 4. Progression — mission stats, win rate, total XP
 * 5. Top Performers — sortable leaderboard of best pilots
 * 6. Warnings — at-risk alerts derived from campaign state
 *
 * All sections are built with existing Wave-2 components (KPICard, TrendChart,
 * DrillDownLink) and delegate navigation through the onDrillDown callback.
 */
export const CampaignDashboard: React.FC<ICampaignDashboardProps> = ({
  campaignId,
  metrics,
  onDrillDown,
}) => {
  /* ---- state ---- */
  const [performerSortKey, setPerformerSortKey] =
    useState<PerformerSortKey>('kills');
  const [financialTimeRange, setFinancialTimeRange] = useState('30d');
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(
    () => new Set(),
  );

  /* ---- derived data ---- */
  const warnings = useMemo(
    () => deriveWarnings(metrics.warnings),
    [metrics.warnings],
  );

  const activeWarnings = useMemo(
    () => warnings.filter((w) => !dismissedWarnings.has(w.id)),
    [warnings, dismissedWarnings],
  );

  const sortedPerformers = useMemo(() => {
    const performers = metrics.topPerformers ?? [];
    return [...performers].sort(
      (a, b) => b[performerSortKey] - a[performerSortKey],
    );
  }, [metrics.topPerformers, performerSortKey]);

  const filteredFinancialData = useMemo(
    () => filterByTimeRange(metrics.financialTrend ?? [], financialTimeRange),
    [metrics.financialTrend, financialTimeRange],
  );

  const chartData = useMemo(
    () =>
      filteredFinancialData.map((pt) => ({ date: pt.date, value: pt.balance })),
    [filteredFinancialData],
  );

  const latestFinancial: IFinancialDataPoint | null = useMemo(() => {
    const trend = metrics.financialTrend ?? [];
    return trend.length > 0 ? trend[trend.length - 1] : null;
  }, [metrics.financialTrend]);

  /* ---- handlers ---- */
  const handleDrillDown = useCallback(
    (targetTab: string, filter?: Record<string, unknown>) => {
      onDrillDown?.(targetTab, filter ?? {});
    },
    [onDrillDown],
  );

  const handleDismissWarning = useCallback((warningId: string) => {
    setDismissedWarnings((prev) => {
      const next = new Set(prev);
      next.add(warningId);
      return next;
    });
    announce('Warning dismissed');
  }, []);

  const handleTimeRangeChange = useCallback((range: string) => {
    setFinancialTimeRange(range);
  }, []);

  /* ---- render ---- */
  return (
    <main
      className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 dark:bg-gray-900"
      data-testid="campaign-dashboard"
      data-campaign-id={campaignId}
    >
      <h1
        className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl dark:text-gray-100"
        data-testid="dashboard-title"
      >
        Campaign Dashboard
      </h1>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-testid="dashboard-grid"
      >
        {/* ── 1. ROSTER ─────────────────────────────────────────────── */}
        <section
          className="col-span-1 space-y-3"
          aria-label="Roster overview"
          data-testid="roster-section"
        >
          <h2
            className="text-lg font-semibold text-gray-800 dark:text-gray-200"
            data-testid="section-heading"
          >
            Roster
          </h2>

          <KPICard
            label="Active Pilots"
            value={metrics.roster?.active ?? 0}
            comparisonDirection="up"
            className="border-l-4 border-green-500"
            data-testid="roster-active"
          />
          <KPICard
            label="Wounded"
            value={metrics.roster?.wounded ?? 0}
            comparisonDirection={
              (metrics.roster?.wounded ?? 0) > 0 ? 'down' : 'neutral'
            }
            className="border-l-4 border-amber-500"
            data-testid="roster-wounded"
          />
          <KPICard
            label="KIA"
            value={metrics.roster?.kia ?? 0}
            comparisonDirection={
              (metrics.roster?.kia ?? 0) > 0 ? 'down' : 'neutral'
            }
            className="border-l-4 border-red-500"
            data-testid="roster-kia"
          />

          <DrillDownLink
            label="View Pilot Roster"
            targetTab="encounter-history"
            filter={{ section: 'roster' }}
            icon="chevron-right"
            onClick={handleDrillDown}
          />
        </section>

        {/* ── 2. FORCE ──────────────────────────────────────────────── */}
        <section
          className="col-span-1 space-y-3"
          aria-label="Force status"
          data-testid="force-section"
        >
          <h2
            className="text-lg font-semibold text-gray-800 dark:text-gray-200"
            data-testid="section-heading"
          >
            Force Status
          </h2>

          <KPICard
            label="Operational"
            value={metrics.force?.operational ?? 0}
            comparisonDirection="up"
            className="border-l-4 border-green-500"
          />
          <KPICard
            label="Damaged"
            value={metrics.force?.damaged ?? 0}
            comparisonDirection={
              (metrics.force?.damaged ?? 0) > 0 ? 'down' : 'neutral'
            }
            className="border-l-4 border-amber-500"
          />
          <KPICard
            label="Destroyed"
            value={metrics.force?.destroyed ?? 0}
            comparisonDirection={
              (metrics.force?.destroyed ?? 0) > 0 ? 'down' : 'neutral'
            }
            className="border-l-4 border-red-500"
          />
          <KPICard
            label="Total BV"
            value={formatCompactNumber(metrics.force?.totalBV ?? 0)}
            comparisonDirection="neutral"
          />
          <KPICard
            label="Damaged BV"
            value={formatCompactNumber(metrics.force?.damagedBV ?? 0)}
            comparisonDirection={
              (metrics.force?.damagedBV ?? 0) > 0 ? 'down' : 'neutral'
            }
          />

          <DrillDownLink
            label="View Force Details"
            targetTab="encounter-history"
            filter={{ section: 'force' }}
            icon="chevron-right"
            onClick={handleDrillDown}
          />
        </section>

        {/* ── 3. FINANCIAL ──────────────────────────────────────────── */}
        <section
          className="col-span-1 space-y-3 md:col-span-2"
          aria-label="Financial overview"
          data-testid="financial-section"
        >
          <h2
            className="text-lg font-semibold text-gray-800 dark:text-gray-200"
            data-testid="section-heading"
          >
            Financial Overview
          </h2>

          <TrendChart
            data={chartData}
            timeRange={financialTimeRange}
            timeRangeOptions={[...FINANCIAL_TIME_RANGES]}
            onTimeRangeChange={handleTimeRangeChange}
            height={220}
            className="shadow-md"
          />

          <div className="flex flex-wrap gap-3" data-testid="financial-summary">
            <KPICard
              label="Balance"
              value={formatCompactNumber(latestFinancial?.balance ?? 0)}
              comparisonDirection="neutral"
              className="min-w-[120px] flex-1"
              data-testid="financial-balance"
            />
            <KPICard
              label="Income"
              value={formatCompactNumber(latestFinancial?.income ?? 0)}
              comparisonDirection="up"
              className="min-w-[120px] flex-1"
              data-testid="financial-income"
            />
            <KPICard
              label="Expenses"
              value={formatCompactNumber(latestFinancial?.expenses ?? 0)}
              comparisonDirection="down"
              className="min-w-[120px] flex-1"
              data-testid="financial-expenses"
            />
          </div>

          <DrillDownLink
            label="View Financial Details"
            targetTab="campaign-dashboard"
            filter={{ section: 'financial' }}
            icon="chevron-right"
            onClick={handleDrillDown}
          />
        </section>

        {/* ── 4. PROGRESSION ────────────────────────────────────────── */}
        <section
          className="col-span-1 space-y-3"
          aria-label="Campaign progression"
          data-testid="progression-section"
        >
          <h2
            className="text-lg font-semibold text-gray-800 dark:text-gray-200"
            data-testid="section-heading"
          >
            Progression
          </h2>

          <KPICard
            label="Missions Completed"
            value={`${metrics.progression?.missionsCompleted ?? 0} / ${metrics.progression?.missionsTotal ?? 0}`}
            comparisonDirection="neutral"
          />
          <KPICard
            label="Win Rate"
            value={formatPercent(metrics.progression?.winRate ?? 0)}
            comparisonDirection={
              (metrics.progression?.winRate ?? 0) >= 0.5 ? 'up' : 'down'
            }
          />
          <KPICard
            label="Total XP"
            value={formatCompactNumber(metrics.progression?.totalXP ?? 0)}
            comparisonDirection="up"
          />

          <DrillDownLink
            label="View Mission History"
            targetTab="encounter-history"
            filter={{ section: 'progression' }}
            icon="chevron-right"
            onClick={handleDrillDown}
          />
        </section>

        {/* ── 5. TOP PERFORMERS ─────────────────────────────────────── */}
        <section
          className="col-span-1 space-y-3 md:col-span-2 lg:col-span-3"
          aria-label="Top performers"
          data-testid="top-performers-section"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              className="text-lg font-semibold text-gray-800 dark:text-gray-200"
              data-testid="section-heading"
            >
              Top Performers
            </h2>

            <div
              className="flex gap-1 rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
              role="group"
              aria-label="Sort performers by"
              data-testid="performer-sort-controls"
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setPerformerSortKey(opt.key);
                    announce(`Sorted by ${opt.label}`);
                  }}
                  className={[
                    `min-h-[44px] rounded-md px-3 py-2 text-sm transition-colors md:min-h-0 md:py-1 ${FOCUS_RING_CLASSES}`,
                    performerSortKey === opt.key
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                  ].join(' ')}
                  aria-pressed={performerSortKey === opt.key}
                  data-testid={`sort-button-${opt.key}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {sortedPerformers.length === 0 ? (
            <p
              className="text-sm text-gray-500 italic dark:text-gray-400"
              data-testid="performers-empty"
            >
              No performance data available yet.
            </p>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              data-testid="performers-list"
            >
              {sortedPerformers.map((performer) => (
                <PerformerCard
                  key={performer.personId}
                  performer={performer}
                  activeSortKey={performerSortKey}
                  onDrillDown={handleDrillDown}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 6. WARNINGS ───────────────────────────────────────────── */}
        <section
          className="col-span-1 space-y-3 md:col-span-2 lg:col-span-4"
          aria-label="Campaign warnings"
          data-testid="warnings-section"
        >
          <h2
            className="text-lg font-semibold text-gray-800 dark:text-gray-200"
            data-testid="section-heading"
          >
            Warnings
          </h2>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {activeWarnings.length === 0
              ? 'No active warnings'
              : `${activeWarnings.length} active warning${activeWarnings.length !== 1 ? 's' : ''}`}
          </div>
          {activeWarnings.length === 0 ? (
            <p
              className="text-sm text-gray-500 italic dark:text-gray-400"
              data-testid="warnings-empty"
            >
              No active warnings — all systems nominal.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="warnings-list">
              {activeWarnings.map((warning) => (
                <WarningItem
                  key={warning.id}
                  warning={warning}
                  onDismiss={handleDismissWarning}
                  onDrillDown={handleDrillDown}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default CampaignDashboard;

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

const PerformerCard: React.FC<{
  performer: IPerformerSummary;
  activeSortKey: PerformerSortKey;
  onDrillDown: (targetTab: string, filter?: Record<string, unknown>) => void;
}> = ({ performer, activeSortKey, onDrillDown }) => (
  <div
    className={[
      'flex-shrink-0 w-40 md:w-48 p-3 md:p-4 rounded-lg',
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'shadow-sm hover:shadow-md transition-shadow',
    ].join(' ')}
    data-testid="performer-card"
  >
    <p
      className="truncate font-semibold text-gray-900 dark:text-gray-100"
      data-testid="performer-name"
      title={performer.name}
    >
      {performer.name}
    </p>
    <p
      className="mb-2 text-xs text-gray-500 dark:text-gray-400"
      data-testid="performer-rank"
    >
      {performer.rank}
    </p>

    <dl className="space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-gray-400">Kills</dt>
        <dd
          className={[
            'font-medium',
            activeSortKey === 'kills'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
          data-testid="performer-kills"
        >
          {performer.kills}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-gray-400">XP</dt>
        <dd
          className={[
            'font-medium',
            activeSortKey === 'xp'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
          data-testid="performer-xp"
        >
          {formatCompactNumber(performer.xp)}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-gray-400">Missions</dt>
        <dd
          className={[
            'font-medium',
            activeSortKey === 'missionsCompleted'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
          data-testid="performer-missions"
        >
          {performer.missionsCompleted}
        </dd>
      </div>
    </dl>

    <div className="mt-3">
      <DrillDownLink
        label="View Pilot"
        targetTab="encounter-history"
        filter={{ personId: performer.personId }}
        icon="chevron-right"
        onClick={onDrillDown}
      />
    </div>
  </div>
);

const WarningItem: React.FC<{
  warning: IDerivedWarning;
  onDismiss: (id: string) => void;
  onDrillDown: (targetTab: string, filter?: Record<string, unknown>) => void;
}> = ({ warning, onDismiss, onDrillDown }) => (
  <li
    className={[
      'flex items-start gap-3 p-3 rounded-lg border',
      SEVERITY_CLASSES[warning.severity],
    ].join(' ')}
    role="alert"
    data-testid="warning-item"
    data-severity={warning.severity}
  >
    <span
      className={[
        'inline-flex items-center justify-center',
        'text-xs font-bold uppercase px-2 py-0.5 rounded',
        SEVERITY_BADGE[warning.severity],
      ].join(' ')}
      data-testid="warning-severity-badge"
    >
      {warning.severity}
    </span>

    <span className="flex-1" data-testid="warning-message">
      {warning.message}
    </span>

    <DrillDownLink
      label="Details"
      targetTab="encounter-history"
      filter={{ warningTarget: warning.target }}
      icon="arrow-right"
      onClick={onDrillDown}
    />

    <button
      type="button"
      onClick={() => onDismiss(warning.id)}
      className={[
        `ml-2 min-h-[44px] min-w-[44px] rounded p-2 hover:bg-black/10 md:min-h-0 md:min-w-0 md:p-1 dark:hover:bg-white/10 ${FOCUS_RING_CLASSES}`,
        'transition-colors text-current opacity-60 hover:opacity-100 flex items-center justify-center',
      ].join(' ')}
      aria-label={`Dismiss warning: ${warning.message}`}
      data-testid="warning-dismiss"
    >
      ✕
    </button>
  </li>
);
