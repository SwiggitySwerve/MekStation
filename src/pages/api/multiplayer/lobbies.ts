/**
 * Multiplayer Lobby Browser API — `GET /api/multiplayer/lobbies`.
 *
 * `add-matchmaking-and-spectator` (M3). Backs the match browser: returns
 * the joinable-lobby projection (matches in `status: 'lobby'` with at
 * least one open human seat) and, when `?include=spectatable` is set,
 * also the spectatable-match projection (matches in `status: 'active'`).
 *
 * Authentication: requires a valid signed `IPlayerToken` in the
 * `Authorization: Bearer <token>` header — consistent with the other
 * multiplayer endpoints (`POST /matches`, `GET /matches/:id`). An
 * unauthenticated request is rejected `401`. Discovery is gated so the
 * lobby list is not world-readable.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import {
  getJoinableLobbies,
  getSpectatableMatches,
  type IJoinableLobby,
  type ISpectatableMatch,
} from '@/lib/multiplayer/server/joinableLobbies';

// =============================================================================
// Response types
// =============================================================================

interface ILobbiesResponse {
  /** Joinable lobbies — always present. */
  readonly lobbies: readonly IJoinableLobby[];
  /**
   * Spectatable (`active`) matches — present only when the request
   * carried `?include=spectatable`. Kept as a separate, opt-in field
   * (design D7 / open-question resolution: the joinable-lobby query and
   * the spectatable-match query stay cleanly separated).
   */
  readonly spectatable?: readonly ISpectatableMatch[];
}

interface IErrorResponse {
  readonly error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ILobbiesResponse | IErrorResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  // Discovery is authenticated — same gate as every other multiplayer
  // endpoint. An unauthenticated request never sees the lobby list.
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }

  const store = getDefaultMatchStore();

  // `?include=spectatable` opts into the second query. The two queries
  // are independent reads over the store; we never merge them.
  const includeParam = req.query.include;
  const includeSpectatable = Array.isArray(includeParam)
    ? includeParam.includes('spectatable')
    : includeParam === 'spectatable';

  try {
    const lobbies = await getJoinableLobbies(store);
    if (includeSpectatable) {
      const spectatable = await getSpectatableMatches(store);
      res.status(200).json({ lobbies, spectatable });
      return;
    }
    res.status(200).json({ lobbies });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to list lobbies',
    });
  }
}
