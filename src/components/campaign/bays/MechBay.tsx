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

import type { IMissionReadinessUnitProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
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
  /** Optional active mission readiness projection for this row. */
  readonly readiness?: IMissionReadinessUnitProjection;
  /** Count of repair-bay tickets targeting this unit. */
  readonly ticketCount: number;
  readonly ammoTicketCount: number;
  readonly unitTonnage?: number;
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
  readiness,
  ticketCount,
  ammoTicketCount,
  unitTonnage,
  campaignId,
  onLaunchRefit,
}: MechBayRowProps): React.ReactElement {
  const fixAction = readiness?.reasons.find((reason) => reason.actionHref);
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
          <p
            className="text-text-theme-secondary mt-2 text-xs"
            data-testid={`mech-bay-pilot-${unit.unitId}`}
          >
            Pilot: {readiness?.pilotName ?? unit.pilotId ?? 'Unassigned'}
          </p>
          <p
            className="text-text-theme-secondary mt-1 text-xs"
            data-testid={`mech-bay-loadout-${unit.unitId}`}
          >
            Weight: {unitTonnage ? `${unitTonnage} tons` : 'not cataloged'} |
            BV: not cataloged | Supply:{' '}
            {ammoTicketCount > 0
              ? `${ammoTicketCount} ammo ticket${
                  ammoTicketCount === 1 ? '' : 's'
                }`
              : 'no open ammo tickets'}
          </p>
          {readiness ? (
            <div
              className="mt-2 space-y-1"
              data-testid={`mech-bay-eligibility-${unit.unitId}`}
            >
              <p className="text-text-theme-secondary text-xs">
                Eligibility: {readiness.status}
                {readiness.blockingRepairTicketCount > 0
                  ? ` (${readiness.blockingRepairTicketCount} blocking repair)`
                  : ''}
              </p>
              {readiness.reasons.slice(0, 2).map((reason) => (
                <p
                  key={reason.code}
                  className={
                    reason.severity === 'blocker'
                      ? 'text-xs text-rose-300'
                      : 'text-xs text-amber-300'
                  }
                >
                  {reason.message}
                </p>
              ))}
            </div>
          ) : null}
        </>
      }
      right={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Badge className={readinessClasses(unit.readiness)}>
            {unit.readiness}
          </Badge>

          {readiness ? (
            <Badge
              variant={
                readiness.status === 'eligible'
                  ? 'success'
                  : readiness.status === 'risky'
                    ? 'warning'
                    : 'red'
              }
              size="sm"
              data-testid={`mech-bay-readiness-status-${unit.unitId}`}
            >
              {readiness.status}
            </Badge>
          ) : null}

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

          {fixAction?.actionHref ? (
            <Link
              href={fixAction.actionHref}
              className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
              data-testid={`mech-bay-fix-${unit.unitId}`}
            >
              {fixAction.actionLabel ?? 'Fix blocker'}
            </Link>
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
  /** Optional active mission readiness projection keyed by unit id. */
  readonly readinessByUnitId?: ReadonlyMap<
    string,
    IMissionReadinessUnitProjection
  >;
  readonly unitTonnageById?: ReadonlyMap<string, number>;
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
  readinessByUnitId,
  unitTonnageById,
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
  const ammoTicketCountByUnit = new Map<string, number>();
  for (const item of repairBay) {
    ticketCountByUnit.set(
      item.unitId,
      (ticketCountByUnit.get(item.unitId) ?? 0) + 1,
    );
    if (item.kind === 'ammo') {
      ammoTicketCountByUnit.set(
        item.unitId,
        (ammoTicketCountByUnit.get(item.unitId) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="space-y-3" data-testid="mech-bay-grid">
      {units.map((unit) => (
        <MechBayRow
          key={unit.unitId}
          unit={unit}
          readiness={readinessByUnitId?.get(unit.unitId)}
          ticketCount={ticketCountByUnit.get(unit.unitId) ?? 0}
          ammoTicketCount={ammoTicketCountByUnit.get(unit.unitId) ?? 0}
          unitTonnage={unitTonnageById?.get(unit.unitId)}
          campaignId={campaignId}
          onLaunchRefit={onLaunchRefit}
        />
      ))}
    </div>
  );
}

export default MechBay;
