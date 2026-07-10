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
  SerializedCampaignRosterEntry,
  SerializedCampaignRosterMissionRecord,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import { toast } from '@/components/shared/Toast';
import {
  buildSerializedCampaign,
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  deserializeCampaignBody,
  getDeviceId,
  migrateSerializedCampaign,
} from '@/lib/campaign/persistence';
import { backfillLegacyRosterUnitRefs } from '@/lib/campaign/wizard/legacyRosterUnitBackfill';
import { Money } from '@/types/campaign/Money';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignRosterStore } from './useCampaignRosterStore';

export const AUTO_SAVE_DEBOUNCE_MS = 2000;

export type CampaignSaveState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict';

export type CampaignPersistenceSaveResult =
  | {
      readonly status: 'saved';
      readonly record: SerializedCampaign;
      readonly retriedConflict: boolean;
    }
  | { readonly status: 'skipped'; readonly retriedConflict: false }
  | {
      readonly status: 'conflict';
      readonly conflictServerRecord: SerializedCampaign;
      readonly retriedConflict: boolean;
    }
  | {
      readonly status: 'error';
      readonly errorMessage: string;
      readonly retriedConflict: boolean;
    };

interface CampaignPersistenceState {
  campaignId: string | null;
  dirty: boolean;
  saveState: CampaignSaveState;
  metadata: ICampaignSaveMetadata;
  baseVersion: number;
  errorMessage: string | null;
  conflictServerRecord: SerializedCampaign | null;
  lastPersistedCampaign: ICampaign | null;
}

interface CampaignPersistenceActions {
  loadCampaign: (id: string) => Promise<boolean>;
  saveCampaign: () => Promise<CampaignPersistenceSaveResult>;
  markDirty: () => void;
  resolveConflictKeepLocal: () => Promise<CampaignPersistenceSaveResult>;
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
  lastPersistedCampaign: null,
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
  store?.getState().switchCampaign(campaign);
}

function preserveGuestCoopSession(
  loadedCampaign: ICampaign,
  currentCampaign: ICampaign | null,
): ICampaign {
  if (
    currentCampaign?.id !== loadedCampaign.id ||
    currentCampaign.coopSession?.mode !== 'guest'
  ) {
    return loadedCampaign;
  }
  return {
    ...loadedCampaign,
    coopSession: currentCampaign.coopSession,
  };
}

function isCoopCampaign(campaign: ICampaign | null): boolean {
  return Boolean(campaign?.coopSession);
}

