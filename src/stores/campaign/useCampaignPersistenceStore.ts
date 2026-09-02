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

/**
 * A launch the authority refused because the campaign moved under
 * this client.
 *
 * Kept alongside the save conflict rather than folded into it: both
 * are "your view is stale", and since umbrella 8.3 both have the SAME
 * single honest move - resync to what the authority holds. They stay
 * separate because they carry different evidence: a launch refusal
 * names a branch head, a save refusal names a write version, and the
 * two are different numbers.
 */
export interface ICampaignLaunchConflict {
  /** STALE_BRANCH / STALE_REVISION / STALE_GENERATION / ownership. */
  readonly code: string;
  readonly reason: string;
  readonly activeHead: {
    readonly branchId: string;
    readonly revision: number;
    readonly effectiveGeneration: number;
  };
  readonly resyncAction: string;
}

/**
 * The server's typed refusal of a stale whole-envelope write (umbrella
 * 8.3/8.4).
 *
 * `currentVersion` is the campaigns-table write counter, NOT a journal
 * revision, and is named so on purpose: the two are different numbers and
 * conflating them is the trap the launch-head route documents.
 */
export interface ICampaignSaveConflict {
  readonly reason: string;
  readonly recoveryAction: string;
  readonly conflictingFields: readonly string[];
  readonly currentVersion: number;
}

export type CampaignPersistenceSaveResult =
  | {
      readonly status: 'saved';
      readonly record: SerializedCampaign;
    }
  | { readonly status: 'skipped' }
  | {
      readonly status: 'conflict';
      readonly conflictServerRecord: SerializedCampaign;
      readonly conflict: ICampaignSaveConflict | null;
    }
  | {
      readonly status: 'error';
      readonly errorMessage: string;
    };

interface CampaignPersistenceState {
  campaignId: string | null;
  dirty: boolean;
  saveState: CampaignSaveState;
  metadata: ICampaignSaveMetadata;
  baseVersion: number;
  errorMessage: string | null;
  conflictServerRecord: SerializedCampaign | null;
  /** The server's typed reason and safe recovery for the last 409. */
  saveConflict: ICampaignSaveConflict | null;
  /** Set when a launch was refused for a stale head or ownership. */
  launchConflict: ICampaignLaunchConflict | null;
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
  saveCampaign: () => Promise<CampaignPersistenceSaveResult>;
  markDirty: () => void;
  /**
   * Adopt the server's record and continue from there.
   *
   * The ONLY resolution. `resolveConflictKeepLocal` used to sit beside
   * this one and re-`PUT` the same stale envelope at the server's
   * version, which is an overwrite of whatever the other writer had just
   * committed - the strategy umbrella 8.3 removes. A stale envelope
   * cannot be rebased, because nothing on this boundary knows which
   * fields it changed.
   */
  resolveConflictTakeServer: () => Promise<boolean>;
  clearError: () => void;
  reportLaunchConflict: (conflict: ICampaignLaunchConflict) => void;
  clearLaunchConflict: () => void;
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
  saveConflict: null,
  launchConflict: null,
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
      readonly conflict: ICampaignSaveConflict | null;
    };

/**
 * Read a 409 body in the typed shape, falling back to the bare record.
 *
 * The fallback is not politeness to old servers: a client that threw on
 * an unexpected 409 body would turn a conflict it can safely recover from
 * into an error state, and the recovery - take the server's record - is
 * available either way. Absent typed fields surface as a null `conflict`
 * so the UI can say "changed elsewhere" without inventing a reason.
 */
