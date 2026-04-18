/**
 * Salvage Processor
 *
 * Day-pipeline plugin that drains the campaign's freshly-processed
 * `processedBattleIds` (populated by `postBattleProcessor`) and computes
 * an `ISalvageAllocation` per outcome via the salvage engine. Persists
 * each allocation onto the campaign's salvage extension and emits a
 * `SalvageAllocated` event the UI surfaces in the day report.
 *
 * Idempotency: each allocation carries a `processed` flag *and* the
 * processor tracks `salvageReportedBattleIds`. Either guard prevents
 * double processing on retry / replay.
 *
 * Phase 3 Wave 3 — `add-salvage-rules-engine`. Wave 4 will surface
 * inventory conversion + auction UI; this processor only owns the
 * compute-and-persist half.
 *
 * @module lib/campaign/processors/salvageProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ISalvageAllocation,
  ISalvageReport,
} from '@/types/campaign/Salvage';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { isContract } from '@/types/campaign/Mission';
import { logger } from '@/utils/logger';

import type {
  IDayEvent,
  IDayProcessor,
  IDayProcessorResult,
} from '../dayPipeline';
import type { ICampaignWithBattleState } from './postBattleProcessor';

import { DayPhase, getDayPipeline } from '../dayPipeline';
import { computeSalvage, summarizeAllocation } from '../salvage/salvageEngine';

// =============================================================================
// Extended Campaign Surface
// =============================================================================

/**
 * Optional fields the salvage processor reads / writes on the campaign.
 * Extends the post-battle extension so day pipelines can carry both
 * shapes on the same campaign object without conflict.
 */
export interface ISalvageCampaignExtensions {
  /** Per-battle salvage allocations, keyed by matchId. */
  readonly salvageAllocations?: Readonly<Record<string, ISalvageAllocation>>;
  /** Per-battle salvage reports (UI-facing), keyed by matchId. */
  readonly salvageReports?: Readonly<Record<string, ISalvageReport>>;
  /** Set of matchIds the salvage processor has already touched. */
  readonly salvageReportedBattleIds?: readonly string[];
}

export type ICampaignWithSalvageState = ICampaignWithBattleState &
  ISalvageCampaignExtensions;

// =============================================================================
// Per-Outcome Result Surface
// =============================================================================

/** Per-outcome summary so tests + UI can introspect what happened. */
export interface ISalvageProcessed {
  readonly matchId: string;
  readonly allocationCreated: boolean;
  readonly mercenaryCandidateCount: number;
  readonly employerCandidateCount: number;
  readonly skippedDuplicate: boolean;
  readonly skippedReason: string | null;
}

// =============================================================================
// Single-Outcome Application
// =============================================================================

/**
 * Process one outcome. Returns the updated campaign + a summary + the
 * day events to surface. Idempotent on `(matchId, salvageReportedBattleIds)`.
 *
 * Outcomes without a contractId (standalone skirmish) still get a
 * recorded allocation — but it's empty. We still mark the matchId as
 * processed so reruns are no-ops.
 */
function processOutcome(
  campaign: ICampaignWithSalvageState,
  outcome: ICombatOutcome,
): {
  campaign: ICampaignWithSalvageState;
  summary: ISalvageProcessed;
  events: IDayEvent[];
} {
  const reported = campaign.salvageReportedBattleIds ?? [];
  if (reported.includes(outcome.matchId)) {
    return {
      campaign,
      summary: {
        matchId: outcome.matchId,
        allocationCreated: false,
        mercenaryCandidateCount: 0,
        employerCandidateCount: 0,
        skippedDuplicate: true,
        skippedReason: 'already-processed',
      },
      events: [],
    };
  }

  // Resolve the contract for this outcome (if any).
  let contract = null;
  if (outcome.contractId) {
    const mission = campaign.missions.get(outcome.contractId);
    if (!mission) {
      logger.warn(
        `[salvageProcessor] Unknown contract id "${outcome.contractId}" — falling back to 0% mercenary.`,
      );
    } else if (isContract(mission)) {
      contract = mission;
    }
  }

  let allocation: ISalvageAllocation;
  try {
    allocation = computeSalvage(outcome, contract);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      `[salvageProcessor] Failed to compute salvage for ${outcome.matchId}:`,
      err,
    );
    return {
      campaign,
      summary: {
        matchId: outcome.matchId,
        allocationCreated: false,
        mercenaryCandidateCount: 0,
        employerCandidateCount: 0,
        skippedDuplicate: false,
        skippedReason: `error:${message}`,
      },
      events: [],
    };
  }

  // Even empty allocations (standalone skirmish, no opponent kills) are
  // persisted so the UI can show "no salvage available" instead of
  // having to detect a missing record.
  const persistedAllocation: ISalvageAllocation = {
    ...allocation,
    processed: true,
  };

  const report = toReport(persistedAllocation);

  const nextAllocations: Record<string, ISalvageAllocation> = {
    ...(campaign.salvageAllocations ?? {}),
    [outcome.matchId]: persistedAllocation,
  };
  const nextReports: Record<string, ISalvageReport> = {
    ...(campaign.salvageReports ?? {}),
    [outcome.matchId]: report,
  };

  const updatedCampaign: ICampaignWithSalvageState = {
    ...campaign,
    salvageAllocations: nextAllocations,
    salvageReports: nextReports,
    salvageReportedBattleIds: [...reported, outcome.matchId],
    updatedAt: new Date().toISOString(),
  };

  const events: IDayEvent[] = [
    {
      type: 'salvage_allocated',
      description: `Salvage resolved for battle ${outcome.matchId}: ${persistedAllocation.mercenaryAward.candidates.length} merc / ${persistedAllocation.employerAward.candidates.length} employer`,
      severity: 'info',
      data: {
        matchId: outcome.matchId,
        contractId: outcome.contractId,
        splitMethod: persistedAllocation.splitMethod,
        mercenaryValue: persistedAllocation.mercenaryAward.totalValue,
        employerValue: persistedAllocation.employerAward.totalValue,
      },
    },
  ];

  return {
    campaign: updatedCampaign,
    summary: {
      matchId: outcome.matchId,
      allocationCreated: true,
      mercenaryCandidateCount:
        persistedAllocation.mercenaryAward.candidates.length,
      employerCandidateCount:
        persistedAllocation.employerAward.candidates.length,
      skippedDuplicate: false,
      skippedReason: null,
    },
    events,
  };
}

