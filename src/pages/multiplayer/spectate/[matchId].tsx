import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import type { MultiplayerTokenState } from '@/pages-modules/multiplayer/multiplayerPage.helpers';

import { NetworkedGameSurface } from '@/components/multiplayer/NetworkedGameSurface';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import {
  buildWsUrl,
  mintToken,
} from '@/pages-modules/multiplayer/multiplayerPage.helpers';

function useSpectatorRegistration(
  matchId: string | null,
  tokenState: MultiplayerTokenState | null,
): {
  readonly registered: boolean;
  readonly registerError: string | null;
} {
  const [registered, setRegistered] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

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

  return { registered, registerError };
}

function SpectatorAuthPrompt({
  password,
  authError,
  onPasswordChange,
  onSubmit,
}: {
  readonly password: string;
  readonly authError: string | null;
  readonly onPasswordChange: (password: string) => void;
  readonly onSubmit: () => void;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-md px-4 py-8 text-slate-200">
      <Link
        href="/multiplayer"
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        Back to multiplayer hub
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Unlock vault to spectate</h1>
      <p className="mt-2 text-xs text-slate-400">
        Watching a match requires a signed identity. Enter your vault password
        to mint a token.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
        placeholder="Vault password"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={password.length === 0}
        className="mt-2 w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        Watch match
      </button>
      {authError && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {authError}
        </p>
      )}
    </div>
  );
}

function SpectatorRegisterError({
  error,
}: {
  readonly error: string;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
      <Link
        href="/multiplayer"
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        Back to multiplayer hub
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Cannot spectate</h1>
      <p className="mt-2 text-sm text-rose-400" role="alert">
        {error}
      </p>
    </div>
  );
}

export default function SpectatePage(): React.ReactElement {
  const router = useRouter();
  const matchId =
    typeof router.query.matchId === 'string' ? router.query.matchId : null;

  const [tokenState, setTokenState] = useState<MultiplayerTokenState | null>(
    null,
  );
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const { registered, registerError } = useSpectatorRegistration(
    matchId,
    tokenState,
  );

  const wsUrl = registered && matchId ? buildWsUrl(matchId) : null;
  const auth = useMemo(
    () =>
      tokenState
        ? { playerId: tokenState.token.playerId, token: tokenState.token }
        : null,
    [tokenState],
  );
  const session = useMultiplayerSession(
    wsUrl,
    registered ? matchId : null,
    auth,
  );

  if (!matchId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-slate-200">
        <p>Loading...</p>
      </div>
    );
  }

  if (!tokenState) {
    return (
      <SpectatorAuthPrompt
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

  if (registerError) {
    return <SpectatorRegisterError error={registerError} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/multiplayer"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Back to multiplayer hub
        </Link>
        <span className="rounded border border-sky-700 bg-sky-900/30 px-2 py-1 text-xs font-medium text-sky-300">
          Spectator
        </span>
      </header>

      {session.error && session.status !== 'ready' && (
        <div className="mb-4 rounded border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-200">
          {session.error.code}: {session.error.reason}
        </div>
      )}

      <NetworkedGameSurface
        mirrorSession={session.mirrorSession}
        mirrorEvents={session.mirrorEvents}
        seats={session.lobbyState?.seats ?? []}
        playerId={tokenState.token.playerId}
        hostPlayerId={session.lobbyState?.hostPlayerId}
        status={session.status}
        pausedInfo={session.pausedInfo}
        closedInfo={session.closedInfo}
        intentError={session.intentError}
        onClearIntentError={session.clearIntentError}
        onSendGameIntent={session.sendGameIntent}
        spectator
      />
    </div>
  );
}
