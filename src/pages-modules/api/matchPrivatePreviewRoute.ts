/**
 * `GET /api/matches/:id/private-preview?ref=<opaqueRef>` — the GM reads
 * back one private draft record a rewind preview already stored.
 *
 * THE REF IS NAMED BY THE CALLER, NOT DISCOVERED. ViewerHistoryService
 * never invents private refs; it exports the ones a request names. The
 * only place a ref is ever handed out is the rewind preview's own 200,
 * to the authenticated GM who caused the record to be written. This
 * route re-authorizes every named ref from scratch, so holding a handle
 * is not holding a permission.
 *
 * THE HOST IS BRANDED GM HERE, exactly as the matching WRITE already is.
 * Private records are gm-only, and a tactical host resolves from durable
 * seats as `player`, so the rewind preview wraps the seat source in
 * `HostAsGmMembershipSource` to write one. Reading it back needs the
 * same brand or the author could never read its own draft. The brand is
 * derived from `meta.hostPlayerId` - the privileged identity the lobby
 * already enforces host-only intents against - never from the request.
 *
 * WHAT THAT BRAND ALSO DOES, recorded rather than smoothed over: the
 * service resolves ONE viewer per export and uses it for the projection
 * and the timeline as well as the private refs. So the host's body here
 * carries GM-class timeline rows (committed revision ranges) that the
 * same host's `/export` body does not. That is a widening of this
 * caller's own view of its own match, not of any player's, and
 * `readMatchHistoryLineage` already treats the host as the GM audience
 * on this surface. A pinned row asserts it rather than leaving it to be
 * discovered.
 *
 * includePrivate IS THE POINT HERE, and it is also why this is a
 * different route rather than a flag on `/export`: a toggle a player
 * could flip would turn the export into an authorization oracle. A
 * player who reaches THIS route is not refused - it receives the same
 * body shape with the payload-free private view and a recorded denied
 * attempt, which is the service's deny-by-default law, unchanged.
 *
 * The service body is answered VERBATIM: no lineage, no wrapper, nothing
 * this route invents on top of what the service returned.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IViewerHistoryExport } from '@/lib/multiplayer/server/history/ViewerHistoryTypes';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';

import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import { HostAsGmMembershipSource } from '@/pages-modules/api/hostAsGmMembershipSource';
import {
  createViewerHistoryServiceOver,
  DEFAULT_MATCH_HISTORY_STREAM_TYPE,
  prepareMatchHistoryGet,
  rejectMatchHistoryFailure,
} from '@/pages-modules/api/matchHistoryViewerChain';
import { rejectMissingQueryString } from '@/pages-modules/api/routeHelpers';
import { nowIso } from '@/types/multiplayer/Protocol';

type ResponseBody = IViewerHistoryExport | { readonly error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  const caller = await prepareMatchHistoryGet(req, res);
  if (!caller) return;

  const ref = rejectMissingQueryString(
    req,
    res,
    'ref',
    'missing or invalid private record ref',
  );
  if (!ref) return;

  const store = getDefaultMatchStore();
  let meta: IMatchMeta;
  try {
    meta = await store.getMatchMeta(caller.matchId);
  } catch {
    // Same answer the rewind preview gives, and reachable only by a
    // caller already holding a bearer scoped to this very match id.
    res.status(404).json({ error: 'unknown match' });
    return;
  }

  try {
    const service = createViewerHistoryServiceOver(
      new HostAsGmMembershipSource(
        new MatchSeatMembershipSource(store),
        meta.hostPlayerId,
      ),
    );
    const body = await service.exportForViewer(
      caller.playerId,
      caller.matchId,
      {
        streamType: DEFAULT_MATCH_HISTORY_STREAM_TYPE,
        streamId: caller.matchId,
        includePrivate: true,
        // Required by the gated path so the private access audit records
        // the request's own time rather than reading the clock inside the
        // repository.
        occurredAt: nowIso(),
        privateRefs: [ref],
      },
    );
    res.status(200).json(body);
  } catch (error) {
    rejectMatchHistoryFailure(res, error, 'failed to read the private preview');
  }
}
