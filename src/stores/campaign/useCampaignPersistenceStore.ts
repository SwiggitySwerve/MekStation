/**
 * Campaign Persistence Store
 *
 * Owns the server-side save/load lifecycle for a campaign — dirty
 * tracking, debounced auto-save, manual save, load/restore, and a
 * save-state machine. Per design D6 it does NOT own campaign *content*:
 * the live `ICampaign` stays in `useCampaignStore`; this store reads from
 * it on save and writes into it on load.
 *
 * The auto-save debounce is 2 s after the last mutation (design D6,
 * matching `auto-save-persistence`'s batched-write cadence). A `409`
 * conflict surfaces both versions for the player to choose between; an
 * offline failure is non-fatal — local IndexedDB remains the source of
 * truth for offline play.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D6)
 */

import { create } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignSaveMetadata,
  SerializedCampaign,
} from '@/types/campaign/SerializedCampaign';

import {
  buildSerializedCampaign,
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  deserializeCampaignBody,
  getDeviceId,
  migrateSerializedCampaign,
} from '@/lib/campaign/persistence';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';

// =============================================================================
// Constants
// =============================================================================

/**
 * Auto-save debounce window. After the last campaign mutation the store
 * waits this long before issuing a `PUT` — rapid mutations coalesce into
 * one write (design D6).
 */
export const AUTO_SAVE_DEBOUNCE_MS = 2000;

// =============================================================================
// Types
// =============================================================================

/**
 * Save-state machine. `conflict` is terminal until the player resolves it
 * (keep-local / take-server); `error` is non-fatal and the next save
 * retries.
 */
export type CampaignSaveState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict';

interface CampaignPersistenceState {
  /** Id of the campaign currently bound to this store, or `null`. */
  campaignId: string | null;
  /** True when the live campaign has un-saved mutations. */
  dirty: boolean;
  /** Current save-state-machine position. */
  saveState: CampaignSaveState;
  /** Save metadata of the last successful server write. */
  metadata: ICampaignSaveMetadata;
  /** The monotonic `version` the client last read from the server. */
  baseVersion: number;
  /** Last error message, when `saveState === 'error'`. */
  errorMessage: string | null;
  /**
   * When `saveState === 'conflict'`: the server's record. The player
   * compares it against the local campaign and chooses.
   */
  conflictServerRecord: SerializedCampaign | null;
}

interface CampaignPersistenceActions {
  /** Fetch, migrate, deserialize campaign `id` and write it into the campaign store. */
  loadCampaign: (id: string) => Promise<boolean>;
  /** Issue an immediate `PUT` of the live campaign, bypassing the debounce. */
  saveCampaign: () => Promise<void>;
  /** Mark the live campaign dirty and (re-)arm the auto-save debounce. */
  markDirty: () => void;
  /** Resolve a conflict by re-`PUT`ing the local campaign over the server's version. */
  resolveConflictKeepLocal: () => Promise<void>;
  /** Resolve a conflict by loading the server's record over the local campaign. */
  resolveConflictTakeServer: () => Promise<boolean>;
  /** Clear a non-fatal error back to `idle`. */
  clearError: () => void;
  /** Reset the store (test/teardown). */
  reset: () => void;
}

export type CampaignPersistenceStore = CampaignPersistenceState &
  CampaignPersistenceActions;

// =============================================================================
// Initial state
// =============================================================================

const INITIAL_METADATA: ICampaignSaveMetadata = {
  lastSavedAt: null,
  schemaVersion: CURRENT_CAMPAIGN_SCHEMA_VERSION,
  originDeviceId: null,
  version: 0,
};

const INITIAL_STATE: CampaignPersistenceState = {
  campaignId: null,
  dirty: false,
  saveState: 'idle',
  metadata: INITIAL_METADATA,
  baseVersion: 0,
  errorMessage: null,
  conflictServerRecord: null,
};

// =============================================================================
// Module-scoped debounce timer
// =============================================================================