function dateToIso(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function deserializeOptionalDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serializeRosterEntry(
  entry: ReturnType<typeof useCampaignRosterStore.getState>['pilots'][number],
): SerializedCampaignRosterEntry {
  const { hireDate, lastPromotionDate, salary, ...rest } = entry;
  const serialized: SerializedCampaignRosterEntry = {
    ...rest,
    hireDate: dateToIso(hireDate) ?? new Date(0).toISOString(),
  };
  const promotionDate = dateToIso(lastPromotionDate);
  return {
    ...serialized,
    ...(salary ? { salary: salary.amount } : {}),
    ...(promotionDate ? { lastPromotionDate: promotionDate } : {}),
  };
}

function deserializeRosterEntry(
  entry: SerializedCampaignRosterEntry,
): ReturnType<typeof useCampaignRosterStore.getState>['pilots'][number] {
  const { hireDate, lastPromotionDate, salary, ...rest } = entry;
  return {
    ...rest,
    hireDate: deserializeOptionalDate(hireDate) ?? new Date(0),
    ...(salary !== undefined ? { salary: new Money(salary) } : {}),
    ...(lastPromotionDate
      ? { lastPromotionDate: deserializeOptionalDate(lastPromotionDate) }
      : {}),
  };
}

function cloneRosterMission(
  mission: ReturnType<
    typeof useCampaignRosterStore.getState
  >['missions'][number],
): SerializedCampaignRosterMissionRecord {
  return {
    ...mission,
    deployedUnitIds: [...mission.deployedUnitIds],
  };
}

function readLiveRosterSnapshot(
  campaignId: string,
): SerializedCampaignRosterState | undefined {
  const roster = useCampaignRosterStore.getState();
  if (roster.campaignId !== campaignId) {
    return undefined;
  }
  return {
    campaignId,
    units: roster.units.map((unit) => ({ ...unit })),
    pilots: roster.pilots.map(serializeRosterEntry),
    missions: roster.missions.map(cloneRosterMission),
    activeMissionId: roster.activeMissionId,
    missionCount: roster.missionCount,
  };
}

function restoreRosterProjection(
  campaignId: string,
  rosterProjection: SerializedCampaignRosterState | undefined,
): void {
  if (!rosterProjection) {
    const roster = useCampaignRosterStore.getState();
    if (roster.campaignId !== campaignId) {
      roster.initRoster(campaignId);
    }
    return;
  }

  useCampaignRosterStore.setState({
    campaignId,
    units: backfillLegacyRosterUnitRefs(
      rosterProjection.units.map((unit) => ({ ...unit })),
      {
        campaignId,
        source: 'server-roster-projection-load',
      },
    ),
    pilots: rosterProjection.pilots.map(deserializeRosterEntry),
    missions: rosterProjection.missions.map((mission) => ({
      ...mission,
      deployedUnitIds: [...mission.deployedUnitIds],
    })),
    activeMissionId: rosterProjection.activeMissionId,
    missionCount: rosterProjection.missionCount,
  });
}

function metadataFrom(record: SerializedCampaign): ICampaignSaveMetadata {
  return {
    lastSavedAt: record.savedAt,
    schemaVersion: record.schemaVersion,
    originDeviceId: record.originDeviceId,
    version: record.version,
  };
}

function deserializeCampaignRecord(record: SerializedCampaign): ICampaign {
  return deserializeCampaignBody(migrateSerializedCampaign(record).body);
}

type SaveAttemptResult =
  | { readonly status: 'saved'; readonly record: SerializedCampaign }
  | {
      readonly status: 'conflict';
      readonly conflictServerRecord: SerializedCampaign;
    };

async function putLiveCampaign(
  campaignId: string,
  baseVersion: number,
): Promise<SaveAttemptResult> {
  const campaign = readLiveCampaign();
  if (!campaign) {
    throw new Error('no live campaign to save');
  }
  const envelope = buildSerializedCampaign(
    campaign,
    getDeviceId(),
    baseVersion + 1,
    readLiveRosterSnapshot(campaign.id),
  );
  const response = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope, baseVersion }),
    },
  );
  if (response.status === 409) {
    return {
      status: 'conflict',
      conflictServerRecord: (await response.json()) as SerializedCampaign,
    };
  }
  if (!response.ok) {
    throw new Error(`server responded ${response.status}`);
  }
  return {
    status: 'saved',
    record: (await response.json()) as SerializedCampaign,
  };
}

function applySavedRecord(
  set: PersistenceSet,
  record: SerializedCampaign,
): void {
  const persistedCampaign = deserializeCampaignRecord(record);
  set({
    campaignId: record.campaignId,
    saveState: 'saved',
    dirty: false,
    baseVersion: record.version,
    conflictServerRecord: null,
    errorMessage: null,
    metadata: metadataFrom(record),
    lastPersistedCampaign: persistedCampaign,
  });
}

function rollbackCoopCampaign(
  set: PersistenceSet,
  get: PersistenceGet,
  fallbackServerRecord?: SerializedCampaign,
): void {
  const rollbackCampaign = fallbackServerRecord
    ? deserializeCampaignRecord(fallbackServerRecord)
    : get().lastPersistedCampaign;
  if (rollbackCampaign) {
    writeLiveCampaign(rollbackCampaign);
  }
  if (fallbackServerRecord) {
    const migrated = migrateSerializedCampaign(fallbackServerRecord);
    restoreRosterProjection(
      migrated.campaignId,
      migrated.body.rosterProjection,
    );
    set({
      baseVersion: migrated.version,
      metadata: metadataFrom(migrated),
      lastPersistedCampaign: rollbackCampaign,
    });
  }
  clearAutoSaveTimer();
  set({ dirty: false });
}

