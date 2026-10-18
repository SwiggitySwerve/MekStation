import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchConfig, IMatchStore } from './IMatchStore';
import type { IMatchSocket } from './ServerMatchSocketTypes';

/** Fixed, secret-free refusal reason for B14 fog containment. */
export const FOG_REFUSAL = 'fog-projection-unavailable';

/**
 * The single B14 capability predicate: "no per-viewer reveal projection
 * available for this match". Fog-on private reads are served only through a
 * per-viewer projection, and none exists yet, so fog-on and unknown
 * configuration refuse. A known config that omits the legacy flag is fog-off.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 */
export function noPerViewerRevealProjection(
  config: IMatchConfig | undefined,
): boolean {
  return config === undefined || config.fogOfWar === true;
}

/** Fixed, secret-free reason when fog configuration cannot be read. */
export const FOG_CONFIG_UNAVAILABLE = 'match configuration unavailable';

/** Readable fog-on/unknown policy (WS 1008) or unreadable config (WS 1011). */
export type FogRefusal = 'policy' | 'unavailable';

/**
 * `false` means a per-viewer reveal projection is available. Otherwise the
 * refusal kind: an unreadable config is an infrastructure failure, never a
 * delivery permission. Always awaited: the legacy-filter seams pin it as
 * Promise-returning.
 */
export async function matchLacksRevealProjection(
  store: Pick<IMatchStore, 'getMatchMeta'>,
  matchId: string,
): Promise<false | FogRefusal> {
  let config: IMatchConfig | undefined;
  try {
    config = (await store.getMatchMeta(matchId)).config;
  } catch {
    return 'unavailable';
  }
  return noPerViewerRevealProjection(config) ? 'policy' : false;
}

/**
 * Terminal refusal for one socket. Call only after membership; never
 * interpolate configuration or payloads. Policy is final: a typed Close
 * (the client stops reconnecting) then WS 1008. An unreadable config is
 * transient: a typed Error, which the client does not treat as terminal,
 * then WS 1011, so it reconnects and resumes from its delivery cursor.
 * Nothing was numbered for the withheld frame, so the resume replays it.
 */
export function refuseFogSocket(
  socket: IMatchSocket,
  matchId: string,
  refusal: FogRefusal = 'policy',
): void {
  const policy = refusal === 'policy';
  const reason = policy ? FOG_REFUSAL : FOG_CONFIG_UNAVAILABLE;
  try {
    socket.send(
      JSON.stringify(
        policy
          ? {
              kind: 'Close',
              matchId,
              ts: nowIso(),
              code: 'AUTH_REJECTED',
              reason,
            }
          : {
              kind: 'Error',
              matchId,
              ts: nowIso(),
              code: 'INTERNAL_ERROR',
              reason,
            },
      ),
    );
  } catch {
    // Closing/detaching still applies when the transport cannot accept a frame.
  }
  try {
    socket.close(policy ? 1008 : 1011, reason);
  } catch {
    // Caller still detaches server-side bookkeeping.
  }
}
