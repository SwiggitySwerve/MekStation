/**
 * /api/campaigns/[id] item endpoint
 *
 * GET    — returns the stored `SerializedCampaign`, `404` if absent.
 * PUT    — persists a `SerializedCampaign` with the optimistic-concurrency
 *          stale-write guard; `409 Conflict` (with the current record)
 *          on a `baseVersion` mismatch, otherwise `200` with the stored
 *          record at its incremented `version`. A journal-native save or
 *          a create under journal authority commits the row with a journal
 *          snapshot in one transaction (`campaignRecordJournalSave`).
 *          While a live co-op host holds the campaign (an entry of the
 *          shared `CampaignHostRegistry` whose host is not closed), only
 *          the host's own save is taken. "Own" is decided from the verified
 *          bearer - its principal is the entry's `hostPlayerId` - and never
 *          from the envelope's co-op session, which any client can write.
 *          The host's save runs as above under that host's single-writer
 *          lock, and the host folds and publishes the checkpoint it
 *          appended. A request with no usable bearer (absent, malformed,
 *          expired, wrong scope) is refused `401` with code
 *          `HOST_SESSION_REQUIRED` (`HOST_SESSION_EXPIRED` when the
 *          bearer only expired). A verified principal that is not the host
 *          is refused `409` with reason `live-coop-session` and the live
 *          `matchId`, in the conflict shape with the stored record (the
 *          blocked shape when no record is readable). Every refusal writes
 *          nothing and tells the live host nothing.
 * DELETE — removes the server record; `204`. Idempotent. While a live
 *          co-op host holds the campaign, everyone is refused: no usable
 *          bearer is `401`, another principal `403`, and the host `403`
 *          with `LIVE_SESSION_ACTIVE`. With no live host it is unprotected -
 *          the disclosed v2.2.0 residual (record-scoped authority is B15-3).
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
import { getOrCreateHostInstanceId } from '@/lib/campaign/authority/campaignHostInstance';
import { saveCampaignRecordThroughJournal } from '@/lib/campaign/authority/campaignRecordJournalSave';
import { resolveCampaignAuthorityFromStores } from '@/lib/campaign/authority/resolveCampaignAuthorityFromStores';
import { isCampaignJournalAuthorityEnabled } from '@/lib/campaign/sync/campaignJournalAuthorityEnabled';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  authenticateRequest,
  expectedScopeForSocket,
} from '@/lib/multiplayer/server/auth';
import {
  getCampaignHostRegistry,
  type ICampaignHostRegistryEntry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import {
  initializeApiDatabase as initCampaignDb,
  rejectMissingQueryString as readCampaignId,
  sendCaughtApiError as sendCampaignError,
} from '@/pages-modules/api/routeHelpers';
import { readCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  deleteCampaign,
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/**
 * The typed stale-write refusal (umbrella 8.3/8.4). Carries the server's
 * record so the one safe recovery has something to adopt; it is not an
 * error shape, which is why it is named separately.
 */
type ConflictResponse = {
  kind: 'conflict';
  reason: 'base-state-unavailable' | typeof LIVE_COOP_SESSION_REASON;
  recoveryAction: typeof EXPECTED_HEAD_RESYNC_ACTION;
  conflictingFields: readonly string[];
  currentVersion: number;
  current: SerializedCampaign;
  /** The live co-op session that refused the write (live-coop-session). */
  matchId?: string;
};

/** Why a PUT is refused while a live co-op host holds the campaign. */
const LIVE_COOP_SESSION_REASON = 'live-coop-session';

