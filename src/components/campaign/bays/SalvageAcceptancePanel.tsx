/**
 * Salvage Acceptance Panel
 *
 * The salvage-candidate list with per-item accept / decline actions and a
 * running mercenary-share value total (CP2a — `add-campaign-bay-ui`,
 * design D5).
 *
 * Accepting / declining flips the item's `status` (`pending → accepted |
 * declined`) on the campaign's `salvageAllocations` state. The running
 * value total is a PURE projection over item `status` — it is the sum of
 * `recoveredValue` across `accepted` items, so declining an item drops it
 * from the total with no incremental accumulator that could double-count.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module components/campaign/bays/SalvageAcceptancePanel
 */

import React from 'react';

import type { ISalvageBayItem } from '@/types/campaign/CampaignInventory';

import { CampaignListCard } from '@/components/campaign/CampaignListCard';
import { Badge, Card } from '@/components/ui';
import { type SalvageDecision } from '@/stores/campaign/campaignBayActions';
import { computeAcceptedSalvageValue } from '@/stores/campaign/campaignBaySelectors';

import { BayEmpty } from './BayStates';

// =============================================================================
// Formatting
// =============================================================================

/** Format a C-Bills figure for display. */
function formatCBills(value: number): string {
  return `${value.toLocaleString('en-US')} C-Bills`;
}

/** Map a salvage-item status onto a `Badge` colour. */
function statusClasses(status: ISalvageBayItem['status']): string {
  switch (status) {
    case 'accepted':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'declined':
      return 'bg-red-500/20 text-red-400';
    case 'pending':
    default:
      return 'bg-amber-500/20 text-amber-400';
  }
}

// =============================================================================
// Salvage Row
// =============================================================================

interface SalvageRowProps {
  /** The salvage-bay line item. */
  readonly item: ISalvageBayItem;
  /** Record an accept/decline decision for this item. */
  readonly onDecide: (partId: string, decision: SalvageDecision) => void;
}

/**
 * One Salvage Acceptance row. Shows the recovered value and disposition,
 * and exposes accept / decline actions.
 */
export function SalvageRow({
  item,
  onDecide,
}: SalvageRowProps): React.ReactElement {
  return (
    <CampaignListCard
      testId={`salvage-row-${item.partId}`}
      left={
        <>
          <h3 className="text-text-theme-primary truncate text-base font-semibold">
            {item.designation}
          </h3>
          <p className="text-text-theme-secondary mt-1 text-xs">
            from <span className="font-mono">{item.sourceUnitId}</span> ·{' '}
            <span data-testid={`salvage-value-${item.partId}`}>
              {formatCBills(item.recoveredValue)}
            </span>{' '}
            · {item.disposition} share
          </p>
        </>
      }
      right={
        <div className="flex items-center gap-3">
          <Badge className={statusClasses(item.status)}>{item.status}</Badge>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDecide(item.partId, 'accepted')}
              disabled={item.status === 'accepted'}
              className="rounded bg-emerald-600/80 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              data-testid={`salvage-accept-${item.partId}`}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onDecide(item.partId, 'declined')}
              disabled={item.status === 'declined'}
              className="bg-surface-raised hover:bg-border-theme text-text-theme-primary rounded px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              data-testid={`salvage-decline-${item.partId}`}
            >
              Decline
            </button>
          </div>
        </div>
      }
    />
  );
}

// =============================================================================
// Salvage Acceptance Panel
// =============================================================================

export interface SalvageAcceptancePanelProps {
  /** The salvage-bay line items from the campaign inventory. */
  readonly salvageBay: readonly ISalvageBayItem[];
  /**
   * Record an accept/decline decision. The page wires this to
   * `setSalvageItemStatus`.
   */
  readonly onDecide: (partId: string, decision: SalvageDecision) => void;
}

/**
 * The Salvage Acceptance panel body — the salvage-candidate list with
 * accept/decline actions and a running mercenary-share value total.
 * Renders an empty state when there are no candidates (design D7 —
 * empty, not error).
 */
export function SalvageAcceptancePanel({
  salvageBay,
  onDecide,
}: SalvageAcceptancePanelProps): React.ReactElement {
  if (salvageBay.length === 0) {
    return (
      <BayEmpty
        title="No salvage to review"
        message="Salvage candidates appear here after a contract battle is resolved."
      />
    );
  }

  // The running total is a pure projection over item status — only
  // `accepted` items contribute (design D5).
  const acceptedTotal = computeAcceptedSalvageValue(salvageBay);
  const acceptedCount = salvageBay.filter(
    (item) => item.status === 'accepted',
  ).length;

  return (
    <div className="space-y-4" data-testid="salvage-panel">
      {/* Running mercenary-share value total. */}
      <Card className="p-4" data-testid="salvage-value-total">
        <div className="flex items-center justify-between">
          <span className="text-text-theme-secondary text-sm">
            Accepted salvage value ({acceptedCount} of {salvageBay.length})
          </span>
          <span className="text-accent font-mono text-lg font-semibold">
            {formatCBills(acceptedTotal)}
          </span>
        </div>
      </Card>

      <div className="space-y-3">
        {salvageBay.map((item) => (
          <SalvageRow key={item.partId} item={item} onDecide={onDecide} />
        ))}
      </div>
    </div>
  );
}

export default SalvageAcceptancePanel;
