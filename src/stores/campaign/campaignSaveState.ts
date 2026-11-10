/**
 * Pure owner of campaign persistence transitions. Effects remain in
 * useCampaignPersistenceStore; see campaignSaveState.RULES.md for ordering.
 * @spec openspec/changes/extract-campaign-save-reducer/specs/campaign-persistence/spec.md
 * @spec openspec/changes/route-campaign-save-writers/specs/campaign-persistence/spec.md
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignSaveMetadata,
  ICampaignSourceReplayFence,
  SerializedCampaign,
} from '@/types/campaign/SerializedCampaign';

import { CURRENT_CAMPAIGN_SCHEMA_VERSION } from '@/lib/campaign/persistence/campaignMigration';

export type CampaignFlushSkipReason = 'envelope-over-keepalive-cap';

/** A measured refusal to send an over-budget discard-time request. */
export interface ICampaignFlushSkip {
  readonly reason: CampaignFlushSkipReason;
  readonly campaignId: string;
  readonly byteLength: number;
  readonly capBytes: number;
}

/** Launch heads and save row versions are distinct evidence, never interchangeable. */
export interface ICampaignLaunchConflict {
  readonly code: string;
  readonly reason: string;
  readonly activeHead: {
    readonly branchId: string;
    readonly revision: number;
    readonly effectiveGeneration: number;
  };
  readonly resyncAction: string;
}

/** Typed evidence accompanying a stale whole-envelope write's 409. */
export interface ICampaignSaveConflict {
  readonly reason: string;
  readonly recoveryAction: string;
  readonly conflictingFields: readonly string[];
  /** Campaign row write counter, not a journal revision. */
  readonly currentVersion: number;
}

/** A typed 401/403 live-host refusal keeps pending changes; it is not a conflict. */
export interface ICampaignSaveRefusal {
  readonly code: string;
  readonly reason: string;
  readonly message: string;
}

interface ICampaignSaveContext {
  campaignId: string | null;
  dirty: boolean;
  /** Save acknowledgments only cover their captured mutation sequence. */
  editSeq: number;
  metadata: ICampaignSaveMetadata;
  baseVersion: number;
  errorMessage: string | null;
  conflictServerRecord: SerializedCampaign | null;
  saveConflict: ICampaignSaveConflict | null;
  saveRefusal: ICampaignSaveRefusal | null;
  launchConflict: ICampaignLaunchConflict | null;
  lastPersistedCampaign: ICampaign | null;
  /** A storage-rehydrated copy awaiting explicit adoption must not auto-save. */
  legacyUnadopted: boolean;
  /** A skipped-flush diagnostic survives subsequent saves until reset. */
  flushSkip: ICampaignFlushSkip | null;
  /** Echo only the last watermark read; the client never mints or advances it. */
  sourceReplayFence: ICampaignSourceReplayFence | null;
}

/** Other variants retain nullable evidence until the separately sequenced cleanup. */
export type CampaignSaveSnapshot = ICampaignSaveContext &
  (
    | { saveState: 'idle' }
    | { saveState: 'saving' }
    | { saveState: 'saved' }
    | { saveState: 'error'; errorMessage: string }
    | { saveState: 'conflict'; conflictServerRecord: SerializedCampaign }
  );

export type CampaignSaveState = CampaignSaveSnapshot['saveState'];

type CampaignSaveOperation = 'save' | 'load' | 'adopt';
interface IRecordAdoption {
  readonly record: SerializedCampaign;
  readonly campaign: ICampaign;
}

export type CampaignSaveEvent =
  | { type: 'operation-started'; operation: CampaignSaveOperation }
  | ({ type: 'save-acknowledged'; savedEditSeq?: number } & IRecordAdoption)
  | { type: 'older-save-acknowledged' }
  | {
      type: 'save-conflicted';
      record: SerializedCampaign;
      conflict: ICampaignSaveConflict | null;
    }
  | { type: 'save-refused'; refusal: ICampaignSaveRefusal }
  | { type: 'load-refused'; refusal: ICampaignSaveRefusal }
  | {
      type: 'operation-failed';
      operation: CampaignSaveOperation;
      message: string;
    }
  | { type: 'record-missing'; adoptable: boolean }
  | ({ type: 'record-loaded'; campaignId: string } & IRecordAdoption)
  | ({ type: 'conflict-record-taken' } & IRecordAdoption)
  | {
      type: 'coop-rollback-record-installed';
      record: SerializedCampaign;
      campaign: ICampaign | null;
    }
  | { type: 'coop-rollback-settled' }
  | { type: 'legacy-adopted' }
  | { type: 'flush-skipped'; diagnostic: ICampaignFlushSkip }
  | { type: 'flush-acknowledgement-owed' }
  | { type: 'edited'; liveCampaignId: string | null }
  | { type: 'error-cleared' }
  | { type: 'launch-conflict-reported'; conflict: ICampaignLaunchConflict }
  | { type: 'launch-conflict-cleared' }
  | { type: 'created-campaign-initialized'; campaignId: string }
  | { type: 'rollback-dirty-restored' }
  | { type: 'creation-cleanup-restored'; snapshot: CampaignSaveSnapshot }
  | { type: 'reset' };

