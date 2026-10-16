/**
 * Campaign construction-maxima population.
 *
 * `ICampaign.unitMaxStates` is the full-health reference the repair-queue
 * builder, the maintenance cap, and the roster card's damage bar all diff
 * against. Before `R9.roster-damage` nothing in production ever wrote it,
 * so every consumer was permanently exercising its own "absent → skip"
 * branch. This module is the one writer: it resolves the missing entries
 * through the canonical/custom source authority and merges them in.
 *
 * Called at the two points a roster unit can appear without an entry:
 * when a unit joins the roster (campaign creation) and when an existing
 * campaign is loaded from the server. Idempotent — an entry that already
 * exists is left alone, so a repeat call resolves nothing and writes
 * nothing.
 *
 * @spec openspec/specs/campaign-unit-combat-state/spec.md
 */

import type { IMaxStateRosterUnit } from '@/lib/campaign/maxState/unitMaxStateResolver';
import type { ICampaign } from '@/types/campaign/Campaign';

import { resolveMissingUnitMaxStates } from '@/lib/campaign/maxState/unitMaxStateResolver';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignRosterStore } from './useCampaignRosterStore';

/**
 * The staged form, for a caller that installs the campaign itself: the
 * maxima `existing` would hold once the missing entries resolve, without
 * touching any store or saving. A caller that must not write when it has
 * gone stale (the guarded saved-record refresh) checks after this await
 * and adopts the result with the record, so no `updateCampaign` or PUT
 * runs on its behalf.
 */
export async function prepareCampaignUnitMaxStates(
  units: readonly IMaxStateRosterUnit[],
  existing: ICampaign['unitMaxStates'],
): Promise<ICampaign['unitMaxStates']> {
  if (units.length === 0) return existing;
  const resolved = await resolveMissingUnitMaxStates(units, existing);
  return Object.keys(resolved).length === 0
    ? existing
    : { ...existing, ...resolved };
}

/**
 * Fill in `campaign.unitMaxStates` for roster units that have no entry.
 *
 * Resolution is async and network-backed, so the live campaign is re-read
 * afterwards: if the campaign was switched or cleared while resolving,
 * the result belongs to a campaign that is no longer loaded and is
 * discarded rather than written onto whatever replaced it.
 */
export async function ensureCampaignUnitMaxStates(): Promise<void> {
  const store = getCampaignStoreForRoster();
  const campaign = store?.getState().campaign;
  if (!store || !campaign) return;

  const units = useCampaignRosterStore.getState().units;
  if (units.length === 0) return;

  const resolved = await resolveMissingUnitMaxStates(
    units,
    campaign.unitMaxStates,
  );
  if (Object.keys(resolved).length === 0) return;

  const live = store.getState().campaign;
  if (!live || live.id !== campaign.id) return;

  store.getState().updateCampaign({
    unitMaxStates: { ...live.unitMaxStates, ...resolved },
  });
}
