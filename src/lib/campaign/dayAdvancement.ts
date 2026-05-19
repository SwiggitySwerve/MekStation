/**
 * Day Advancement - Processes daily campaign progression
 *
 * Handles the passage of one day in the campaign:
 * - Personnel healing (reduce injury days, clear healed injuries)
 * - Contract expiration (check end dates, update statuses)
 * - Daily costs (salaries per person, maintenance per unit)
 *
 * Returns a DayReport summarizing all events that occurred.
 *
 * Based on MekHQ's daily advancement loop, simplified for MVP.
 *
 * # Module layout (decompose refactor)
 *
 * This file is now a thin pipeline coordinator. The individual phase
 * implementations live in co-located sibling modules and are re-exported
 * here so that the public API of `dayAdvancement.ts` is unchanged for all
 * existing importers/tests:
 *
 *   - `dayReportTypes.ts`       — report/event interfaces + cost constants
 *   - `healingProcessing.ts`    — `processHealing` (personnel phase)
 *   - `contractProcessing.ts`   — `processContracts` (missions phase)
 *   - `dailyCostsProcessing.ts` — `processDailyCosts` (finance phase)
 *
 * @module lib/campaign/dayAdvancement
 *
 * # Pipeline Order (Wave 5 / `wire-encounter-to-campaign-round-trip`)
 *
 * The legacy `advanceDay` in this file is a fallback for code paths that
 * don't go through the registry pipeline. The campaign store
 * (`useCampaignStore.advanceDay`) routes through `advanceDayViaPipeline`
 * and the `DayPipelineRegistry`. The canonical order — sorted by each
 * processor's `phase` value — is:
 *
 *   1. healingProcessor            (PERSONNEL = 100)
 *   2. postBattleProcessor         (MISSIONS - 50 = 350)
 *   3. salvageProcessor            (MISSIONS - 25 = 375)
 *   4. repairQueueBuilderProcessor (MISSIONS - 10 = 390)
 *   5. contractProcessor           (MISSIONS = 400)
 *   6. dailyCostsProcessor         (FINANCES = 700)
 *   7. randomEventsProcessor / market processors (EVENTS = 800)
 *
 * The post-battle → salvage → repair → contract chain (#2–#5) is the
 * Wave 5 invariant: each step consumes the previous step's output, and
 * contract closure logic depends on all three battle-effects processors
 * having completed.
 *
 * # PR3 Dependency Map — Processor cross-read audit (task 4.1)
 *
 * Each processor in the `DayPipelineRegistry` pipeline receives the
 * previous processor's output `ICampaign` as its input. The READ side of
 * `campaign.personnel` within each processor operates on the snapshot
 * handed in — no processor reads state that a *prior* processor wrote
 * into `campaign.personnel` for that processor's own read-phase logic.
 * Concretely:
 *
 *   healingProcessor (phase 100)
 *     READ : iterates `campaign.personnel` for wounded entries.
 *     WRITE: returns spread with updated `personnel` map.
 *     DEPENDENCY ON PRIOR: none — first personnel-phase processor.
 *
 *   postBattleProcessor (phase 350)
 *     READ : `campaign.personnel` for pilot XP + wound updates.
 *     WRITE: returns spread with updated `personnel` map.
 *     DEPENDENCY ON PRIOR: reads `campaign.pendingBattleOutcomes` (not
 *       from personnel writes). Healing results in `campaign.personnel`
 *       are incidentally present but the XP/wound logic is additive and
 *       does NOT branch on healing state. Safe to treat as independent.
 *
 *   vocationalTrainingProcessor (phase 800)
 *     READ : `campaign.personnel` for timer + eligibility.
 *     WRITE: returns spread with updated `personnel` map (timers + XP).
 *     DEPENDENCY ON PRIOR: none — eligibility is `ACTIVE` status only,
 *       which healing may have changed (WOUNDED → ACTIVE). This is
 *       intentional and desirable (newly-healed staff earn training).
 *       No dependency on what postBattle wrote.
 *
 *   autoAwardsProcessor (phase 100, same as healing but distinct ID)
 *     READ : `campaign.personnel` for award eligibility.
 *     WRITE: returns spread with updated `personnel` map (awards array).
 *     DEPENDENCY ON PRIOR: none — award checks look at kills/missions
 *       counters, not wound state or XP. Independent of healing.
 *
 *   turnoverProcessor (phase 100)
 *     READ : already reads from `useCampaignRosterStore` + `usePilotStore`
 *       (PR2 complete). No `campaign.personnel` read on the READ side.
 *     WRITE: returns spread with updated `personnel` map (departure status).
 *     DEPENDENCY ON PRIOR: none.
 *
 *   randomEventsProcessor (phase 800)
 *     READ : `campaign.personnel` for entry synthesis (life/prisoner events).
 *     WRITE: does NOT write `campaign.personnel` — returns unchanged campaign.
 *     DEPENDENCY ON PRIOR: none — read is additive event generation only.
 *
 * CONCLUSION: No processor N reads state written into `campaign.personnel`
 * by processor N-1 as a precondition for its own read-phase logic. The
 * atomic repointing in PR3 can pre-build `(entries, pilotsByPilotId)` from
 * stores once per processor's `process()` call without correctness risk.
 * Each processor calls `useCampaignRosterStore.getState().pilots` and
 * `buildPilotLookup(usePilotStore.getState().pilots)` independently, which
 * is consistent with the `turnoverProcessor` pattern proven in PR2.
 */

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { ICampaign } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';

