/**
 * CampaignDashboard — Wave 6.1.B composition of the 6 dashboard cards.
 *
 * Mounted at `/gameplay/campaigns/[id]` (replacing the previous tile-grid
 * index) per `add-campaign-command-center` task 4.2. The dashboard reads
 * a single `IDashboardSummary` snapshot via `useCampaignDashboardSummary`
 * and dispatches day-advance to the existing campaign store actions.
 *
 * Wave 6.1.B ships the dashboard as the unconditional landing surface
 * for a campaign detail route. The "operator can opt back to the
 * tile-grid index" scenario is an explicit follow-up — the legacy
 * tile-grid is still reachable directly via `/gameplay/campaigns/[id]/overview`
 * if a future change adds the settings toggle.
 *
 * @spec openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md
 */

import React from 'react';

import type { MaybePromise } from '@/stores/campaign/useCampaignStore.types';

import { useCampaignDashboardSummary } from '@/lib/campaign/hooks/useCampaignDashboardSummary';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

import {
  ActiveContractCard,
  ActivityLogCard,
  DayAdvanceCard,
  FinancesCard,
  ForceSnapshotCard,
  OperationsQueueCard,
  QuickActionsCard,
} from './CampaignDashboardCards';

export interface ICampaignDashboardProps {
  /**
   * Optional handler invoked after a day-advance click — gives the caller
   * a hook to surface the resulting DayReport via <DayReportPanel>. The
   * existing CampaignDashboardPage already owns that integration; for
   * tests this stays optional.
   */
  readonly onAfterAdvance?: () => void;
}

export function CampaignDashboard({
  onAfterAdvance,
}: ICampaignDashboardProps = {}): React.ReactElement | null {
  const summary = useCampaignDashboardSummary();
  const store = useCampaignStore();

  if (!summary) {
    return null;
  }

  const handleAdvanceDay = (): void => {
    const report = store.getState().advanceDay();
    if (isPromiseLike(report)) {
      void report.then(() => onAfterAdvance?.());
      return;
    }
    onAfterAdvance?.();
  };
  const handleAdvanceWeek = (): void => {
    const reports = store.getState().advanceDays(7);
    if (isPromiseLike(reports)) {
      void reports.then(() => onAfterAdvance?.());
      return;
    }
    onAfterAdvance?.();
  };

  return (
    <section
      data-testid="campaign-dashboard"
      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
    >
      <ForceSnapshotCard
        campaignId={summary.campaignId}
        snapshot={summary.forceSnapshot}
      />
      <ActiveContractCard
        campaignId={summary.campaignId}
        summary={summary.activeContract}
      />
      <FinancesCard
        campaignId={summary.campaignId}
        summary={summary.finances}
      />
      <DayAdvanceCard
        summary={summary.dayAdvance}
        onAdvanceDay={handleAdvanceDay}
        onAdvanceWeek={handleAdvanceWeek}
      />
      <ActivityLogCard
        campaignId={summary.campaignId}
        entries={summary.activityLog}
      />
      <OperationsQueueCard
        campaignId={summary.campaignId}
        summary={summary.operations}
      />
      <QuickActionsCard campaignId={summary.campaignId} />
    </section>
  );
}

function isPromiseLike<T>(value: MaybePromise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}
