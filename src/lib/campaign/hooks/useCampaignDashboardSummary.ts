/**
 * useCampaignDashboardSummary — derived state hook for the dashboard
 * (`add-campaign-command-center` Wave 6.1.B, task 2.1).
 *
 * Composes the 3 existing stores (campaign, roster, missions) into a
 * single `IDashboardSummary` shape that the 6 dashboard cards consume
 * directly. The cards see one cohesive object, never the raw stores,
 * which keeps each card decoupled from store layout drift and lets the
 * tests stub a fixture summary instead of standing up real stores.
 *
 * The hook is intentionally a pure selector — it produces a snapshot of
 * the current state. No subscriptions, no side effects. Components that
 * need live updates re-render when their consumed store slices change
 * (the standard Zustand pattern); the hook's caller controls reactivity.
 *
 * @spec openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md
 */

import { useMemo } from 'react';
import { useStore } from 'zustand';

import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  selectActiveContract,
  selectBillablePilotCount,
  selectDailyCostProjection,
} from '@/stores/campaign/campaignCommandSelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { getAllUnits } from '@/types/campaign/Force';

// =============================================================================
// Summary shape
// =============================================================================

/**
 * Force snapshot card payload — counts that the <ForceSnapshotCard>
 * renders without recomputation. Each value links to the relevant
 * sub-route; the card owns the rendering, the hook owns the numbers.
 */
export interface IForceSnapshotSummary {
  readonly mechCount: number;
  readonly pilotCount: number;
  readonly injuredPilotCount: number;
  readonly repairQueueDepth: number;
}

/**
 * Active contract card payload — surfaces only what the dashboard card
 * needs (name + employer + deadline + completion). Detailed contract
 * data lives on the contract-market sub-route.
 */
export interface IActiveContractSummary {
  /** Null when no contract is active — card renders an empty state. */
  readonly contract: {
    readonly id: string;
    readonly name: string;
    readonly employer: string;
    readonly daysRemaining: number;
    readonly objectivesCompleted: number;
    readonly objectivesTotal: number;
  } | null;
}

/**
 * Finances card payload — balance + daily cost projection + runway.
 * The "last 5 ledger entries" the spec calls for is sourced from the
 * activity log's `finances` category at render time (the dashboard
 * already has that data via this hook).
 */
export interface IFinancesSummary {
  /** Formatted balance string (the campaign's Money type formats itself). */
  readonly balanceFormatted: string;
  readonly dailySalariesAmount: number;
  readonly dailyMaintenanceAmount: number;
  readonly dailyLoanRepaymentAmount: number;
  readonly dailyTotalAmount: number;
  /** Floor of balance / dailyTotal; Infinity when daily total is zero. */
  readonly runwayDays: number;
}

/**
 * Day advance card payload — current date + pending event count
 * (the live "Advance to next event" target). For Wave 6.1 the
 * pending-event preview is a placeholder ("no events upcoming") —
 * the live event-prediction wiring lands in a follow-up.
 */
export interface IDayAdvanceSummary {
  readonly currentDate: Date;
  readonly currentDay: number;
  /** Always null in Wave 6.1; the field shape stays stable for follow-up wiring. */
  readonly pendingEventPreview: string | null;
}

export type CampaignOperationPriority =
  | 'critical'
  | 'warning'
  | 'ready'
  | 'routine';

export interface ICampaignOperationItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly href: string;
  readonly ctaLabel: string;
  readonly priority: CampaignOperationPriority;
}

export interface ICampaignOperationsSummary {
  readonly unresolvedCount: number;
  readonly statusLabel: string;
  readonly items: readonly ICampaignOperationItem[];
}

