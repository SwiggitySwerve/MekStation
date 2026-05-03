/**
 * Campaign Store Factory
 *
 * Creates isolated Zustand stores for campaign management.
 * Single campaign instance for MVP (extend to multiple later).
 *
 * Composes sub-stores:
 * - Forces store (from useForcesStore)
 * - Missions store (from useMissionsStore)
 *
 * Personnel state lives on `useCampaignRosterStore` as the canonical
 * source of truth (per `wire-iperson-hard-cutover` PR4 — the legacy
 * `campaign.personnel` field was removed). The day pipeline reads roster
 * entries directly from the store; processors commit per-pilot mutations
 * via `useCampaignRosterStore.applyPilotPatches`.
 *
 * Persists entire campaign state to IndexedDB via clientSafeStorage.
 */

import { create, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';
import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  subscribeToCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import {
  appendDailyBattleAuditEntry,
  buildDailyBattleAuditEntry,
} from '@/lib/campaign/dailyBattleAuditBuilder';
import {
  convertToLegacyDayReport,
  DayReport,
} from '@/lib/campaign/dayAdvancement';
import { getDayPipeline } from '@/lib/campaign/dayPipeline';
import { registerBuiltinProcessors } from '@/lib/campaign/processors';
import {
  applyPostBattle,
  type ICampaignWithBattleState,
} from '@/lib/campaign/processors/postBattleProcessor';
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
import { Transaction } from '@/types/campaign/Transaction';
import { emitPendingOutcomeAdded } from '@/utils/events/campaignOutcomeEvents';

import { useCampaignRosterStore } from './useCampaignRosterStore';
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
  factionStandings: Record<string, IFactionStanding>;
  shoppingList?: IShoppingList;
  options: ICampaignOptions;
  campaignType: string;
  campaignStartDate: string;
  description?: string;
  iconUrl?: string;
  pendingBattleOutcomes: ICombatOutcome[];
  processedBattleIds: string[];
  reviewedBattleIds: Record<string, number>;
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §7: persisted
   * daily audit ledger so the dashboard can surface battle-effects
   * rollups across page reloads. Hard-cutover policy: required (PR2,
   * cluster C). Pre-release product, no legacy compat to preserve.
   */
  dailyBattleAudit: IDailyBattleAuditEntry[];
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

  /**
   * Per `add-post-battle-review-ui` § 8.3: matchId → epoch-ms timestamp
   * recorded when the player clicked "Return to Campaign" on the
   * post-battle review screen. Pairs with `markBattleReviewed` to keep
   * a future-audit trail without polluting `ICombatOutcome` (the
   * engine hand-off shape) with UI lifecycle state.
   */
  reviewedBattleIds: Record<string, number>;

  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §11.2: matchId →
   * error message recorded when the post-battle processor fails to
   * apply an outcome. Surfaced by the dashboard banner ("1 outcome
   * failed to apply — see details") and cleared by a successful retry
   * (manual or automatic) on the next day-advance.
   */
  outcomeApplyErrors: Record<string, string>;

  /** Sub-store instances (created when campaign is loaded/created) */
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

  /**
   * Per `add-post-battle-review-ui` § 8.3 + after-combat-report
   * "Return-to-campaign commits outcome" scenario: stamp the matchId
   * with `Date.now()` and dequeue it from `pendingBattleOutcomes` so
   * the dashboard banner and review page no longer surface it. Used
   * by the post-battle review screen's "Return to Campaign" CTA.
   */
  markBattleReviewed: (matchId: string) => void;

  /**
   * Returns the epoch-ms timestamp when `markBattleReviewed` was called
   * for the given matchId, or null when the battle has not been
   * reviewed. Powers audit views and idempotency checks.
   */
  getReviewedAt: (matchId: string) => number | null;

  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §11.2: snapshot
   * of every outcome that failed to apply on its last day-advance. The
   * dashboard banner uses the count to surface "N outcome(s) failed to
   * apply — see details". Empty when no outcomes are stuck.
   */
  getOutcomeApplyErrors: () => Readonly<Record<string, string>>;

  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §11.3: try to
   * re-apply a single outcome (used by the review page's "Retry
   * application" button). On success, clears the matchId from
   * `outcomeApplyErrors`; on failure, refreshes the recorded message.
   * Returns true when the retry succeeded.
   */
  retryOutcomeApplication: (matchId: string) => boolean;
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
 * Snapshot the current roster pilot list. Captured around the day pipeline
 * call so the audit-card builder can diff before/after roster state for XP
 * + missions deltas (the previous personnel-Map diff is gone with PR4).
 */
function snapshotRosterPilots(): readonly ICampaignRosterEntry[] {
  // Shallow clone is enough: roster entries are themselves immutable from
  // the store's perspective (every mutation goes through `applyPilotPatches`
  // which produces fresh objects), so retaining the reference array is
  // safe across the pipeline call.
  return [...useCampaignRosterStore.getState().pilots];
}

/**
 * Serialize campaign state for persistence.
 */
function serializeCampaign(
  campaign: ICampaign,
  pendingBattleOutcomes: readonly ICombatOutcome[] = [],
  processedBattleIds: readonly string[] = [],
  reviewedBattleIds: Record<string, number> = {},
): SerializedCampaignState {
  // Read the audit ledger off the extended campaign surface. The field is
  // owned by the Wave-5 day pipeline; per hard-cutover policy (PR2 cluster
  // C) we always emit an array — the in-memory campaign may not yet carry
  // an entry on day 1, in which case we serialize an empty list.
  const audit =
    (
      campaign as ICampaign & {
        dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
      }
    ).dailyBattleAudit ?? [];
  // Hard-cutover policy: SerializedCampaignState requires campaignStartDate
  // (PR2 cluster C). `createCampaign` always populates it; if a caller
  // produced an ICampaign without it, fall back to currentDate so we still
  // emit a string and surface the bug in tests rather than persistence.
  const startDate = campaign.campaignStartDate ?? campaign.currentDate;
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
    factionStandings: campaign.factionStandings,
    shoppingList: campaign.shoppingList,
    options: campaign.options,
    campaignType: campaign.campaignType,
    campaignStartDate: startDate.toISOString(),
    description: campaign.description,
    iconUrl: campaign.iconUrl,
    pendingBattleOutcomes: [...pendingBattleOutcomes],
    processedBattleIds: [...processedBattleIds],
    reviewedBattleIds: { ...reviewedBattleIds },
    dailyBattleAudit: [...audit],
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

/**
 * Deserialize campaign state from persistence.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: no `personnel` parameter — the
 * roster store owns personnel state and rehydrates from its own persist
 * layer.
 */
function deserializeCampaign(
  serialized: SerializedCampaignState,
  forces: Map<string, IForce>,
  missions: Map<string, IMission>,
): ICampaign {
  return {
    id: serialized.id,
    name: serialized.name,
    currentDate: new Date(serialized.currentDate),
    factionId: serialized.factionId,
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
    factionStandings: serialized.factionStandings,
    shoppingList: serialized.shoppingList,
    options: serialized.options,
    campaignType: serialized.campaignType as CampaignType,
    campaignStartDate: new Date(serialized.campaignStartDate),
    description: serialized.description,
    iconUrl: serialized.iconUrl,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
    // Per canonicalize-unit-combat-state PR-A: ICampaign owns the
    // canonical post-deploy combat-state map. Hydrated empty here;
    // SerializedCampaignState does not (yet) persist combat states —
    // first deploy after rehydrate seeds entries via
    // createInitialCombatState. Future SerializedCampaignState extension
    // can pipe persisted combat states through this slot.
    unitCombatStates: {},
    // Restore the daily-battle audit ledger so the dashboard's audit
    // feed survives reloads. Cast through `as ICampaign` because the
    // field is on the optional extension type, not the core ICampaign.
    // Per hard-cutover policy (PR2 cluster C), dailyBattleAudit is now
    // required on SerializedCampaignState and always set here.
    dailyBattleAudit: serialized.dailyBattleAudit,
  } as ICampaign;
}

function persistCampaignRecord(
  campaign: ICampaign,
  pendingBattleOutcomes: readonly ICombatOutcome[],
  processedBattleIds: readonly string[],
  reviewedBattleIds: Record<string, number>,
): void {
  const serialized = serializeCampaign(
    campaign,
    pendingBattleOutcomes,
    processedBattleIds,
    reviewedBattleIds,
  );
  clientSafeStorage.setItem(
    `campaign-${campaign.id}`,
    JSON.stringify({ state: serialized }),
  );
}

function emitPendingOutcomeAddedEvent(
  campaign: ICampaign | null,
  outcome: ICombatOutcome,
  queueLength: number,
): void {
  if (!campaign) return;

  try {
    emitPendingOutcomeAdded({
      campaignId: campaign.id,
      matchId: outcome.matchId,
      contractId: outcome.contractId,
      scenarioId: outcome.scenarioId,
      queueLength,
    });
  } catch {
    // Outcome queue persistence must not depend on the optional event sink.
  }
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
        reviewedBattleIds: {},
        outcomeApplyErrors: {},
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
            const forcesStore = createForcesStore(id);
            const missionsStore = createMissionsStore(id);

            // Per PR4 of `wire-iperson-hard-cutover`: personnel state lives
            // on `useCampaignRosterStore` (its own persist layer hydrates
            // independently). The legacy `personnel` field is no longer read
            // off the serialized blob — pre-PR4 saves with a stale field
            // are ignored harmlessly.
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
            const campaign = deserializeCampaign(serialized, forces, missions);

            set({
              campaign,
              pendingBattleOutcomes: serialized.pendingBattleOutcomes,
              processedBattleIds: serialized.processedBattleIds,
              reviewedBattleIds: serialized.reviewedBattleIds,
              forcesStore,
              missionsStore,
            });

            return true;
          } catch {
            return false;
          }
        },

        saveCampaign: () => {
          const {
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
            reviewedBattleIds,
            forcesStore,
            missionsStore,
          } = get();

          if (!campaign) {
            return;
          }

          // Per PR4 of `wire-iperson-hard-cutover`: personnel state lives on
          // `useCampaignRosterStore` (its own persist layer). Forces and
          // missions are still owned by their respective sub-stores; sync
          // them onto the campaign object before persisting.
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
            forces,
            missions,
            updatedAt: new Date().toISOString(),
          };

          set({ campaign: updatedCampaign });

          persistCampaignRecord(
            updatedCampaign,
            pendingBattleOutcomes,
            processedBattleIds,
            reviewedBattleIds,
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
          //
          // Per PR4 of `wire-iperson-hard-cutover`: personnel is no longer
          // derived onto the campaign. Processors read entries directly
          // from `useCampaignRosterStore.getState().pilots` and commit
          // mutations via `applyPilotPatches`.
          const campaignWithOutcomes = withBattleQueueAttached(
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
          );

          // Capture the BEFORE snapshot for the audit-card builder.
          // The builder diffs roster XP across before/after to derive
          // XP awarded; contracts closed comes from the missions diff.
          const beforeForAudit =
            campaignWithOutcomes as ICampaignWithBattleState;
          const beforeRosterPilots = snapshotRosterPilots();

          // Run the pipeline directly so we can access the events array
          // for the audit-card builder. `advanceDayViaPipeline` collapses
          // events into a `DayReport`, losing the per-event payloads we
          // need for salvage/repair tallies.
          const pipeline = getDayPipeline();
          const pipelineResult = pipeline.processDay(campaignWithOutcomes);
          const report = convertToLegacyDayReport(pipelineResult);

          // Drain the in-store queue based on what the pipeline processed.
          // The pipeline-returned campaign carries the post-battle
          // ledger; we mirror it back into store state.
          const postPipeline = report.campaign as ICampaign & {
            readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
            readonly processedBattleIds?: readonly string[];
            readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
          };

          // Per `wire-encounter-to-campaign-round-trip` Wave 5 §7: build
          // a daily audit entry covering the three battle-effects
          // processors and append it to the campaign's audit ledger.
          // Returns null on days with no drained outcomes — the audit
          // feed simply skips empty days.
          //
          // Per PR4 of `wire-iperson-hard-cutover`: pass before/after
          // roster snapshots so the builder can diff XP without the
          // (now-deleted) personnel Map.
          const afterRosterPilots = snapshotRosterPilots();
          const auditEntry = buildDailyBattleAuditEntry({
            before: beforeForAudit,
            after: report.campaign as ICampaignWithBattleState,
            beforeRoster: beforeRosterPilots,
            afterRoster: afterRosterPilots,
            appliedOutcomes: postPipeline.recentlyAppliedOutcomes ?? [],
            events: pipelineResult.events,
            date: pipelineResult.date,
          });
          const campaignWithAudit = appendDailyBattleAuditEntry(
            report.campaign,
            auditEntry,
          );

          // Per Wave 5 §11.2: collect the matchIds of any
          // `post_battle_apply_failed` events from this run so the
          // dashboard banner can surface "N outcome failed to apply".
          // Successful retries on subsequent advances clear the flag
          // because the matchId leaves the queue when applied cleanly.
          const previousErrors = get().outcomeApplyErrors;
          const stillQueued = new Set(
            (postPipeline.pendingBattleOutcomes ?? []).map((o) => o.matchId),
          );
          const nextErrors: Record<string, string> = {};
          for (const e of pipelineResult.events) {
            if (e.type !== 'post_battle_apply_failed') continue;
            const data = e.data ?? {};
            const matchId = data.matchId;
            const errorMsg = data.error;
            if (typeof matchId === 'string' && typeof errorMsg === 'string') {
              nextErrors[matchId] = errorMsg;
            }
          }
          // Carry over previously-recorded errors that are still in
          // the pending queue (i.e., the retry didn't happen this run).
          for (const [matchId, msg] of Object.entries(previousErrors)) {
            if (stillQueued.has(matchId) && !(matchId in nextErrors)) {
              nextErrors[matchId] = msg;
            }
          }

          set({
            campaign: campaignWithAudit,
            pendingBattleOutcomes: [
              ...(postPipeline.pendingBattleOutcomes ?? []),
            ],
            processedBattleIds: [
              ...(postPipeline.processedBattleIds ?? processedBattleIds),
            ],
            outcomeApplyErrors: nextErrors,
          });

          // Per PR4 of `wire-iperson-hard-cutover`: processors commit
          // pilot mutations directly to `useCampaignRosterStore` via
          // `applyPilotPatches`, so there is no longer a personnel Map
          // to reconcile here. Missions are still owned by their
          // sub-store and continue to receive an upsert below.
          const { missionsStore } = get();
          if (missionsStore) {
            const ms = missionsStore.getState();
            Array.from(report.campaign.missions.values()).forEach((mission) => {
              ms.addMission(mission);
            });
          }

          get().saveCampaign();

          // Override the report.campaign with the audit-augmented copy so
          // callers (DayReportPanel etc.) see the freshly-appended entry.
          return { ...report, campaign: campaignWithAudit };
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

        getForcesStore: () => get().forcesStore,
        getMissionsStore: () => get().missionsStore,

        enqueueOutcome: (outcome) => {
          const {
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
            reviewedBattleIds,
          } = get();
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
          const nextPending = [...pendingBattleOutcomes, outcome];
          set({
            pendingBattleOutcomes: nextPending,
          });
          if (campaign) {
            persistCampaignRecord(
              campaign,
              nextPending,
              processedBattleIds,
              reviewedBattleIds,
            );
          }
          emitPendingOutcomeAddedEvent(campaign, outcome, nextPending.length);
        },

        dequeueOutcome: (matchId) => {
          const {
            campaign,
            pendingBattleOutcomes,
            processedBattleIds,
            reviewedBattleIds,
          } = get();
          const next = pendingBattleOutcomes.filter(
            (o) => o.matchId !== matchId,
          );
          if (next.length === pendingBattleOutcomes.length) return false;
          set({ pendingBattleOutcomes: next });
          if (campaign) {
            persistCampaignRecord(
              campaign,
              next,
              processedBattleIds,
              reviewedBattleIds,
            );
          }
          return true;
        },

        getPendingOutcomes: () => get().pendingBattleOutcomes,
        getPendingOutcomeCount: () => get().pendingBattleOutcomes.length,
        getProcessedBattleIds: () => get().processedBattleIds,
        reviewReady: (matchId) => {
          if (!matchId) return false;
          return get().pendingBattleOutcomes.some((o) => o.matchId === matchId);
        },

        markBattleReviewed: (matchId) => {
          if (!matchId) return;
          const { campaign, pendingBattleOutcomes, processedBattleIds } = get();
          const reviewedBattleIds = {
            ...get().reviewedBattleIds,
            [matchId]: Date.now(),
          };
          const nextPending = pendingBattleOutcomes.filter(
            (o) => o.matchId !== matchId,
          );
          set({
            reviewedBattleIds,
            pendingBattleOutcomes: nextPending,
          });
          if (campaign) {
            persistCampaignRecord(
              campaign,
              nextPending,
              processedBattleIds,
              reviewedBattleIds,
            );
          }
        },

        getReviewedAt: (matchId) => {
          if (!matchId) return null;
          return get().reviewedBattleIds[matchId] ?? null;
        },

        getOutcomeApplyErrors: () => get().outcomeApplyErrors,

        retryOutcomeApplication: (matchId) => {
          // Per Wave 5 §11.3: re-apply a single failing outcome on
          // demand. Looks the outcome up in the pending queue, runs the
          // post-battle apply path against the live campaign, and
          // either clears or refreshes the recorded error.
          if (!matchId) return false;
          const { campaign, pendingBattleOutcomes, outcomeApplyErrors } = get();
          if (!campaign) return false;
          const outcome = pendingBattleOutcomes.find(
            (o) => o.matchId === matchId,
          );
          if (!outcome) return false;

          try {
            const result = applyPostBattle(
              outcome,
              campaign as ICampaignWithBattleState,
            );
            const remaining = pendingBattleOutcomes.filter(
              (o) => o.matchId !== matchId,
            );
            // Strip the matchId from the error map by building a fresh
            // record (avoids unused-binding lint on rest-destructuring).
            const nextErrors: Record<string, string> = {};
            for (const [k, v] of Object.entries(outcomeApplyErrors)) {
              if (k !== matchId) nextErrors[k] = v;
            }
            set({
              campaign: result.campaign,
              pendingBattleOutcomes: remaining,
              processedBattleIds: [...get().processedBattleIds, matchId],
              outcomeApplyErrors: nextErrors,
            });
            get().saveCampaign();
            return true;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            set({
              outcomeApplyErrors: {
                ...outcomeApplyErrors,
                [matchId]: message,
              },
            });
            return false;
          }
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
            campaign: serializeCampaign(
              state.campaign,
              state.pendingBattleOutcomes,
              state.processedBattleIds,
              state.reviewedBattleIds,
            ),
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
          );

          return {
            ...current,
            campaign,
            pendingBattleOutcomes: serialized.pendingBattleOutcomes,
            processedBattleIds: serialized.processedBattleIds,
            reviewedBattleIds: serialized.reviewedBattleIds,
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
