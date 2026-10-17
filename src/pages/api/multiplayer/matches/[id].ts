/**
 * Multiplayer Matches API — single-match endpoints.
 *
 * `GET /api/multiplayer/matches/:id` — full metadata for the host and
 * seated human players only (the stored roster for pre-seat matches).
 * Discovery and joining use the public lobby/invite summaries instead.
 *
 * `DELETE /api/multiplayer/matches/:id` — host-only close. Wave 2
 * verifies the Ed25519 bearer token, then asserts the verified
 * `playerId === meta.hostPlayerId`.
 *
 * @spec openspec/specs/player-identity/spec.md
 * @spec openspec/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import {
  MatchNotFoundError,
  type IMatchMeta,
} from '@/lib/multiplayer/server/IMatchStore';
import {
  bootstrapMultiplayerServer,
  getMatchHostRegistry,
} from '@/lib/multiplayer/server/MatchHostRegistry';
import { rejectMissingQueryString } from '@/pages-modules/api/routeHelpers';

// =============================================================================
// Response types
// =============================================================================

interface IGetMatchResponse {
  meta: IMatchMeta;
}

interface IDeleteMatchResponse {
  ok: true;
}

interface IErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IGetMatchResponse | IDeleteMatchResponse | IErrorResponse
  >,
): Promise<void> {
  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'Missing or invalid match id',
  );
  if (!id) return;

  const store = getDefaultMatchStore();

  // harden-multiplayer-transport (M2), design D3: ensure server-startup
  // match recovery has run before this process serves a match. The
  // call is idempotent — only the first hit actually recovers; every
  // later call is a cheap no-op. Fire-and-forget so a slow recovery
  // never delays the response (a recovered host is registered for the
  // subsequent WebSocket upgrade).
  void bootstrapMultiplayerServer();

  if (req.method === 'GET') {
    const auth = await authenticateRequest(req);
    if (!auth.ok) {
      res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
      return;
    }
    try {
      const meta = await store.getMatchMeta(id);
      // Use the same durable seat occupancy as the WS membership source,
      // but never its open-lobby invitee or spectator admission: neither
      // grants access to bootstrap positions/skills or campaign state.
      // The co-op GM is the host and need not occupy a playing seat.
      const participant =
        meta.hostPlayerId === auth.playerId ||
        (meta.seats === undefined
          ? meta.playerIds.includes(auth.playerId)
          : meta.seats.some(
              (seat) =>
                seat.kind === 'human' &&
                seat.occupant?.playerId === auth.playerId,
            ));
      if (!participant) {
        throw new MatchNotFoundError(id);
      }
      res.status(200).json({ meta });
      return;
    } catch (e) {
      if (e instanceof MatchNotFoundError) {
        res.status(404).json({ error: e.message });
        return;
      }
      res.status(500).json({
        error: e instanceof Error ? e.message : 'Failed to load match',
      });
      return;
    }
  }

  if (req.method === 'DELETE') {
    const auth = await authenticateRequest(req);
    if (!auth.ok) {
      res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
      return;
    }
    let meta: IMatchMeta;
    try {
      meta = await store.getMatchMeta(id);
    } catch (e) {
      if (e instanceof MatchNotFoundError) {
        res.status(404).json({ error: e.message });
        return;
      }
      res.status(500).json({
        error: e instanceof Error ? e.message : 'Failed to load match',
      });
      return;
    }
    if (meta.hostPlayerId !== auth.playerId) {
      res.status(403).json({ error: 'Only the host may close the match' });
      return;
    }
    try {
      await getMatchHostRegistry().closeMatch(id);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : 'Failed to close match',
      });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
