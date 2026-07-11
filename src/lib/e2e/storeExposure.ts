/**
 * E2E Store Exposure
 *
 * Exposes Zustand stores globally for E2E test injection.
 * Only active when NEXT_PUBLIC_E2E_MODE=true
 */

import { getEventStore, type EventStoreService } from '@/services/events';
import * as aerospaceRegistry from '@/stores/aerospaceStoreRegistry';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import * as unitRegistry from '@/stores/unitStoreRegistry';
import { useAwardStore } from '@/stores/useAwardStore';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { useRepairStore } from '@/stores/useRepairStore';
import {
  useTabManagerStore,
  UNIT_TEMPLATES,
} from '@/stores/useTabManagerStore';
import * as vehicleRegistry from '@/stores/vehicleStoreRegistry';
import { logger } from '@/utils/logger';

declare global {
  interface Window {
    __ZUSTAND_STORES__?: {
      // `useCampaignStore` is a lazy-init wrapper that returns a `StoreApi`,
      // not a raw Zustand hook with `.getState`/`.setState` attached as
      // statics (the other stores below all are). We expose the called
      // `StoreApi` here so E2E specs can do `stores.campaign.getState()` the
      // same way they do for every other store. PT-004.
      campaign: ReturnType<typeof useCampaignStore>;
      // Sanctioned additive touch (add-scenario-packs W4, orchestrator
      // ruling 2026-07-11 — see design.md D3 amendment): a normal
      // `create<T>()` Zustand hook (statics attached, unlike the lazy
      // `useCampaignStore` wrapper above), exposed so
      // `e2e/helpers/scenarioPackLoading.ts`'s post-`goto` load-outcome
      // check can read `saveState`/`errorMessage`/`campaignId` — the exact
      // signals `loadCampaignAction` itself branches on
      // (`useCampaignPersistenceStore.ts:441-483`) — instead of inferring
      // load success from an unrelated store's side effect.
      campaignPersistence: typeof useCampaignPersistenceStore;
      // Canonical personnel source since the personnel→roster-employment
      // migration (PR #473) — e2e round-trip specs seed pilots here, the
      // same way the Jest twin (phase4CampaignRoundTrip.test.ts) does.
      campaignRoster: typeof useCampaignRosterStore;
      force: typeof useForceStore;
      pilot: typeof usePilotStore;
      encounter: typeof useEncounterStore;
      gameplay: typeof useGameplayStore;
      // `useQuickGameStore` has no UI selector for `scenarioConfig.scenarioType`
      // (known limitation — see `playtest/checklists/sp-uat.md`). Expose for
      // E2E so Phase-2 SP smoke can drive all 4 scenario types directly.
      quickGame: typeof useQuickGameStore;
      repair: typeof useRepairStore;
      award: typeof useAwardStore;
      tabManager: typeof useTabManagerStore;
    };
    __AEROSPACE_REGISTRY__?: typeof aerospaceRegistry;
    __VEHICLE_REGISTRY__?: typeof vehicleRegistry;
    __UNIT_REGISTRY__?: typeof unitRegistry;
    __UNIT_TEMPLATES__?: typeof UNIT_TEMPLATES;
    __EVENT_STORE__?: EventStoreService;
    __E2E_MODE__?: boolean;
  }
}

export function exposeStoresForE2E(): void {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return;

  window.__E2E_MODE__ = true;
  window.__ZUSTAND_STORES__ = {
    // Call the lazy wrapper so the StoreApi (with `.getState`/`.setState`/
    // `.subscribe`) is exposed directly — see the Window-interface comment
    // above. PT-004 fix. `useCampaignStore` follows Zustand's `use*` naming
    // convention but is a plain function (not a React hook) — it's safe to
    // call outside a component body.
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    campaign: useCampaignStore(),
    campaignPersistence: useCampaignPersistenceStore,
    campaignRoster: useCampaignRosterStore,
    force: useForceStore,
    pilot: usePilotStore,
    encounter: useEncounterStore,
    gameplay: useGameplayStore,
    quickGame: useQuickGameStore,
    repair: useRepairStore,
    award: useAwardStore,
    tabManager: useTabManagerStore,
  };
  window.__AEROSPACE_REGISTRY__ = aerospaceRegistry;
  window.__VEHICLE_REGISTRY__ = vehicleRegistry;
  window.__UNIT_REGISTRY__ = unitRegistry;
  window.__UNIT_TEMPLATES__ = UNIT_TEMPLATES;
  window.__EVENT_STORE__ = getEventStore();

  logger.debug('[E2E] Stores exposed for testing');
}

export function isE2EMode(): boolean {
  return typeof window !== 'undefined' && window.__E2E_MODE__ === true;
}
