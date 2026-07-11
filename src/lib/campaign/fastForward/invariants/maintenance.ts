/**
 * Maintenance and repair invariants for the headless campaign
 * fast-forward suites (spec "Maintenance and Repair Invariants Across a
 * Fast-Forwarded Run").
 *
 * @module lib/campaign/fastForward/invariants/maintenance
 */

import type { IPartsInventory } from '@/types/campaign/PartsInventory';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

// =============================================================================
// (a) Daily repair-hours budget
// =============================================================================

/**
 * Mirrors `DEFAULT_DAILY_REPAIR_HOURS` (`repairProgressProcessor.ts:21`)
 * — that constant is module-private and NOT exported. Duplicated here
 * rather than requesting an additive export: the one sanctioned
 * production touch this change carries is the D9 pilot-attribution fix
 * (task 3.2), and an export-only change to `repairProgressProcessor.ts`
 * is out of group 4's task text.
 */
const DAILY_REPAIR_HOURS_BUDGET = 8;

/** A ticket's remaining work — completed/cancelled tickets have none; untouched tickets default to `expectedHours`. */
function ticketRemainingHours(ticket: IRepairTicket): number {
  if (ticket.status === 'completed' || ticket.status === 'cancelled') return 0;
  return ticket.remainingHours ?? ticket.expectedHours;
}

/**
 * Assert the total repair-hours progress applied across one day never
 * exceeds the daily budget (spec scenario: "Daily repair hours stay
 * bounded"). Computed by diffing each ticket's remaining-hours between
 * a before/after queue snapshot for the same day — `repairProgress
 * Processor` decrements `remainingHours` by exactly the hours it spends
 * on a ticket (`repairProgressProcessor.ts:70-72`), so the sum of
 * positive remaining-hours deltas IS the day's applied hours. Tickets
 * newly created that day (no `before` match) contribute nothing —
 * they cannot have received progress before existing.
 *
 * @param beforeQueue - `campaign.repairQueue` before the day's repair-progress pass
 * @param afterQueue - `campaign.repairQueue` after the same pass
 * @param dailyBudget - override for a non-default budget fixture; defaults to `DAILY_REPAIR_HOURS_BUDGET`
 */
export function assertDailyRepairHoursBounded(
  beforeQueue: readonly IRepairTicket[],
  afterQueue: readonly IRepairTicket[],
  dailyBudget: number = DAILY_REPAIR_HOURS_BUDGET,
): void {
  const beforeByTicket = new Map(beforeQueue.map((t) => [t.ticketId, t]));
  let hoursApplied = 0;
  for (const after of afterQueue) {
    const before = beforeByTicket.get(after.ticketId);
    if (!before) continue;
    const delta = ticketRemainingHours(before) - ticketRemainingHours(after);
    if (delta > 0) hoursApplied += delta;
  }
  // Floating-point tolerance: hours are computed from Math.min chains
  // over plain numbers, not Money cents — a tiny epsilon avoids a false
  // trip on an exact-budget day (8.0000000000001).
  if (hoursApplied > dailyBudget + 1e-9) {
    throw new Error(
      `assertDailyRepairHoursBounded: ${hoursApplied} repair-hour(s) applied this day exceeds the daily budget of ${dailyBudget}.`,
    );
  }
}

// =============================================================================
// (b) Repairs never exceed unit max-state caps
// =============================================================================

/**
 * Assert no unit's current armor, structure, or ammo exceeds its
 * declared maximum (spec scenario: "Repairs never exceed unit caps").
 * A unit with no `unitMaxStates` entry is skipped — nothing to cap
 * against.
 */
export function assertRepairsWithinMaxCaps(
  unitCombatStates: Readonly<Record<string, IUnitCombatState>>,
  unitMaxStates: Readonly<Record<string, IUnitMaxState>>,
): void {
  for (const [unitId, state] of Object.entries(unitCombatStates)) {
    const maxState = unitMaxStates[unitId];
    if (!maxState) continue;

    for (const [location, value] of Object.entries(
      state.currentArmorPerLocation,
    )) {
      const max = maxState.maxArmorPerLocation[location];
      if (max !== undefined && value > max) {
        throw new Error(
          `assertRepairsWithinMaxCaps: unit ${unitId} location ${location} armor ${value} exceeds max ${max}.`,
        );
      }
    }
    for (const [location, value] of Object.entries(
      state.currentStructurePerLocation,
    )) {
      const max = maxState.maxStructurePerLocation[location];
      if (max !== undefined && value > max) {
        throw new Error(
          `assertRepairsWithinMaxCaps: unit ${unitId} location ${location} structure ${value} exceeds max ${max}.`,
        );
      }
    }
    for (const [binId, value] of Object.entries(state.ammoRemaining)) {
      const max = maxState.maxAmmoPerBin[binId];
      if (max !== undefined && value > max) {
        throw new Error(
          `assertRepairsWithinMaxCaps: unit ${unitId} ammo bin ${binId} rounds ${value} exceeds max ${max}.`,
        );
      }
    }
  }
}

