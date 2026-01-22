/**
 * E2E Store Exposure
 *
 * Exposes Zustand stores globally for E2E test injection.
 * Only active when NEXT_PUBLIC_E2E_MODE=true
 */

import { useCampaignStore } from '@/stores/useCampaignStore';
import { useForceStore } from '@/stores/useForceStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { useRepairStore } from '@/stores/useRepairStore';
import { useAwardStore } from '@/stores/useAwardStore';
import { useTabManagerStore, UNIT_TEMPLATES } from '@/stores/useTabManagerStore';
import * as aerospaceRegistry from '@/stores/aerospaceStoreRegistry';
import * as vehicleRegistry from '@/stores/vehicleStoreRegistry';

declare global {
  interface Window {
    __ZUSTAND_STORES__?: {
      campaign: typeof useCampaignStore;
      force: typeof useForceStore;
      pilot: typeof usePilotStore;
      encounter: typeof useEncounterStore;
      gameplay: typeof useGameplayStore;
      repair: typeof useRepairStore;
      award: typeof useAwardStore;
      tabManager: typeof useTabManagerStore;
    };
    __AEROSPACE_REGISTRY__?: typeof aerospaceRegistry;
    __VEHICLE_REGISTRY__?: typeof vehicleRegistry;
    __UNIT_TEMPLATES__?: typeof UNIT_TEMPLATES;
    __E2E_MODE__?: boolean;
  }
}

export function exposeStoresForE2E(): void {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return;

  window.__E2E_MODE__ = true;
  window.__ZUSTAND_STORES__ = {
    campaign: useCampaignStore,
    force: useForceStore,
    pilot: usePilotStore,
    encounter: useEncounterStore,
    gameplay: useGameplayStore,
    repair: useRepairStore,
    award: useAwardStore,
    tabManager: useTabManagerStore,
  };
  window.__AEROSPACE_REGISTRY__ = aerospaceRegistry;
  window.__VEHICLE_REGISTRY__ = vehicleRegistry;
  window.__UNIT_TEMPLATES__ = UNIT_TEMPLATES;

  console.log('[E2E] Stores exposed for testing');
}

export function isE2EMode(): boolean {
  return typeof window !== 'undefined' && window.__E2E_MODE__ === true;
}
