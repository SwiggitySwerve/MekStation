import React, { useMemo, useState, useCallback } from 'react';

import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type { IBattle, ComparisonMode } from './types';

import { BAR_SEGMENTS, computeCampaignAverage, formatDuration } from './types';

export interface IComparisonSectionProps {
  readonly battle: IBattle;
  readonly battles: IBattle[];
  readonly onDrillDown: (
    targetTab: string,
    filter?: Record<string, unknown>,
  ) => void;
}

export const ComparisonSection: React.FC<IComparisonSectionProps> = ({
  battle,
  battles,
  onDrillDown,
}) => {
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>('campaign-average');
  const [comparisonBattleId, setComparisonBattleId] = useState<string | null>(
    null,
  );

  const campaignAverage = useMemo(
    () => computeCampaignAverage(battles),
    [battles],
  );

  const comparisonTarget = useMemo(() => {
    if (comparisonMode === 'campaign-average') return campaignAverage;
    const target = battles.find((b) => b.id === comparisonBattleId);
    if (!target) return null;
    return {
      duration: target.duration,
      kills: target.stats.totalKills,
      damage: target.stats.totalDamage,
      unitsLost: target.stats.unitsLost,
    };
  }, [comparisonMode, campaignAverage, battles, comparisonBattleId]);

  const handleComparisonModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setComparisonMode(e.target.value as ComparisonMode);
    },
    [],
  );

  const handleComparisonBattleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setComparisonBattleId(e.target.value || null);
    },
    [],
  );

  const handleDrillDown = useCallback(
    (targetTab: string, filter?: Record<string, unknown>) => {
      onDrillDown(targetTab, filter);
    },
    [onDrillDown],
  );

  return (
    <section aria-label="Comparison view" data-testid="comparison-section">
      <h2
        className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200"
        data-testid="section-heading"
      >
        Comparison
      </h2>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={comparisonMode}
          onChange={handleComparisonModeChange}
          className={`min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 md:min-h-0 md:py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
          aria-label="Comparison mode"
          data-testid="comparison-mode-toggle"
        >
          <option value="campaign-average">vs Campaign Average</option>
          <option value="specific-battle">vs Specific Battle</option>
        </select>
        {comparisonMode === 'specific-battle' && (
          <select
            value={comparisonBattleId ?? ''}
            onChange={handleComparisonBattleChange}
            className={`min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 md:min-h-0 md:py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
            aria-label="Select battle for comparison"
            data-testid="comparison-battle-select"
          >
            <option value="">Select a battle</option>
            {battles
              .filter((b) => b.id !== battle.id)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.missionName} — {new Date(b.timestamp).toLocaleDateString()}
                </option>
              ))}
          </select>
        )}
      </div>

      {comparisonTarget ? (
        <div
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          data-testid="comparison-metrics"
        >
          {(
            [
              {
                key: 'duration',
                label: 'Duration',
                current: battle.duration,
                baseline: comparisonTarget.duration,
                fmt: (v: number) => formatDuration(Math.round(v)),
              },
              {
                key: 'kills',
                label: 'Kills',
                current: battle.stats.totalKills,
                baseline: comparisonTarget.kills,
                fmt: (v: number) => String(v),
              },
              {
                key: 'damage',
                label: 'Damage',
                current: battle.stats.totalDamage,
                baseline: comparisonTarget.damage,
                fmt: (v: number) => String(v),
              },
              {
                key: 'unitsLost',
                label: 'Units Lost',
                current: battle.stats.unitsLost,
                baseline: comparisonTarget.unitsLost,
                fmt: (v: number) => String(v),
              },
            ] as const
          ).map((metric) => {
            const maxVal = Math.max(metric.current, metric.baseline, 1);
            const currentFilled = Math.round(
              (metric.current / maxVal) * BAR_SEGMENTS,
            );
            const baselineFilled = Math.round(
              (metric.baseline / maxVal) * BAR_SEGMENTS,
            );
            return (
              <div
                key={metric.key}
                data-testid={`comparison-metric-${metric.key}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {metric.fmt(metric.current)} vs{' '}
                    {metric.fmt(metric.baseline)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-blue-600 dark:text-blue-400">
                      Current
                    </span>
                    <div
                      className="flex gap-0.5"
                      data-testid={`comparison-bar-current-${metric.key}`}
                    >
                      {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
                        <div
                          key={i}
                          className={`h-3 w-1.5 rounded-sm ${
                            i < currentFilled
                              ? 'bg-blue-500 dark:bg-blue-400'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-emerald-600 dark:text-emerald-400">
                      Baseline
                    </span>
                    <div
                      className="flex gap-0.5"
                      data-testid={`comparison-bar-baseline-${metric.key}`}
                    >
                      {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
                        <div
                          key={i}
                          className={`h-3 w-1.5 rounded-sm ${
                            i < baselineFilled
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
            <DrillDownLink
              label="View Detailed Comparison"
              targetTab="analysis-bugs"
              filter={{
                battleId: battle.id,
                comparisonMode,
                comparisonBattleId,
              }}
              icon="arrow-right"
              onClick={handleDrillDown}
            />
          </div>
        </div>
      ) : (
        <p
          className="text-sm text-gray-500 italic dark:text-gray-400"
          data-testid="no-comparison-target"
        >
          Select a battle to compare against.
        </p>
      )}
    </section>
  );
};
