import type { IPlayerToken } from '@/types/multiplayer/Player';

import { decodeTokenFromWire } from '@/types/multiplayer/Player';

export interface MultiplayerTokenState {
  readonly wireToken: string;
  readonly token: IPlayerToken;
  readonly displayName: string;
}

export function buildWsUrl(matchId: string): string | null {
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}`;
}

export async function mintToken(
  password: string,
): Promise<MultiplayerTokenState> {
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
  if (!decoded) throw new Error('Server returned a malformed token');

  return {
    wireToken: data.token,
    token: decoded,
    displayName: data.displayName,
  };
}