/** Aggregate summary the dashboard consumes. */
export interface IDashboardSummary {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly forceSnapshot: IForceSnapshotSummary;
  readonly activeContract: IActiveContractSummary;
  readonly finances: IFinancesSummary;
  readonly dayAdvance: IDayAdvanceSummary;
  readonly activityLog: readonly IActivityLogEntry[];
  readonly operations: ICampaignOperationsSummary;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the active contract's days-remaining count. The Wave-4
 * campaign-command extensions store the contract list on the campaign
 * object — the dashboard reads it through a defensive cast so this hook
 * remains decoupled from the exact extension shape.
 */
function extractActiveContractSummary(
  campaign: ICampaign | null,
): IActiveContractSummary {
  const contract = selectActiveContract(campaign);
  if (!campaign || !contract) {
    return { contract: null };
  }
  // The campaign-command extensions live in
  // src/types/campaign/CampaignCommandExtensions.ts; rather than couple this
  // hook to the full extension shape, we read defensively. The
  // <ActiveContractCard> only needs name/employer/deadline/completion.
  const endDate = contract.endDate ? new Date(contract.endDate) : null;
  // Surface the campaign's stored `deadlineDay` (already day-of-campaign).
  // The dashboard's "days remaining" is `max(0, deadline - currentDay)`.
  // currentDay is sourced from the day-advance summary; we approximate
  // here by reading campaign.currentDate against startedDate. For Wave
  // 6.1 the deadlineDay is treated as days-remaining directly.
  const daysRemaining =
    endDate && !Number.isNaN(endDate.getTime())
      ? Math.max(
          0,
          Math.ceil(
            (endDate.getTime() - campaign.currentDate.getTime()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : 0;
  return {
    contract: {
      id: contract.id,
      name: contract.name,
      employer: contract.employerId,
      daysRemaining,
      objectivesCompleted: 0,
      objectivesTotal: contract.scenarioIds.length,
    },
  };
}

/**
 * Compute the finances snapshot. Reads the campaign's Money balance and
 * estimates daily costs from the existing defaults shipped by
 * `dayReportTypes` (Wave 4) — salaries + maintenance + loan repayment.
 * The full daily-cost engine lives in `dailyCostsProcessor`; this hook
 * surfaces a quick estimate so the dashboard's "runway in days" lines
 * up roughly with the day-report breakdown.
 */
function extractFinancesSummary(
  campaign: ICampaign | null,
  pilotCount: number,
): IFinancesSummary {
  if (!campaign) {
    return {
      balanceFormatted: 'No campaign',
      dailySalariesAmount: 0,
      dailyMaintenanceAmount: 0,
      dailyLoanRepaymentAmount: 0,
      dailyTotalAmount: 0,
      runwayDays: 0,
    };
  }
  const extended = campaign as ICampaign & {
    finances?: {
      balance?: {
        amount?: number;
        format?: () => string;
      };
    };
  };
  // Money.format() is the canonical formatter — fall back gracefully if absent.
  const balanceFormatted =
    extended.finances?.balance?.format?.() ??
    String(extended.finances?.balance?.amount ?? 0);
  const balanceAmount = extended.finances?.balance?.amount ?? 0;

  // Quick daily-cost estimate — the day-pipeline's dailyCostsProcessor
  // (see src/lib/campaign/dayReportTypes.ts) uses
  // DEFAULT_DAILY_SALARY = 50 per pilot and
  // DEFAULT_DAILY_MAINTENANCE = 100 per unit. The dashboard surfaces
  // those numbers as a quick projection; the authoritative figures
  // come from the day report after an advance.
  const dailyCost = selectDailyCostProjection(campaign, pilotCount);
  const dailySalariesAmount = dailyCost.salaries;
  const dailyMaintenanceAmount = dailyCost.maintenance;
  // Loan repayment is part of `dailyCostsProcessor` output; quick-estimate
  // it as zero here — the dashboard's day-advance card surfaces the
  // authoritative number after the next advance.
  const dailyLoanRepaymentAmount = dailyCost.loanRepayment;
  const dailyTotalAmount = dailyCost.total;
  const runwayDays =
    dailyTotalAmount === 0
      ? Number.POSITIVE_INFINITY
      : Math.floor(balanceAmount / dailyTotalAmount);

  return {
    balanceFormatted,
    dailySalariesAmount,
    dailyMaintenanceAmount,
    dailyLoanRepaymentAmount,
    dailyTotalAmount,
    runwayDays,
  };
}

/**
 * Force snapshot — counts only. Detailed roster + mech bay state stay
 * on the relevant sub-routes; this just shows the headline numbers.
 */
export function extractForceSnapshot(
  campaign: ICampaign | null,
  _rosterUnits: readonly IRosterUnitProjection[] = [],
  rosterPilots: readonly ICampaignRosterEntry[] = [],
): IForceSnapshotSummary {
  if (!campaign) {
    return {
      mechCount: 0,
      pilotCount: 0,
      injuredPilotCount: 0,
      repairQueueDepth: 0,
    };
  }
  const extended = campaign as ICampaign & {
    repairBay?: { tickets?: readonly unknown[] };
  };
  const rootForce = campaign.forces.get(campaign.rootForceId);
  return {
    mechCount: rootForce ? getAllUnits(rootForce, campaign.forces).length : 0,
    pilotCount: rosterPilots.length,
    injuredPilotCount: rosterPilots.filter(
      (pilot) => pilot.status !== CampaignPilotStatus.Active,
    ).length,
    repairQueueDepth:
      campaign.repairQueue?.length ?? extended.repairBay?.tickets?.length ?? 0,
  };
}

function countOpenSalvageAllocations(campaign: ICampaign | null): number {
  if (!campaign?.salvageAllocations) {
    return 0;
  }

  return Object.values(campaign.salvageAllocations).filter(
    (allocation) => allocation && !allocation.processed,
  ).length;
}

function buildCampaignOperationsSummary(
  campaign: ICampaign,
  forceSnapshot: IForceSnapshotSummary,
  activeContract: IActiveContractSummary,
  finances: IFinancesSummary,
  pendingBattleCount: number,
): ICampaignOperationsSummary {
  const campaignHref = `/gameplay/campaigns/${campaign.id}`;
  const salvageCount = countOpenSalvageAllocations(campaign);
  const gmEventCount = campaign.gmInterventionEvents?.length ?? 0;
  const items: ICampaignOperationItem[] = [];

  if (pendingBattleCount > 0) {
    items.push({
      id: 'pending-battle-outcomes',
      title: 'Battle outcome waiting',
      detail: `${pendingBattleCount} result${
        pendingBattleCount === 1 ? '' : 's'
      } need campaign application before the next clean day advance.`,
      href: `${campaignHref}/gm-ledger`,
      ctaLabel: 'Open GM ledger',
      priority: 'critical',
    });
  }

  if (salvageCount > 0) {
    items.push({
      id: 'salvage-review',
      title: 'Salvage review',
      detail: `${salvageCount} allocation${
        salvageCount === 1 ? '' : 's'
      } still need accept, decline, or GM correction.`,
      href: `${campaignHref}/salvage`,
      ctaLabel: 'Review salvage',
      priority: 'warning',
    });
  }

  if (forceSnapshot.repairQueueDepth > 0) {
    items.push({
      id: 'repair-queue',
      title: 'Repair queue active',
      detail: `${forceSnapshot.repairQueueDepth} repair ticket${
        forceSnapshot.repairQueueDepth === 1 ? '' : 's'
      } can affect mission readiness and operating cost.`,
      href: `${campaignHref}/repair-bay`,
      ctaLabel: 'Open repair bay',
      priority: 'warning',
    });
  }

  if (forceSnapshot.injuredPilotCount > 0) {
    items.push({
      id: 'medical-attention',
      title: 'Pilots need medical attention',
      detail: `${forceSnapshot.injuredPilotCount} injured pilot${
        forceSnapshot.injuredPilotCount === 1 ? '' : 's'
      } may block assignments or require recovery time.`,
      href: `${campaignHref}/medical-bay`,
      ctaLabel: 'Open medical bay',
      priority: 'warning',
    });
  }

  if (Number.isFinite(finances.runwayDays) && finances.runwayDays <= 14) {
    items.push({
      id: 'finance-runway',
      title: 'Finance runway low',
      detail: `${finances.runwayDays} day${
        finances.runwayDays === 1 ? '' : 's'
      } of runway at the current daily cost estimate.`,
      href: `${campaignHref}/finances`,
      ctaLabel: 'Review finances',
      priority: finances.runwayDays <= 7 ? 'critical' : 'warning',
    });
  }

  if (activeContract.contract) {
    items.push({
      id: 'active-contract',
      title: 'Mission track ready',
      detail: `${activeContract.contract.name} has ${activeContract.contract.daysRemaining} day${
        activeContract.contract.daysRemaining === 1 ? '' : 's'
      } remaining.`,
      href: `${campaignHref}/missions`,
      ctaLabel: 'Open missions',
      priority: 'ready',
    });
  } else {
    items.push({
      id: 'choose-contract',
      title: 'Choose a contract',
      detail: 'No active contract is attached to this campaign.',
      href: `${campaignHref}/contract-market`,
      ctaLabel: 'Browse contracts',
      priority: 'ready',
    });
  }

  if (gmEventCount > 0) {
    items.push({
      id: 'gm-audit-review',
      title: 'GM audit trail available',
      detail: `${gmEventCount} approved correction${
        gmEventCount === 1 ? '' : 's'
      } can be reviewed without exposing private GM reasoning.`,
      href: `${campaignHref}/gm-ledger`,
      ctaLabel: 'Review ledger',
      priority: 'routine',
    });
  }

  const unresolvedCount = items.filter(
    (item) => item.priority === 'critical' || item.priority === 'warning',
  ).length;

  return {
    unresolvedCount,
    statusLabel:
      unresolvedCount === 0
        ? 'No blockers'
        : `${unresolvedCount} attention item${unresolvedCount === 1 ? '' : 's'}`,
    items,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Public selector — returns the aggregated summary for the active
 * campaign. The hook reads from the campaign store synchronously and
 * memoizes by the campaign's identity so re-renders that don't change
 * the relevant slice are no-ops downstream.
 *
 * The shape includes the full activity log (newest last). The
 * <ActivityLogCard> filters by category at render time; surfacing the
 * full log here keeps the hook simple and the card composable.
 */
export function useCampaignDashboardSummary(): IDashboardSummary | null {
  const store = useCampaignStore();
  const campaign = useStore(store, (state) => state.campaign);
  const activityLog = useStore(store, (state) => state.activityLog);
  const pendingBattleOutcomes = useStore(
    store,
    (state) => state.pendingBattleOutcomes,
  );
  const rosterUnits = useCampaignRosterStore((state) => state.units);
  const rosterPilots = useCampaignRosterStore((state) => state.pilots);

  return useMemo<IDashboardSummary | null>(() => {
    if (!campaign) return null;
    const forceSnapshot = extractForceSnapshot(
      campaign,
      rosterUnits,
      rosterPilots,
    );
    const activeContract = extractActiveContractSummary(campaign);
    const finances = extractFinancesSummary(
      campaign,
      selectBillablePilotCount(rosterPilots),
    );

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      forceSnapshot,
      activeContract,
      finances,
      dayAdvance: {
        currentDate: campaign.currentDate,
        // Day-of-campaign is currently derived from currentDate vs createdAt
        // on the existing day pipeline; for the dashboard's purposes this
        // surfaces 0 if the campaign has not advanced yet. Acceptable for
        // Wave 6.1 — the dashboard renders "Day X" as a header label only.
        currentDay: 0,
        pendingEventPreview: null,
      },
      activityLog,
      operations: buildCampaignOperationsSummary(
        campaign,
        forceSnapshot,
        activeContract,
        finances,
        pendingBattleOutcomes.length,
      ),
    };
    // The memo key is the identity of the campaign + log — re-runs only when
    // those change. Day-advance mutates both, so the dashboard sees fresh
    // numbers immediately after an advance.
  }, [campaign, activityLog, pendingBattleOutcomes, rosterPilots, rosterUnits]);
}