// =============================================================================
// (c) Ticket / parts idempotency across a day re-run
// =============================================================================

/**
 * Assert no repair ticket id appears more than once in the queue (spec
 * scenario: "Ticket processing is idempotent across re-runs" — the
 * structural half). `repairQueueBuilderProcessor` computes deterministic
 * `ticketId`s and checks `existingTicketIds` before appending
 * (`repairQueueBuilderProcessor.ts:78-84,101`); a duplicate id means
 * that guard was bypassed.
 */
export function assertNoDuplicateRepairTickets(
  repairQueue: readonly IRepairTicket[],
): void {
  const counts = new Map<string, number>();
  for (const ticket of repairQueue) {
    counts.set(ticket.ticketId, (counts.get(ticket.ticketId) ?? 0) + 1);
  }
  const duplicates = Array.from(counts.entries()).filter(
    ([, count]) => count > 1,
  );
  if (duplicates.length > 0) {
    throw new Error(
      `assertNoDuplicateRepairTickets: ${duplicates.length} repair ticket id(s) appear more than once in campaign.repairQueue: ${duplicates
        .map(([id, count]) => `${id} (x${count})`)
        .join(', ')}.`,
    );
  }
}

/** Total quantity of a part id across every inventory lot. */
function totalPartQuantity(inventory: IPartsInventory, partId: string): number {
  return inventory
    .filter((item) => item.partId === partId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Assert re-processing an already-processed repair queue/state (same
 * outcome, same day) consumed no additional parts and produced no
 * ticket/state drift (spec scenario: "Ticket processing is idempotent
 * across re-runs" — the parts-consumption half). `repairProgress
 * Processor` skips `completed`/`cancelled` tickets before any parts
 * consumption or hour deduction runs (`repairProgressProcessor.ts:50-52`),
 * so re-running it against an already-processed queue/inventory pair
 * MUST be a no-op; this asserts that observably.
 *
 * @param before - `{ repairQueue, partsInventory }` after the first pass
 * @param after - the same shape after re-running the SAME pass again
 */
export function assertRepairQueueIdempotentAcrossRerun(
  before: {
    readonly repairQueue: readonly IRepairTicket[];
    readonly partsInventory: IPartsInventory;
  },
  after: {
    readonly repairQueue: readonly IRepairTicket[];
    readonly partsInventory: IPartsInventory;
  },
): void {
  const beforeByTicket = new Map(
    before.repairQueue.map((t) => [t.ticketId, t]),
  );
  for (const afterTicket of after.repairQueue) {
    const beforeTicket = beforeByTicket.get(afterTicket.ticketId);
    if (!beforeTicket) {
      throw new Error(
        `assertRepairQueueIdempotentAcrossRerun: ticket ${afterTicket.ticketId} appeared on the re-run that was not present before it — re-running the same pass must not create new tickets.`,
      );
    }
    if (
      beforeTicket.status !== afterTicket.status ||
      ticketRemainingHours(beforeTicket) !== ticketRemainingHours(afterTicket)
    ) {
      throw new Error(
        `assertRepairQueueIdempotentAcrossRerun: ticket ${afterTicket.ticketId} changed on re-run — status ${beforeTicket.status}->${afterTicket.status}, remainingHours ${ticketRemainingHours(beforeTicket)}->${ticketRemainingHours(afterTicket)}.`,
      );
    }
  }

  const partIds = Array.from(
    new Set([
      ...before.partsInventory.map((item) => item.partId),
      ...after.partsInventory.map((item) => item.partId),
    ]),
  );
  for (const partId of partIds) {
    const beforeQty = totalPartQuantity(before.partsInventory, partId);
    const afterQty = totalPartQuantity(after.partsInventory, partId);
    if (beforeQty !== afterQty) {
      throw new Error(
        `assertRepairQueueIdempotentAcrossRerun: part ${partId} quantity changed on re-run (${beforeQty} -> ${afterQty}) — an already-completed ticket's parts were consumed again.`,
      );
    }
  }
}
