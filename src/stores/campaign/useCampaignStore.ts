/**
 * Campaign Store Factory
 *
 * Creates isolated Zustand stores for campaign management.
 * Single campaign instance for MVP (extend to multiple later).
 *
 * Composes sub-stores:
 * - Personnel store (from usePersonnelStore)
 * - Forces store (from useForcesStore)
 * - Missions store (from useMissionsStore)
 *
 * Persists entire campaign state to IndexedDB via clientSafeStorage.
 */

import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
   ICampaign,
   ICampaignOptions,
   IMission,
   createCampaign as createCampaignEntity,
 } from '@/types/campaign/Campaign';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';
import { advanceDay as advanceDayPure, advanceDays as advanceDaysPure, DayReport } from '@/lib/campaign/dayAdvancement';
import { registerBuiltinProcessors } from '@/lib/campaign/processors';
import { IForce } from '@/types/campaign/Force';
import { ForceType, FormationLevel } from '@/types/campaign/enums';
import { IPerson } from '@/types/campaign/Person';
import { Money } from '@/types/campaign/Money';
import { Transaction, TransactionType } from '@/types/campaign/Transaction';
import { createPersonnelStore, PersonnelStore } from './usePersonnelStore';
import { createForcesStore, ForcesStore } from './useForcesStore';
import { createMissionsStore, MissionsStore } from './useMissionsStore';

// =============================================================================
// Serialized Campaign State (for persistence)
// =============================================================================

/**
 * Serialized campaign state for IndexedDB persistence.
 * Maps are converted to arrays for JSON serialization.
 */
interface SerializedCampaignState {
   id: string;
   name: string;
   currentDate: string; // ISO 8601 string
   factionId: string;
   rootForceId: string;
   finances: {
     transactions: Array<{
       id: string;
       type: string;
       amount: number;
       date: string;
       description: string;
     }>;
     balance: number;
   };
   factionStandings?: Record<string, IFactionStanding>;
   options: ICampaignOptions;
   campaignStartDate?: string;
   description?: string;
   iconUrl?: string;
   createdAt: string;
   updatedAt: string;
}

// =============================================================================
// Store State
// =============================================================================

interface CampaignState {
  /** Current campaign (null if no campaign loaded) */
  campaign: ICampaign | null;

  /** Sub-store instances (created when campaign is loaded/created) */
  personnelStore: StoreApi<PersonnelStore> | null;
  forcesStore: StoreApi<ForcesStore> | null;
  missionsStore: StoreApi<MissionsStore> | null;
}

interface CampaignActions {
  /** Create a new campaign */
  createCampaign: (
    name: string,
    factionId: string,
    options?: Partial<ICampaignOptions>
  ) => string;

  /** Load a campaign by ID */
  loadCampaign: (id: string) => boolean;

  /** Save the current campaign */
  saveCampaign: () => void;

  /** Advance the campaign date by one day */
  advanceDay: () => DayReport | null;

  /** Advance the campaign date by N days */
  advanceDays: (count: number) => DayReport[] | null;

  /** Get the current campaign */
  getCampaign: () => ICampaign | null;

  /** Update campaign properties */
  updateCampaign: (updates: Partial<ICampaign>) => void;

  /** Get personnel store */
  getPersonnelStore: () => StoreApi<PersonnelStore> | null;

  /** Get forces store */
  getForcesStore: () => StoreApi<ForcesStore> | null;

  /** Get missions store */
  getMissionsStore: () => StoreApi<MissionsStore> | null;
}

export type CampaignStore = CampaignState & CampaignActions;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Serialize campaign state for persistence.
 */
function serializeCampaign(campaign: ICampaign): SerializedCampaignState {
  return {
    id: campaign.id,
    name: campaign.name,
    currentDate: campaign.currentDate.toISOString(),
    factionId: campaign.factionId,
    rootForceId: campaign.rootForceId,
    finances: {
      transactions: campaign.finances.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.amount,
        date: t.date.toISOString(),
        description: t.description,
      })),
      balance: campaign.finances.balance.amount,
    },
    options: campaign.options,
    campaignStartDate: campaign.campaignStartDate?.toISOString(),
    description: campaign.description,
    iconUrl: campaign.iconUrl,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