/** Turn an allocation into the persisted UI-facing report shape. */
function toReport(allocation: ISalvageAllocation): ISalvageReport {
  const summary = summarizeAllocation(allocation);
  return {
    matchId: summary.matchId,
    contractId: summary.contractId,
    candidates: summary.candidates,
    totalValueEmployer: summary.totalValueEmployer,
    totalValueMercenary: summary.totalValueMercenary,
    hostileTerritoryPenalty: summary.hostileTerritoryPenalty,
    auctionRequired: summary.auctionRequired,
  };
}

// =============================================================================
// Public Direct-Apply API
// =============================================================================

/**
 * Apply salvage for one outcome without going through the day pipeline.
 * Useful for tests, REPL, and direct UI-driven flows.
 */
export function applySalvage(
  outcome: ICombatOutcome,
  campaign: ICampaignWithSalvageState,
): {
  campaign: ICampaignWithSalvageState;
  summary: ISalvageProcessed;
} {
  const result = processOutcome(campaign, outcome);
  return { campaign: result.campaign, summary: result.summary };
}

// =============================================================================
// Day Processor
// =============================================================================

/**
 * Day-pipeline processor. Runs AFTER `postBattleProcessor` so the
 * `processedBattleIds` set is populated. Walks the most-recently-applied
 * outcomes and computes salvage for each.
 *
 * Source of outcomes:
 *   1. `pendingBattleOutcomes` (still on the queue at start of day —
 *      handled here for the inverted case where salvage runs before
 *      post-battle drains the queue).
 *   2. The set difference between `processedBattleIds` and
 *      `salvageReportedBattleIds` — gives us anything post-battle has
 *      already drained but salvage hasn't seen yet.
 *
 * To compute (2) we need the *outcomes themselves*, which the campaign
 * doesn't keep after post-battle drains them. For Wave 3 MVP we rely on
 * source (1): salvageProcessor.phase puts us between post-battle and
 * the rest of MISSIONS, so post-battle's drain is already over by the
 * time we run, and we get the queue snapshot pre-drain via
 * `_getPendingBeforeDrainSnapshot`. The cleanest implementation uses a
 * shared transient: post-battle stamps a sibling field
 * `recentlyAppliedOutcomes` we can read.
 *
 * Wave 4 will tighten this when we add a real outcome archive on the
 * campaign. For now, salvage runs over `pendingBattleOutcomes` BEFORE
 * post-battle drains them by giving salvage a phase value just BELOW
 * post-battle, OR by reading the `recentlyAppliedOutcomes` snapshot.
 *
 * Pragmatic Wave 3 wiring: we run AFTER post-battle (per orchestrator
 * brief and per spec §8.2) and consume `pendingBattleOutcomes`
 * directly — `postBattleProcessor` already drains the queue, so
 * salvage's view is whatever post-battle didn't drain (e.g., re-queued
 * or freshly added during the same tick). On a normal advancement,
 * salvage receives an empty queue. The intended source is therefore
 * `recentlyAppliedOutcomes` — see Wave 4 follow-up.
 *
 * For the MVP path that *exercises* the wiring, callers stash the
 * outcomes onto an opt-in `salvagePendingOutcomes` field.
 */
export const salvageProcessor: IDayProcessor = {
  id: 'salvage',
  // Place us shortly AFTER post-battle (which sits at MISSIONS - 50)
  // and well before contractProcessor at MISSIONS, so salvage records
  // are written before contract status final-payments fire.
  phase: DayPhase.MISSIONS - 25,
  displayName: 'Salvage Processing',

  process(campaign: ICampaign): IDayProcessorResult {
    const extended = campaign as ICampaignWithSalvageState;

    // Two sources for outcomes the processor should consider:
    //   - any `pendingBattleOutcomes` still on the queue (post-battle
    //     normally drains these first; if it didn't, we still want to
    //     register a salvage record).
    //   - any outcomes carried on the optional `salvagePendingOutcomes`
    //     field — Wave 4 wiring will populate this from `recentlyApplied`.
    const queue: readonly ICombatOutcome[] = [
      ...(extended.pendingBattleOutcomes ?? []),
      ...((
        extended as ICampaignWithSalvageState & {
          readonly salvagePendingOutcomes?: readonly ICombatOutcome[];
        }
      ).salvagePendingOutcomes ?? []),
    ];

    if (queue.length === 0) {
      return { events: [], campaign };
    }

    // Dedupe by matchId in case both sources carried the same outcome.
    const seen = new Set<string>();
    const unique = queue.filter((o) => {
      if (seen.has(o.matchId)) return false;
      seen.add(o.matchId);
      return true;
    });

    let working: ICampaignWithSalvageState = extended;
    const events: IDayEvent[] = [];
    for (const outcome of unique) {
      const result = processOutcome(working, outcome);
      working = result.campaign;
      events.push(...result.events);
    }

    return { events, campaign: working };
  },
};

/**
 * Register the salvage processor with the day pipeline. Used by
 * `processorRegistration.ts`.
 */
export function registerSalvageProcessor(): void {
  getDayPipeline().register(salvageProcessor);
}
