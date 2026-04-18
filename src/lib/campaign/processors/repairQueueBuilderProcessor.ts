/**
 * Repair Queue Builder Processor — day-pipeline integration
 *
 * Reads `pendingBattleOutcomes` and per-unit `unitCombatStates` from
 * the campaign (Wave 2 owns persistence of both), runs the pure
 * `buildTicketsFromUnitState` helper for every unit/outcome pair that
 * has not been processed yet, and persists the resulting tickets on
 * `campaign.repairQueue`.
 *
 * Idempotency: tickets carry a deterministic `ticketId` based on the
 * `matchId`, `unitId`, ticket kind, and a per-ticket discriminator. We
 * also track processed `(matchId, unitId)` pairs implicitly by checking
 * existing ticket IDs before insertion.
 *
 * Phase: UNITS — runs alongside maintenance/repair work, after the
 * post-battle processor and the salvage processor (Sub-Branch 3a).
 *
 * @module lib/campaign/processors/repairQueueBuilderProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import {
  DayPhase,
  type IDayEvent,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';
import {
  buildTicketsFromUnitState,
  matchPartsAgainstSalvage,
  type ISalvagePool,
} from '../repair/repairQueueBuilder';

// =============================================================================
// Campaign Extension (Wave 2 / 3a / 3b shared)
// =============================================================================

/**
 * Minimal pending-outcome shape — Wave 1 (combat-outcome-model) owns
 * the canonical ICombatOutcome. We declare only the bits we read so
 * the processor compiles independently.
 */
interface IPendingBattleOutcome {
  readonly matchId: string;
  readonly unitIds: readonly string[];
}

/**
 * Campaign extension fields written by Wave 2 (post-battle processor),
 * Sub-Branch 3a (salvage), and Sub-Branch 3b (this branch).
 *
 * All fields are optional so existing ICampaign consumers are
 * unaffected. The processor narrows when it reads.
 */
export interface ICampaignWithBattleState extends ICampaign {
  readonly pendingBattleOutcomes?: readonly IPendingBattleOutcome[];
  readonly processedBattleIds?: readonly string[];
  readonly unitCombatStates?: Record<string, IUnitCombatState>;
  readonly unitMaxStates?: Record<string, IUnitMaxState>;
  readonly salvagePool?: ISalvagePool;
  readonly repairQueue?: readonly IRepairTicket[];
}

// =============================================================================
// Processor Implementation
// =============================================================================

/**
 * Build a Set of existing ticket IDs for fast idempotency lookup.
 */
function existingTicketIds(
  campaign: ICampaignWithBattleState,
): ReadonlySet<string> {
  const queue = campaign.repairQueue ?? [];
  return new Set(queue.map((t) => t.ticketId));
}

/**
 * Process one outcome × unit combination. Returns 0 or more new tickets.
 * Skips tickets whose IDs already exist in the queue (idempotent).
 */
function processOutcomeUnit(
  campaign: ICampaignWithBattleState,
  outcome: IPendingBattleOutcome,
  unitId: string,
  alreadyQueued: ReadonlySet<string>,
  createdAt: string,
): readonly IRepairTicket[] {
  const state = campaign.unitCombatStates?.[unitId];
  const maxState = campaign.unitMaxStates?.[unitId];

  // Without both current state and max-state we cannot diff — skip.
  if (!state || !maxState) return [];

  const tickets = buildTicketsFromUnitState({
    state,
    maxState,
    matchId: outcome.matchId,
    createdAt,
  });

  // Apply parts matching against salvage pool, then drop dupes.
  const matchedTickets = tickets.map((t) =>
    matchPartsAgainstSalvage(t, campaign.salvagePool),
  );

  return matchedTickets.filter((t) => !alreadyQueued.has(t.ticketId));
}

/**
 * Day-pipeline processor: walks all pending outcomes, generates
 * tickets per unit, and appends them to `campaign.repairQueue`.
 *
 * Runs in DayPhase.UNITS (alongside repair/maintenance work). Wave 5
 * (final integration) may re-order relative to other Wave 2/3a/3b
 * processors — this processor is order-tolerant as long as
 * `unitCombatStates` and (optionally) `salvagePool` are populated by
 * the time it runs.
 */
export const repairQueueBuilderProcessor: IDayProcessor = {
  id: 'repair-queue-builder',
  phase: DayPhase.UNITS,
  displayName: 'Repair Queue Builder',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    // Narrow to extended campaign (all extension fields are optional).
    const extended = campaign as ICampaignWithBattleState;
    const outcomes = extended.pendingBattleOutcomes ?? [];

    // Fast exit when there's nothing to do.
    if (outcomes.length === 0) {
      return { events: [], campaign };
    }

    const alreadyQueued = existingTicketIds(extended);
    const createdAt = date.toISOString();

    const newTickets: IRepairTicket[] = [];
    const events: IDayEvent[] = [];

    for (const outcome of outcomes) {
      let perOutcomeCount = 0;
      for (const unitId of outcome.unitIds) {
        const ticketsForUnit = processOutcomeUnit(
          extended,
          outcome,
          unitId,
          alreadyQueued,
          createdAt,
        );
        perOutcomeCount += ticketsForUnit.length;
        for (const ticket of ticketsForUnit) {
          newTickets.push(ticket);
        }
      }

      if (perOutcomeCount > 0) {
        events.push({
          type: 'repair-tickets-created',
          description: `Generated ${perOutcomeCount} repair ticket(s) from match ${outcome.matchId}`,
          severity: 'info',
          data: {
            matchId: outcome.matchId,
            ticketCount: perOutcomeCount,
          },
        });
      }
    }

    // No new tickets — return campaign unchanged so reference equality
    // holds for downstream processors.
    if (newTickets.length === 0) {
      return { events, campaign };
    }

    const existingQueue = extended.repairQueue ?? [];
    const updatedCampaign: ICampaignWithBattleState = {
      ...extended,
      repairQueue: [...existingQueue, ...newTickets],
    };

    return { events, campaign: updatedCampaign };
  },
};
