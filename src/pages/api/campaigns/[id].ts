/**
 * /api/campaigns/[id] item endpoint
 *
 * GET    — returns the stored `SerializedCampaign`, `404` if absent.
 * PUT    — persists a `SerializedCampaign` with the optimistic-concurrency
 *          stale-write guard; `409 Conflict` (with the current record)
 *          on a `baseVersion` mismatch, otherwise `200` with the stored
 *          record at its incremented `version`.
 * DELETE — removes the server record; `204`. Idempotent.
 *
 * Spec scenarios this satisfies:
 *  - "Save a campaign", "Load a saved campaign", "Load a missing campaign"
 *  - "Delete a server record"
 *  - "Clean write increments the version", "Stale write is rejected"
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D5, D8)
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  REPLICA_NOT_SOURCE_REFUSAL_REASON,
  UNKNOWN_AUTHORITY_ROLE_REASON,
} from '@/lib/campaign/authority/campaignAuthority';
import { maybeAppendCampaignGenesisOnCreate } from '@/lib/campaign/authority/campaignSourceGenesis';
import { resolveCampaignAuthorityFromStores } from '@/lib/campaign/authority/resolveCampaignAuthorityFromStores';
import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  initializeApiDatabase as initCampaignDb,
  rejectMissingQueryString as readCampaignId,
  sendCaughtApiError as sendCampaignError,
} from '@/pages-modules/api/routeHelpers';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  deleteCampaign,
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type ErrorResponse =
  | { error: string }
  | {
      error: string;
      kind: 'blocked';
      reason: string;
    }
  | {
      error: string;
      kind: 'refused';
      reason: typeof REPLICA_NOT_SOURCE_REFUSAL_REASON;
    }
  | {
      error: string;
      kind: 'failed';
      reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

/**
 * Shape of a `PUT` body — the envelope plus the `baseVersion` the client
 * last read (drives the stale-write guard).
 */
interface PutBody {
  readonly envelope: SerializedCampaign;
  readonly baseVersion: number;
}

/**
 * Narrow guard for the `PUT` body. Phase 1 trusts the caller for the
 * deep envelope shape (the client builds it via `buildSerializedCampaign`)
 * but verifies the fields the route itself depends on.
 */
