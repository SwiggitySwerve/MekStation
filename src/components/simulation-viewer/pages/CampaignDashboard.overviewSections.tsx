import React from 'react';

import type {
  ICampaignDashboardMetrics,
  IFinancialDataPoint,
} from '@/types/simulation-viewer';

import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { KPICard } from '@/components/simulation-viewer/KPICard';
import { TrendChart } from '@/components/simulation-viewer/TrendChart';

import {
  FINANCIAL_TIME_RANGES,
  formatCompactNumber,
  formatPercent,
} from './CampaignDashboard.utils';

export type CampaignDrillDownHandler = (
  targetTab: string,
  filter?: Record<string, unknown>,
) => void;

interface RosterSectionProps {
  metrics: ICampaignDashboardMetrics;
  onDrillDown: CampaignDrillDownHandler;
}

export const RosterSection: React.FC<RosterSectionProps> = ({
  metrics,
  onDrillDown,
}) => (
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
      comparisonDirection={(metrics.roster?.kia ?? 0) > 0 ? 'down' : 'neutral'}
      className="border-l-4 border-red-500"
      data-testid="roster-kia"
    />

    <DrillDownLink
      label="View Pilot Roster"
      targetTab="encounter-history"
      filter={{ section: 'roster' }}
      icon="chevron-right"
      onClick={onDrillDown}
    />
  </section>
);

interface ForceSectionProps {
  metrics: ICampaignDashboardMetrics;
  onDrillDown: CampaignDrillDownHandler;
}

export const ForceSection: React.FC<ForceSectionProps> = ({
  metrics,
  onDrillDown,
}) => (
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
      onClick={onDrillDown}
    />
  </section>
);

interface FinancialSectionProps {
  chartData: Array<{ date: string; value: number }>;
  financialTimeRange: string;
  onTimeRangeChange: (range: string) => void;
  latestFinancial: IFinancialDataPoint | null;
  onDrillDown: CampaignDrillDownHandler;
}

export const FinancialSection: React.FC<FinancialSectionProps> = ({
  chartData,
  financialTimeRange,
  onTimeRangeChange,
  latestFinancial,
  onDrillDown,
}) => (
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
      onTimeRangeChange={onTimeRangeChange}
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
      onClick={onDrillDown}
    />
  </section>
);

interface ProgressionSectionProps {
  metrics: ICampaignDashboardMetrics;
  onDrillDown: CampaignDrillDownHandler;
}

export const ProgressionSection: React.FC<ProgressionSectionProps> = ({
  metrics,
  onDrillDown,
}) => (
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
      onClick={onDrillDown}
    />
  </section>
);
