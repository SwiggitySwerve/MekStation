/**
 * /api/campaigns/[id]/replica-sync — start, inspect, or stop this
 * device's sync with the campaign's source (design D6).
 *
 * A redeemed replica record says WHICH source it is a copy of, but
 * something has to actually go and connect. This is that trigger: the
 * consuming device's own server opens the socket, so the stream lands
 * in this device's journal rather than in a browser tab that closes.
 *
 * Only a replica may sync. Asking a source to "sync from" somewhere
 * else would be asking it to take orders about its own campaign, so a
 * source is refused rather than quietly ignored.
 *
 * CALLER AUTHORITY (finding #30). This route dials a socket and writes
 * what comes back into this device's campaign store, so an
 * unauthenticated one is an outbound-connection primitive: the caller
 * chose the destination, the credential presented, and the store written
 * into. The `not-a-replica` refusal above does not touch that - it asks
 * about the CAMPAIGN, which is true for every caller alike, the same
 * conflation the share surface had.
 *
 * Every verb therefore requires a verified caller, and a start is bound
 * to the record: `grantId` comes from the stored authority, and the
 * presented grant token must name that grant, this campaign, an expiry
 * still in the future, and the participant the caller says it is dialling
 * as.
 *
 * WHAT THIS STILL CANNOT REACH, stated rather than implied. The grant
 * token's SIGNATURE is not verified here: the pinned issuer key lives in
 * the source's `campaign_grant` row and a consuming device holds no copy.
 * The dial TARGET is also still the caller's to choose - neither
 * `sourceSocketUrl` nor `matchId` exists on any local record to compare
 * against. Closing both needs three fields on `IReplicaCampaignAuthority`
 * that redeem could capture and today discards: `participantId` and
 * `issuerPublicKey` (both already inside the token redeem verifies) and
 * a source address - either `sourceSocketUrl` or a resolution from the
 * `sourceInstanceId` it already stores. Until then this gate narrows the
 * caller from anyone on the network to a holder of a token for this
 * grant; it does not pin where they may point it.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { WebSocket } from 'ws';

import type {
  IReplicaSyncSocket,
  ReplicaSyncStatus,
} from '@/lib/campaign/replica/CampaignReplicaSyncClient';

import { expectedScopeForCampaign } from '@/lib/campaign/authority/campaignSessionScope';
import { CampaignReplicaSyncClient } from '@/lib/campaign/replica/CampaignReplicaSyncClient';
import {
  getReplicaSyncClient,
  registerReplicaSyncClient,
  stopReplicaSyncClient,
} from '@/lib/campaign/replica/campaignReplicaSyncRegistry';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { createCampaignReplicaStoreFromSqlite } from '@/lib/multiplayer/server/campaignGrantChannelDeps';
import {
  initializeApiDatabase,
  queryStringParam,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';

type SyncResponse = {
  status: ReplicaSyncStatus | 'stopped';
  grantId?: string;
};
type ErrorResponse = { error: string };

interface IStartBody {
  readonly sourceSocketUrl: string;
  readonly matchId: string;
  readonly playerId: string;
  readonly token: unknown;
}

/** True when the body carries everything needed to dial a source. */
function isStartBody(value: unknown): value is IStartBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  for (const key of ['sourceSocketUrl', 'matchId', 'playerId']) {
    const v = b[key];
    if (typeof v !== 'string' || v.length === 0) return false;
  }
  return b.token !== undefined && b.token !== null;
}

/** The fields of a presented grant token this route compares. */
interface IPresentedGrant {
  readonly grantId: string;
  readonly campaignId: string;
  readonly participantId: string;
  readonly expiresAt: string;
}

/**
 * Reads the claims off a presented grant token. Deliberately narrow: the
 * signature cannot be checked on a consuming device (see the header), so
 * this reads only what the route compares against its own record, and an
 * unreadable token simply matches nothing.
 */
