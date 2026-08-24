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
import { evaluateCampaignAdoptionOffer } from '@/lib/campaign/authority/campaignLegacyAdoption';
import {
  buildSerializedCampaign,
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  deserializeCampaignBody,
  getDeviceId,
  migrateSerializedCampaign,
} from '@/lib/campaign/persistence';
import {
  campaignCacheKeyOf,
  evaluateCampaignCache,
} from '@/lib/campaign/persistence/campaignCacheKey';
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
  /**
   * True when the browser holds a campaign this server has never seen and
   * that arrived by storage rehydration - a legacy copy awaiting adoption
   * (D8). Such a copy is readable but unshareable, and deliberately does
   * NOT auto-save: see the guard in `runSave`.
   */
  legacyUnadopted: boolean;
}

interface CampaignPersistenceActions {
  loadCampaign: (id: string) => Promise<boolean>;
  adoptLegacyCampaign: () => Promise<boolean>;
  saveCampaign: (options?: {
    retryOnConflict?: boolean;
  }) => Promise<CampaignPersistenceSaveResult>;
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
  // Never saved: the hosting instance and its authority are UNKNOWN.
  // Null rather than a source default - claiming source authority for a
  // record that was never written is exactly the silent inference D2
  // forbids.
  instanceId: null,
  authority: null,
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
  legacyUnadopted: false,
};

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * The load currently in flight, if any. `baseVersion` is the compare-and-swap
 * token for the next write, and a load replaces it with the server's current
 * version. A save that reads the token while a load is running would send a
 * version the server has already moved past, so every write waits here first.
 */
let inFlightLoad: Promise<boolean> | null = null;

/**
 * Tail of the serialized write chain. Two overlapping writes would both read
 * the same `baseVersion`, so the later one is guaranteed to lose the
 * compare-and-swap; queueing makes the second read the version the first
 * produced.
 */
let saveChain: Promise<unknown> = Promise.resolve();

/**
 * Test seam: drop the module-level load/save coordination between cases.
 * Production code never calls this - the guards live for the page's lifetime.
 */
export function __resetCampaignPersistenceCoordinationForTests(): void {
  inFlightLoad = null;
  saveChain = Promise.resolve();
}

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

/**
 * The campaign store's own report of whether the campaign it holds came
 * from storage. This is a fact about the browser, never a claim about the
 * server, which is what makes it safe to base the adoption offer on.
 */
function readRehydratedCampaignId(): string | null {
  const store = getCampaignStoreForRoster();
  return store?.getState().rehydratedCampaignId ?? null;
}

/** The identity the browser's persisted copy currently claims. */
function readCachedCampaignKey(): ReturnType<typeof campaignCacheKeyOf> | null {
  const store = getCampaignStoreForRoster();
  return store?.getState().cachedCampaignKey ?? null;
}

/**
 * Stamps the identity of the record this client now holds. Called on
 * every authoritative read and write, so the cache's claim about itself
 * is only ever set from a record the server actually returned.
 */
function writeCachedCampaignKey(record: SerializedCampaign): void {
  const store = getCampaignStoreForRoster();
  store?.getState().setCachedCampaignKey?.(campaignCacheKeyOf(record));
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
    instanceId: record.instanceId,
    authority: record.authority,
  };
}

/**
 * Client-side migration.
 *
 * `migrateSerializedCampaign` needs a host instance id to backfill a
 * pre-D2 record, but the BROWSER is not a hosting server and must not
 * invent one. A record read from the server already carries its
 * instanceId; only a legacy browser-local snapshot lacks it, and for
 * that case the device id is a placeholder the server overwrites on the
 * next authoritative write (the same fallback `buildSerializedCampaign`
 * uses). Expressed once here rather than at each call site.
 */
function migrateClientRecord(record: SerializedCampaign): SerializedCampaign {
  return migrateSerializedCampaign(record, record.instanceId ?? getDeviceId());
}

