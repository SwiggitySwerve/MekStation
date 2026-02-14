import type {
  ICampaignDashboardMetrics,
  IFinancialDataPoint,
} from '@/types/simulation-viewer';

export type PerformerSortKey = 'kills' | 'xp' | 'missionsCompleted';

export interface IDerivedWarning {
  readonly id: string;
  readonly type: 'financial-risk' | 'pilot-risk' | 'unit-risk';
  readonly severity: 'critical' | 'warning' | 'info';
  readonly message: string;
  readonly target: string;
}

export const SORT_OPTIONS: ReadonlyArray<{
  key: PerformerSortKey;
  label: string;
}> = [
  { key: 'kills', label: 'Kills' },
  { key: 'xp', label: 'XP' },
  { key: 'missionsCompleted', label: 'Missions' },
] as const;

export const FINANCIAL_TIME_RANGES = ['7d', '30d', '90d', '1y'] as const;

export const SEVERITY_CLASSES: Record<IDerivedWarning['severity'], string> = {
  critical:
    'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200',
  warning:
    'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200',
};

export const SEVERITY_BADGE: Record<IDerivedWarning['severity'], string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
};

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }

  return num.toLocaleString('en-US');
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function deriveWarnings(
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

export function filterByTimeRange(
  data: readonly IFinancialDataPoint[],
  range: string,
): IFinancialDataPoint[] {
  if (data.length === 0) {
    return [];
  }

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

  return data.filter((point) => new Date(point.date) >= cutoff);
}
