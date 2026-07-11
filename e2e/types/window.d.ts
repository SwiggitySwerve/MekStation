import type { EventStoreService } from '@/services/events';
import type * as aerospaceRegistry from '@/stores/aerospaceStoreRegistry';
import type * as unitRegistry from '@/stores/unitStoreRegistry';
import type * as vehicleRegistry from '@/stores/vehicleStoreRegistry';

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { useAwardStore } from '@/stores/useAwardStore';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { useRepairStore } from '@/stores/useRepairStore';
import {
  UNIT_TEMPLATES,
  useTabManagerStore,
} from '@/stores/useTabManagerStore';

declare global {
  interface Window {
    __ZUSTAND_STORES__?: {
      campaign: ReturnType<typeof useCampaignStore>;
      campaignPersistence: typeof useCampaignPersistenceStore;
      campaignRoster: typeof useCampaignRosterStore;
      force: typeof useForceStore;
      pilot: typeof usePilotStore;
      encounter: typeof useEncounterStore;
      gameplay: typeof useGameplayStore;
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

export {};
