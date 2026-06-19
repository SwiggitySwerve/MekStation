/**
 * Medical Bay
 *
 * The injured-pilot list (CP2a — `add-campaign-bay-ui`, design D4).
 * Renders `ICampaignInventory.medicalBay` — each injured pilot's injury
 * level, days-to-recover, and recovery status.
 *
 * The Medical Bay is READ-ONLY. Recovery is driven by `healingProcessor`
 * during day advancement, not by this UI — there is no healing control,
 * and the page copy makes that explicit (spec scenario "Medical Bay
 * exposes no healing controls").
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module components/campaign/bays/MedicalBay
 */

import React from 'react';

import type { IMedicalBayItem } from '@/types/campaign/CampaignInventory';

import { CampaignListCard } from '@/components/campaign/CampaignListCard';
import { Badge } from '@/components/ui';

import { BayEmpty } from './BayStates';

// =============================================================================
// Injury Level Badge
// =============================================================================

/** Map a pilot injury level onto a `Badge` colour. */
function injuryClasses(level: IMedicalBayItem['injuryLevel']): string {
  switch (level) {
    case 'none':
      return 'bg-slate-500/20 text-slate-400';
    case 'light':
      return 'bg-amber-500/20 text-amber-400';
    case 'serious':
      return 'bg-orange-500/20 text-orange-400';
    case 'critical':
      return 'bg-red-500/20 text-red-400';
    case 'kia':
    default:
      return 'bg-red-900/40 text-red-300';
  }
}

/** Map a medical-entry lifecycle status onto a `Badge` colour. */
function statusClasses(status: IMedicalBayItem['status']): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'discharged':
      return 'bg-slate-500/20 text-slate-400';
    case 'recovering':
    default:
      return 'bg-blue-500/20 text-blue-400';
  }
}

// =============================================================================
// Pilot Row
// =============================================================================

interface MedicalBayRowProps {
  /** The medical-bay line item. */
  readonly item: IMedicalBayItem;
}

/**
 * One Medical Bay row — a single injured pilot. Read-only: shows the
 * injury, recovery time, and status with no mutation control.
 */
export function MedicalBayRow({
  item,
}: MedicalBayRowProps): React.ReactElement {
  return (
    <CampaignListCard
      testId={`medical-bay-row-${item.pilotId}`}
      left={
        <>
          <h3 className="text-text-theme-primary truncate text-base font-semibold">
            {item.pilotName}
          </h3>
          <p
            className="text-text-theme-secondary mt-1 text-xs"
            data-testid={`medical-bay-recovery-${item.pilotId}`}
          >
            {item.status === 'ready'
              ? 'Cleared for active duty'
              : item.status === 'discharged'
                ? 'Discharged from the roster'
                : `${item.daysToRecover} ${
                    item.daysToRecover === 1 ? 'day' : 'days'
                  } to recover`}
          </p>
        </>
      }
      right={
        <div className="flex items-center gap-3">
          <Badge className={injuryClasses(item.injuryLevel)}>
            {item.injuryLevel}
          </Badge>
          <Badge className={statusClasses(item.status)}>{item.status}</Badge>
        </div>
      }
    />
  );
}

// =============================================================================
// Medical Bay
// =============================================================================

export interface MedicalBayProps {
  /** The medical-bay line items from the campaign inventory. */
  readonly medicalBay: readonly IMedicalBayItem[];
}

/**
 * The Medical Bay page body — the injured-pilot list. Renders an empty
 * state when no pilots are injured (design D7 — empty, not error). A
 * recovery-copy note makes clear healing happens on day advancement.
 */
export function MedicalBay({
  medicalBay,
}: MedicalBayProps): React.ReactElement {
  if (medicalBay.length === 0) {
    return (
      <BayEmpty
        title="No pilots in the infirmary"
        message="Injured pilots appear here after a battle. Everyone is fit for duty."
      />
    );
  }

  return (
    <div className="space-y-3" data-testid="medical-bay-list">
      {/* Read-only note — recovery is driven by day advancement, not this
          page (design D4 / spec "no healing controls" scenario). */}
      <p
        className="text-text-theme-muted text-xs italic"
        data-testid="medical-bay-recovery-note"
      >
        Pilots recover automatically as the campaign advances day by day. There
        is no manual healing — advance the day to progress recovery.
      </p>

      {medicalBay.map((item) => (
        <MedicalBayRow key={item.pilotId} item={item} />
      ))}
    </div>
  );
}

export default MedicalBay;
