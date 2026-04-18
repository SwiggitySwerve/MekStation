/**
 * RepairPreviewPanel
 *
 * Renders the Wave 3b `IRepairTicket[]` queue as a preview of the
 * work the campaign tech crew will need to complete. Groups by ticket
 * kind and surfaces the total tech-hours the queue represents.
 *
 * Pure presentational — caller fetches the tickets from the repair
 * queue builder before render.
 *
 * @spec openspec/changes/add-post-battle-review-ui § 7 (Repair Preview Panel)
 * @module components/gameplay/post-battle/RepairPreviewPanel
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardSection } from '@/components/ui/Card';
import {
  type IRepairTicket,
  type RepairTicketKind,
} from '@/types/campaign/RepairTicket';

export interface RepairPreviewPanelProps {
  /** Tickets generated for this match by the repair queue builder. */
  readonly tickets: readonly IRepairTicket[];
}

/**
 * Group tickets by `kind`. Returns insertion-ordered entries so the
 * UI can iterate without sorting.
 */
function groupByKind(
  tickets: readonly IRepairTicket[],
): ReadonlyArray<{ kind: RepairTicketKind; count: number; hours: number }> {
  const map = new Map<
    RepairTicketKind,
    { kind: RepairTicketKind; count: number; hours: number }
  >();
  for (const t of tickets) {
    const existing = map.get(t.kind);
    if (existing) {
      existing.count += 1;
      existing.hours += t.expectedHours;
    } else {
      map.set(t.kind, { kind: t.kind, count: 1, hours: t.expectedHours });
    }
  }
  return Array.from(map.values());
}

function kindBadgeVariant(
  kind: RepairTicketKind,
): 'amber' | 'red' | 'orange' | 'cyan' | 'slate' {
  switch (kind) {
    case 'armor':
      return 'amber';
    case 'structure':
      return 'red';
    case 'component':
      return 'orange';
    case 'ammo':
      return 'cyan';
    case 'heat-recovery':
      return 'slate';
    default:
      return 'slate';
  }
}

function kindLabel(kind: RepairTicketKind): string {
  if (kind === 'heat-recovery') return 'Heat recovery';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function RepairPreviewPanel({
  tickets,
}: RepairPreviewPanelProps): React.ReactElement {
  if (tickets.length === 0) {
    return (
      <Card data-testid="repair-preview-panel">
        <CardSection title="Repair Preview" titleColor="cyan">
          <p
            className="text-text-theme-secondary text-sm"
            data-testid="repair-empty"
          >
            No repairs needed — all units returned in service.
          </p>
        </CardSection>
      </Card>
    );
  }

  const groups = groupByKind(tickets);
  const totalHours = tickets.reduce((sum, t) => sum + t.expectedHours, 0);
  const unmatchedParts = tickets.reduce(
    (sum, t) =>
      sum +
      t.partsRequired
        .filter((p) => !p.matched)
        .reduce((acc, p) => acc + p.quantity, 0),
    0,
  );

  return (
    <Card data-testid="repair-preview-panel">
      <CardSection title="Repair Preview" titleColor="cyan">
        <div className="space-y-3">
          <div
            className="bg-surface-raised/30 flex items-center justify-between rounded-md p-3 text-sm"
            data-testid="repair-totals"
          >
            <div>
              <div className="text-text-theme-secondary text-xs tracking-wider uppercase">
                Tickets queued
              </div>
              <div
                className="text-text-theme-primary font-mono text-lg"
                data-testid="repair-ticket-count"
              >
                {tickets.length}
              </div>
            </div>
            <div className="text-right">
              <div className="text-text-theme-secondary text-xs tracking-wider uppercase">
                Tech-hours
              </div>
              <div
                className="font-mono text-lg text-cyan-400"
                data-testid="repair-total-hours"
              >
                {totalHours}
              </div>
            </div>
          </div>

          {unmatchedParts > 0 ? (
            <div
              className="text-xs text-amber-400"
              data-testid="repair-unmatched-parts"
            >
              {unmatchedParts} part(s) need procurement before work can start.
            </div>
          ) : null}

          <ul className="divide-border-theme-subtle">
            {groups.map((g) => (
              <li
                key={g.kind}
                className="border-border-theme-subtle flex items-center justify-between border-b py-2 last:border-b-0"
                data-testid={`repair-group-${g.kind}`}
              >
                <div className="flex items-center gap-3">
                  <Badge variant={kindBadgeVariant(g.kind)} size="sm">
                    {kindLabel(g.kind)}
                  </Badge>
                  <span className="text-text-theme-secondary text-xs">
                    {g.count} ticket{g.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="text-text-theme-primary font-mono text-sm">
                  {g.hours} h
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardSection>
    </Card>
  );
}

export default RepairPreviewPanel;
