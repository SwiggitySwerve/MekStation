/**
 * Multiplayer lobby room-code surface.
 *
 * @spec openspec/specs/multiplayer-game-surface/spec.md
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import type { MultiplayerTokenState } from '@/pages-modules/multiplayer/multiplayerPage.helpers';

import { LobbyPanel } from '@/components/multiplayer/LobbyPanel';
import { NetworkedGameSurface } from '@/components/multiplayer/NetworkedGameSurface';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import {
  buildWsUrl,
  mintToken,
} from '@/pages-modules/multiplayer/multiplayerPage.helpers';

interface IInviteResolution {
  readonly matchId: string;
  readonly status: 'lobby' | 'active' | 'completed';
}

function useInviteResolution(roomCode: string | null): {
  readonly resolution: IInviteResolution | null;
  readonly resolveError: string | null;
} {
  const [resolution, setResolution] = useState<IInviteResolution | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    setResolveError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/multiplayer/invites/${encodeURIComponent(roomCode)}`,
        );
        if (cancelled) return;
        if (res.status === 404) {
          setResolveError('Invite code not found or expired');
          return;
        }
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as IInviteResolution;
        setResolution(data);
      } catch (e) {
        if (!cancelled) {
          setResolveError(
            e instanceof Error ? e.message : 'Failed to resolve invite',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  return { resolution, resolveError };
}

function useAutoOccupySeat(
  session: ReturnType<typeof useMultiplayerSession>,
  tokenState: MultiplayerTokenState | null,
): void {
  useEffect(() => {
    if (!session.lobbyState || !tokenState) return;
    const ownSeat = session.lobbyState.seats.find(
      (s) => s.occupant?.playerId === tokenState.token.playerId,
    );
    if (ownSeat) return;
    const target = session.lobbyState.seats.find(
      (s) => s.kind === 'human' && !s.occupant,
    );
    if (!target) return;
    session.sendIntent({ kind: 'OccupySeat', slotId: target.slotId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.lobbyState?.seats.length, tokenState?.token.playerId]);
}

function BackToMultiplayerLink(): React.ReactElement {
  return (
    <Link
      href="/multiplayer"
      className="text-sm text-slate-400 hover:text-slate-200"
    >
      Back to multiplayer hub
    </Link>
  );
}

function LobbyResolveError({
  error,
}: {
  readonly error: string;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
      <BackToMultiplayerLink />
      <h1 className="mt-2 text-2xl font-bold">Lobby not found</h1>
      <p className="mt-2 text-sm text-rose-400">{error}</p>
    </div>
  );
}

function LobbyAuthPrompt({
  roomCode,
  password,
  authError,
  onPasswordChange,
  onSubmit,
}: {
  readonly roomCode: string;
  readonly password: string;
  readonly authError: string | null;
  readonly onPasswordChange: (password: string) => void;
  readonly onSubmit: () => void;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-md px-4 py-8 text-slate-200">
      <BackToMultiplayerLink />
      <h1 className="mt-2 text-2xl font-bold">Unlock vault</h1>
      <p className="mt-2 text-xs text-slate-400">
        Lobby <span className="font-mono text-slate-200">{roomCode}</span>{' '}
        requires a signed identity. Enter your vault password to mint a token.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        placeholder="Vault password"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={password.length === 0}
        className="mt-2 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        Connect to lobby
      </button>
      {authError && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {authError}
        </p>
      )}
    </div>
  );
}

function LobbyJoiningState({
  status,
  error,
}: {
  readonly status: string;
  readonly error?: ReturnType<typeof useMultiplayerSession>['error'];
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
      <BackToMultiplayerLink />
      <h1 className="mt-2 text-2xl font-bold">Joining lobby...</h1>
      <p className="mt-2 text-xs text-slate-400">
        Status: {status}. Waiting for the first lobby snapshot.
      </p>
      {error && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {error.code ?? 'ERROR'}: {error.reason}
        </p>
      )}
    </div>
  );
}

function LobbyUnavailableState({
  reason,
}: {
  readonly reason?: string;
}): React.ReactElement {
  return (
    <div
      data-testid="multiplayer-unavailable-panel"
      className="mx-auto max-w-2xl px-4 py-8 text-slate-200"
    >
      <BackToMultiplayerLink />
      <h1 className="mt-2 text-2xl font-bold">Multiplayer unavailable</h1>
      <p className="mt-2 text-sm text-slate-400">
        This lobby is not connected to a live multiplayer session. Return to the
        multiplayer hub and try the invite again.
      </p>
      {reason && (
        <p className="mt-2 text-xs text-amber-300" role="status">
          {reason}
        </p>
      )}
    </div>
  );
}

function multiplayerUnavailableReason(
  session: ReturnType<typeof useMultiplayerSession>,
): string | null {
  const reason = session.closedInfo?.reason ?? session.error?.reason ?? '';
  const normalizedReason = reason.toLowerCase();
  if (
    normalizedReason.includes('runtime-unavailable') ||
    normalizedReason.includes('bind-failed') ||
    normalizedReason.includes('dispatch-failed')
  ) {
    return 'The server could not attach this lobby to the live multiplayer host.';
  }
  if (session.closedInfo?.code === 'RECONNECT_LIMIT') {
    return 'The client reached the reconnect limit without establishing a live session.';
  }
  return null;
}

export default function LobbyPage(): React.ReactElement {
  const router = useRouter();
  const roomCode =
    typeof router.query.roomCode === 'string' ? router.query.roomCode : null;

  const { resolution, resolveError } = useInviteResolution(roomCode);
  const [tokenState, setTokenState] = useState<MultiplayerTokenState | null>(
    null,
  );
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const wsUrl = resolution ? buildWsUrl(resolution.matchId) : null;
  const auth = useMemo(
    () =>
      tokenState
        ? {
            playerId: tokenState.token.playerId,
            token: tokenState.token,
          }
        : null,
    [tokenState],
  );
  const session = useMultiplayerSession(
    wsUrl,
    resolution?.matchId ?? null,
    auth,
    { maxReconnectAttempts: 2 },
  );
  useAutoOccupySeat(session, tokenState);

  if (!roomCode) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
        <p>Loading...</p>
      </div>
    );
  }

  if (resolveError) {
    return <LobbyResolveError error={resolveError} />;
  }

  if (!tokenState) {
    return (
      <LobbyAuthPrompt
        roomCode={roomCode}
        password={password}
        authError={authError}
        onPasswordChange={setPassword}
        onSubmit={() => {
          setAuthError(null);
          void (async () => {
            try {
              const t = await mintToken(password);
              setTokenState(t);
            } catch (e) {
              setAuthError(
                e instanceof Error ? e.message : 'Failed to mint token',
              );
            }
          })();
        }}
      />
    );
  }

  const unavailableReason = multiplayerUnavailableReason(session);
  if (unavailableReason) {
    return <LobbyUnavailableState reason={unavailableReason} />;
  }

  if (!resolution || !session.lobbyState) {
    return <LobbyJoiningState status={session.status} error={session.error} />;
  }

  const isActive = session.lobbyState.status === 'active';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200">
      <header className="mb-6 flex items-center justify-between">
        <BackToMultiplayerLink />
        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">
          {roomCode}
        </span>
      </header>

      {session.error && session.status !== 'ready' && (
        <div className="mb-4 rounded border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-200">
          {session.error.code}: {session.error.reason}
        </div>
      )}

      {!isActive ? (
        <LobbyPanel
          lobbyState={session.lobbyState}
          myPlayerId={tokenState.token.playerId}
          onIntent={session.sendIntent}
        />
      ) : (
        <NetworkedGameSurface
          mirrorSession={session.mirrorSession}
          mirrorEvents={session.mirrorEvents}
          seats={session.lobbyState.seats}
          playerId={tokenState.token.playerId}
          status={session.status}
          pausedInfo={session.pausedInfo}
          closedInfo={session.closedInfo}
          intentError={session.intentError}
          onClearIntentError={session.clearIntentError}
          onSendGameIntent={session.sendGameIntent}
        />
      )}
    </div>
  );
}
