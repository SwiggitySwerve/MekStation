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

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type {
  CampaignManifestVerdict,
  ICampaignProgressionReaders,
} from './CampaignProgressionGate';
import type { ICoordinatedCorrectionSaga } from './history/CoordinatedOutcomeCorrectionSaga';

import { DurableMatchStore } from './DurableMatchStore';
import { getDefaultMatchStore } from './getDefaultMatchStore';
import { readCoordinatedCorrectionSagaByOutcomeId } from './history/CoordinatedOutcomeCorrectionSaga';

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
      } catch {
        return null;
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
      } catch {
        return null;
      }
    },
    readSagaForCampaign: (campaignId) => readDurableSagaForCampaign(campaignId),
    readManifestVerdict: (campaignId, branchId) =>
      readDurableManifestVerdict(campaignStreamRef(campaignId), branchId),
  };
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

function matchStoreDbOrNull(): Database.Database | null {
  const store = getDefaultMatchStore();
  if (!(store instanceof DurableMatchStore)) return null;
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
  } catch {
    return null;
  }
}

function readDurableManifestVerdict(
  stream: IEventHistoryStreamRef,
  branchId: string,
): CampaignManifestVerdict | null {
  const db = journalDbOrNull();
  if (db === null) return null;
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