import { processContracts } from './contractProcessing';
import { processDailyCosts } from './dailyCostsProcessing';
import { IDayPipelineResult, IDayEvent } from './dayPipeline';
import {
  DailyCostBreakdown,
  DayReport,
  ExpiredContractEvent,
  HealedPersonEvent,
  TurnoverDepartureEvent,
} from './dayReportTypes';
import { processHealing } from './healingProcessing';
import { asEventDataShape } from './utils/processorHelpers';

// =============================================================================
// Re-exports — preserve the historical public API of this module
// =============================================================================
//
// The phase logic and shared types moved to sibling modules during the
// decompose refactor. These re-exports keep every existing importer
// (`useCampaignStore`, `DayReportPanel`, processors, tests, etc.) working
// against `@/lib/campaign/dayAdvancement` exactly as before.

export {
  DEFAULT_DAILY_SALARY,
  DEFAULT_DAILY_MAINTENANCE,
} from './dayReportTypes';
export type {
  HealedPersonEvent,
  ExpiredContractEvent,
  DailyCostBreakdown,
  TurnoverDepartureEvent,
  DayReport,
} from './dayReportTypes';
export { processHealing } from './healingProcessing';
export { processContracts } from './contractProcessing';
export { processDailyCosts } from './dailyCostsProcessing';

// =============================================================================
// Main Day Advancement
// =============================================================================

/**
 * Advance the campaign by one day.
 *
 * Processes in order:
 * 1. Personnel healing (commits patches to roster store)
 * 2. Contract expiration
 * 3. Daily costs (salaries + maintenance)
 * 4. Advance the date by one day
 *
 * Per PR4 of `wire-iperson-hard-cutover`: roster mutations go through
 * `useCampaignRosterStore.applyPilotPatches`. The returned `DayReport`
 * carries the events; callers read updated roster state from the store.
 *
 * @param campaign - The campaign to advance
 * @returns DayReport with events and updated campaign
 */