function deserializeCampaignRecord(record: SerializedCampaign): ICampaign {
  return deserializeCampaignBody(migrateClientRecord(record).body);
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
  writeCachedCampaignKey(record);
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
    const migrated = migrateClientRecord(fallbackServerRecord);
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

/**
 * Queue one write behind any write already running. Serializing is what makes
 * `baseVersion` a usable compare-and-swap token: concurrent callers otherwise
 * read the same token and every caller after the first is rejected as stale.
 */
function performSave(
  set: PersistenceSet,
  get: PersistenceGet,
  baseVersionOverride?: number,
  retryOnConflict = true,
): Promise<CampaignPersistenceSaveResult> {
  const queued = saveChain.then(() =>
    runSave(set, get, baseVersionOverride, retryOnConflict),
  );
  // The chain must survive a rejected write, or one failure would wedge every
  // later save. `runSave` resolves its own errors, so this is belt-and-braces.
  saveChain = queued.catch(() => undefined);
  return queued;
}

async function runSave(
  set: PersistenceSet,
  get: PersistenceGet,
  baseVersionOverride?: number,
  retryOnConflict = true,
): Promise<CampaignPersistenceSaveResult> {
  // A load in flight is about to replace `baseVersion`; writing before it
  // lands sends a version the server has already superseded.
  if (inFlightLoad !== null) {
    await inFlightLoad;
  }
  const campaign = readLiveCampaign();
  const campaignId = get().campaignId ?? campaign?.id ?? null;
  if (!campaign || !campaignId) {
    return { status: 'skipped', retriedConflict: false };
  }
  // An unadopted legacy copy must not become a server source by
  // accident. A plain create stamps a journal-native cutover marker, which
  // asserts the campaign's whole history lives in a journal that holds
  // none of it - and the D10 rollback law reads that same field. Adoption
  // is an explicit act through `adoptLegacyCampaign`.
  if (get().legacyUnadopted) {
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
  return (id: string) => {
    // Published for the duration so a concurrent write waits for the version
    // this load establishes instead of racing it.
    const load = runLoad(set, id);
    inFlightLoad = load;
    return load.finally(() => {
      if (inFlightLoad === load) {
        inFlightLoad = null;
      }
    });
  };
}

async function runLoad(set: PersistenceSet, id: string): Promise<boolean> {
  {
    set({ saveState: 'saving', errorMessage: null });
    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      if (response.status === 404) {
        // Not every missing record is an error. A campaign the browser
        // rehydrated from storage that this server has never held is a
        // legacy copy from before campaigns became server-owned; the
        // honest response is an adoption offer, not "not found".
        const offer = evaluateCampaignAdoptionOffer({
          campaignId: id,
          browserCampaignId: readLiveCampaign()?.id ?? null,
          rehydratedCampaignId: readRehydratedCampaignId(),
          serverLookup: 'absent',
        });
        if (offer.kind === 'adoptable') {
          set({
            saveState: 'idle',
            errorMessage: null,
            legacyUnadopted: true,
          });
          return false;
        }
        set({ saveState: 'idle', errorMessage: 'campaign not found' });
        return false;
      }
      if (!response.ok) {
        throw new Error(`server responded ${response.status}`);
      }
      const migrated = migrateClientRecord(
        (await response.json()) as SerializedCampaign,
      );
      // Task 1.3: the cache is keyed, so "is this copy the same thing?"
      // is answered rather than assumed. A copy naming the same instance
      // at the same revision is the server's own record and is left
      // alone; anything else is REPLACED WHOLE. There is no merge -
      // reconciling field by field would assemble a campaign that never
      // existed on either side.
      const verdict = evaluateCampaignCache(
        readCachedCampaignKey(),
        campaignCacheKeyOf(migrated),
      );
      const liveCampaign = readLiveCampaign();
      const cacheStands =
        verdict.kind === 'usable' && liveCampaign?.id === migrated.campaignId;
      const loadedCampaign = cacheStands
        ? liveCampaign
        : preserveGuestCoopSession(
            deserializeCampaignRecord(migrated),
            liveCampaign,
          );
      if (!cacheStands) {
        writeLiveCampaign(loadedCampaign);
        restoreRosterProjection(id, migrated.body.rosterProjection);
      }
      writeCachedCampaignKey(migrated);
      set({
        campaignId: id,
        dirty: false,
        saveState: 'saved',
        baseVersion: migrated.version,
        conflictServerRecord: null,
        errorMessage: null,
        metadata: metadataFrom(migrated),
        lastPersistedCampaign: loadedCampaign,
        legacyUnadopted: false,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'load failed';
      set({ saveState: 'error', errorMessage: message });
      return false;
    }
  }
}

/**
 * Hand this browser's legacy copy to the server as its source instance.
 * The envelope is built at the version the copy actually carries, so the
 * server records what was imported rather than inventing a fresh history.
 */
async function runAdoptLegacyCampaign(
  set: PersistenceSet,
  get: PersistenceGet,
): Promise<boolean> {
  const campaign = readLiveCampaign();
  const campaignId = get().campaignId ?? campaign?.id ?? null;
  if (!campaign || !campaignId) {
    return false;
  }
  // Either a load already found this copy unadopted, or it came out of
  // storage and the campaigns index is offering it. Whether adoption is
  // actually permitted is the server's answer, not a guess made here.
  const offered =
    get().legacyUnadopted || readRehydratedCampaignId() === campaignId;
  if (!offered) {
    return false;
  }
  set({ saveState: 'saving', errorMessage: null });
  try {
    const envelope = buildSerializedCampaign(
      campaign,
      getDeviceId(),
      get().metadata.version,
      readLiveRosterSnapshot(campaign.id),
    );
    const response = await fetch(
      `/api/campaigns/${encodeURIComponent(campaignId)}/adopt`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope }),
      },
    );
    if (!response.ok) {
      throw new Error(`server responded ${response.status}`);
    }
    const record = (await response.json()) as SerializedCampaign;
    applySavedRecord(set, record);
    // The browser copy is now a cache of a server-held campaign.
    set({ legacyUnadopted: false });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'adoption failed';
    set({ saveState: 'error', errorMessage: message });
    return false;
  }
}

function saveCampaignAction(
  set: PersistenceSet,
  get: PersistenceGet,
): CampaignPersistenceStore['saveCampaign'] {
  return async (options?: { retryOnConflict?: boolean }) => {
    clearAutoSaveTimer();
    return performSave(set, get, undefined, options?.retryOnConflict ?? true);
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
    const migrated = migrateClientRecord(serverRecord);
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
    adoptLegacyCampaign: () => runAdoptLegacyCampaign(set, get),
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
      inFlightLoad = null;
      saveChain = Promise.resolve();
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
