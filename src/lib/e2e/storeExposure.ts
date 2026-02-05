/**
 * E2E Store Exposure
 *
 * Exposes Zustand stores globally for E2E test injection.
 * Only active when NEXT_PUBLIC_E2E_MODE=true
 */

import * as aerospaceRegistry from '@/stores/aerospaceStoreRegistry';
import * as unitRegistry from '@/stores/unitStoreRegistry';
import { useAwardStore } from '@/stores/useAwardStore';
import { useCampaignStore } from '@/stores/useCampaignStore';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { useRepairStore } from '@/stores/useRepairStore';
import {
  useTabManagerStore,
  UNIT_TEMPLATES,
} from '@/stores/useTabManagerStore';
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
    __UNIT_REGISTRY__?: typeof unitRegistry;
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
  window.__UNIT_REGISTRY__ = unitRegistry;
  window.__UNIT_TEMPLATES__ = UNIT_TEMPLATES;

  console.log('[E2E] Stores exposed for testing');
}

export function isE2EMode(): boolean {
  return typeof window !== 'undefined' && window.__E2E_MODE__ === true;
}
