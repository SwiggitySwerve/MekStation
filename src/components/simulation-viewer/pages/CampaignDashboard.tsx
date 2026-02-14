import React, { useCallback, useMemo, useState } from 'react';

import type {
  ICampaignDashboardMetrics,
  IFinancialDataPoint,
} from '@/types/simulation-viewer';

import { announce } from '@/utils/accessibility';

import {
  TopPerformersSection,
  WarningsSection,
} from './CampaignDashboard.alertSections';
import {
  type CampaignDrillDownHandler,
  FinancialSection,
  ForceSection,
  ProgressionSection,
  RosterSection,
} from './CampaignDashboard.overviewSections';
import {
  type PerformerSortKey,
  deriveWarnings,
  filterByTimeRange,
} from './CampaignDashboard.utils';

export { formatCompactNumber, formatPercent } from './CampaignDashboard.utils';

export interface ICampaignDashboardProps {
  readonly campaignId: string;
  readonly metrics: ICampaignDashboardMetrics;
  readonly onDrillDown?: (
    target: string,
    context: Record<string, unknown>,
  ) => void;
}

export const CampaignDashboard: React.FC<ICampaignDashboardProps> = ({
  campaignId,
  metrics,
  onDrillDown,
}) => {
  const [performerSortKey, setPerformerSortKey] =
    useState<PerformerSortKey>('kills');
  const [financialTimeRange, setFinancialTimeRange] = useState('30d');
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(
    () => new Set(),
  );

  const warnings = useMemo(
    () => deriveWarnings(metrics.warnings),
    [metrics.warnings],
  );

  const activeWarnings = useMemo(
    () => warnings.filter((warning) => !dismissedWarnings.has(warning.id)),
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
      filteredFinancialData.map((point) => ({
        date: point.date,
        value: point.balance,
      })),
    [filteredFinancialData],
  );

  const latestFinancial: IFinancialDataPoint | null = useMemo(() => {
    const trend = metrics.financialTrend ?? [];
    return trend.length > 0 ? trend[trend.length - 1] : null;
  }, [metrics.financialTrend]);

  const handleDrillDown = useCallback<CampaignDrillDownHandler>(
    (targetTab, filter) => {
      onDrillDown?.(targetTab, filter ?? {});
    },
    [onDrillDown],
  );

  const handleDismissWarning = useCallback((warningId: string) => {
    setDismissedWarnings((previous) => {
      const next = new Set(previous);
      next.add(warningId);
      return next;
    });
    announce('Warning dismissed');
  }, []);

  const handleTimeRangeChange = useCallback((range: string) => {
    setFinancialTimeRange(range);
  }, []);

  const handlePerformerSortChange = useCallback((sortKey: PerformerSortKey) => {
    setPerformerSortKey(sortKey);
  }, []);

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
        <RosterSection metrics={metrics} onDrillDown={handleDrillDown} />
        <ForceSection metrics={metrics} onDrillDown={handleDrillDown} />
        <FinancialSection
          chartData={chartData}
          financialTimeRange={financialTimeRange}
          onTimeRangeChange={handleTimeRangeChange}
          latestFinancial={latestFinancial}
          onDrillDown={handleDrillDown}
        />
        <ProgressionSection metrics={metrics} onDrillDown={handleDrillDown} />
        <TopPerformersSection
          sortedPerformers={sortedPerformers}
          performerSortKey={performerSortKey}
          onSortChange={handlePerformerSortChange}
          onDrillDown={handleDrillDown}
        />
        <WarningsSection
          activeWarnings={activeWarnings}
          onDismissWarning={handleDismissWarning}
          onDrillDown={handleDrillDown}
        />
      </div>
    </main>
  );
};

export default CampaignDashboard;