export function advanceDay(campaign: ICampaign): DayReport {
  const processedDate = campaign.currentDate;

  // 1. Process healing — read entries from store, commit patches back.
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const healingResult = processHealing(rosterEntries, campaign);
  if (healingResult.patches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(healingResult.patches);
  }

  // 2. Process contracts
  const contractResult = processContracts(campaign);

  // 3. Process daily costs — reads roster store directly for personnel count.
  const campaignWithContracts: ICampaign = {
    ...campaign,
    missions: contractResult.missions,
  };
  const costResult = processDailyCosts(campaignWithContracts);

  // 4. Advance the date by one day
  const nextDate = new Date(processedDate.getTime() + 24 * 60 * 60 * 1000);

  const updatedCampaign: ICampaign = {
    ...campaign,
    currentDate: nextDate,
    missions: contractResult.missions,
    finances: costResult.finances,
    // Carry the loan ledger advanced by `processDailyCosts` (design D4 —
    // `add-campaign-command-ui`) so loan repayment persists.
    loans: costResult.loans,
    updatedAt: new Date().toISOString(),
  } as ICampaign;

  return {
    date: processedDate,
    healedPersonnel: healingResult.events,
    expiredContracts: contractResult.events,
    costs: costResult.costs,
    turnoverDepartures: [],
    campaign: updatedCampaign,
  };
}

// =============================================================================
// Multi-Day Advancement
// =============================================================================

/**
 * Advance the campaign by `count` days, threading each day's output
 * campaign into the next iteration.
 *
 * @param campaign - The campaign to advance
 * @param count - Number of days to advance
 * @returns One DayReport per advanced day, in chronological order
 */
export function advanceDays(campaign: ICampaign, count: number): DayReport[] {
  const reports: DayReport[] = [];
  let currentCampaign = campaign;

  for (let i = 0; i < count; i++) {
    const report = advanceDay(currentCampaign);
    reports.push(report);
    currentCampaign = report.campaign;
  }

  return reports;
}

// =============================================================================
// Pipeline Integration
// =============================================================================

/**
 * Convert a registry `IDayPipelineResult` into the legacy `DayReport`
 * shape consumed by the campaign store and UI panels. Filters the typed
 * event stream into the per-category arrays the report exposes.
 *
 * @param result - The pipeline result emitted by `DayPipelineRegistry`
 * @returns A `DayReport` mirroring the legacy `advanceDay` output shape
 */
export function convertToLegacyDayReport(
  result: IDayPipelineResult,
): DayReport {
  const healedPersonnel: HealedPersonEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'healing')
    .map((e: IDayEvent) => asEventDataShape<HealedPersonEvent>(e.data));

  const expiredContracts: ExpiredContractEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'contract_expired')
    .map((e: IDayEvent) => asEventDataShape<ExpiredContractEvent>(e.data));

  const costEvent = result.events.find(
    (e: IDayEvent) => e.type === 'daily_costs',
  );
  const costs: DailyCostBreakdown = costEvent?.data
    ? asEventDataShape<DailyCostBreakdown>(costEvent.data)
    : {
        salaries: Money.ZERO,
        maintenance: Money.ZERO,
        loanRepayment: Money.ZERO,
        total: Money.ZERO,
        personnelCount: 0,
        unitCount: 0,
      };

  const turnoverDepartures: TurnoverDepartureEvent[] = result.events
    .filter((e: IDayEvent) => e.type === 'turnover_departure')
    .map((e: IDayEvent) => {
      const data = e.data as Record<string, unknown>;
      return {
        personId: data.personId as string,
        personName: data.personName as string,
        departureType: data.departureType as 'retired' | 'deserted',
        roll: data.roll as number,
        targetNumber: data.targetNumber as number,
        payoutAmount: data.payout as number,
        modifiers:
          (data.modifiers as TurnoverDepartureEvent['modifiers']) ?? [],
      };
    });

  return {
    date: result.date,
    healedPersonnel,
    expiredContracts,
    costs,
    turnoverDepartures,
    campaign: result.campaign,
  };
}

/**
 * Run one day through the registry pipeline and adapt the result to the
 * legacy `DayReport` shape. This is the canonical store path; `advanceDay`
 * above is the registry-free fallback.
 *
 * @param campaign - The campaign to advance
 * @param pipeline - An object exposing `processDay` (the day registry)
 * @returns A legacy `DayReport` for the advanced day
 */
export function advanceDayViaPipeline(
  campaign: ICampaign,
  pipeline: { processDay(campaign: ICampaign): IDayPipelineResult },
): DayReport {
  const result = pipeline.processDay(campaign);
  return convertToLegacyDayReport(result);
}
