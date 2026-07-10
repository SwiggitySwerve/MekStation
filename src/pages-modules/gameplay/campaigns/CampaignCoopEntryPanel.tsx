import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

import type { IMatchConfig } from '@/lib/multiplayer/server/IMatchStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { Button } from '@/components/ui';
import { buildCampaignAuthoritativeState } from '@/lib/campaign/coop/campaignAuthoritativeState';
import {
  campaignSnapshotFromMessage,
  connectCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { applyPreset } from '@/lib/campaign/presetService';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { parseRoomCode } from '@/lib/p2p/roomCodes';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import {
  decodeTokenFromWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';

function defaultCoopCampaignName(roomCode: string): string {
  return `Co-op Campaign ${roomCode}`;
}

const DEFAULT_COOP_FACTION_ID = CampaignType.MERCENARY;
const DEFAULT_COOP_PRESET = CampaignPreset.STANDARD;

interface ITokenState {
  readonly wireToken: string;
  readonly token: IPlayerToken;
  readonly displayName: string;
}

interface ICreateMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: {
    readonly matchId: string;
    readonly roomCode?: string;
  };
}

interface IInviteResponse {
  readonly matchId: string;
  readonly status: string;
}

type CoopErrorKind = 'vault-identity' | 'generic';

class VaultIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultIdentityError';
  }
}

function isVaultIdentityError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'VaultIdentityError';
}

async function mintToken(password: string): Promise<ITokenState> {
  try {
    const res = await fetch('/api/multiplayer/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new VaultIdentityError(data.error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      token: string;
      playerId: string;
      displayName: string;
    };
    const decoded = decodeTokenFromWire(data.token);
    if (!decoded) {
      throw new VaultIdentityError('Server returned a malformed token');
    }
    return {
      wireToken: data.token,
      token: decoded,
      displayName: data.displayName,
    };
  } catch (error) {
    if (isVaultIdentityError(error)) {
      throw error;
    }
    throw new VaultIdentityError(
      error instanceof Error ? error.message : 'Unable to mint a vault token',
    );
  }
}

async function resolveInviteCode(
  roomCode: string,
): Promise<{ matchId: string; roomCode: string; status: string }> {
  const res = await fetch(
    `/api/multiplayer/invites/${encodeURIComponent(roomCode)}`,
  );
  if (res.status === 404) {
    throw new Error(`No active co-op campaign with room code ${roomCode}`);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as IInviteResponse;
  return { matchId: data.matchId, roomCode, status: data.status };
}

function waitForInitialCampaignSnapshot(
  transport: ICampaignSyncTransport,
): Promise<ICampaignEvent<'CampaignSnapshotPublished'>> {
  return new Promise((resolve, reject) => {
    let offFrame = (): void => undefined;
    let offError = (): void => undefined;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the host campaign snapshot'));
    }, 10_000);
    const cleanup = (): void => {
      clearTimeout(timeout);
      offFrame();
      offError();
    };
    offFrame = transport.onFrame((message) => {
      const snapshot = campaignSnapshotFromMessage(message);
      if (!snapshot) return;
      cleanup();
      resolve(snapshot);
    });
    offError = transport.onError((error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error('Campaign sync error'));
    });
  });
}

