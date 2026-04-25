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

import type { IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  subscribeToCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import {
  advanceDayViaPipeline,
  DayReport,
} from '@/lib/campaign/dayAdvancement';
import { getDayPipeline } from '@/lib/campaign/dayPipeline';
import { registerBuiltinProcessors } from '@/lib/campaign/processors';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  ICampaign,
  ICampaignOptions,
  IMission,
  createCampaign as createCampaignEntity,
} from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { IForce } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import { IPerson } from '@/types/campaign/Person';
import { Transaction } from '@/types/campaign/Transaction';

import { createForcesStore, ForcesStore } from './useForcesStore';
import { createMissionsStore, MissionsStore } from './useMissionsStore';
import { createPersonnelStore, PersonnelStore } from './usePersonnelStore';

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
  shoppingList?: IShoppingList;
  options: ICampaignOptions;
  campaignType?: string;
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

  /**
   * Queue of combat outcomes awaiting application by `postBattleProcessor`.
   * Wave 5 (engine wiring) populates this when `IGameSession.getOutcome()`
   * resolves. The processor drains it on each day-advance.
   */
  pendingBattleOutcomes: ICombatOutcome[];

  /**
   * Per `wire-encounter-to-campaign-round-trip` spec scenario "Drained
   * outcomes move to processedBattleIds": running a battle's outcome
   * through the day pipeline appends its matchId here, both as an
   * idempotency ledger (for the bus subscription's dedupe) and as the
   * audit trail the dashboard surfaces.
   */
  processedBattleIds: string[];

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
    options?: Partial<ICampaignOptions>,
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

  /**
   * Enqueue a combat outcome for the next day-advance cycle.
   * Idempotent: outcomes with a matchId already in the queue are
   * skipped. Per Wave 5 spec ("Duplicate outcome ignored"): a matchId
   * already in `processedBattleIds` is also skipped — once a battle has
   * been applied to the campaign, re-enqueueing it does nothing.
   */
  enqueueOutcome: (outcome: ICombatOutcome) => void;

  /**
   * Remove an outcome from the queue by matchId. Returns true if an
   * outcome was removed.
   */
  dequeueOutcome: (matchId: string) => boolean;

  /** Read the current pending outcome queue (immutable snapshot). */
  getPendingOutcomes: () => readonly ICombatOutcome[];

  /**
   * Per `add-post-battle-review-ui` § 10.1: returns true when an
   * outcome for the given match id is currently in the pending queue
   * — i.e., the post-battle review page can render with real data.
   * Returns false otherwise (queue empty, or already-applied outcome
   * has been dequeued).
   */
  reviewReady: (matchId: string) => boolean;

  /**
   * Per Wave 5 (`wire-encounter-to-campaign-round-trip`): banner
   * selector for the campaign dashboard. Reads the live queue length so
   * the dashboard can show "N battles pending review" without
   * subscribing to the entire outcome list.
   */
  getPendingOutcomeCount: () => number;

  /**
   * Test/observability accessor for the processed-battle ledger. The
   * capstone E2E test asserts that an applied outcome's matchId lands
   * here after `advanceDay()`.
   */
  getProcessedBattleIds: () => readonly string[];
}

export type CampaignStore = CampaignState & CampaignActions;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: thread the store-
 * side outcome queue + processed-ledger onto the campaign object so the
 * day pipeline (which reads `campaign.pendingBattleOutcomes` and
 * `campaign.processedBattleIds`) sees them. The campaign object is
 * narrowed via the post-battle processor's extension type — we don't
 * widen `ICampaign` itself because the queue is conceptually a transient
 * UI ledger, not durable campaign data.
 */
