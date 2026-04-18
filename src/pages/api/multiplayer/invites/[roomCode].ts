/**
 * Multiplayer Invite Resolver — `GET /api/multiplayer/invites/:roomCode`.
 *
 * Wave 3b. Resolves a 6-char room code to the underlying match id +
 * status so a joiner can hop straight to the lobby page (then connect
 * to the WebSocket with the resolved match id). Codes stop resolving
 * the moment the match transitions to `active` (per spec 4.4).
 *
 * Authentication: anonymous. Anyone with the code can resolve it; the
 * actual seat-take requires a verified bearer token at the WS layer.
 *
 * @spec openspec/changes/add-multiplayer-lobby-and-matchmaking-2-8/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getDefaultMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/p2p/roomCodes';

interface IResolveResponse {
  matchId: string;
  status: 'lobby' | 'active' | 'completed';
  /** Lowercased layout label so the client can render the lobby grid. */
  layout?: string;
}

interface IErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResolveResponse | IErrorResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const { roomCode } = req.query;
  if (typeof roomCode !== 'string' || roomCode.length === 0) {
    res.status(400).json({ error: 'Missing or invalid room code' });
    return;
  }

  // Normalize then validate the shape before hitting the store. Saves
  // a Map lookup for obvious junk like `'???'`.
  const normalized = normalizeRoomCode(roomCode);
  if (!isValidRoomCode(normalized)) {
    res.status(404).json({ error: 'Invite code not found or expired' });
    return;
  }

  const meta = await getDefaultMatchStore().getMatchByRoomCode(normalized);
  if (!meta) {
    res.status(404).json({ error: 'Invite code not found or expired' });
    return;
  }

  res.status(200).json({
    matchId: meta.matchId,
    status: meta.status,
    layout: meta.layout,
  });
}