export function CampaignCoopEntryPanel(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinCoopPassword, setJoinCoopPassword] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinErrorKind, setJoinErrorKind] = useState<CoopErrorKind | null>(
    null,
  );
  const [createCoopError, setCreateCoopError] = useState<string | null>(null);
  const [createCoopErrorKind, setCreateCoopErrorKind] =
    useState<CoopErrorKind | null>(null);
  const [createCoopPassword, setCreateCoopPassword] = useState('');
  const [createCoopBusy, setCreateCoopBusy] = useState(false);
  const [coopTokenState, setCoopTokenState] = useState<ITokenState | null>(
    null,
  );

  const handleCreateCoopCampaign = useCallback(async () => {
    setCreateCoopError(null);
    setCreateCoopErrorKind(null);
    setCreateCoopBusy(true);
    try {
      let auth = coopTokenState;
      if (!auth) {
        if (!createCoopPassword) {
          setCreateCoopError('Enter your vault password to host co-op.');
          setCreateCoopErrorKind('generic');
          return;
        }
        auth = await mintToken(createCoopPassword);
        setCoopTokenState(auth);
      }

      const config: IMatchConfig = {
        mapRadius: 8,
        turnLimit: 20,
        fogOfWar: false,
      };
      const campaignId = store
        .getState()
        .createCampaign(
          'Co-op Campaign',
          DEFAULT_COOP_FACTION_ID,
          applyPreset(DEFAULT_COOP_PRESET, DEFAULT_COOP_FACTION_ID),
        );
      const createdCampaign = store.getState().getCampaign();
      if (!createdCampaign) {
        throw new Error('Failed to create the host campaign snapshot');
      }
      const res = await fetch('/api/multiplayer/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.wireToken}`,
        },
        body: JSON.stringify({
          config,
          layout: '1v1',
          displayName: auth.displayName,
          coopCampaign: {
            campaignId: createdCampaign.id,
            state: buildCampaignAuthoritativeState(createdCampaign),
            arbitrationMode: 'host-review',
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ICreateMatchResponse;
      const roomCode = data.roomCode ?? data.meta.roomCode;
      if (!roomCode) {
        throw new Error("Server didn't return a co-op room code");
      }
      storeCoopCampaignToken({
        matchId: data.matchId,
        playerId: auth.token.playerId,
        wireToken: auth.wireToken,
        displayName: auth.displayName,
      });
      await Promise.resolve(
        store.getState().updateCampaign({
          name: defaultCoopCampaignName(roomCode),
          coopSession: createHostCoopSession(roomCode, data.matchId),
        }),
      );
      await router.push(`/gameplay/campaigns/${campaignId}`);
    } catch (e) {
      setCreateCoopError(e instanceof Error ? e.message : 'Unknown error');
      setCreateCoopErrorKind(
        isVaultIdentityError(e) ? 'vault-identity' : 'generic',
      );
    } finally {
      setCreateCoopBusy(false);
    }
  }, [coopTokenState, createCoopPassword, router, store]);

  const handleOpenJoinCoop = useCallback(() => {
    setCreateCoopError(null);
    setCreateCoopErrorKind(null);
    setJoinError(null);
    setJoinErrorKind(null);
    setJoinCode('');
    setJoinCoopPassword('');
    setJoinOpen(true);
  }, []);

  const handleCloseJoinCoop = useCallback(() => {
    setJoinOpen(false);
    setJoinCode('');
    setJoinCoopPassword('');
    setJoinError(null);
    setJoinErrorKind(null);
  }, []);

  useEffect(() => {
    if (!joinOpen) return () => undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleCloseJoinCoop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseJoinCoop, joinOpen]);

  const handleSubmitJoinCoop = useCallback(async () => {
    const parsed = parseRoomCode(joinCode);
    if (!parsed) {
      setJoinError(
        'Enter a 6-character room code (letters and numbers, no I/O/0/1)',
      );
      setJoinErrorKind('generic');
      return;
    }
    if (!joinCoopPassword) {
      setJoinError('Enter your vault password to join co-op.');
      setJoinErrorKind('generic');
      return;
    }
    setJoinBusy(true);
    setJoinError(null);
    setJoinErrorKind(null);
    let transport: ICampaignSyncTransport | null = null;
    try {
      const auth = await mintToken(joinCoopPassword);
      const { matchId, roomCode } = await resolveInviteCode(parsed);
      storeCoopCampaignToken({
        matchId,
        playerId: auth.token.playerId,
        wireToken: auth.wireToken,
        displayName: auth.displayName,
      });
      transport = connectCampaignSyncTransport({
        matchId,
        role: 'guest',
        playerId: auth.token.playerId,
        wireToken: auth.wireToken,
        roomCode,
      });
      const snapshot = await waitForInitialCampaignSnapshot(transport);
      const mirrorStore = useCampaignMirrorStore.getState();
      mirrorStore.beginMirror(
        {
          hostPeerId: snapshot.authorPlayerId,
          guestPeerId: auth.token.playerId,
        },
        auth.token.playerId,
      );
      mirrorStore.applySnapshot(snapshot, 0);
      const id = store.getState().createGuestMirrorCampaign(matchId, {
        campaignId: snapshot.payload.state.campaignId,
        campaignName: defaultCoopCampaignName(roomCode),
        factionId: DEFAULT_COOP_FACTION_ID,
        roomCode,
        authoritativeState: snapshot.payload.state,
      });
      setJoinOpen(false);
      router.push(`/gameplay/campaigns/${id}`);
    } catch (e) {
      transport?.close();
      setJoinError(e instanceof Error ? e.message : 'Unknown error');
      setJoinErrorKind(isVaultIdentityError(e) ? 'vault-identity' : 'generic');
    } finally {
      setJoinBusy(false);
    }
  }, [joinCode, joinCoopPassword, router, store]);

  return (
    <>
      <section className="mb-6 rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              void handleCreateCoopCampaign();
            }}
            data-testid="create-coop-campaign-btn"
            disabled={createCoopBusy}
          >
            {createCoopBusy ? 'Creating Co-op...' : 'Create Co-op Campaign'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleOpenJoinCoop}
            data-testid="join-coop-campaign-btn"
          >
            Join Co-op Campaign
          </Button>
        </div>

        <p className="text-text-theme-secondary mt-3 text-sm">
          Creates with defaults: Mercenary faction, Standard preset, and an
          empty roster. You can rename the campaign and configure its faction,
          preset, and roster from the campaign dashboard after creation.
        </p>

        {createCoopError && (
          <div
            role="status"
            data-testid="create-coop-unavailable"
            className="mt-3 rounded-lg border border-amber-600 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
          >
            {createCoopError}
            {createCoopErrorKind === 'vault-identity' && (
              <>
                {' '}
                <Link
                  href="/settings#vault"
                  className="font-medium underline underline-offset-2"
                >
                  Set up your vault identity in Settings
                </Link>
              </>
            )}
          </div>
        )}

        {!coopTokenState && (
          <div className="mt-3">
            <label
              htmlFor="create-coop-password"
              className="text-text-theme-secondary mb-1 block text-xs tracking-wide uppercase"
            >
              Co-op host vault password
            </label>
            <input
              id="create-coop-password"
              data-testid="create-coop-password-input"
              type="password"
              value={createCoopPassword}
              onChange={(e) => setCreateCoopPassword(e.target.value)}
              disabled={createCoopBusy}
              className="text-text-theme-primary w-full max-w-md rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
        )}
      </section>

      {joinOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-coop-dialog-title"
          data-testid="join-coop-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleCloseJoinCoop}
        >
          <div
            className="bg-surface-raised w-full max-w-md rounded-xl border border-slate-700 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="join-coop-dialog-title"
              className="text-text-theme-primary mb-2 text-xl font-semibold"
            >
              Join Co-op Campaign
            </h2>
            <p className="text-text-theme-secondary mb-4 text-sm">
              Enter the 6-character room code your host shared with you.
            </p>
            <label
              htmlFor="join-coop-room-code"
              className="text-text-theme-secondary mb-1 block text-xs tracking-wide uppercase"
            >
              Room code
            </label>
            <input
              id="join-coop-room-code"
              data-testid="join-coop-room-code-input"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ABC-DEF"
              autoFocus
              disabled={joinBusy}
              className="text-text-theme-primary w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-lg tracking-widest uppercase focus:border-sky-500 focus:outline-none"
            />
            <label
              htmlFor="join-coop-password"
              className="text-text-theme-secondary mt-4 mb-1 block text-xs tracking-wide uppercase"
            >
              Co-op guest vault password
            </label>
            <input
              id="join-coop-password"
              data-testid="join-coop-password-input"
              type="password"
              value={joinCoopPassword}
              onChange={(e) => setJoinCoopPassword(e.target.value)}
              disabled={joinBusy}
              className="text-text-theme-primary w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
            {joinError && (
              <p
                role="alert"
                data-testid="join-coop-error"
                className="mt-3 rounded border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-200"
              >
                {joinError}
                {joinErrorKind === 'vault-identity' && (
                  <>
                    {' '}
                    <Link
                      href="/settings#vault"
                      className="font-medium underline underline-offset-2"
                    >
                      Set up your vault identity in Settings
                    </Link>
                  </>
                )}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCloseJoinCoop}
                data-testid="join-coop-cancel-btn"
                disabled={joinBusy}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  void handleSubmitJoinCoop();
                }}
                data-testid="join-coop-submit-btn"
                disabled={joinBusy || joinCode.length === 0}
              >
                {joinBusy ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
