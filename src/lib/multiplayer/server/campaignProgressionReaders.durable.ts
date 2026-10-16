/**
 * Durable readers for the campaign progression gate (umbrella 17.3).
 *
 * SPLIT OUT OF `CampaignProgressionGate.ts` DELIBERATELY. That module is
 * value-imported by `CampaignSyncSession`, which the client bundle
 * reaches; keeping SQLite and the match store beside the pure clause
 * logic made webpack resolve `node:crypto` / `node:fs` / `node:path` for
 * the browser and the production build failed to compile (LAW 62). The
 * clause evaluation stays dependency-free; everything that opens a
 * database lives here, imported only by server-side callers.
 */

import type Database from 'better-sqlite3';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import {
  CampaignLaunchView,
  type CampaignLaunchPrecedence,
} from '@/lib/campaign/sync/campaignPublicAppliedView';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import {
  EventHistoryBranchError,
  type IEventHistoryStreamRef,
} from '@/lib/events/journal/EventHistoryBranchContract';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { listActiveCampaignSessionParticipants } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type {
  CampaignManifestVerdict,
  ICampaignProgressionReaders,
} from './CampaignProgressionGate';
import type { DurableMatchStore } from './DurableMatchStore';
import type { ICoordinatedCorrectionSaga } from './history/CoordinatedOutcomeCorrectionSaga';
import type { IMatchStore } from './IMatchStore';

import { evaluateCampaignProgressionClauses } from './CampaignProgressionGate';
import { getDefaultMatchStore } from './getDefaultMatchStore';
import {
  readCoordinatedCorrectionSagaByOutcomeId,
  readCoordinatedCorrectionSagaByOutcomeIdStrict,
} from './history/CoordinatedOutcomeCorrectionSaga';

/**
 * Production readers. Each call returns null when SQLiteService has not
 * been initialized, so suites that never open a campaign journal keep
 * the convergence-only answer.
 */
export function createDurableCampaignProgressionReaders(): ICampaignProgressionReaders {
  return {
    readEffectiveHead: (campaignId) => {
      const stream = campaignStreamRef(campaignId);
      const db = journalDbOrNull();
      if (db === null) return null;
      try {
        return new SQLiteEventHistoryBranchStore(db).readEffectiveHead(stream);
      } catch (error) {
        return nullUnlessBranchIntegrity(error);
      }
    },
    readBranch: (campaignId, branchId) => {
      const stream = campaignStreamRef(campaignId);
      const db = journalDbOrNull();
      if (db === null) return null;
      try {
        return new SQLiteEventHistoryBranchStore(db).readBranch(
          stream,
          branchId,
        );
      } catch (error) {
        return nullUnlessBranchIntegrity(error);
      }
    },
    readSagaForCampaign: (campaignId) => readDurableSagaForCampaign(campaignId),
    readManifestVerdict: (campaignId, branchId) => {
      const db = journalDbOrNull();
      if (db === null) return null;
      return readDurableManifestVerdict(
        db,
        campaignStreamRef(campaignId),
        branchId,
      );
    },
  };
}

/**
 * P2CB's launch view, composed in THIS module graph on its own campaign
 * handle and membership reader. A view retained by a host keeps that
 * graph's handle; another graph's handle is refused, never adopted.
 */
export function createDurableCampaignLaunchView(): CampaignLaunchView | null {
  const db = journalDbOrNull();
  if (db === null) return null;
  return new CampaignLaunchView(db, {
    currentDb: journalDbOrNull,
    listRoster: listActiveCampaignSessionParticipants,
    readPrecedence: readStrictCampaignLaunchPrecedence,
  });
}

/**
 * The same three clauses on one explicit campaign handle for a strict
 * launch context. Unlike the readers above, no read failure becomes "no
 * saga": an inbox outcome whose match store is not durable, a saga or
 * inbox read that throws, or a branch read that throws is `unavailable`.
 * Known absence is zero inbox rows or a saga table never created. The
 * legacy numeric refusal detail is dropped; only the reason is carried.
 */