/**
 * Deserialize campaign state from persistence.
 */
function deserializeCampaign(
  serialized: SerializedCampaignState,
  personnel: Map<string, IPerson>,
  forces: Map<string, IForce>,
  missions: Map<string, IMission>
): ICampaign {
  return {
    id: serialized.id,
    name: serialized.name,
    currentDate: new Date(serialized.currentDate),
    factionId: serialized.factionId,
    personnel,
    forces,
    rootForceId: serialized.rootForceId,
    missions,
    finances: {
      transactions: serialized.finances.transactions.map((t): Transaction => ({
        id: t.id,
        type: t.type as TransactionType,
        amount: new Money(t.amount),
        date: new Date(t.date),
        description: t.description,
      })),
      balance: new Money(serialized.finances.balance),
    },
     factionStandings: serialized.factionStandings ?? {},
     options: serialized.options,
     campaignStartDate: serialized.campaignStartDate
       ? new Date(serialized.campaignStartDate)
       : undefined,
     description: serialized.description,
     iconUrl: serialized.iconUrl,
     createdAt: serialized.createdAt,
     updatedAt: serialized.updatedAt,
   };
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create a campaign store instance.
 *
 * The campaign store manages the overall campaign state and composes
 * sub-stores for personnel, forces, and missions.
 *
 * @returns A Zustand store instance
 *
 * @example
 * const store = createCampaignStore();
 * const campaignId = store.getState().createCampaign("Wolf's Dragoons", 'mercenary');
 * store.getState().advanceDay();
 */
export function createCampaignStore(): StoreApi<CampaignStore> {
  return create<CampaignStore>()(
    persist(
      (set, get) => ({
        // Initial state
        campaign: null,
        personnelStore: null,
        forcesStore: null,
        missionsStore: null,

        // =================================================================
        // Campaign Actions
        // =================================================================

        createCampaign: (name, factionId, options) => {
          // Create campaign entity
          const campaign = createCampaignEntity(name, factionId, options);

          // Create root force
          const rootForce: IForce = {
            id: campaign.rootForceId,
            name: name,
            parentForceId: undefined,
            subForceIds: [],
            unitIds: [],
            forceType: ForceType.STANDARD,
            formationLevel: FormationLevel.REGIMENT,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Create sub-stores
          const personnelStore = createPersonnelStore(campaign.id);
          const forcesStore = createForcesStore(campaign.id);
          const missionsStore = createMissionsStore(campaign.id);

          // Add root force to forces store
          forcesStore.getState().addForce(rootForce);

          // Update campaign with root force
          const campaignWithForce: ICampaign = {
            ...campaign,
            forces: new Map([[rootForce.id, rootForce]]),
          };

          set({
            campaign: campaignWithForce,
            personnelStore,
            forcesStore,
            missionsStore,
          });

          return campaign.id;
        },

        loadCampaign: (id) => {
          // Try to load from localStorage
          const storageKey = `campaign-${id}`;
          const storedResult = clientSafeStorage.getItem(storageKey);

          // clientSafeStorage.getItem is synchronous (returns string | null)
          // but TypeScript sees StateStorage which can be async
          const stored = storedResult as string | null;

          if (!stored) {
            return false;
          }

          try {
            const parsed = JSON.parse(stored) as { state: SerializedCampaignState };
            const serialized = parsed.state;

            // Create sub-stores and load their data
            const personnelStore = createPersonnelStore(id);
            const forcesStore = createForcesStore(id);
            const missionsStore = createMissionsStore(id);

            // Get data from sub-stores (they auto-hydrate from their own storage)
            const personnel = new Map(
              personnelStore.getState().getAll().map((p) => [p.id, p])
            );
            const forces = new Map(
              forcesStore.getState().getAllForces().map((f) => [f.id, f])
            );
            const missions = new Map(
              missionsStore.getState().getAllMissions().map((m) => [m.id, m])
            );

            // Deserialize campaign
            const campaign = deserializeCampaign(
              serialized,
              personnel,
              forces,
              missions
            );

            set({
              campaign,
              personnelStore,
              forcesStore,
              missionsStore,
            });

            return true;
          } catch {
            return false;
          }
        },

        saveCampaign: () => {
          const { campaign, personnelStore, forcesStore, missionsStore } = get();

          if (!campaign) {
            return;
          }

          // Sync sub-store data to campaign
          const personnel = personnelStore
            ? new Map(
                personnelStore.getState().getAll().map((p) => [p.id, p])
              )
            : campaign.personnel;

          const forces = forcesStore
            ? new Map(
                forcesStore.getState().getAllForces().map((f) => [f.id, f])
              )
            : campaign.forces;

          const missions = missionsStore
            ? new Map(
                missionsStore.getState().getAllMissions().map((m) => [m.id, m])
              )
            : campaign.missions;

          // Update campaign with synced data
          const updatedCampaign: ICampaign = {
            ...campaign,
            personnel,
            forces,
            missions,
            updatedAt: new Date().toISOString(),
          };

          set({ campaign: updatedCampaign });

          // Serialize and save to storage
          const serialized = serializeCampaign(updatedCampaign);
          const storageKey = `campaign-${campaign.id}`;
          clientSafeStorage.setItem(
            storageKey,
            JSON.stringify({ state: serialized })
          );
        },

        advanceDay: () => {
          const { campaign } = get();

          if (!campaign) {
            return null;
          }

          registerBuiltinProcessors();
          const report = advanceDayPure(campaign);

          set({ campaign: report.campaign });
          get().saveCampaign();

          return report;
        },

        advanceDays: (count: number) => {
          const { campaign } = get();

          if (!campaign) {
            return null;
          }

          registerBuiltinProcessors();
          const reports = advanceDaysPure(campaign, count);
          const lastReport = reports[reports.length - 1];

          if (lastReport) {
            set({ campaign: lastReport.campaign });
            get().saveCampaign();
          }

          return reports;
        },

        getCampaign: () => get().campaign,

        updateCampaign: (updates) => {
          const { campaign } = get();

          if (!campaign) {
            return;
          }

          const updatedCampaign: ICampaign = {
            ...campaign,
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          set({ campaign: updatedCampaign });
        },

        getPersonnelStore: () => get().personnelStore,
        getForcesStore: () => get().forcesStore,
        getMissionsStore: () => get().missionsStore,
      }),
      {
        name: 'campaign-store',
        storage: createJSONStorage(() => clientSafeStorage),
        // Only persist campaign metadata, not sub-stores
        partialize: (state) => {
          if (!state.campaign) {
            return { campaign: null };
          }
          return {
            campaign: serializeCampaign(state.campaign),
          };
        },
        // Merge persisted state
        merge: (persisted: unknown, current) => {
          const persistedData = persisted as {
            campaign?: SerializedCampaignState | null;
          };

          if (!persistedData?.campaign) {
            return {
              ...current,
              campaign: null,
              personnelStore: null,
              forcesStore: null,
              missionsStore: null,
            };
          }

          // We'll load the full campaign in loadCampaign
          // For now, just restore the serialized state
          const serialized = persistedData.campaign;
          const campaign = deserializeCampaign(
            serialized,
            new Map(),
            new Map(),
            new Map()
          );

          return {
            ...current,
            campaign,
            personnelStore: null,
            forcesStore: null,
            missionsStore: null,
          };
        },
      }
    )
  );
}

// =============================================================================
// Singleton Store Instance
// =============================================================================

/**
 * Singleton campaign store instance.
 * Use this for the main application campaign management.
 */
let campaignStoreInstance: StoreApi<CampaignStore> | null = null;

/**
 * Get or create the singleton campaign store instance.
 *
 * @returns The campaign store instance
 *
 * @example
 * const store = useCampaignStore();
 * const campaign = store.getState().getCampaign();
 */
export function useCampaignStore(): StoreApi<CampaignStore> {
  if (!campaignStoreInstance) {
    campaignStoreInstance = createCampaignStore();
  }
  return campaignStoreInstance;
}

/**
 * Reset the singleton store instance (for testing).
 */
export function resetCampaignStore(): void {
  campaignStoreInstance = null;
}
