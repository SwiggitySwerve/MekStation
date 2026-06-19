/**
 * Campaign Persistence Store
 *
 * Owns the server-side save/load lifecycle for a campaign: dirty
 * tracking, debounced auto-save, manual save, load/restore, and a
 * save-state machine. Campaign content stays in `useCampaignStore`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D6)
 */

import { create, type StateCreator } from 'zustand';

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

export const AUTO_SAVE_DEBOUNCE_MS = 2000;

export type CampaignSaveState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict';

interface CampaignPersistenceState {
  campaignId: string | null;
  dirty: boolean;
  saveState: CampaignSaveState;
  metadata: ICampaignSaveMetadata;
  baseVersion: number;
  errorMessage: string | null;
  conflictServerRecord: SerializedCampaign | null;
}

interface CampaignPersistenceActions {
  loadCampaign: (id: string) => Promise<boolean>;
  saveCampaign: () => Promise<void>;
  markDirty: () => void;
  resolveConflictKeepLocal: () => Promise<void>;
  resolveConflictTakeServer: () => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

export type CampaignPersistenceStore = CampaignPersistenceState &
  CampaignPersistenceActions;

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

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

type PersistenceSet = Parameters<StateCreator<CampaignPersistenceStore>>[0];
type PersistenceGet = Parameters<StateCreator<CampaignPersistenceStore>>[1];

function clearAutoSaveTimer(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

function readLiveCampaign(): ICampaign | null {
  const store = getCampaignStoreForRoster();
  return store ? store.getState().campaign : null;
}

function writeLiveCampaign(campaign: ICampaign): void {
  const store = getCampaignStoreForRoster();
  store?.getState().updateCampaign(campaign);
}

function metadataFrom(record: SerializedCampaign): ICampaignSaveMetadata {
  return {
    lastSavedAt: record.savedAt,
    schemaVersion: record.schemaVersion,
    originDeviceId: record.originDeviceId,
    version: record.version,
  };
}

async function performSave(
  set: PersistenceSet,
  get: PersistenceGet,
  baseVersionOverride?: number,
): Promise<void> {
  const campaign = readLiveCampaign();
  const campaignId = get().campaignId ?? campaign?.id ?? null;
  if (!campaign || !campaignId) {
    return;
  }
  const baseVersion = baseVersionOverride ?? get().baseVersion;
  const envelope = buildSerializedCampaign(
    campaign,
    getDeviceId(),
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
    await handleSaveResponse(set, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'save failed';
    set({ saveState: 'error', errorMessage: message });
  }
}

async function handleSaveResponse(
  set: PersistenceSet,
  response: Response,
): Promise<void> {
  if (response.status === 409) {
    const serverRecord = (await response.json()) as SerializedCampaign;
    set({ saveState: 'conflict', conflictServerRecord: serverRecord });
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
    metadata: metadataFrom(stored),
  });
}

function loadCampaignAction(
  set: PersistenceSet,
): CampaignPersistenceStore['loadCampaign'] {
  return async (id: string) => {
    set({ saveState: 'saving', errorMessage: null });
    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`);
      if (response.status === 404) {
        set({ saveState: 'idle', errorMessage: 'campaign not found' });
        return false;
      }
      if (!response.ok) {
        throw new Error(`server responded ${response.status}`);
      }
      const migrated = migrateSerializedCampaign(
        (await response.json()) as SerializedCampaign,
      );
      writeLiveCampaign(deserializeCampaignBody(migrated.body));
      set({
        campaignId: id,
        dirty: false,
        saveState: 'saved',
        baseVersion: migrated.version,
        conflictServerRecord: null,
        errorMessage: null,
        metadata: metadataFrom(migrated),
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'load failed';
      set({ saveState: 'error', errorMessage: message });
      return false;
    }
  };
}

function saveCampaignAction(
  set: PersistenceSet,
  get: PersistenceGet,
): CampaignPersistenceStore['saveCampaign'] {
  return async () => {
    clearAutoSaveTimer();
    await performSave(set, get);
  };
}

function markDirtyAction(
  set: PersistenceSet,
  get: PersistenceGet,
): CampaignPersistenceStore['markDirty'] {
  return () => {
    const liveId = readLiveCampaign()?.id ?? null;
    set((state) => ({
      dirty: true,
      campaignId: state.campaignId ?? liveId,
      saveState: state.saveState === 'conflict' ? 'conflict' : state.saveState,
    }));
    clearAutoSaveTimer();
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      if (get().saveState === 'conflict') {
        return;
      }
      void performSave(set, get);
    }, AUTO_SAVE_DEBOUNCE_MS);
  };
}

function resolveConflictKeepLocalAction(
  set: PersistenceSet,
  get: PersistenceGet,
): CampaignPersistenceStore['resolveConflictKeepLocal'] {
  return async () => {
    const serverRecord = get().conflictServerRecord;
    if (!serverRecord) {
      return;
    }
    await performSave(set, get, serverRecord.version);
  };
}

function resolveConflictTakeServerAction(
  set: PersistenceSet,
  get: PersistenceGet,
): CampaignPersistenceStore['resolveConflictTakeServer'] {
  return async () => {
    const serverRecord = get().conflictServerRecord;
    if (!serverRecord) {
      return false;
    }
    const migrated = migrateSerializedCampaign(serverRecord);
    writeLiveCampaign(deserializeCampaignBody(migrated.body));
    set({
      campaignId: migrated.campaignId,
      dirty: false,
      saveState: 'saved',
      baseVersion: migrated.version,
      conflictServerRecord: null,
      errorMessage: null,
      metadata: metadataFrom(migrated),
    });
    return true;
  };
}

function createPersistenceActions(
  set: PersistenceSet,
  get: PersistenceGet,
): CampaignPersistenceActions {
  return {
    loadCampaign: loadCampaignAction(set),
    saveCampaign: saveCampaignAction(set, get),
    markDirty: markDirtyAction(set, get),
    resolveConflictKeepLocal: resolveConflictKeepLocalAction(set, get),
    resolveConflictTakeServer: resolveConflictTakeServerAction(set, get),
    clearError: () => {
      set((state) =>
        state.saveState === 'error'
          ? { saveState: 'idle', errorMessage: null }
          : {},
      );
    },
    reset: () => {
      clearAutoSaveTimer();
      set({ ...INITIAL_STATE });
    },
  };
}

export const useCampaignPersistenceStore = create<CampaignPersistenceStore>()(
  (set, get) => ({
    ...INITIAL_STATE,
    ...createPersistenceActions(set, get),
  }),
);
