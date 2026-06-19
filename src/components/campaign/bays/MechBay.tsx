/**
 * Mech Bay
 *
 * The roster-wide unit-status grid (CP2a — `add-campaign-bay-ui`,
 * design D2). One row per roster unit showing damage state (readiness),
 * repair-ticket count, and combat-readiness, with a drill-down link to
 * that unit's Repair Bay detail.
 *
 * The Mech Bay owns NO mutation — it is the post-battle hub. It reads the
 * roster projection (`IRosterUnitProjection`, which carries the derived
 * `readiness`) and the repair-bay ticket list.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module components/campaign/bays/MechBay
 */

import Link from 'next/link';
import React from 'react';

import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { CampaignListCard } from '@/components/campaign/CampaignListCard';
import { Badge } from '@/components/ui';

import { BayEmpty } from './BayStates';

// =============================================================================
// Readiness Badge
// =============================================================================

/**
 * Map a roster-unit readiness label onto a `Badge` colour. Mirrors the
 * dashboard's readiness palette so the bay reads consistently.
 */
function readinessClasses(
  readiness: IRosterUnitProjection['readiness'],
): string {
  switch (readiness) {
    case 'Ready':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'Damaged':
      return 'bg-amber-500/20 text-amber-400';
    case 'Destroyed':
    default:
      return 'bg-red-500/20 text-red-400';
  }
}

// =============================================================================
// Row
// =============================================================================

interface MechBayRowProps {
  /** The roster-unit projection for this row. */
  readonly unit: IRosterUnitProjection;
  /** Count of repair-bay tickets targeting this unit. */
  readonly ticketCount: number;
  /** Campaign id — used to build the Repair Bay drill-down link. */
  readonly campaignId: string;
  /**
   * Open the refit launch flow for this unit (CP3 — design D6). When
   * omitted, the Refit affordance is hidden (e.g. in a Storybook fixture
   * without a refit handler wired).
   */
  readonly onLaunchRefit?: (unitId: string) => void;
}

/**
 * One Mech Bay grid row. Shows the unit's damage state and repair-ticket
 * count, drills into the unit's Repair Bay detail, and (CP3) opens the
 * refit launch flow.
 */
export function MechBayRow({
  unit,
  ticketCount,
  campaignId,
  onLaunchRefit,
}: MechBayRowProps): React.ReactElement {
  return (
    <CampaignListCard
      testId={`mech-bay-row-${unit.unitId}`}
      left={
        <>
          <h3 className="text-text-theme-primary truncate text-base font-semibold">
            {unit.unitName}
          </h3>
          <p className="text-text-theme-secondary mt-1 font-mono text-xs">
            {unit.chassisVariant}
          </p>
        </>
      }
      right={
        <div className="flex items-center gap-3">
          <Badge className={readinessClasses(unit.readiness)}>
            {unit.readiness}
          </Badge>

          <span
            className="text-text-theme-secondary text-sm"
            data-testid={`mech-bay-ticket-count-${unit.unitId}`}
          >
            {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
          </span>

          {onLaunchRefit ? (
            <button
              type="button"
              onClick={() => onLaunchRefit(unit.unitId)}
              className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
              data-testid={`mech-bay-refit-${unit.unitId}`}
            >
              Refit
            </button>
          ) : null}

          <Link
            href={`/gameplay/campaigns/${campaignId}/repair-bay?unit=${encodeURIComponent(unit.unitId)}`}
            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
            data-testid={`mech-bay-drilldown-${unit.unitId}`}
          >
            Repair detail →
          </Link>
        </div>
      }
    />
  );
}

// =============================================================================
// Grid
// =============================================================================

export interface MechBayProps {
  /** Roster-unit projections (typically `useCampaignRosterStore.units`). */
  readonly units: readonly IRosterUnitProjection[];
  /** The repair-bay line items from the campaign inventory. */
  readonly repairBay: readonly IRepairBayItem[];
  /** Campaign id — used for drill-down links. */
  readonly campaignId: string;
  /**
   * Open the refit launch flow for a unit (CP3 — design D6). When
   * omitted, the per-row Refit affordance is hidden.
   */
  readonly onLaunchRefit?: (unitId: string) => void;
}

/**
 * The Mech Bay roster-wide unit-status grid. Renders an empty state when
 * the campaign has no roster units (design D7 — empty, not error).
 */
export function MechBay({
  units,
  repairBay,
  campaignId,
  onLaunchRefit,
}: MechBayProps): React.ReactElement {
  if (units.length === 0) {
    return (
      <BayEmpty
        title="No units in the bay"
        message="Add units to this campaign's roster to see their post-battle status here."
      />
    );
  }

  // Pre-count repair tickets per unit so each row is O(1).
  const ticketCountByUnit = new Map<string, number>();
  for (const item of repairBay) {
    ticketCountByUnit.set(
      item.unitId,
      (ticketCountByUnit.get(item.unitId) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-3" data-testid="mech-bay-grid">
      {units.map((unit) => (
        <MechBayRow
          key={unit.unitId}
          unit={unit}
          ticketCount={ticketCountByUnit.get(unit.unitId) ?? 0}
          campaignId={campaignId}
          onLaunchRefit={onLaunchRefit}
        />
      ))}
    </div>
  );
}

export default MechBay;
