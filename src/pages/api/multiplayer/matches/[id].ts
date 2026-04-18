/**
 * Multiplayer Matches API — single-match endpoints.
 *
 * `GET /api/multiplayer/matches/:id` — returns the match meta blob so
 * the lobby can render participants + status. Requires authentication
 * but no further authorization (any logged-in player can see lobbies).
 *
 * `DELETE /api/multiplayer/matches/:id` — host-only close. Wave 2
 * verifies the Ed25519 bearer token, then asserts the verified
 * `playerId === meta.hostPlayerId`.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import {
  MatchNotFoundError,
  type IMatchMeta,
} from '@/lib/multiplayer/server/IMatchStore';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';
import { getMatchHostRegistry } from '@/lib/multiplayer/server/MatchHostRegistry';

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
  const { id } = req.query;
  if (typeof id !== 'string' || id.length === 0) {
    res.status(400).json({ error: 'Missing or invalid match id' });
    return;
  }

  const store = getDefaultMatchStore();

  if (req.method === 'GET') {
    const auth = await authenticateRequest(req);
    if (!auth.ok) {
      res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
      return;
    }
    try {
      const meta = await store.getMatchMeta(id);
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
