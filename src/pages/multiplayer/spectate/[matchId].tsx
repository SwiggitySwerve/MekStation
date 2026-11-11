import Link from 'next/link';
import { ReplayReloadRequired } from '@/components/multiplayer/ReplayReloadRequired';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import type { MultiplayerTokenState } from '@/pages-modules/multiplayer/multiplayerPage.helpers';

import { NetworkedGameSurface } from '@/components/multiplayer/NetworkedGameSurface';
import { useMultiplayerSession } from '@/hooks/useMultiplayerSession';
import { useSpectatorRegistration } from '@/hooks/useSpectatorRegistration';
import {
  buildWsUrl,
  mintToken,
} from '@/pages-modules/multiplayer/multiplayerPage.helpers';

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
    <div className="text-text-theme-primary mx-auto max-w-md px-4 py-8">
      <Link
        href="/multiplayer"
        className="text-text-theme-secondary hover:text-text-theme-primary text-sm"
      >
        Back to multiplayer hub
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Unlock vault to spectate</h1>
      <p className="text-text-theme-secondary mt-2 text-xs">
        Watching a match requires a signed identity. Enter your vault password
        to mint a token.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        className="border-border-theme bg-surface-deep text-text-theme-primary mt-3 w-full rounded border px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        placeholder="Vault password"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={password.length === 0}
        className="bg-accent text-on-accent hover:bg-accent-hover disabled:bg-surface-raised mt-2 w-full rounded px-3 py-2 text-sm font-medium disabled:cursor-not-allowed"
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
    <div className="text-text-theme-primary mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/multiplayer"
        className="text-text-theme-secondary hover:text-text-theme-primary text-sm"
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
  const { registered, registerError, reRegister, markBound } =
    useSpectatorRegistration(matchId, tokenState);

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

  // The server releases a spectator seat when the viewer's sockets are gone and
  // at boot after a restart, so the reconnect is refused with AUTH_REJECTED and
  // the client closes for good. Register again (bounded to one per successful
  // bind) and the session hook rebinds; a refusal of that is a registerError.
  const admissionRefused =
    registered && session.closedInfo?.code === 'AUTH_REJECTED';
  useEffect(() => {
    if (admissionRefused) reRegister();
  }, [admissionRefused, reRegister]);
  useEffect(() => {
    if (session.status === 'ready') markBound();
  }, [session.status, markBound]);

  if (!matchId) {
    return (
      <div className="text-text-theme-primary mx-auto max-w-2xl px-4 py-8">
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

  if (session.status === 'reload-required') return <ReplayReloadRequired />;

  return (
    <div className="text-text-theme-primary mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/multiplayer"
          className="text-text-theme-secondary hover:text-text-theme-primary text-sm"
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
        clientLifecycle={session.clientLifecycle}
        projectionSignal={session.projectionSignal}
        spectator
      />
    </div>
  );
}
