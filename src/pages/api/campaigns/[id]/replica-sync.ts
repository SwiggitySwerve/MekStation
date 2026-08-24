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
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { WebSocket } from 'ws';

import type {
  IReplicaSyncSocket,
  ReplicaSyncStatus,
} from '@/lib/campaign/replica/CampaignReplicaSyncClient';

import { CampaignReplicaSyncClient } from '@/lib/campaign/replica/CampaignReplicaSyncClient';
import {
  getReplicaSyncClient,
  registerReplicaSyncClient,
  stopReplicaSyncClient,
} from '@/lib/campaign/replica/campaignReplicaSyncRegistry';
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
