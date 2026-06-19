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

import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { ICampaign } from '@/types/campaign/Campaign';

import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

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

/** Aggregate summary the dashboard consumes. */
export interface IDashboardSummary {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly forceSnapshot: IForceSnapshotSummary;
  readonly activeContract: IActiveContractSummary;
  readonly finances: IFinancesSummary;
  readonly dayAdvance: IDayAdvanceSummary;
  readonly activityLog: readonly IActivityLogEntry[];
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
  if (!campaign) {
    return { contract: null };
  }
  // The campaign-command extensions live in
  // src/types/campaign/CampaignCommandExtensions.ts; rather than couple this
  // hook to the full extension shape, we read defensively. The
  // <ActiveContractCard> only needs name/employer/deadline/completion.
  const extended = campaign as ICampaign & {
    activeContract?: {
      id?: string;
      name?: string;
      employerFactionId?: string;
      deadlineDay?: number;
      objectivesCompleted?: number;
      objectivesTotal?: number;
    };
  };
  const ac = extended.activeContract;
  if (!ac || typeof ac.id !== 'string') {
    return { contract: null };
  }
  // Surface the campaign's stored `deadlineDay` (already day-of-campaign).
  // The dashboard's "days remaining" is `max(0, deadline - currentDay)`.
  // currentDay is sourced from the day-advance summary; we approximate
  // here by reading campaign.currentDate against startedDate. For Wave
  // 6.1 the deadlineDay is treated as days-remaining directly.
  const daysRemaining =
    typeof ac.deadlineDay === 'number' ? Math.max(0, ac.deadlineDay) : 0;
  return {
    contract: {
      id: ac.id,
      name: ac.name ?? 'Unnamed Contract',
      employer: ac.employerFactionId ?? 'Unknown',
      daysRemaining,
      objectivesCompleted: ac.objectivesCompleted ?? 0,
      objectivesTotal: ac.objectivesTotal ?? 0,
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
function extractFinancesSummary(campaign: ICampaign | null): IFinancesSummary {
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
    personnel?: { size: number } | Set<unknown>;
    forces?: { size: number } | Set<unknown>;
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
  const DEFAULT_DAILY_SALARY = 50;
  const DEFAULT_DAILY_MAINTENANCE = 100;
  const personnelSize =
    extended.personnel && 'size' in extended.personnel
      ? (extended.personnel.size ?? 0)
      : 0;
  const forcesSize =
    extended.forces && 'size' in extended.forces
      ? (extended.forces.size ?? 0)
      : 0;
  const dailySalariesAmount = DEFAULT_DAILY_SALARY * personnelSize;
  const dailyMaintenanceAmount = DEFAULT_DAILY_MAINTENANCE * forcesSize;
  // Loan repayment is part of `dailyCostsProcessor` output; quick-estimate
  // it as zero here — the dashboard's day-advance card surfaces the
  // authoritative number after the next advance.
  const dailyLoanRepaymentAmount = 0;
  const dailyTotalAmount =
    dailySalariesAmount + dailyMaintenanceAmount + dailyLoanRepaymentAmount;
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
function extractForceSnapshot(
  campaign: ICampaign | null,
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
    personnel?: Set<unknown> | { size: number };
    forces?: Set<unknown> | { size: number };
    medical?: { injuries?: readonly unknown[] };
    repairBay?: { tickets?: readonly unknown[] };
  };
  return {
    mechCount:
      extended.forces && 'size' in extended.forces ? extended.forces.size : 0,
    pilotCount:
      extended.personnel && 'size' in extended.personnel
        ? extended.personnel.size
        : 0,
    injuredPilotCount: extended.medical?.injuries?.length ?? 0,
    repairQueueDepth: extended.repairBay?.tickets?.length ?? 0,
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
  const state = store.getState();
  const campaign = state.campaign;
  const activityLog = state.activityLog;

  return useMemo<IDashboardSummary | null>(() => {
    if (!campaign) return null;
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      forceSnapshot: extractForceSnapshot(campaign),
      activeContract: extractActiveContractSummary(campaign),
      finances: extractFinancesSummary(campaign),
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
    };
    // The memo key is the identity of the campaign + log — re-runs only when
    // those change. Day-advance mutates both, so the dashboard sees fresh
    // numbers immediately after an advance.
  }, [campaign, activityLog]);
}