export const INITIAL_CAMPAIGN_SAVE_STATE: CampaignSaveSnapshot = {
  campaignId: null,
  dirty: false,
  editSeq: 0,
  saveState: 'idle',
  metadata: {
    lastSavedAt: null,
    schemaVersion: CURRENT_CAMPAIGN_SCHEMA_VERSION,
    originDeviceId: null,
    version: 0,
    // Never saved: neither the hosting instance nor its authority is known.
    instanceId: null,
    authority: null,
  },
  baseVersion: 0,
  errorMessage: null,
  conflictServerRecord: null,
  saveConflict: null,
  saveRefusal: null,
  launchConflict: null,
  lastPersistedCampaign: null,
  legacyUnadopted: false,
  flushSkip: null,
  sourceReplayFence: null,
};

/** Evidence is adopted only from a returned record, never computed from a journal ACK. */
function recordEvidence(
  record: SerializedCampaign,
  campaign: ICampaign | null,
) {
  return {
    baseVersion: record.version,
    metadata: {
      lastSavedAt: record.savedAt,
      schemaVersion: record.schemaVersion,
      originDeviceId: record.originDeviceId,
      version: record.version,
      instanceId: record.instanceId,
      authority: record.authority,
    },
    lastPersistedCampaign: campaign,
    sourceReplayFence: record.sourceReplayFence ?? null,
  };
}

function acknowledgedRecord(event: IRecordAdoption) {
  return {
    ...recordEvidence(event.record, event.campaign),
    campaignId: event.record.campaignId,
    saveState: 'saved' as const,
    dirty: false,
    conflictServerRecord: null,
    saveConflict: null,
    errorMessage: null,
  };
}

export class CampaignSaveTransitionError extends Error {}

/** The event switch is the guard; supported stale no-ops are named in the rules. */
export function reduceCampaignSaveState(
  state: CampaignSaveSnapshot,
  event: CampaignSaveEvent,
): CampaignSaveSnapshot {
  switch (event.type) {
    case 'operation-started':
      return {
        ...state,
        saveState: 'saving',
        errorMessage: null,
        saveRefusal: event.operation === 'save' ? null : state.saveRefusal,
      };
    case 'save-acknowledged': {
      const dirty =
        event.savedEditSeq !== undefined &&
        state.editSeq !== event.savedEditSeq;
      return {
        ...state,
        ...acknowledgedRecord(event),
        dirty,
        saveState: dirty ? 'idle' : 'saved',
      };
    }
    case 'older-save-acknowledged':
      return {
        ...state,
        saveState: state.dirty ? 'idle' : 'saved',
        errorMessage: null,
      };
    case 'save-conflicted':
      return {
        ...state,
        saveState: 'conflict',
        conflictServerRecord: event.record,
        saveConflict: event.conflict,
      };
    case 'save-refused':
    // A refused load or adoption (S1b reader gate) ends in the same state: the
    // server's sentence is shown, and nothing local changes.
    case 'load-refused':
      return {
        ...state,
        saveState: 'error',
        errorMessage: event.refusal.message,
        saveRefusal: event.refusal,
      };
    case 'operation-failed':
      return {
        ...state,
        saveState: 'error',
        errorMessage: event.message,
        saveRefusal: event.operation === 'save' ? state.saveRefusal : null,
      };
    case 'record-missing':
      return {
        ...state,
        saveState: 'idle',
        errorMessage: event.adoptable ? null : 'campaign not found',
        legacyUnadopted: event.adoptable ? true : state.legacyUnadopted,
      };
    case 'record-loaded':
      return {
        ...state,
        ...acknowledgedRecord(event),
        campaignId: event.campaignId,
        legacyUnadopted: false,
      };
    case 'conflict-record-taken':
      return { ...state, ...acknowledgedRecord(event) };
    case 'coop-rollback-record-installed':
      return { ...state, ...recordEvidence(event.record, event.campaign) };
    case 'coop-rollback-settled':
    case 'rollback-dirty-restored':
      return { ...state, dirty: false };
    case 'legacy-adopted':
      return { ...state, legacyUnadopted: false };
    case 'flush-skipped':
      return { ...state, flushSkip: event.diagnostic };
    case 'flush-acknowledgement-owed':
      return { ...state, dirty: true };
    case 'edited':
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        campaignId: state.campaignId ?? event.liveCampaignId,
      };
    case 'error-cleared':
      return state.saveState === 'error'
        ? { ...state, saveState: 'idle', errorMessage: null, saveRefusal: null }
        : state;
    case 'launch-conflict-reported':
      return { ...state, launchConflict: event.conflict };
    case 'launch-conflict-cleared':
      return { ...state, launchConflict: null };
    case 'created-campaign-initialized':
      return { ...state, campaignId: event.campaignId };
    case 'creation-cleanup-restored':
      return { ...state, ...event.snapshot };
    case 'reset':
      return INITIAL_CAMPAIGN_SAVE_STATE;
    default: {
      const unhandled: never = event;
      throw new CampaignSaveTransitionError(
        `Unknown campaign save event: ${String(unhandled)}`,
      );
    }
  }
}
