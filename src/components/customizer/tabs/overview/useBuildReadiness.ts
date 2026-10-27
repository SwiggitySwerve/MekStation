/**
 * Build readiness for the Overview
 *
 * The readiness rows and their header counts for the unit's current state,
 * derived once from the Overview build summary data. The Build summary card
 * and the phone issue summary both read it, so the two never disagree. It adds
 * no rules: the rows and counts come from `buildReadiness`.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import { useMemo } from 'react';

import type { BuildStatusSummary } from '@/components/customizer/shared/buildStatusSummary';

import type { OverviewBuildSummaryData } from './useOverviewBuildSummary';

import {
  getReadinessRows,
  getReadinessStatus,
  type ReadinessRow,
} from './buildReadiness';

export interface BuildReadiness {
  readonly rows: readonly ReadinessRow[];
  /** Header counts, shared with the build-status button. */
  readonly status: BuildStatusSummary;
}

export function useBuildReadiness(
  data: OverviewBuildSummaryData,
): BuildReadiness {
  const {
    stats,
    equipmentCount,
    unplacedInstanceIds,
    unplacedItemNames,
    validation,
  } = data;
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
  const status = useMemo(
    () =>
      getReadinessStatus(
        validation,
        stats.heatGenerated,
        stats.heatDissipation,
      ),
    [validation, stats.heatGenerated, stats.heatDissipation],
  );
  return { rows, status };
}