function readPresentedGrant(token: unknown): IPresentedGrant | null {
  if (typeof token !== 'object' || token === null) return null;
  const t = token as Record<string, unknown>;
  for (const key of ['grantId', 'campaignId', 'participantId', 'expiresAt']) {
    if (typeof t[key] !== 'string' || (t[key] as string).length === 0) {
      return null;
    }
  }
  return {
    grantId: t.grantId as string,
    campaignId: t.campaignId as string,
    participantId: t.participantId as string,
    expiresAt: t.expiresAt as string,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse | ErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;
  const id = queryStringParam(req, 'id');
  if (id === undefined) {
    res.status(400).json({ error: 'missing campaign id' });
    return;
  }

  // Identity first, for every verb: a status read tells a stranger which
  // campaigns this device replicates, and a stop is a denial primitive.
  const auth = await authenticateRequest(
    req,
    undefined,
    expectedScopeForCampaign(id),
  );
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }

  try {
    const record = readCampaign(id);
    if (record.kind === 'not_found') {
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (record.kind !== 'ok') {
      res.status(500).json({ error: 'campaign record is unreadable' });
      return;
    }
    const authority = record.record.authority;
    if (authority.role !== 'replica') {
      // A source does not sync FROM anywhere - it is the authority.
      res.status(403).json({ error: 'not-a-replica' });
      return;
    }
    const grantId = authority.grantId;

    switch (req.method) {
      case 'GET': {
        const client = getReplicaSyncClient(id, grantId);
        res.status(200).json({
          status: client?.status() ?? 'disconnected',
          grantId,
        });
        return;
      }

      case 'POST': {
        if (!isStartBody(req.body)) {
          res.status(400).json({ error: 'missing or invalid request body' });
          return;
        }
        // Bound to the RECORD, not to anything else the body says. An
        // unreadable token matches nothing and is refused the same way a
        // wrong one is - there is no shape here worth distinguishing.
        const presented = readPresentedGrant(req.body.token);
        if (
          presented === null ||
          presented.grantId !== grantId ||
          presented.campaignId !== id
        ) {
          res.status(403).json({ error: 'grant-mismatch' });
          return;
        }
        const expiresMs = Date.parse(presented.expiresAt);
        if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
          res.status(403).json({ error: 'grant-expired' });
          return;
        }
        if (req.body.playerId !== presented.participantId) {
          // The dial presents a credential; the player it presents it as
          // has to be the one that credential names.
          res.status(403).json({ error: 'participant-mismatch' });
          return;
        }
        const client = new CampaignReplicaSyncClient({
          url: req.body.sourceSocketUrl,
          matchId: req.body.matchId,
          campaignId: id,
          grantId,
          playerId: req.body.playerId,
          token: req.body.token,
          store: createCampaignReplicaStoreFromSqlite(() =>
            new Date().toISOString(),
          ),
          // API routes are server-only, so a top-level ws import never
          // reaches a browser bundle.
          socketFactory: (url) =>
            new WebSocket(url) as unknown as IReplicaSyncSocket,
          nowIso: () => new Date().toISOString(),
        });
        const registered = registerReplicaSyncClient(id, grantId, client);
        if (registered.kind === 'already-running') {
          // Idempotent: a second open of the same campaign joins the
          // dialler already running rather than racing it.
          res.status(200).json({
            status: getReplicaSyncClient(id, grantId)?.status() ?? 'connected',
            grantId,
          });
          return;
        }
        // Dialling failure is NOT a request failure. The source may be
        // offline, or on a host this device cannot reach right now, and
        // "start syncing" still succeeded as an instruction - the client
        // reports its posture through status. 500ing here would tell the
        // caller their request was malformed when it was fine.
        try {
          await client.connect();
        } catch {
          // Swallowed deliberately; status carries the outcome.
        }
        res.status(202).json({ status: client.status(), grantId });
        return;
      }

      case 'DELETE': {
        stopReplicaSyncClient(id, grantId);
        res.status(200).json({ status: 'stopped', grantId });
        return;
      }

      default: {
        res.setHeader('Allow', 'GET, POST, DELETE');
        res.status(405).json({ error: 'method not allowed' });
        return;
      }
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'replica sync request failed');
  }
}