type ErrorResponse =
  | { error: string }
  | {
      error: string;
      kind: 'blocked';
      reason: string;
      matchId?: string;
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

/** Why a write to a live co-op campaign is refused for want of the host. */
const HOST_SESSION_REQUIRED = 'HOST_SESSION_REQUIRED';
const HOST_SESSION_EXPIRED = 'HOST_SESSION_EXPIRED';

/** The typed body of a `401`/`403` live-write refusal. */
type LiveWriteRefusal = {
  error: string;
  kind: 'refused';
  code:
    | typeof HOST_SESSION_REQUIRED
    | typeof HOST_SESSION_EXPIRED
    | 'LIVE_SESSION_ACTIVE';
  /** Why the bearer failed (the verifier's reason), or `not-live-host`. */
  reason: string;
  matchId: string;
};

/**
 * Who a write to a campaign held by the live co-op host `live` comes from,
 * decided only from the verified bearer. The caller never names its own
 * role: `body.coopSession` is a client-written field and is not read here.
 * The scope is the live session's, taken from the registry entry, so a
 * token minted for another session is refused.
 */
async function judgeLiveWrite(
  req: NextApiRequest,
  live: ICampaignHostRegistryEntry,
): Promise<
  | { readonly kind: 'host' }
  | { readonly kind: 'member'; readonly reason: 'not-live-host' }
  | { readonly kind: 'unverified'; readonly reason: string }
> {
  const auth = await authenticateRequest(
    // Record writes require a bearer header; the shared verifier also serves
    // clients that use query tokens, so omit that transport fallback here.
    Object.create(req, { query: { value: {} } }) as NextApiRequest,
    undefined,
    expectedScopeForSocket('campaign', live.matchId),
  );
  if (!auth.ok) return { kind: 'unverified', reason: auth.reason };
  return auth.playerId === live.hostPlayerId
    ? { kind: 'host' }
    : { kind: 'member', reason: 'not-live-host' };
}

/**
 * Answers a live-write refusal: `401` when no usable bearer was presented,
 * `403` for a verified non-host, a changed session or any live DELETE.
 */
function refuseLiveWrite(
  res: NextApiResponse<LiveWriteRefusal | ConflictResponse | ErrorResponse>,
  matchId: string,
  status: 401 | 403,
  reason: string,
  method: 'PUT' | 'DELETE' = 'PUT',
): void {
  const expired = reason === 'expired';
  const liveDelete = reason === LIVE_COOP_SESSION_REASON;
  res.status(status).json({
    error:
      method === 'DELETE'
        ? 'end the live co-op session before deleting this campaign'
        : reason === 'live-session-changed'
          ? 'the co-op session changed while saving; sign in to the current host session and retry'
          : expired
            ? 'your co-op sign-in expired; renew it to change this campaign'
            : 'a live co-op session holds this campaign; only the host session that started it can change it',
    kind: 'refused',
    code: liveDelete
      ? 'LIVE_SESSION_ACTIVE'
      : expired
        ? HOST_SESSION_EXPIRED
        : HOST_SESSION_REQUIRED,
    reason,
    matchId,
  });
}

/**
 * Answers 409 for a PUT from a verified principal that is not the host of
 * the live co-op session `matchId`: the conflict shape with the stored
 * record as `current`, or the blocked shape when the stored record is not
 * readable. Writes nothing.
 */
function refuseForLiveSession(
  res: NextApiResponse<ConflictResponse | ErrorResponse>,
  id: string,
  matchId: string,
): void {
  const stored = readCampaign(id);
  if (stored.kind !== 'ok') {
    res.status(409).json({
      error: 'campaign is held by a live co-op session',
      kind: 'blocked',
      reason: LIVE_COOP_SESSION_REASON,
      matchId,
    });
    return;
  }
  res.status(409).json({
    kind: 'conflict',
    reason: LIVE_COOP_SESSION_REASON,
    recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
    conflictingFields: [],
    currentVersion: stored.record.version,
    current: stored.record,
    matchId,
  });
}

/** GET reads, PUT saves and DELETE removes one campaign record (see the header). */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    SerializedCampaign | ConflictResponse | ErrorResponse | LiveWriteRefusal
  >,
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
      const live = getCampaignHostRegistry().liveEntryFor(id);
      if (live !== null) {
        const verdict = await judgeLiveWrite(req, live);
        if (verdict.kind === 'unverified') {
          refuseLiveWrite(res, live.matchId, 401, verdict.reason);
          return;
        }
        if (verdict.kind === 'member') {
          refuseForLiveSession(res, id, live.matchId);
          return;
        }
      }

      const sessionChanged = new Error('live-session-changed');
      try {
        // Journal-native: checkpoint; a create under journal authority:
        // genesis; both with the row in the writer's one transaction.
        const purpose =
          authority.kind === 'journal'
            ? 'checkpoint'
            : body.baseVersion === 0 && isCampaignJournalAuthorityEnabled()
              ? 'genesis'
              : null;
        const save = async () => {
          // Verification and the writer queue can yield. Recheck at the write
          // boundary; both persistence paths start their SQLite work synchronously.
          if (
            live !== null &&
            getCampaignHostRegistry().liveEntryFor(id) !== live
          ) {
            // A returned refusal would still let the adopter fold the journal tail.
            throw sessionChanged;
          }
          return purpose === null
            ? saveCampaign(body.envelope, body.baseVersion)
            : saveCampaignRecordThroughJournal(
                new SQLiteEventJournal(getSQLiteService().getDatabase(), () =>
                  new Date().toISOString(),
                ),
                {
                  purpose,
                  envelope: body.envelope,
                  baseVersion: body.baseVersion,
                  hostInstanceId: getOrCreateHostInstanceId(),
                  occurredAt: new Date().toISOString(),
                },
              );
        };
        // The live host's own save runs under its lock and is adopted.
        const result =
          live === null
            ? await save()
            : await live.host.adoptSavedCheckpoint(save);
        if (result.kind === 'invalid-campaign-projection') {
          // Refused before the row or the snapshot was written.
          res.status(500).json({
            error: `campaign ${purpose} failed: ${result.reason}`,
          });
          return;
        }
        if (result.kind === 'conflict') {
          // A stale whole-envelope write, refused in the same typed shape
          // the command boundary uses (umbrella 8.3/8.4): why, what to do
          // next, and the current record so the one safe recovery has
          // something to adopt.
          //
          // The reason is always `base-state-unavailable`, and it is a
          // property of this boundary rather than of this request. A `PUT`
          // carries a whole campaign, not a command, so there is nothing
          // to compare field-by-field; and the state this client wrote
          // against is not recoverable, because the campaigns table keeps
          // one row per campaign. Disjointness cannot be decided here at
          // all, so it is not attempted.
          //
          // NO JOURNAL HEAD IS REPORTED, deliberately. `version` is the
          // campaigns-table write counter, NOT a journal revision - the
          // trap the launch-head route documents - so it is named
          // `currentVersion` and never dressed up as a branch head.
          res.status(409).json({
            kind: 'conflict',
            reason: 'base-state-unavailable',
            recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
            conflictingFields: [],
            currentVersion: result.current.version,
            current: result.current,
          });
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
        res.status(200).json(result.record);
      } catch (error) {
        if (error === sessionChanged && live !== null) {
          refuseLiveWrite(res, live.matchId, 403, 'live-session-changed');
          return;
        }
        sendCampaignError(res, error, 'failed to persist campaign');
      }
      return;
    }

    case 'DELETE': {
      const live = getCampaignHostRegistry().liveEntryFor(id);
      if (live !== null) {
        const verdict = await judgeLiveWrite(req, live);
        refuseLiveWrite(
          res,
          live.matchId,
          verdict.kind === 'unverified' ? 401 : 403,
          verdict.kind === 'host' ? LIVE_COOP_SESSION_REASON : verdict.reason,
          'DELETE',
        );
        return;
      }
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