function readConflictBody(body: unknown): {
  readonly record: SerializedCampaign;
  readonly conflict: ICampaignSaveConflict | null;
} {
  const typed = body as Partial<{
    kind: string;
    reason: string;
    recoveryAction: string;
    conflictingFields: readonly string[];
    currentVersion: number;
    current: SerializedCampaign;
  }>;
  if (
    typed?.kind === 'conflict' &&
    typeof typed.reason === 'string' &&
    typeof typed.recoveryAction === 'string' &&
    typeof typed.currentVersion === 'number' &&
    typed.current !== undefined
  ) {
    return {
      record: typed.current,
      conflict: {
        reason: typed.reason,
        recoveryAction: typed.recoveryAction,
        conflictingFields: typed.conflictingFields ?? [],
        currentVersion: typed.currentVersion,
      },
    };
  }
  return { record: body as SerializedCampaign, conflict: null };
}

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
    const { record, conflict } = readConflictBody(await response.json());
    return { status: 'conflict', conflictServerRecord: record, conflict };
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
): Promise<CampaignPersistenceSaveResult> {
  const queued = saveChain.then(() => runSave(set, get, baseVersionOverride));
  // The chain must survive a rejected write, or one failure would wedge every
  // later save. `runSave` resolves its own errors, so this is belt-and-braces.
  saveChain = queued.catch(() => undefined);
  return queued;
}

async function runSave(
  set: PersistenceSet,
  get: PersistenceGet,
  baseVersionOverride?: number,
): Promise<CampaignPersistenceSaveResult> {
  // A load in flight is about to replace `baseVersion`; writing before it
  // lands sends a version the server has already superseded.
  if (inFlightLoad !== null) {
    await inFlightLoad;
  }
  const campaign = readLiveCampaign();
  const campaignId = get().campaignId ?? campaign?.id ?? null;
  if (!campaign || !campaignId) {
    return { status: 'skipped' };
  }
  // An unadopted legacy copy must not become a server source by
  // accident. A plain create stamps a journal-native cutover marker, which
  // asserts the campaign's whole history lives in a journal that holds
  // none of it - and the D10 rollback law reads that same field. Adoption
  // is an explicit act through `adoptLegacyCampaign`.
  if (get().legacyUnadopted) {
    return { status: 'skipped' };
  }
  const baseVersion = baseVersionOverride ?? get().baseVersion;
  set({ saveState: 'saving', errorMessage: null });

  try {
    const attempt = await putLiveCampaign(campaignId, baseVersion);
    if (attempt.status === 'saved') {
      applySavedRecord(set, attempt.record);
      return { status: 'saved', record: attempt.record };
    }

    // ONE ATTEMPT. This used to re-`PUT` the same envelope at the version
    // the server just reported, which is not a retry - the compare-and-swap
    // was never the thing that failed. It was an overwrite: the second
    // write carried a body derived from a state that predates whatever the
    // other writer committed, and the server accepts it precisely because
    // the version now matches. Nothing detected the loss, so the only
    // symptom was version churn (the "409 retry-noise" residual).
    //
    // A whole envelope cannot be rebased here either, because this
    // boundary does not know which fields it changed - which is why the
    // server answers `base-state-unavailable` and the one safe move is to
    // take its record.
    set({
      saveState: 'conflict',
      conflictServerRecord: attempt.conflictServerRecord,
      saveConflict: attempt.conflict,
    });
    if (isCoopCampaign(campaign)) {
      // On the FIRST refusal now. Waiting for a second attempt used to
      // hide this; there is no second attempt, and a co-op client left
      // rendering a change the server refused is telling its player
      // something untrue.
      rollbackCoopCampaign(set, get, attempt.conflictServerRecord);
      notifyUnresolvedCoopSave(
        'Co-op campaign save was refused: the campaign changed elsewhere. Your local change was rolled back.',
      );
    }
    return {
      status: 'conflict',
      conflictServerRecord: attempt.conflictServerRecord,
      conflict: attempt.conflict,
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
    return { status: 'error', errorMessage: message };
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
      saveConflict: null,
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
    resolveConflictTakeServer: resolveConflictTakeServerAction(set, get),
    clearError: () => {
      set((state) =>
        state.saveState === 'error'
          ? { saveState: 'idle', errorMessage: null }
          : {},
      );
    },
    // A launch refusal is recorded, never thrown away into a message
    // string: the code and the active head are what let the surface offer
    // a resync instead of "something went wrong".
    reportLaunchConflict: (conflict) => {
      set({ launchConflict: conflict });
    },
    clearLaunchConflict: () => {
      set({ launchConflict: null });
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
