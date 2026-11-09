/**
 * Spectator registration for the spectate page.
 *
 * A viewer registers with `POST /matches/:id/spectate` before opening a socket;
 * the server binds a spectator only while that registration's seat exists. The
 * seat is released when the viewer's sockets are gone, and at boot after a
 * server restart, so a socket that reconnects after a restart is refused with
 * `AUTH_REJECTED`. `reRegister()` is the bounded way back in: it registers again,
 * once, and the session hook rebinds when `registered` comes back true.
 *
 * Bounded on purpose. One extra registration per successful bind
 * (`markBound()` refills it), never a loop: a registration the server refuses
 * (a completed match answers 409) is surfaced as `registerError`, and a rebind
 * that is refused again uses up the budget and stays closed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MultiplayerTokenState } from '@/pages-modules/multiplayer/multiplayerPage.helpers';

/** Extra registrations allowed between two successful binds. */
export const MAX_SPECTATOR_RE_REGISTRATIONS = 1;

export interface ISpectatorRegistration {
  readonly registered: boolean;
  readonly registerError: string | null;
  /** Register again, once per successful bind; a no-op once the budget is spent. */
  readonly reRegister: () => void;
  /** The session reached `ready`: refill the re-registration budget. */
  readonly markBound: () => void;
}

export function useSpectatorRegistration(
  matchId: string | null,
  tokenState: MultiplayerTokenState | null,
): ISpectatorRegistration {
  const [registered, setRegistered] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const reRegistrations = useRef(0);

  useEffect(() => {
    if (!matchId || !tokenState || registered) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/multiplayer/matches/${encodeURIComponent(matchId)}/spectate`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenState.wireToken}` },
          },
        );
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setRegistered(true);
      } catch (e) {
        if (!cancelled) {
          setRegisterError(
            e instanceof Error ? e.message : 'Failed to register as spectator',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, tokenState, registered]);

  const reRegister = useCallback(() => {
    if (reRegistrations.current >= MAX_SPECTATOR_RE_REGISTRATIONS) return;
    reRegistrations.current += 1;
    setRegistered(false);
  }, []);

  const markBound = useCallback(() => {
    reRegistrations.current = 0;
  }, []);

  return { registered, registerError, reRegister, markBound };
}
