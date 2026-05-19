/**
 * Campaign persistence wiring
 *
 * Bridges `useCampaignStore` mutations to `useCampaignPersistenceStore`'s
 * dirty tracking (tasks 4.5). Subscribing to the campaign store and
 * calling `markDirty` whenever the live `campaign` object reference
 * changes means day advancement and any edit re-arm the auto-save
 * debounce without each mutation site having to know about persistence.
 *
 * The campaign store treats `ICampaign` as immutable — every mutation
 * (day pipeline, `updateCampaign`, outcome application) produces a NEW
 * campaign object — so a reference-identity check is a reliable dirty
 * signal.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D6)
 */

import type { ICampaign } from '@/types/campaign/Campaign';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';

/** The currently-installed unsubscribe handle, or `null`. */
let unsubscribe: (() => void) | null = null;

/** The campaign object reference last observed by the subscription. */
let lastCampaign: ICampaign | null = null;

/**
 * Install the campaign-store -> persistence-store dirty bridge. Idempotent
 * — a second call is a no-op while a subscription is already installed.
 *
 * The first observed campaign (e.g. just after `loadCampaign`) is recorded
 * as the baseline WITHOUT marking dirty, so a fresh load does not
 * immediately schedule a redundant save. Every subsequent reference change
 * marks dirty.
 */
export function installCampaignPersistenceWiring(): void {
  if (unsubscribe !== null) {
    return;
  }
  const store = getCampaignStoreForRoster();
  if (!store) {
    return;
  }
  lastCampaign = store.getState().campaign;
  unsubscribe = store.subscribe((state) => {
    const next = state.campaign;
    if (next === lastCampaign) {
      return;
    }
    const hadCampaign = lastCampaign !== null;
    lastCampaign = next;
    // A transition from no-campaign to a campaign is a load/create, not
    // an edit — record the baseline silently. Any change between two
    // non-null campaigns is a genuine mutation.
    if (next && hadCampaign) {
      useCampaignPersistenceStore.getState().markDirty();
    }
  });
}

/**
 * Tear down the dirty bridge. Used by tests and store resets.
 */
export function uninstallCampaignPersistenceWiring(): void {
  if (unsubscribe !== null) {
    unsubscribe();
    unsubscribe = null;
  }
  lastCampaign = null;
}
