/**
 * Repair Bay
 *
 * The repair-ticket queue (CP2a — `add-campaign-bay-ui`, design D3).
 * Renders `ICampaignInventory.repairBay` grouped by unit; each ticket
 * shows its kind, location, expected hours, parts-ready flag, and status.
 *
 * The one mutation is priority reorder — the player moves a ticket up or
 * down within its unit group, which writes a `priority` ordinal onto the
 * campaign's `repairQueue` tickets via `reorderRepairTicketPriority`. The
 * displayed `expectedHours` and `partsReady` are read-only projections.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module components/campaign/bays/RepairBay
 */

import React from 'react';

import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';

import { Badge, Card } from '@/components/ui';
import { groupRepairBayByUnit } from '@/stores/campaign/campaignBaySelectors';

import { BayEmpty } from './BayStates';

// =============================================================================
// Ticket Status / Kind Badges
// =============================================================================

/** Map a repair-ticket status onto a `Badge` colour. */
function statusClasses(status: IRepairBayItem['status']): string {
  switch (status) {
    case 'done':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'in-progress':
      return 'bg-blue-500/20 text-blue-400';
    case 'parts-needed':
      return 'bg-red-500/20 text-red-400';
    case 'queued':
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
}

// =============================================================================
// Ticket Row
// =============================================================================

interface RepairTicketRowProps {
  /** The repair-bay line item. */
  readonly ticket: IRepairBayItem;
  /** True when this is the first ticket in its unit group. */
  readonly isFirst: boolean;
  /** True when this is the last ticket in its unit group. */
  readonly isLast: boolean;
  /** Move this ticket one step earlier in its unit's repair order. */
  readonly onMoveUp: () => void;
  /** Move this ticket one step later in its unit's repair order. */
  readonly onMoveDown: () => void;
}

/**
 * One repair ticket. The kind / location / expected-hours / parts-ready
 * fields are read-only projections; the up/down controls are the only
 * mutation (priority reorder, design D3).
 */
export function RepairTicketRow({
  ticket,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: RepairTicketRowProps): React.ReactElement {
  return (
    <Card className="p-3" data-testid={`repair-ticket-${ticket.ticketId}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-accent/20 text-accent">{ticket.kind}</Badge>
          {ticket.location && (
            <span className="text-text-theme-secondary font-mono text-xs">
              {ticket.location}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span
            className="text-text-theme-secondary"
            data-testid={`repair-ticket-hours-${ticket.ticketId}`}
          >
            {ticket.expectedHours}h
          </span>

          <span
            className={
              ticket.partsReady ? 'text-emerald-400' : 'text-amber-400'
            }
            data-testid={`repair-ticket-parts-${ticket.ticketId}`}
          >
            {ticket.partsReady ? 'Parts ready' : 'Parts needed'}
          </span>

          <Badge className={statusClasses(ticket.status)}>
            {ticket.status}
          </Badge>

          {/* Priority reorder controls — the only mutation (design D3). */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label="Raise repair priority"
              className="text-text-theme-secondary hover:text-text-theme-primary disabled:cursor-not-allowed disabled:opacity-30"
              data-testid={`repair-ticket-up-${ticket.ticketId}`}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label="Lower repair priority"
              className="text-text-theme-secondary hover:text-text-theme-primary disabled:cursor-not-allowed disabled:opacity-30"
              data-testid={`repair-ticket-down-${ticket.ticketId}`}
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Unit Group
// =============================================================================

interface RepairUnitGroupProps {
  /** The unit id heading this group. */
  readonly unitId: string;
  /** The tickets for this unit, in current work order. */
  readonly tickets: readonly IRepairBayItem[];
  /**
   * Reorder callback — receives the full post-move ticket-id order for
   * this unit group.
   */
  readonly onReorder: (orderedTicketIds: readonly string[]) => void;
}

/**
 * One unit's repair-ticket group. Reorder swaps adjacent tickets and
 * hands the full new order up to the page, which persists it.
 */
export function RepairUnitGroup({
  unitId,
  tickets,
  onReorder,
}: RepairUnitGroupProps): React.ReactElement {
  /** Swap the tickets at `index` and `index + delta`, then persist. */
  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= tickets.length) return;
    const next = [...tickets];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onReorder(next.map((t) => t.ticketId));
  };

  return (
    <div className="space-y-2" data-testid={`repair-unit-group-${unitId}`}>
      <h3 className="text-text-theme-primary text-sm font-semibold">
        {unitId}
        <span className="text-text-theme-muted ml-2 text-xs font-normal">
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        </span>
      </h3>
      {tickets.map((ticket, index) => (
        <RepairTicketRow
          key={ticket.ticketId}
          ticket={ticket}
          isFirst={index === 0}
          isLast={index === tickets.length - 1}
          onMoveUp={() => move(index, -1)}
          onMoveDown={() => move(index, 1)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Repair Bay
// =============================================================================

export interface RepairBayProps {
  /** The repair-bay line items from the campaign inventory. */
  readonly repairBay: readonly IRepairBayItem[];
  /**
   * Persist a reorder — receives the new ticket-id order for one unit
   * group. The page wires this to `reorderRepairTicketPriority`.
   */
  readonly onReorder: (orderedTicketIds: readonly string[]) => void;
  /**
   * Optional unit id to highlight first — set when the player drilled
   * in from the Mech Bay (`?unit=` query param).
   */
  readonly focusUnitId?: string;
}

/**
 * The Repair Bay page body — the ticket queue grouped by unit, with a
 * per-ticket priority-reorder action. Renders an empty state when there
 * are no tickets (design D7 — empty, not error).
 */
export function RepairBay({
  repairBay,
  onReorder,
  focusUnitId,
}: RepairBayProps): React.ReactElement {
  if (repairBay.length === 0) {
    return (
      <BayEmpty
        title="No repair tickets"
        message="Repair tickets appear here after a battle damages a unit."
      />
    );
  }

  const grouped = groupRepairBayByUnit(repairBay);
  // Order unit groups: the focused unit (from a Mech Bay drill-down)
  // first, then the rest in insertion order.
  const unitIds = Array.from(grouped.keys()).sort((a, b) => {
    if (a === focusUnitId) return -1;
    if (b === focusUnitId) return 1;
    return 0;
  });

  return (
    <div className="space-y-6" data-testid="repair-bay-queue">
      {unitIds.map((unitId) => (
        <RepairUnitGroup
          key={unitId}
          unitId={unitId}
          tickets={grouped.get(unitId) ?? []}
          onReorder={onReorder}
        />
      ))}
    </div>
  );
}

export default RepairBay;