function isValidPutBody(value: unknown): value is PutBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const body = value as Partial<PutBody>;
  if (typeof body.baseVersion !== 'number' || body.baseVersion < 0) {
    return false;
  }
  const envelope = body.envelope as Partial<SerializedCampaign> | undefined;
  if (!envelope || typeof envelope !== 'object') {
    return false;
  }
  return (
    typeof envelope.campaignId === 'string' &&
    typeof envelope.schemaVersion === 'number' &&
    typeof envelope.body === 'object' &&
    envelope.body !== null
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SerializedCampaign | ErrorResponse>,
): Promise<void> {
  if (!initCampaignDb(res)) return;

  const id = readCampaignId(req, res, 'id', 'missing or invalid campaign id');
  if (!id) return;

  switch (req.method) {
    case 'GET': {
      const result = readCampaign(id);
      if (result.kind === 'not_found') {
        // Only a missing row is not-found. Unreadable rows use 500
        // (corrupt) or 422 (invalid authority). A replica row is 200.
        res.status(404).json({ error: 'not found' });
        return;
      }
      if (result.kind === 'corrupt') {
        // Explicit, intentional error surface for a corrupt stored
        // payload — never an unhandled JSON.parse throw (audit W5.2).
        // The row stays repairable via PUT with the correct baseVersion.
        res.status(500).json({ error: 'stored campaign record is corrupt' });
        return;
      }
      if (result.kind === 'invalid_authority') {
        // D2 fails closed: an unparseable role is not quietly read as
        // source. Distinct from corrupt JSON (500) and from not-found.
        res.status(422).json({
          error: 'stored campaign authority is invalid',
          kind: 'failed',
          reason: result.reason,
        });
        return;
      }
      // Readable stored rows are 200, including replica authority.
      // Replica is not not-found: this server does replicate that id.
      // `authority.role` tells the client it is a shared copy.
      res.status(200).json(result.record);
      return;
    }

    case 'PUT': {
      const body = req.body as unknown;
      if (!isValidPutBody(body)) {
        res.status(400).json({ error: 'missing or invalid request body' });
        return;
      }
      // The path id is authoritative — guard against an envelope whose
      // campaignId disagrees with the URL.
      if (body.envelope.campaignId !== id) {
        res
          .status(400)
          .json({ error: 'envelope campaignId does not match url id' });
        return;
      }
      // Task 5.7: authority is per campaign, read from the durable marker.
      // A campaign whose marker says journal but whose journal has no
      // stream must NOT take this write - accepting it would either start
      // a fresh log or silently fall back to snapshot authority the
      // marker has already superseded. It blocks, truthfully.
      const authority = await resolveCampaignAuthorityFromStores(
        {
          readMarker: readCampaignMigrationMarker,
          journal: () =>
            new SQLiteEventJournal(getSQLiteService().getDatabase(), () =>
              new Date().toISOString(),
            ),
        },
        id,
      );
      if (authority.kind === 'blocked') {
        res.status(409).json({
          error: 'campaign authority is blocked',
          kind: 'blocked',
          reason: authority.reason,
        });
        return;
      }

      try {
        const result = saveCampaign(body.envelope, body.baseVersion);
        if (result.kind === 'conflict') {
          // Stale write — return the current record so the client can
          // offer keep-local / take-server.
          res.status(409).json(result.current);
          return;
        }
        if (result.kind === 'refused') {
          // Replica local mutation is a typed refusal, not a 409 and
          // not a generic 500. The stored row is unchanged.
          res.status(403).json({
            error: 'replica instance cannot accept local mutation',
            kind: 'refused',
            reason: result.reason,
          });
          return;
        }
        if (result.kind === 'failed') {
          res.status(422).json({
            error: 'campaign authority is invalid',
            kind: 'failed',
            reason: result.reason,
          });
          return;
        }
        // Task 1.1 journal half: under journal authority, creation appends
        // the genesis snapshot and journal-native marker BEFORE the create
        // is acknowledged. Inert while the cutover flag is off (the lazy
        // journal factory constructs nothing on the disabled path).
        const genesis = await maybeAppendCampaignGenesisOnCreate({
          enabled: CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
          created: body.baseVersion === 0,
          envelope: result.record,
          occurredAt: new Date().toISOString(),
          journal: () =>
            new SQLiteEventJournal(getSQLiteService().getDatabase(), () =>
              new Date().toISOString(),
            ),
          writeMarker: writeCampaignMigrationMarker,
        });
        if (genesis.kind === 'invalid-campaign-projection') {
          res.status(500).json({
            error: `campaign genesis failed: ${genesis.reason}`,
          });
          return;
        }
        res.status(200).json(result.record);
      } catch (error) {
        sendCampaignError(res, error, 'failed to persist campaign');
      }
      return;
    }

    case 'DELETE': {
      try {
        const result = deleteCampaign(id);
        if (result.kind === 'refused') {
          res.status(403).json({
            error: 'replica instance cannot accept local mutation',
            kind: 'refused',
            reason: result.reason,
          });
          return;
        }
        if (result.kind === 'failed') {
          res.status(422).json({
            error: 'campaign authority is invalid',
            kind: 'failed',
            reason: result.reason,
          });
          return;
        }
        res.status(204).end();
      } catch (error) {
        sendCampaignError(res, error, 'failed to delete campaign');
      }
      return;
    }

    default:
      res.setHeader('Allow', 'GET, PUT, DELETE');
      res.status(405).json({ error: 'method not allowed' });
  }
}
