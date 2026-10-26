import React, { useMemo } from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import {
  getCapacityStatus,
  getHeatStatus,
  getWeightStatus,
  STAT_STATUS_TEXT_CLASS,
} from '@/components/customizer/shared/unitStatStatus';
import { calculateArmorPercentage } from '@/services/pilot-mech-card/PilotMechCardDataService';

import type { OverviewBuildSummaryData } from './useOverviewBuildSummary';

import { customizerStyles as cs } from '../../styles';
import { getReadinessRows, getReadinessStatus } from './buildReadiness';
import { BuildReadinessList } from './BuildReadinessList';
import { formatTons, getTonnageBreakdown } from './tonnageBreakdown';
import { TonnageBreakdownBar } from './TonnageBreakdownBar';

interface StatTileProps {
  readonly label: string;
  readonly ariaLabel?: string;
  readonly children: React.ReactNode;
  readonly caption: React.ReactNode;
  readonly testId: string;
}

function StatTile({
  label,
  ariaLabel,
  children,
  caption,
  testId,
}: StatTileProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      className="border-border-theme-subtle bg-surface-deep/35 min-w-0 rounded border px-3 py-2"
    >
      <p className={cs.text.subsection}>{label}</p>
      <p className="mt-0.5 text-xl leading-tight font-semibold tabular-nums">
        {children}
      </p>
      <p className={`${cs.text.secondary} truncate tabular-nums`}>{caption}</p>
    </div>
  );
}

interface BuildSummaryCardProps {
  readonly data: OverviewBuildSummaryData;
  readonly onNavigate?: (tabId: CustomizerTabId) => void;
}

/**
 * The Overview's answer to "where does this build stand?": tonnage split,
 * headline readouts and a readiness checklist with links to the fixing tab.
 */
export function BuildSummaryCard({
  data,
  onNavigate,
}: BuildSummaryCardProps): React.ReactElement {
  const {
    stats,
    calculations,
    equipmentWeight,
    equipmentCount,
    unplacedInstanceIds,
    unplacedItemNames,
    validation,
  } = data;
  const unplacedCount = unplacedInstanceIds.length;

  const breakdown = useMemo(
    () =>
      getTonnageBreakdown(calculations, equipmentWeight, {
        used: stats.weightUsed,
        max: stats.tonnage,
        remaining: stats.weightRemaining,
      }),
    [
      calculations,
      equipmentWeight,
      stats.weightUsed,
      stats.tonnage,
      stats.weightRemaining,
    ],
  );

  const rows = useMemo(
    () =>
      getReadinessRows(
        {
          tonnage: stats.tonnage,
          weightUsed: stats.weightUsed,
          weightRemaining: stats.weightRemaining,
          criticalSlotsUsed: stats.criticalSlotsUsed,
          criticalSlotsTotal: stats.criticalSlotsTotal,
          criticalSlotsPlaced: stats.criticalSlotsPlaced,
          criticalSlotsPending: stats.criticalSlotsPending,
          armorPoints: stats.armorPoints,
          maxArmorPoints: stats.maxArmorPoints,
          heatGenerated: stats.heatGenerated,
          heatDissipation: stats.heatDissipation,
          equipmentCount,
          unplacedInstanceIds,
          unplacedItemNames,
        },
        validation.result,
      ),
    [
      stats,
      equipmentCount,
      unplacedInstanceIds,
      unplacedItemNames,
      validation.result,
    ],
  );

  const weightStatus = getWeightStatus(stats.weightUsed, stats.tonnage);
  const heatStatus = getHeatStatus(stats.heatGenerated, stats.heatDissipation);
  const armorStatus = getCapacityStatus(
    stats.armorPoints,
    stats.maxArmorPoints,
  );

  return (
    <section
      aria-labelledby="overview-build-summary-title"
      className={`${cs.panel.main} @container`}
      data-testid="overview-build-summary"
    >
      <div className="border-border-theme mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3">
        <h3 id="overview-build-summary-title" className={cs.text.cardTitle}>
          Build summary
        </h3>
        <p className={`${cs.text.label} tabular-nums`}>
          <span
            className={`${STAT_STATUS_TEXT_CLASS[weightStatus]} font-semibold`}
          >
            {stats.weightUsed.toFixed(1)}
          </span>{' '}
          / {formatTons(stats.tonnage)} used
        </p>
      </div>

      <div className="space-y-4">
        <TonnageBreakdownBar breakdown={breakdown} />

        <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
          {/* Numbers only: the Heat readiness row says what running hot means. */}
          <StatTile
            label="Heat"
            testId="overview-stat-heat"
            caption="at full fire"
          >
            <span className={STAT_STATUS_TEXT_CLASS[heatStatus]}>
              {stats.heatGenerated}
            </span>
            <span className="text-text-theme-secondary text-sm font-normal">
              {' '}
              / {stats.heatDissipation} dissipation
            </span>
          </StatTile>
          <StatTile
            label="Armor"
            testId="overview-stat-armor"
            caption={`${stats.armorPoints} / ${stats.maxArmorPoints} pts`}
          >
            <span className={STAT_STATUS_TEXT_CLASS[armorStatus]}>
              {calculateArmorPercentage(
                stats.armorPoints,
                stats.maxArmorPoints,
              )}
              %
            </span>
          </StatTile>
          <StatTile label="BV" testId="overview-stat-bv" caption="Battle value">
            <span className="text-text-theme-primary">
              {stats.battleValue?.toLocaleString() ?? '-'}
            </span>
          </StatTile>
          <StatTile
            label="Equipment"
            ariaLabel="Equipment summary"
            testId="overview-stat-equipment"
            caption={`${formatTons(equipmentWeight)} · ${unplacedCount} unplaced`}
          >
            <strong className="text-text-theme-primary font-semibold">
              {equipmentCount}
            </strong>
            <span className="text-text-theme-secondary text-sm font-normal">
              {' '}
              {equipmentCount === 1 ? 'item' : 'items'}
            </span>
          </StatTile>
        </div>

        <div className="border-border-theme border-t pt-3">
          <BuildReadinessList
            rows={rows}
            status={getReadinessStatus(
              validation,
              stats.heatGenerated,
              stats.heatDissipation,
            )}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </section>
  );
}