function withBattleQueueAttached(
  campaign: ICampaign,
  pending: readonly ICombatOutcome[],
  processed: readonly string[],
): ICampaign {
  return {
    ...campaign,
    // We add fields to the campaign object that processors look for —
    // these are typed via the postBattleProcessor extension and ignored
    // by every other consumer, so the cast is safe.
    pendingBattleOutcomes: pending,
    processedBattleIds: processed,
  } as ICampaign & {
    readonly pendingBattleOutcomes: readonly ICombatOutcome[];
    readonly processedBattleIds: readonly string[];
  };
}

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
    shoppingList: campaign.shoppingList,
    options: campaign.options,
    campaignType: campaign.campaignType,
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
  missions: Map<string, IMission>,
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
      transactions: serialized.finances.transactions.map(
        (t): Transaction => ({
          id: t.id,
          type: t.type as TransactionType,
          amount: new Money(t.amount),
          date: new Date(t.date),
          description: t.description,
        }),
      ),
      balance: new Money(serialized.finances.balance),
    },
    factionStandings: serialized.factionStandings ?? {},
    shoppingList: serialized.shoppingList,
    options: serialized.options,
    campaignType:
      (serialized.campaignType as CampaignType) ?? CampaignType.MERCENARY,
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
        pendingBattleOutcomes: [],
        processedBattleIds: [],
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
            forceType: ForceRole.STANDARD,
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
            const parsed = JSON.parse(stored) as {
              state: SerializedCampaignState;
            };
            const serialized = parsed.state;

            // Create sub-stores and load their data
            const personnelStore = createPersonnelStore(id);
            const forcesStore = createForcesStore(id);
            const missionsStore = createMissionsStore(id);

            // Get data from sub-stores (they auto-hydrate from their own storage)
            const personnel = new Map(
              personnelStore
                .getState()
                .getAll()
                .map((p) => [p.id, p]),
            );
            const forces = new Map(
              forcesStore
                .getState()
                .getAllForces()
                .map((f) => [f.id, f]),
            );
            const missions = new Map(
              missionsStore
                .getState()
                .getAllMissions()
                .map((m) => [m.id, m]),
            );

            // Deserialize campaign
            const campaign = deserializeCampaign(
              serialized,
              personnel,
              forces,
              missions,
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
          const { campaign, personnelStore, forcesStore, missionsStore } =
            get();

          if (!campaign) {
            return;
          }

          // Sync sub-store data to campaign
          const personnel = personnelStore
            ? new Map(
                personnelStore
                  .getState()
                  .getAll()
                  .map((p) => [p.id, p]),
              )
            : campaign.personnel;

          const forces = forcesStore
            ? new Map(
                forcesStore
                  .getState()
                  .getAllForces()
                  .map((f) => [f.id, f]),
              )
            : campaign.forces;

          const missions = missionsStore
            ? new Map(
                missionsStore
                  .getState()
                  .getAllMissions()
                  .map((m) => [m.id, m]),
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
            JSON.stringify({ state: serialized }),
          );
        },

        advanceDay: () => {
          const { campaign, pendingBattleOutcomes, processedBattleIds } = get();

          if (!campaign) {
            return null;
          }

          registerBuiltinProcessors();

          // Per `wire-encounter-to-campaign-round-trip` spec
          // ("Day Advancement Applies Pending Outcomes"): the day pipeline
          // is the canonical execution path so postBattle / salvage /
          // repair processors actually run on advance. Merge the store-
          // side `pendingBattleOutcomes` queue into the campaign object
          // the pipeline reads — processors expect the queue to live on
          // the campaign, but our singleton truth is the store.
          const campaignWithOutcomes = withBattleQueueAttached(
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
          );

          const pipeline = getDayPipeline();
          const report = advanceDayViaPipeline(campaignWithOutcomes, pipeline);

          // Drain the in-store queue based on what the pipeline processed.
          // The pipeline-returned campaign carries the post-battle
          // ledger; we mirror it back into store state.
          const postPipeline = report.campaign as ICampaign & {
            readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
            readonly processedBattleIds?: readonly string[];
          };

          set({
            campaign: report.campaign,
            pendingBattleOutcomes: [
              ...(postPipeline.pendingBattleOutcomes ?? []),
            ],
            processedBattleIds: [
              ...(postPipeline.processedBattleIds ?? processedBattleIds),
            ],
          });

          // Per `wire-encounter-to-campaign-round-trip`: the postBattle
          // processor mutates `campaign.personnel` (pilot wounds + XP)
          // and `campaign.missions` (contract status flips). The
          // sub-stores are the source of truth that `saveCampaign`
          // re-reads from, so sync the pipeline output back into them
          // before persisting — otherwise saveCampaign would clobber
          // the post-battle deltas with stale sub-store data.
          const { personnelStore, missionsStore } = get();
          if (personnelStore) {
            const ps = personnelStore.getState();
            Array.from(report.campaign.personnel.values()).forEach((person) => {
              // Upsert: addPerson is set(...) under the hood, so it
              // also updates if the ID already exists. Cleaner than
              // updatePerson which silently no-ops when the ID is
              // missing from the sub-store.
              ps.addPerson(person);
            });
          }
          if (missionsStore) {
            const ms = missionsStore.getState();
            Array.from(report.campaign.missions.values()).forEach((mission) => {
              ms.addMission(mission);
            });
          }

          get().saveCampaign();

          return report;
        },

        advanceDays: (count: number) => {
          const { campaign } = get();

          if (!campaign) {
            return null;
          }

          // Loop through `advanceDay` so each day's processors see the
          // store-side queue mutations from previous days. This is
          // marginally slower than batching but keeps the per-day
          // pipeline contract identical to single-day advancement.
          const reports: DayReport[] = [];
          for (let i = 0; i < count; i++) {
            const report = get().advanceDay();
            if (!report) break;
            reports.push(report);
          }

          return reports.length > 0 ? reports : null;
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

        enqueueOutcome: (outcome) => {
          const { pendingBattleOutcomes, processedBattleIds } = get();
          // Per spec scenario "Duplicate outcome ignored": both the
          // pending queue AND the processed ledger gate enqueueing —
          // once a match has been applied to the campaign, replaying its
          // outcome should be a no-op so retried bus events don't
          // double-credit XP / salvage.
          if (
            pendingBattleOutcomes.some((o) => o.matchId === outcome.matchId)
          ) {
            return;
          }
          if (processedBattleIds.includes(outcome.matchId)) {
            return;
          }
          set({
            pendingBattleOutcomes: [...pendingBattleOutcomes, outcome],
          });
        },

        dequeueOutcome: (matchId) => {
          const { pendingBattleOutcomes } = get();
          const next = pendingBattleOutcomes.filter(
            (o) => o.matchId !== matchId,
          );
          if (next.length === pendingBattleOutcomes.length) return false;
          set({ pendingBattleOutcomes: next });
          return true;
        },

        getPendingOutcomes: () => get().pendingBattleOutcomes,
        getPendingOutcomeCount: () => get().pendingBattleOutcomes.length,
        getProcessedBattleIds: () => get().processedBattleIds,
        reviewReady: (matchId) => {
          if (!matchId) return false;
          return get().pendingBattleOutcomes.some((o) => o.matchId === matchId);
        },
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
            new Map(),
          );

          return {
            ...current,
            campaign,
            personnelStore: null,
            forcesStore: null,
            missionsStore: null,
          };
        },
      },
    ),
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
    // Per `wire-encounter-to-campaign-round-trip` spec ("Campaign Store
    // Enqueues Outcomes"): wire the bus subscription on first
    // construction so any session that completes anywhere in the app
    // automatically lands on the pending queue. Idempotency lives inside
    // `enqueueOutcome`.
    busUnsubscribe = subscribeToCombatOutcome(
      (event: ICombatOutcomeReadyEvent) => {
        const store = campaignStoreInstance;
        if (!store) return;
        store.getState().enqueueOutcome(event.outcome);
      },
    );
  }
  return campaignStoreInstance;
}

/**
 * Reset the singleton store instance (for testing). Tears down the bus
 * subscription too so the next construction re-attaches a fresh one.
 */
export function resetCampaignStore(): void {
  if (busUnsubscribe) {
    busUnsubscribe();
    busUnsubscribe = null;
  }
  campaignStoreInstance = null;
}

/** Bus subscription handle held alongside the singleton. */
let busUnsubscribe: (() => void) | null = null;
