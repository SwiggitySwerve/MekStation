/**
 * /api/campaigns/[id]/grants — the share surface's server endpoint.
 *
 * GET lists the grants on a campaign this server owns (including revoked
 * ones, which carry `revokedAt`). POST issues a new grant. DELETE
 * revokes one by `grantId`.
 *
 * Every verb runs through the share service, which gates on D2 authority:
 * only a SOURCE may hand out or withdraw access to a campaign. The
 * refusal reasons map to distinct statuses so a caller can tell "you do
 * not own this" from "there is no such campaign" from "that request was
 * malformed" - collapsing them is the failure mode task 1.5 removed from
 * the neighbouring routes.
 *
 * The issuer's PRIVATE key never reaches this route: the client signs
 * the token with its unlocked vault identity and this endpoint only pins
 * the public half at issue time.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { CampaignShareRefusalReason } from '@/lib/campaign/grants/campaignShareService';
import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';

import {
  issueShareGrant,
  listShareGrants,
  revokeShareGrant,
} from '@/lib/campaign/grants/campaignShareService';
import {
  initializeApiDatabase,
  queryStringParam,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type ErrorResponse = { error: string; reason?: CampaignShareRefusalReason };
type GrantsResponse = readonly ICampaignGrant[] | ICampaignGrant;

/**
 * Maps a share refusal to its HTTP surface. `not-source` is 403 rather
 * than 409: it is an authority refusal, not a version conflict, and a
 * caller retrying with fresher state would loop forever.
 */
function statusForRefusal(reason: CampaignShareRefusalReason): number {
  if (reason === 'campaign-not-found') return 404;
  if (reason === 'not-source') return 403;
  if (reason === 'campaign-unreadable') return 500;
  return 400;
}

/** Body of a POST issue request, validated before it reaches the store. */
interface IIssueBody {
  readonly participantId: string;
  readonly issuerPublicKey: string;
  readonly scopes: readonly string[];
  readonly expiresAt: string;
}

/** True when `body` carries every field an issue needs, correctly typed. */
function isIssueBody(body: unknown): body is IIssueBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.participantId !== 'string' || b.participantId.length === 0) {
    return false;
  }
  if (typeof b.issuerPublicKey !== 'string' || b.issuerPublicKey.length === 0) {
    return false;
  }
  if (typeof b.expiresAt !== 'string' || b.expiresAt.length === 0) {
    return false;
  }
  if (!Array.isArray(b.scopes) || b.scopes.length === 0) return false;
  return b.scopes.every(
    (scope) => typeof scope === 'string' && scope.length > 0,
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GrantsResponse | ErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;
  const id = queryStringParam(req, 'id');
  if (id === undefined) {
    res.status(400).json({ error: 'missing campaign id' });
    return;
  }

  try {
    const db = getSQLiteService().getDatabase();
    const nowIso = new Date().toISOString();

    switch (req.method) {
      case 'GET': {
        const listed = listShareGrants(db, id);
        if (listed.kind !== 'ok') {
          res
            .status(statusForRefusal(listed.reason))
            .json({ error: 'cannot list grants', reason: listed.reason });
          return;
        }
        res.status(200).json(listed.value);
        return;
      }

      case 'POST': {
        if (!isIssueBody(req.body)) {
          res.status(400).json({ error: 'missing or invalid request body' });
          return;
        }
        const issued = issueShareGrant(db, {
          campaignId: id,
          participantId: req.body.participantId,
          issuerPublicKey: req.body.issuerPublicKey,
          scopes: req.body.scopes,
          issuedAt: nowIso,
          expiresAt: req.body.expiresAt,
        });
        if (issued.kind !== 'ok') {
          res
            .status(statusForRefusal(issued.reason))
            .json({ error: 'cannot issue grant', reason: issued.reason });
          return;
        }
        res.status(201).json(issued.value);
        return;
      }

      case 'DELETE': {
        const grantId = queryStringParam(req, 'grantId');
        if (grantId === undefined) {
          res.status(400).json({ error: 'missing grantId' });
          return;
        }
        const revoked = revokeShareGrant(db, id, grantId, nowIso);
        if (revoked.kind !== 'ok') {
          res
            .status(statusForRefusal(revoked.reason))
            .json({ error: 'cannot revoke grant', reason: revoked.reason });
          return;
        }
        res.status(200).json(revoked.value);
        return;
      }

      default: {
        res.setHeader('Allow', 'GET, POST, DELETE');
        res.status(405).json({ error: 'method not allowed' });
        return;
      }
    }
  } catch (error) {
    sendCaughtApiError(res, error, 'campaign grant request failed');
  }
}