/**
 * The single in-flight auto-save timer. Kept module-scoped (not in store
 * state) so re-arming it never triggers a store re-render.
 */
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoSaveTimer(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// =============================================================================
// Live-campaign access
// =============================================================================

/**
 * Read the live campaign from `useCampaignStore` via the accessor seam.
 * Returns `null` when no campaign store is registered or no campaign is
 * loaded.
 */
function readLiveCampaign(): ICampaign | null {
  const store = getCampaignStoreForRoster();
  return store ? store.getState().campaign : null;
}

/**
 * Write a campaign into the live `useCampaignStore` via `updateCampaign`.
 */
function writeLiveCampaign(campaign: ICampaign): void {
  const store = getCampaignStoreForRoster();
  store?.getState().updateCampaign(campaign);
}

// =============================================================================
// Store
// =============================================================================

export const useCampaignPersistenceStore = create<CampaignPersistenceStore>()((
  set,
  get,
) => {
  /**
   * Serialize the current live campaign and `PUT` it to the server.
   * Shared by the debounced auto-save, the manual save, and the
   * keep-local conflict resolution. `baseVersionOverride` lets the
   * keep-local path force a re-PUT against the server's version.
   */
  const performSave = async (baseVersionOverride?: number): Promise<void> => {
    const campaign = readLiveCampaign();
    const campaignId = get().campaignId ?? campaign?.id ?? null;
    if (!campaign || !campaignId) {
      return;
    }
    // Snapshot the campaign object reference now — day advancement
    // produces a NEW campaign object, so an in-flight save serializes a
    // consistent prior state (design D6 race mitigation).
    const snapshot = campaign;
    const baseVersion = baseVersionOverride ?? get().baseVersion;
    const deviceId = getDeviceId();
    const envelope = buildSerializedCampaign(
      snapshot,
      deviceId,
      baseVersion + 1,
    );

    set({ saveState: 'saving', errorMessage: null });

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ envelope, baseVersion }),
        },
      );

      if (response.status === 409) {
        // Stale write — the campaign was changed elsewhere. Surface
        // both versions; do not overwrite (design D5).
        const serverRecord = (await response.json()) as SerializedCampaign;
        set({
          saveState: 'conflict',
          conflictServerRecord: serverRecord,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`server responded ${response.status}`);
      }

      const stored = (await response.json()) as SerializedCampaign;
      set({
        saveState: 'saved',
        dirty: false,
        baseVersion: stored.version,
        conflictServerRecord: null,
        errorMessage: null,
        metadata: {
          lastSavedAt: stored.savedAt,
          schemaVersion: stored.schemaVersion,
          originDeviceId: stored.originDeviceId,
          version: stored.version,
        },
      });
    } catch (error) {
      // Offline / network failure is non-fatal — local IndexedDB
      // remains the source of truth; the next save retries (design D5).
      const message = error instanceof Error ? error.message : 'save failed';
      set({ saveState: 'error', errorMessage: message });
    }
  };

  return {
    ...INITIAL_STATE,

    loadCampaign: async (id: string): Promise<boolean> => {
      set({ saveState: 'saving', errorMessage: null });
      try {
        const response = await fetch(
          `/api/campaigns/${encodeURIComponent(id)}`,
        );
        if (response.status === 404) {
          set({ saveState: 'idle', errorMessage: 'campaign not found' });
          return false;
        }
        if (!response.ok) {
          throw new Error(`server responded ${response.status}`);
        }
        const raw = (await response.json()) as SerializedCampaign;
        // Run the migration ladder on read so an older-schema snapshot
        // is upgraded before deserialization (design D4).
        const migrated = migrateSerializedCampaign(raw);
        const campaign = deserializeCampaignBody(migrated.body);
        writeLiveCampaign(campaign);
        set({
          campaignId: id,
          dirty: false,
          saveState: 'saved',
          baseVersion: migrated.version,
          conflictServerRecord: null,
          errorMessage: null,
          metadata: {
            lastSavedAt: migrated.savedAt,
            schemaVersion: migrated.schemaVersion,
            originDeviceId: migrated.originDeviceId,
            version: migrated.version,
          },
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'load failed';
        set({ saveState: 'error', errorMessage: message });
        return false;
      }
    },

    saveCampaign: async (): Promise<void> => {
      // Manual save — bypass the debounce, write immediately.
      clearAutoSaveTimer();
      await performSave();
    },

    markDirty: (): void => {
      // Bind the campaign id from the live campaign on first mutation.
      const liveId = readLiveCampaign()?.id ?? null;
      set((state) => ({
        dirty: true,
        campaignId: state.campaignId ?? liveId,
        // Re-entering dirty from a saved/error/conflict resting state
        // moves us back toward idle until the debounce fires.
        saveState:
          state.saveState === 'conflict' ? 'conflict' : state.saveState,
      }));
      // (Re-)arm the debounce — rapid mutations coalesce (design D6).
      clearAutoSaveTimer();
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        // A conflict must be resolved by the player before auto-save
        // resumes — do not silently overwrite the server.
        if (get().saveState === 'conflict') {
          return;
        }
        void performSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    },

    resolveConflictKeepLocal: async (): Promise<void> => {
      const serverRecord = get().conflictServerRecord;
      if (!serverRecord) {
        return;
      }
      // Re-PUT the local campaign using the server's version as the
      // new baseVersion so the write is no longer stale.
      await performSave(serverRecord.version);
    },

    resolveConflictTakeServer: async (): Promise<boolean> => {
      const serverRecord = get().conflictServerRecord;
      if (!serverRecord) {
        return false;
      }
      const migrated = migrateSerializedCampaign(serverRecord);
      const campaign = deserializeCampaignBody(migrated.body);
      writeLiveCampaign(campaign);
      set({
        campaignId: migrated.campaignId,
        dirty: false,
        saveState: 'saved',
        baseVersion: migrated.version,
        conflictServerRecord: null,
        errorMessage: null,
        metadata: {
          lastSavedAt: migrated.savedAt,
          schemaVersion: migrated.schemaVersion,
          originDeviceId: migrated.originDeviceId,
          version: migrated.version,
        },
      });
      return true;
    },

    clearError: (): void => {
      set((state) =>
        state.saveState === 'error'
          ? { saveState: 'idle', errorMessage: null }
          : {},
      );
    },

    reset: (): void => {
      clearAutoSaveTimer();
      set({ ...INITIAL_STATE });
    },
  };
});
