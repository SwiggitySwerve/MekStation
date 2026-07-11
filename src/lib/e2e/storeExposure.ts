/**
 * E2E Store Exposure
 *
 * Exposes Zustand stores globally for E2E test injection.
 * Only active when NEXT_PUBLIC_E2E_MODE=true
 */

import { getEventStore } from '@/services/events';
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