function notifyUnresolvedCoopSave(message: string): void {
  toast({
    message,
    variant: 'error',
    duration: 7000,
  });
}

async function performSave(
  set: PersistenceSet,
  get: PersistenceGet,
  baseVersionOverride?: number,
  retryOnConflict = true,
): Promise<CampaignPersistenceSaveResult> {
  const campaign = readLiveCampaign();
  const campaignId = get().campaignId ?? campaign?.id ?? null;
  if (!campaign || !campaignId) {
    return { status: 'skipped', retriedConflict: false };
  }
  const baseVersion = baseVersionOverride ?? get().baseVersion;
  set({ saveState: 'saving', errorMessage: null });
  let retriedConflict = false;

  try {
    const first = await putLiveCampaign(campaignId, baseVersion);
    if (first.status === 'saved') {
      applySavedRecord(set, first.record);
      return {
        status: 'saved',
        record: first.record,
        retriedConflict: false,
      };
    }

    set({
      saveState: 'conflict',
      conflictServerRecord: first.conflictServerRecord,
    });
    if (retryOnConflict) {
      retriedConflict = true;
      const retry = await putLiveCampaign(
        campaignId,
        first.conflictServerRecord.version,
      );
      if (retry.status === 'saved') {
        applySavedRecord(set, retry.record);
        return {
          status: 'saved',
          record: retry.record,
          retriedConflict: true,
        };
      }
      set({
        saveState: 'conflict',
        conflictServerRecord: retry.conflictServerRecord,
      });
      if (isCoopCampaign(campaign)) {
        rollbackCoopCampaign(set, get, retry.conflictServerRecord);
        notifyUnresolvedCoopSave(
          'Co-op campaign save failed after a version refresh. Your local change was rolled back.',
        );
      }
      return {
        status: 'conflict',
        conflictServerRecord: retry.conflictServerRecord,
        retriedConflict: true,
      };
    }

    return {
      status: 'conflict',
      conflictServerRecord: first.conflictServerRecord,
      retriedConflict: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'save failed';
    if (isCoopCampaign(campaign)) {
      rollbackCoopCampaign(set, get);
      notifyUnresolvedCoopSave(
        `Co-op campaign save failed: ${message}. Your local change was rolled back.`,
      );
    }
    set({ saveState: 'error', errorMessage: message });
    return { status: 'error', errorMessage: message, retriedConflict };
  }
}

function loadCampaignAction(
  set: PersistenceSet,
): CampaignPersistenceStore['loadCampaign'] {
  return async (id: string) => {
    set({ saveState: 'saving', errorMessage: null });
    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
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
      const loadedCampaign = preserveGuestCoopSession(
        deserializeCampaignRecord(migrated),
        readLiveCampaign(),
      );
      writeLiveCampaign(loadedCampaign);
      restoreRosterProjection(id, migrated.body.rosterProjection);
      set({
        campaignId: id,
        dirty: false,
        saveState: 'saved',
        baseVersion: migrated.version,
        conflictServerRecord: null,
        errorMessage: null,
        metadata: metadataFrom(migrated),
        lastPersistedCampaign: loadedCampaign,
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
    return performSave(set, get);
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
    if (isCoopCampaign(readLiveCampaign())) {
      return;
    }
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
      return { status: 'skipped', retriedConflict: false };
    }
    return performSave(set, get, serverRecord.version, false);
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
    const serverCampaign = deserializeCampaignRecord(migrated);
    writeLiveCampaign(serverCampaign);
    restoreRosterProjection(
      migrated.campaignId,
      migrated.body.rosterProjection,
    );
    set({
      campaignId: migrated.campaignId,
      dirty: false,
      saveState: 'saved',
      baseVersion: migrated.version,
      conflictServerRecord: null,
      errorMessage: null,
      metadata: metadataFrom(migrated),
      lastPersistedCampaign: serverCampaign,
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
