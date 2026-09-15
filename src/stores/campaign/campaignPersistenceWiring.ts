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
 * The same install/uninstall pair owns the discard-time flush listeners
 * (task 1.6): `pagehide` and a hidden `visibilitychange` are where a
 * document goes away, and the pending envelope has to reach the server
 * before it does. `beforeunload` is deliberately NOT registered - it
 * fires nowhere `pagehide` does not, and registering it disables bfcache
 * in some engines, which is a regression in a fix whose whole purpose is
 * not losing state.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D6)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 *   - Requirement: Pending client mutations are flushed before the document is discarded
 */

import type { ICampaign } from '@/types/campaign/Campaign';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignPersistenceStore } from './useCampaignPersistenceStore';

/** The currently-installed unsubscribe handle, or `null`. */
let unsubscribe: (() => void) | null = null;

/** The campaign object reference last observed by the subscription. */
let lastCampaign: ICampaign | null = null;

/** True while the discard-flush listeners are registered. */
let discardListenersInstalled = false;

/** A document being discarded: flush whatever the debounce still holds. */
function handlePageHide(): void {
  useCampaignPersistenceStore.getState().flushPendingMutations();
}

/**
 * A hidden transition is the discard signal mobile browsers actually
 * deliver. A visible one is a return: the document the flush treated as
 * departing is still here, so the acknowledged save it could not perform
 * is reconciled rather than left owing.
 */
function handleVisibilityChange(): void {
  const store = useCampaignPersistenceStore.getState();
  if (document.visibilityState === 'hidden') {
    store.flushPendingMutations();
    return;
  }
  store.reconcileAfterDiscardFlush();
}

/** Idempotent, and a no-op wherever there is no document (SSR). */
function installDiscardFlushListeners(): void {
  if (discardListenersInstalled || typeof window === 'undefined') {
    return;
  }
  window.addEventListener('pagehide', handlePageHide);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  discardListenersInstalled = true;
}

function uninstallDiscardFlushListeners(): void {
  if (!discardListenersInstalled) {
    return;
  }
  window.removeEventListener('pagehide', handlePageHide);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  discardListenersInstalled = false;
}

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
  // Before the store check: the discard flush reads the persistence store
  // directly, so it stays useful even where the campaign-store accessor
  // is not registered yet.
  installDiscardFlushListeners();
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
  uninstallDiscardFlushListeners();
  if (unsubscribe !== null) {
    unsubscribe();
    unsubscribe = null;
  }
  lastCampaign = null;
}
