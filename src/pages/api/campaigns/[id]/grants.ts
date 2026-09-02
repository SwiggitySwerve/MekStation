/**
 * /api/campaigns/[id]/grants — the share surface's server endpoint.
 *
 * GET lists the grants on a campaign this server owns (including revoked
 * ones, which carry `revokedAt`). POST issues a new grant. DELETE
 * revokes one by `grantId`.
 *
 * TWO independent gates, because they answer different questions and
 * conflating them was finding #21:
 *
 * - D2 authority (`not-source`): does THIS SERVER own the campaign as a
 *   source? A property of the campaign. Every browser this server serves
 *   reads the same answer, co-op guests included, so it authorizes
 *   nobody on its own.
 * - Caller authority (`not-campaign-gm`): is the VERIFIED CALLER the
 *   campaign's active GM? Sharing is the GM's administration surface -
 *   the roster names every grantee principal and the DELETE withdraws
 *   another participant's access - so it is gated on the same durable
 *   `campaign_session_participant` seat the campaign socket admits on.
 *
 * Before the caller gate existed this route was fully unauthenticated:
 * any client that knew a campaign id could read every grantee's
 * principal id, issue itself a grant, or revoke another player's access.
 *
 * The refusal reasons map to distinct statuses so a caller can tell "you
 * do not own this" from "there is no such campaign" from "that request
 * was malformed" - collapsing them is the failure mode task 1.5 removed
 * from the neighbouring routes.
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

import { expectedScopeForCampaign } from '@/lib/campaign/authority/campaignSessionScope';
import {
  issueShareGrant,
  listShareGrants,
  revokeShareGrant,
} from '@/lib/campaign/grants/campaignShareService';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import {
  initializeApiDatabase,
  queryStringParam,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { campaignHasAnyActiveSeat } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
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
  if (reason === 'not-campaign-gm') return 403;
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
    // Identity first, for every verb including the read: the roster IS
    // the private material here, so an unauthenticated GET is the leak.
    //
    // Except on a campaign with no participants, where there is nobody
    // to authorize against and a self-issued token would pass anyway
    // (finding #33, the #29 boundary - the service comment carries the
    // reasoning and the named exposure). Demanding a token there would
    // be a check that refuses only callers who have not bothered to mint
    // one, which is friction wearing a gate's clothes.
    const gated = campaignHasAnyActiveSeat(id);
    const auth = await authenticateRequest(
      req,
      undefined,
      expectedScopeForCampaign(id),
    );
    if (gated && !auth.ok) {
      res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
      return;
    }
    // Empty when the campaign is ungated and the caller offered nothing;
    // the service refuses an empty caller wherever the gate applies.
    const callerId = auth.ok ? auth.playerId : '';

    switch (req.method) {
      case 'GET': {
        const listed = listShareGrants(db, id, callerId);
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
          callerId,
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
        const revoked = revokeShareGrant(db, id, grantId, nowIso, callerId);
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
