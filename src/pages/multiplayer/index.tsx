/**
 * Multiplayer Hub — `/multiplayer/index`.
 *
 * Pages Router landing page for multiplayer. Two cards:
 *   - Create Match: form -> POST /api/multiplayer/matches -> navigate
 *     to /multiplayer/lobby/[roomCode] with the freshly minted code.
 *   - Join Match: room code input -> resolve via
 *     /api/multiplayer/invites/[roomCode] -> navigate to the lobby.
 *
 * Wave 5 of Phase 4 (capstone integration).
 *
 * Auth: the user must have an unlocked vault identity. We trigger the
 * password prompt inline if no token has been issued yet — minted via
 * `/api/multiplayer/auth/token`. The token is cached in component state
 * for the session.
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

import type { IMatchConfig } from '@/lib/multiplayer/server/IMatchStore';
import type { IPlayerToken } from '@/types/multiplayer/Player';

import { CreateMatchForm } from '@/components/multiplayer/CreateMatchForm';
import { JoinMatchForm } from '@/components/multiplayer/JoinMatchForm';
import { decodeTokenFromWire } from '@/types/multiplayer/Player';

// =============================================================================
// Types
// =============================================================================

interface ITokenState {
  readonly wireToken: string;
  readonly token: IPlayerToken;
  readonly displayName: string;
}

interface ICreateMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: { readonly roomCode?: string; readonly matchId: string };
}

interface IInviteResponse {
  readonly matchId: string;
  readonly status: string;
  readonly layout?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Mint a token via the auth endpoint. Called inline when the user hits
 * Create or Join — we don't preflight on mount because most users land
 * on this page from the home dashboard before deciding to play.
 */
async function mintToken(password: string): Promise<ITokenState> {
  const res = await fetch('/api/multiplayer/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    token: string;
    playerId: string;
    displayName: string;
  };
  const decoded = decodeTokenFromWire(data.token);
  if (!decoded) {
    throw new Error('Server returned a malformed token');
  }
  return {
    wireToken: data.token,
    token: decoded,
    displayName: data.displayName,
  };
}

// =============================================================================
// Page
// =============================================================================

export default function MultiplayerHubPage(): React.ReactElement {
  const router = useRouter();
  const [tokenState, setTokenState] = useState<ITokenState | null>(null);
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<'create' | 'join' | 'auth' | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Wrap the supplied action with token issuance. If no cached token
   * exists, the password prompt inline becomes the gate. Surfaces errors
   * back into the local `error` state so the user sees what failed.
   */
  async function withAuth(
    nextBusy: 'create' | 'join',
    fn: (auth: ITokenState) => Promise<void>,
  ): Promise<void> {
    setError(null);
    setBusy(nextBusy);
    try {
      let auth = tokenState;
      if (!auth) {
        if (!password) {
          setError('Enter your vault password to continue');
          return;
        }
        auth = await mintToken(password);
        setTokenState(auth);
      }
      await fn(auth);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  /**
   * Submit handler for Create. Posts to /api/multiplayer/matches with
   * the form's layout + map config + chosen displayName, then routes
   * to the lobby keyed by roomCode (so refresh keeps you on the right
   * lobby).
   */
  async function handleCreate(value: {
    layout: import('@/types/multiplayer/Lobby').TeamLayout;
    displayName: string;
    mapRadius: number;
    turnLimit: number;
  }): Promise<void> {
    await withAuth('create', async (auth) => {
      const config: IMatchConfig = {
        mapRadius: value.mapRadius,
        turnLimit: value.turnLimit,
      };
      const res = await fetch('/api/multiplayer/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.wireToken}`,
        },
        body: JSON.stringify({
          config,
          layout: value.layout,
          displayName: value.displayName,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ICreateMatchResponse;
      const code = data.roomCode ?? data.meta.roomCode;
      if (!code) {
        throw new Error("Server didn't return a room code");
      }
      void router.push(`/multiplayer/lobby/${encodeURIComponent(code)}`);
    });
  }

  /**
   * Submit handler for Join. Resolves the code to a matchId via the
   * invite endpoint and routes to the lobby. Resolution failures
   * surface inline so the user can retype.
   */
  async function handleJoin(roomCode: string): Promise<void> {
    await withAuth('join', async (auth) => {
      const res = await fetch(
        `/api/multiplayer/invites/${encodeURIComponent(roomCode)}`,
        {
          headers: {
            Authorization: `Bearer ${auth.wireToken}`,
          },
        },
      );
      if (res.status === 404) {
        throw new Error(`No active match with room code ${roomCode}`);
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      // Invite endpoint returns matchId+status — we use the room code
      // the user typed as the lobby URL key (it's the human-friendly
      // identifier; the lobby page resolves it again via the same
      // endpoint to fetch matchId).
      const _data = (await res.json()) as IInviteResponse;
      void _data;
      void router.push(`/multiplayer/lobby/${encodeURIComponent(roomCode)}`);
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Multiplayer</h1>
        <p className="mt-2 text-sm text-slate-400">
          Host a match or join one with a code. 1v1 through 4v4 + free-for-all
          (up to 8 players).
        </p>
      </header>

      {!tokenState && (
        <section className="mb-8 rounded-lg border border-amber-700 bg-amber-900/20 p-4">
          <h2 className="text-sm font-semibold text-amber-200">
            Vault password required
          </h2>
          <p className="mt-1 text-xs text-amber-300/80">
            We mint a short-lived signing token from your vault identity so the
            multiplayer server can verify who you are.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Vault password"
            className="mt-3 w-full rounded border border-amber-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              void withAuth('create', async () => {
                /* token cached after withAuth returns */
              });
            }}
            disabled={busy === 'auth' || password.length === 0}
            className="mt-2 rounded bg-amber-700 px-3 py-1 text-xs font-medium text-amber-50 hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Mint token
          </button>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-rose-700 bg-rose-900/30 p-3 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-emerald-300">
            Create match
          </h2>
          <CreateMatchForm onSubmit={handleCreate} busy={busy === 'create'} />
        </section>
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-cyan-300">
            Join match
          </h2>
          <JoinMatchForm onSubmit={handleJoin} busy={busy === 'join'} />
        </section>
      </div>
    </div>
  );
}