export function readStrictCampaignLaunchPrecedence(
  db: Database.Database,
  campaignId: string,
): CampaignLaunchPrecedence {
  const stream = campaignStreamRef(campaignId);
  const branches = new SQLiteEventHistoryBranchStore(db);
  try {
    const refusal = evaluateCampaignProgressionClauses({
      campaignId,
      requiredRevision: 0,
      readers: {
        readEffectiveHead: () => branches.readEffectiveHead(stream),
        readBranch: (_campaignId, branchId) =>
          branches.readBranch(stream, branchId),
        readSagaForCampaign: () => readStrictSagaForCampaign(db, campaignId),
        readManifestVerdict: (_campaignId, branchId) =>
          readDurableManifestVerdict(db, stream, branchId),
      },
    });
    return refusal === null
      ? { kind: 'clear' }
      : { kind: 'blocked', reason: refusal.reason };
  } catch {
    return { kind: 'unavailable' };
  }
}

function readStrictSagaForCampaign(
  journal: Database.Database,
  campaignId: string,
): ICoordinatedCorrectionSaga | null {
  const outcomeId = readLatestInboxOutcomeIdStrict(journal, campaignId);
  if (outcomeId === null) return null;
  const matchDb = matchStoreDbOrNull();
  if (matchDb === null) {
    throw new Error(`Outcome ${outcomeId} has no durable match store saga`);
  }
  return readCoordinatedCorrectionSagaByOutcomeIdStrict(matchDb, outcomeId);
}

function nullUnlessBranchIntegrity(error: unknown): null {
  if (
    error instanceof EventHistoryBranchError &&
    error.code === 'branch-integrity'
  ) {
    throw error;
  }
  return null;
}

function journalDbOrNull(): Database.Database | null {
  const service = getSQLiteService();
  if (!service.isInitialized()) return null;
  try {
    return service.getDatabase();
  } catch {
    return null;
  }
}

/**
 * The process match store's database when that store is the durable one,
 * else null. The store sits in the globalThis slot getDefaultMatchStore
 * shares between Next's API graph and the socket runtime's tsx graph, so
 * it can be an instance of the OTHER graph's DurableMatchStore class, for
 * which an instanceof check against this graph's class answers false; this
 * reads the store's getDatabase method instead of its class.
 */
function matchStoreDbOrNull(): Database.Database | null {
  const store: IMatchStore & Partial<Pick<DurableMatchStore, 'getDatabase'>> =
    getDefaultMatchStore();
  if (typeof store.getDatabase !== 'function') return null;
  try {
    return store.getDatabase();
  } catch {
    return null;
  }
}

/**
 * Inbox has `outcome_id` and no `match_id`, so the saga is looked up
 * by outcome id on the match-store file (not the journal).
 */
function readDurableSagaForCampaign(
  campaignId: string,
): ICoordinatedCorrectionSaga | null {
  const journal = journalDbOrNull();
  if (journal === null) return null;
  const outcomeId = readLatestInboxOutcomeId(journal, campaignId);
  if (outcomeId === null) return null;
  const matchDb = matchStoreDbOrNull();
  if (matchDb === null) return null;
  return readCoordinatedCorrectionSagaByOutcomeId(matchDb, outcomeId);
}

function readLatestInboxOutcomeId(
  journal: Database.Database,
  campaignId: string,
): string | null {
  try {
    return readLatestInboxOutcomeIdStrict(journal, campaignId);
  } catch {
    return null;
  }
}

/** The inbox table is migrated with the service, so a throw here is a real failure. */
function readLatestInboxOutcomeIdStrict(
  journal: Database.Database,
  campaignId: string,
): string | null {
  const row = journal
    .prepare(
      `SELECT outcome_id AS outcomeId
         FROM campaign_combat_outcome_inbox
        WHERE campaign_id = ?
        ORDER BY received_at DESC, outcome_version DESC
        LIMIT 1`,
    )
    .get(campaignId) as { readonly outcomeId: string } | undefined;
  return row === undefined ? null : row.outcomeId;
}

function readDurableManifestVerdict(
  db: Database.Database,
  stream: IEventHistoryStreamRef,
  branchId: string,
): CampaignManifestVerdict {
  try {
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    if (manifests.readArtifactManifest(stream, branchId) === null) {
      return { kind: 'unverified' };
    }
    manifests.verifyArtifactManifest(stream, branchId);
    return { kind: 'verified' };
  } catch {
    // Missing table, missing seal, or digest mismatch: all unverifiable.
    return { kind: 'unverified' };
  }
}
