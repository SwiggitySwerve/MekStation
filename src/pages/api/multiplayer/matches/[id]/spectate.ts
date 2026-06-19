/**
 * Spectator Registration — `POST /api/multiplayer/matches/:id/spectate`.
 *
 * `add-matchmaking-and-spectator` (M3). Registers the authenticated
 * player as a `kind: 'spectator'` seat on a match so they can then open
 * a WebSocket and observe it (design D4 / D5). The spectator seat is
 * appended to `IMatchMeta.seats`; the spectator never occupies a
 * playing seat, never counts toward the layout player-seat budget, and
 * is never recorded as a match participant.
 *
 * Only `active` matches are spectatable — a lobby is joined, not
 * watched, and a completed match has nothing live to observe.
 *
 * Authentication: requires a valid signed `IPlayerToken` — the verified
 * `playerId` is bound onto the spectator seat. A client-supplied id is
 * never trusted (mirrors `POST /matches`).
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IPlayerRef } from '@/types/multiplayer/Player';

import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { getDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import {
  MatchNotFoundError,
  type IMatchMeta,
} from '@/lib/multiplayer/server/IMatchStore';
import { getDefaultPlayerStore } from '@/lib/multiplayer/server/InMemoryPlayerStore';
import {
  addSpectatorSeat,
  SpectatorSeatError,
} from '@/lib/multiplayer/server/lobby/spectatorSeats';
import {
  rejectMissingQueryString,
  rejectUnexpectedMethod,
} from '@/pages-modules/api/routeHelpers';

// =============================================================================
// Response types
// =============================================================================

interface ISpectateResponse {
  /** The seat slot id the spectator was placed in (`spectator-<n>`). */
  readonly slotId: string;
  /** Match id to open the spectator WebSocket against. */
  readonly matchId: string;
  /** WebSocket URL for the spectator connection. */
  readonly wsUrl: string;
}

interface IErrorResponse {
  readonly error: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Build the spectator WebSocket URL — same shape as `POST /matches`. */
function buildWsUrl(req: NextApiRequest, matchId: string): string {
  const host = req.headers.host ?? 'localhost:3600';
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) === 'https'
      ? 'wss'
      : 'ws';
  return `${proto}://${host}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}`;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ISpectateResponse | IErrorResponse>,
): Promise<void> {
  if (rejectUnexpectedMethod(req, res, ['POST'])) return;

  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'Missing or invalid match id',
  );
  if (!id) return;

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }

  const store = getDefaultMatchStore();

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

  // Only an `active` match can be spectated — a `lobby` is joined, a
  // `completed` match is over.
  if (meta.status !== 'active') {
    res.status(409).json({
      error: `Match is not spectatable (status: ${meta.status})`,
    });
    return;
  }

  // Bootstrap the spectator's profile so a display name is available
  // for the seat occupant ref. Best-effort — a profile failure must
  // not block spectating.
  let displayName = auth.playerId;
  try {
    const profile = await getDefaultPlayerStore().getOrCreatePlayer({
      playerId: auth.playerId,
      publicKey: auth.publicKey,
      displayName: auth.playerId,
    });
    displayName = profile.displayName;
  } catch {
    // keep the id-as-name fallback
  }

  const spectatorRef: IPlayerRef = {
    playerId: auth.playerId,
    displayName,
  };

  let nextSeats;
  try {
    nextSeats = addSpectatorSeat(meta.seats ?? [], spectatorRef);
  } catch (e) {
    if (e instanceof SpectatorSeatError) {
      res.status(409).json({ error: e.message });
      return;
    }
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to add spectator seat',
    });
    return;
  }

  try {
    await store.updateMatchMeta(id, { seats: nextSeats });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Failed to persist spectator',
    });
    return;
  }

  const seat = nextSeats.find(
    (s) => s.kind === 'spectator' && s.occupant?.playerId === auth.playerId,
  );

  res.status(201).json({
    slotId: seat?.slotId ?? '',
    matchId: id,
    wsUrl: buildWsUrl(req, id),
  });
}
